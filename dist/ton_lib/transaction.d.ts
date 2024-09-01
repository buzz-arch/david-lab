import { Address } from '@ton/core';
import { TonAddress, WalletPair } from "./types";
export declare const tonSendTrAndWait: (wallet: TonAddress) => Promise<void>;
export declare const tonTrWait: (wallet: TonAddress, seqNo?: number) => Promise<void>;
export declare function tonTrGetHash(address: string): Promise<string>;
export declare function tonTrConfirmTonReceive(who: string | WalletPair | Address, from?: string | Address | undefined, callback?: any, timeout?: number): Promise<void>;
export declare function tonTrConfirmTokenTransfer(who: string | WalletPair | Address, token: string | WalletPair | Address, from?: string | Address | undefined, callback?: any, timeout?: number): Promise<void>;
