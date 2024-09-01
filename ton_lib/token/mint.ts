import { Address, toNano } from '@ton/core';
import { WalletPair } from '../types';
import { JettonMaster } from '@ton/ton';
import { tonAddr } from '../address/index';
import { tonGetClient, tonSender } from '../endpoint';
import { JettonMinter } from './contracts/JettonMinter.compile';
import { tonTokenInfo } from './query';
import { toDecimalsBN } from '../../utils/bignumber';
import { tonWalletGetSeqNo } from '../wallet';
import { tonTrWait } from '../transaction';

export async function tonTokenMint(signer: WalletPair, token: Address|string, amount: number, to: Address|string|undefined = undefined): Promise<any> {
  const tonClient = await tonGetClient()
  const sender = await tonSender(signer)
  
  const jettonMinter = tonClient.open(JettonMinter.createFromAddress(tonAddr(token)))
  const mintTo:Address = tonAddr(to ? to : signer)
  const jettonInfo = await tonTokenInfo(token)
  if (!jettonInfo)
    return
  const decimals = jettonInfo.decimals
  const seqNo = await tonWalletGetSeqNo(signer)
  await jettonMinter.sendMint(
    sender, 
    mintTo, 
    toDecimalsBN(amount, decimals!),
    toNano(0),
    toNano(0.01)
  )
  await tonTrWait(signer, seqNo)
}