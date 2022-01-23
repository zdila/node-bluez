"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLock = void 0;
function createLock() {
    let lockPromise;
    let resolve;
    return {
        async lock() {
            console.log("11111111");
            await lockPromise;
            console.log("222222222");
            lockPromise = new Promise((r) => {
                resolve = r;
            });
        },
        unlock() {
            console.log("333333333");
            resolve?.();
            resolve = undefined;
            lockPromise = undefined;
        },
    };
}
exports.createLock = createLock;
//# sourceMappingURL=lock.js.map