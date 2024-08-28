"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tonPrice = exports.JETTON_RENT = exports.DEPLOY_GAS = exports.TESTONLY = exports.WORKCHAIN = exports.NETWORK = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const basic_1 = require("../utils/basic");
dotenv.config();
exports.NETWORK = process.env.NETWORK == undefined ? 'testnet' : process.env.NETWORK;
exports.WORKCHAIN = process.env.WORKCHAIN ? parseInt(process.env.WORKCHAIN) : 0;
exports.TESTONLY = exports.NETWORK == 'testnet' ? true : false;
exports.DEPLOY_GAS = process.env.DEPLOY_GAS != undefined ? parseFloat(process.env.DEPLOY_GAS) : 0.25;
exports.JETTON_RENT = process.env.TOKEN_RENT != undefined ? parseFloat(process.env.TOKEN_RENT) : 0.02;
let curTonPrice = 0;
async function fetchPrice() {
    const response = await axios_1.default.get('https://tonapi.io/v2/rates?tokens=ton&currencies=usd');
    curTonPrice = Number(response.data.rates.TON.prices.USD);
}
function tonPrice() {
    return curTonPrice;
}
exports.tonPrice = tonPrice;
async function tonlibTask() {
    while (true) {
        try {
            await fetchPrice();
        }
        catch (error) { }
        await (0, basic_1.sleep)(3000);
    }
}
tonlibTask();
