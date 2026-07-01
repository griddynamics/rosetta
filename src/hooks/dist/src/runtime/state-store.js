"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mutateNamespacedState = exports.writeNamespacedState = exports.readNamespacedState = void 0;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const debug_log_1 = require("./debug-log");
const file_coordination_1 = require("./file-coordination");
const STATE_ROOT = path_1.default.join(os_1.default.homedir(), '.rosetta', 'state');
const LOCK_TTL_MS = 30_000;
const LOCK_RETRY_MS = 25;
const LOCK_RETRY_LIMIT = 20;
const ensureStateRoot = () => {
    (0, file_coordination_1.ensureDirectory)(STATE_ROOT);
};
const statePathFor = (namespace) => (0, file_coordination_1.hashedFilePath)(STATE_ROOT, `state:${namespace}`, '.json');
const lockPathFor = (namespace) => (0, file_coordination_1.hashedFilePath)(STATE_ROOT, `state-lock:${namespace}`, '.lock');
const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const readNamespacedState = (namespace, fallback) => {
    ensureStateRoot();
    const file = statePathFor(namespace);
    try {
        const parsed = JSON.parse(fs_1.default.readFileSync(file, 'utf-8'));
        (0, debug_log_1.debugLogBranch)('state-store', 'read', {
            namespace,
            file,
            stateRoot: STATE_ROOT,
            hit: true,
        });
        return parsed;
    }
    catch {
        (0, debug_log_1.debugLogBranch)('state-store', 'read', {
            namespace,
            file,
            stateRoot: STATE_ROOT,
            hit: false,
        });
        return fallback;
    }
};
exports.readNamespacedState = readNamespacedState;
const writeNamespacedState = (namespace, value) => {
    ensureStateRoot();
    const file = statePathFor(namespace);
    const temp = `${file}.tmp`;
    fs_1.default.writeFileSync(temp, JSON.stringify(value, null, 2));
    fs_1.default.renameSync(temp, file);
    (0, debug_log_1.debugLogBranch)('state-store', 'write', {
        namespace,
        file,
        temp,
        stateRoot: STATE_ROOT,
        value,
    });
};
exports.writeNamespacedState = writeNamespacedState;
const mutateNamespacedState = async (namespace, fallback, mutate) => {
    ensureStateRoot();
    const lockPath = lockPathFor(namespace);
    (0, debug_log_1.debugLogBranch)('state-store', 'mutate-begin', {
        namespace,
        stateRoot: STATE_ROOT,
        lockPath,
        lockTtlMs: LOCK_TTL_MS,
        lockRetryMs: LOCK_RETRY_MS,
        lockRetryLimit: LOCK_RETRY_LIMIT,
    });
    let acquired = false;
    for (let i = 0; i < LOCK_RETRY_LIMIT; i++) {
        if ((0, file_coordination_1.tryAcquireTimedLock)(lockPath, { staleAfterMs: LOCK_TTL_MS })) {
            acquired = true;
            (0, debug_log_1.debugLogBranch)('state-store', 'lock-acquired', { namespace, lockPath, attempt: i + 1 });
            break;
        }
        (0, debug_log_1.debugLogBranch)('state-store', 'lock-retry', { namespace, lockPath, attempt: i + 1 });
        await sleep(LOCK_RETRY_MS);
    }
    if (!acquired) {
        (0, debug_log_1.debugLogBranch)('state-store', 'lock-timeout', { namespace });
        throw new Error(`state_lock_timeout:${namespace}`);
    }
    try {
        const current = (0, exports.readNamespacedState)(namespace, fallback);
        const next = mutate(current);
        (0, debug_log_1.debugLogBranch)('state-store', 'mutate-apply', {
            namespace,
            lockPath,
            current,
            next,
        });
        (0, exports.writeNamespacedState)(namespace, next);
        return next;
    }
    finally {
        (0, file_coordination_1.releaseLockFile)(lockPath);
        (0, debug_log_1.debugLogBranch)('state-store', 'mutate-end', { namespace, lockPath });
    }
};
exports.mutateNamespacedState = mutateNamespacedState;
