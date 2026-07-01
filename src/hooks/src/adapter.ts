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

import { claudeCode } from './adapters/claude-code';
import { codex } from './adapters/codex';
import { cursor } from './adapters/cursor';
import { windsurf } from './adapters/windsurf';
import { copilot } from './adapters/copilot';
import { debugLogBranch } from './runtime/debug-log';

import type { IdeAdapter, NormalizedInput, CanonicalOutput } from './types';
export type { NormalizedInput, CanonicalOutput, IdeAdapter } from './types';

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

export const detectIDE = (rawInput: unknown): string => {
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
  const ide = DETECTION_ORDER.find((name) => ADAPTERS[name].detect(raw));
  if (!ide) {
    debugLogBranch('adapter', 'detect-unsupported', { keys: Object.keys(raw), rawInput: raw });
    throw new Error(`Unsupported IDE: ${JSON.stringify(Object.keys(raw))}`);
  }
  debugLogBranch('adapter', 'detect-ok', { ide, keys: Object.keys(raw) });
  return ide;
};

export const normalize = (rawInput: unknown): NormalizedInput => {
  const ide = detectIDE(rawInput);
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

export const dedupKey = (rawInput: unknown, hookName: string): string | null => {
  const ide = detectIDE(rawInput);
  const key = ADAPTERS[ide].dedupKey?.(rawInput as Record<string, unknown>, hookName) ?? null;
  debugLogBranch('adapter', 'dedup-key', { ide, hookName, dedupKey: key });
  return key;
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
