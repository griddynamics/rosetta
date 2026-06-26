"use strict";
// adapters/claude-code.ts — Adapter for Claude Code IDE
// Canonical format: this is the reference format all other adapters normalize to.
// Detection: hook_event_name + tool_input + session_id present, no Codex/Cursor extras.
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeCode = void 0;
const claude_code_1 = require("../runtime/ide-rows/claude-code");
const IDE = 'claude-code';
const CC_SIGNATURE = ['hook_event_name', 'session_id'];
const detect = (raw) => CC_SIGNATURE.every((f) => f in raw);
const normalize = (raw) => {
    const baseEvent = (0, claude_code_1.lookupEvent)(raw.hook_event_name);
    const toolKind = (0, claude_code_1.lookupToolKind)(raw.tool_name ?? '');
    const event = baseEvent === 'PreToolUse' && toolKind === 'read' ? 'PreRead' : baseEvent;
    return {
        ...raw,
        ide: IDE,
        event,
        toolKind,
        file_path: (0, claude_code_1.getFilePath)(raw) ?? '',
        cwd: (0, claude_code_1.getCwd)(raw) ?? undefined,
        session_id: (0, claude_code_1.getSessionId)(raw) ?? undefined,
    };
};
const formatOutput = (canonical) => (canonical ?? {}); // identity — already canonical
exports.claudeCode = { name: 'claude-code', detect, normalize, formatOutput };
