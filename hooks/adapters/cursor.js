'use strict';
// adapters/cursor.js — Adapter for Cursor IDE
// Docs: https://cursor.com/docs/reference/hooks
//
// Cursor is very close to Claude Code — shares hook_event_name, tool_name, tool_input,
// tool_use_id, cwd — but replaces session_id with conversation_id and adds cursor-specific
// extras: generation_id, cursor_version, workspace_roots, user_email, transcript_path, duration.
//
// hook_event_name casing: Cursor uses camelCase ("postToolUse") vs CC PascalCase ("PostToolUse").
// normalize() uppercases the first letter to produce the canonical PascalCase form.

const CC_SIGNATURE = ['hook_event_name', 'tool_input'];
const CURSOR_EXTRA = ['conversation_id', 'cursor_version'];

module.exports = {
  name: 'cursor',

  detect(raw) {
    return (
      CC_SIGNATURE.every((f) => f in raw) &&
      CURSOR_EXTRA.every((f) => f in raw)
    );
  },

  normalize(raw) {
    // Normalize camelCase hook_event_name → PascalCase
    const hook_event_name = raw.hook_event_name
      ? raw.hook_event_name.charAt(0).toUpperCase() + raw.hook_event_name.slice(1)
      : raw.hook_event_name;

    return {
      ...raw,
      hook_event_name,
      // Map conversation_id → session_id (canonical field name)
      session_id: raw.conversation_id,
    };
  },

  formatOutput(canonical) {
    // Cursor postToolUse output: { additional_context, updated_mcp_tool_output }
    // Cursor preToolUse output: { permission, user_message, agent_message, updated_input }
    const out = {};
    const hs = canonical.hookSpecificOutput || {};

    if (hs.additionalContext) {
      out.additional_context = hs.additionalContext;
    }
    if (hs.permissionDecision) {
      out.permission = hs.permissionDecision;
    }
    if (hs.permissionDecisionReason) {
      out.user_message = hs.permissionDecisionReason;
    }
    if (canonical.continue === false) {
      out.permission = out.permission || 'deny';
    }

    return out;
  },
};
