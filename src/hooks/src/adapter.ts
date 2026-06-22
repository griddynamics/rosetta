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
    throw new Error('Invalid input: null or undefined');
  }
  if (typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    throw new Error('Invalid input: expected a plain object');
  }
  const raw = rawInput as Record<string, unknown>;
  const ide = DETECTION_ORDER.find((name) => ADAPTERS[name].detect(raw));
  if (!ide) {
    throw new Error(`Unsupported IDE: ${JSON.stringify(Object.keys(raw))}`);
  }
  return ide;
};

export const normalize = (rawInput: unknown): NormalizedInput =>
  ADAPTERS[detectIDE(rawInput)].normalize(rawInput as Record<string, unknown>);

export const formatOutput = (
  canonicalOutput: CanonicalOutput | Record<string, unknown>,
  ide?: string,
): Record<string, unknown> => {
  const adapter = ide ? ADAPTERS[ide as keyof typeof ADAPTERS] : undefined;
  return adapter
    ? adapter.formatOutput(canonicalOutput as CanonicalOutput)
    : (canonicalOutput as Record<string, unknown>);
};

export const dedupKey = (rawInput: unknown, hookName: string): string | null => {
  const ide = detectIDE(rawInput);
  return ADAPTERS[ide].dedupKey?.(rawInput as Record<string, unknown>, hookName) ?? null;
};

export const readStdin = (stream: NodeJS.ReadableStream = process.stdin): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const chunks: string[] = [];
    stream.on('data', (chunk: unknown) => chunks.push(String(chunk)));
    stream.on('end', () => {
      const raw = chunks.join('').trim();
      if (!raw) return reject(new Error('Invalid input: empty stdin'));
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error(`JSON parse error: ${(err as Error).message}`));
      }
    });
    stream.on('error', reject);
  });
