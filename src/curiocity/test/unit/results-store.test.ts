import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRunDir, runDirName, writeTrial, writeSuite } from '../../src/results/store';
import { loadRun } from '../../src/results/loader';
import { SCHEMA_VERSION, type SuiteResult, type TrialResult } from '../../src/results/schema';

const tmp = mkdtempSync(join(tmpdir(), 'curiocity-results-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('runDirName', () => {
  it('formats a timestamped, filesystem-safe run dir name', () => {
    const name = runDirName(new Date('2026-07-02T14:30:00.000Z'));
    expect(name).toBe('run-2026-07-02T14-30-00Z');
  });
});

describe('results store roundtrip (§14)', () => {
  it('writes trial + suite artifacts and loads them back validated', () => {
    const runDir = createRunDir(tmp, new Date('2026-07-02T14:30:00.000Z'));
    expect(existsSync(join(runDir, 'trials'))).toBe(true);

    const trial: TrialResult = {
      schemaVersion: SCHEMA_VERSION,
      agent: 'claude-code',
      case: 'hello-world',
      repeat: 1,
      status: 'passed',
      verdict: { pass: true, score: 100, rationale: 'ok' },
      evaluators: [{ id: 'file-exists', pass: true, gate: true, details: 'found out.txt' }],
      turnCount: 3,
      qna: [{ type: 'free-text', question: 'proceed?', answer: 'yes', ts: 1 }],
    };

    const trialPath = writeTrial(runDir, trial, {
      trajectory: [{ ts: 1, kind: 'assistant', payload: { text: 'hi' } }],
      rawTranscript: '{"raw":true}\n',
      screen: 'SCREEN',
      diff: 'diff --git a b',
    });
    expect(existsSync(join(trialPath, 'trial.json'))).toBe(true);
    expect(existsSync(join(trialPath, 'trajectory.jsonl'))).toBe(true);
    expect(existsSync(join(trialPath, 'raw-transcript.jsonl'))).toBe(true);
    expect(existsSync(join(trialPath, 'screen.log'))).toBe(true);
    expect(existsSync(join(trialPath, 'workspace.diff'))).toBe(true);
    expect(readFileSync(join(trialPath, 'trajectory.jsonl'), 'utf8').trim().split('\n')).toHaveLength(1);

    const suite: SuiteResult = {
      schemaVersion: SCHEMA_VERSION,
      runDir,
      createdAt: '2026-07-02T14:30:00.000Z',
      config: { note: 'snapshot' },
      matrix: [{ case: 'hello-world', agent: 'claude-code', repeat: 1 }],
      groups: [],
    };
    writeSuite(runDir, suite);
    expect(existsSync(join(runDir, 'suite.json'))).toBe(true);

    const loaded = loadRun(runDir);
    expect(loaded.suite.matrix).toEqual(suite.matrix);
    expect(loaded.suite.config).toEqual({ note: 'snapshot' });
    expect(loaded.trials).toHaveLength(1);
    expect(loaded.trials[0]).toEqual(trial);
  });

  it('roundtrips multiple trials in deterministic order', () => {
    const runDir = createRunDir(tmp, new Date('2026-07-02T15:00:00.000Z'));
    const base = { schemaVersion: SCHEMA_VERSION, status: 'failed' as const };
    writeTrial(runDir, { ...base, agent: 'codex', case: 'b', repeat: 1 });
    writeTrial(runDir, { ...base, agent: 'claude-code', case: 'a', repeat: 2 });
    writeTrial(runDir, { ...base, agent: 'claude-code', case: 'a', repeat: 1 });
    writeSuite(runDir, {
      schemaVersion: SCHEMA_VERSION,
      runDir,
      createdAt: 'x',
      config: {},
      matrix: [],
      groups: [],
    });
    const loaded = loadRun(runDir);
    expect(loaded.trials.map((t) => `${t.case}/${t.agent}/${t.repeat}`)).toEqual([
      'a/claude-code/1',
      'a/claude-code/2',
      'b/codex/1',
    ]);
  });
});

describe('loadRun — report edge cases (D8, §14): fail fast with a clear ConfigError', () => {
  it('nonexistent run dir → ConfigError', () => {
    expect(() => loadRun(join(tmp, 'no-such-run-dir'))).toThrow(/run dir not found/i);
  });

  it('a file path (not a directory) → ConfigError', () => {
    const f = join(tmp, 'not-a-dir.txt');
    writeFileSync(f, 'x');
    expect(() => loadRun(f)).toThrow(/run dir not found/i);
  });

  it('run dir with no suite.json → ConfigError', () => {
    const runDir = createRunDir(tmp, new Date('2026-07-02T16:00:00.000Z'));
    expect(() => loadRun(runDir)).toThrow(/no suite\.json/i);
  });

  it('invalid suite.json (schema mismatch) → ConfigError', () => {
    const runDir = createRunDir(tmp, new Date('2026-07-02T16:05:00.000Z'));
    writeFileSync(join(runDir, 'suite.json'), JSON.stringify({ not: 'a suite' }));
    expect(() => loadRun(runDir)).toThrow(/invalid suite\.json/i);
  });

  it('invalid trial.json (schema mismatch) → ConfigError naming the file', () => {
    const runDir = createRunDir(tmp, new Date('2026-07-02T16:10:00.000Z'));
    writeSuite(runDir, {
      schemaVersion: SCHEMA_VERSION,
      runDir,
      createdAt: 'x',
      config: {},
      matrix: [],
      groups: [],
    });
    const badDir = join(runDir, 'trials', 'c', 'a', '1');
    mkdirSync(badDir, { recursive: true });
    writeFileSync(join(badDir, 'trial.json'), JSON.stringify({ garbage: true }));
    expect(() => loadRun(runDir)).toThrow(/invalid trial\.json/i);
  });

  it('run dir with a valid suite but an empty trials tree → zero trials, no throw', () => {
    const runDir = createRunDir(tmp, new Date('2026-07-02T16:15:00.000Z'));
    writeSuite(runDir, {
      schemaVersion: SCHEMA_VERSION,
      runDir,
      createdAt: 'x',
      config: {},
      matrix: [],
      groups: [],
    });
    const loaded = loadRun(runDir);
    expect(loaded.trials).toEqual([]);
  });
});
