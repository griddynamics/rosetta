"use strict";
// adapter.ts — Abstract IDE adapter orchestrator for Rosetta hooks
//
// Loads IDE-specific adapters and delegates detection, normalization, and
// output formatting to the matching adapter.
//
// Detection is two-tiered — an optional `env` (default {}) is checked FIRST, per
// ENV_DETECTION_ORDER below; only if no env var matches does detection fall back to payload
// shape. This exists because some payloads are structurally ambiguous by shape alone (e.g.
// Copilot's VS Code fire mirrors Claude Code's own wire shape) — see docs/hooks/copilot.md.
// Note: this module is never shipped to production bundles (each IDE's bundle is pinned at
// build time to its own slim entrypoint in `entrypoints/`, see scripts/build-bundles.mjs), so
// for the 5 shipped bundles env-detection is redundant (bundle identity already disambiguates
// the IDE) — but it IS reachable and load-bearing for any consumer of this module directly,
// including `run-hook.ts`'s `runAsCli` (the real, non-bundled CLI entrypoint), which passes
// `process.env` through `executeHook`'s `env` opt. Callers that don't want real env — e.g.
// tests, to avoid the host shell's own IDE env vars (this repo's dev shell commonly has
// CLAUDECODE=1) leaking into detection — get the safe default {} by omitting the opt.
//
// Shape-based fallback order (most specific → least specific):
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
exports.readStdin = exports.stderrMessageFor = exports.exitCodeFor = exports.formatOutput = exports.normalize = exports.detectIDE = void 0;
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
const hasVarWithPrefix = (env, prefix) => Object.keys(env).some((k) => k.startsWith(prefix));
// Some IDE payloads are structurally ambiguous by shape alone — most notably Copilot's VS
// Code snake_case fire, which mirrors Claude Code's own wire shape (hook_event_name +
// session_id + tool_input) closely enough that shape-based detect() cannot tell them apart.
// Each IDE's own runtime env signature (verified per docs/hooks/<ide>.md) resolves this
// unambiguously and is checked FIRST; shape-based DETECTION_ORDER below is the fallback for
// when none of these env vars are present (e.g. a sandboxed/stripped environment).
// Ordered most-specific first: Cursor is a VS Code fork (carries VSCODE_* too), so its own
// CURSOR_VERSION must be checked before the generic VSCODE_* Copilot catch-all.
const ENV_DETECTION_ORDER = [
    { ide: 'cursor', test: (env) => Boolean(env.CURSOR_VERSION) },
    { ide: 'claude-code', test: (env) => env.CLAUDECODE === '1' },
    { ide: 'codex', test: (env) => Boolean(env.CODEX_MANAGED_BY_NPM) || Boolean(env.CODEX_MANAGED_PACKAGE_ROOT) },
    { ide: 'copilot', test: (env) => env.COPILOT_CLI === '1' },
    { ide: 'windsurf', test: (env) => hasVarWithPrefix(env, 'CODEIUM_') || hasVarWithPrefix(env, 'WINDSURF_') },
    { ide: 'copilot', test: (env) => hasVarWithPrefix(env, 'VSCODE_') },
];
const detectIDE = (rawInput, env = {}) => {
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
    const envMatch = ENV_DETECTION_ORDER.find((e) => e.test(env));
    if (envMatch) {
        (0, debug_log_1.debugLogBranch)('adapter', 'detect-ok', { ide: envMatch.ide, keys: Object.keys(raw), via: 'env' });
        return envMatch.ide;
    }
    const ide = DETECTION_ORDER.find((name) => ADAPTERS[name].detect(raw));
    if (!ide) {
        (0, debug_log_1.debugLogBranch)('adapter', 'detect-unsupported', { keys: Object.keys(raw), rawInput: raw });
        throw new Error(`Unsupported IDE: ${JSON.stringify(Object.keys(raw))}`);
    }
    (0, debug_log_1.debugLogBranch)('adapter', 'detect-ok', { ide, keys: Object.keys(raw), via: 'shape' });
    return ide;
};
exports.detectIDE = detectIDE;
const normalize = (rawInput, env = {}) => {
    const ide = (0, exports.detectIDE)(rawInput, env);
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
// Text an IDE wants written to STDERR (not stdout). Unset for every IDE except Windsurf, whose
// only hook→model text channel is stderr on a blocking pre-hook (see adapters/windsurf.ts).
const stderrMessageFor = (canonicalOutput, ide) => {
    const adapter = ide ? ADAPTERS[ide] : undefined;
    const message = adapter?.stderrMessage?.(canonicalOutput);
    (0, debug_log_1.debugLogBranch)('adapter', 'stderr-message-for', { ide: ide ?? null, adapter: adapter?.name ?? null, hasMessage: Boolean(message) });
    return message;
};
exports.stderrMessageFor = stderrMessageFor;
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
