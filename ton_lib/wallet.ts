
import { mnemonicToWalletKey, mnemonicNew, KeyPair, mnemonicToPrivateKey } from "@ton/crypto";
import { tonClient, tonGetClient } from "./endpoint";
import { JettonWallet, WalletContractV4 } from '@ton/ton';
import { sleep } from "../utils/basic";
import { internal, Address, fromNano, Cell, toNano } from "@ton/core";
import { TESTONLY, WORKCHAIN } from "./common";
import { WalletPair } from "./types";
import { tonTrGetHash, tonTrWait } from "./transaction";
import { tonAddr, tonAddrStr } from './address/index';
import { TonConnectUI } from "@tonconnect/ui-react";
import { tonUiSender } from "./token/transfer";

export const tonWalletImport = async (mnemonic: string|string[]): Promise<WalletPair> => {
  if (typeof mnemonic === "string")
    mnemonic = mnemonic.split(' ')
  const key = await mnemonicToWalletKey(mnemonic);
  const wallet = WalletContractV4.create({ workchain: WORKCHAIN, publicKey: key.publicKey });
  return { key, wallet }
}

export const tonWalletCreate = async () => {
  const mnemonics = await mnemonicNew()
  return await tonWalletImport(mnemonics)
}

export async function tonWalletGetBalance(address: Address | string): Promise<string> {
  let addr: Address;
  if (!(address instanceof Address)) {
    addr = Address.parse(address)
  } else {
    addr = address;
  }

  const client = await tonGetClient();
  const balance = await client.getBalance(addr);
  return fromNano(balance)
}

export const tonWalletSendCoin = async (who: WalletPair, to: string, amount: number, body: string|Cell|undefined = undefined) => {
  const client = await tonGetClient()
  const walletContract = client.open(who.wallet)
  const seqno = await walletContract.getSeqno();

  const oldBalance = await walletContract.getBalance()
  await walletContract.sendTransfer({
    secretKey: who.key.secretKey,
    seqno: seqno,
    messages: [
      internal({
        to,
        value: toNano(amount),
        body: body || Cell.EMPTY,
        bounce: true
      })
    ]
  })

  await tonTrWait(who.wallet, seqno)
  console.log(`[DAVID](tonWalletSendCoin) transaction confirmed`)
  while(true) {
    const balance = await walletContract.getBalance()
    if (oldBalance !== balance)
      break
    await sleep(1000)
  }
}

export const tonUiWalletSendCoin = async (who: TonConnectUI, to: string, amount: number, body: Cell|undefined = undefined) => {
  const client = await tonGetClient()
  if (!who.account?.address)
    return

  const senderAddr:string = tonAddrStr(who.account?.address)
  const walletContract = client.open(WalletContractV4.create({workchain: 0, publicKey: Buffer.from(senderAddr)}))
  const seqno = await walletContract.getSeqno();
  const oldBalance = await walletContract.getBalance()
  const sender = tonUiSender(who)

  await sender.send({
    value: toNano(amount),
    to: tonAddr(to),
    body: body ? body : Cell.EMPTY
  })
  
  await tonTrWait(who.wallet, seqno)
  console.log(`[DAVID](tonWalletSendCoin) transaction confirmed`)
  while(true) {
    const balance = await walletContract.getBalance()
    if (oldBalance !== balance)
      break
    await sleep(1000)
  }
}

export const tonWalletGetSeqNo = async (wallet: any) => {
  const tonClient = await tonGetClient()
  const w = tonClient.open(wallet)
  const seqno = await w.getSeqno()
  return seqno
}

export async function tonWalletLatestTxHash(signer: WalletPair|WalletContractV4|string): Promise<string> {
  let address: string
  if (signer instanceof WalletContractV4) {
    address = signer.address.toString()
  }
  else if (typeof signer === "string" ) {
    address = signer
  }
  else {
    address = signer.wallet.address.toString()
    
  }
  const txHash = await tonTrGetHash(address)
  return txHash
}