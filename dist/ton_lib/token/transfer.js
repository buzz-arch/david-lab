"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tonUiTokenTransfer = exports.tonUiSender = exports.tonTokenTransfer = void 0;
const sdk_1 = require("@dedust/sdk");
const endpoint_1 = require("../endpoint");
const core_1 = require("@ton/core");
const query_1 = require("./query");
const bignumber_1 = require("../../utils/bignumber");
const transaction_1 = require("../transaction");
async function tonTokenTransfer(signer, token, to, amount, forwardPayload = undefined, forwardAmount = undefined) {
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const wallet = tonClient.open(signer.wallet);
    const sender = wallet.sender(signer.key.secretKey);
    const jetton = tonClient.open(sdk_1.JettonRoot.createFromAddress(core_1.Address.parse(token)));
    const jettonWallet = tonClient.open(await jetton.getWallet(wallet.address));
    const jettonDetails = await (0, query_1.tonTokenInfo)(token);
    const seqNo = await wallet.getSeqno();
    const trAmount = (0, bignumber_1.toDecimalsBN)(amount, jettonDetails?.decimals || 6);
    // const oldBalance = await tonTokenGetBalance(to, token)
    await jettonWallet.sendTransfer(sender, (0, core_1.toNano)(0.25 + (forwardAmount || 0)), {
        destination: core_1.Address.parse(to),
        amount: trAmount,
        responseAddress: wallet.address,
        forwardAmount: (0, core_1.toNano)(forwardAmount || 0),
        forwardPayload: forwardPayload || core_1.Cell.EMPTY,
    });
    await (0, transaction_1.tonTrWait)(wallet, seqNo);
    console.log(`[DAVID](TON-TOKEN) tonTokenTransfer :: ${amount} jetton(${token}) transfered from ${wallet.address.toString()} - ${to}`);
}
exports.tonTokenTransfer = tonTokenTransfer;
function tonUiSender(connect) {
    return {
        send: async (args) => {
            connect.sendTransaction({
                messages: [
                    {
                        address: args.to.toString(),
                        amount: args.value.toString(),
                        payload: args.body?.toBoc().toString('base64'),
                    },
                ],
                validUntil: Date.now() + 5 * 60 * 1000, // 5 minutes for user to approve
            });
        },
        address: core_1.Address.parse(connect.account?.address)
    };
}
exports.tonUiSender = tonUiSender;
async function tonUiTokenTransfer(connect, token, to, amount, forwardPayload = undefined, forwardAmount = undefined) {
    if (!connect.account?.address)
        return;
    const senderAddr = core_1.Address.parse(connect.account?.address);
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const sender = tonUiSender(connect);
    const jetton = tonClient.open(sdk_1.JettonRoot.createFromAddress(core_1.Address.parse(token)));
    const jettonWallet = tonClient.open(await jetton.getWallet(senderAddr));
    const jettonDetails = await (0, query_1.tonTokenInfo)(token);
    const trAmount = (0, bignumber_1.toDecimalsBN)(amount, jettonDetails?.decimals || 6);
    await jettonWallet.sendTransfer(sender, (0, core_1.toNano)(0.25 + (forwardAmount || 0)), {
        destination: core_1.Address.parse(to),
        amount: trAmount,
        responseAddress: senderAddr,
        forwardAmount: (0, core_1.toNano)(forwardAmount || 0),
        forwardPayload: forwardPayload || core_1.Cell.EMPTY,
    });
    console.log(`[DAVID](TON-TOKEN) tonTokenTransfer :: ${amount} jetton(${token}) transfered from ${senderAddr} - ${to}`);
}
exports.tonUiTokenTransfer = tonUiTokenTransfer;
