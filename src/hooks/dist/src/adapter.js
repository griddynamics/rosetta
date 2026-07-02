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
exports.readStdin = exports.dedupKey = exports.exitCodeFor = exports.formatOutput = exports.normalize = exports.detectIDE = void 0;
const claude_code_1 = require("./adapters/claude-code");
const codex_1 = require("./adapters/codex");
const cursor_1 = require("./adapters/cursor");
const windsurf_1 = require("./adapters/windsurf");
const copilot_1 = require("./adapters/copilot");
const debug_log_1 = require("./runtime/debug-log");
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
        (0, debug_log_1.debugLogBranch)('adapter', 'detect-invalid', { reason: 'null-or-undefined' });
        throw new Error('Invalid input: null or undefined');
    }
    if (typeof rawInput !== 'object' || Array.isArray(rawInput)) {
        (0, debug_log_1.debugLogBranch)('adapter', 'detect-invalid', {
            reason: 'non-plain-object',
            valueType: Array.isArray(rawInput) ? 'array' : typeof rawInput,
            rawInput,
        });
        throw new Error('Invalid input: expected a plain object');
    }
    const raw = rawInput;
    const ide = DETECTION_ORDER.find((name) => ADAPTERS[name].detect(raw));
    if (!ide) {
        (0, debug_log_1.debugLogBranch)('adapter', 'detect-unsupported', { keys: Object.keys(raw), rawInput: raw });
        throw new Error(`Unsupported IDE: ${JSON.stringify(Object.keys(raw))}`);
    }
    (0, debug_log_1.debugLogBranch)('adapter', 'detect-ok', { ide, keys: Object.keys(raw) });
    return ide;
};
exports.detectIDE = detectIDE;
const normalize = (rawInput) => {
    const ide = (0, exports.detectIDE)(rawInput);
    const normalized = ADAPTERS[ide].normalize(rawInput);
    (0, debug_log_1.debugLogBranch)('adapter', 'normalize-ok', {
        ide,
        event: normalized.event,
        toolKind: normalized.toolKind,
        toolName: normalized.tool_name,
        filePath: normalized.file_path ?? null,
        normalizedInput: normalized,
    });
    return normalized;
};
exports.normalize = normalize;
const formatOutput = (canonicalOutput, ide) => {
    const adapter = ide ? ADAPTERS[ide] : undefined;
    const formatted = adapter
        ? adapter.formatOutput(canonicalOutput)
        : canonicalOutput;
    (0, debug_log_1.debugLogBranch)('adapter', 'format-output', {
        ide: ide ?? null,
        adapter: adapter?.name ?? null,
        canonicalOutput,
        formattedOutput: formatted,
    });
    return formatted;
};
exports.formatOutput = formatOutput;
const exitCodeFor = (canonicalOutput, ide) => {
    const adapter = ide ? ADAPTERS[ide] : undefined;
    const code = adapter?.exitCode?.(canonicalOutput) ?? 0;
    (0, debug_log_1.debugLogBranch)('adapter', 'exit-code-for', { ide: ide ?? null, adapter: adapter?.name ?? null, code });
    return code;
};
exports.exitCodeFor = exitCodeFor;
const dedupKey = (rawInput, hookName) => {
    const ide = (0, exports.detectIDE)(rawInput);
    const key = ADAPTERS[ide].dedupKey?.(rawInput, hookName) ?? null;
    (0, debug_log_1.debugLogBranch)('adapter', 'dedup-key', { ide, hookName, dedupKey: key });
    return key;
};
exports.dedupKey = dedupKey;
const readStdin = (stream = process.stdin) => new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(String(chunk)));
    stream.on('end', () => {
        const rawText = chunks.join('');
        const raw = rawText.trim();
        (0, debug_log_1.debugLogBranch)('adapter', 'stdin-received', {
            rawInput: rawText,
            rawBytes: Buffer.byteLength(rawText, 'utf8'),
            trimmedEmpty: raw.length === 0,
        });
        if (!raw)
            return reject(new Error('Invalid input: empty stdin'));
        try {
            const parsed = JSON.parse(raw);
            (0, debug_log_1.debugLogBranch)('adapter', 'stdin-parsed', {
                parsedType: Array.isArray(parsed) ? 'array' : typeof parsed,
                parsedKeys: parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                    ? Object.keys(parsed)
                    : null,
            });
            resolve(parsed);
        }
        catch (err) {
            (0, debug_log_1.debugLogBranch)('adapter', 'stdin-parse-error', {
                rawInput: rawText,
                error: err,
            });
            reject(new Error(`JSON parse error: ${err.message}`));
        }
    });
    stream.on('error', reject);
});
exports.readStdin = readStdin;
