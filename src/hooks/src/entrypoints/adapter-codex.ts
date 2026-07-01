// Slim adapter for core-codex bundle — only codex detection, zero other IDE code.
import { codex } from '../adapters/codex';
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
  codex.normalize(rawInput as Record<string, unknown>);

export const formatOutput = (
  canonical: CanonicalOutput | Record<string, unknown>,
  _ide?: string,
): Record<string, unknown> => codex.formatOutput(canonical as CanonicalOutput);

export const detectIDE = (_raw: unknown): string => 'codex';

export const dedupKey = (_raw: unknown, _hookName: string): string | null => null;

// Codex deny is carried entirely in the JSON body at exit 0 — no adapter override needed.
export const exitCodeFor = (_canonical: CanonicalOutput, _ide?: string): number => 0;
