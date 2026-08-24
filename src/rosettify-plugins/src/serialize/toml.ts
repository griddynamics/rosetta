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
 * Escape a body for embedding in a TOML multi-line BASIC string (`"""`).
 *
 * `"""` is the multi-line *basic* form, so the parser processes escape sequences inside it — a raw
 * body is NOT passed through verbatim. Two things break an unescaped body (NFR-0001: "any generated
 * subagent TOML, when parsed, parsing succeeds"):
 *   - a backslash that does not open a valid escape sequence is a hard parse error (`regex \d+`),
 *     and one that does (`literal \n`) is silently rewritten into a different value;
 *   - a run of three or more quotation marks terminates the string early.
 *
 * Escaping applied, in one pass:
 *   - `\` → `\\` (every backslash, so no accidental escape sequence survives)
 *   - a run of >= 3 quotation marks → every third one escaped (`"""` → `""\"`), the idiom TOML
 *     1.0.0 itself uses. Runs of 1-2 are legal unescaped and are left alone, which keeps already
 *     committed output byte-identical.
 *   - CR/BS/FF and the remaining C0 controls + DEL → `\r`/`\b`/`\f`/`\uXXXX`. Only tab and line
 *     feed may appear literally inside a multi-line basic string.
 *
 * Embedding contract: the caller must place the body between a newline and a newline —
 * `"""\n<escaped body>\n"""`, exactly emitCodexToml's layout. That newline before the closing
 * delimiter is why a trailing quote run in the body never abuts the delimiter, so the "1-3 quotes
 * just inside the closing delimiter" case cannot arise here and is not handled.
 */
export function tomlMultilineBodyEscape(body: string): string {
  let result = '';
  for (let i = 0; i < body.length; ) {
    const ch = body[i] as string;
    if (ch === '\\') {
      result += '\\\\';
      i += 1;
      continue;
    }
    if (ch === '"') {
      let run = 0;
      while (i + run < body.length && body[i + run] === '"') run += 1;
      if (run < 3) {
        result += '"'.repeat(run);
      } else {
        for (let n = 1; n <= run; n += 1) result += n % 3 === 0 ? '\\"' : '"';
      }
      i += run;
      continue;
    }
    const code = body.charCodeAt(i);
    if (ch === '\n' || ch === '\t') {
      result += ch;
    } else if (ch === '\r') {
      result += '\\r';
    } else if (code === 0x08) {
      result += '\\b';
    } else if (code === 0x0c) {
      result += '\\f';
    } else if (code < 0x20 || code === 0x7f) {
      result += '\\u' + code.toString(16).padStart(4, '0');
    } else {
      result += ch;
    }
    i += 1;
  }
  return result;
}

/**
 * Emit codex agent TOML with exact field order per GT-6.
 * name, description, developer_instructions (""" multiline), model?, model_reasoning_effort?, sandbox_mode
 */
export interface CodexTomlFields {
  name: string;
  description: string;
  developerInstructions: string; // the body text; any content, escaped on emit
  model?: string;
  modelReasoningEffort?: string;
  sandboxMode: string; // "workspace-write" | "read-only"
}

export function emitCodexToml(fields: CodexTomlFields): string {
  const lines: string[] = [];

  lines.push(`name = "${tomlStringEscape(fields.name)}"`);
  lines.push(`description = "${tomlStringEscape(fields.description)}"`);

  // Multi-line BASIC block with """ (`'''` is TOML's literal form; this is not it, so escape
  // sequences ARE processed inside the delimiters). Body starts on the next line after the
  // opening """. GT-6: opening """ followed by newline, body, newline, closing """.
  // The body is escaped for that context — see tomlMultilineBodyEscape.
  lines.push(`developer_instructions = """`);
  lines.push(tomlMultilineBodyEscape(fields.developerInstructions));
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
