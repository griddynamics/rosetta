// PARITY-4 — bash single-quote escaping for printf wrappers

/**
 * Escape a string for bash single-quote context.
 * Inside single quotes, ' itself must be escaped as '\''
 * (end quote, escaped quote, reopen quote).
 * PARITY-1/4
 */
export function bashSingleQuoteEscape(s: string): string {
  return s.replace(/'/g, "'\\''");
}

/**
 * Wrap a JSON payload string in a bash printf '%s' '<json>' command.
 * Used for claude, codex, cursor, and copilot's bash entry.
 * The JSON string is single-quote-escaped.
 */
export function wrapInPrintf(jsonPayload: string): string {
  return `printf '%s' '${bashSingleQuoteEscape(jsonPayload)}'`;
}

