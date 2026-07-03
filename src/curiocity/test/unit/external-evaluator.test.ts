import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { describe, it, expect } from 'vitest';
import { external } from '../../src/evaluators/external';
import { metrics as metricsStat } from '../../src/stats/metrics';
import type { EvalContext } from '../../src/evaluators/types';
import { FakeModelRouter } from '../../src/shared/model-router';
import { trialResultSchema, type TrialResultInput } from '../../src/results/schema';

/**
 * `external` evaluator (§11): full hook-style contract — happy path, every error path
 * (non-zero exit, bad JSON, out-of-range value, timeout), the scoring integration
 * (scoreMetric/passThreshold), the metrics rollup stat, and the shipped demo script.
 */

const NODE = process.execPath;
const DEMO_SCRIPT = fileURLToPath(
  new URL('../../demo/cases/healthcheck/count-changed-files.mjs', import.meta.url),
);

function ctx(over: Partial<EvalContext> = {}): EvalContext {
  return {
    workspace: over.workspace ?? mkdtempSync(join(tmpdir(), 'curio-ext-ws-')),
    workspaceDiff: over.workspaceDiff ?? '',
    events: over.events ?? [],
    qnaLog: over.qnaLog ?? [],
    caseFiles: over.caseFiles ?? { promptMd: 'do it' },
    agentId: over.agentId ?? 'mock',
    models: over.models ?? new FakeModelRouter({ entries: [] }),
    exec: execa,
    ...(over.rawTranscriptPath !== undefined ? { rawTranscriptPath: over.rawTranscriptPath } : {}),
    ...(over.caseDir !== undefined ? { caseDir: over.caseDir } : {}),
    ...(over.agentModel !== undefined ? { agentModel: over.agentModel } : {}),
    ...(over.sessionId !== undefined ? { sessionId: over.sessionId } : {}),
  };
}

/** A node `-e` script that reads the stdin JSON and prints the given stdout string. */
function emit(stdout: string): { command: string; args: string[] } {
  return { command: NODE, args: ['-e', `require("fs").readFileSync(0,"utf8");process.stdout.write(${JSON.stringify(stdout)})`] };
}

describe('external evaluator — happy path + contract', () => {
  it('records normalized metrics; informational (no score) when scoreMetric is unset', async () => {
    const { command, args } = emit(JSON.stringify({ values: [{ name: 'coverage', value: 73 }, { name: 'lint', value: 100 }] }));
    const res = await external.evaluate(ctx(), { command, args });
    expect(res.pass).toBe(true);
    expect(res.score).toBeUndefined();
    expect(res.metrics).toEqual([
      { name: 'coverage', value: 73 },
      { name: 'lint', value: 100 },
    ]);
  });

  it('passes the full identity/path payload on stdin (echoed back through a metric)', async () => {
    // The script parses stdin and asserts the required keys are present; emits 100 iff ok.
    const script =
      'const o=JSON.parse(require("fs").readFileSync(0,"utf8"));' +
      'const keys=["workspacePath","workspaceDiffPath","trajectoryPath","rawTranscriptPath","qnaLogPath","caseDir","agentId","agentModel","sessionId"];' +
      'const ok=keys.every(k=>k in o)&&o.agentId==="claude-code"&&o.agentModel==="haiku"&&o.sessionId==="sid-1";' +
      'process.stdout.write(JSON.stringify({values:[{name:"ok",value:ok?100:0}]}))';
    const res = await external.evaluate(
      ctx({ agentId: 'claude-code', agentModel: 'haiku', sessionId: 'sid-1' }),
      { command: NODE, args: ['-e', script] },
    );
    expect(res.metrics).toEqual([{ name: 'ok', value: 100 }]);
  });
});

describe('external evaluator — scoring integration', () => {
  it('scoreMetric designates the score; passThreshold derives pass (fail)', async () => {
    const { command, args } = emit(JSON.stringify({ values: [{ name: 'q', value: 42 }] }));
    const res = await external.evaluate(ctx(), { command, args, scoreMetric: 'q', passThreshold: 60 });
    expect(res.score).toBe(42);
    expect(res.pass).toBe(false);
  });

  it('scoreMetric + passThreshold (pass)', async () => {
    const { command, args } = emit(JSON.stringify({ values: [{ name: 'q', value: 80 }] }));
    const res = await external.evaluate(ctx(), { command, args, scoreMetric: 'q', passThreshold: 60 });
    expect(res.score).toBe(80);
    expect(res.pass).toBe(true);
  });

  it('missing scoreMetric in output → evaluator error', async () => {
    const { command, args } = emit(JSON.stringify({ values: [{ name: 'other', value: 10 }] }));
    await expect(external.evaluate(ctx(), { command, args, scoreMetric: 'q' })).rejects.toThrow();
  });
});

describe('external evaluator — error paths (gate-aware via pipeline)', () => {
  it('non-zero exit → error', async () => {
    await expect(
      external.evaluate(ctx(), { command: NODE, args: ['-e', 'process.exit(3)'] }),
    ).rejects.toThrow(/exited 3/);
  });

  it('invalid JSON stdout → error', async () => {
    const { command, args } = emit('this is not json');
    await expect(external.evaluate(ctx(), { command, args })).rejects.toThrow(/invalid JSON/);
  });

  it('metric value out of 0-100 → error', async () => {
    const { command, args } = emit(JSON.stringify({ values: [{ name: 'x', value: 150 }] }));
    await expect(external.evaluate(ctx(), { command, args })).rejects.toThrow(/out of range/);
  });

  it('timeout → error', async () => {
    await expect(
      external.evaluate(ctx(), { command: NODE, args: ['-e', 'setTimeout(()=>{},10000)'], timeoutSec: 0.3 }),
    ).rejects.toThrow(/timed out/);
  });
});

describe('external evaluator — shipped demo script (counts files changed)', () => {
  it('counts `+++`/`Only in` lines from the workspace diff → a normalized metric', async () => {
    const diff = [
      '--- a/one.txt',
      '+++ b/one.txt',
      '@@ -1 +1 @@',
      '--- a/two.txt',
      '+++ b/two.txt',
      'Only in b: three.txt',
    ].join('\n');
    const res = await external.evaluate(ctx({ workspaceDiff: diff }), {
      command: NODE,
      args: [DEMO_SCRIPT],
    });
    expect(res.metrics).toEqual([{ name: 'files-changed', value: 3 }]);
    expect(res.pass).toBe(true);
  });
});

describe('metrics rollup stat (§11)', () => {
  function trial(over: Partial<TrialResultInput>) {
    return trialResultSchema.parse({
      schemaVersion: 2,
      agent: 'mock',
      case: 'c',
      repeat: 1,
      status: 'passed',
      ...over,
    });
  }

  it('rolls up per metric name across trials: mean/min/max/stddev/count', () => {
    const group = [
      trial({ repeat: 1, evaluators: [{ id: 'external', pass: true, gate: false, details: '', metrics: [{ name: 'files-changed', value: 2 }] }] }),
      trial({ repeat: 2, evaluators: [{ id: 'external', pass: true, gate: false, details: '', metrics: [{ name: 'files-changed', value: 4 }] }] }),
    ];
    const block = metricsStat.compute(group, { gate: { minScore: 0, minPassRate: 0, maxStddev: 0 } }) as Record<string, unknown>;
    const named = block['metrics'] as Record<string, { mean: number; min: number; max: number; stddev: number; count: number }>;
    expect(named['files-changed']).toEqual({ mean: 3, min: 2, max: 4, stddev: 1, count: 2 });
  });
});
