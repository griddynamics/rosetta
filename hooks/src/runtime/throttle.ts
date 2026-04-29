import { writeFileSync, statSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import os from 'os';

const DEFAULT_DIR = os.tmpdir();
const LOCK_TTL_MS = 5_000;

export const acquireOnce = (key: string, dir = DEFAULT_DIR): boolean => {
  const hash = createHash('sha256').update(key).digest('hex').slice(0, 16);
  const lockPath = path.join(dir, `rosetta-hooks-${hash}.lock`);
  try {
    writeFileSync(lockPath, String(Date.now()), { flag: 'wx' });
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    const age = Date.now() - statSync(lockPath).mtimeMs;
    if (age >= LOCK_TTL_MS) { writeFileSync(lockPath, String(Date.now())); return true; }
    return false;
  }
};

export const makeDebounceStamp = (repoKey: string, dir = DEFAULT_DIR): string => {
  const hash = Buffer.from(repoKey).toString('base64').replace(/[/+=]/g, '_');
  const stampFile = path.join(dir, `${hash}.pending`);
  writeFileSync(stampFile, String(Date.now()));
  return stampFile;
};

export const isStampFresh = (stampFile: string, debounceMs: number): boolean => {
  try {
    return Date.now() - parseInt(readFileSync(stampFile, 'utf-8')) < debounceMs;
  } catch { return false; }
};
