import { Address, Cell, fromNano } from '@ton/core';
import { sleep } from "../utils/basic";
import { tonWalletGetSeqNo } from "./wallet";
import { tonAddr, tonAddrStr } from "./address";
import { getTonWebClient, tonApiClient } from "./endpoint";
import TonWeb from "tonweb";
import { TokenTransfer, TonAddress, WalletPair } from "./types";
import { tonTokenWalletAddress } from "./token/query";
import { DEFAULT_DELAY_FOR_TR_CONFIRM, OPCODES } from "./constants";
import { fromDecimalsBN } from "../utils/bignumber";
import { Api } from 'tonapi-sdk-js';
import { getCurrentTimestamp } from '../utils/time';

export const tonSendTrAndWait = async (wallet: TonAddress) => {
  const seqNo = await tonWalletGetSeqNo(wallet)
  let curSeqNo = seqNo

  while (curSeqNo === seqNo) {
    await sleep(1000)
    curSeqNo = await tonWalletGetSeqNo(wallet)
  }
}

export const tonTrWait = async (wallet: TonAddress, seqNo: number = -1) => {
  let curSeqNo = seqNo

  if (seqNo == -1) {
    seqNo = await tonWalletGetSeqNo(wallet)
  }

  while (true) {
    try {
      curSeqNo = await tonWalletGetSeqNo(wallet)
      if (curSeqNo != seqNo)
        return
    } catch (error) { }
    await sleep(1500)
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

export async function tonTrConfirmTonReceive(
  who: string | WalletPair | Address,
  from: string | Address | undefined = undefined,
  callback: any = undefined,
  timeout: number = DEFAULT_DELAY_FOR_TR_CONFIRM
): Promise<void> {

  const triggerStart = getCurrentTimestamp()
  const apiClient = await tonApiClient()

  console.log(`[DAVID](TON-LIB)(tonTrConfirmTonReceive) trigger timestamp: `, Math.floor(triggerStart/1000))
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
        const action = ev.actions.find(a => a.type === 'TonTransfer')
        if (action &&
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

  console.log(`[DAVID](TON-LIB)(tonTrConfirmTokenTransfer) trigger timestamp: `, Math.floor(triggerStart/1000))
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
      
      // console.log(`[DAVID](TON-LIB)(tonTrConfirmTokenTransfer) ******** event detected :: `, events)
      if (events.length > 0) {
        const ev = events[0]
        const action = ev.actions.find(a => a.type === 'JettonTransfer')
        // console.log(`[DAVID](TON-LIB)(tonTrConfirmTokenTransfer) ******** Jetton Transfer action :: `, action)
        if (action &&
          (tonAddrStr(token) === Address.normalize(action.JettonTransfer?.jetton.address!)) &&
          (!from || Address.normalize(action.JettonTransfer?.sender?.address!) === tonAddrStr(from))
        ) {
          if (callback)
            callback(
              who,
              token,
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