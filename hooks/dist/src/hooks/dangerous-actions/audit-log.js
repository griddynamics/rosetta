"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendOverrideAudit = appendOverrideAudit;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Appends one JSON line to <cwd>/.claude/audit/hook-overrides.jsonl.
 * Failures are swallowed — audit must never block execution.
 */
function appendOverrideAudit(cwd, entry) {
    const p = path_1.default.join(cwd, '.claude', 'audit', 'hook-overrides.jsonl');
    try {
        fs_1.default.mkdirSync(path_1.default.dirname(p), { recursive: true });
        fs_1.default.appendFileSync(p, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
    }
    catch {
        // Intentionally swallowed — audit failure must not block hook execution.
    }
}
