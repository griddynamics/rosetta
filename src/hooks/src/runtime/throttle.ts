import os from 'os';
import { debugLogBranch } from './debug-log';
import { hashedFilePath, tryAcquireTimedLock } from './file-coordination';

const DEFAULT_DIR = os.tmpdir();
const LOCK_TTL_MS = 5_000;

export const acquireOnce = (key: string, dir = DEFAULT_DIR): boolean => {
  const lockPath = hashedFilePath(dir, `rosetta-hooks:${key}`, '.lock', 16);
  debugLogBranch('throttle', 'acquire-once-start', {
    key,
    dir,
    defaultDir: DEFAULT_DIR,
    lockPath,
    staleAfterMs: LOCK_TTL_MS,
  });
  const acquired = tryAcquireTimedLock(lockPath, { staleAfterMs: LOCK_TTL_MS });
  debugLogBranch('throttle', 'acquire-once', {
    key,
    dir,
    lockPath,
    staleAfterMs: LOCK_TTL_MS,
    acquired,
  });
  return acquired;
};
