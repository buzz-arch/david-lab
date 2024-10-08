import { JettonRoot, JettonWallet } from "@dedust/sdk"
import { tonGetClient, tonClient, tonApiClient } from '../endpoint';
import { Address, Dictionary, OpenedContract, Slice, fromNano } from "@ton/core";
import { TokenHolder, TonAddress, TonTokenDetails, WalletPair } from "../types";
import { tonAddr, tonAddrStr } from "../address";
import { fromDecimalsBN } from '../../utils/bignumber';
import { JettonHolders, JettonInfo } from "tonapi-sdk-js";

const ONCHAIN_CONTENT_PREFIX = 0x00;
const OFFCHAIN_CONTENT_PREFIX = 0x01;

const jettonOnChainMetadataSpec = {
  name: "bf4546a6ffe1b79cfdd86bad3db874313dcde2fb05e6a74aa7f3552d9617c79d",
  description: "bf5208def46f5a1d4f9dce66ab309f4a851305f166f91ef79d923ef58e34f9a2",
  image: "bff082eb663b57a00192f4a6ac467288df2dfeddb9da1bee28f6521c8bebd21f",
  decimals: "bf5d01fa5e3c06901c45046c6b2ddcea5af764fea0eed72a10d404f2312ceb24",
  symbol: "bf6ed4f942a7848ce2cb066b77a1128c6a1ff8c43f438a2dce24612ba9ffab8b",
  image_data: undefined,
  uri: "ascii",
};

function parseTokenContent(slice: Slice, tokenInfo: any) {
  let remainingRefs = slice.remainingRefs
  let i
  // console.log(`[DAVID](parseTokenContent) slice = `, slice)
  for (i = 0; i < remainingRefs; i++) {
    const s = slice.loadRef().asSlice()
    // console.log(`[DAVID](parseTokenContent) s = ${s}, remainingBits = ${s.remainingBits}`)
    if (s.remainingBits >= 263) // hash
    {
      const hash = s.loadBuffer(32).toString('hex')
      // console.log(`[DAVID](JETTON) hash = `, hash)
      Object.entries(jettonOnChainMetadataSpec).forEach(([k, v]) => {
        if (v === hash)
          tokenInfo[k] = s.loadStringRefTail().slice(1)
      })
    } else {
      parseTokenContent(s, tokenInfo)
    }
  }
}

export async function tonTokenInfo(tokenAddr: Address | string): Promise<TonTokenDetails | undefined> {
  try {
    const apiClient = await tonApiClient()
    const jettonInfo: JettonInfo = await apiClient.jettons.getJettonInfo(tonAddrStr(tokenAddr))
    return {
      name: jettonInfo.metadata.name,
      description: jettonInfo.metadata.description,
      image: jettonInfo.metadata.image,
      decimals: jettonInfo.metadata.decimals,
      symbol: jettonInfo.metadata.symbol,
      image_data: undefined,
      uri: undefined,
      totalSupply: jettonInfo.total_supply,
      isMintable: jettonInfo.mintable,
      adminAddress: jettonInfo.admin ? Address.normalize(jettonInfo.admin?.address) : undefined
    }
  } catch (error) {
    console.log(`[DAVID](TON-LIB)(tonTokenInfo) error :`, error)
    return undefined
  }

  // const tonClient = await tonGetClient()
  // const jetton = tonClient.open(JettonRoot.createFromAddress(tonAddr(tokenAddr)))
  // const jettonData = await jetton.getJettonData()
  // const contentSlice = jettonData.content.asSlice()
  // let tokenInfo: TonTokenDetails = {
  //   name: "",
  //   description: undefined,
  //   image: undefined,
  //   decimals: "6",
  //   symbol: "",
  //   image_data: undefined,
  //   uri: undefined,
  //   totalSupply: "0",
  //   isMintable: undefined,
  //   adminAddress: undefined
  // }

  // tokenInfo.totalSupply = jettonData.totalSupply.toString()
  // tokenInfo.isMintable = jettonData.isMintable
  // tokenInfo.adminAddress = jettonData.adminAddress?.toString()
  // // console.log(`[DAVID](JETTON) contentSlice = `, contentSlice)
  // const prefix = contentSlice.loadUint(8)
  // switch (prefix) {
  //   case ONCHAIN_CONTENT_PREFIX:
  //     const dictSlice = contentSlice.loadRef().asSlice()
  //     parseTokenContent(dictSlice, tokenInfo)
  //     break
  //   case OFFCHAIN_CONTENT_PREFIX:
  //     let metaUri = contentSlice.loadStringTail()
  //     metaUri = metaUri.replace('ipfs://', 'https://ipfs.io/ipfs/')
  //     const metaResp = await fetch(metaUri)
  //     if (metaResp.status === 200) {
  //       const metaData = await metaResp.json()
  //       tokenInfo = {
  //         ...tokenInfo,
  //         ...metaData,
  //         image: metaData.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
  //       }
  //     }
  //     break
  //   default:
  //     console.log(`[DAVID](TON-TOKENINFO) Unknown content type!`)
  //     break
  // }

  // return tokenInfo
}

export async function tonTokenDecimals(tokenAddr: TonAddress): Promise<number> {
  const tokenInfo = await tonTokenInfo(tonAddr(tokenAddr))
  return Number(tokenInfo?.decimals)
}

export async function tonTokenGetBalance(wallet: TonAddress, token: Address | string): Promise<bigint> {
  try {
    const apiClient = await tonApiClient()
    const jBalance = await apiClient.accounts.getAccountJettonBalance(
      tonAddrStr(wallet),
      tonAddrStr(token)
    )
    return BigInt(jBalance.balance)
    // const tonClient = await tonGetClient()
    // const jettonRoot: OpenedContract<JettonRoot> = tonClient.open(JettonRoot.createFromAddress(tonAddr(token)));
    // const jettonWallet: OpenedContract<JettonWallet> = tonClient.open(await jettonRoot.getWallet(tonAddr(wallet)));
    // const balance = await jettonWallet.getBalance()
    // return balance
  } catch (error) {
    return BigInt(0)
  }
}

export async function tonTokenWalletAddress(who: Address | string | WalletPair, token: Address | string): Promise<string | undefined> {
  try {
    const apiClient = await tonApiClient()
    const jBalance = await apiClient.accounts.getAccountJettonBalance(
      tonAddrStr(who),
      tonAddrStr(token)
    )
    return Address.normalize(jBalance.wallet_address.address)
  } catch (error) {
    return undefined
  }
  // const tonClient = await tonGetClient()
  // const jetton = tonClient.open(JettonRoot.createFromAddress(tonAddr(token)))
  // const jettonWallet = tonClient.open(await jetton.getWallet(tonAddr(who)))
  // return jettonWallet.address?.toString() || undefined
}

export async function tonTokenGetHolderList(token: string): Promise<TokenHolder[] | undefined> {
  const apiClient = await tonApiClient()
  try {
    const holderList: JettonHolders = await apiClient.jettons.getJettonHolders(token)
    if (holderList.total <= 0)
      return undefined

    // console.log(`[DAVID](ton-lib)(tonTokenGetHolderList)(${token}) holder list :`, holderList)
    const tokenDetails = await tonTokenInfo(token)
    if (!tokenDetails)
      return undefined
    const totalSupply = tokenDetails.totalSupply
    const result: TokenHolder[] = holderList.addresses.map((addr) => {
      return {
        who: Address.normalize(addr.owner.address),
        balance: addr.balance,
        percent: (Number(addr.balance) * 100) / Number(totalSupply)
      }
    })
    return result
  } catch (error) {
    console.log(`[DAVID](ton-lib)(tonTokenGetHolderList) error :`, error)
  }

  return undefined
}
