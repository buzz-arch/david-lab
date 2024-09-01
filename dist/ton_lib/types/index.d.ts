import { KeyPair } from "@ton/crypto";
import { Address, Cell, WalletContractV4 } from "@ton/ton";
export type TonAddress = string | Address | WalletPair;
export type TokenTransfer = {
    opcode: number;
    queryId: bigint;
    amount: bigint;
    from: Address;
    response_address: Address;
    forward_ton_amount: bigint;
};
export interface TonTokenDetails {
    name: string;
    description: string | undefined;
    image: string | undefined;
    decimals: string;
    symbol: string;
    image_data: string | undefined;
    uri: string | undefined;
    totalSupply: string;
    isMintable: boolean | undefined;
    adminAddress: string | undefined;
}
export interface WalletPair {
    key: KeyPair;
    wallet: WalletContractV4;
}
export declare function isWalletPair(param: any): param is WalletPair;
export interface JettongDeployParam {
    deployer: Address;
    code: Cell;
    data: Cell;
    message: Cell;
    value: bigint;
    mintAmount: bigint;
    mintTo: Address;
}
export interface OnChainMetadata {
    name: string;
    symbol: string;
    description: string | undefined;
    image: string | undefined;
    decimals: string | undefined;
}
export interface TokenHolder {
    who: string;
    balance: string;
    percent: number;
}
export interface PoolReserve {
    base: number;
    quote: number;
}
