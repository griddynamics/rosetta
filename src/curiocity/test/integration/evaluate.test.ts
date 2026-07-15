import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildMatrix } from '../../src/config/matrix';
import { resolveCaseConfig } from '../../src/config/merge';
import { caseConfigSchema, topLevelConfigSchema, type GateConfig, type PricingMap } from '../../src/config/schema';
import type { CaseDefinition } from '../../src/cases/types';
import { DEFAULT_GATE } from '../../src/config/defaults';
import { runSuite, type RunSuiteArgs } from '../../src/orchestrator/run';
import { runReport } from '../../src/cli/commands/report';
import { loadRun } from '../../src/results/loader';
import { trialSpecSchema, type TrialSpec } from '../../src/shared/ipc';
import type { FakeRouterScript } from '../../src/shared/model-router';
import { makeUsage } from '../../src/shared/trajectory';
import type { StatBlock } from '../../src/results/schema';
import { ExitCode } from '../../src/cli/exit-codes';
import { mockProfile, tmpRunDir } from './helpers';

/**
 * Integration (§7 step 7 / §11 / §12 / §13 / D8): the evaluate pipeline end-to-end
 * over the fork+PTY loop with the mock agent, judged by a scripted FakeModelRouter
 * (ZERO real LLM calls). Covers: judged pass → exit 0; judged fail → `failed` +
 * exit 1 (the M2 gap-fix); gated-failure → score-capped; report re-gate round-trip;
 * cost block itemization + pricing/$ vs tokens-only.
 */

const SONNET_PRICING: PricingMap = { 'anthropic/sonnet': { inputPer1M: 3, outputPer1M: 15 } };

function judgeScript(score: number, pass: boolean): FakeRouterScript {
  return {
    entries: [
      {
        role: 'judge',
        kind: 'object',
        object: { score, pass, rationale: 'scripted judge', confidenceLevel: 85 },
        usage: makeUsage({ input: 1000, output: 500 }),
      },
    ],
  };
}

/** Judge script with NO perplexity signal (no logprobs) but a specific resolved model id —
 *  drives the llm-judge one-time "no logprobs" warning, keyed by that model. */
function judgeScriptNoLogprobs(model?: string): FakeRouterScript {
  return {
    entries: [
      {
        role: 'judge',
        kind: 'object',
        object: { score: 82, pass: true, rationale: 'scripted judge', confidenceLevel: 85 },
        usage: makeUsage({ input: 10, output: 5 }),
        ...(model !== undefined ? { model } : {}),
      },
    ],
  };
}

interface JudgedCase {
  name: string;
  scene: string;
  evaluators: Record<string, unknown>[];
  script: FakeRouterScript;
}

function judgedInputs(opts: {
  cases: JudgedCase[];
  gate?: GateConfig;
  pricing?: PricingMap;
  collectCost?: boolean;
}): RunSuiteArgs {
  // One profile per scene so each case drives the intended mock scene.
  const profiles: Record<string, Record<string, unknown>> = {};
  for (const c of opts.cases) profiles[c.name] = mockProfile(c.scene);

  const scriptByCase = new Map(opts.cases.map((c) => [c.name, c.script]));

  const topLevel = topLevelConfigSchema.parse({
    codingagents: profiles,
    models: { fast: 'anthropic/haiku', workhorse: 'anthropic/sonnet' },
    ...(opts.pricing ? { pricing: opts.pricing } : {}),
  });

  const cases: CaseDefinition[] = opts.cases.map((c) => ({
    name: c.name,
    ephemeral: false,
    prompt: 'Create out.txt containing hello world.',
    qna: 'If unsure, abort.',
    evaluation: '# Rubric\nThe file out.txt must exist and contain the greeting.',
    config: caseConfigSchema.parse({ agents: [c.name], evaluators: c.evaluators }),
  }));

  const resolvedCases = cases.map((c) =>
    resolveCaseConfig({ caseName: c.name, topLevel, caseConfig: c.config, evaluateDefault: true }),
  );
  const matrix = buildMatrix({ topLevel, cases: resolvedCases });
  const gate = opts.gate ?? DEFAULT_GATE;

  return {
    topLevel,
    cases,
    resolvedCases,
    matrix,
    out: tmpRunDir(),
    concurrency: 2,
    gate,
    collectCost: opts.collectCost ?? true,
    ...(topLevel.pricing ? { pricing: topLevel.pricing } : {}),
    keys: {},
    configDir: process.cwd(),
    keepWorkspace: false,
    mirror: false,
    configSnapshot: { globals: { gate }, ...(topLevel.pricing ? { pricing: topLevel.pricing } : {}) },
    specDecorator: (spec: TrialSpec) =>
      trialSpecSchema.parse({ ...spec, fakeRouter: scriptByCase.get(spec.caseName) }),
  };
}

function costBlock(groups: StatBlock[]): Record<string, unknown> | undefined {
  return groups.find((g) => g.id === 'cost-rollup') as Record<string, unknown> | undefined;
}

describe('evaluate pipeline (judged, token-free)', () => {
  it('passing judged case → status passed, verdict, exit 0; cost block itemized + priced', async () => {
    const inputs = judgedInputs({
      pricing: SONNET_PRICING,
      cases: [
        {
          name: 'pass',
          scene: 'clean.json',
          evaluators: [
            { use: 'file-exists', must: ['out.txt'], gate: true },
            { use: 'llm-judge', artifacts: ['out.txt'], weight: 1 },
          ],
          script: judgeScript(82, true),
        },
      ],
    });
    const res = await runSuite(inputs);
    expect(res.exitCode).toBe(ExitCode.OK);
    expect(res.trials[0]!.status).toBe('passed');
    expect(res.trials[0]!.verdict).toMatchObject({ pass: true, score: 82 });

    // Cost block (§12): agent usage + harness judge usage + resolved model.
    const cost = res.trials[0]!.cost!;
    expect(cost.judge).toMatchObject({ input: 1000, output: 500, total: 1500 });
    expect((cost.models as Record<string, string>).judge).toBe('anthropic/sonnet');

    // Time breakdown (§12): agent-pure runtime is MEASURED from the per-turn timeline
    // (populated, not always 0) and harness-LLM time is a distinct field.
    // Strictly > 0 (not >= 0, a trivial bound any hardcoded-zero bug would also pass):
    // turn 1's turnStart now anchors at PTY spawn (R2), and real fork+PTY wall clock
    // to the Stop signal is never exactly zero.
    const timings = res.trials[0]!.timings!;
    expect(timings.agentPureMs).toBeGreaterThan(0);
    expect(timings.timeline!.length).toBeGreaterThan(0);
    expect(typeof timings.harnessLlmMs).toBe('number');

    // suite.json cost-rollup priced from the fixture.
    const loaded = loadRun(res.runDir);
    const cr = costBlock(loaded.suite.groups)!;
    expect(cr.usd).toBeCloseTo((1000 / 1e6) * 3 + (500 / 1e6) * 15, 6);
    expect(existsSync(join(res.runDir, 'suite.md'))).toBe(true);
  });

  it('judged FAIL → status failed and exit 1 (M2 gap-fix)', async () => {
    const inputs = judgedInputs({
      cases: [
        {
          name: 'fail',
          scene: 'clean.json',
          evaluators: [{ use: 'llm-judge', artifacts: ['out.txt'] }],
          script: judgeScript(20, false),
        },
      ],
    });
    const res = await runSuite(inputs);
    expect(res.trials[0]!.status).toBe('failed');
    expect(res.trials[0]!.verdict).toMatchObject({ pass: false, score: 20 });
    expect(res.exitCode).toBe(ExitCode.GATE_FAILURE);
  });

  it('gated-failure → score capped at 40 even with a high judge score', async () => {
    const inputs = judgedInputs({
      cases: [
        {
          name: 'gated',
          scene: 'no-output.json', // never creates out.txt → file-exists gate fails
          evaluators: [
            { use: 'file-exists', must: ['out.txt'], gate: true },
            { use: 'llm-judge', artifacts: ['out.txt'] },
          ],
          script: judgeScript(90, true),
        },
      ],
    });
    const res = await runSuite(inputs);
    expect(res.trials[0]!.status).toBe('failed');
    expect(res.trials[0]!.verdict!.score).toBe(40);
    expect(res.trials[0]!.verdict!.pass).toBe(false);
  });

  it('evaluator THROWS → status eval-error, verdict absent, error flag, exit 3 (Feature A)', async () => {
    const inputs = judgedInputs({
      cases: [
        {
          name: 'judge-throws',
          scene: 'clean.json',
          evaluators: [{ use: 'llm-judge', artifacts: ['out.txt'] }],
          // Empty script → the judge's generateObject throws (mirrors a live
          // insufficient_quota key). This is an infra error, not a low score.
          script: { entries: [] },
        },
      ],
    });
    const res = await runSuite(inputs);
    expect(res.trials[0]!.status).toBe('eval-error');
    expect(res.trials[0]!.verdict).toBeUndefined();
    const judge = res.trials[0]!.evaluators.find((e) => e.id === 'llm-judge')!;
    expect(judge.error).toBe(true);
    expect(judge.pass).toBe(false);
    // Excluded from score gates; drives partial-infra exit 3 (§13).
    expect(res.exitCode).toBe(ExitCode.PARTIAL_INFRA);

    // report re-derives the same eval-error consequence purely from stored trials (D8).
    expect(runReport(res.runDir, { gate: DEFAULT_GATE })).toBe(ExitCode.PARTIAL_INFRA);
    // suite.md renders the eval-error status + the flagged evaluator.
    const md = readFileSync(join(res.runDir, 'suite.md'), 'utf8');
    expect(md).toContain('eval-error');
    expect(md).toContain('llm-judge ⚠ error');
  });

  it('a GATED evaluator failing CLEANLY stays plain failed + exit 1 (no eval-error regression)', async () => {
    const inputs = judgedInputs({
      cases: [
        {
          name: 'gated-clean-fail',
          scene: 'no-output.json', // never creates out.txt → file-exists gate fails cleanly
          evaluators: [{ use: 'file-exists', must: ['out.txt'], gate: true }],
          script: { entries: [] }, // no judge → no LLM call at all
        },
      ],
    });
    const res = await runSuite(inputs);
    expect(res.trials[0]!.status).toBe('failed');
    expect(res.trials[0]!.evaluators.every((e) => e.error === undefined)).toBe(true);
    expect(res.exitCode).toBe(ExitCode.GATE_FAILURE);
  });

  it('report re-gates with changed thresholds without re-running trials (D8)', async () => {
    const inputs = judgedInputs({
      cases: [
        {
          name: 'pass',
          scene: 'clean.json',
          evaluators: [{ use: 'llm-judge', artifacts: ['out.txt'] }],
          script: judgeScript(82, true),
        },
      ],
    });
    const res = await runSuite(inputs);
    expect(res.exitCode).toBe(ExitCode.OK);

    // Same stored trials, stricter minScore → gate flips to failure. No re-run.
    const strict = runReport(res.runDir, { gate: { minScore: 90, minPassRate: 0.8, maxStddev: 10 } });
    expect(strict).toBe(ExitCode.GATE_FAILURE);

    // Lenient again → passes; proves the gatekeeper is a pure function of trials.
    const lenient = runReport(res.runDir, { gate: DEFAULT_GATE });
    expect(lenient).toBe(ExitCode.OK);

    // Report re-rendered the suite files.
    const reloaded = loadRun(res.runDir);
    expect(reloaded.suite.gate?.exitCode).toBe(ExitCode.OK);
  });

  it('cost: report without --config recovers pricing from the stored snapshot (keeps $)', async () => {
    const inputs = judgedInputs({
      pricing: SONNET_PRICING,
      cases: [
        {
          name: 'pass',
          scene: 'clean.json',
          evaluators: [{ use: 'llm-judge', artifacts: ['out.txt'] }],
          script: judgeScript(82, true),
        },
      ],
    });
    const res = await runSuite(inputs);

    // No pricing/config override → pricing must be recovered from the snapshot,
    // not regressed to tokens-only.
    runReport(res.runDir, { gate: DEFAULT_GATE });
    const suite = JSON.parse(readFileSync(join(res.runDir, 'suite.json'), 'utf8'));
    const cr = (suite.groups as StatBlock[]).find((g) => g.id === 'cost-rollup') as Record<string, unknown>;
    expect(cr.usd).toBeGreaterThan(0);
    // The harness judge model is priced; the mock agent's own model is now tracked
    // per-source (§12) and, being absent from the pricing map, is reported tokens-only.
    expect(cr.unpricedModels).toEqual(['mock-model']);
  });

  it('run-level dedup: the same once:true child log surfaces exactly once across trials', async () => {
    // Two forked trials each run llm-judge with a no-logprobs judge → each child emits the
    // SAME `once:true` "perplexityLevel unavailable" warning (same model key). The child's
    // per-process Set cannot span the run, so runSuite must collapse it to a single emission.
    const logs: { msg: string; fields?: Record<string, unknown> }[] = [];
    const inputs = judgedInputs({
      cases: [
        { name: 'a', scene: 'clean.json', evaluators: [{ use: 'llm-judge', artifacts: ['out.txt'] }], script: judgeScriptNoLogprobs('anthropic/sonnet') },
        { name: 'b', scene: 'clean.json', evaluators: [{ use: 'llm-judge', artifacts: ['out.txt'] }], script: judgeScriptNoLogprobs('anthropic/sonnet') },
      ],
    });
    inputs.onLog = (msg, fields) => logs.push({ msg, ...(fields ? { fields } : {}) });
    await runSuite(inputs);
    const warns = logs.filter((l) => l.fields?.['once'] === true && l.msg.includes('perplexityLevel unavailable'));
    expect(warns).toHaveLength(1);
  });

  it('run-level dedup: two DIFFERENT once:true messages both surface', async () => {
    const logs: { msg: string; fields?: Record<string, unknown> }[] = [];
    const inputs = judgedInputs({
      cases: [
        { name: 'a', scene: 'clean.json', evaluators: [{ use: 'llm-judge', artifacts: ['out.txt'] }], script: judgeScriptNoLogprobs('anthropic/haiku') },
        { name: 'b', scene: 'clean.json', evaluators: [{ use: 'llm-judge', artifacts: ['out.txt'] }], script: judgeScriptNoLogprobs('anthropic/opus') },
      ],
    });
    inputs.onLog = (msg, fields) => logs.push({ msg, ...(fields ? { fields } : {}) });
    await runSuite(inputs);
    const warns = logs.filter((l) => l.fields?.['once'] === true && l.msg.includes('perplexityLevel unavailable'));
    expect(warns).toHaveLength(2);
    expect(new Set(warns.map((w) => w.msg)).size).toBe(2);
  });

  it('cost: report with an incomplete pricing map reports the model tokens-only', async () => {
    const inputs = judgedInputs({
      pricing: SONNET_PRICING,
      cases: [
        {
          name: 'pass',
          scene: 'clean.json',
          evaluators: [{ use: 'llm-judge', artifacts: ['out.txt'] }],
          script: judgeScript(82, true),
        },
      ],
    });
    const res = await runSuite(inputs);

    // Re-report with an empty pricing map → sonnet is now unpriced (tokens-only).
    runReport(res.runDir, { pricing: {}, gate: DEFAULT_GATE });
    const suite = JSON.parse(readFileSync(join(res.runDir, 'suite.json'), 'utf8'));
    const cr = (suite.groups as StatBlock[]).find((g) => g.id === 'cost-rollup') as Record<string, unknown>;
    expect(cr.usd).toBeUndefined();
    expect(cr.unpricedModels).toContain('anthropic/sonnet');
  });
});
