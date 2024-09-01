"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tonTrConfirmTokenTransfer = exports.tonTrConfirmTonReceive = exports.tonTrGetHash = exports.tonTrWait = exports.tonSendTrAndWait = void 0;
const core_1 = require("@ton/core");
const basic_1 = require("../utils/basic");
const wallet_1 = require("./wallet");
const address_1 = require("./address");
const endpoint_1 = require("./endpoint");
const constants_1 = require("./constants");
const bignumber_1 = require("../utils/bignumber");
const time_1 = require("../utils/time");
const tonSendTrAndWait = async (wallet) => {
    const seqNo = await (0, wallet_1.tonWalletGetSeqNo)(wallet);
    let curSeqNo = seqNo;
    while (curSeqNo === seqNo) {
        await (0, basic_1.sleep)(1000);
        curSeqNo = await (0, wallet_1.tonWalletGetSeqNo)(wallet);
    }
};
exports.tonSendTrAndWait = tonSendTrAndWait;
const tonTrWait = async (wallet, seqNo = -1) => {
    let curSeqNo = seqNo;
    if (seqNo == -1) {
        seqNo = await (0, wallet_1.tonWalletGetSeqNo)(wallet);
    }
    while (true) {
        try {
            curSeqNo = await (0, wallet_1.tonWalletGetSeqNo)(wallet);
            if (curSeqNo != seqNo)
                return;
        }
        catch (error) { }
        await (0, basic_1.sleep)(1500);
    }
};
exports.tonTrWait = tonTrWait;
async function tonTrGetHash(address) {
    try {
        const client = await (0, endpoint_1.getTonWebClient)();
        const result = await client.provider.getTransactions(address, 1);
        if (result.length > 0) {
            // console.log(`[DAVID](ton-lib)(getTransactionHash) tr =`, result[0])
            // const message = Buffer.from(result[0].in_msg.message, 'base64')
            const data = core_1.Cell.fromBase64(result[0].in_msg.msg_data.body).asSlice();
            const message = {
                opcode: data.loadUint(32),
                queryId: data.loadIntBig(64),
                amount: data.loadCoins(),
                from: data.loadAddress(),
                response_address: data.loadAddress(),
                forward_ton_amount: data.loadCoins()
            };
            console.log(message);
            return result[0].transaction_id?.hash;
        }
        else {
            console.log('[DAVID](ton-lib)(getTransactionHash) No transaction found for the given seqno');
            return "";
        }
    }
    catch (error) {
        console.error('[DAVID](ton-lib)(getTransactionHash) Error fetching transaction:', error);
        return "";
    }
}
exports.tonTrGetHash = tonTrGetHash;
async function tonTrConfirmTonReceive(who, from = undefined, callback = undefined, timeout = constants_1.DEFAULT_DELAY_FOR_TR_CONFIRM) {
    const triggerStart = (0, time_1.getCurrentTimestamp)();
    const apiClient = await (0, endpoint_1.tonApiClient)();
    console.log(`[DAVID](TON-LIB)(tonTrConfirmTonReceive) trigger timestamp: `, Math.floor(triggerStart / 1000));
    while (true) {
        const curTimeStamp = (0, time_1.getCurrentTimestamp)();
        if (curTimeStamp - triggerStart > timeout) {
            console.log(`[DAVID](TON-LIB)(tonTrConfirmTonReceive) ******** timeout **********`);
            return;
        }
        try {
            let events = (await apiClient.accounts.getAccountEvents((0, address_1.tonAddrStr)(who), {
                limit: 1,
                start_date: Math.floor(triggerStart / 1000)
            })).events;
            if (events.length > 0) {
                const ev = events[0];
                const action = ev.actions.find(a => a.type === 'TonTransfer');
                if (action &&
                    (!from || core_1.Address.normalize(action.TonTransfer?.sender?.address) === (0, address_1.tonAddrStr)(from))) {
                    if (callback)
                        callback(who, from, (0, core_1.fromNano)(action.TonTransfer?.amount), ev.event_id);
                    return;
                }
            }
        }
        catch (error) { }
        await (0, basic_1.sleep)(1000);
    }
}
exports.tonTrConfirmTonReceive = tonTrConfirmTonReceive;
async function tonTrConfirmTokenTransfer(who, token, from = undefined, callback = undefined, timeout = constants_1.DEFAULT_DELAY_FOR_TR_CONFIRM) {
    const triggerStart = (0, time_1.getCurrentTimestamp)();
    const apiClient = await (0, endpoint_1.tonApiClient)();
    console.log(`[DAVID](TON-LIB)(tonTrConfirmTokenTransfer) trigger timestamp: `, Math.floor(triggerStart / 1000));
    while (true) {
        const curTimeStamp = (0, time_1.getCurrentTimestamp)();
        if (curTimeStamp - triggerStart > timeout) {
            console.log(`[DAVID](TON-LIB)(tonTrConfirmTokenTransfer) ******** timeout **********`);
            return;
        }
        try {
            let events = (await apiClient.accounts.getAccountEvents((0, address_1.tonAddrStr)(who), {
                limit: 1,
                start_date: Math.floor(triggerStart / 1000)
            })).events;
            // console.log(`[DAVID](TON-LIB)(tonTrConfirmTokenTransfer) ******** event detected :: `, events)
            if (events.length > 0) {
                const ev = events[0];
                const action = ev.actions.find(a => a.type === 'JettonTransfer');
                // console.log(`[DAVID](TON-LIB)(tonTrConfirmTokenTransfer) ******** Jetton Transfer action :: `, action)
                if (action &&
                    ((0, address_1.tonAddrStr)(token) === core_1.Address.normalize(action.JettonTransfer?.jetton.address)) &&
                    (!from || core_1.Address.normalize(action.JettonTransfer?.sender?.address) === (0, address_1.tonAddrStr)(from))) {
                    if (callback)
                        callback(who, token, from, (0, bignumber_1.fromDecimalsBN)(action.JettonTransfer?.amount, action.JettonTransfer?.jetton.decimals), ev.event_id);
                    return;
                }
            }
        }
        catch (error) { }
        await (0, basic_1.sleep)(1000);
    }
}
exports.tonTrConfirmTokenTransfer = tonTrConfirmTokenTransfer;
