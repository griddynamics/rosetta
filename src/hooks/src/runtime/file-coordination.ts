import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { debugLogBranch } from './debug-log';

export interface TimedLockOptions {
  staleAfterMs: number;
}

export const ensureDirectory = (dir: string): void => {
  fs.mkdirSync(dir, { recursive: true });
  debugLogBranch('file-coordination', 'ensure-directory', { dir });
};

export const hashKey = (key: string, size = 24): string => {
  const hash = createHash('sha256').update(key).digest('hex').slice(0, size);
  debugLogBranch('file-coordination', 'hash-key', {
    key,
    size,
    hash,
  });
  return hash;
};

export const hashedFilePath = (
  dir: string,
  key: string,
  ext: string,
  size = 24,
): string => {
  const hashedPath = path.join(dir, `${hashKey(key, size)}${ext}`);
  debugLogBranch('file-coordination', 'hashed-file-path', {
    dir,
    key,
    ext,
    size,
    hashedPath,
  });
  return hashedPath;
};

export const readTimestampFile = (filePath: string): number | null => {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    const value = parseInt(raw, 10);
    const parsed = Number.isFinite(value) ? value : null;
    debugLogBranch('file-coordination', 'read-timestamp', {
      filePath,
      raw,
      parsed,
      valid: parsed !== null,
    });
    return parsed;
  } catch {
    debugLogBranch('file-coordination', 'read-timestamp-miss', { filePath });
    return null;
  }
};

export const writeTimestampFile = (filePath: string, now = Date.now()): void => {
  fs.writeFileSync(filePath, String(now));
  debugLogBranch('file-coordination', 'write-timestamp', { filePath, now });
};

export const tryAcquireTimedLock = (
  lockPath: string,
  opts: TimedLockOptions,
  now = Date.now(),
): boolean => {
  debugLogBranch('file-coordination', 'lock-acquire-start', {
    lockPath,
    staleAfterMs: opts.staleAfterMs,
    now,
  });
  const create = (): boolean => {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.writeSync(fd, String(now));
      fs.closeSync(fd);
      debugLogBranch('file-coordination', 'lock-created', {
        lockPath,
        staleAfterMs: opts.staleAfterMs,
        now,
      });
      return true;
    } catch {
      debugLogBranch('file-coordination', 'lock-create-collision', {
        lockPath,
        staleAfterMs: opts.staleAfterMs,
        now,
      });
      return false;
    }
  };

  if (create()) {
    debugLogBranch('file-coordination', 'lock-acquire-result', {
      lockPath,
      acquired: true,
      reason: 'created',
    });
    return true;
  }

  const createdAt = readTimestampFile(lockPath);
  debugLogBranch('file-coordination', 'lock-existing-state', {
    lockPath,
    createdAt,
    now,
    ageMs: createdAt == null ? null : now - createdAt,
    staleAfterMs: opts.staleAfterMs,
  });
  if (createdAt != null && now - createdAt > opts.staleAfterMs) {
    try {
      fs.unlinkSync(lockPath);
      debugLogBranch('file-coordination', 'lock-stale-removed', {
        lockPath,
        createdAt,
        now,
        staleAfterMs: opts.staleAfterMs,
      });
    } catch {
      debugLogBranch('file-coordination', 'lock-stale-remove-failed', {
        lockPath,
        createdAt,
        now,
        staleAfterMs: opts.staleAfterMs,
      });
      debugLogBranch('file-coordination', 'lock-acquire-result', {
        lockPath,
        acquired: false,
        reason: 'stale-remove-failed',
      });
      return false;
    }
    const reacquired = create();
    debugLogBranch('file-coordination', 'lock-acquire-result', {
      lockPath,
      acquired: reacquired,
      reason: 'stale-retry',
    });
    return reacquired;
  }

  debugLogBranch('file-coordination', 'lock-busy', {
    lockPath,
    createdAt,
    now,
    staleAfterMs: opts.staleAfterMs,
  });
  debugLogBranch('file-coordination', 'lock-acquire-result', {
    lockPath,
    acquired: false,
    reason: 'busy',
  });
  return false;
};

export const releaseLockFile = (lockPath: string): void => {
  debugLogBranch('file-coordination', 'lock-release-start', { lockPath });
  try {
    fs.unlinkSync(lockPath);
    debugLogBranch('file-coordination', 'lock-released', { lockPath });
  } catch {
    debugLogBranch('file-coordination', 'lock-release-miss', { lockPath });
  }
};
