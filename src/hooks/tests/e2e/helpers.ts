// helpers.ts — shared harness for the log-driven E2E suite.
//
// These tests replay REAL captured wire payloads (docs/hooks/<ide>-logs.txt, cleaned by
// split-logs.js) through the ACTUAL hook pipeline — no adapter mocks — so parsing, normalization,
// output wire shape, exit codes, and the stderr channel are all verified against reality, not
// against synthetic fixtures. Fixtures under fixtures/<ide>/ are verbatim copies of the RAW STDIN
// blocks from the corresponding log (see each fixture's originating session id).

import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { executeHook, type HookExecutionReport } from '../../src/runtime/run-hook';
import type { HookDefinition } from '../../src/runtime/types';

export type Env = Record<string, string | undefined>;

const FIXTURES = path.join(__dirname, 'fixtures');

/** Read a captured wire payload as its EXACT bytes — exercises readStdin's trim + JSON.parse of
 *  real input, not a re-serialized object. `rel` is relative to fixtures/, e.g. "claude-code/stop.json". */
export const rawFixture = (rel: string): string => fs.readFileSync(path.join(FIXTURES, rel), 'utf8');

/** Parse a fixture (e.g. an env.json) into an object. */
export const jsonFixture = <T = unknown>(rel: string): T =>
  JSON.parse(rawFixture(rel)) as T;

const streamOf = (raw: string): NodeJS.ReadableStream => Readable.from([raw]);

export interface RealRun {
  stdout: string[];
  report: HookExecutionReport;
}

/**
 * Drive the FULL real pipeline for one hook against one raw payload string, with NO mocks:
 *   readStdin(parse) → detectIDE → normalize → gates → run → toCanonical → formatOutput →
 *   resolveExitCode → stderrMessageFor.
 * `env` defaults to {} so detection is by payload SHAPE unless a test passes a real captured env
 * (matching executeHook's own default — tests must not leak the host shell's IDE env into detection).
 */
export const runReal = async (def: HookDefinition, raw: string, env: Env = {}): Promise<RealRun> => {
  const stdout: string[] = [];
  const report = await executeHook(def, {
    stdin: streamOf(raw),
    stdout: { write: (s: string) => { stdout.push(s); return true; } } as unknown as NodeJS.WritableStream,
    env,
  });
  return { stdout, report };
};
