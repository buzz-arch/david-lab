import { internal, Address } from '@ton/ton';
import { AddressType, DEX, pTON,  } from '@ston-fi/sdk';
import { tonGetClient } from "../endpoint";
import { tonTrWait } from '../transaction';
import { WalletPair } from '../types';


const USER_WALLET_ADDRESS = Address.parse("0QDyM-6kQ8LMAMQ4oNNnw7gB7b97CQ3KHdvHlJzBhiOv3KHz")

export async function stonFiPoolCreateTonJet(signer: WalletPair, jetton: string, amountJ: number, amountT: number) {
  const tonClient = await tonGetClient()
  const router = tonClient.open(new DEX.v1.Router());
  const txsParams = await Promise.all([
    // deposit TON to the Jetton/TON pool and get at least 1 nano LP token
    router.getProvideLiquidityTonTxParams({
      userWalletAddress: signer.wallet.address,
      proxyTon: new pTON.v1(),
      sendAmount: amountT,
      otherTokenAddress: jetton,
      minLpOut: "1",
      queryId: 12345,
    }),
    // deposit STON to the Jetton/TON pool and get at least 1 nano LP token
    router.getProvideLiquidityJettonTxParams({
      userWalletAddress: signer.wallet.address,
      sendTokenAddress: jetton,
      sendAmount: amountJ,
      otherTokenAddress: new pTON.v1().address,
      minLpOut: "1",
      queryId: 123456,
    }),
  ]);

  const walletContract = tonClient.open(signer.wallet)
  const seqNo = await walletContract.getSeqno()
  await walletContract.sendTransfer(
    {
      seqno: seqNo,
      secretKey: signer.key.secretKey,
      messages: txsParams.map(tx => internal(tx))
    })
  console.log(`[VENUS](ston.fi) ------- SENDING POOL CREATION`)
  await tonTrWait(signer, seqNo)
  console.log(`[VENUS](ston.fi) ------- POOL POOL CREATION FINISHED`)
}

export async function tonPoolCreateJJ (
  signer: WalletPair, 
  jettonA: AddressType, 
  jettonB: AddressType, 
  amountA: number, 
  amountB: number
) {
  const tonClient = await tonGetClient()
  const router = tonClient.open(new DEX.v1.Router());
  const txsParams = await Promise.all([
    // deposit STON to the STON/GEMSTON pool and get at least 1 nano LP token
    router.getProvideLiquidityJettonTxParams({
      userWalletAddress: signer.wallet.address,
      sendTokenAddress: jettonA,
      sendAmount: amountA,
      otherTokenAddress: jettonB,
      minLpOut: "1",
      queryId: 12345,
    }),
    // deposit 2 GEMSTON to the STON/GEMSTON pool and get at least 1 nano LP token
    router.getProvideLiquidityJettonTxParams({
      userWalletAddress: USER_WALLET_ADDRESS,
      sendTokenAddress: jettonB,
      sendAmount: amountB,
      otherTokenAddress: jettonA,
      minLpOut: "1",
      queryId: 123456,
    }),
  ]);

  const walletContract = tonClient.open(signer.wallet)
  const seqNo = await walletContract.getSeqno()
  // await walletContract.sendTransfer(router,
  //   {
  //     seqno: seqNo,
  //     secretKey: signer.secretKey,
  //     messages: [internal(txsParams)]
  //   })
  await tonTrWait(signer, seqNo)
}
