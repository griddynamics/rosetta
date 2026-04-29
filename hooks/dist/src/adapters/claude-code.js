"use strict";
// adapters/claude-code.ts — Adapter for Claude Code IDE
// Canonical format: this is the reference format all other adapters normalize to.
// Detection: hook_event_name + tool_input + session_id present, no Codex/Cursor extras.
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeCode = void 0;
const ide_registry_1 = require("../runtime/ide-registry");
const IDE = 'claude-code';
const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'];
const detect = (raw) => CC_SIGNATURE.every((f) => f in raw);
const normalize = (raw) => ({
    ...raw,
    ide: IDE,
    event: (0, ide_registry_1.reverseLookupEvent)(IDE, raw.hook_event_name),
    toolKind: (0, ide_registry_1.reverseLookupToolKind)(IDE, raw.tool_name),
    file_path: ide_registry_1.PROPERTIES.filePath[IDE](raw) ?? '',
    cwd: ide_registry_1.PROPERTIES.cwd[IDE](raw) ?? undefined,
    session_id: ide_registry_1.PROPERTIES.sessionId[IDE](raw) ?? undefined,
});
const formatOutput = (canonical) => (canonical ?? {}); // identity — already canonical
exports.claudeCode = { name: 'claude-code', detect, normalize, formatOutput };
