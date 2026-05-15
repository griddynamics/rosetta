"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStampFresh = exports.makeDebounceStamp = exports.acquireOnce = void 0;
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const DEFAULT_DIR = os_1.default.tmpdir();
const LOCK_TTL_MS = 5_000;
const acquireOnce = (key, dir = DEFAULT_DIR) => {
    const hash = (0, crypto_1.createHash)('sha256').update(key).digest('hex').slice(0, 16);
    const lockPath = path_1.default.join(dir, `rosetta-hooks-${hash}.lock`);
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
            return true;
        }
        return false;
    }
};
exports.acquireOnce = acquireOnce;
const makeDebounceStamp = (repoKey, dir = DEFAULT_DIR) => {
    const hash = Buffer.from(repoKey).toString('base64').replace(/[/+=]/g, '_');
    const stampFile = path_1.default.join(dir, `${hash}.pending`);
    (0, fs_1.writeFileSync)(stampFile, String(Date.now()));
    return stampFile;
};
exports.makeDebounceStamp = makeDebounceStamp;
const isStampFresh = (stampFile, debounceMs) => {
    try {
        return Date.now() - parseInt((0, fs_1.readFileSync)(stampFile, 'utf-8')) < debounceMs;
    }
    catch {
        return false;
    }
};
exports.isStampFresh = isStampFresh;
