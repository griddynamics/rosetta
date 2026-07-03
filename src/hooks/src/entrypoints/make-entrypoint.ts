// make-entrypoint.ts — builds a slim per-IDE bundle's full adapter API surface from a single
// IdeAdapter. Each bundle imports exactly ONE adapter (bundle isolation is structural — the import
// graph, not the bundler's dead-code elimination; the other four adapters are never imported, so
// esbuild never sees them — see scripts/build-bundles.mjs + tests/regression/bundle-isolation.test.ts).
//
// This exists so a new adapter method is added in ONE place (here) instead of being edited in
// lockstep across every entrypoint (was the N-fold cost noted in hooks-verify.md OI-5). The slim
// surface ignores the multi-IDE `env`/`ide` params — the bundle is already pinned to its IDE.

import type { IdeAdapter, AdapterApi } from '../types';

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

export const makeEntrypoint = (adapter: IdeAdapter): AdapterApi => ({
  readStdin,
  detectIDE: () => adapter.name,
  normalize: (rawInput) => adapter.normalize(rawInput as Record<string, unknown>),
  formatOutput: (canonicalOutput) => adapter.formatOutput(canonicalOutput as Parameters<IdeAdapter['formatOutput']>[0]),
  exitCodeFor: (canonicalOutput) => adapter.exitCode?.(canonicalOutput) ?? 0,
  stderrMessageFor: (canonicalOutput) => adapter.stderrMessage?.(canonicalOutput),
});
