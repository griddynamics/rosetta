"use strict";
// adapters/codex.ts — Adapter for Codex (OpenAI) IDE
// Codex shares the Claude Code signature but adds model + turn_id at top level.
// Detection: must check Codex extras BEFORE claude-code (it's a superset).
Object.defineProperty(exports, "__esModule", { value: true });
exports.codex = void 0;
const codex_1 = require("../runtime/ide-rows/codex");
const IDE = 'codex';
const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'];
const CODEX_EXTRA = ['model'];
const detect = (raw) => CC_SIGNATURE.every((f) => f in raw) &&
    CODEX_EXTRA.every((f) => f in raw) &&
    !('cursor_version' in raw);
const READ_LIKE_MCP_RE = /(^|__)(read|read_file|get_file|open_file|cat_file)(_|$)/i;
const isReadLikeMcpTool = (raw, toolName) => toolName.startsWith('mcp__') &&
    READ_LIKE_MCP_RE.test(toolName) &&
    Boolean((0, codex_1.getFilePath)(raw));
const normalize = (raw) => {
    const baseEvent = (0, codex_1.lookupEvent)(raw.hook_event_name);
    const toolName = raw.tool_name ?? '';
    const readLikeMcp = isReadLikeMcpTool(raw, toolName);
    const toolKind = readLikeMcp ? 'read' : (0, codex_1.lookupToolKind)(toolName);
    const event = baseEvent === 'PreToolUse' && readLikeMcp ? 'PreRead' : baseEvent;
    return {
        ...raw,
        ide: IDE,
        event,
        toolKind,
        file_path: (0, codex_1.getFilePath)(raw) ?? '',
        cwd: (0, codex_1.getCwd)(raw) ?? undefined,
        session_id: (0, codex_1.getSessionId)(raw) ?? undefined,
    };
};
const formatOutput = (canonical) => (canonical ?? {}); // identity pass-through
exports.codex = { name: 'codex', detect, normalize, formatOutput };
