"use strict";
// adapters/cursor.ts — Adapter for Cursor IDE
// Docs: https://cursor.com/docs/reference/hooks
//
// Cursor is very close to Claude Code — shares hook_event_name, tool_name, tool_input,
// tool_use_id, cwd — but replaces session_id with conversation_id and adds cursor-specific
// extras: generation_id, cursor_version, workspace_roots, user_email, transcript_path, duration.
//
// hook_event_name casing: Cursor uses camelCase ("postToolUse") vs CC PascalCase ("PostToolUse").
// normalize() derives the semantic event via registry (which handles the casing difference).
Object.defineProperty(exports, "__esModule", { value: true });
exports.cursor = void 0;
const cursor_1 = require("../runtime/ide-rows/cursor");
const IDE = 'cursor';
const CC_SIGNATURE = ['hook_event_name', 'tool_input'];
const CURSOR_EXTRA = ['conversation_id', 'cursor_version'];
const toPascalCase = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const detect = (raw) => CC_SIGNATURE.every((f) => f in raw) && CURSOR_EXTRA.every((f) => f in raw);
const normalize = (raw) => {
    const { hook_event_name, conversation_id, ...rest } = raw;
    const rawEventName = hook_event_name;
    return {
        ...rest,
        ide: IDE,
        event: (0, cursor_1.lookupEvent)(rawEventName),
        toolKind: (0, cursor_1.lookupToolKind)(raw.tool_name),
        hook_event_name: toPascalCase(rawEventName),
        session_id: conversation_id,
        conversation_id,
        file_path: (0, cursor_1.getFilePath)(raw) ?? '',
        cwd: (0, cursor_1.getCwd)(raw) ?? undefined,
    };
};
const formatOutput = (canonical) => {
    const { hookSpecificOutput = {}, continue: cont } = canonical ?? {};
    const { additionalContext, permissionDecision, permissionDecisionReason } = hookSpecificOutput;
    const out = {};
    if (additionalContext)
        out.additional_context = additionalContext;
    if (permissionDecision)
        out.permission = permissionDecision;
    if (permissionDecisionReason)
        out.user_message = permissionDecisionReason;
    if (cont === false)
        out.permission = out.permission ?? 'deny';
    return out;
};
exports.cursor = { name: 'cursor', detect, normalize, formatOutput };
