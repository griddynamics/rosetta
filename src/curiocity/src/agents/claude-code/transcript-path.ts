import { realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Computed-fallback transcript path for the `claude-code` adapter (§10.1).
 *
 * Claude persists a session transcript at
 *   `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`
 * where `<encoded-cwd>` is the session's REALPATH-resolved cwd with every `/`
 * replaced by `-`. macOS temp dirs resolve through `/private` (e.g. `/var/folders/…`
 * → `/private/var/folders/…`), so the realpath step is load-bearing — a raw
 * (unresolved) cwd would encode to the wrong directory and the fallback would miss.
 *
 * This is the fallback ONLY: the `SessionStart` payload's `transcript_path` is
 * authoritative (see `ClaudeCodeAdapter.locateTranscript`). It exists so a trial can
 * still find its transcript if the ctrl file never appeared.
 */

/** Encode a cwd the way Claude names its `projects/<dir>` folder: realpath, `/`→`-`. */
export function encodeCwd(cwd: string): string {
  let resolved = cwd;
  try {
    resolved = realpathSync(cwd);
  } catch {
    // Path may not exist yet (or is inaccessible) — fall back to the raw path so the
    // encoding is still deterministic; the `/private` case only matters once the dir
    // exists, at which point realpath succeeds.
  }
  return resolved.replace(/\//g, '-');
}

/** Compute `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl` (§10.1 fallback). */
export function computeTranscriptPath(home: string, cwd: string, sessionId: string): string {
  return join(home, '.claude', 'projects', encodeCwd(cwd), `${sessionId}.jsonl`);
}

/** Convenience overload using the current user's home. */
export function computeTranscriptPathForCwd(cwd: string, sessionId: string): string {
  return computeTranscriptPath(homedir(), cwd, sessionId);
}
