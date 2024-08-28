import { JettonRoot, JettonWallet } from "@dedust/sdk"
import { tonGetClient } from "../endpoint"
import { Address, beginCell, Builder, Cell, Sender, SenderArguments, SendMode, Slice, toNano } from "@ton/core"
import { tonTokenGetBalance, tonTokenInfo } from "./query"
import { toDecimalsBN } from "../../utils/bignumber"
import { tonTrConfirmTokenTransfer, tonTrWait } from "../transaction"
import { WalletPair } from "../types"
import { sleep } from "../../utils/basic"
import { Contract } from "tonweb/dist/types/contract/contract"
import { Maybe } from "@ton/core/dist/utils/maybe"
import { tonAddr } from "../address"
import { TonConnectUI } from "@tonconnect/ui-react"

export async function tonTokenTransfer(signer: WalletPair, token: string, to: string, amount: number, forwardPayload: Cell | undefined = undefined, forwardAmount: number | undefined = undefined) {
  const tonClient = await tonGetClient()
  const wallet = tonClient.open(signer.wallet)
  const sender = wallet.sender(signer.key.secretKey)
  const jetton = tonClient.open(JettonRoot.createFromAddress(Address.parse(token)))
  const jettonWallet = tonClient.open(await jetton.getWallet(wallet.address))
  const jettonDetails = await tonTokenInfo(token)
  const seqNo = await wallet.getSeqno()
  const trAmount = toDecimalsBN(amount, jettonDetails?.decimals || 6)
  // const oldBalance = await tonTokenGetBalance(to, token)

  await jettonWallet.sendTransfer(sender, toNano(0.25 + (forwardAmount || 0)), {
    destination: Address.parse(to),
    amount: trAmount,
    responseAddress: wallet.address,
    forwardAmount: toNano(forwardAmount || 0),
    forwardPayload: forwardPayload || Cell.EMPTY,
  })
  await tonTrWait(wallet, seqNo)
  console.log(`[DAVID](TON-TOKEN) tonTokenTransfer :: ${amount} jetton(${token}) transfered from ${wallet.address.toString()} - ${to}`)
}

export function tonUiSender(connect: TonConnectUI): Sender{
  return {
    send: async (args: SenderArguments) => {
      connect.sendTransaction({
        messages: [
          {
            address: args.to.toString(),
            amount: args.value.toString(),
            payload: args.body?.toBoc().toString('base64'),
          },
        ],
        validUntil: Date.now() + 5 * 60 * 1000, // 5 minutes for user to approve
      });
    },

    address: Address.parse(connect.account?.address!)
  };
}

export async function tonUiTokenTransfer(
  connect: TonConnectUI, 
  token: string, 
  to: string, 
  amount: number, 
  forwardPayload: Cell | undefined = undefined, 
  forwardAmount: number | undefined = undefined) 
{
  if (!connect.account?.address)
    return

  const senderAddr = Address.parse(connect.account?.address)
  const tonClient = await tonGetClient()
  const sender = tonUiSender(connect)
  const jetton = tonClient.open(JettonRoot.createFromAddress(Address.parse(token)))
  const jettonWallet = tonClient.open(await jetton.getWallet(senderAddr))
  const jettonDetails = await tonTokenInfo(token)
  const trAmount = toDecimalsBN(amount, jettonDetails?.decimals || 6)

  await jettonWallet.sendTransfer(sender, toNano(0.25 + (forwardAmount || 0)), {
    destination: Address.parse(to),
    amount: trAmount,
    responseAddress: senderAddr,
    forwardAmount: toNano(forwardAmount || 0),
    forwardPayload: forwardPayload || Cell.EMPTY,
  })

  console.log(`[DAVID](TON-TOKEN) tonTokenTransfer :: ${amount} jetton(${token}) transfered from ${senderAddr} - ${to}`)
}
