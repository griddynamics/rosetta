import os from 'os';
import { debugLogBranch } from './debug-log';
import { hashedFilePath, readTimestampFile, tryAcquireTimedLock, writeTimestampFile } from './file-coordination';

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

export const makeDebounceStamp = (
  repoKey: string,
  dir = DEFAULT_DIR,
  now = Date.now(),
): string => {
  const stampFile = hashedFilePath(dir, `debounce:${repoKey}`, '.pending', 24);
  debugLogBranch('throttle', 'make-debounce-stamp-start', {
    repoKey,
    dir,
    defaultDir: DEFAULT_DIR,
    stampFile,
    now,
  });
  writeTimestampFile(stampFile, now);
  debugLogBranch('throttle', 'make-debounce-stamp', {
    repoKey,
    dir,
    stampFile,
    now,
  });
  return stampFile;
};

export const isStampFresh = (stampFile: string, debounceMs: number): boolean => {
  const createdAt = readTimestampFile(stampFile);
  const fresh = createdAt != null ? Date.now() - createdAt < debounceMs : false;
  debugLogBranch('throttle', 'is-stamp-fresh', {
    stampFile,
    debounceMs,
    createdAt,
    reason: createdAt == null ? 'stamp-missing' : (fresh ? 'within-window' : 'expired'),
    fresh,
  });
  return fresh;
};
