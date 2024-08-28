"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tonWalletLatestTxHash = exports.tonWalletGetSeqNo = exports.tonUiWalletSendCoin = exports.tonWalletSendCoin = exports.tonWalletGetBalance = exports.tonWalletCreate = exports.tonWalletImport = void 0;
const crypto_1 = require("@ton/crypto");
const endpoint_1 = require("./endpoint");
const ton_1 = require("@ton/ton");
const basic_1 = require("../utils/basic");
const core_1 = require("@ton/core");
const common_1 = require("./common");
const transaction_1 = require("./transaction");
const index_1 = require("./address/index");
const transfer_1 = require("./token/transfer");
const tonWalletImport = async (mnemonic) => {
    if (typeof mnemonic === "string")
        mnemonic = mnemonic.split(' ');
    const key = await (0, crypto_1.mnemonicToWalletKey)(mnemonic);
    const wallet = ton_1.WalletContractV4.create({ workchain: common_1.WORKCHAIN, publicKey: key.publicKey });
    return { key, wallet };
};
exports.tonWalletImport = tonWalletImport;
const tonWalletCreate = async () => {
    const mnemonics = await (0, crypto_1.mnemonicNew)();
    return await (0, exports.tonWalletImport)(mnemonics);
};
exports.tonWalletCreate = tonWalletCreate;
async function tonWalletGetBalance(address) {
    let addr;
    if (!(address instanceof core_1.Address)) {
        addr = core_1.Address.parse(address);
    }
    else {
        addr = address;
    }
    const client = await (0, endpoint_1.tonGetClient)();
    const balance = await client.getBalance(addr);
    return (0, core_1.fromNano)(balance);
}
exports.tonWalletGetBalance = tonWalletGetBalance;
const tonWalletSendCoin = async (who, to, amount, body = undefined) => {
    const client = await (0, endpoint_1.tonGetClient)();
    const walletContract = client.open(who.wallet);
    const seqno = await walletContract.getSeqno();
    const oldBalance = await walletContract.getBalance();
    await walletContract.sendTransfer({
        secretKey: who.key.secretKey,
        seqno: seqno,
        messages: [
            (0, core_1.internal)({
                to,
                value: (0, core_1.toNano)(amount),
                body: body || core_1.Cell.EMPTY,
                bounce: true
            })
        ]
    });
    await (0, transaction_1.tonTrWait)(who.wallet, seqno);
    console.log(`[DAVID](tonWalletSendCoin) transaction confirmed`);
    while (true) {
        const balance = await walletContract.getBalance();
        if (oldBalance !== balance)
            break;
        await (0, basic_1.sleep)(1000);
    }
};
exports.tonWalletSendCoin = tonWalletSendCoin;
const tonUiWalletSendCoin = async (who, to, amount, body = undefined) => {
    const client = await (0, endpoint_1.tonGetClient)();
    if (!who.account?.address)
        return;
    const senderAddr = (0, index_1.tonAddrStr)(who.account?.address);
    const walletContract = client.open(ton_1.WalletContractV4.create({ workchain: 0, publicKey: Buffer.from(senderAddr) }));
    const seqno = await walletContract.getSeqno();
    const oldBalance = await walletContract.getBalance();
    const sender = (0, transfer_1.tonUiSender)(who);
    await sender.send({
        value: (0, core_1.toNano)(amount),
        to: (0, index_1.tonAddr)(to),
        body: body ? body : core_1.Cell.EMPTY
    });
    await (0, transaction_1.tonTrWait)(who.wallet, seqno);
    console.log(`[DAVID](tonWalletSendCoin) transaction confirmed`);
    while (true) {
        const balance = await walletContract.getBalance();
        if (oldBalance !== balance)
            break;
        await (0, basic_1.sleep)(1000);
    }
};
exports.tonUiWalletSendCoin = tonUiWalletSendCoin;
const tonWalletGetSeqNo = async (wallet) => {
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const w = tonClient.open(wallet);
    const seqno = await w.getSeqno();
    return seqno;
};
exports.tonWalletGetSeqNo = tonWalletGetSeqNo;
async function tonWalletLatestTxHash(signer) {
    let address;
    if (signer instanceof ton_1.WalletContractV4) {
        address = signer.address.toString();
    }
    else if (typeof signer === "string") {
        address = signer;
    }
    else {
        address = signer.wallet.address.toString();
    }
    const txHash = await (0, transaction_1.tonTrGetHash)(address);
    return txHash;
}
exports.tonWalletLatestTxHash = tonWalletLatestTxHash;
