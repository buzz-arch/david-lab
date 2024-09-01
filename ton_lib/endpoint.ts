import { TonClient4, TonClient, Sender } from "@ton/ton";
import { getHttpEndpoint, getHttpV4Endpoint } from "@orbs-network/ton-access";
import { HttpClient, Api } from 'tonapi-sdk-js';
import { NETWORK } from "./common";
import TonWeb from "tonweb";
import { WalletPair } from "./types";

export let tonapiClient: Api<any>;
export let lc4: TonClient4;
export let tonClient: TonClient;
let tonwebClient: TonWeb;

const tonApi = {
  url: NETWORK === 'mainnet' ? "https://tonapi.io" : "https://testnet.tonapi.io",
  key: process.env.TONAPI_KEY
}
const tonWeb = {
  url: NETWORK === 'mainnet' ? "https://toncenter.com/api/v2/jsonRPC" : "https://testnet.toncenter.com/api/v2/jsonRPC",
  key: NETWORK === 'mainnet' ? (process.env.TONWEB_MAINNET || process.env.NEXT_PUBLIC_TONWEB_MAINNET) 
                             : (process.env.TONWEB_TESTNET || process.env.NEXT_PUBLIC_TONWEB_TESTNET)
}

export const tonGetClient = async () => {
  if (tonClient)
    return tonClient
  tonClient = new TonClient({ endpoint: tonWeb.url, apiKey: tonWeb.key });
  return tonClient
}

export async function getTonWebClient(): Promise<TonWeb> {
  if (tonwebClient) {
    return tonwebClient
  }

  tonwebClient = new TonWeb(new TonWeb.HttpProvider(tonWeb.url, {apiKey: tonWeb.key}));
  return tonwebClient
}

export const tonApiClient = async () => {
  if (tonapiClient) {
    return tonapiClient
  }

  const headers = {
    'Content-type': 'application/json',
    'Authorization': '',
  }

  if (tonApi.key) {
    headers.Authorization = `Bearer ${tonApi.key}`;
  }

  const httpClient = new HttpClient({
    baseUrl: tonApi.url,
    baseApiParams: {
      headers,
    }
  });

  // Initialize the API client
  const client = new Api(httpClient);
  tonapiClient = client
  return client
}

export const getTon4Client = async (_configUrl: string) => {
  if (lc4) {
    return lc4
  }

  lc4 = new TonClient4({ endpoint: await getHttpV4Endpoint() })
  console.log(`[VENUS](getTon4Client) lc4 = `, lc4)
  return lc4
}

export async function tonSender(signer: WalletPair): Promise<Sender> {
  const tonClient = await tonGetClient()
  return tonClient.open(signer.wallet).sender(signer.key.secretKey)
}