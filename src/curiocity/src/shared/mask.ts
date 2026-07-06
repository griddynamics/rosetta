/**
 * Secret masking (§4/§12). Keys are held in memory and shipped over IPC only; they
 * must never appear in logs, reports, or error messages. Use `maskSecret` when a
 * value that MIGHT be sensitive has to be surfaced (e.g. a diagnostic), and
 * `maskSecretsIn` to scrub a record of key→value pairs for logging.
 *
 * These never reveal more than a short suffix and never the middle of the value.
 */

/** Mask a single secret: keep at most the last 4 chars, replace the rest with `*`. */
export function maskSecret(value: string): string {
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}

/** Return a copy of a record with every value masked (safe to log the keys). */
export function maskSecretsIn(record: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) out[k] = maskSecret(v);
  return out;
}
