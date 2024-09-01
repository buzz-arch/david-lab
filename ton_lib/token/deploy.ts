import walletHex from "./contracts/jetton-wallet.compiled.json";
import minterHex from "./contracts/jetton-minter.compiled.json";
import { deployContract, uiDeployContract } from "./contract-deployer";
import { Sha256 } from '@aws-crypto/sha256-js';
import { Dictionary, Cell, beginCell, toNano, Address } from "@ton/core";
import { WalletContractV4 } from "@ton/ton";
import { toDecimalsBN } from "../../utils/bignumber";
import { DEPLOY_GAS, JETTON_RENT } from "../common";
import { JettongDeployParam, OnChainMetadata, WalletPair } from "../types";
import { TonConnectUI } from "@tonconnect/ui-react";
import { tonAddrWaitForActive } from "../address";

const ONCHAIN_CONTENT_PREFIX = 0x00;
const OFFCHAIN_CONTENT_PREFIX = 0x01;
const SNAKE_PREFIX = 0x00;
const JETTON_WALLET_CODE = Cell.fromBoc(Buffer.from(walletHex.hex, 'hex'))[0];
const JETTON_MINTER_CODE = Cell.fromBoc(Buffer.from(minterHex.hex, 'hex'))[0]; // code cell from build output
const JETTON_DEPLOY_GAS = toNano(DEPLOY_GAS);

const OPS = {
  ChangeAdmin: 3,
  ReplaceMetadata: 4,
  Mint: 21,
  InternalTransfer: 0x178d4519,
  Transfer: 0xf8a7ea5,
  Burn: 0x595f07bc
}

type ISpectEncoding = { [key: string]: BufferEncoding };

const jettonOnChainMetadataSpec: ISpectEncoding = {
  name: "utf8",
  description: "utf8",
  image: "ascii",
  decimals: "utf8",
  symbol: "utf8",
  image_data: "hex",
  uri: "ascii",
};

const sha256 = (str: string) => {
  const sha = new Sha256();
  sha.update(str);
  return Buffer.from(sha.digestSync());
};

export const buildJettonOffChainMetadata = (contentUri: string) => {
  return beginCell()
    .storeInt(OFFCHAIN_CONTENT_PREFIX, 8)
    .storeBuffer(Buffer.from(contentUri, "ascii"))
    .endCell();
}

export const buildJettonOnchainMetadata = (data: OnChainMetadata) => {
  const dictionary = Dictionary.empty(Dictionary.Keys.Buffer(32), Dictionary.Values.Cell())

  Object.entries(data).forEach(([k, v]) => {

    // console.log(`[DAVID](buildJettonOnchainMetadata) key = ${k}, value = ${v}`)
    if (!(k in jettonOnChainMetadataSpec)) {
      throw new Error(`Unsupported onchain key: ${k}`);
    }

    let bufferToStore = Buffer.from(v as string, jettonOnChainMetadataSpec[k]);

    const CELL_MAX_SIZE_BYTES = Math.floor((1023 - 8) / 8);

    const rootCell = beginCell().storeUint(SNAKE_PREFIX, 8)
    let currentCell = rootCell;

    while (bufferToStore.length > 0) {
      currentCell = currentCell.storeBuffer(bufferToStore.slice(0, CELL_MAX_SIZE_BYTES))
      bufferToStore = bufferToStore.slice(CELL_MAX_SIZE_BYTES);
      if (bufferToStore.length > 0) {
        console.log(`[DAVID](buildJettonOnchainMetadata) ------- over max cell size`)
        let newCell = new Cell();
        currentCell.storeRef(newCell);
        currentCell = newCell.asBuilder();
      }
    }

    // console.log(`[VENUS](buildJettonOnchainMeatdata) rootCell = `, rootCell.asCell().toString())
    dictionary.set(sha256(k), rootCell.asCell());
  });

  const metadata = beginCell().storeInt(ONCHAIN_CONTENT_PREFIX, 8)
  dictionary.store(metadata)
  const mdata = metadata.endCell()
  // console.log(`[VENUS](buildJettonOnchainMetadata) metadata = ${mdata.toString()}`)
  return mdata
}

export const initData = (
  owner: Address,
  data: OnChainMetadata,
  offchainUri: string,
) => {
  if (!data && !offchainUri) {
    throw new Error("Must either specify onchain data or offchain uri");
  }
  return beginCell()
    .storeCoins(0)
    .storeAddress(owner)
    .storeRef(
      offchainUri ? buildJettonOffChainMetadata(offchainUri) : buildJettonOnchainMetadata(data),
    )
    .storeRef(JETTON_WALLET_CODE)
    .endCell();
}

export const mintBody = (
  owner: Address,
  jettonValue: bigint,
  mintTo: Address,
  transferToJWallet: bigint,
  queryId: number,
) => {
  return beginCell()
    .storeUint(OPS.Mint, 32)
    .storeUint(queryId, 64) // queryid
    .storeAddress(owner)
    .storeCoins(transferToJWallet)
    .storeRef(
      // internal transfer message
      beginCell()
        .storeUint(OPS.InternalTransfer, 32)
        .storeUint(0, 64)
        .storeCoins(jettonValue)
        .storeAddress(null)
        .storeAddress(mintTo)
        .storeCoins(toNano(0.01))
        .storeBit(false) // forward_payload in this slice, not separate cell
        .endCell(),
    )
    .endCell();
}

export const createDeployParams = (
  params: OnChainMetadata,
  owner: Address,
  mintTo: Address,
  mintAmount: bigint,
  offchainUri: string = ''): JettongDeployParam => {
  const queryId = 0;

  return {
    deployer: owner,
    code: JETTON_MINTER_CODE,
    data: initData(owner, params, offchainUri),
    message: mintBody(owner, mintAmount, mintTo, toNano(JETTON_RENT), queryId),
    value: JETTON_DEPLOY_GAS,
    mintAmount,
    mintTo,
  };
};

export async function tonCreateToken(
  tokenDetails: OnChainMetadata, 
  singer: WalletPair, 
  mintAmount: number | undefined = undefined, 
  mintTo: string | undefined = undefined
) {
  const _mintAmount = mintAmount ? toDecimalsBN(mintAmount, tokenDetails.decimals!) : toNano(0)
  const _mintTo = mintTo ? Address.parse(mintTo) : singer.wallet.address
  const deployParams = createDeployParams(tokenDetails, singer.wallet.address, _mintTo, _mintAmount)
  const tokenContract = await deployContract(deployParams, singer)
  return tokenContract.toString()
}

export async function tonUiCreateToken(
  tonConnection: TonConnectUI, 
  tokenDetails: OnChainMetadata, 
  mintAmount: number | undefined = undefined, 
  mintTo: string | undefined = undefined
): Promise<string|undefined> {
  if (!tonConnection.account?.address)
    return undefined
  const owner: Address = Address.parse(tonConnection.account?.address!)
  const _mintAmount = mintAmount ? toDecimalsBN(mintAmount, tokenDetails.decimals!) : toNano(0)
  const _mintTo = mintTo ? Address.parse(mintTo) : owner
  const deployParams = createDeployParams(tokenDetails, owner, _mintTo, _mintAmount)
  const tokenContract = await uiDeployContract(deployParams, tonConnection)
  if ((await tonAddrWaitForActive(tokenContract)) === false)
    return undefined
  return tokenContract.toString()
}
