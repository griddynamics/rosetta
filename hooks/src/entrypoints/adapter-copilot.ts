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
  _ide?: string,
): Record<string, unknown> => copilot.formatOutput(canonical as CanonicalOutput);

// Dedup is active for this bundle: Copilot CLI fires PostToolUse twice per tool call.
export const detectIDE = (_raw: unknown): string => 'copilot';
