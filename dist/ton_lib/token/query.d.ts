import { Address } from "@ton/core";
import { TokenHolder, TonAddress, TonTokenDetails, WalletPair } from "../types";
export declare function tonTokenInfo(tokenAddr: Address | string): Promise<TonTokenDetails | undefined>;
export declare function tonTokenDecimals(tokenAddr: TonAddress): Promise<number>;
export declare function tonTokenGetBalance(wallet: TonAddress, token: Address | string): Promise<bigint>;
export declare function tonTokenWalletAddress(who: Address | string | WalletPair, token: Address | string): Promise<string | undefined>;
export declare function tonTokenGetHolderList(token: string): Promise<TokenHolder[] | undefined>;
