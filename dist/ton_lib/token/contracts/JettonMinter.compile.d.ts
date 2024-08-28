import { Address, Cell, Contract, ContractProvider, Sender } from '@ton/core';
export type JettonMinterContent = {
    type: 0 | 1;
    uri: string;
};
export type JettonMinterConfig = {
    admin: Address;
    content: Cell;
    wallet_code: Cell;
};
export declare function jettonMinterConfigToCell(config: JettonMinterConfig): Cell;
export declare function jettonContentToCell(content: JettonMinterContent): Cell;
export declare class JettonMinter implements Contract {
    readonly address: Address;
    readonly init?: {
        code: Cell;
        data: Cell;
    } | undefined;
    constructor(address: Address, init?: {
        code: Cell;
        data: Cell;
    } | undefined);
    static createFromAddress(address: Address): JettonMinter;
    static createFromConfig(config: JettonMinterConfig, code: Cell, workchain?: number): JettonMinter;
    sendDeploy(provider: ContractProvider, via: Sender, value: bigint): Promise<void>;
    protected static jettonInternalTransfer(jetton_amount: bigint, forward_ton_amount: bigint, response_addr?: Address, query_id?: number | bigint): Cell;
    static mintMessage(from: Address, to: Address, jetton_amount: bigint, forward_ton_amount: bigint, total_ton_amount: bigint, query_id?: number | bigint): Cell;
    sendMint(provider: ContractProvider, via: Sender, to: Address, jetton_amount: bigint, forward_ton_amount: bigint, total_ton_amount: bigint): Promise<void>;
    static discoveryMessage(owner: Address, include_address: boolean): Cell;
    sendDiscovery(provider: ContractProvider, via: Sender, owner: Address, include_address: boolean, value?: bigint): Promise<void>;
    static changeAdminMessage(newOwner: Address): Cell;
    sendChangeAdmin(provider: ContractProvider, via: Sender, newOwner: Address): Promise<void>;
    static changeContentMessage(content: Cell): Cell;
    sendChangeContent(provider: ContractProvider, via: Sender, content: Cell): Promise<void>;
    getWalletAddress(provider: ContractProvider, owner: Address): Promise<Address>;
    getJettonData(provider: ContractProvider): Promise<{
        totalSupply: bigint;
        mintable: boolean;
        adminAddress: Address;
        content: Cell;
        walletCode: Cell;
    }>;
    getTotalSupply(provider: ContractProvider): Promise<bigint>;
    getAdminAddress(provider: ContractProvider): Promise<Address>;
    getContent(provider: ContractProvider): Promise<Cell>;
}
