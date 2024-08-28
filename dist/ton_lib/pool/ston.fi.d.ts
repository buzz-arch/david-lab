import { AddressType } from '@ston-fi/sdk';
import { WalletPair } from '../types';
export declare function stonFiPoolCreateTonJet(signer: WalletPair, jetton: string, amountJ: number, amountT: number): Promise<void>;
export declare function tonPoolCreateJJ(signer: WalletPair, jettonA: AddressType, jettonB: AddressType, amountA: number, amountB: number): Promise<void>;
