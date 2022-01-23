"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventTarget = void 0;
function createEventTarget() {
    const eventListeners = {};
    function on(type, callback) {
        let s = eventListeners[type];
        if (!s) {
            s = new Set();
            eventListeners[type] = s;
        }
        s.add(callback);
        return () => {
            off(type, callback);
        };
    }
    function off(type, callback) {
        eventListeners[type]?.delete(callback);
    }
    function fire(type, params) {
        for (const callback of eventListeners[type] ?? []) {
            try {
                callback(params);
            }
            catch (err) {
                process.nextTick(() => {
                    throw err;
                });
            }
        }
    }
    return { on, off, fire };
}
exports.createEventTarget = createEventTarget;
//# sourceMappingURL=eventTarget.js.map