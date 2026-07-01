"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readReadOnceState = exports.resetReadOnceSession = exports.handleReadOnce = exports.isFullRead = exports.getReadOnceConfig = exports.READ_ONCE_NAMESPACE = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const result_helpers_1 = require("../runtime/result-helpers");
const debug_log_1 = require("../runtime/debug-log");
const state_store_1 = require("../runtime/state-store");
const state_ops_1 = require("../runtime/state-ops");
// Original reference:
// https://github.com/Bande-a-Bonnot/Boucle-framework/tree/main/tools/read-once
exports.READ_ONCE_NAMESPACE = 'hook:read-once';
const DEFAULT_TTL_MS = 20 * 60 * 1000;
const READ_OVERRIDE_TOKEN = 'READ-OVERRIDE';
const READ_ONCE_ENV_NAMES = [
    'READ_ONCE_MODE',
    'READ_ONCE_TTL',
    'READ_ONCE_DISABLED',
];
const defaultState = () => ({
    sessions: {},
    global: {},
    stats: {
        totalReads: 0,
        firstReads: 0,
        sameSessionHits: 0,
        crossSessionAdvisories: 0,
        changedFiles: 0,
        ttlExpired: 0,
        tokensSaved: 0,
    },
});
const getReadOnceConfig = () => ({
    mode: process.env.READ_ONCE_MODE === 'deny' ? 'deny' : 'warn',
    ttlMs: Math.max(1, parseInt(process.env.READ_ONCE_TTL ?? '', 10) || DEFAULT_TTL_MS / 1000) * 1000,
    disabled: process.env.READ_ONCE_DISABLED === '1',
});
exports.getReadOnceConfig = getReadOnceConfig;
const isFullRead = (ctx) => !('offset' in ctx.toolInput) && !('limit' in ctx.toolInput);
exports.isFullRead = isFullRead;
const SHELL_SPLIT_RE = /[|;&><()`]/;
const SIMPLE_SHELL_READ_RE = /^(cat|sed|awk|head|tail)$/i;
const unquote = (value) => value.replace(/^['"]|['"]$/g, '');
const tokenizeCommand = (command) => {
    if (!command.trim()) {
        (0, debug_log_1.debugLogHookBranch)('read-once', 'bash-command-empty', { command });
        return null;
    }
    if (SHELL_SPLIT_RE.test(command)) {
        (0, debug_log_1.debugLogHookBranch)('read-once', 'bash-command-complex-pass-through', { command });
        return null;
    }
    const tokens = command.match(/"[^"]*"|'[^']*'|\S+/g);
    const normalizedTokens = tokens?.map(unquote) ?? null;
    (0, debug_log_1.debugLogHookBranch)('read-once', 'bash-command-tokenized', {
        command,
        tokens: normalizedTokens,
    });
    return normalizedTokens;
};
const extractSimpleShellReadPath = (command) => {
    const tokens = tokenizeCommand(command);
    if (!tokens)
        return null;
    if (tokens.length < 2) {
        (0, debug_log_1.debugLogHookBranch)('read-once', 'bash-command-too-short', { command, tokens });
        return null;
    }
    const [program, ...rest] = tokens;
    if (!SIMPLE_SHELL_READ_RE.test(program)) {
        (0, debug_log_1.debugLogHookBranch)('read-once', 'bash-command-not-supported-reader', {
            command,
            program,
            tokens,
        });
        return null;
    }
    const fileTokens = rest.filter((token) => !token.startsWith('-'));
    if (fileTokens.length !== 1) {
        (0, debug_log_1.debugLogHookBranch)('read-once', 'bash-command-ambiguous-paths', {
            command,
            program,
            tokens,
            fileTokens,
        });
        return null;
    }
    (0, debug_log_1.debugLogHookBranch)('read-once', 'bash-command-simple-read-detected', {
        command,
        program,
        readPath: fileTokens[0],
    });
    return fileTokens[0];
};
const classifyReadPath = (ctx) => {
    if (ctx.event === 'PreRead') {
        if (!ctx.filePath) {
            (0, debug_log_1.debugLogHookBranch)('read-once', 'pre-read-missing-file-path', {
                toolName: ctx.toolName,
            });
            return null;
        }
        if (!(0, exports.isFullRead)(ctx)) {
            (0, debug_log_1.debugLogHookBranch)('read-once', 'pre-read-partial-pass-through', {
                filePath: ctx.filePath,
                toolInput: ctx.toolInput,
            });
            return null;
        }
        (0, debug_log_1.debugLogHookBranch)('read-once', 'pre-read-full-detected', {
            filePath: ctx.filePath,
        });
        return ctx.filePath;
    }
    if (ctx.event !== 'PreToolUse') {
        (0, debug_log_1.debugLogHookBranch)('read-once', 'non-read-event-pass-through', {
            event: ctx.event,
            toolKind: ctx.toolKind,
            toolName: ctx.toolName,
        });
        return null;
    }
    if (ctx.toolKind === 'read' && ctx.filePath) {
        if (!(0, exports.isFullRead)(ctx)) {
            (0, debug_log_1.debugLogHookBranch)('read-once', 'tool-read-partial-pass-through', {
                filePath: ctx.filePath,
                toolInput: ctx.toolInput,
            });
            return null;
        }
        (0, debug_log_1.debugLogHookBranch)('read-once', 'tool-read-full-detected', {
            filePath: ctx.filePath,
            toolName: ctx.toolName,
        });
        return ctx.filePath;
    }
    if (ctx.toolKind !== 'bash') {
        (0, debug_log_1.debugLogHookBranch)('read-once', 'tool-kind-pass-through', {
            toolKind: ctx.toolKind,
            toolName: ctx.toolName,
        });
        return null;
    }
    const command = ctx.toolInput.command ?? '';
    return extractSimpleShellReadPath(command);
};
const estimateTokens = (size) => Math.max(1, Math.ceil(size / 4));
const hasOverrideToken = (value) => {
    if (typeof value === 'string')
        return value.includes(READ_OVERRIDE_TOKEN);
    if (Array.isArray(value))
        return value.some((item) => hasOverrideToken(item));
    if (value && typeof value === 'object') {
        return Object.values(value).some((item) => hasOverrideToken(item));
    }
    return false;
};
const hasReadOverride = (ctx) => {
    const overridden = hasOverrideToken(ctx.toolInput);
    (0, debug_log_1.debugLogHookBranch)('read-once', 'override-check', {
        toolName: ctx.toolName,
        toolKind: ctx.toolKind,
        overridden,
        token: READ_OVERRIDE_TOKEN,
    });
    return overridden;
};
const statFile = (resourceKey) => {
    try {
        const stat = fs_1.default.statSync(resourceKey);
        (0, debug_log_1.debugLogHookBranch)('read-once', 'stat-ok', {
            resourceKey,
            mtimeMs: stat.mtimeMs,
            size: stat.size,
        });
        return { mtimeMs: stat.mtimeMs, size: stat.size };
    }
    catch {
        (0, debug_log_1.debugLogHookBranch)('read-once', 'stat-miss-pass-through', { resourceKey });
        return null;
    }
};
const pruneSession = (sessionEntries, now, ttlMs) => Object.fromEntries(Object.entries(sessionEntries).filter(([, entry]) => now - entry.seenAt < ttlMs));
const pruneState = (state, now, ttlMs) => {
    const sessions = Object.fromEntries(Object.entries(state.sessions)
        .map(([sessionKey, entries]) => [sessionKey, pruneSession(entries, now, ttlMs)])
        .filter(([, entries]) => Object.keys(entries).length > 0));
    const global = Object.fromEntries(Object.entries(state.global).filter(([, entry]) => now - entry.seenAt < ttlMs));
    return { ...state, sessions, global };
};
const describeSameSessionHit = (resourceKey, entry, ttlMs, tokensSaved) => {
    const ageMinutes = Math.max(0, Math.floor((Date.now() - entry.seenAt) / 60000));
    return [
        `read-once: ${path_1.default.basename(resourceKey)} (~${entry.tokens} tokens) already in context`,
        `(read ${ageMinutes}m ago, unchanged).`,
        `Re-read allowed after ${Math.floor(ttlMs / 60000)}m.`,
        `Session savings: ~${tokensSaved} tokens.`,
        `If truly needed, retry via shell with exact comment # ${READ_OVERRIDE_TOKEN}.`,
    ].join(' ');
};
const describeCrossSessionAdvisory = (resourceKey, entry) => [
    `read-once: ${path_1.default.basename(resourceKey)} was already seen in another context`,
    `(${entry.agentSessionKey}) and is unchanged.`,
    `Allowing the first read in this context; future same-context re-reads can be deduplicated.`,
].join(' ');
const mutateReadOnceState = async (fallback, mutate) => {
    try {
        return await (0, state_store_1.mutateNamespacedState)(exports.READ_ONCE_NAMESPACE, fallback, mutate);
    }
    catch (err) {
        (0, debug_log_1.debugLogHookBranch)('read-once', 'state-mutate-failed', { error: err.message });
        return null;
    }
};
const handleReadOnce = async (ctx) => {
    const config = (0, exports.getReadOnceConfig)();
    (0, debug_log_1.debugLogHookBranch)('read-once', 'config', {
        config,
        env: (0, debug_log_1.collectEnvironment)(READ_ONCE_ENV_NAMES),
    });
    if (config.disabled) {
        (0, debug_log_1.debugLogHookBranch)('read-once', 'disabled-pass-through', {});
        return null;
    }
    const readPath = classifyReadPath(ctx);
    if (!readPath) {
        (0, debug_log_1.debugLogHookBranch)('read-once', 'not-a-trackable-read-pass-through', {
            event: ctx.event,
            toolKind: ctx.toolKind,
            toolName: ctx.toolName,
        });
        return null;
    }
    const agentSessionKey = (0, state_ops_1.normalizeAgentSessionKey)(ctx.ide, ctx.sessionId, ctx.agentId);
    const resourceKey = (0, state_ops_1.normalizeResourceKey)(ctx.cwd, readPath);
    const fileStat = statFile(resourceKey);
    if (!fileStat)
        return null;
    const now = Date.now();
    const next = await mutateReadOnceState(defaultState(), (current) => pruneState(current, now, config.ttlMs));
    if (!next) {
        (0, debug_log_1.debugLogHookBranch)('read-once', 'state-unavailable-pass-through', {
            agentSessionKey,
            resourceKey,
        });
        return null;
    }
    const sessionEntries = next.sessions[agentSessionKey] ?? {};
    const sessionEntry = sessionEntries[resourceKey];
    const globalEntry = next.global[resourceKey];
    const overridden = hasReadOverride(ctx);
    (0, debug_log_1.debugLogHookBranch)('read-once', 'state-snapshot', {
        agentSessionKey,
        resourceKey,
        sessionEntry: sessionEntry ?? null,
        globalEntry: globalEntry ?? null,
        overridden,
        stats: next.stats,
    });
    if (sessionEntry && sessionEntry.mtimeMs === fileStat.mtimeMs) {
        if (overridden) {
            const overrideEntry = {
                seenAt: now,
                mtimeMs: fileStat.mtimeMs,
                size: fileStat.size,
                tokens: estimateTokens(fileStat.size),
            };
            await mutateReadOnceState(next, (current) => {
                const pruned = pruneState(current, now, config.ttlMs);
                return {
                    ...pruned,
                    sessions: {
                        ...pruned.sessions,
                        [agentSessionKey]: {
                            ...(pruned.sessions[agentSessionKey] ?? {}),
                            [resourceKey]: overrideEntry,
                        },
                    },
                    global: {
                        ...pruned.global,
                        [resourceKey]: {
                            ...overrideEntry,
                            agentSessionKey,
                        },
                    },
                    stats: {
                        ...pruned.stats,
                        totalReads: pruned.stats.totalReads + 1,
                    },
                };
            });
            (0, debug_log_1.debugLogHookBranch)('read-once', 'same-session-override-allow', {
                agentSessionKey,
                resourceKey,
                token: READ_OVERRIDE_TOKEN,
            });
            return null;
        }
        const message = describeSameSessionHit(resourceKey, sessionEntry, config.ttlMs, next.stats.tokensSaved + sessionEntry.tokens);
        await mutateReadOnceState(next, (current) => ({
            ...current,
            stats: {
                ...current.stats,
                totalReads: current.stats.totalReads + 1,
                sameSessionHits: current.stats.sameSessionHits + 1,
                tokensSaved: current.stats.tokensSaved + sessionEntry.tokens,
            },
        }));
        (0, debug_log_1.debugLogHookBranch)('read-once', 'same-session-hit', {
            agentSessionKey,
            resourceKey,
            mode: config.mode,
            token: READ_OVERRIDE_TOKEN,
            message,
        });
        return config.mode === 'deny' ? (0, result_helpers_1.deny)(message) : (0, result_helpers_1.advise)(message);
    }
    const entry = {
        seenAt: now,
        mtimeMs: fileStat.mtimeMs,
        size: fileStat.size,
        tokens: estimateTokens(fileStat.size),
    };
    await mutateReadOnceState(next, (current) => {
        const pruned = pruneState(current, now, config.ttlMs);
        const hadGlobal = Boolean(pruned.global[resourceKey] && pruned.global[resourceKey].agentSessionKey !== agentSessionKey);
        const wasChanged = Boolean(sessionEntry && sessionEntry.mtimeMs !== fileStat.mtimeMs);
        return {
            sessions: {
                ...pruned.sessions,
                [agentSessionKey]: {
                    ...(pruned.sessions[agentSessionKey] ?? {}),
                    [resourceKey]: entry,
                },
            },
            global: {
                ...pruned.global,
                [resourceKey]: {
                    ...entry,
                    agentSessionKey,
                },
            },
            stats: {
                ...pruned.stats,
                totalReads: pruned.stats.totalReads + 1,
                firstReads: pruned.stats.firstReads + (sessionEntry ? 0 : 1),
                crossSessionAdvisories: pruned.stats.crossSessionAdvisories + (hadGlobal ? 1 : 0),
                changedFiles: pruned.stats.changedFiles + (wasChanged ? 1 : 0),
            },
        };
    });
    (0, debug_log_1.debugLogHookBranch)('read-once', 'state-recorded', {
        agentSessionKey,
        resourceKey,
        entry,
        previousSessionEntry: sessionEntry ?? null,
        previousGlobalEntry: globalEntry ?? null,
    });
    if (globalEntry &&
        globalEntry.agentSessionKey !== agentSessionKey &&
        globalEntry.mtimeMs === fileStat.mtimeMs) {
        const message = describeCrossSessionAdvisory(resourceKey, globalEntry);
        (0, debug_log_1.debugLogHookBranch)('read-once', 'cross-session-advisory', {
            agentSessionKey,
            resourceKey,
            message,
        });
        return (0, result_helpers_1.advise)(message);
    }
    (0, debug_log_1.debugLogHookBranch)('read-once', 'first-or-changed-read-allow', {
        agentSessionKey,
        resourceKey,
        previousSessionEntry: sessionEntry ?? null,
        previousGlobalEntry: globalEntry ?? null,
    });
    return null;
};
exports.handleReadOnce = handleReadOnce;
const resetReadOnceSession = async (ctx) => {
    if (!ctx.sessionId) {
        (0, debug_log_1.debugLogHookBranch)('read-once-reset', 'missing-session-id-noop', {
            ide: ctx.ide,
            agentId: ctx.agentId,
            event: ctx.event,
        });
        return (0, result_helpers_1.sideEffect)();
    }
    const agentSessionKey = (0, state_ops_1.normalizeAgentSessionKey)(ctx.ide, ctx.sessionId, ctx.agentId);
    await mutateReadOnceState(defaultState(), (current) => {
        const next = { ...current, sessions: { ...current.sessions } };
        delete next.sessions[agentSessionKey];
        return next;
    });
    (0, debug_log_1.debugLogHookBranch)('read-once-reset', 'session-cleared', {
        agentSessionKey,
        ide: ctx.ide,
        event: ctx.event,
        agentId: ctx.agentId,
        source: ctx.source,
        reason: ctx.reason,
        trigger: ctx.trigger,
    });
    return (0, result_helpers_1.sideEffect)();
};
exports.resetReadOnceSession = resetReadOnceSession;
const readReadOnceState = () => (0, state_store_1.readNamespacedState)(exports.READ_ONCE_NAMESPACE, defaultState());
exports.readReadOnceState = readReadOnceState;
