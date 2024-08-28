import { Factory, MAINNET_FACTORY_ADDR, Asset, PoolType, JettonRoot, VaultJetton, ReadinessStatus, Pool } from '@dedust/sdk';
import { Address, fromNano, internal, OpenedContract, toNano } from '@ton/core';
import { tonGetClient } from '../endpoint';
import { sleep } from '../../utils/basic';
import { tonTrWait } from '../transaction';
import { toDecimalsBN } from '../../utils/bignumber';
import { WalletPair } from '../types';
import { tonAddr } from '../address';
import { tonWalletGetSeqNo } from '../wallet';
import { ZERO_ADDRESS } from '../constants';
import { tonTokenInfo } from '../token/query';

export async function dedustGetPool(jetton: Address | string): Promise<OpenedContract<Pool> | undefined> {
  const tonClient = await tonGetClient()
  const TON = Asset.native();
  const SCALE = Asset.jetton(tonAddr(jetton));
  const factory = tonClient.open(Factory.createFromAddress(MAINNET_FACTORY_ADDR))

  const pool = tonClient.open(
    await factory.getPool(PoolType.VOLATILE, [TON, SCALE])
  );

  // Check if pool exists:
  const poolReadiness = await pool.getReadinessStatus()
  if (poolReadiness !== ReadinessStatus.READY) {
    return undefined
  }
  return pool
}

export async function dedustPoolFind(jetton: Address) {
  const tonClient = await tonGetClient()
  const TON = Asset.native();
  const SCALE = Asset.jetton(jetton);
  const factory = tonClient.open(Factory.createFromAddress(MAINNET_FACTORY_ADDR))

  const pool = tonClient.open(
    await factory.getPool(PoolType.VOLATILE, [TON, SCALE])
  );

  // Check if pool exists:
  const poolReadiness = await pool.getReadinessStatus()
  if (poolReadiness !== ReadinessStatus.READY) {
    return [false, 'Pool (TON, SCALE) does not exist.']
  }

  // Check if ton vault exits:
  const tonVault = tonClient.open(await factory.getNativeVault());
  if ((await tonVault.getReadinessStatus()) !== ReadinessStatus.READY) {
    return [false, 'Vault (TON) does not exist.'];
  }

  // Check if scale vault exits:
  const scaleVault = tonClient.open(await factory.getJettonVault(SCALE.address!));
  if ((await scaleVault.getReadinessStatus()) !== ReadinessStatus.READY) {
    return [false, 'Vault (SCALE) does not exist.'];
  }
  return [true, 'Ok']
}

export async function dedustPoolCreate(
  signer: WalletPair,
  tokenAddr: string,
  tokenDecimals: number,
  _amountJ: number,
  _amountT: number
): Promise<string> {

  const tonClient = await tonGetClient()
  const walletContract = tonClient.open(signer.wallet)
  const factory = tonClient.open(Factory.createFromAddress(MAINNET_FACTORY_ADDR))
  const sender = tonClient.open(signer.wallet).sender(signer.key.secretKey)
  const jettonAddr = Address.parse(tokenAddr)
  const assets: [Asset, Asset] = [
    Asset.native(), // ton
    Asset.jetton(jettonAddr) // jetton
  ]
  let seqNo = undefined

  // Create a vault
  console.log(`[VENUS](DEDUST) Creating vault...`)
  seqNo = walletContract.getSeqno()
  await factory.sendCreateVault(sender, {
    asset: Asset.jetton(jettonAddr),
  });
  await tonTrWait(signer.wallet)
  const scaleVault = tonClient.open(await factory.getJettonVault(jettonAddr))
  let state = ReadinessStatus.NOT_DEPLOYED
  while (state !== ReadinessStatus.READY) {
    await sleep(1500)
    try {
      state = await scaleVault.getReadinessStatus()
      console.log(`[VENUS] VAULT(${scaleVault.address.toString()}) STATE = ${state}`)
    } catch (error) {
      continue
    }
  }

  // Create a pool
  console.log(`[VENUS](DEDUST) Creating Pool(volatile)...`)
  const pool = tonClient.open(await factory.getPool(PoolType.VOLATILE, assets))
  const poolReadiness = await pool.getReadinessStatus();
  if (poolReadiness === ReadinessStatus.NOT_DEPLOYED) {
    seqNo = await walletContract.getSeqno()
    await factory.sendCreateVolatilePool(sender, { assets })
    // wait for pool creation complete
    await tonTrWait(signer.wallet, seqNo)
    console.log(`[VENUS](DEDUST) Pool(volatile) created. pool = ${pool.address.toString()}`)
  } else {
    console.log(`[VENUS](DEDUST) Pool(volatile) already exists. pool = ${pool.address.toString()}`)
  }

  const amountT = toNano(_amountT)
  const amountJ = toDecimalsBN(_amountJ, tokenDecimals)
  // deposit TON
  const tonVault = tonClient.open(await factory.getNativeVault());
  console.log(`[VENUS](DEDUST) Depositing TON to tonVault(${tonVault.address.toString()})...`)
  seqNo = await walletContract.getSeqno()
  await tonVault.sendDepositLiquidity(sender, {
    poolType: PoolType.VOLATILE,
    assets,
    targetBalances: [amountT, amountJ],
    amount: amountT
  })
  await tonTrWait(signer.wallet, seqNo)
  console.log(`[VENUS](DEDUST) TON deposit finished`)

  // Deposit Jetton(SCALE)
  const scaleRoot = tonClient.open(JettonRoot.createFromAddress(jettonAddr));
  const scaleWallet = tonClient.open(await scaleRoot.getWallet(signer.wallet.address));
  console.log(`[VENUS](DEDUST) Jetton Depositing from(scaleWallet.${scaleWallet.address.toString()}) to ${scaleVault.address.toString()} ...`)
  seqNo = await walletContract.getSeqno()
  await scaleWallet.sendTransfer(
    sender,
    toNano('0.5'),
    {
      destination: scaleVault.address,
      amount: amountJ,
      responseAddress: signer.wallet.address,
      forwardAmount: toNano("0.4"),
      forwardPayload: VaultJetton.createDepositLiquidityPayload({
        poolType: PoolType.VOLATILE,
        assets,
        targetBalances: [amountT, amountJ]
      })
    }
  )
  await tonTrWait(signer.wallet, seqNo)

  state = ReadinessStatus.NOT_DEPLOYED
  while (state !== ReadinessStatus.READY) {
    await sleep(1000)
    state = await pool.getReadinessStatus();
    console.log(`[VENUS] POOL STATE = ${state}`)
  }
  console.log(`[VENUS](DEDUST) Pool creation completed.`)
  return pool.address.toString()
}

export const dedustBuy = async (
  signer: WalletPair,
  jetton: string,
  tonAmount: number
) => {

  const tonClient = await tonGetClient()
  const walletContract = tonClient.open(signer.wallet)
  const sender = tonClient.open(signer.wallet).sender(signer.key.secretKey)
  const TON = Asset.native();
  const SCALE = Asset.jetton(Address.parse(jetton))
  const factory = tonClient.open(Factory.createFromAddress(MAINNET_FACTORY_ADDR))
  let seqNo = 0
  const swapFee = 0.1

  console.log(`[DAVID](ds-ton-lib)(dedust-buy) finding pool ...`)
  const [found, message] = await dedustPoolFind(SCALE.address!)
  if (!found)
    return [false, 'Pool does not exist.']

  const pool = tonClient.open(
    await factory.getPool(PoolType.VOLATILE, [TON, SCALE])
  );
  console.log(`[DAVID](ds-ton-lib)(dedust-buy) pool: ${pool.address.toString()}`)
  const tonVault = tonClient.open(await factory.getNativeVault());
  seqNo = await walletContract.getSeqno()
  console.log(`[DAVID](ds-ton-lib)(dedust-buy) buying ...`)
  await tonVault.sendSwap(sender, {
    poolAddress: pool.address,
    amount: toNano(tonAmount),
    gasAmount: toNano(swapFee)
  })
  await tonTrWait(signer.wallet, seqNo)
  console.log(`[VENUS](DEDUST) Success to buy`)
}

export const dedustSell = async (
  signer: WalletPair,
  jetton: string,
  jettonAmount: number
) => {

  const jettonInfo = await tonTokenInfo(jetton)
  if (!jettonInfo) return
  const tonClient = await tonGetClient()
  const walletContract = tonClient.open(signer.wallet)
  const sender = tonClient.open(signer.wallet).sender(signer.key.secretKey)
  const TON = Asset.native();
  const SCALE = Asset.jetton(Address.parse(jetton))
  const factory = tonClient.open(Factory.createFromAddress(MAINNET_FACTORY_ADDR))
  let seqNo = 0
  const swapFee = 0.25

  const [found, message] = await dedustPoolFind(SCALE.address!)
  if (!found)
    return [false, 'Pool does not exist.']

  const pool = tonClient.open(
    await factory.getPool(PoolType.VOLATILE, [TON, SCALE])
  );

  const scaleRoot = tonClient.open(JettonRoot.createFromAddress(SCALE.address!));
  const scaleWallet = tonClient.open(await scaleRoot.getWallet(signer.wallet.address));
  const scaleVault = tonClient.open(await factory.getJettonVault(scaleRoot.address));
  const tokenDecimals = parseInt(jettonInfo.decimals!)
  seqNo = await walletContract.getSeqno()
  await scaleWallet.sendTransfer(sender, toNano("0.3"), {
    amount: toDecimalsBN(jettonAmount, tokenDecimals),
    destination: scaleVault.address,
    responseAddress: signer.wallet.address, // return gas to user
    forwardAmount: toNano(swapFee),
    forwardPayload: VaultJetton.createSwapPayload({ poolAddress: pool.address }),
  });
  await tonTrWait(signer.wallet, seqNo)
  console.log(`[VENUS](DEDUST) Success to sell`)
}

export async function dedustLPWithdraw(signer: WalletPair, jetton: string, amount: number | undefined = undefined) {
  const pool = await dedustGetPool(jetton)
  if (!pool)
    return
  const tonClient = await tonGetClient()
  const sender = tonClient.open(signer.wallet).sender(signer.key.secretKey)
  const lpWallet = tonClient.open(await pool.getWallet(signer.wallet.address))

  try {
    const withdrawAmount = amount ? toNano(amount) : await lpWallet.getBalance()
    const seqNo = await tonWalletGetSeqNo(signer.wallet)
    await lpWallet.sendBurn(sender, toNano(0.2), {
      amount: withdrawAmount
    })
    await tonTrWait(signer.wallet, seqNo)
  } catch (error) {
    console.log(`[DAVID](DEDUST)(witdraw lp) error :`, error)
  }
}

export async function dedustLPBurn(signer: WalletPair, jetton: string, amount: number | undefined = undefined) {
  const pool = await dedustGetPool(jetton)
  if (!pool)
    return
  const tonClient = await tonGetClient()
  const sender = tonClient.open(signer.wallet).sender(signer.key.secretKey)
  const lpWallet = tonClient.open(await pool.getWallet(signer.wallet.address))

  try {
    const burnAmount = amount ? toNano(amount) : await lpWallet.getBalance()
    const seqNo = await tonWalletGetSeqNo(signer.wallet)
    await lpWallet.sendTransfer(sender, toNano(0.1), {
      destination: tonAddr(ZERO_ADDRESS),
      amount: burnAmount,
    })
    await tonTrWait(signer.wallet, seqNo)
  } catch (error) {
    console.log(`[DAVID](DEDUST)(Burn LP) error :`, error)
  }
}

export async function dedustLpQuery(who:WalletPair|Address|string, jetton: string): Promise<number> {
  const pool = await dedustGetPool(jetton)
  if (!pool)
    return 0
  const tonClient = await tonGetClient()
  const lpWallet = tonClient.open(await pool.getWallet(tonAddr(who)))

  try {
    const lpAmount = await lpWallet.getBalance()
    return Number(fromNano(lpAmount))
  } catch (error) {
    return 0
  }
}