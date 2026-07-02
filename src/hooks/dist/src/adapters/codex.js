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
// NOTE: Codex has NO dedicated read tool and does NOT route reads through MCP —
// no manufacturer doc describes an MCP read path. File reads happen through the
// shell (cat/sed/…) and are caught by read-once's `bash` path (it parses the
// command string). Do NOT reintroduce MCP→read promotion here.
const normalize = (raw) => {
    const event = (0, codex_1.lookupEvent)(raw.hook_event_name);
    const toolName = raw.tool_name ?? '';
    const toolKind = (0, codex_1.lookupToolKind)(toolName);
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
