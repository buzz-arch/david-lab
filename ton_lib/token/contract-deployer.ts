import { tonApiClient, tonGetClient } from "../endpoint";
import { internal, external, contractAddress, loadCommonMessageInfoRelaxed, SendMode, toNano, storeStateInit, beginCell, Builder, Cell } from '@ton/core';
import { tonWalletGetSeqNo } from "../wallet";
import { sleep } from '../../utils/basic';
import { tonSendTrAndWait, tonTrWait } from "../transaction";
import { sign } from "crypto";
import { DEPLOY_GAS, JETTON_RENT } from "../common";
import { JettonMinter } from "./contracts/JettonMinter.compile";
import { JettongDeployParam, WalletPair } from "../types";
import { tonTokenGetBalance } from "./query";
import { tonAccountWaitForActive } from "../accounts";
import { SendTransactionRequest, TonConnectUI } from "@tonconnect/ui-react";

function addressForContract(params: any) {
  return contractAddress(
    0,
    {
      code: params.code,
      data: params.data
    }
  );
}

export async function deployContract(
  params: JettongDeployParam,
  signer: WalletPair,
) {
  const stateInit = {
    code: params.code,
    data: params.data
  }

  const _contractAddress = addressForContract(params);
  const apiClient = await tonApiClient()
  const tonClient = await tonGetClient()
  const jettonMinter = tonClient.open(new JettonMinter(_contractAddress, stateInit))
  const sender = tonClient.open(signer.wallet).sender(signer.key.secretKey)
  let seqNo
  console.log(`[DAVID] Deploying Minter ...`)
  seqNo = await tonWalletGetSeqNo(signer)
  await jettonMinter.sendDeploy(sender, params.value)
  await tonTrWait(signer, seqNo)
  const minterAddr = _contractAddress.toString()
  console.log(`[DAVID] Deployed token: ${minterAddr}`)

  console.log(`[DAVID] Waiting for active state of minter`)
  await tonAccountWaitForActive(minterAddr)

  console.log(`[DAVID] Minting...`)
  seqNo = await tonWalletGetSeqNo(signer)
  console.log(`[DAVID](ton-lib) sending mint transaction...`)
  await jettonMinter.sendMint(sender, params.mintTo, params.mintAmount, toNano(JETTON_RENT), toNano(JETTON_RENT + 0.01))
  console.log(`[DAVID](ton-lib) mint transaction posted waiting wallet confirmation...`)
  await tonTrWait(signer, seqNo)

  console.log(`[DAVID](ton-lib)(MINT) waiting for balance change`)
  while (true) {
    const jBalance = await tonTokenGetBalance(params.mintTo, _contractAddress)
    console.log(`[DAVID](ton-lib)(MINT) cur balance =`, jBalance)
    if (jBalance === params.mintAmount)
      break
    await sleep(1500)
  }
  console.log(`[DAVID] Complete!`)
  return _contractAddress;
}

export async function uiDeployContract(
  params: JettongDeployParam,
  connection: TonConnectUI,
) {
  const stateInit = {
    code: params.code,
    data: params.data
  }
  const builder: Builder = beginCell()
  storeStateInit(stateInit)(builder)
  const initCell: string = builder.endCell().toBoc().toString("base64")
  const _contractAddress = addressForContract(params);

  const tx: SendTransactionRequest = {
    validUntil: Date.now() + 5 * 60 * 100,
    messages: [
      {
        address: _contractAddress.toString(),
        amount: toNano(DEPLOY_GAS + JETTON_RENT).toString(),
        stateInit: initCell,
        payload: params.message?.toBoc().toString('base64')
      },
    ],
  }

  await connection.sendTransaction(tx)
  return _contractAddress;
}

