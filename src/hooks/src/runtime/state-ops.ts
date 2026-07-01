import path from 'path';
import { debugLogBranch } from './debug-log';

export type TimestampedEntries = Record<string, number>;

export interface TimestampedSetOptions {
  ttlMs?: number;
  maxEntries?: number;
}

export const normalizeNamespaceKey = (...parts: readonly string[]): string => {
  const trimmedParts = parts.map((part) => part.trim());
  const nonEmptyParts = trimmedParts.filter(Boolean);
  const normalized = nonEmptyParts.join(':');
  debugLogBranch('state-ops', 'normalize-namespace-key', {
    parts,
    trimmedParts,
    nonEmptyParts,
    normalized,
  });
  return normalized;
};

export const normalizeSessionKey = (ide: string, sessionId: string | null | undefined): string => {
  const normalized = normalizeNamespaceKey('session', ide, sessionId ?? 'no-session');
  debugLogBranch('state-ops', 'normalize-session-key', {
    ide,
    sessionId: sessionId ?? null,
    normalized,
  });
  return normalized;
};

export const normalizeAgentSessionKey = (
  ide: string,
  sessionId: string | null | undefined,
  agentId: string | null | undefined,
): string => {
  const sessionKey = normalizeSessionKey(ide, sessionId);
  if (!agentId) {
    debugLogBranch('state-ops', 'agent-session-key-downgraded', {
      ide,
      sessionId: sessionId ?? 'no-session',
      sessionKey,
      reason: 'missing-agent-id',
    });
    return sessionKey;
  }
  const normalized = normalizeNamespaceKey('agent-session', ide, sessionId ?? 'no-session', agentId);
  debugLogBranch('state-ops', 'normalize-agent-session-key', {
    ide,
    sessionId: sessionId ?? null,
    agentId,
    sessionKey,
    normalized,
    downgraded: false,
  });
  return normalized;
};

export const normalizeTurnKey = (turnId: string | null | undefined): string | null => {
  const normalized = turnId ? normalizeNamespaceKey('turn', turnId) : null;
  debugLogBranch('state-ops', 'normalize-turn-key', {
    turnId: turnId ?? null,
    normalized,
    reason: turnId ? 'turn-present' : 'turn-missing',
  });
  return normalized;
};

export const normalizeResourceKey = (cwd: string, filePath: string): string => {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(cwd || process.cwd(), filePath);
  const normalized = path.normalize(resolved);
  debugLogBranch('state-ops', 'normalize-resource-key', {
    cwd,
    filePath,
    resolved,
    normalized,
  });
  return normalized;
};

export const pruneTimestampedEntries = (
  entries: TimestampedEntries,
  now: number,
  opts: TimestampedSetOptions = {},
): TimestampedEntries => {
  const ttlMs = opts.ttlMs ?? null;
  debugLogBranch('state-ops', 'prune-timestamped-entries-start', {
    entries,
    now,
    ttlMs,
    maxEntries: opts.maxEntries ?? null,
  });
  let next = Object.fromEntries(
    Object.entries(entries).filter(([, ts]) => ttlMs == null || now - ts < ttlMs),
  ) as TimestampedEntries;

  if (opts.maxEntries && Object.keys(next).length > opts.maxEntries) {
    const sorted = Object.entries(next).sort((a, b) => b[1] - a[1]).slice(0, opts.maxEntries);
    next = Object.fromEntries(sorted) as TimestampedEntries;
    debugLogBranch('state-ops', 'prune-timestamped-entries-trimmed', {
      now,
      maxEntries: opts.maxEntries,
      trimmedEntries: next,
    });
  }
  debugLogBranch('state-ops', 'prune-timestamped-entries-result', {
    now,
    ttlMs,
    maxEntries: opts.maxEntries ?? null,
    next,
  });
  return next;
};

export const hasTimestampedEntry = (
  entries: TimestampedEntries,
  key: string,
  now: number,
  opts: TimestampedSetOptions = {},
): boolean => {
  const pruned = pruneTimestampedEntries(entries, now, opts);
  const present = Object.prototype.hasOwnProperty.call(pruned, key);
  debugLogBranch('state-ops', 'has-timestamped-entry', {
    entries,
    key,
    now,
    opts,
    pruned,
    present,
  });
  return present;
};

export const setTimestampedEntry = (
  entries: TimestampedEntries,
  key: string,
  now: number,
  opts: TimestampedSetOptions = {},
): TimestampedEntries => {
  const pruned = pruneTimestampedEntries(entries, now, opts);
  const next = { ...pruned, [key]: now };
  debugLogBranch('state-ops', 'set-timestamped-entry', {
    entries,
    key,
    now,
    opts,
    pruned,
    next,
  });
  return next;
};

export const clearTimestampedEntries = (): TimestampedEntries => {
  const cleared = {};
  debugLogBranch('state-ops', 'clear-timestamped-entries', {
    cleared,
  });
  return cleared;
};
