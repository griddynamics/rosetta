import { appendFileSync, renameSync, statSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';

const LOG_DIR = path.join(os.homedir(), '.rosetta');
const LOG_PATH = path.join(LOG_DIR, 'hooks-debug.log');
const LOG_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ENABLED = process.env.ROSETTA_DEBUG === '1';

const ensureDir = (): void => {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // ignore — dir already exists or unwritable
  }
};

const rotatIfNeeded = (): void => {
  try {
    if (statSync(LOG_PATH).size >= LOG_MAX_BYTES) {
      renameSync(LOG_PATH, `${LOG_PATH.replace(/\.log$/, '')}.1.log`);
    }
  } catch {
    // file doesn't exist yet — no rotation needed
  }
};

export const debugLog = (message: string, context?: Record<string, unknown>): void => {
  if (!ENABLED) return;
  ensureDir();
  rotatIfNeeded();
  const entry =
    JSON.stringify({ ts: new Date().toISOString(), msg: message, ...(context ?? {}) }) + '\n';
  try {
    appendFileSync(LOG_PATH, entry);
  } catch {
    // silent — never let logging break the hook
  }
};
