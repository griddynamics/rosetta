"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseLockFile = exports.tryAcquireTimedLock = exports.writeTimestampFile = exports.readTimestampFile = exports.hashedFilePath = exports.hashKey = exports.ensureDirectory = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const debug_log_1 = require("./debug-log");
const ensureDirectory = (dir) => {
    fs_1.default.mkdirSync(dir, { recursive: true });
    (0, debug_log_1.debugLogBranch)('file-coordination', 'ensure-directory', { dir });
};
exports.ensureDirectory = ensureDirectory;
const hashKey = (key, size = 24) => {
    const hash = (0, crypto_1.createHash)('sha256').update(key).digest('hex').slice(0, size);
    (0, debug_log_1.debugLogBranch)('file-coordination', 'hash-key', {
        key,
        size,
        hash,
    });
    return hash;
};
exports.hashKey = hashKey;
const hashedFilePath = (dir, key, ext, size = 24) => {
    const hashedPath = path_1.default.join(dir, `${(0, exports.hashKey)(key, size)}${ext}`);
    (0, debug_log_1.debugLogBranch)('file-coordination', 'hashed-file-path', {
        dir,
        key,
        ext,
        size,
        hashedPath,
    });
    return hashedPath;
};
exports.hashedFilePath = hashedFilePath;
const readTimestampFile = (filePath) => {
    try {
        const raw = fs_1.default.readFileSync(filePath, 'utf-8').trim();
        const value = parseInt(raw, 10);
        const parsed = Number.isFinite(value) ? value : null;
        (0, debug_log_1.debugLogBranch)('file-coordination', 'read-timestamp', {
            filePath,
            raw,
            parsed,
            valid: parsed !== null,
        });
        return parsed;
    }
    catch {
        (0, debug_log_1.debugLogBranch)('file-coordination', 'read-timestamp-miss', { filePath });
        return null;
    }
};
exports.readTimestampFile = readTimestampFile;
const writeTimestampFile = (filePath, now = Date.now()) => {
    fs_1.default.writeFileSync(filePath, String(now));
    (0, debug_log_1.debugLogBranch)('file-coordination', 'write-timestamp', { filePath, now });
};
exports.writeTimestampFile = writeTimestampFile;
const tryAcquireTimedLock = (lockPath, opts, now = Date.now()) => {
    (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-acquire-start', {
        lockPath,
        staleAfterMs: opts.staleAfterMs,
        now,
    });
    const create = () => {
        try {
            const fd = fs_1.default.openSync(lockPath, 'wx');
            fs_1.default.writeSync(fd, String(now));
            fs_1.default.closeSync(fd);
            (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-created', {
                lockPath,
                staleAfterMs: opts.staleAfterMs,
                now,
            });
            return true;
        }
        catch {
            (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-create-collision', {
                lockPath,
                staleAfterMs: opts.staleAfterMs,
                now,
            });
            return false;
        }
    };
    if (create()) {
        (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-acquire-result', {
            lockPath,
            acquired: true,
            reason: 'created',
        });
        return true;
    }
    const createdAt = (0, exports.readTimestampFile)(lockPath);
    (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-existing-state', {
        lockPath,
        createdAt,
        now,
        ageMs: createdAt == null ? null : now - createdAt,
        staleAfterMs: opts.staleAfterMs,
    });
    if (createdAt != null && now - createdAt > opts.staleAfterMs) {
        try {
            fs_1.default.unlinkSync(lockPath);
            (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-stale-removed', {
                lockPath,
                createdAt,
                now,
                staleAfterMs: opts.staleAfterMs,
            });
        }
        catch {
            (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-stale-remove-failed', {
                lockPath,
                createdAt,
                now,
                staleAfterMs: opts.staleAfterMs,
            });
            (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-acquire-result', {
                lockPath,
                acquired: false,
                reason: 'stale-remove-failed',
            });
            return false;
        }
        const reacquired = create();
        (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-acquire-result', {
            lockPath,
            acquired: reacquired,
            reason: 'stale-retry',
        });
        return reacquired;
    }
    (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-busy', {
        lockPath,
        createdAt,
        now,
        staleAfterMs: opts.staleAfterMs,
    });
    (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-acquire-result', {
        lockPath,
        acquired: false,
        reason: 'busy',
    });
    return false;
};
exports.tryAcquireTimedLock = tryAcquireTimedLock;
const releaseLockFile = (lockPath) => {
    (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-release-start', { lockPath });
    try {
        fs_1.default.unlinkSync(lockPath);
        (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-released', { lockPath });
    }
    catch {
        (0, debug_log_1.debugLogBranch)('file-coordination', 'lock-release-miss', { lockPath });
    }
};
exports.releaseLockFile = releaseLockFile;
