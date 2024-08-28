"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JettonMinter = exports.jettonContentToCell = exports.jettonMinterConfigToCell = void 0;
const core_1 = require("@ton/core");
const JettonConstants_1 = require("./JettonConstants");
function jettonMinterConfigToCell(config) {
    return (0, core_1.beginCell)()
        .storeCoins(0)
        .storeAddress(config.admin)
        .storeRef(config.content)
        .storeRef(config.wallet_code)
        .endCell();
}
exports.jettonMinterConfigToCell = jettonMinterConfigToCell;
function jettonContentToCell(content) {
    return (0, core_1.beginCell)()
        .storeUint(content.type, 8)
        .storeStringTail(content.uri) //Snake logic under the hood
        .endCell();
}
exports.jettonContentToCell = jettonContentToCell;
class JettonMinter {
    constructor(address, init) {
        this.address = address;
        this.init = init;
    }
    static createFromAddress(address) {
        return new JettonMinter(address);
    }
    static createFromConfig(config, code, workchain = 0) {
        const data = jettonMinterConfigToCell(config);
        const init = { code, data };
        return new JettonMinter((0, core_1.contractAddress)(workchain, init), init);
    }
    async sendDeploy(provider, via, value) {
        await provider.internal(via, {
            value,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)().endCell(),
        });
    }
    static jettonInternalTransfer(jetton_amount, forward_ton_amount, response_addr, query_id = 0) {
        return (0, core_1.beginCell)()
            .storeUint(JettonConstants_1.Op.internal_transfer, 32)
            .storeUint(query_id, 64)
            .storeCoins(jetton_amount)
            .storeAddress(null)
            .storeAddress(response_addr)
            .storeCoins(forward_ton_amount)
            .storeBit(false)
            .endCell();
    }
    static mintMessage(from, to, jetton_amount, forward_ton_amount, total_ton_amount, query_id = 0) {
        const mintMsg = (0, core_1.beginCell)().storeUint(JettonConstants_1.Op.internal_transfer, 32)
            .storeUint(0, 64)
            .storeCoins(jetton_amount)
            .storeAddress(null)
            .storeAddress(from) // Response addr
            .storeCoins(forward_ton_amount)
            .storeMaybeRef(null)
            .endCell();
        return (0, core_1.beginCell)().storeUint(JettonConstants_1.Op.mint, 32).storeUint(query_id, 64) // op, queryId
            .storeAddress(to)
            .storeCoins(total_ton_amount)
            .storeCoins(jetton_amount)
            .storeRef(mintMsg)
            .endCell();
    }
    async sendMint(provider, via, to, jetton_amount, forward_ton_amount, total_ton_amount) {
        if (total_ton_amount <= forward_ton_amount) {
            throw new Error("Total ton amount should be > forward amount");
        }
        await provider.internal(via, {
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinter.mintMessage(this.address, to, jetton_amount, forward_ton_amount, total_ton_amount),
            value: total_ton_amount + (0, core_1.toNano)('0.015'),
        });
    }
    /* provide_wallet_address#2c76b973 query_id:uint64 owner_address:MsgAddress include_address:Bool = InternalMsgBody;
    */
    static discoveryMessage(owner, include_address) {
        return (0, core_1.beginCell)().storeUint(0x2c76b973, 32).storeUint(0, 64) // op, queryId
            .storeAddress(owner).storeBit(include_address)
            .endCell();
    }
    async sendDiscovery(provider, via, owner, include_address, value = (0, core_1.toNano)('0.1')) {
        await provider.internal(via, {
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinter.discoveryMessage(owner, include_address),
            value: value,
        });
    }
    static changeAdminMessage(newOwner) {
        return (0, core_1.beginCell)().storeUint(JettonConstants_1.Op.change_admin, 32).storeUint(0, 64) // op, queryId
            .storeAddress(newOwner)
            .endCell();
    }
    async sendChangeAdmin(provider, via, newOwner) {
        await provider.internal(via, {
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinter.changeAdminMessage(newOwner),
            value: (0, core_1.toNano)("0.05"),
        });
    }
    static changeContentMessage(content) {
        return (0, core_1.beginCell)().storeUint(JettonConstants_1.Op.change_content, 32).storeUint(0, 64) // op, queryId
            .storeRef(content)
            .endCell();
    }
    async sendChangeContent(provider, via, content) {
        await provider.internal(via, {
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: JettonMinter.changeContentMessage(content),
            value: (0, core_1.toNano)("0.05"),
        });
    }
    async getWalletAddress(provider, owner) {
        const res = await provider.get('get_wallet_address', [{ type: 'slice', cell: (0, core_1.beginCell)().storeAddress(owner).endCell() }]);
        return res.stack.readAddress();
    }
    async getJettonData(provider) {
        let res = await provider.get('get_jetton_data', []);
        let totalSupply = res.stack.readBigNumber();
        let mintable = res.stack.readBoolean();
        let adminAddress = res.stack.readAddress();
        let content = res.stack.readCell();
        let walletCode = res.stack.readCell();
        return {
            totalSupply,
            mintable,
            adminAddress,
            content,
            walletCode
        };
    }
    async getTotalSupply(provider) {
        let res = await this.getJettonData(provider);
        return res.totalSupply;
    }
    async getAdminAddress(provider) {
        let res = await this.getJettonData(provider);
        return res.adminAddress;
    }
    async getContent(provider) {
        let res = await this.getJettonData(provider);
        return res.content;
    }
}
exports.JettonMinter = JettonMinter;
