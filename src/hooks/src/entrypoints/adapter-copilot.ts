// Slim adapter for core-copilot bundle — copilot detection with claude-code fallback.
// VS Code may send either Copilot-specific format (toolName) or Claude-compatible format
// (hook_event_name). The fallback handles both without including codex/cursor/windsurf.
import { copilot } from '../adapters/copilot';
import { claudeCode } from '../adapters/claude-code';
import type { NormalizedInput, CanonicalOutput } from '../types';

export const readStdin = (stream: NodeJS.ReadableStream = process.stdin): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const chunks: string[] = [];
    stream.on('data', (chunk: unknown) => chunks.push(String(chunk)));
    stream.on('end', () => {
      const raw = chunks.join('').trim();
      if (!raw) return reject(new Error('Invalid input: empty stdin'));
      try { resolve(JSON.parse(raw)); }
      catch (err) { reject(new Error(`JSON parse error: ${(err as Error).message}`)); }
    });
    stream.on('error', reject);
  });

export const normalize = (rawInput: unknown): NormalizedInput => {
  const raw = rawInput as Record<string, unknown>;
  return copilot.detect(raw) ? copilot.normalize(raw) : claudeCode.normalize(raw);
};

export const formatOutput = (
  canonical: CanonicalOutput | Record<string, unknown>,
  ide?: string,
): Record<string, unknown> =>
  ide === 'claude-code'
    ? claudeCode.formatOutput(canonical as CanonicalOutput)
    : copilot.formatOutput(canonical as CanonicalOutput);

// Dedup is active only for old Copilot CLI format (fires PostToolUse twice per call).
// VS Code Agent sends CC-shaped input and does not need dedup.
export const detectIDE = (raw: unknown): string => {
  const r = raw as Record<string, unknown>;
  return copilot.detect(r) ? 'copilot' : 'claude-code';
};

export const dedupKey = (raw: unknown, hookName: string): string | null => {
  const r = raw as Record<string, unknown>;
  return copilot.detect(r) ? copilot.dedupKey!(r, hookName) : null;
};

// Both Copilot and its claude-code fallback carry deny entirely in the JSON body at exit 0.
export const exitCodeFor = (_canonical: CanonicalOutput, _ide?: string): number => 0;
