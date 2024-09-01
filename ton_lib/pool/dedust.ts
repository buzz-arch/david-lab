import { Factory, MAINNET_FACTORY_ADDR, Asset, PoolType, JettonRoot, VaultJetton, ReadinessStatus, Pool, AssetType } from '@dedust/sdk';
import { Address, fromNano, internal, OpenedContract, toNano } from '@ton/core';
import { tonApiClient, tonGetClient } from '../endpoint';
import { sleep } from '../../utils/basic';
import { tonTrWait } from '../transaction';
import { fromDecimalsBN, toDecimalsBN } from '../../utils/bignumber';
import { isWalletPair, PoolReserve, TonAddress, WalletPair } from '../types';
import { tonAddr, tonAddrStr } from '../address';
import { tonWalletGetSeqNo } from '../wallet';
import { DEFAULT_DELAY_FOR_TR_CONFIRM, ZERO_ADDRESS } from '../constants';
import { tonTokenDecimals, tonTokenGetBalance, tonTokenInfo } from '../token/query';
import { tonUiSender } from '../token/transfer';
import { TonConnectUI } from '@tonconnect/ui-react';
import { getCurrentTimestamp } from '../../utils/time';

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
  seqNo = await tonWalletGetSeqNo(signer)
  await factory.sendCreateVault(sender, {
    asset: Asset.jetton(jettonAddr),
  });
  await tonTrWait(signer, seqNo)

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
    seqNo = await tonWalletGetSeqNo(signer)
    await factory.sendCreateVolatilePool(sender, { assets })
    await tonTrWait(signer, seqNo)
    console.log(`[VENUS](DEDUST) Pool(volatile) created. pool = ${pool.address.toString()}`)
  } else {
    console.log(`[VENUS](DEDUST) Pool(volatile) already exists. pool = ${pool.address.toString()}`)
  }

  const amountT = toNano(_amountT)
  if (tokenDecimals === 0) {
    const tokenDetails = await tonTokenInfo(tokenAddr)
    tokenDecimals = parseInt(tokenDetails?.decimals || "6")
  }
  const amountJ = _amountJ === 0 ? await tonTokenGetBalance(signer, tokenAddr) : toDecimalsBN(_amountJ, tokenDecimals)
  // deposit TON
  const tonVault = tonClient.open(await factory.getNativeVault());
  console.log(`[VENUS](DEDUST) Depositing TON to tonVault(${tonVault.address.toString()})...`)
  seqNo = await tonWalletGetSeqNo(signer)
  await tonVault.sendDepositLiquidity(sender, {
    poolType: PoolType.VOLATILE,
    assets,
    targetBalances: [amountT, amountJ],
    amount: amountT
  })
  await tonTrWait(signer, seqNo)
  console.log(`[VENUS](DEDUST) TON deposit finished`)

  // Deposit Jetton(SCALE)
  const scaleRoot = tonClient.open(JettonRoot.createFromAddress(jettonAddr));
  const scaleWallet = tonClient.open(await scaleRoot.getWallet(signer.wallet.address));
  console.log(`[VENUS](DEDUST) Jetton Depositing from(scaleWallet.${scaleWallet.address.toString()}) to ${scaleVault.address.toString()} ...`)
  seqNo = await tonWalletGetSeqNo(signer)
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
  await tonTrWait(signer, seqNo)

  state = ReadinessStatus.NOT_DEPLOYED
  while (state !== ReadinessStatus.READY) {
    await sleep(1000)
    state = await pool.getReadinessStatus();
    console.log(`[VENUS] POOL STATE = ${state}`)
  }
  console.log(`[VENUS](DEDUST) Pool creation completed.`)
  return pool.address.toString()
}

export async function dedustBuy(
  signer: TonConnectUI | WalletPair,
  jetton: string,
  tonAmount: number
) {

  const tonClient = await tonGetClient()
  let sender: any
  let senderAddr: Address
  if (isWalletPair(signer)) {
    sender = tonClient.open(signer.wallet).sender(signer.key.secretKey)
    senderAddr = signer.wallet.address
  } else {
    if (!signer.account?.address)
      return
    senderAddr = tonAddr(signer.account?.address!)
    sender = tonUiSender(signer)
  }

  const TON = Asset.native();
  const SCALE = Asset.jetton(Address.parse(jetton))
  const factory = tonClient.open(Factory.createFromAddress(MAINNET_FACTORY_ADDR))
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
  const seqno = await tonWalletGetSeqNo(senderAddr);
  console.log(`[DAVID](ds-ton-lib)(dedust-buy) buying ...`)
  await tonVault.sendSwap(sender, {
    poolAddress: pool.address,
    amount: toNano(tonAmount),
    gasAmount: toNano(swapFee)
  })
  await tonTrWait(senderAddr, seqno)
  console.log(`[VENUS](DEDUST) Success to buy`)
}

export const dedustSell = async (
  signer: TonConnectUI | WalletPair,
  jetton: string,
  jettonAmount: number
) => {

  const jettonInfo = await tonTokenInfo(jetton)
  if (!jettonInfo) return

  const tonClient = await tonGetClient()
  let sender: any
  let senderAddr: Address
  if (isWalletPair(signer)) {
    sender = tonClient.open(signer.wallet).sender(signer.key.secretKey)
    senderAddr = signer.wallet.address
  } else {
    if (!signer.account?.address)
      return
    senderAddr = tonAddr(signer.account?.address!)
    sender = tonUiSender(signer)
  }

  const TON = Asset.native();
  const SCALE = Asset.jetton(Address.parse(jetton))
  const factory = tonClient.open(Factory.createFromAddress(MAINNET_FACTORY_ADDR))
  const swapFee = 0.25

  const [found, message] = await dedustPoolFind(SCALE.address!)
  if (!found)
    return [false, 'Pool does not exist.']

  const pool = tonClient.open(
    await factory.getPool(PoolType.VOLATILE, [TON, SCALE])
  );

  const scaleRoot = tonClient.open(JettonRoot.createFromAddress(SCALE.address!));
  const scaleWallet = tonClient.open(await scaleRoot.getWallet(senderAddr));
  const scaleVault = tonClient.open(await factory.getJettonVault(scaleRoot.address));
  const tokenDecimals = parseInt(jettonInfo.decimals!)
  const seqno = await tonWalletGetSeqNo(senderAddr);
  await scaleWallet.sendTransfer(sender, toNano("0.3"), {
    amount: toDecimalsBN(jettonAmount, tokenDecimals),
    destination: scaleVault.address,
    responseAddress: senderAddr, // return gas to user
    forwardAmount: toNano(swapFee),
    forwardPayload: VaultJetton.createSwapPayload({ poolAddress: pool.address }),
  });
  await tonTrWait(senderAddr, seqno)
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
    const seqNo = await tonWalletGetSeqNo(signer)
    await lpWallet.sendBurn(sender, toNano(0.2), {
      amount: withdrawAmount
    })
    await tonTrWait(signer, seqNo)
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
    const seqNo = await tonWalletGetSeqNo(signer)
    await lpWallet.sendTransfer(sender, toNano(0.1), {
      destination: tonAddr(ZERO_ADDRESS),
      amount: burnAmount,
    })
    await tonTrWait(signer, seqNo)
  } catch (error) {
    console.log(`[DAVID](DEDUST)(Burn LP) error :`, error)
  }
}

export async function dedustLpQuery(who: WalletPair | Address | string, jetton: string): Promise<number> {
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

export async function dedustQueryPoolBalances(jetton: Address|string): Promise<PoolReserve|undefined> {
  const pool = await dedustGetPool(tonAddr(jetton))
  if (!pool)
    return undefined
  const tokenDecimals = await tonTokenDecimals(jetton)
  
  const [assetA, assetB] = await pool.getAssets()
  const [amountA, amountB] = await pool.getReserves()
  if (assetA.type === AssetType.NATIVE)
  {
    return {
      base: fromDecimalsBN(amountB, tokenDecimals),
      quote: Number(fromNano(amountA))
    }
  } else {
    return {
      base: fromDecimalsBN(amountA, tokenDecimals),
      quote: Number(fromNano(amountB))
    }
  }
}

// ---------------------- confirmation --------------------
export async function tonDedustConfirmBuy(
  who: TonAddress,
  token: Address | string,
  callback: any = undefined,
  timeout: number = DEFAULT_DELAY_FOR_TR_CONFIRM
) {
  const apiClient = await tonApiClient()
  const triggerStart = getCurrentTimestamp()

  console.log(`[DAVID](TON-LIB)(tonDedustConfirmBuy) trigger timestamp: `, Math.floor(triggerStart / 1000))
  while (true) {
    await sleep(1000)
    const curTimeStamp = getCurrentTimestamp()
    if (curTimeStamp - triggerStart > timeout) {
      console.log(`[DAVID](TON-LIB)(tonDedustConfirmBuy) ******** timeout **********`)
      return
    }
    try {
      let events = (await apiClient.accounts.getAccountEvents(
        tonAddrStr(who),
        {
          limit: 1,
          start_date: Math.floor(triggerStart / 1000)
        })).events
      if (events.length <= 0)
        continue;

      const ev = events[0]
      const swapAction = ev.actions.find(a => a.type === 'SmartContractExec')
      const jTrAction = ev.actions.find(a => a.type === 'JettonTransfer')
      if (!swapAction || !jTrAction)
        continue

      if (callback) {
        const jettonInfo = await tonTokenInfo(token)
        const decimals = jettonInfo?.decimals || 6
        callback(
          who,
          token,
          Number(fromDecimalsBN(jTrAction.JettonTransfer?.amount!, decimals)),
          ev.event_id
        )
      }
      return
    } catch (error) { }
  }
}