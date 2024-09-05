"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tonSender = exports.getTon4Client = exports.tonApiClient = exports.getTonWebClient = exports.tonGetClient = exports.tonClient = exports.lc4 = exports.tonapiClient = void 0;
const ton_1 = require("@ton/ton");
const ton_access_1 = require("@orbs-network/ton-access");
const tonapi_sdk_js_1 = require("tonapi-sdk-js");
const common_1 = require("./common");
const tonweb_1 = __importDefault(require("tonweb"));
let tonwebClient;
const tonApi = {
    url: "https://tonapi.io",
    key: "AEQLZ5FTED6TOIIAAAAOQS57WGOXDFPJVR2XOCZUQIKGBU5FU6MTTVTDUPPOSIGZLLPNA2Q"
};
const tonWeb = {
    url:  "https://toncenter.com/api/v2/jsonRPC",
    key:  "aa31ec0a033a0297df34811744f47b106575a57549ac32e84dfc637332b790bb" 
};
const tonGetClient = async () => {
    if (exports.tonClient)
        return exports.tonClient;
    exports.tonClient = new ton_1.TonClient({ endpoint: tonWeb.url, apiKey: tonWeb.key });
    return exports.tonClient;
};
exports.tonGetClient = tonGetClient;
async function getTonWebClient() {
    if (tonwebClient) {
        return tonwebClient;
    }
    tonwebClient = new tonweb_1.default(new tonweb_1.default.HttpProvider(tonWeb.url, { apiKey: tonWeb.key }));
    return tonwebClient;
}
exports.getTonWebClient = getTonWebClient;
const tonApiClient = async () => {
    if (exports.tonapiClient) {
        return exports.tonapiClient;
    }
    const headers = {
        'Content-type': 'application/json',
        'Authorization': '',
    };
    if (tonApi.key) {
        headers.Authorization = `Bearer ${tonApi.key}`;
    }
    console.log("debug tonAPI data ====>", tonApi)
    const httpClient = new tonapi_sdk_js_1.HttpClient({
        baseUrl: tonApi.url,
        baseApiParams: {
            headers,
        }
    });
    // Initialize the API client
    const client = new tonapi_sdk_js_1.Api(httpClient);
    exports.tonapiClient = client;
    return client;
};
exports.tonApiClient = tonApiClient;
const getTon4Client = async (_configUrl) => {
    if (exports.lc4) {
        return exports.lc4;
    }
    exports.lc4 = new ton_1.TonClient4({ endpoint: await (0, ton_access_1.getHttpV4Endpoint)() });
    console.log(`[VENUS](getTon4Client) lc4 = `, exports.lc4);
    return exports.lc4;
};
exports.getTon4Client = getTon4Client;
async function tonSender(signer) {
    const tonClient = await (0, exports.tonGetClient)();
    return tonClient.open(signer.wallet).sender(signer.key.secretKey);
}
exports.tonSender = tonSender;
