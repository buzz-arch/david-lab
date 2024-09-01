"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_DELAY_FOR_TR_CONFIRM = exports.OPCODES = exports.FEE_TOKEN_TRANSFER = exports.ZERO_ADDRESS = void 0;
const common_1 = require("../common");
exports.ZERO_ADDRESS = common_1.NETWORK === 'mainnet'
    ? "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ"
    : "0QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACkT";
exports.FEE_TOKEN_TRANSFER = 0.07;
var OPCODES;
(function (OPCODES) {
    OPCODES[OPCODES["TOKEN_INTERNAL_TRANSFER"] = 395134233] = "TOKEN_INTERNAL_TRANSFER";
})(OPCODES || (exports.OPCODES = OPCODES = {}));
exports.DEFAULT_DELAY_FOR_TR_CONFIRM = (120 * 1000);
