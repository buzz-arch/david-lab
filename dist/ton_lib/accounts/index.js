"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tonAccountWaitForActive = exports.tonAccountIsActive = void 0;
const tonapi_sdk_js_1 = require("tonapi-sdk-js");
const endpoint_1 = require("../endpoint");
const basic_1 = require("../../utils/basic");
const time_1 = require("../../utils/time");
const index_1 = require("../address/index");
async function tonAccountIsActive(_account) {
    try {
        const apiClient = await (0, endpoint_1.tonApiClient)();
        const account = await apiClient.accounts.getAccount((0, index_1.tonAddrStr)(_account));
        console.log(`[DAVID](TON-LIB)tonAccountIsActive status =`, account.status);
        return account.status === tonapi_sdk_js_1.AccountStatus.Active;
    }
    catch (error) {
        return false;
    }
}
exports.tonAccountIsActive = tonAccountIsActive;
async function tonAccountWaitForActive(account, timeout) {
    const startTime = (0, time_1.getCurrentTimestamp)();
    const duration = timeout || (60 * 1000);
    while (true) {
        if (await tonAccountIsActive(account) === true)
            return true;
        if ((0, time_1.getCurrentTimestamp)() - startTime > duration)
            return false;
        await (0, basic_1.sleep)(1000);
    }
}
exports.tonAccountWaitForActive = tonAccountWaitForActive;
