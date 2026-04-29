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
Object.defineProperty(exports, "__esModule", { value: true });
exports.readStdin = exports.dedupKey = exports.formatOutput = exports.normalize = exports.detectIDE = void 0;
const claude_code_1 = require("./adapters/claude-code");
const codex_1 = require("./adapters/codex");
const cursor_1 = require("./adapters/cursor");
const windsurf_1 = require("./adapters/windsurf");
const copilot_1 = require("./adapters/copilot");
// Detection is an ordered chain — a superset like codex must match before
// claude-code, so this order is load-bearing and not derived from Object.keys.
const DETECTION_ORDER = ['codex', 'cursor', 'claude-code', 'windsurf', 'copilot'];
const ADAPTERS = {
    codex: codex_1.codex,
    cursor: cursor_1.cursor,
    'claude-code': claude_code_1.claudeCode,
    windsurf: windsurf_1.windsurf,
    copilot: copilot_1.copilot,
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
    const adapter = ide ? ADAPTERS[ide] : undefined;
    return adapter
        ? adapter.formatOutput(canonicalOutput)
        : canonicalOutput;
};
exports.formatOutput = formatOutput;
const dedupKey = (rawInput, hookName) => {
    const ide = (0, exports.detectIDE)(rawInput);
    return ADAPTERS[ide].dedupKey?.(rawInput, hookName) ?? null;
};
exports.dedupKey = dedupKey;
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
