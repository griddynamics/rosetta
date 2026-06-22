"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugLog = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const LOG_DIR = path_1.default.join(os_1.default.homedir(), '.rosetta');
const LOG_PATH = path_1.default.join(LOG_DIR, 'hooks-debug.log');
const LOG_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ENABLED = process.env.ROSETTA_DEBUG === '1';
const ensureDir = () => {
    try {
        (0, fs_1.mkdirSync)(LOG_DIR, { recursive: true });
    }
    catch {
        // ignore — dir already exists or unwritable
    }
};
const rotatIfNeeded = () => {
    try {
        if ((0, fs_1.statSync)(LOG_PATH).size >= LOG_MAX_BYTES) {
            (0, fs_1.renameSync)(LOG_PATH, `${LOG_PATH.replace(/\.log$/, '')}.1.log`);
        }
    }
    catch {
        // file doesn't exist yet — no rotation needed
    }
};
const debugLog = (message, context) => {
    if (!ENABLED)
        return;
    ensureDir();
    rotatIfNeeded();
    const entry = JSON.stringify({ ts: new Date().toISOString(), msg: message, ...(context ?? {}) }) + '\n';
    try {
        (0, fs_1.appendFileSync)(LOG_PATH, entry);
    }
    catch {
        // silent — never let logging break the hook
    }
};
exports.debugLog = debugLog;
