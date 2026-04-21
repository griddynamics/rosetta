"use strict";
// adapters/codex.ts — Adapter for Codex (OpenAI) IDE
// Codex shares the Claude Code signature but adds model + turn_id at top level.
// Detection: must check Codex extras BEFORE claude-code (it's a superset).
Object.defineProperty(exports, "__esModule", { value: true });
exports.adapter = void 0;
const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'];
const CODEX_EXTRA = ['model', 'turn_id'];
const detect = (raw) => CC_SIGNATURE.every((f) => f in raw) && CODEX_EXTRA.every((f) => f in raw);
const normalize = (raw) => raw; // already canonical; extras preserved
const formatOutput = (canonical) => (canonical ?? {}); // identity pass-through
exports.adapter = { name: 'codex', detect, normalize, formatOutput };
