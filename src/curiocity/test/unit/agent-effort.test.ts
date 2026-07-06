import { describe, it, expect } from 'vitest';
import { buildTrialSpecs } from '../../src/orchestrator/spec';
import { buildMatrix } from '../../src/config/matrix';
import { resolveCaseConfig, type CliOverrides } from '../../src/config/merge';
import { topLevelConfigSchema, caseConfigSchema } from '../../src/config/schema';
import { agentEffortsAgree, buildAgentEffortRecord } from '../../src/curion/agent-model';
import { ClaudeCodeAdapter } from '../../src/agents/claude-code/adapter';
import { CodexAdapter } from '../../src/agents/codex/adapter';
import { MockAdapter } from '../../src/agents/mock/adapter';
import { CLAUDE_CODE_DEFAULT_PROFILE } from '../../src/agents/claude-code/profile';
import { CODEX_DEFAULT_PROFILE } from '../../src/agents/codex/profile';
import type { AgentProfile } from '../../src/config/schema';
import type { TrialContext } from '../../src/agents/types';
import type { CaseDefinition } from '../../src/cases/types';

/**
 * agentEffort (§5.2, M6.7): D13 precedence (profile < case < CLI), adapter arg rendering
 * (claude `--effort`, codex `-c model_reasoning_effort`, mock no-op), and the
 * requested-vs-observed mismatch flag — the SAME seam as agentModel, one dimension over.
 */

function makeCase(name: string, agents: string[], agentEfforts?: Record<string, string>): CaseDefinition {
  return {
    name,
    ephemeral: false,
    prompt: 'Reply PONG.',
    qna: 'If unsure, abort.',
    config: caseConfigSchema.parse({ agents, ...(agentEfforts ? { agentEfforts } : {}) }),
  };
}

function resolveEffort(
  topLevel: ReturnType<typeof topLevelConfigSchema.parse>,
  caseAgentEfforts?: Record<string, string>,
  cli?: CliOverrides,
): string | undefined {
  const cases = [makeCase('pong', ['claude-code'], caseAgentEfforts)];
  const resolvedCases = cases.map((c) =>
    resolveCaseConfig({ caseName: c.name, topLevel, caseConfig: c.config, evaluateDefault: false, ...(cli ? { cli } : {}) }),
  );
  const matrix = buildMatrix({ topLevel, cases: resolvedCases });
  const { specs } = buildTrialSpecs({
    topLevel,
    cases,
    resolvedCases,
    matrix,
    runDir: '/tmp/x',
    configDir: process.cwd(),
    keepWorkspace: false,
    mirror: false,
    keys: {},
  });
  return (specs[0]!.profile as { agentEffort?: string }).agentEffort;
}

describe('agentEffort precedence (profile < case < CLI, D13)', () => {
  it('profile rung only: top-level codingagents.agentEffort flows to the spec', () => {
    const topLevel = topLevelConfigSchema.parse({
      codingagents: { 'claude-code': { agentEffort: 'high' } },
    });
    expect(resolveEffort(topLevel)).toBe('high');
  });

  it('case agentEfforts OVERRIDES the profile rung', () => {
    const topLevel = topLevelConfigSchema.parse({
      codingagents: { 'claude-code': { agentEffort: 'high' } },
    });
    expect(resolveEffort(topLevel, { 'claude-code': 'medium' })).toBe('medium');
  });

  it('CLI --agent-effort OVERRIDES both case and profile', () => {
    const topLevel = topLevelConfigSchema.parse({
      codingagents: { 'claude-code': { agentEffort: 'high' } },
    });
    const cli: CliOverrides = { agentEfforts: { 'claude-code': 'low' } };
    expect(resolveEffort(topLevel, { 'claude-code': 'medium' }, cli)).toBe('low');
  });

  it('no agentEffort anywhere → undefined (no flag rendered)', () => {
    expect(resolveEffort(topLevelConfigSchema.parse({}))).toBeUndefined();
  });
});

describe('agentEffort arg rendering (buildLaunch)', () => {
  function ctx(profile: AgentProfile): TrialContext {
    return {
      agentId: profile.adapter,
      caseName: 'c',
      repeat: 1,
      workspace: '/tmp/ws',
      ctrlDir: '/tmp/ctrl',
      sessionId: 'sid',
      prompt: 'do it',
      profile,
      provision: { mcps: [], plugins: [] },
      startedAt: Date.now(),
    };
  }

  it('claude-code renders `--effort <v>` when agentEffort is set', () => {
    const frag = new ClaudeCodeAdapter().buildLaunch(ctx({ ...CLAUDE_CODE_DEFAULT_PROFILE, agentEffort: 'low' }));
    expect(frag.args).toContain('--effort');
    const i = frag.args!.indexOf('--effort');
    expect(frag.args![i + 1]).toBe('low');
  });

  it('claude-code renders NO effort flag when agentEffort is unset', () => {
    const frag = new ClaudeCodeAdapter().buildLaunch(ctx({ ...CLAUDE_CODE_DEFAULT_PROFILE }));
    expect(frag.args).not.toContain('--effort');
  });

  it('codex renders `-c model_reasoning_effort="<v>"` when agentEffort is set', () => {
    const frag = new CodexAdapter().buildLaunch(ctx({ ...CODEX_DEFAULT_PROFILE, agentEffort: 'low' }));
    const i = frag.args!.indexOf('-c');
    // there may be multiple `-c` (features.hooks=true); find the effort one
    const effortIdx = frag.args!.findIndex((a) => a === 'model_reasoning_effort="low"');
    expect(effortIdx).toBeGreaterThan(-1);
    expect(frag.args![effortIdx - 1]).toBe('-c');
    expect(i).toBeGreaterThan(-1);
  });

  it('codex renders NO effort override when agentEffort is unset', () => {
    const frag = new CodexAdapter().buildLaunch(ctx({ ...CODEX_DEFAULT_PROFILE }));
    expect(frag.args!.some((a) => a.startsWith('model_reasoning_effort='))).toBe(false);
  });

  it('mock accepts+records agentEffort but renders NO effort flag (no-op)', () => {
    const mockProfile: AgentProfile = {
      adapter: 'mock',
      command: 'node',
      args: ['{prompt}'],
      envRemove: [],
      strategy: 'json-only',
      readiness: { quietMs: 10 },
      submit: 'enter',
      stall: { quietMs: 10 },
      freeze: { windowMs: 10_000 },
      agentEffort: 'low',
    };
    const frag = new MockAdapter().buildLaunch(ctx(mockProfile));
    expect(frag.args).toEqual(['do it']);
    expect(frag.args).not.toContain('--effort');
    expect(frag.args).not.toContain('low');
  });
});

describe('agentEffort requested-vs-observed mismatch flag', () => {
  it('agentEffortsAgree: exact case-insensitive equality only (a closed enum)', () => {
    expect(agentEffortsAgree('low', 'low')).toBe(true);
    expect(agentEffortsAgree('LOW', 'low')).toBe(true);
    expect(agentEffortsAgree('low', 'high')).toBe(false);
    // Unlike models, effort is NOT substring-tolerant: 'low' ⊄ 'xhigh-low' etc.
    expect(agentEffortsAgree('low', 'xlow')).toBe(false);
    expect(agentEffortsAgree('', 'low')).toBe(false);
  });

  it('buildAgentEffortRecord flags a genuine mismatch, clears an exact match', () => {
    expect(buildAgentEffortRecord('low', 'low')).toEqual({
      requested: 'low',
      observed: 'low',
      mismatch: false,
    });
    expect(buildAgentEffortRecord('low', 'high')).toEqual({
      requested: 'low',
      observed: 'high',
      mismatch: true,
    });
  });

  it('omits mismatch when one side is unknown, returns undefined when both are (warn+omit)', () => {
    expect(buildAgentEffortRecord('low', undefined)).toEqual({ requested: 'low' });
    expect(buildAgentEffortRecord(undefined, 'low')).toEqual({ observed: 'low' });
    expect(buildAgentEffortRecord(undefined, undefined)).toBeUndefined();
  });
});
