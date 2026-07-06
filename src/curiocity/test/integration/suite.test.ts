import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, it, expect } from 'vitest';
import { buildMatrix } from '../../src/config/matrix';
import { resolveCaseConfig } from '../../src/config/merge';
import { caseConfigSchema, topLevelConfigSchema, type GateConfig } from '../../src/config/schema';
import type { CaseDefinition } from '../../src/cases/types';
import { DEFAULT_GATE } from '../../src/config/defaults';
import { runSuite } from '../../src/orchestrator/run';
import { loadRun } from '../../src/results/loader';
import { ExitCode } from '../../src/cli/exit-codes';
import { listTmpAgentDirs, mockProfile, sweepNewTmpAgentDirs, tmpRunDir } from './helpers';

// This suite intentionally produces retained (setup-error / timeout) trials whose
// workspace + ctrl dir are kept per §7; sweep the ones it created so a full vitest run
// shows no `curiocity-ws-*`/`curiocity-ctrl-*` growth (Part 3.3).
const tmpBaseline = new Set(listTmpAgentDirs());
afterAll(() => sweepNewTmpAgentDirs(tmpBaseline));

/**
 * Suite-level integration (§4/§13/§14): the bounded pool, fork+env-scrub, exit
 * codes, skipped cells, and the §14 results-dir shape. Deterministic, token-free —
 * scenes reach completion without any LLM call.
 */

interface CaseSpec {
  name: string;
  agents: string[];
  setup?: string[];
  timeoutSec?: number;
}

function buildInputs(opts: {
  profiles: Record<string, Record<string, unknown>>;
  cases: CaseSpec[];
  gate?: GateConfig;
}) {
  const topLevel = topLevelConfigSchema.parse({ codingagents: opts.profiles });
  const cases: CaseDefinition[] = opts.cases.map((c) => ({
    name: c.name,
    ephemeral: false,
    prompt: 'Create out.txt containing hello world.',
    qna: 'If unsure, abort.',
    config: caseConfigSchema.parse({
      agents: c.agents,
      ...(c.setup ? { setup: c.setup } : {}),
      ...(c.timeoutSec ? { timeoutSec: c.timeoutSec } : {}),
    }),
  }));
  const resolvedCases = cases.map((c) =>
    resolveCaseConfig({ caseName: c.name, topLevel, caseConfig: c.config, evaluateDefault: false }),
  );
  const matrix = buildMatrix({ topLevel, cases: resolvedCases });
  return {
    topLevel,
    cases,
    resolvedCases,
    matrix,
    out: tmpRunDir(),
    concurrency: 2,
    gate: opts.gate ?? DEFAULT_GATE,
    configDir: process.cwd(),
    keepWorkspace: false,
    mirror: false,
    configSnapshot: {},
  };
}

function failingSetupScript(): string {
  const dir = mkdtempSync(join(tmpdir(), 'curio-setup-'));
  const path = join(dir, 'fail.sh');
  writeFileSync(path, '#!/bin/sh\necho "boom" >&2\nexit 3\n');
  chmodSync(path, 0o755);
  return path;
}

describe('runSuite (orchestrator)', () => {
  it('concurrency 2, two clean cases → all passed, vacuous gate → exit 0 (§14 dir shape)', async () => {
    const inputs = buildInputs({
      profiles: { mock: mockProfile('clean.json') },
      cases: [
        { name: 'alpha', agents: ['mock'] },
        { name: 'beta', agents: ['mock'] },
      ],
    });
    const res = await runSuite(inputs);
    expect(res.exitCode).toBe(ExitCode.OK);
    expect(res.trials.map((t) => t.status).sort()).toEqual(['passed', 'passed']);

    // §14 results-dir shape: suite.json + per-trial trial.json load + validate.
    const loaded = loadRun(res.runDir);
    expect(loaded.trials).toHaveLength(2);
    expect(loaded.suite.matrix).toHaveLength(2);
    expect(loaded.suite.gate?.exitCode).toBe(ExitCode.OK);
  });

  it('setup-error trial → excluded from gates, vacuous pass + error status → exit 3', async () => {
    const inputs = buildInputs({
      profiles: { mock: mockProfile('clean.json') },
      cases: [
        { name: 'ok', agents: ['mock'] },
        { name: 'broken', agents: ['mock'], setup: [failingSetupScript()] },
      ],
    });
    const res = await runSuite(inputs);
    const byCase = Object.fromEntries(res.trials.map((t) => [t.case, t.status]));
    expect(byCase['ok']).toBe('passed');
    expect(byCase['broken']).toBe('setup-error');
    expect(res.exitCode).toBe(ExitCode.PARTIAL_INFRA);
  });

  it('cell with an unconfigured agent → skipped (not an error status)', async () => {
    const inputs = buildInputs({
      profiles: { mock: mockProfile('clean.json') },
      cases: [{ name: 'multi', agents: ['mock', 'ghost'] }],
    });
    const res = await runSuite(inputs);
    const byAgent = Object.fromEntries(res.trials.map((t) => [t.agent, t.status]));
    expect(byAgent['mock']).toBe('passed');
    expect(byAgent['ghost']).toBe('skipped');
    // skipped is neither a gate nor an infra error → exit 0.
    expect(res.exitCode).toBe(ExitCode.OK);
  });

  it('per-trial timeout → parent process-tree kill → status timeout → exit 3', async () => {
    const inputs = buildInputs({
      profiles: { slow: mockProfile('timeout.json') },
      cases: [{ name: 'hangs', agents: ['slow'], timeoutSec: 1 }],
    });
    const res = await runSuite(inputs);
    expect(res.trials).toHaveLength(1);
    expect(res.trials[0]!.status).toBe('timeout');
    expect(res.exitCode).toBe(ExitCode.PARTIAL_INFRA);
  });
});
