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
const CURSOR_SIGNATURE = ['hook_event_name', 'cursor_version'];
const toPascalCase = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const detect = (raw) => CURSOR_SIGNATURE.every((f) => f in raw);
const normalize = (raw) => {
    const { hook_event_name, conversation_id, ...rest } = raw;
    const rawEventName = hook_event_name;
    const baseEvent = (0, cursor_1.lookupEvent)(rawEventName);
    const toolKind = (0, cursor_1.lookupToolKind)(raw.tool_name ?? '');
    return {
        ...rest,
        ide: IDE,
        event: baseEvent,
        toolKind,
        hook_event_name: baseEvent === 'PreRead' ? 'PreRead' : toPascalCase(rawEventName),
        session_id: (conversation_id ?? raw.session_id),
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
// No exitCode() override: Cursor's exit-0 + permission:"deny" JSON deny is confirmed working and
// field-selective (docs/hooks/cursor.md Run 1+3). Pairing exit-2 with the JSON body was tested
// (Run 4) and Cursor does NOT parse it — it dumps the raw text verbatim, a worse delivery than the
// exit-0 path, for no functional gain. Default exitCode (0) is correct; do not add a deny->2 override.
exports.cursor = { name: 'cursor', detect, normalize, formatOutput };
