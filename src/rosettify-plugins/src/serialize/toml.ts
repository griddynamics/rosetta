// NFR-0001/0005, GT-6, PARITY-3 — byte-exact codex TOML emitter
// Field order: name, description, developer_instructions("""), model, model_reasoning_effort, sandbox_mode

/**
 * Escape a TOML basic string value (for single-line fields).
 * Handles backslash, double-quote, and control characters.
 */
function tomlStringEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Emit codex agent TOML with exact field order per GT-6.
 * name, description, developer_instructions (""" multiline), model?, model_reasoning_effort?, sandbox_mode
 */
export interface CodexTomlFields {
  name: string;
  description: string;
  developerInstructions: string; // the body text (may contain """)
  model?: string;
  modelReasoningEffort?: string;
  sandboxMode: string; // "workspace-write" | "read-only"
}

export function emitCodexToml(fields: CodexTomlFields): string {
  const lines: string[] = [];

  lines.push(`name = "${tomlStringEscape(fields.name)}"`);
  lines.push(`description = "${tomlStringEscape(fields.description)}"`);

  // Multi-line literal block with """. Body starts on next line after opening """.
  // GT-6: opening """ followed by newline, body, newline, closing """
  // Note: if body contains """, we need to escape it — TOML multiline basic strings
  // can escape """ as """ with a backslash continuation, but baseline uses raw body.
  // Decode: the body goes verbatim between the delimiters.
  lines.push(`developer_instructions = """`);
  lines.push(fields.developerInstructions);
  lines.push(`"""`);

  if (fields.model !== undefined) {
    lines.push(`model = "${tomlStringEscape(fields.model)}"`);
  }
  if (fields.modelReasoningEffort !== undefined) {
    lines.push(`model_reasoning_effort = "${tomlStringEscape(fields.modelReasoningEffort)}"`);
  }

  lines.push(`sandbox_mode = "${tomlStringEscape(fields.sandboxMode)}"`);

  return lines.join('\n') + '\n';
}
