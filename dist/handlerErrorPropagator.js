"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propagateHandlerError = void 0;
function propagateHandlerError(fn) {
    return (...params) => {
        try {
            fn(...params);
        }
        catch (err) {
            process.nextTick(() => {
                throw err;
            });
        }
    };
}
exports.propagateHandlerError = propagateHandlerError;
//# sourceMappingURL=handlerErrorPropagator.js.map