import fs from 'fs';
import os from 'os';
import path from 'path';
import { debugLogBranch } from './debug-log';
import {
  ensureDirectory,
  hashedFilePath,
  releaseLockFile,
  tryAcquireTimedLock,
} from './file-coordination';

const STATE_ROOT = path.join(os.homedir(), '.rosetta', 'state');
const LOCK_TTL_MS = 30_000;
const LOCK_RETRY_MS = 25;
const LOCK_RETRY_LIMIT = 20;

const ensureStateRoot = (): void => {
  ensureDirectory(STATE_ROOT);
};

const statePathFor = (namespace: string): string =>
  hashedFilePath(STATE_ROOT, `state:${namespace}`, '.json');

const lockPathFor = (namespace: string): string =>
  hashedFilePath(STATE_ROOT, `state-lock:${namespace}`, '.lock');

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const readNamespacedState = <T>(namespace: string, fallback: T): T => {
  ensureStateRoot();
  const file = statePathFor(namespace);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
    debugLogBranch('state-store', 'read', {
      namespace,
      file,
      stateRoot: STATE_ROOT,
      hit: true,
    });
    return parsed;
  } catch {
    debugLogBranch('state-store', 'read', {
      namespace,
      file,
      stateRoot: STATE_ROOT,
      hit: false,
    });
    return fallback;
  }
};

export const writeNamespacedState = <T>(namespace: string, value: T): void => {
  ensureStateRoot();
  const file = statePathFor(namespace);
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2));
  fs.renameSync(temp, file);
  debugLogBranch('state-store', 'write', {
    namespace,
    file,
    temp,
    stateRoot: STATE_ROOT,
    value,
  });
};

export const mutateNamespacedState = async <T>(
  namespace: string,
  fallback: T,
  mutate: (current: T) => T,
): Promise<T> => {
  ensureStateRoot();
  const lockPath = lockPathFor(namespace);
  debugLogBranch('state-store', 'mutate-begin', {
    namespace,
    stateRoot: STATE_ROOT,
    lockPath,
    lockTtlMs: LOCK_TTL_MS,
    lockRetryMs: LOCK_RETRY_MS,
    lockRetryLimit: LOCK_RETRY_LIMIT,
  });
  let acquired = false;
  for (let i = 0; i < LOCK_RETRY_LIMIT; i++) {
    if (tryAcquireTimedLock(lockPath, { staleAfterMs: LOCK_TTL_MS })) {
      acquired = true;
      debugLogBranch('state-store', 'lock-acquired', { namespace, lockPath, attempt: i + 1 });
      break;
    }
    debugLogBranch('state-store', 'lock-retry', { namespace, lockPath, attempt: i + 1 });
    await sleep(LOCK_RETRY_MS);
  }

  if (!acquired) {
    debugLogBranch('state-store', 'lock-timeout', { namespace });
    throw new Error(`state_lock_timeout:${namespace}`);
  }

  try {
    const current = readNamespacedState(namespace, fallback);
    const next = mutate(current);
    debugLogBranch('state-store', 'mutate-apply', {
      namespace,
      lockPath,
      current,
      next,
    });
    writeNamespacedState(namespace, next);
    return next;
  } finally {
    releaseLockFile(lockPath);
    debugLogBranch('state-store', 'mutate-end', { namespace, lockPath });
  }
};
