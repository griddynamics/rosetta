// Slim adapter for core-cursor bundle — only cursor detection, zero other IDE code.
import { cursor } from '../adapters/cursor';
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
  cursor.normalize(rawInput as Record<string, unknown>);

export const formatOutput = (
  canonical: CanonicalOutput | Record<string, unknown>,
  _ide?: string,
): Record<string, unknown> => cursor.formatOutput(canonical as CanonicalOutput);

export const detectIDE = (_raw: unknown): string => 'cursor';

export const dedupKey = (_raw: unknown, _hookName: string): string | null => null;

// Cursor's exit-0 + permission:"deny" JSON deny is confirmed working and field-selective
// (docs/hooks/cursor.md Run 1+3); pairing exit-2 with the body dumps it raw/unparsed instead
// (Run 4) — strictly worse. No adapter override; deny stays carried in the JSON body alone.
export const exitCodeFor = (_canonical: CanonicalOutput, _ide?: string): number => 0;
