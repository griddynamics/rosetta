import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { runRun } from '../../src/cli/commands/run';
import { loadRun } from '../../src/results/loader';
import { ExitCode } from '../../src/cli/exit-codes';
import { mockProfile, REPO } from './helpers';

function readdirRuns(out: string): string[] {
  return readdirSync(out)
    .filter((n) => n.startsWith('run-'))
    .sort()
    .map((n) => join(out, n));
}

/**
 * CLI `run` end-to-end (§13, DoD): suite mode (`--source`) and inline mode
 * (`--prompt`) both drive the mock agent and produce a §14-shaped results dir. The
 * clean scene completes deterministically (task_complete marker) → zero LLM calls.
 */

const HELLO_ZIP = join(REPO, 'test/fixtures/cases/hello-world/src.zip');

function writeConfig(dir: string): string {
  const config = {
    codingagents: { mock: mockProfile('clean.json') },
  };
  const path = join(dir, 'curiocity.config.json');
  writeFileSync(path, JSON.stringify(config, null, 2));
  return path;
}

function writeCase(sourceDir: string, name: string): void {
  const dir = join(sourceDir, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'prompt.md'), 'Create out.txt containing hello world.');
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ agents: ['mock'] }));
  writeFileSync(join(dir, 'qna.md'), '# QnA\n- If unsure, abort.');
  writeFileSync(join(dir, 'evaluation.md'), '# Rubric\nout.txt exists.');
  copyFileSync(HELLO_ZIP, join(dir, 'src.zip'));
}

describe('cli run (end-to-end, mock agent)', () => {
  it('run --source produces a §14 results dir and exits 0', async () => {
    const work = mkdtempSync(join(tmpdir(), 'curio-cli-'));
    const config = writeConfig(work);
    const source = join(work, 'cases');
    mkdirSync(source);
    writeCase(source, 'hello');
    const out = join(work, 'results');

    const code = await runRun({ source, config, out });
    expect(code).toBe(ExitCode.OK);

    const runDir = readdirRuns(out)[0]!;
    expect(existsSync(join(runDir, 'suite.json'))).toBe(true);
    const loaded = loadRun(runDir);
    expect(loaded.trials).toHaveLength(1);
    expect(loaded.trials[0]!.status).toBe('passed');
    // §14 artifacts.
    const tdir = join(runDir, 'trials', 'hello', 'mock', '1');
    expect(existsSync(join(tdir, 'trial.json'))).toBe(true);
    expect(existsSync(join(tdir, 'trajectory.jsonl'))).toBe(true);
    expect(existsSync(join(tdir, 'workspace.diff'))).toBe(true);
  });

  it('run --prompt (inline) produces a §14 results dir and exits 0', async () => {
    const work = mkdtempSync(join(tmpdir(), 'curio-cli-inline-'));
    const config = writeConfig(work);
    const out = join(work, 'results');

    const code = await runRun({
      prompt: 'Create out.txt containing hello world.',
      agent: ['mock'],
      config,
      out,
    });
    expect(code).toBe(ExitCode.OK);

    const runDir = readdirRuns(out)[0]!;
    const loaded = loadRun(runDir);
    expect(loaded.trials).toHaveLength(1);
    expect(loaded.trials[0]!.status).toBe('passed');
    expect(loaded.trials[0]!.verdict).toBeUndefined(); // inline evaluate OFF (D9)
  });

  it('run --source with no runnable cases → exit 2 (no trials)', async () => {
    const work = mkdtempSync(join(tmpdir(), 'curio-cli-empty-'));
    const config = writeConfig(work);
    const source = join(work, 'cases');
    mkdirSync(source);
    // An incomplete case (missing files) is skipped → zero runnable trials.
    mkdirSync(join(source, 'incomplete'));
    writeFileSync(join(source, 'incomplete', 'prompt.md'), 'x');

    const code = await runRun({ source, config, out: join(work, 'results') });
    expect(code).toBe(ExitCode.CONFIG_ERROR);
  });
});
