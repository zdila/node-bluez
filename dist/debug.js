"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = void 0;
const process_1 = __importDefault(require("process"));
const debugEnabled = process_1.default.argv.includes("--debug");
function debug(...args) {
    if (debugEnabled) {
        console.log(...args);
    }
}
exports.debug = debug;
//# sourceMappingURL=debug.js.map