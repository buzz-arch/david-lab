"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endTrigger = exports.startTrigger = exports.getCurrentTimestamp = void 0;
let trigger = new Map();
function getCurrentTimestamp() {
    return Math.floor(new Date().getTime());
}
exports.getCurrentTimestamp = getCurrentTimestamp;
function startTrigger(label) {
    if (trigger.has(label)) {
        // console.log(`[DAVID](TIME) Cannot start trigger for ${label}. already running ...`)
        return;
    }
    const triggerStart = getCurrentTimestamp();
    // console.log(`[DAVID](TIME)(${label}) start trigerr. timestamp = ${triggerStart}`)
    trigger.set(label, triggerStart);
}
exports.startTrigger = startTrigger;
function endTrigger(label) {
    const startTime = trigger.get(label);
    if (!startTime) {
        // console.log(`[DAVID](TIME)(${label}) Cannot end trigger. not running ...`)
        return;
    }
    const timestamp = getCurrentTimestamp();
    console.log(`[DAVID](TIME)(${label}) Trigger elapsed = ${timestamp - startTime} ms`);
    trigger.delete(label);
}
exports.endTrigger = endTrigger;
