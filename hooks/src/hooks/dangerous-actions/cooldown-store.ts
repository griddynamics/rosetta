import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const COOLDOWN_MS = 5_000;

interface DenyRecord { ts: number }
type DenyStore = Record<string, DenyRecord>;

function storePath(cwd: string): string {
  return path.join(cwd, '.claude', 'state', 'dangerous-actions-cooldown.json');
}

function loadStore(cwd: string): DenyStore {
  try {
    return JSON.parse(fs.readFileSync(storePath(cwd), 'utf8')) as DenyStore;
  } catch {
    return {};
  }
}

function saveStore(cwd: string, store: DenyStore, now: number): void {
  const p = storePath(cwd);
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const pruned = Object.fromEntries(
      Object.entries(store).filter(([, v]) => now - v.ts < COOLDOWN_MS * 4),
    );
    fs.writeFileSync(p, JSON.stringify(pruned));
  } catch {
    // Silently fail — if cwd is not writable, cooldown is skipped but execution proceeds.
  }
}

/**
 * Hash a tool call, stripping `reviewed` from all string values so that
 * "rm -rf /tmp" and "rm -rf /tmp # reviewed" produce the same hash.
 * This allows detecting the self-bypass pattern where the same dangerous
 * command is retried with the override added.
 */
export function hashCall(toolName: string, toolInput: Record<string, unknown>): string {
  const normalized = JSON.stringify(toolInput, (_, v) =>
    typeof v === 'string' && /\breviewed\b/i.test(v)
      ? v.replace(/\s*#\s*\breviewed\b\s*/gi, '').replace(/\breviewed\b/gi, '').trim()
      : v,
  );
  return crypto.createHash('sha1').update(`${toolName}:${normalized}`).digest('hex');
}

/** Record a deny event for the given hash at `now` (defaults to Date.now()). */
export function recordDeny(cwd: string, hash: string, now = Date.now()): void {
  const store = loadStore(cwd);
  store[hash] = { ts: now };
  saveStore(cwd, store, now);
}

/**
 * Returns true if the given hash was denied within the last COOLDOWN_MS (5 seconds).
 * `now` parameter can be overridden for testing.
 */
export function isWithinCooldown(cwd: string, hash: string, now = Date.now()): boolean {
  const store = loadStore(cwd);
  const rec = store[hash];
  return !!rec && now - rec.ts < COOLDOWN_MS;
}
