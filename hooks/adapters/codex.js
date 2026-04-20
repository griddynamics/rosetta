'use strict';
// adapters/codex.js — Adapter for Codex (OpenAI) IDE
// Codex shares the Claude Code signature but adds model + turn_id at top level.
// Detection: must check Codex extras BEFORE claude-code (it's a superset).

const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'];
const CODEX_EXTRA = ['model', 'turn_id'];

module.exports = {
  name: 'codex',

  detect(raw) {
    return (
      CC_SIGNATURE.every((f) => f in raw) &&
      CODEX_EXTRA.every((f) => f in raw)
    );
  },

  normalize(raw) {
    // Codex is already in canonical format; extras (model, turn_id) are preserved as-is
    return raw;
  },

  formatOutput(canonical) {
    // Codex output is identity pass-through (same schema as Claude Code)
    return canonical;
  },
};
