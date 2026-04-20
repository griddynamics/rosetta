'use strict';
// adapters/codex.js — Adapter for Codex (OpenAI) IDE
// Codex shares the Claude Code signature but adds model + turn_id at top level.
// Detection: must check Codex extras BEFORE claude-code (it's a superset).

const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'];
const CODEX_EXTRA = ['model', 'turn_id'];

module.exports = {
  name: 'codex',
  detect: (raw) =>
    CC_SIGNATURE.every((f) => f in raw) && CODEX_EXTRA.every((f) => f in raw),
  normalize: (raw) => raw,               // already canonical; extras preserved
  formatOutput: (canonical) => canonical, // identity pass-through
};
