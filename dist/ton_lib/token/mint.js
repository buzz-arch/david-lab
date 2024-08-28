"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tonTokenMint = void 0;
const core_1 = require("@ton/core");
const index_1 = require("../address/index");
const endpoint_1 = require("../endpoint");
const JettonMinter_compile_1 = require("./contracts/JettonMinter.compile");
const query_1 = require("./query");
const bignumber_1 = require("../../utils/bignumber");
const wallet_1 = require("../wallet");
const transaction_1 = require("../transaction");
async function tonTokenMint(signer, token, amount, to = undefined) {
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const sender = await (0, endpoint_1.tonSender)(signer);
    const jettonMinter = tonClient.open(JettonMinter_compile_1.JettonMinter.createFromAddress((0, index_1.tonAddr)(token)));
    const mintTo = (0, index_1.tonAddr)(to ? to : signer);
    const jettonInfo = await (0, query_1.tonTokenInfo)(token);
    if (!jettonInfo)
        return;
    const decimals = jettonInfo.decimals;
    const seqNo = await (0, wallet_1.tonWalletGetSeqNo)(signer.wallet);
    await jettonMinter.sendMint(sender, mintTo, (0, bignumber_1.toDecimalsBN)(amount, decimals), (0, core_1.toNano)(0), (0, core_1.toNano)(0.01));
    await (0, transaction_1.tonTrWait)(signer.wallet, seqNo);
}
exports.tonTokenMint = tonTokenMint;
