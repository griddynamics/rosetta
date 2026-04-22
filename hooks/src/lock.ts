import { writeFileSync, statSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import os from 'os';
import type { NormalizedInput } from './types';

const LOCK_TTL_MS = 5_000;

export const acquireOnce = (input: NormalizedInput): boolean => {
  const fingerprint = createHash('sha256')
    .update(`${input.session_id ?? 'no-session'}:${input.hook_event_name}:${input.tool_name ?? ''}:${JSON.stringify(input.tool_input ?? {})}`)
    .digest('hex')
    .slice(0, 16);

  const lockPath = path.join(os.tmpdir(), `rosetta-hooks-${fingerprint}.lock`);

  try {
    writeFileSync(lockPath, String(Date.now()), { flag: 'wx' });
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    const age = Date.now() - statSync(lockPath).mtimeMs;
    if (age >= LOCK_TTL_MS) {
      writeFileSync(lockPath, String(Date.now()));
      return true; // stale lock — takeover
    }
    return false; // duplicate within TTL window
  }
};
