import { appendFileSync, renameSync, statSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';
import jsonCycle from 'json-cycle';

const LOG_DIR = path.join(os.homedir(), '.rosetta');
const LOG_PATH = path.join(LOG_DIR, 'rosetta.log');
const LOG_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const getDebugLogDir = (): string => LOG_DIR;
export const getDebugLogPath = (): string => LOG_PATH;

const normalizeForJson = (value: unknown, seen = new WeakMap<object, unknown>()): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return `[Function:${value.name || 'anonymous'}]`;
  if (typeof value === 'symbol') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof RegExp) return value.toString();
  if (Buffer.isBuffer(value)) {
    return {
      type: 'Buffer',
      byteLength: value.length,
      utf8: value.toString('utf8'),
    };
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const out: unknown[] = [];
    seen.set(value, out);
    value.forEach((item, index) => {
      out[index] = normalizeForJson(item, seen);
    });
    return out;
  }
  if (value && typeof value === 'object') {
    if (seen.has(value as object)) return seen.get(value as object);
    const out: Record<string, unknown> = {};
    seen.set(value as object, out);
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      out[key] = normalizeForJson(entryValue, seen);
    }
    return out;
  }
  return value;
};

export const serializeForLog = (value: unknown): unknown => {
  try {
    return jsonCycle.decycle(normalizeForJson(value));
  } catch (err) {
    return {
      serializationError: (err as Error).message,
      valueType: Array.isArray(value) ? 'array' : typeof value,
    };
  }
};

export const isDebugLoggingEnabled = (): boolean =>
  process.env.ROSETTA_DEBUG === '1';

export const collectEnvironment = (names: readonly string[]): Record<string, string | null> =>
  Object.fromEntries(names.map((name) => [name, process.env[name] ?? null]));

const ensureDir = (): void => {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // ignore — dir already exists or unwritable
  }
};

const rotateIfNeeded = (): void => {
  try {
    if (statSync(LOG_PATH).size >= LOG_MAX_BYTES) {
      renameSync(LOG_PATH, `${LOG_PATH.replace(/\.log$/, '')}.1.log`);
    }
  } catch {
    // file doesn't exist yet — no rotation needed
  }
};

export const debugLog = (message: string, context?: unknown): void => {
  if (!isDebugLoggingEnabled()) return;
  ensureDir();
  rotateIfNeeded();
  const serializedContext = serializeForLog(context ?? {});
  const contextFields =
    serializedContext && typeof serializedContext === 'object' && !Array.isArray(serializedContext)
      ? (serializedContext as Record<string, unknown>)
      : { context: serializedContext };
  let entry: string;
  try {
    entry =
      JSON.stringify({
      ts: new Date().toISOString(),
      msg: message,
      pid: process.pid,
      ppid: process.ppid,
        ...contextFields,
      }) + '\n';
  } catch (err) {
    entry =
      JSON.stringify({
        ts: new Date().toISOString(),
        msg: message,
        pid: process.pid,
        ppid: process.ppid,
        serializationError: (err as Error).message,
      }) + '\n';
  }
  try {
    appendFileSync(LOG_PATH, entry);
  } catch {
    // silent — never let logging break the hook
  }
};

export const debugLogHook = (
  hookName: string,
  phase: string,
  context?: unknown,
): void => {
  debugLog(`hook:${hookName}:${phase}`, context);
};

export const debugLogHookBranch = (
  hookName: string,
  branch: string,
  context?: unknown,
): void => {
  debugLog(`hook:${hookName}:branch:${branch}`, context);
};

export const debugLogBranch = (
  component: string,
  branch: string,
  context?: unknown,
): void => {
  debugLog(`${component}:${branch}`, context);
};
