import { Address } from "@ton/core";
import { TonAddress, WalletPair } from "../types";
export declare function tonAddr(addr: Address | WalletPair | string): Address;
export declare function tonAddrStr(addr: TonAddress): string;
export declare function tonAddrWaitForActive(addr: TonAddress, timeout?: number): Promise<boolean>;
