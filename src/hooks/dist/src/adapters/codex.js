"use strict";
// adapters/codex.ts — Adapter for Codex (OpenAI) IDE
// Codex shares the Claude Code signature but adds model + turn_id at top level.
// Detection: must check Codex extras BEFORE claude-code (it's a superset).
Object.defineProperty(exports, "__esModule", { value: true });
exports.codex = void 0;
const codex_1 = require("../runtime/ide-rows/codex");
const IDE = 'codex';
const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'];
const CODEX_EXTRA = ['model', 'turn_id'];
const detect = (raw) => CC_SIGNATURE.every((f) => f in raw) && CODEX_EXTRA.every((f) => f in raw);
const normalize = (raw) => ({
    ...raw,
    ide: IDE,
    event: (0, codex_1.lookupEvent)(raw.hook_event_name),
    toolKind: (0, codex_1.lookupToolKind)(raw.tool_name),
    file_path: (0, codex_1.getFilePath)(raw) ?? '',
    cwd: (0, codex_1.getCwd)(raw) ?? undefined,
    session_id: (0, codex_1.getSessionId)(raw) ?? undefined,
});
const formatOutput = (canonical) => (canonical ?? {}); // identity pass-through
exports.codex = { name: 'codex', detect, normalize, formatOutput };
