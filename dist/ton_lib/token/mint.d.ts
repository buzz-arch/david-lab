import { Address } from '@ton/core';
import { WalletPair } from '../types';
export declare function tonTokenMint(signer: WalletPair, token: Address | string, amount: number, to?: Address | string | undefined): Promise<any>;
