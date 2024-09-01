"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uiDeployContract = exports.deployContract = void 0;
const endpoint_1 = require("../endpoint");
const core_1 = require("@ton/core");
const wallet_1 = require("../wallet");
const basic_1 = require("../../utils/basic");
const transaction_1 = require("../transaction");
const common_1 = require("../common");
const JettonMinter_compile_1 = require("./contracts/JettonMinter.compile");
const query_1 = require("./query");
const accounts_1 = require("../accounts");
function addressForContract(params) {
    return (0, core_1.contractAddress)(0, {
        code: params.code,
        data: params.data
    });
}
async function deployContract(params, signer) {
    const stateInit = {
        code: params.code,
        data: params.data
    };
    const _contractAddress = addressForContract(params);
    const apiClient = await (0, endpoint_1.tonApiClient)();
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const jettonMinter = tonClient.open(new JettonMinter_compile_1.JettonMinter(_contractAddress, stateInit));
    const sender = tonClient.open(signer.wallet).sender(signer.key.secretKey);
    let seqNo;
    console.log(`[DAVID] Deploying Minter ...`);
    seqNo = await (0, wallet_1.tonWalletGetSeqNo)(signer);
    await jettonMinter.sendDeploy(sender, params.value);
    await (0, transaction_1.tonTrWait)(signer, seqNo);
    const minterAddr = _contractAddress.toString();
    console.log(`[DAVID] Deployed token: ${minterAddr}`);
    console.log(`[DAVID] Waiting for active state of minter`);
    await (0, accounts_1.tonAccountWaitForActive)(minterAddr);
    console.log(`[DAVID] Minting...`);
    seqNo = await (0, wallet_1.tonWalletGetSeqNo)(signer);
    console.log(`[DAVID](ton-lib) sending mint transaction...`);
    await jettonMinter.sendMint(sender, params.mintTo, params.mintAmount, (0, core_1.toNano)(common_1.JETTON_RENT), (0, core_1.toNano)(common_1.JETTON_RENT + 0.01));
    console.log(`[DAVID](ton-lib) mint transaction posted waiting wallet confirmation...`);
    await (0, transaction_1.tonTrWait)(signer, seqNo);
    console.log(`[DAVID](ton-lib)(MINT) waiting for balance change`);
    while (true) {
        const jBalance = await (0, query_1.tonTokenGetBalance)(params.mintTo, _contractAddress);
        console.log(`[DAVID](ton-lib)(MINT) cur balance =`, jBalance);
        if (jBalance === params.mintAmount)
            break;
        await (0, basic_1.sleep)(1500);
    }
    console.log(`[DAVID] Complete!`);
    return _contractAddress;
}
exports.deployContract = deployContract;
async function uiDeployContract(params, connection) {
    const stateInit = {
        code: params.code,
        data: params.data
    };
    const builder = (0, core_1.beginCell)();
    (0, core_1.storeStateInit)(stateInit)(builder);
    const initCell = builder.endCell().toBoc().toString("base64");
    const _contractAddress = addressForContract(params);
    const tx = {
        validUntil: Date.now() + 5 * 60 * 100,
        messages: [
            {
                address: _contractAddress.toString(),
                amount: (0, core_1.toNano)(common_1.DEPLOY_GAS + common_1.JETTON_RENT).toString(),
                stateInit: initCell,
                payload: params.message?.toBoc().toString('base64')
            },
        ],
    };
    await connection.sendTransaction(tx);
    return _contractAddress;
}
exports.uiDeployContract = uiDeployContract;
