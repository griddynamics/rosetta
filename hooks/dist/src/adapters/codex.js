"use strict";
// adapters/codex.ts — Adapter for Codex (OpenAI) IDE
// Codex shares the Claude Code signature but adds model + turn_id at top level.
// Detection: must check Codex extras BEFORE claude-code (it's a superset).
Object.defineProperty(exports, "__esModule", { value: true });
exports.codex = void 0;
const ide_registry_1 = require("../runtime/ide-registry");
const IDE = 'codex';
const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'];
const CODEX_EXTRA = ['model', 'turn_id'];
const detect = (raw) => CC_SIGNATURE.every((f) => f in raw) && CODEX_EXTRA.every((f) => f in raw);
const normalize = (raw) => ({
    ...raw,
    ide: IDE,
    event: (0, ide_registry_1.reverseLookupEvent)(IDE, raw.hook_event_name),
    toolKind: (0, ide_registry_1.reverseLookupToolKind)(IDE, raw.tool_name),
    file_path: ide_registry_1.PROPERTIES.filePath[IDE](raw) ?? '',
    cwd: ide_registry_1.PROPERTIES.cwd[IDE](raw) ?? undefined,
    session_id: ide_registry_1.PROPERTIES.sessionId[IDE](raw) ?? undefined,
});
const formatOutput = (canonical) => (canonical ?? {}); // identity pass-through
exports.codex = { name: 'codex', detect, normalize, formatOutput };
