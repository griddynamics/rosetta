// Slim adapter for core-windsurf bundle — only windsurf detection, zero other IDE code.
import { windsurf } from '../adapters/windsurf';
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
  windsurf.normalize(rawInput as Record<string, unknown>);

export const formatOutput = (
  canonical: CanonicalOutput | Record<string, unknown>,
  _ide?: string,
): Record<string, unknown> => windsurf.formatOutput(canonical as CanonicalOutput);

export const detectIDE = (_raw: unknown): string => 'windsurf';

export const dedupKey = (_raw: unknown, _hookName: string): string | null => null;

// Windsurf never parses stdout (docs/hooks/windsurf.md, verified) — blocking is exit-code-only.
export const exitCodeFor = (canonical: CanonicalOutput, _ide?: string): number =>
  windsurf.exitCode!(canonical);
