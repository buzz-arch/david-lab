import { Address, Cell, fromNano } from '@ton/core';
import { sleep } from "../utils/basic";
import { tonWalletGetSeqNo } from "./wallet";
import { tonAddr, tonAddrStr } from "./address";
import { getTonWebClient, tonApiClient } from "./endpoint";
import TonWeb from "tonweb";
import { TokenTransfer, WalletPair } from "./types";
import { tonTokenWalletAddress } from "./token/query";
import { OPCODES } from "./constants";
import { fromDecimalsBN } from "../utils/bignumber";
import { Api } from 'tonapi-sdk-js';
import { getCurrentTimestamp } from '../utils/time';

export const DEFAULT_DELAY_FOR_TR_CONFIRM: number = (60 * 1000)

export const tonSendTrAndWait = async (wallet: any) => {
  const seqNo = await tonWalletGetSeqNo(wallet)
  let curSeqNo = seqNo

  while (curSeqNo === seqNo) {
    await sleep(1000)
    curSeqNo = await tonWalletGetSeqNo(wallet)
  }
}

export const tonTrWait = async (wallet: any, seqNo: number = -1) => {
  let curSeqNo = seqNo

  if (seqNo == -1) {
    curSeqNo = await tonWalletGetSeqNo(wallet)
  }

  while (curSeqNo === seqNo) {
    await sleep(1500)
    try {
      curSeqNo = await tonWalletGetSeqNo(wallet)
    } catch (error) { }
  }
}

export async function tonTrGetHash(address: string): Promise<string> {
  try {
    const client: TonWeb = await getTonWebClient()
    const result = await client.provider.getTransactions(address, 1);
    if (result.length > 0) {
      // console.log(`[DAVID](ton-lib)(getTransactionHash) tr =`, result[0])
      // const message = Buffer.from(result[0].in_msg.message, 'base64')
      const data = Cell.fromBase64(result[0].in_msg.msg_data.body).asSlice()
      const message: TokenTransfer = {
        opcode: data.loadUint(32),
        queryId: data.loadIntBig(64),
        amount: data.loadCoins(),
        from: data.loadAddress(),
        response_address: data.loadAddress(),
        forward_ton_amount: data.loadCoins()
      }
      console.log(message)
      return result[0].transaction_id?.hash;
    } else {
      console.log('[DAVID](ton-lib)(getTransactionHash) No transaction found for the given seqno');
      return ""
    }
  } catch (error) {
    console.error('[DAVID](ton-lib)(getTransactionHash) Error fetching transaction:', error);
    return ""
  }
}

// export async function tonTrConfirmTokenTransfer(
//   who: string | WalletPair | Address,
//   token: string | Address,
//   from: string | Address | undefined = undefined,
//   callback: any = undefined): Promise<void> {
//   const client: TonWeb = await getTonWebClient()
//   const jettonWallet = await tonTokenWalletAddress(who, token)
//   // console.log(`[DAVID](ton-lib)(tonTrConfirmTokenTransfer) +++++++++++++++++ jettonWallet: `, jettonWallet)
//   let retryCount = 0
//   if (!jettonWallet)
//     return undefined

//   let lastTimeStamp: number = 0
//   const oldTransaction = await client.provider.getTransactions(jettonWallet, 1);

//   if (oldTransaction && oldTransaction.length > 0)
//     lastTimeStamp = oldTransaction[0].utime

//   while (retryCount < 100) {
//     try {
//       const result = await client.provider.getTransactions(jettonWallet, 1);
//       // console.log(`[DAVID](ton-lib)(tonTrConfirmTokenTransfer) +++++++++++++++++ (1): `, lastTimeStamp)
//       if (result && result.length > 0 && (!lastTimeStamp || lastTimeStamp !== result[0].utime)) {
//         const msgBody = result[0].in_msg?.msg_data?.body
//         const txHash: string = result[0].transaction_id?.hash
//         if (msgBody) {
//           const data = Cell.fromBase64(msgBody).asSlice()
//           const opCode = data.loadUint(32)
//           if (opCode === OPCODES.TOKEN_INTERNAL_TRANSFER) {
//             const message: TokenTransfer = {
//               opcode: opCode,
//               queryId: data.loadIntBig(64),
//               amount: data.loadCoins(),
//               from: data.loadAddress(),
//               response_address: data.loadAddress(),
//               forward_ton_amount: data.loadCoins()
//             }
//             // console.log(`[DAVID](ton-lib)(tonTrConfirmTokenTransfer) trFrom :`, message.from.toString())
//             if (!from || from === message.from.toString()) {
//               if (callback)
//                 callback(who, token, fromDecimalsBN(message.amount), Buffer.from(txHash, 'base64').toString('hex'))
//               return
//             }
//           }
//         }
//       }
//     } catch (error) {
//       console.log(`[DAVID](ton-lib)(tonTrConfirmTokenTransfer) ERROR :`, error)
//     }

//     await sleep(1500)
//     retryCount++
//     continue
//   }
//   console.log(`[DAVID](ton-lib)(tonTrConfirmTokenTransfer) ************** time expired *********`)
// }

// export async function tonTrConfirmTonReceive(
//   who: string | WalletPair | Address,
//   from: string | Address | undefined = undefined,
//   callback: any = undefined): Promise<void> {

//   const account: string = tonAddr(who).toString()
//   const client: TonWeb = await getTonWebClient()
//   let retryCount = 0

//   let lastTimeStamp: number = 0
//   const oldTransaction = await client.provider.getTransactions(account, 1);
//   // console.log(`[DAVID](ton-lib)(tonTrConfirmTonReceive) +++++++++++++++++ oldTransaction: `, oldTransaction[0])
//   if (oldTransaction && oldTransaction.length > 0)
//     lastTimeStamp = oldTransaction[0].utime

//   while (retryCount < 100) {
//     try {
//       const result = await client.provider.getTransactions(account, 1);
//       if (result && result.length > 0 && result[0].in_msg && (!lastTimeStamp || lastTimeStamp !== result[0].utime)) {
//       // if (true) {
//         const inMsg = result[0].in_msg
//         const txHash: string = result[0].transaction_id?.hash
//         console.log(from, inMsg.source)
//         if (from === inMsg.source && inMsg.value) {
//           if (callback)
//             callback(
//               who,
//               from,
//               fromNano(inMsg.value),
//               Buffer.from(txHash, 'base64').toString('hex'))
//           return
//         }
//       }
//     } catch (error) {
//       console.log(`[DAVID](ton-lib)(tonTrConfirmTonReceive) ERROR :`, error)
//     }

//     await sleep(1500)
//     retryCount++
//     continue
//   }
//   console.log(`[DAVID](ton-lib)(tonTrConfirmTonReceive) ************** time expired *********`)
// }

export async function tonTrConfirmTonReceive(
  who: string | WalletPair | Address,
  from: string | Address | undefined = undefined,
  callback: any = undefined,
  timeout: number = DEFAULT_DELAY_FOR_TR_CONFIRM
): Promise<void> {

  const triggerStart = getCurrentTimestamp()
  const apiClient = await tonApiClient()

  while (true) {
    const curTimeStamp = getCurrentTimestamp()
    if (curTimeStamp - triggerStart > timeout) {
      console.log(`[DAVID](TON-LIB)(tonTrConfirmTonReceive) ******** timeout **********`)
      return
    }
    try {
      let events = (await apiClient.accounts.getAccountEvents(
        tonAddrStr(who),
        {
          limit: 1,
          start_date: Math.floor(triggerStart / 1000)
        })).events

      if (events.length > 0) {
        const ev = events[0]
        const action = ev.actions[0]
        if (action.type === 'TonTransfer' &&
          (!from || Address.normalize(action.TonTransfer?.sender?.address!) === tonAddrStr(from))
        ) {
          if (callback)
            callback(who, from, fromNano(action.TonTransfer?.amount!), ev.event_id)
          return
        }
      }
    } catch (error) { }

    await sleep(1000)
  }
}

export async function tonTrConfirmTokenTransfer(
  who: string | WalletPair | Address,
  token: string | WalletPair | Address,
  from: string | Address | undefined = undefined,
  callback: any = undefined,
  timeout: number = DEFAULT_DELAY_FOR_TR_CONFIRM
): Promise<void> {

  const triggerStart = getCurrentTimestamp()
  const apiClient = await tonApiClient()

  while (true) {
    const curTimeStamp = getCurrentTimestamp()
    if (curTimeStamp - triggerStart > timeout) {
      console.log(`[DAVID](TON-LIB)(tonTrConfirmTokenTransfer) ******** timeout **********`)
      return
    }

    try {
      let events = (await apiClient.accounts.getAccountEvents(
        tonAddrStr(who),
        {
          limit: 1,
          start_date: Math.floor(triggerStart / 1000)
        })).events

      if (events.length > 0) {
        const ev = events[0]
        const action = ev.actions[0]
        if (action.type === 'JettonTransfer' &&
          (tonAddrStr(token) === Address.normalize(action.JettonTransfer?.jetton.address!)) &&
          (!from || Address.normalize(action.JettonTransfer?.sender?.address!) === tonAddrStr(from))
        ) {
          if (callback)
            callback(
              who,
              from,
              fromDecimalsBN(action.JettonTransfer?.amount!, action.JettonTransfer?.jetton.decimals),
              ev.event_id)
          return
        }
      }
    } catch (error) { }

    await sleep(1000)
  }
}