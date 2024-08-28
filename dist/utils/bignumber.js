"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromDecimalsBN = exports.toDecimalsBN = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const toDecimalsBN = (num, decimals) => {
    if (typeof decimals === 'string')
        decimals = parseInt(decimals);
    let numstr = "0";
    if (Number.isInteger(num)) {
        numstr = (new bn_js_1.default(num).mul(new bn_js_1.default(10 ** decimals))).toString();
    }
    else {
        numstr = Math.floor((Number(num.toFixed(decimals)) * (10 ** decimals))).toString();
    }
    return BigInt(numstr);
};
exports.toDecimalsBN = toDecimalsBN;
const fromDecimalsBN = (amount, decimals = 6) => {
    if (typeof decimals === 'string')
        decimals = parseInt(decimals);
    return Number(amount) / (10 ** decimals);
};
exports.fromDecimalsBN = fromDecimalsBN;
