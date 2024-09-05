import { KeyPair } from "@ton/crypto";
import { WalletContractV4 } from '@ton/ton';
import axios from "axios";
import * as dotenv from "dotenv";
import { sleep } from "../utils/basic";

dotenv.config();

export const NETWORK = 'mainnet';
export const WORKCHAIN = process.env.WORKCHAIN ? parseInt(process.env.WORKCHAIN) : 0;
export const TESTONLY = NETWORK == 'testnet' ? true : false;
export const DEPLOY_GAS = process.env.DEPLOY_GAS != undefined ? parseFloat(process.env.DEPLOY_GAS) : 0.07;
export const JETTON_RENT = process.env.TOKEN_RENT != undefined ? parseFloat(process.env.TOKEN_RENT) : 0.02;

let curTonPrice:number = 0

async function fetchPrice(): Promise<void> {
  const response = await axios.get('https://tonapi.io/v2/rates?tokens=ton&currencies=usd');
  curTonPrice = Number(response.data.rates.TON.prices.USD);
}

export function tonPrice(): number {
  return curTonPrice
}

async function tonlibTask() {
  while(true) {
    try {
      await fetchPrice()
    } catch (error) {}
    await sleep(5000)
  }
}

tonlibTask()