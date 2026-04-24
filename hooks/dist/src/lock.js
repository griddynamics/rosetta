"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acquireOnce = void 0;
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const LOCK_TTL_MS = 5_000;
const acquireOnce = (input) => {
    const fingerprint = (0, crypto_1.createHash)('sha256')
        .update(`${input.session_id ?? 'no-session'}:${input.hook_event_name}:${input.tool_name ?? ''}:${JSON.stringify(input.tool_input ?? {})}`)
        .digest('hex')
        .slice(0, 16);
    const lockPath = path_1.default.join(os_1.default.tmpdir(), `rosetta-hooks-${fingerprint}.lock`);
    try {
        (0, fs_1.writeFileSync)(lockPath, String(Date.now()), { flag: 'wx' });
        return true;
    }
    catch (err) {
        if (err.code !== 'EEXIST')
            throw err;
        const age = Date.now() - (0, fs_1.statSync)(lockPath).mtimeMs;
        if (age >= LOCK_TTL_MS) {
            (0, fs_1.writeFileSync)(lockPath, String(Date.now()));
            return true; // stale lock — takeover
        }
        return false; // duplicate within TTL window
    }
};
exports.acquireOnce = acquireOnce;
