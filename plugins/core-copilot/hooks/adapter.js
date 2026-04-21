"use strict";
// adapter.ts — Abstract IDE adapter orchestrator for Rosetta hooks
//
// Loads IDE-specific adapters and delegates detection, normalization, and
// output formatting to the matching adapter.
//
// Detection order (most specific → least specific):
//   1. codex        — CC fields + model + turn_id
//   2. cursor       — CC fields + conversation_id + cursor_version
//   3. claude-code  — CC fields (hook_event_name + tool_input + session_id)
//   4. windsurf     — agent_action_name + trajectory_id + tool_info
//   5. copilot      — toolName + timestamp + cwd (no hook_event_name)
//
// Public API:
//   - readStdin, normalize, formatOutput — used by hook entrypoints (prod)
//   - detectIDE — exposed for tests; prod callers should prefer normalize()
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.readStdin = exports.formatOutput = exports.normalize = exports.detectIDE = void 0;
const claudeCode = __importStar(require("./adapters/claude-code"));
const codex = __importStar(require("./adapters/codex"));
const cursor = __importStar(require("./adapters/cursor"));
const windsurf = __importStar(require("./adapters/windsurf"));
const copilot = __importStar(require("./adapters/copilot"));
// Detection is an ordered chain — a superset like codex must match before
// claude-code, so this order is load-bearing and not derived from Object.keys.
const DETECTION_ORDER = ['codex', 'cursor', 'claude-code', 'windsurf', 'copilot'];
const ADAPTERS = {
    codex,
    cursor,
    'claude-code': claudeCode,
    windsurf,
    copilot,
};
const detectIDE = (rawInput) => {
    if (rawInput === null || rawInput === undefined) {
        throw new Error('Invalid input: null or undefined');
    }
    if (typeof rawInput !== 'object' || Array.isArray(rawInput)) {
        throw new Error('Invalid input: expected a plain object');
    }
    const raw = rawInput;
    const ide = DETECTION_ORDER.find((name) => ADAPTERS[name].detect(raw));
    if (!ide) {
        throw new Error(`Unsupported IDE: ${JSON.stringify(Object.keys(raw))}`);
    }
    return ide;
};
exports.detectIDE = detectIDE;
const normalize = (rawInput) => ADAPTERS[(0, exports.detectIDE)(rawInput)].normalize(rawInput);
exports.normalize = normalize;
const formatOutput = (canonicalOutput, ide) => {
    const adapter = ADAPTERS[ide];
    return adapter
        ? adapter.formatOutput(canonicalOutput)
        : canonicalOutput;
};
exports.formatOutput = formatOutput;
const readStdin = (stream = process.stdin) => new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(String(chunk)));
    stream.on('end', () => {
        const raw = chunks.join('').trim();
        if (!raw)
            return reject(new Error('Invalid input: empty stdin'));
        try {
            resolve(JSON.parse(raw));
        }
        catch (err) {
            reject(new Error(`JSON parse error: ${err.message}`));
        }
    });
    stream.on('error', reject);
});
exports.readStdin = readStdin;
