"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tonAddrWaitForActive = exports.tonAddrStr = exports.tonAddr = void 0;
const core_1 = require("@ton/core");
const endpoint_1 = require("../endpoint");
const basic_1 = require("../../utils/basic");
const time_1 = require("../../utils/time");
const constants_1 = require("../constants");
function tonAddr(addr) {
    if (addr instanceof core_1.Address)
        return addr;
    if (typeof addr === "string")
        return core_1.Address.parse(addr);
    return addr.wallet.address;
}
exports.tonAddr = tonAddr;
function tonAddrStr(addr) {
    if (addr instanceof core_1.Address)
        return addr.toString();
    if (typeof addr === "string")
        return addr;
    return addr.wallet.address.toString();
}
exports.tonAddrStr = tonAddrStr;
async function tonAddrWaitForActive(addr, timeout = constants_1.DEFAULT_DELAY_FOR_TR_CONFIRM) {
    const triggerStart = (0, time_1.getCurrentTimestamp)();
    while (true) {
        const curTimestamp = (0, time_1.getCurrentTimestamp)();
        if (curTimestamp - triggerStart > timeout)
            return false;
        try {
            const apiClient = await (0, endpoint_1.tonApiClient)();
            const account = await apiClient.accounts.getAccount(tonAddrStr(addr));
            if (account.status === 'active')
                return true;
        }
        catch (error) { }
        await (0, basic_1.sleep)(1000);
    }
}
exports.tonAddrWaitForActive = tonAddrWaitForActive;
