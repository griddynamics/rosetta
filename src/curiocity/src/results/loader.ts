import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ConfigError } from '../shared/errors';
import {
  suiteResultSchema,
  trialResultSchema,
  type SuiteResult,
  type TrialResult,
} from './schema';

/**
 * Loader for `curiocity report` (D8, §14): read a stored run dir back into a
 * validated `SuiteResult` + all `TrialResult`s. `report` then recomputes stats +
 * reporters + gate from these — it never re-runs agents or evaluators.
 */
export interface LoadedRun {
  runDir: string;
  suite: SuiteResult;
  trials: TrialResult[];
}

function readTrialFiles(trialsDir: string): TrialResult[] {
  const trials: TrialResult[] = [];
  if (!existsSync(trialsDir)) return trials;

  // Layout: trials/<case>/<agent>/<repeat>/trial.json — recurse and pick up trial.json.
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === 'trial.json') {
        const raw = JSON.parse(readFileSync(full, 'utf8'));
        const parsed = trialResultSchema.safeParse(raw);
        if (!parsed.success) {
          throw new ConfigError(`Invalid trial.json at ${full}:\n${parsed.error.message}`);
        }
        trials.push(parsed.data);
      }
    }
  };
  walk(trialsDir);

  // Deterministic order: case, agent, repeat.
  trials.sort(
    (a, b) =>
      a.case.localeCompare(b.case) ||
      a.agent.localeCompare(b.agent) ||
      a.repeat - b.repeat,
  );
  return trials;
}

export function loadRun(runDirPath: string): LoadedRun {
  const runDir = resolve(runDirPath);
  if (!existsSync(runDir) || !statSync(runDir).isDirectory()) {
    throw new ConfigError(`Results run dir not found: ${runDir}`);
  }

  const suitePath = join(runDir, 'suite.json');
  if (!existsSync(suitePath)) {
    throw new ConfigError(`No suite.json in run dir: ${runDir}`);
  }
  const suiteParsed = suiteResultSchema.safeParse(JSON.parse(readFileSync(suitePath, 'utf8')));
  if (!suiteParsed.success) {
    throw new ConfigError(`Invalid suite.json at ${suitePath}:\n${suiteParsed.error.message}`);
  }

  return {
    runDir,
    suite: suiteParsed.data,
    trials: readTrialFiles(join(runDir, 'trials')),
  };
}
