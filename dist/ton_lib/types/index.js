"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWalletPair = void 0;
function isWalletPair(param) {
    return typeof param === 'object' && param !== null && 'key' in param && 'wallet' in param;
}
exports.isWalletPair = isWalletPair;
