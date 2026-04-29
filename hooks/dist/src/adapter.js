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
exports.readStdin = exports.formatOutput = exports.normalize = exports.detectIDE = exports.extractFilePath = void 0;
const claude_code_1 = require("./adapters/claude-code");
const codex_1 = require("./adapters/codex");
const cursor_1 = require("./adapters/cursor");
const windsurf_1 = require("./adapters/windsurf");
const copilot_1 = require("./adapters/copilot");
const PATCH_FILE_RE = /^\*\*\* (?:Update|Add|Create) File: (.+)$/m;
const extractFilePath = (toolName, toolInput) => {
    if (toolName === 'apply_patch' || toolName === 'functions.apply_patch') {
        const command = toolInput.command ?? '';
        return PATCH_FILE_RE.exec(command)?.[1]?.trim() ?? '';
    }
    return toolInput.file_path
        ?? toolInput.filePath
        ?? toolInput.path
        ?? '';
};
exports.extractFilePath = extractFilePath;
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
const normalize = (rawInput) => {
    const result = ADAPTERS[(0, exports.detectIDE)(rawInput)].normalize(rawInput);
    result.file_path = (0, exports.extractFilePath)(result.tool_name, result.tool_input);
    return result;
};
exports.normalize = normalize;
const formatOutput = (canonicalOutput, ide) => {
    const adapter = ide ? ADAPTERS[ide] : undefined;
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
