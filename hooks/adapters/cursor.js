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

const toPascalCase = (name) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1) : name;

module.exports = {
  name: 'cursor',

  detect: (raw) =>
    CC_SIGNATURE.every((f) => f in raw) && CURSOR_EXTRA.every((f) => f in raw),

  normalize: ({ hook_event_name, conversation_id, ...rest }) => ({
    ...rest,
    hook_event_name: toPascalCase(hook_event_name),
    session_id: conversation_id, // canonical field name
    conversation_id,             // preserved for downstream consumers
  }),

  formatOutput: ({ hookSpecificOutput = {}, continue: cont } = {}) => {
    const { additionalContext, permissionDecision, permissionDecisionReason } = hookSpecificOutput;
    const out = {};
    if (additionalContext) out.additional_context = additionalContext;
    if (permissionDecision) out.permission = permissionDecision;
    if (permissionDecisionReason) out.user_message = permissionDecisionReason;
    if (cont === false) out.permission = out.permission || 'deny';
    return out;
  },
};
