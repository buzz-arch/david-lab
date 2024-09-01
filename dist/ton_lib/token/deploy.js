"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tonUiCreateToken = exports.tonCreateToken = exports.createDeployParams = exports.mintBody = exports.initData = exports.buildJettonOnchainMetadata = exports.buildJettonOffChainMetadata = void 0;
const jetton_wallet_compiled_json_1 = __importDefault(require("./contracts/jetton-wallet.compiled.json"));
const jetton_minter_compiled_json_1 = __importDefault(require("./contracts/jetton-minter.compiled.json"));
const contract_deployer_1 = require("./contract-deployer");
const sha256_js_1 = require("@aws-crypto/sha256-js");
const core_1 = require("@ton/core");
const bignumber_1 = require("../../utils/bignumber");
const common_1 = require("../common");
const address_1 = require("../address");
const ONCHAIN_CONTENT_PREFIX = 0x00;
const OFFCHAIN_CONTENT_PREFIX = 0x01;
const SNAKE_PREFIX = 0x00;
const JETTON_WALLET_CODE = core_1.Cell.fromBoc(Buffer.from(jetton_wallet_compiled_json_1.default.hex, 'hex'))[0];
const JETTON_MINTER_CODE = core_1.Cell.fromBoc(Buffer.from(jetton_minter_compiled_json_1.default.hex, 'hex'))[0]; // code cell from build output
const JETTON_DEPLOY_GAS = (0, core_1.toNano)(common_1.DEPLOY_GAS);
const OPS = {
    ChangeAdmin: 3,
    ReplaceMetadata: 4,
    Mint: 21,
    InternalTransfer: 0x178d4519,
    Transfer: 0xf8a7ea5,
    Burn: 0x595f07bc
};
const jettonOnChainMetadataSpec = {
    name: "utf8",
    description: "utf8",
    image: "ascii",
    decimals: "utf8",
    symbol: "utf8",
    image_data: "hex",
    uri: "ascii",
};
const sha256 = (str) => {
    const sha = new sha256_js_1.Sha256();
    sha.update(str);
    return Buffer.from(sha.digestSync());
};
const buildJettonOffChainMetadata = (contentUri) => {
    return (0, core_1.beginCell)()
        .storeInt(OFFCHAIN_CONTENT_PREFIX, 8)
        .storeBuffer(Buffer.from(contentUri, "ascii"))
        .endCell();
};
exports.buildJettonOffChainMetadata = buildJettonOffChainMetadata;
const buildJettonOnchainMetadata = (data) => {
    const dictionary = core_1.Dictionary.empty(core_1.Dictionary.Keys.Buffer(32), core_1.Dictionary.Values.Cell());
    Object.entries(data).forEach(([k, v]) => {
        // console.log(`[DAVID](buildJettonOnchainMetadata) key = ${k}, value = ${v}`)
        if (!(k in jettonOnChainMetadataSpec)) {
            throw new Error(`Unsupported onchain key: ${k}`);
        }
        let bufferToStore = Buffer.from(v, jettonOnChainMetadataSpec[k]);
        const CELL_MAX_SIZE_BYTES = Math.floor((1023 - 8) / 8);
        const rootCell = (0, core_1.beginCell)().storeUint(SNAKE_PREFIX, 8);
        let currentCell = rootCell;
        while (bufferToStore.length > 0) {
            currentCell = currentCell.storeBuffer(bufferToStore.slice(0, CELL_MAX_SIZE_BYTES));
            bufferToStore = bufferToStore.slice(CELL_MAX_SIZE_BYTES);
            if (bufferToStore.length > 0) {
                console.log(`[DAVID](buildJettonOnchainMetadata) ------- over max cell size`);
                let newCell = new core_1.Cell();
                currentCell.storeRef(newCell);
                currentCell = newCell.asBuilder();
            }
        }
        // console.log(`[VENUS](buildJettonOnchainMeatdata) rootCell = `, rootCell.asCell().toString())
        dictionary.set(sha256(k), rootCell.asCell());
    });
    const metadata = (0, core_1.beginCell)().storeInt(ONCHAIN_CONTENT_PREFIX, 8);
    dictionary.store(metadata);
    const mdata = metadata.endCell();
    // console.log(`[VENUS](buildJettonOnchainMetadata) metadata = ${mdata.toString()}`)
    return mdata;
};
exports.buildJettonOnchainMetadata = buildJettonOnchainMetadata;
const initData = (owner, data, offchainUri) => {
    if (!data && !offchainUri) {
        throw new Error("Must either specify onchain data or offchain uri");
    }
    return (0, core_1.beginCell)()
        .storeCoins(0)
        .storeAddress(owner)
        .storeRef(offchainUri ? (0, exports.buildJettonOffChainMetadata)(offchainUri) : (0, exports.buildJettonOnchainMetadata)(data))
        .storeRef(JETTON_WALLET_CODE)
        .endCell();
};
exports.initData = initData;
const mintBody = (owner, jettonValue, mintTo, transferToJWallet, queryId) => {
    return (0, core_1.beginCell)()
        .storeUint(OPS.Mint, 32)
        .storeUint(queryId, 64) // queryid
        .storeAddress(owner)
        .storeCoins(transferToJWallet)
        .storeRef(
    // internal transfer message
    (0, core_1.beginCell)()
        .storeUint(OPS.InternalTransfer, 32)
        .storeUint(0, 64)
        .storeCoins(jettonValue)
        .storeAddress(null)
        .storeAddress(mintTo)
        .storeCoins((0, core_1.toNano)(0.01))
        .storeBit(false) // forward_payload in this slice, not separate cell
        .endCell())
        .endCell();
};
exports.mintBody = mintBody;
const createDeployParams = (params, owner, mintTo, mintAmount, offchainUri = '') => {
    const queryId = 0;
    return {
        deployer: owner,
        code: JETTON_MINTER_CODE,
        data: (0, exports.initData)(owner, params, offchainUri),
        message: (0, exports.mintBody)(owner, mintAmount, mintTo, (0, core_1.toNano)(common_1.JETTON_RENT), queryId),
        value: JETTON_DEPLOY_GAS,
        mintAmount,
        mintTo,
    };
};
exports.createDeployParams = createDeployParams;
async function tonCreateToken(tokenDetails, singer, mintAmount = undefined, mintTo = undefined) {
    const _mintAmount = mintAmount ? (0, bignumber_1.toDecimalsBN)(mintAmount, tokenDetails.decimals) : (0, core_1.toNano)(0);
    const _mintTo = mintTo ? core_1.Address.parse(mintTo) : singer.wallet.address;
    const deployParams = (0, exports.createDeployParams)(tokenDetails, singer.wallet.address, _mintTo, _mintAmount);
    const tokenContract = await (0, contract_deployer_1.deployContract)(deployParams, singer);
    return tokenContract.toString();
}
exports.tonCreateToken = tonCreateToken;
async function tonUiCreateToken(tonConnection, tokenDetails, mintAmount = undefined, mintTo = undefined) {
    if (!tonConnection.account?.address)
        return undefined;
    const owner = core_1.Address.parse(tonConnection.account?.address);
    const _mintAmount = mintAmount ? (0, bignumber_1.toDecimalsBN)(mintAmount, tokenDetails.decimals) : (0, core_1.toNano)(0);
    const _mintTo = mintTo ? core_1.Address.parse(mintTo) : owner;
    const deployParams = (0, exports.createDeployParams)(tokenDetails, owner, _mintTo, _mintAmount);
    const tokenContract = await (0, contract_deployer_1.uiDeployContract)(deployParams, tonConnection);
    if ((await (0, address_1.tonAddrWaitForActive)(tokenContract)) === false)
        return undefined;
    return tokenContract.toString();
}
exports.tonUiCreateToken = tonUiCreateToken;
