"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLock = void 0;
function createLock() {
    let lockPromise;
    let resolve;
    return {
        async lock() {
            lockPromise = new Promise((r) => {
                resolve = r;
            });
        },
        unlock() {
            resolve?.();
            resolve = undefined;
            lockPromise = undefined;
        },
    };
}
exports.createLock = createLock;
//# sourceMappingURL=lock.js.map