"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dedustLpQuery = exports.dedustLPBurn = exports.dedustLPWithdraw = exports.dedustSell = exports.dedustBuy = exports.dedustPoolCreate = exports.dedustPoolFind = exports.dedustGetPool = void 0;
const sdk_1 = require("@dedust/sdk");
const core_1 = require("@ton/core");
const endpoint_1 = require("../endpoint");
const basic_1 = require("../../utils/basic");
const transaction_1 = require("../transaction");
const bignumber_1 = require("../../utils/bignumber");
const address_1 = require("../address");
const wallet_1 = require("../wallet");
const constants_1 = require("../constants");
const query_1 = require("../token/query");
async function dedustGetPool(jetton) {
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const TON = sdk_1.Asset.native();
    const SCALE = sdk_1.Asset.jetton((0, address_1.tonAddr)(jetton));
    const factory = tonClient.open(sdk_1.Factory.createFromAddress(sdk_1.MAINNET_FACTORY_ADDR));
    const pool = tonClient.open(await factory.getPool(sdk_1.PoolType.VOLATILE, [TON, SCALE]));
    // Check if pool exists:
    const poolReadiness = await pool.getReadinessStatus();
    if (poolReadiness !== sdk_1.ReadinessStatus.READY) {
        return undefined;
    }
    return pool;
}
exports.dedustGetPool = dedustGetPool;
async function dedustPoolFind(jetton) {
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const TON = sdk_1.Asset.native();
    const SCALE = sdk_1.Asset.jetton(jetton);
    const factory = tonClient.open(sdk_1.Factory.createFromAddress(sdk_1.MAINNET_FACTORY_ADDR));
    const pool = tonClient.open(await factory.getPool(sdk_1.PoolType.VOLATILE, [TON, SCALE]));
    // Check if pool exists:
    const poolReadiness = await pool.getReadinessStatus();
    if (poolReadiness !== sdk_1.ReadinessStatus.READY) {
        return [false, 'Pool (TON, SCALE) does not exist.'];
    }
    // Check if ton vault exits:
    const tonVault = tonClient.open(await factory.getNativeVault());
    if ((await tonVault.getReadinessStatus()) !== sdk_1.ReadinessStatus.READY) {
        return [false, 'Vault (TON) does not exist.'];
    }
    // Check if scale vault exits:
    const scaleVault = tonClient.open(await factory.getJettonVault(SCALE.address));
    if ((await scaleVault.getReadinessStatus()) !== sdk_1.ReadinessStatus.READY) {
        return [false, 'Vault (SCALE) does not exist.'];
    }
    return [true, 'Ok'];
}
exports.dedustPoolFind = dedustPoolFind;
async function dedustPoolCreate(signer, tokenAddr, tokenDecimals, _amountJ, _amountT) {
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const walletContract = tonClient.open(signer.wallet);
    const factory = tonClient.open(sdk_1.Factory.createFromAddress(sdk_1.MAINNET_FACTORY_ADDR));
    const sender = tonClient.open(signer.wallet).sender(signer.key.secretKey);
    const jettonAddr = core_1.Address.parse(tokenAddr);
    const assets = [
        sdk_1.Asset.native(), // ton
        sdk_1.Asset.jetton(jettonAddr) // jetton
    ];
    let seqNo = undefined;
    // Create a vault
    console.log(`[VENUS](DEDUST) Creating vault...`);
    seqNo = walletContract.getSeqno();
    await factory.sendCreateVault(sender, {
        asset: sdk_1.Asset.jetton(jettonAddr),
    });
    await (0, transaction_1.tonTrWait)(signer.wallet);
    const scaleVault = tonClient.open(await factory.getJettonVault(jettonAddr));
    let state = sdk_1.ReadinessStatus.NOT_DEPLOYED;
    while (state !== sdk_1.ReadinessStatus.READY) {
        await (0, basic_1.sleep)(1500);
        try {
            state = await scaleVault.getReadinessStatus();
            console.log(`[VENUS] VAULT(${scaleVault.address.toString()}) STATE = ${state}`);
        }
        catch (error) {
            continue;
        }
    }
    // Create a pool
    console.log(`[VENUS](DEDUST) Creating Pool(volatile)...`);
    const pool = tonClient.open(await factory.getPool(sdk_1.PoolType.VOLATILE, assets));
    const poolReadiness = await pool.getReadinessStatus();
    if (poolReadiness === sdk_1.ReadinessStatus.NOT_DEPLOYED) {
        seqNo = await walletContract.getSeqno();
        await factory.sendCreateVolatilePool(sender, { assets });
        // wait for pool creation complete
        await (0, transaction_1.tonTrWait)(signer.wallet, seqNo);
        console.log(`[VENUS](DEDUST) Pool(volatile) created. pool = ${pool.address.toString()}`);
    }
    else {
        console.log(`[VENUS](DEDUST) Pool(volatile) already exists. pool = ${pool.address.toString()}`);
    }
    const amountT = (0, core_1.toNano)(_amountT);
    const amountJ = (0, bignumber_1.toDecimalsBN)(_amountJ, tokenDecimals);
    // deposit TON
    const tonVault = tonClient.open(await factory.getNativeVault());
    console.log(`[VENUS](DEDUST) Depositing TON to tonVault(${tonVault.address.toString()})...`);
    seqNo = await walletContract.getSeqno();
    await tonVault.sendDepositLiquidity(sender, {
        poolType: sdk_1.PoolType.VOLATILE,
        assets,
        targetBalances: [amountT, amountJ],
        amount: amountT
    });
    await (0, transaction_1.tonTrWait)(signer.wallet, seqNo);
    console.log(`[VENUS](DEDUST) TON deposit finished`);
    // Deposit Jetton(SCALE)
    const scaleRoot = tonClient.open(sdk_1.JettonRoot.createFromAddress(jettonAddr));
    const scaleWallet = tonClient.open(await scaleRoot.getWallet(signer.wallet.address));
    console.log(`[VENUS](DEDUST) Jetton Depositing from(scaleWallet.${scaleWallet.address.toString()}) to ${scaleVault.address.toString()} ...`);
    seqNo = await walletContract.getSeqno();
    await scaleWallet.sendTransfer(sender, (0, core_1.toNano)('0.5'), {
        destination: scaleVault.address,
        amount: amountJ,
        responseAddress: signer.wallet.address,
        forwardAmount: (0, core_1.toNano)("0.4"),
        forwardPayload: sdk_1.VaultJetton.createDepositLiquidityPayload({
            poolType: sdk_1.PoolType.VOLATILE,
            assets,
            targetBalances: [amountT, amountJ]
        })
    });
    await (0, transaction_1.tonTrWait)(signer.wallet, seqNo);
    state = sdk_1.ReadinessStatus.NOT_DEPLOYED;
    while (state !== sdk_1.ReadinessStatus.READY) {
        await (0, basic_1.sleep)(1000);
        state = await pool.getReadinessStatus();
        console.log(`[VENUS] POOL STATE = ${state}`);
    }
    console.log(`[VENUS](DEDUST) Pool creation completed.`);
    return pool.address.toString();
}
exports.dedustPoolCreate = dedustPoolCreate;
const dedustBuy = async (signer, jetton, tonAmount) => {
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const walletContract = tonClient.open(signer.wallet);
    const sender = tonClient.open(signer.wallet).sender(signer.key.secretKey);
    const TON = sdk_1.Asset.native();
    const SCALE = sdk_1.Asset.jetton(core_1.Address.parse(jetton));
    const factory = tonClient.open(sdk_1.Factory.createFromAddress(sdk_1.MAINNET_FACTORY_ADDR));
    let seqNo = 0;
    const swapFee = 0.1;
    console.log(`[DAVID](ds-ton-lib)(dedust-buy) finding pool ...`);
    const [found, message] = await dedustPoolFind(SCALE.address);
    if (!found)
        return [false, 'Pool does not exist.'];
    const pool = tonClient.open(await factory.getPool(sdk_1.PoolType.VOLATILE, [TON, SCALE]));
    console.log(`[DAVID](ds-ton-lib)(dedust-buy) pool: ${pool.address.toString()}`);
    const tonVault = tonClient.open(await factory.getNativeVault());
    seqNo = await walletContract.getSeqno();
    console.log(`[DAVID](ds-ton-lib)(dedust-buy) buying ...`);
    await tonVault.sendSwap(sender, {
        poolAddress: pool.address,
        amount: (0, core_1.toNano)(tonAmount),
        gasAmount: (0, core_1.toNano)(swapFee)
    });
    await (0, transaction_1.tonTrWait)(signer.wallet, seqNo);
    console.log(`[VENUS](DEDUST) Success to buy`);
};
exports.dedustBuy = dedustBuy;
const dedustSell = async (signer, jetton, jettonAmount) => {
    const jettonInfo = await (0, query_1.tonTokenInfo)(jetton);
    if (!jettonInfo)
        return;
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const walletContract = tonClient.open(signer.wallet);
    const sender = tonClient.open(signer.wallet).sender(signer.key.secretKey);
    const TON = sdk_1.Asset.native();
    const SCALE = sdk_1.Asset.jetton(core_1.Address.parse(jetton));
    const factory = tonClient.open(sdk_1.Factory.createFromAddress(sdk_1.MAINNET_FACTORY_ADDR));
    let seqNo = 0;
    const swapFee = 0.25;
    const [found, message] = await dedustPoolFind(SCALE.address);
    if (!found)
        return [false, 'Pool does not exist.'];
    const pool = tonClient.open(await factory.getPool(sdk_1.PoolType.VOLATILE, [TON, SCALE]));
    const scaleRoot = tonClient.open(sdk_1.JettonRoot.createFromAddress(SCALE.address));
    const scaleWallet = tonClient.open(await scaleRoot.getWallet(signer.wallet.address));
    const scaleVault = tonClient.open(await factory.getJettonVault(scaleRoot.address));
    const tokenDecimals = parseInt(jettonInfo.decimals);
    seqNo = await walletContract.getSeqno();
    await scaleWallet.sendTransfer(sender, (0, core_1.toNano)("0.3"), {
        amount: (0, bignumber_1.toDecimalsBN)(jettonAmount, tokenDecimals),
        destination: scaleVault.address,
        responseAddress: signer.wallet.address, // return gas to user
        forwardAmount: (0, core_1.toNano)(swapFee),
        forwardPayload: sdk_1.VaultJetton.createSwapPayload({ poolAddress: pool.address }),
    });
    await (0, transaction_1.tonTrWait)(signer.wallet, seqNo);
    console.log(`[VENUS](DEDUST) Success to sell`);
};
exports.dedustSell = dedustSell;
async function dedustLPWithdraw(signer, jetton, amount = undefined) {
    const pool = await dedustGetPool(jetton);
    if (!pool)
        return;
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const sender = tonClient.open(signer.wallet).sender(signer.key.secretKey);
    const lpWallet = tonClient.open(await pool.getWallet(signer.wallet.address));
    try {
        const withdrawAmount = amount ? (0, core_1.toNano)(amount) : await lpWallet.getBalance();
        const seqNo = await (0, wallet_1.tonWalletGetSeqNo)(signer.wallet);
        await lpWallet.sendBurn(sender, (0, core_1.toNano)(0.2), {
            amount: withdrawAmount
        });
        await (0, transaction_1.tonTrWait)(signer.wallet, seqNo);
    }
    catch (error) {
        console.log(`[DAVID](DEDUST)(witdraw lp) error :`, error);
    }
}
exports.dedustLPWithdraw = dedustLPWithdraw;
async function dedustLPBurn(signer, jetton, amount = undefined) {
    const pool = await dedustGetPool(jetton);
    if (!pool)
        return;
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const sender = tonClient.open(signer.wallet).sender(signer.key.secretKey);
    const lpWallet = tonClient.open(await pool.getWallet(signer.wallet.address));
    try {
        const burnAmount = amount ? (0, core_1.toNano)(amount) : await lpWallet.getBalance();
        const seqNo = await (0, wallet_1.tonWalletGetSeqNo)(signer.wallet);
        await lpWallet.sendTransfer(sender, (0, core_1.toNano)(0.1), {
            destination: (0, address_1.tonAddr)(constants_1.ZERO_ADDRESS),
            amount: burnAmount,
        });
        await (0, transaction_1.tonTrWait)(signer.wallet, seqNo);
    }
    catch (error) {
        console.log(`[DAVID](DEDUST)(Burn LP) error :`, error);
    }
}
exports.dedustLPBurn = dedustLPBurn;
async function dedustLpQuery(who, jetton) {
    const pool = await dedustGetPool(jetton);
    if (!pool)
        return 0;
    const tonClient = await (0, endpoint_1.tonGetClient)();
    const lpWallet = tonClient.open(await pool.getWallet((0, address_1.tonAddr)(who)));
    try {
        const lpAmount = await lpWallet.getBalance();
        return Number((0, core_1.fromNano)(lpAmount));
    }
    catch (error) {
        return 0;
    }
}
exports.dedustLpQuery = dedustLpQuery;
