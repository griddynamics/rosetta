import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TrajectoryEvent } from '../shared/trajectory';
import type { TranscriptViews } from '../agents/transcript-views';
import {
  suiteResultSchema,
  trialResultSchema,
  type SuiteResultInput,
  type TrialResult,
  type TrialResultInput,
} from './schema';

/**
 * Results store (§14): a timestamped run dir holding raw per-trial JSON + a suite
 * summary. Everything written is zod-validated first, so `report` can trust it.
 *
 *   <out>/run-2026-07-02T14-30-00Z/
 *     suite.json
 *     suite.md
 *     trials/<case>/<agent>/<repeat>/{trial.json,trajectory.jsonl,raw-transcript.jsonl,screen.log,workspace.diff}
 */

/** Format a run-dir timestamp: `2026-07-02T14-30-00Z` (ISO, ms dropped, `:`->`-`). */
export function runDirName(date: Date = new Date()): string {
  return `run-${date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-')}`;
}

/** Create (recursively) the timestamped run dir and its `trials/` subdir. */
export function createRunDir(outDir: string, date: Date = new Date()): string {
  const runDir = join(outDir, runDirName(date));
  mkdirSync(join(runDir, 'trials'), { recursive: true });
  return runDir;
}

/** Directory holding a single trial's artifacts. */
export function trialDir(runDir: string, result: Pick<TrialResult, 'case' | 'agent' | 'repeat'>): string {
  return join(runDir, 'trials', result.case, result.agent, String(result.repeat));
}

export interface TrialArtifacts {
  /** Normalized trajectory -> `trajectory.jsonl`. */
  trajectory?: TrajectoryEvent[];
  /** Raw native transcript text -> `raw-transcript.jsonl`. */
  rawTranscript?: string;
  /** Rendered screen snapshots (evidence) -> `screen.log`. */
  screen?: string;
  /** Unified workspace diff vs unzipped source -> `workspace.diff`. */
  diff?: string;
  /** Human-readable transcript views (built by the adapter, §14 addendum) ->
   *  `views/<name>.md`, one file per view. */
  views?: TranscriptViews;
}

/** Write one trial's `trial.json` (+ optional artifacts). Returns the trial dir. */
export function writeTrial(runDir: string, result: TrialResultInput, artifacts: TrialArtifacts = {}): string {
  const validated = trialResultSchema.parse(result);
  const dir = trialDir(runDir, validated);
  mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, 'trial.json'), `${JSON.stringify(validated, null, 2)}\n`, 'utf8');

  if (artifacts.trajectory) {
    const lines = artifacts.trajectory.map((e) => JSON.stringify(e)).join('\n');
    writeFileSync(join(dir, 'trajectory.jsonl'), lines.length > 0 ? `${lines}\n` : '', 'utf8');
  }
  if (artifacts.rawTranscript !== undefined) {
    writeFileSync(join(dir, 'raw-transcript.jsonl'), artifacts.rawTranscript, 'utf8');
  }
  if (artifacts.screen !== undefined) {
    writeFileSync(join(dir, 'screen.log'), artifacts.screen, 'utf8');
  }
  if (artifacts.diff !== undefined) {
    writeFileSync(join(dir, 'workspace.diff'), artifacts.diff, 'utf8');
  }
  if (artifacts.views !== undefined) {
    const viewsDir = join(dir, 'views');
    mkdirSync(viewsDir, { recursive: true });
    for (const [name, markdown] of Object.entries(artifacts.views)) {
      writeFileSync(join(viewsDir, `${name}.md`), markdown, 'utf8');
    }
  }

  return dir;
}

/** Write the suite summary `suite.json`. */
export function writeSuite(runDir: string, suite: SuiteResultInput): void {
  const validated = suiteResultSchema.parse(suite);
  writeFileSync(join(runDir, 'suite.json'), `${JSON.stringify(validated, null, 2)}\n`, 'utf8');
}

/** Write a human report file (e.g. `suite.md`) produced by a reporter. */
export function writeReportFile(runDir: string, filename: string, content: string): void {
  writeFileSync(join(runDir, filename), content, 'utf8');
}
