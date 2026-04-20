'use strict';
// adapters/claude-code.js — Adapter for Claude Code IDE
// Canonical format: this is the reference format all other adapters normalize to.
// Detection: hook_event_name + tool_input + session_id present, no Codex/Cursor extras.

const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'];

module.exports = {
  name: 'claude-code',

  detect(raw) {
    return CC_SIGNATURE.every((f) => f in raw);
  },

  normalize(raw) {
    // Claude Code is already canonical — identity pass-through
    return raw;
  },

  formatOutput(canonical) {
    // Claude Code output is already canonical — identity pass-through
    return canonical;
  },
};
