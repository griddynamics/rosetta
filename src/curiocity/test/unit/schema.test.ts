import { describe, it, expect } from 'vitest';
import {
  agentProfileSchema,
  caseConfigSchema,
  gateSchema,
  pricingSchema,
  topLevelConfigSchema,
} from '../../src/config/schema';
import { trajectoryEventSchema, qnaEntrySchema } from '../../src/shared/trajectory';
import { modelRolesSchema } from '../../src/shared/models';
import { trialResultSchema, suiteResultSchema, SCHEMA_VERSION } from '../../src/results/schema';

const validProfile = {
  adapter: 'claude-code',
  command: 'claude',
  args: ['{prompt}', '--session-id', '{sessionId}'],
  envRemove: ['CLAUDECODE', 'CLAUDE_CODE*'],
  strategy: 'hybrid',
  readiness: { bannerPattern: 'Welcome', quietMs: 800 },
  submit: 'enter',
  stall: { quietMs: 1500 },
};

describe('agentProfileSchema (§5.2)', () => {
  it('accepts a valid profile and defaults freeze.windowMs to 10_000', () => {
    const p = agentProfileSchema.parse(validProfile);
    expect(p.freeze.windowMs).toBe(10_000);
    expect(p.envRemove).toEqual(['CLAUDECODE', 'CLAUDE_CODE*']);
  });

  it('rejects a profile missing readiness', () => {
    const { readiness, ...bad } = validProfile;
    void readiness;
    expect(agentProfileSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an invalid submit sequencing value', () => {
    expect(agentProfileSchema.safeParse({ ...validProfile, submit: 'tab' }).success).toBe(false);
  });

  it('rejects an invalid strategy', () => {
    expect(agentProfileSchema.safeParse({ ...validProfile, strategy: 'raw' }).success).toBe(false);
  });
});

describe('modelRolesSchema (§5.6)', () => {
  it('accepts fast + workhorse with optional judge', () => {
    expect(modelRolesSchema.safeParse({ fast: 'a/b', workhorse: 'c/d' }).success).toBe(true);
    expect(modelRolesSchema.safeParse({ fast: 'a/b', workhorse: 'c/d', judge: 'e/f' }).success).toBe(true);
  });
  it('rejects when workhorse is missing', () => {
    expect(modelRolesSchema.safeParse({ fast: 'a/b' }).success).toBe(false);
  });
});

describe('topLevelConfigSchema (§9)', () => {
  it('accepts an empty config (all defaults)', () => {
    const cfg = topLevelConfigSchema.parse({});
    expect(cfg.setup).toEqual([]);
    expect(cfg.teardown).toEqual([]);
    expect(cfg.codingagents).toEqual({});
  });

  it('accepts a full config', () => {
    expect(
      topLevelConfigSchema.safeParse({
        codingagents: { 'claude-code': validProfile },
        models: { fast: 'anthropic/claude-haiku-4-5', workhorse: 'anthropic/claude-sonnet-4-6' },
        pricing: { 'anthropic/claude-haiku-4-5': { inputPer1M: 1, outputPer1M: 5 } },
        gate: { minScore: 60, minPassRate: 0.8, maxStddev: 10 },
        concurrency: 4,
        out: './out',
      }).success,
    ).toBe(true);
  });

  it('rejects a gate with minPassRate out of range', () => {
    expect(topLevelConfigSchema.safeParse({ gate: { minScore: 60, minPassRate: 1.5, maxStddev: 10 } }).success).toBe(
      false,
    );
  });
});

describe('gateSchema & pricingSchema', () => {
  it('gate accepts valid, rejects negative stddev', () => {
    expect(gateSchema.safeParse({ minScore: 60, minPassRate: 0.8, maxStddev: 10 }).success).toBe(true);
    expect(gateSchema.safeParse({ minScore: 60, minPassRate: 0.8, maxStddev: -1 }).success).toBe(false);
  });
  it('pricing rejects negative rates', () => {
    expect(pricingSchema.safeParse({ 'a/b': { inputPer1M: -1, outputPer1M: 5 } }).success).toBe(false);
  });
});

describe('caseConfigSchema (§9)', () => {
  it('accepts a valid case config', () => {
    expect(caseConfigSchema.safeParse({ agents: ['claude-code'], repeats: 1 }).success).toBe(true);
  });
  it('rejects an empty agents array', () => {
    expect(caseConfigSchema.safeParse({ agents: [] }).success).toBe(false);
  });
  it('passes through unknown evaluator params but requires `use`', () => {
    const parsed = caseConfigSchema.parse({
      agents: ['x'],
      evaluators: [{ use: 'file-exists', must: ['a.txt'], gate: true }],
    });
    expect(parsed.evaluators[0]).toMatchObject({ use: 'file-exists', must: ['a.txt'], gate: true });
    expect(caseConfigSchema.safeParse({ agents: ['x'], evaluators: [{ gate: true }] }).success).toBe(false);
  });
});

describe('trajectoryEventSchema (§5.2)', () => {
  it('accepts a valid event', () => {
    expect(trajectoryEventSchema.safeParse({ ts: 123, kind: 'tool_call', name: 'Bash', payload: {} }).success).toBe(
      true,
    );
  });
  it('rejects an unknown kind', () => {
    expect(trajectoryEventSchema.safeParse({ ts: 1, kind: 'nope', payload: {} }).success).toBe(false);
  });
});

describe('qnaEntrySchema (§6)', () => {
  it('accepts structured & free-text; rejects other types', () => {
    expect(qnaEntrySchema.safeParse({ type: 'structured', question: 'q', answer: 'a', ts: 1 }).success).toBe(true);
    expect(qnaEntrySchema.safeParse({ type: 'other', question: 'q', answer: 'a', ts: 1 }).success).toBe(false);
  });
});

describe('results schemas (§14)', () => {
  it('trialResultSchema accepts a valid trial with agent-hung status', () => {
    const parsed = trialResultSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      agent: 'codex',
      case: 'c',
      repeat: 1,
      status: 'agent-hung',
    });
    expect(parsed.evaluators).toEqual([]);
    expect(parsed.turnCount).toBe(0);
  });
  it('rejects an unknown status', () => {
    expect(
      trialResultSchema.safeParse({ schemaVersion: 1, agent: 'a', case: 'c', repeat: 1, status: 'exploded' }).success,
    ).toBe(false);
  });
  it('suiteResultSchema requires a matrix of well-formed cells', () => {
    expect(
      suiteResultSchema.safeParse({
        schemaVersion: 1,
        runDir: '/x',
        createdAt: 'now',
        config: {},
        matrix: [{ case: 'c', agent: 'a', repeat: 1 }],
      }).success,
    ).toBe(true);
    expect(
      suiteResultSchema.safeParse({
        schemaVersion: 1,
        runDir: '/x',
        createdAt: 'now',
        config: {},
        matrix: [{ case: 'c', agent: 'a', repeat: 0 }],
      }).success,
    ).toBe(false);
  });
});
