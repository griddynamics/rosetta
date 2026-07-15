import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it, expect } from 'vitest';
import { runEvaluatorPipeline, type EvaluatePipelineArgs } from '../../src/curion/evaluate';
import { FakeModelRouter } from '../../src/shared/model-router';
import { evalResultSchema, trialResultSchema } from '../../src/results/schema';

/**
 * Feature A unit coverage: an evaluator that THROWS is an infra error — its record is
 * flagged `error:true` and the pipeline surfaces `errored:true` (→ trial `eval-error`,
 * §7). A clean non-passing result NEVER carries the flag. Plus schema round-trips proving
 * the optional `error` field is backward-compatible (old records without it still parse).
 */

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function emptyWorkspace(): string {
  const d = mkdtempSync(join(tmpdir(), 'curio-evalerr-'));
  dirs.push(d);
  return d;
}

function baseArgs(over: Partial<EvaluatePipelineArgs>): EvaluatePipelineArgs {
  return {
    enabled: true,
    workspace: emptyWorkspace(),
    workspaceDiff: '',
    events: [],
    qna: [],
    evaluators: [],
    combiner: 'gated-mean',
    caseFiles: { promptMd: 'do the thing', evaluationMd: '# rubric' },
    agentId: 'mock',
    router: new FakeModelRouter({ entries: [] }),
    ...over,
  };
}

describe('evaluate pipeline: eval-error flagging (Feature A)', () => {
  it('marks error:true + errored when an evaluator THROWS (judge router exhausted)', async () => {
    // Empty FakeModelRouter script → the judge's generateObject call throws.
    const out = await runEvaluatorPipeline(
      baseArgs({ evaluators: [{ use: 'llm-judge', artifacts: [] }] }),
    );
    expect(out.errored).toBe(true);
    const judge = out.evaluators.find((e) => e.id === 'llm-judge')!;
    expect(judge.error).toBe(true);
    expect(judge.pass).toBe(false);
    expect(judge.score).toBeUndefined();
    expect(judge.details).toMatch(/errored/);
  });

  it('a clean non-passing result carries NO error flag and does not set errored', async () => {
    // file-exists on an empty workspace → missing file → clean pass:false (no throw).
    const out = await runEvaluatorPipeline(
      baseArgs({ evaluators: [{ use: 'file-exists', must: ['nope.txt'] }] }),
    );
    expect(out.errored).toBeUndefined();
    const fe = out.evaluators.find((e) => e.id === 'file-exists')!;
    expect(fe.pass).toBe(false);
    expect(fe.error).toBeUndefined();
  });

  it('mixed: one clean fail + one throw → only the thrower is flagged, errored:true', async () => {
    const out = await runEvaluatorPipeline(
      baseArgs({
        evaluators: [
          { use: 'file-exists', must: ['nope.txt'] },
          { use: 'llm-judge', artifacts: [] },
        ],
      }),
    );
    expect(out.errored).toBe(true);
    expect(out.evaluators.find((e) => e.id === 'file-exists')!.error).toBeUndefined();
    expect(out.evaluators.find((e) => e.id === 'llm-judge')!.error).toBe(true);
  });
});

describe('schema round-trip: optional `error` field is backward-compatible', () => {
  it('an OLD record (no error field) parses; error stays undefined', () => {
    const rec = evalResultSchema.parse({ id: 'llm-judge', pass: true, gate: false, details: 'ok' });
    expect(rec.error).toBeUndefined();
  });

  it('a NEW record carrying error:true parses and round-trips', () => {
    const rec = evalResultSchema.parse({
      id: 'llm-judge',
      pass: false,
      gate: false,
      details: 'evaluator "llm-judge" errored: insufficient_quota',
      error: true,
    });
    expect(rec.error).toBe(true);
  });

  it('a full trial with an eval-error status + flagged evaluator parses', () => {
    const trial = trialResultSchema.parse({
      schemaVersion: 2,
      agent: 'mock',
      case: 'c',
      repeat: 1,
      status: 'eval-error',
      evaluators: [{ id: 'llm-judge', pass: false, gate: false, details: 'errored', error: true }],
    });
    expect(trial.status).toBe('eval-error');
    expect(trial.verdict).toBeUndefined();
    expect(trial.evaluators[0]!.error).toBe(true);
  });
});
