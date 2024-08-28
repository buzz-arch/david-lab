import { WalletPair } from "../types";
import { Address } from "@ton/core";
export declare function tonAccountIsActive(_account: string | Address | WalletPair): Promise<boolean>;
export declare function tonAccountWaitForActive(account: string | Address | WalletPair, timeout?: number): Promise<boolean>;
