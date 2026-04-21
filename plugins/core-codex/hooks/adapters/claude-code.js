"use strict";
// adapters/claude-code.ts — Adapter for Claude Code IDE
// Canonical format: this is the reference format all other adapters normalize to.
// Detection: hook_event_name + tool_input + session_id present, no Codex/Cursor extras.
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatOutput = exports.normalize = exports.detect = exports.name = void 0;
const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'];
exports.name = 'claude-code';
const detect = (raw) => CC_SIGNATURE.every((f) => f in raw);
exports.detect = detect;
const normalize = (raw) => raw; // identity — already canonical
exports.normalize = normalize;
const formatOutput = (canonical) => (canonical ?? {}); // identity — already canonical
exports.formatOutput = formatOutput;
