import fs from 'fs';
import path from 'path';
import { advise, deny, sideEffect } from '../runtime/result-helpers';
import { collectEnvironment, debugLogHookBranch } from '../runtime/debug-log';
import { mutateNamespacedState, readNamespacedState } from '../runtime/state-store';
import { normalizeAgentSessionKey, normalizeResourceKey } from '../runtime/state-ops';
import type { HookContext, HookResult } from '../runtime/types';

// Original reference:
// https://github.com/Bande-a-Bonnot/Boucle-framework/tree/main/tools/read-once
export const READ_ONCE_NAMESPACE = 'hook:read-once';
const DEFAULT_TTL_MS = 20 * 60 * 1000;
const READ_OVERRIDE_TOKEN = 'READ-OVERRIDE';
const READ_ONCE_ENV_NAMES = [
  'READ_ONCE_MODE',
  'READ_ONCE_TTL',
  'READ_ONCE_DISABLED',
] as const;

export interface ReadOnceEntry {
  seenAt: number;
  mtimeMs: number;
  size: number;
  tokens: number;
}

export interface ReadOnceGlobalEntry extends ReadOnceEntry {
  agentSessionKey: string;
}

export interface ReadOnceStats {
  totalReads: number;
  firstReads: number;
  sameSessionHits: number;
  crossSessionAdvisories: number;
  changedFiles: number;
  ttlExpired: number;
  tokensSaved: number;
}

export interface ReadOnceState {
  sessions: Record<string, Record<string, ReadOnceEntry>>;
  global: Record<string, ReadOnceGlobalEntry>;
  stats: ReadOnceStats;
}

const defaultState = (): ReadOnceState => ({
  sessions: {},
  global:  {},
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

export interface ReadOnceConfig {
  mode: 'warn' | 'deny';
  ttlMs: number;
  disabled: boolean;
}

export const getReadOnceConfig = (): ReadOnceConfig => ({
  mode: process.env.READ_ONCE_MODE === 'deny' ? 'deny' : 'warn',
  ttlMs: Math.max(1, parseInt(process.env.READ_ONCE_TTL ?? '', 10) || DEFAULT_TTL_MS / 1000) * 1000,
  disabled: process.env.READ_ONCE_DISABLED === '1',
});

export const isFullRead = (ctx: HookContext): boolean =>
  !('offset' in ctx.toolInput) && !('limit' in ctx.toolInput);

const SHELL_SPLIT_RE = /[|;&><()`]/;
const SIMPLE_SHELL_READ_RE = /^(cat|sed|awk|head|tail)$/i;

const unquote = (value: string): string =>
  value.replace(/^['"]|['"]$/g, '');

const tokenizeCommand = (command: string): string[] | null => {
  if (!command.trim()) {
    debugLogHookBranch('read-once', 'bash-command-empty', { command });
    return null;
  }
  if (SHELL_SPLIT_RE.test(command)) {
    debugLogHookBranch('read-once', 'bash-command-complex-pass-through', { command });
    return null;
  }
  const tokens = command.match(/"[^"]*"|'[^']*'|\S+/g);
  const normalizedTokens = tokens?.map(unquote) ?? null;
  debugLogHookBranch('read-once', 'bash-command-tokenized', {
    command,
    tokens: normalizedTokens,
  });
  return normalizedTokens;
};

const extractSimpleShellReadPath = (command: string): string | null => {
  const tokens = tokenizeCommand(command);
  if (!tokens) return null;
  if (tokens.length < 2) {
    debugLogHookBranch('read-once', 'bash-command-too-short', { command, tokens });
    return null;
  }

  const [program, ...rest] = tokens;
  if (!SIMPLE_SHELL_READ_RE.test(program)) {
    debugLogHookBranch('read-once', 'bash-command-not-supported-reader', {
      command,
      program,
      tokens,
    });
    return null;
  }

  const fileTokens = rest.filter((token) => !token.startsWith('-'));
  if (fileTokens.length !== 1) {
    debugLogHookBranch('read-once', 'bash-command-ambiguous-paths', {
      command,
      program,
      tokens,
      fileTokens,
    });
    return null;
  }
  debugLogHookBranch('read-once', 'bash-command-simple-read-detected', {
    command,
    program,
    readPath: fileTokens[0],
  });
  return fileTokens[0];
};

const classifyReadPath = (ctx: HookContext): string | null => {
  if (ctx.event === 'PreRead') {
    if (!ctx.filePath) {
      debugLogHookBranch('read-once', 'pre-read-missing-file-path', {
        toolName: ctx.toolName,
      });
      return null;
    }
    if (!isFullRead(ctx)) {
      debugLogHookBranch('read-once', 'pre-read-partial-pass-through', {
        filePath: ctx.filePath,
        toolInput: ctx.toolInput,
      });
      return null;
    }
    debugLogHookBranch('read-once', 'pre-read-full-detected', {
      filePath: ctx.filePath,
    });
    return ctx.filePath;
  }

  if (ctx.event !== 'PreToolUse') {
    debugLogHookBranch('read-once', 'non-read-event-pass-through', {
      event: ctx.event,
      toolKind: ctx.toolKind,
      toolName: ctx.toolName,
    });
    return null;
  }

  if (ctx.toolKind === 'read' && ctx.filePath) {
    if (!isFullRead(ctx)) {
      debugLogHookBranch('read-once', 'tool-read-partial-pass-through', {
        filePath: ctx.filePath,
        toolInput: ctx.toolInput,
      });
      return null;
    }
    debugLogHookBranch('read-once', 'tool-read-full-detected', {
      filePath: ctx.filePath,
      toolName: ctx.toolName,
    });
    return ctx.filePath;
  }

  if (ctx.toolKind !== 'bash') {
    debugLogHookBranch('read-once', 'tool-kind-pass-through', {
      toolKind: ctx.toolKind,
      toolName: ctx.toolName,
    });
    return null;
  }

  const command = (ctx.toolInput.command as string) ?? '';
  return extractSimpleShellReadPath(command);
};

const estimateTokens = (size: number): number => Math.max(1, Math.ceil(size / 4));

const hasOverrideToken = (value: unknown): boolean => {
  if (typeof value === 'string') return value.includes(READ_OVERRIDE_TOKEN);
  if (Array.isArray(value)) return value.some((item) => hasOverrideToken(item));
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((item) => hasOverrideToken(item));
  }
  return false;
};

const hasReadOverride = (ctx: HookContext): boolean => {
  const overridden = hasOverrideToken(ctx.toolInput);
  debugLogHookBranch('read-once', 'override-check', {
    toolName: ctx.toolName,
    toolKind: ctx.toolKind,
    overridden,
    token: READ_OVERRIDE_TOKEN,
  });
  return overridden;
};

const statFile = (resourceKey: string): { mtimeMs: number; size: number } | null => {
  try {
    const stat = fs.statSync(resourceKey);
    debugLogHookBranch('read-once', 'stat-ok', {
      resourceKey,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
    });
    return { mtimeMs: stat.mtimeMs, size: stat.size };
  } catch {
    debugLogHookBranch('read-once', 'stat-miss-pass-through', { resourceKey });
    return null;
  }
};

const pruneSession = (
  sessionEntries: Record<string, ReadOnceEntry>,
  now: number,
  ttlMs: number,
): Record<string, ReadOnceEntry> =>
  Object.fromEntries(
    Object.entries(sessionEntries).filter(([, entry]) => now - entry.seenAt < ttlMs),
  );

const pruneState = (state: ReadOnceState, now: number, ttlMs: number): ReadOnceState => {
  const sessions = Object.fromEntries(
    Object.entries(state.sessions)
      .map(([sessionKey, entries]) => [sessionKey, pruneSession(entries, now, ttlMs)] as const)
      .filter(([, entries]) => Object.keys(entries).length > 0),
  );

  const global = Object.fromEntries(
    Object.entries(state.global).filter(([, entry]) => now - entry.seenAt < ttlMs),
  );

  return { ...state, sessions, global };
};

const describeSameSessionHit = (
  resourceKey: string,
  entry: ReadOnceEntry,
  ttlMs: number,
  tokensSaved: number,
): string => {
  const ageMinutes = Math.max(0, Math.floor((Date.now() - entry.seenAt) / 60000));
  return [
    `read-once: ${path.basename(resourceKey)} (~${entry.tokens} tokens) already in context`,
    `(read ${ageMinutes}m ago, unchanged).`,
    `Re-read allowed after ${Math.floor(ttlMs / 60000)}m.`,
    `Session savings: ~${tokensSaved} tokens.`,
    `If truly needed, retry via shell with exact comment # ${READ_OVERRIDE_TOKEN}.`,
  ].join(' ');
};

const describeCrossSessionAdvisory = (resourceKey: string, entry: ReadOnceGlobalEntry): string =>
  [
    `read-once: ${path.basename(resourceKey)} was already seen in another context`,
    `(${entry.agentSessionKey}) and is unchanged.`,
    `Allowing the first read in this context; future same-context re-reads can be deduplicated.`,
  ].join(' ');

const mutateReadOnceState = async (
  fallback: ReadOnceState,
  mutate: (current: ReadOnceState) => ReadOnceState,
): Promise<ReadOnceState | null> => {
  try {
    return await mutateNamespacedState(READ_ONCE_NAMESPACE, fallback, mutate);
  } catch (err) {
    debugLogHookBranch('read-once', 'state-mutate-failed', { error: (err as Error).message });
    return null;
  }
};

export const handleReadOnce = async (ctx: HookContext): Promise<HookResult> => {
  const config = getReadOnceConfig();
  debugLogHookBranch('read-once', 'config', {
    config,
    env: collectEnvironment(READ_ONCE_ENV_NAMES),
  });
  if (config.disabled) {
    debugLogHookBranch('read-once', 'disabled-pass-through', {});
    return null;
  }

  const readPath = classifyReadPath(ctx);
  if (!readPath) {
    debugLogHookBranch('read-once', 'not-a-trackable-read-pass-through', {
      event: ctx.event,
      toolKind: ctx.toolKind,
      toolName: ctx.toolName,
    });
    return null;
  }

  const agentSessionKey = normalizeAgentSessionKey(ctx.ide, ctx.sessionId, ctx.agentId);
  const resourceKey = normalizeResourceKey(ctx.cwd, readPath);
  const fileStat = statFile(resourceKey);
  if (!fileStat) return null;

  const now = Date.now();
  const next = await mutateReadOnceState(
    defaultState(),
    (current) => pruneState(current, now, config.ttlMs),
  );
  if (!next) {
    debugLogHookBranch('read-once', 'state-unavailable-pass-through', {
      agentSessionKey,
      resourceKey,
    });
    return null;
  }

  const sessionEntries = next.sessions[agentSessionKey] ?? {};
  const sessionEntry = sessionEntries[resourceKey];
  const globalEntry = next.global[resourceKey];
  const overridden = hasReadOverride(ctx);
  debugLogHookBranch('read-once', 'state-snapshot', {
    agentSessionKey,
    resourceKey,
    sessionEntry: sessionEntry ?? null,
    globalEntry: globalEntry ?? null,
    overridden,
    stats: next.stats,
  });

  if (sessionEntry && sessionEntry.mtimeMs === fileStat.mtimeMs) {
    if (overridden) {
      const overrideEntry: ReadOnceEntry = {
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
      debugLogHookBranch('read-once', 'same-session-override-allow', {
        agentSessionKey,
        resourceKey,
        token: READ_OVERRIDE_TOKEN,
      });
      return null;
    }

    const message = describeSameSessionHit(
      resourceKey,
      sessionEntry,
      config.ttlMs,
      next.stats.tokensSaved + sessionEntry.tokens,
    );
    await mutateReadOnceState(next, (current) => ({
      ...current,
      stats: {
        ...current.stats,
        totalReads: current.stats.totalReads + 1,
        sameSessionHits: current.stats.sameSessionHits + 1,
        tokensSaved: current.stats.tokensSaved + sessionEntry.tokens,
      },
    }));
    debugLogHookBranch('read-once', 'same-session-hit', {
      agentSessionKey,
      resourceKey,
      mode: config.mode,
      token: READ_OVERRIDE_TOKEN,
      message,
    });
    return config.mode === 'deny' ? deny(message) : advise(message);
  }

  const entry: ReadOnceEntry = {
    seenAt: now,
    mtimeMs: fileStat.mtimeMs,
    size: fileStat.size,
    tokens: estimateTokens(fileStat.size),
  };

  await mutateReadOnceState(next, (current) => {
    const pruned = pruneState(current, now, config.ttlMs);
    const hadGlobal = Boolean(
      pruned.global[resourceKey] && pruned.global[resourceKey].agentSessionKey !== agentSessionKey,
    );
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
  debugLogHookBranch('read-once', 'state-recorded', {
    agentSessionKey,
    resourceKey,
    entry,
    previousSessionEntry: sessionEntry ?? null,
    previousGlobalEntry: globalEntry ?? null,
  });

  if (
    globalEntry &&
    globalEntry.agentSessionKey !== agentSessionKey &&
    globalEntry.mtimeMs === fileStat.mtimeMs
  ) {
    const message = describeCrossSessionAdvisory(resourceKey, globalEntry);
    debugLogHookBranch('read-once', 'cross-session-advisory', {
      agentSessionKey,
      resourceKey,
      message,
    });
    return advise(message);
  }

  debugLogHookBranch('read-once', 'first-or-changed-read-allow', {
    agentSessionKey,
    resourceKey,
    previousSessionEntry: sessionEntry ?? null,
    previousGlobalEntry: globalEntry ?? null,
  });
  return null;
};

export const resetReadOnceSession = async (ctx: HookContext): Promise<HookResult> => {
  if (!ctx.sessionId) {
    debugLogHookBranch('read-once-reset', 'missing-session-id-noop', {
      ide: ctx.ide,
      agentId: ctx.agentId,
      event: ctx.event,
    });
    return sideEffect();
  }
  const agentSessionKey = normalizeAgentSessionKey(ctx.ide, ctx.sessionId, ctx.agentId);
  await mutateReadOnceState(
    defaultState(),
    (current) => {
      const next = { ...current, sessions: { ...current.sessions } };
      delete next.sessions[agentSessionKey];
      return next;
    },
  );
  debugLogHookBranch('read-once-reset', 'session-cleared', {
    agentSessionKey,
    ide: ctx.ide,
    event: ctx.event,
    agentId: ctx.agentId,
    source: ctx.source,
    reason: ctx.reason,
    trigger: ctx.trigger,
  });
  return sideEffect();
};

export const readReadOnceState = (): ReadOnceState =>
  readNamespacedState(READ_ONCE_NAMESPACE, defaultState());
