"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearTimestampedEntries = exports.setTimestampedEntry = exports.hasTimestampedEntry = exports.pruneTimestampedEntries = exports.normalizeResourceKey = exports.normalizeTurnKey = exports.normalizeAgentSessionKey = exports.normalizeSessionKey = exports.normalizeNamespaceKey = void 0;
const path_1 = __importDefault(require("path"));
const debug_log_1 = require("./debug-log");
const normalizeNamespaceKey = (...parts) => {
    const trimmedParts = parts.map((part) => part.trim());
    const nonEmptyParts = trimmedParts.filter(Boolean);
    const normalized = nonEmptyParts.join(':');
    (0, debug_log_1.debugLogBranch)('state-ops', 'normalize-namespace-key', {
        parts,
        trimmedParts,
        nonEmptyParts,
        normalized,
    });
    return normalized;
};
exports.normalizeNamespaceKey = normalizeNamespaceKey;
const normalizeSessionKey = (ide, sessionId) => {
    const normalized = (0, exports.normalizeNamespaceKey)('session', ide, sessionId ?? 'no-session');
    (0, debug_log_1.debugLogBranch)('state-ops', 'normalize-session-key', {
        ide,
        sessionId: sessionId ?? null,
        normalized,
    });
    return normalized;
};
exports.normalizeSessionKey = normalizeSessionKey;
const normalizeAgentSessionKey = (ide, sessionId, agentId) => {
    const sessionKey = (0, exports.normalizeSessionKey)(ide, sessionId);
    if (!agentId) {
        (0, debug_log_1.debugLogBranch)('state-ops', 'agent-session-key-downgraded', {
            ide,
            sessionId: sessionId ?? 'no-session',
            sessionKey,
            reason: 'missing-agent-id',
        });
        return sessionKey;
    }
    const normalized = (0, exports.normalizeNamespaceKey)('agent-session', ide, sessionId ?? 'no-session', agentId);
    (0, debug_log_1.debugLogBranch)('state-ops', 'normalize-agent-session-key', {
        ide,
        sessionId: sessionId ?? null,
        agentId,
        sessionKey,
        normalized,
        downgraded: false,
    });
    return normalized;
};
exports.normalizeAgentSessionKey = normalizeAgentSessionKey;
const normalizeTurnKey = (turnId) => {
    const normalized = turnId ? (0, exports.normalizeNamespaceKey)('turn', turnId) : null;
    (0, debug_log_1.debugLogBranch)('state-ops', 'normalize-turn-key', {
        turnId: turnId ?? null,
        normalized,
        reason: turnId ? 'turn-present' : 'turn-missing',
    });
    return normalized;
};
exports.normalizeTurnKey = normalizeTurnKey;
const normalizeResourceKey = (cwd, filePath) => {
    const resolved = path_1.default.isAbsolute(filePath) ? filePath : path_1.default.resolve(cwd || process.cwd(), filePath);
    const normalized = path_1.default.normalize(resolved);
    (0, debug_log_1.debugLogBranch)('state-ops', 'normalize-resource-key', {
        cwd,
        filePath,
        resolved,
        normalized,
    });
    return normalized;
};
exports.normalizeResourceKey = normalizeResourceKey;
const pruneTimestampedEntries = (entries, now, opts = {}) => {
    const ttlMs = opts.ttlMs ?? null;
    (0, debug_log_1.debugLogBranch)('state-ops', 'prune-timestamped-entries-start', {
        entries,
        now,
        ttlMs,
        maxEntries: opts.maxEntries ?? null,
    });
    let next = Object.fromEntries(Object.entries(entries).filter(([, ts]) => ttlMs == null || now - ts < ttlMs));
    if (opts.maxEntries && Object.keys(next).length > opts.maxEntries) {
        const sorted = Object.entries(next).sort((a, b) => b[1] - a[1]).slice(0, opts.maxEntries);
        next = Object.fromEntries(sorted);
        (0, debug_log_1.debugLogBranch)('state-ops', 'prune-timestamped-entries-trimmed', {
            now,
            maxEntries: opts.maxEntries,
            trimmedEntries: next,
        });
    }
    (0, debug_log_1.debugLogBranch)('state-ops', 'prune-timestamped-entries-result', {
        now,
        ttlMs,
        maxEntries: opts.maxEntries ?? null,
        next,
    });
    return next;
};
exports.pruneTimestampedEntries = pruneTimestampedEntries;
const hasTimestampedEntry = (entries, key, now, opts = {}) => {
    const pruned = (0, exports.pruneTimestampedEntries)(entries, now, opts);
    const present = Object.prototype.hasOwnProperty.call(pruned, key);
    (0, debug_log_1.debugLogBranch)('state-ops', 'has-timestamped-entry', {
        entries,
        key,
        now,
        opts,
        pruned,
        present,
    });
    return present;
};
exports.hasTimestampedEntry = hasTimestampedEntry;
const setTimestampedEntry = (entries, key, now, opts = {}) => {
    const pruned = (0, exports.pruneTimestampedEntries)(entries, now, opts);
    const next = { ...pruned, [key]: now };
    (0, debug_log_1.debugLogBranch)('state-ops', 'set-timestamped-entry', {
        entries,
        key,
        now,
        opts,
        pruned,
        next,
    });
    return next;
};
exports.setTimestampedEntry = setTimestampedEntry;
const clearTimestampedEntries = () => {
    const cleared = {};
    (0, debug_log_1.debugLogBranch)('state-ops', 'clear-timestamped-entries', {
        cleared,
    });
    return cleared;
};
exports.clearTimestampedEntries = clearTimestampedEntries;
