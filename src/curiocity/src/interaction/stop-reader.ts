/**
 * Defensive `stop.jsonl` line reader (R1, orchestrator ruling — multi-turn
 * `stop.jsonl` integrity). `stop.jsonl` is the core-owned canonical Stop-signal
 * channel (§5.2 `CanonicalHookSpec.stop.appendTo`): every adapter's `Stop` hook
 * appends one JSON object per turn via a shell `>>` redirect. Two defensive
 * properties are required of the reader regardless of how well-behaved the
 * renderer is:
 *
 *  1. Tolerate blank lines (a stray `\n\n` from a hook payload that itself ends in
 *     a blank line must not be treated as a signal).
 *  2. Tolerate multiple JSON objects landing on ONE physical line. This is exactly
 *     the failure mode the ruling flagged: if a `Stop` hook's stdin ever lacked a
 *     trailing newline, consecutive `cat >>` appends would concatenate onto a
 *     single line with no separator (`{...turn1...}{...turn2...}`), and a naive
 *     "split on \n, one JSON.parse per line" reader would fail to parse the
 *     merged blob and silently drop BOTH turns' signals. `renderHooks` now
 *     defensively guarantees a trailing newline per append (see
 *     `agents/claude-code/adapter.ts`), so this should never fire in practice —
 *     the reader stays tolerant anyway, per the ruling ("fix defensively
 *     regardless").
 *
 * The splitter is intentionally cheap: it tracks JSON string state (so braces
 * inside string literals are never mistaken for structure) and a single combined
 * `{`/`[` depth counter, and cuts the line at each point that depth returns to
 * zero. It is NOT a general JSON parser or validator — each returned substring is
 * still independently `JSON.parse`d by the caller (`adapter.parseStopSignal`), so
 * a malformed fragment simply yields no signal, exactly as an invalid whole line
 * already does today.
 */

/** Split one line into the top-level JSON object/array substrings it contains. */
export function splitConcatenatedJsonObjects(line: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = -1;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{' || ch === '[') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}' || ch === ']') {
      depth = Math.max(0, depth - 1);
      if (depth === 0 && start !== -1) {
        parts.push(line.slice(start, i + 1));
        start = -1;
      }
    }
  }

  // No balanced top-level structure found at all (e.g. garbage) — hand the whole
  // line back unsplit so the caller's JSON.parse still runs (and fails) on it,
  // matching today's "malformed line → no signal" behavior.
  return parts.length > 0 ? parts : [line];
}

/**
 * Extract every JSON-object-shaped chunk from raw `stop.jsonl` content: split on
 * newlines, drop blank lines, then defensively re-split any line that turns out to
 * contain more than one concatenated JSON object (see module doc).
 */
export function extractJsonObjectStrings(content: string): string[] {
  const out: string[] = [];
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (line === '') continue;
    out.push(...splitConcatenatedJsonObjects(line));
  }
  return out;
}
