// PARITY-1 — JSON string escaping for additionalContext payload

/**
 * Escape a string for embedding as a JSON string value.
 * This is the innermost escaping layer: used to build the `additionalContext` value
 * inside the {"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"<HERE>"}} object.
 *
 * Standard JSON string escaping:
 *   \ → \\
 *   " → \"
 *   newline → \n
 *   carriage return → \r
 *   tab → \t
 *   other control characters → \uXXXX
 */
export function jsonStringEscape(s: string): string {
  let result = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const code = s.charCodeAt(i);
    if (ch === '\\') {
      result += '\\\\';
    } else if (ch === '"') {
      result += '\\"';
    } else if (ch === '\n') {
      result += '\\n';
    } else if (ch === '\r') {
      result += '\\r';
    } else if (ch === '\t') {
      result += '\\t';
    } else if (code < 0x20) {
      result += `\\u${code.toString(16).padStart(4, '0')}`;
    } else {
      result += ch;
    }
  }
  return result;
}

/**
 * Build the compact JSON payload object for a hook entry.
 * Format: {"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"<body>"}}
 * Uses compact JSON (no spaces beyond the escaped content).
 */
export function buildHookPayloadJson(additionalContext: string): string {
  const escaped = jsonStringEscape(additionalContext);
  return `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"${escaped}"}}`;
}

/**
 * Build the compact JSON payload object for a cursor hook entry.
 * Cursor uses {"additional_context":"<body>"} — NOT {"hookSpecificOutput":...}.
 * GT-3 cursor entry shape.
 */
export function buildCursorHookPayloadJson(body: string): string {
  const escaped = jsonStringEscape(body);
  return `{"additional_context":"${escaped}"}`;
}

/**
 * Build the compact JSON payload object for a Copilot hook entry.
 * Copilot needs the SAME additionalContext at BOTH top-level (honored by Copilot CLI) AND
 * nested in hookSpecificOutput (honored by VS Code) — see docs/hooks/copilot.md, Bug 2.
 */
export function buildCopilotHookPayloadJson(additionalContext: string): string {
  const escaped = jsonStringEscape(additionalContext);
  return `{"additionalContext":"${escaped}","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"${escaped}"}}`;
}
