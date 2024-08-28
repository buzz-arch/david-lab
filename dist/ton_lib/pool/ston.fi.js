"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tonPoolCreateJJ = exports.stonFiPoolCreateTonJet = void 0;
const ton_1 = require("@ton/ton");
const sdk_1 = require("@ston-fi/sdk");
const endpoint_1 = require("../endpoint");
const transaction_1 = require("../transaction");
const USER_WALLET_ADDRESS = ton_1.Address.parse("0QDyM-6kQ8LMAMQ4oNNnw7gB7b97CQ3KHdvHlJzBhiOv3KHz");
async function stonFiPoolCreateTonJet(signer, jetton, amountJ, amountT) {
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const router = tonClient.open(new sdk_1.DEX.v1.Router());
    const txsParams = await Promise.all([
        // deposit TON to the Jetton/TON pool and get at least 1 nano LP token
        router.getProvideLiquidityTonTxParams({
            userWalletAddress: signer.wallet.address,
            proxyTon: new sdk_1.pTON.v1(),
            sendAmount: amountT,
            otherTokenAddress: jetton,
            minLpOut: "1",
            queryId: 12345,
        }),
        // deposit STON to the Jetton/TON pool and get at least 1 nano LP token
        router.getProvideLiquidityJettonTxParams({
            userWalletAddress: signer.wallet.address,
            sendTokenAddress: jetton,
            sendAmount: amountJ,
            otherTokenAddress: new sdk_1.pTON.v1().address,
            minLpOut: "1",
            queryId: 123456,
        }),
    ]);
    const walletContract = tonClient.open(signer.wallet);
    const seqNo = await walletContract.getSeqno();
    await walletContract.sendTransfer({
        seqno: seqNo,
        secretKey: signer.key.secretKey,
        messages: txsParams.map(tx => (0, ton_1.internal)(tx))
    });
    console.log(`[VENUS](ston.fi) ------- SENDING POOL CREATION`);
    await (0, transaction_1.tonTrWait)(signer.wallet, seqNo);
    console.log(`[VENUS](ston.fi) ------- POOL POOL CREATION FINISHED`);
}
exports.stonFiPoolCreateTonJet = stonFiPoolCreateTonJet;
async function tonPoolCreateJJ(signer, jettonA, jettonB, amountA, amountB) {
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const router = tonClient.open(new sdk_1.DEX.v1.Router());
    const txsParams = await Promise.all([
        // deposit STON to the STON/GEMSTON pool and get at least 1 nano LP token
        router.getProvideLiquidityJettonTxParams({
            userWalletAddress: signer.wallet.address,
            sendTokenAddress: jettonA,
            sendAmount: amountA,
            otherTokenAddress: jettonB,
            minLpOut: "1",
            queryId: 12345,
        }),
        // deposit 2 GEMSTON to the STON/GEMSTON pool and get at least 1 nano LP token
        router.getProvideLiquidityJettonTxParams({
            userWalletAddress: USER_WALLET_ADDRESS,
            sendTokenAddress: jettonB,
            sendAmount: amountB,
            otherTokenAddress: jettonA,
            minLpOut: "1",
            queryId: 123456,
        }),
    ]);
    const walletContract = tonClient.open(signer.wallet);
    const seqNo = await walletContract.getSeqno();
    // await walletContract.sendTransfer(router,
    //   {
    //     seqno: seqNo,
    //     secretKey: signer.secretKey,
    //     messages: [internal(txsParams)]
    //   })
    await (0, transaction_1.tonTrWait)(signer.wallet, seqNo);
}
exports.tonPoolCreateJJ = tonPoolCreateJJ;
