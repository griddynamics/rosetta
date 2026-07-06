import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Codex rollout-transcript fallback locator (§10.2). Codex has no `--session-id`
 * flag, so when the SessionStart ctrl file never appears — a FIRST-CLASS path,
 * because Codex's strict hook-output validation can silently disable the hook — we
 * recover the transcript by scanning `<CODEX_HOME>/sessions/YYYY/MM/DD/rollout-*.jsonl`
 * (the adapter isolates `CODEX_HOME` per trial, so this is the throwaway home; for a
 * default home it is `~/.codex`).
 *
 * A candidate matches ONLY when its `session_meta.cwd` equals the trial workspace
 * AND its mtime is at/after the trial start. The workspace is a fresh per-trial
 * mkdtemp path, so the cwd match is effectively unique and concurrency-safe; the
 * mtime filter guards against a stale rollout from a previous trial that happened to
 * reuse a path. We NEVER select "newest alone" — a rollout with no cwd match is
 * never returned, even if it is the most recent file on disk.
 */

/** Small mtime skew tolerance (ms): the rollout file is created microseconds before
 *  `startedAt` is stamped in some races; a generous floor avoids false negatives
 *  without ever admitting a genuinely older, unrelated session. */
const MTIME_SKEW_MS = 5_000;

/** `<codexHome>/sessions` — the rollout tree for the given Codex home. */
function sessionsRoot(codexHome: string): string {
  return join(codexHome, 'sessions');
}

/** Does `metaCwd` (from session_meta) refer to `workspace`? Compare raw + realpath
 *  both ways because macOS temp dirs resolve through `/private`. */
function cwdMatches(metaCwd: string, workspace: string): boolean {
  if (metaCwd === workspace) return true;
  let wsReal: string | null = null;
  try {
    wsReal = realpathSync(workspace);
  } catch {
    wsReal = null;
  }
  if (wsReal && metaCwd === wsReal) return true;
  try {
    if (realpathSync(metaCwd) === (wsReal ?? workspace)) return true;
  } catch {
    // metaCwd no longer exists on disk — fall through.
  }
  return false;
}

/** Read the first non-empty JSONL line of a rollout and return its `session_meta.cwd`
 *  (rollouts always lead with the `session_meta` record). Null on any read/parse
 *  problem or if the first record is not a session_meta. */
function readRolloutCwd(file: string): string | null {
  let content: string;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    try {
      const obj = JSON.parse(trimmed) as { type?: string; payload?: { cwd?: string } };
      if (obj.type === 'session_meta' && typeof obj.payload?.cwd === 'string') {
        return obj.payload.cwd;
      }
    } catch {
      return null;
    }
    return null; // first record was not a session_meta → not a rollout we understand
  }
  return null;
}

/** Recursively collect `rollout-*.jsonl` files under the sessions root. */
function collectRollouts(root: string): string[] {
  const out: string[] = [];
  if (!existsSync(root)) return out;
  const walk = (dir: string): void => {
    let entries: import('node:fs').Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.startsWith('rollout-') && e.name.endsWith('.jsonl')) out.push(full);
    }
  };
  walk(root);
  return out;
}

export interface FallbackMatch {
  path: string;
  mtimeMs: number;
}

/**
 * Locate the rollout for a trial by cwd + mtime. Returns the newest AMONG the
 * cwd-matching, mtime-passing candidates (there is normally exactly one), or null
 * when nothing matches — never a newest-alone guess.
 */
export function findFallbackRollout(
  codexHome: string,
  workspace: string,
  startedAtMs: number,
): FallbackMatch | null {
  const floor = startedAtMs - MTIME_SKEW_MS;
  const candidates = collectRollouts(sessionsRoot(codexHome));
  let best: FallbackMatch | null = null;
  for (const file of candidates) {
    let mtimeMs: number;
    try {
      mtimeMs = statSync(file).mtimeMs;
    } catch {
      continue;
    }
    if (mtimeMs < floor) continue; // mtime filter — never a stale, older session
    const cwd = readRolloutCwd(file);
    if (cwd === null || !cwdMatches(cwd, workspace)) continue; // cwd match REQUIRED
    if (!best || mtimeMs > best.mtimeMs) best = { path: file, mtimeMs };
  }
  return best;
}
