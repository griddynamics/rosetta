// Slim adapter for core-claude bundle — only claude-code detection, zero other IDE code.
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

export const normalize = (rawInput: unknown): NormalizedInput =>
  claudeCode.normalize(rawInput as Record<string, unknown>);

export const formatOutput = (
  canonical: CanonicalOutput | Record<string, unknown>,
  _ide?: string,
): Record<string, unknown> => claudeCode.formatOutput(canonical as CanonicalOutput);

export const detectIDE = (_raw: unknown): string => 'claude-code';

export const dedupKey = (_raw: unknown, _hookName: string): string | null => null;

// Claude Code deny is carried entirely in the JSON body at exit 0 — no adapter override needed.
export const exitCodeFor = (_canonical: CanonicalOutput, _ide?: string): number => 0;
