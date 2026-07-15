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

import { claudeCode } from './adapters/claude-code';
import { codex } from './adapters/codex';
import { cursor } from './adapters/cursor';
import { windsurf } from './adapters/windsurf';
import { copilot } from './adapters/copilot';
import { debugLogBranch } from './runtime/debug-log';

import type { IdeAdapter, NormalizedInput, CanonicalOutput, AdapterApi } from './types';
export type { NormalizedInput, CanonicalOutput, IdeAdapter, AdapterApi } from './types';

// Detection is an ordered chain — a superset like codex must match before
// claude-code, so this order is load-bearing and not derived from Object.keys.
const DETECTION_ORDER = ['codex', 'cursor', 'claude-code', 'windsurf', 'copilot'] as const;

const ADAPTERS = {
  codex,
  cursor,
  'claude-code': claudeCode,
  windsurf,
  copilot,
} as Record<string, IdeAdapter>;

type Env = Record<string, string | undefined>;

const hasVarWithPrefix = (env: Env, prefix: string): boolean =>
  Object.keys(env).some((k) => k.startsWith(prefix));

// Some IDE payloads are structurally ambiguous by shape alone — most notably Copilot's VS
// Code snake_case fire, which mirrors Claude Code's own wire shape (hook_event_name +
// session_id + tool_input) closely enough that shape-based detect() cannot tell them apart.
// Each IDE's own runtime env signature (verified per docs/hooks/<ide>.md) resolves this
// unambiguously and is checked FIRST; shape-based DETECTION_ORDER below is the fallback for
// when none of these env vars are present (e.g. a sandboxed/stripped environment).
// Ordered most-specific first: Cursor is a VS Code fork (carries VSCODE_* too), so its own
// CURSOR_VERSION must be checked before the generic VSCODE_* Copilot catch-all.
const ENV_DETECTION_ORDER: ReadonlyArray<{ ide: string; test: (env: Env) => boolean }> = [
  { ide: 'cursor',      test: (env) => Boolean(env.CURSOR_VERSION) },
  { ide: 'claude-code', test: (env) => env.CLAUDECODE === '1' },
  { ide: 'codex',       test: (env) => Boolean(env.CODEX_MANAGED_BY_NPM) || Boolean(env.CODEX_MANAGED_PACKAGE_ROOT) },
  { ide: 'copilot',     test: (env) => env.COPILOT_CLI === '1' },
  { ide: 'windsurf',    test: (env) => hasVarWithPrefix(env, 'CODEIUM_') || hasVarWithPrefix(env, 'WINDSURF_') },
  { ide: 'copilot',     test: (env) => hasVarWithPrefix(env, 'VSCODE_') },
];

export const detectIDE = (rawInput: unknown, env: Env = {}): string => {
  if (rawInput === null || rawInput === undefined) {
    debugLogBranch('adapter', 'detect-invalid', { reason: 'null-or-undefined' });
    throw new Error('Invalid input: null or undefined');
  }
  if (typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    debugLogBranch('adapter', 'detect-invalid', {
      reason: 'non-plain-object',
      valueType: Array.isArray(rawInput) ? 'array' : typeof rawInput,
      rawInput,
    });
    throw new Error('Invalid input: expected a plain object');
  }
  const raw = rawInput as Record<string, unknown>;
  const envMatch = ENV_DETECTION_ORDER.find((e) => e.test(env));
  if (envMatch) {
    debugLogBranch('adapter', 'detect-ok', { ide: envMatch.ide, keys: Object.keys(raw), via: 'env' });
    return envMatch.ide;
  }
  const ide = DETECTION_ORDER.find((name) => ADAPTERS[name].detect(raw));
  if (!ide) {
    debugLogBranch('adapter', 'detect-unsupported', { keys: Object.keys(raw), rawInput: raw });
    throw new Error(`Unsupported IDE: ${JSON.stringify(Object.keys(raw))}`);
  }
  debugLogBranch('adapter', 'detect-ok', { ide, keys: Object.keys(raw), via: 'shape' });
  return ide;
};

export const normalize = (rawInput: unknown, env: Env = {}): NormalizedInput => {
  const ide = detectIDE(rawInput, env);
  const normalized = ADAPTERS[ide].normalize(rawInput as Record<string, unknown>);
  debugLogBranch('adapter', 'normalize-ok', {
    ide,
    event: normalized.event,
    toolKind: normalized.toolKind,
    toolName: normalized.tool_name,
    filePath: normalized.file_path ?? null,
    normalizedInput: normalized,
  });
  return normalized;
};

export const formatOutput = (
  canonicalOutput: CanonicalOutput | Record<string, unknown>,
  ide?: string,
): Record<string, unknown> => {
  const adapter = ide ? ADAPTERS[ide as keyof typeof ADAPTERS] : undefined;
  const formatted = adapter
    ? adapter.formatOutput(canonicalOutput as CanonicalOutput)
    : (canonicalOutput as Record<string, unknown>);
  debugLogBranch('adapter', 'format-output', {
    ide: ide ?? null,
    adapter: adapter?.name ?? null,
    canonicalOutput,
    formattedOutput: formatted,
  });
  return formatted;
};

export const exitCodeFor = (canonicalOutput: CanonicalOutput, ide?: string): number => {
  const adapter = ide ? ADAPTERS[ide as keyof typeof ADAPTERS] : undefined;
  const code = adapter?.exitCode?.(canonicalOutput) ?? 0;
  debugLogBranch('adapter', 'exit-code-for', { ide: ide ?? null, adapter: adapter?.name ?? null, code });
  return code;
};

// Text an IDE wants written to STDERR (not stdout). Unset for every IDE except Windsurf, whose
// only hook→model text channel is stderr on a blocking pre-hook (see adapters/windsurf.ts).
export const stderrMessageFor = (canonicalOutput: CanonicalOutput, ide?: string): string | undefined => {
  const adapter = ide ? ADAPTERS[ide as keyof typeof ADAPTERS] : undefined;
  const message = adapter?.stderrMessage?.(canonicalOutput);
  debugLogBranch('adapter', 'stderr-message-for', { ide: ide ?? null, adapter: adapter?.name ?? null, hasMessage: Boolean(message) });
  return message;
};

export const readStdin = (stream: NodeJS.ReadableStream = process.stdin): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const chunks: string[] = [];
    stream.on('data', (chunk: unknown) => chunks.push(String(chunk)));
    stream.on('end', () => {
      const rawText = chunks.join('');
      const raw = rawText.trim();
      debugLogBranch('adapter', 'stdin-received', {
        rawInput: rawText,
        rawBytes: Buffer.byteLength(rawText, 'utf8'),
        trimmedEmpty: raw.length === 0,
      });
      if (!raw) return reject(new Error('Invalid input: empty stdin'));
      try {
        const parsed = JSON.parse(raw) as unknown;
        debugLogBranch('adapter', 'stdin-parsed', {
          parsedType: Array.isArray(parsed) ? 'array' : typeof parsed,
          parsedKeys:
            parsed && typeof parsed === 'object' && !Array.isArray(parsed)
              ? Object.keys(parsed as Record<string, unknown>)
              : null,
        });
        resolve(parsed);
      } catch (err) {
        debugLogBranch('adapter', 'stdin-parse-error', {
          rawInput: rawText,
          error: err as Error,
        });
        reject(new Error(`JSON parse error: ${(err as Error).message}`));
      }
    });
    stream.on('error', reject);
  });

// The multi-IDE adapter API surface, as an object matching the per-IDE bundle entrypoints'
// `adapter` export (entrypoints/adapter-*.ts via makeEntrypoint). run-hook.ts imports `{ adapter }`
// from '../adapter' and the bundler swaps this module for the pinned per-IDE entrypoint at build
// time (scripts/build-bundles.mjs). The named exports above stay for direct test imports.
export const adapter: AdapterApi = {
  readStdin,
  detectIDE,
  normalize,
  formatOutput,
  exitCodeFor,
  stderrMessageFor,
};
