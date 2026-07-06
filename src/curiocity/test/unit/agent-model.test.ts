import { describe, it, expect } from 'vitest';
import { buildTrialSpecs } from '../../src/orchestrator/spec';
import { buildMatrix } from '../../src/config/matrix';
import { resolveCaseConfig, type CliOverrides } from '../../src/config/merge';
import { topLevelConfigSchema, caseConfigSchema } from '../../src/config/schema';
import { agentModelsAgree, buildAgentModelRecord } from '../../src/curion/agent-model';
import { ClaudeCodeAdapter } from '../../src/agents/claude-code/adapter';
import { CodexAdapter } from '../../src/agents/codex/adapter';
import { MockAdapter } from '../../src/agents/mock/adapter';
import { CLAUDE_CODE_DEFAULT_PROFILE } from '../../src/agents/claude-code/profile';
import { CODEX_DEFAULT_PROFILE } from '../../src/agents/codex/profile';
import type { AgentProfile } from '../../src/config/schema';
import type { TrialContext } from '../../src/agents/types';
import type { CaseDefinition } from '../../src/cases/types';

/**
 * agentModel (§5.2, M6.6): D13 precedence (profile < case < CLI), adapter arg rendering
 * (claude `--model`, codex `-m`, mock no-op), and the requested-vs-observed mismatch flag.
 */

function makeCase(name: string, agents: string[], agentModels?: Record<string, string>): CaseDefinition {
  return {
    name,
    ephemeral: false,
    prompt: 'Reply PONG.',
    qna: 'If unsure, abort.',
    config: caseConfigSchema.parse({ agents, ...(agentModels ? { agentModels } : {}) }),
  };
}

function resolveModel(
  topLevel: ReturnType<typeof topLevelConfigSchema.parse>,
  caseAgentModels?: Record<string, string>,
  cli?: CliOverrides,
): string | undefined {
  const cases = [makeCase('pong', ['claude-code'], caseAgentModels)];
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
  return (specs[0]!.profile as { agentModel?: string }).agentModel;
}

describe('agentModel precedence (profile < case < CLI, D13)', () => {
  it('profile rung only: top-level codingagents.agentModel flows to the spec', () => {
    const topLevel = topLevelConfigSchema.parse({
      codingagents: { 'claude-code': { agentModel: 'profile-model' } },
    });
    expect(resolveModel(topLevel)).toBe('profile-model');
  });

  it('case agentModels OVERRIDES the profile rung', () => {
    const topLevel = topLevelConfigSchema.parse({
      codingagents: { 'claude-code': { agentModel: 'profile-model' } },
    });
    expect(resolveModel(topLevel, { 'claude-code': 'case-model' })).toBe('case-model');
  });

  it('CLI --agent-model OVERRIDES both case and profile', () => {
    const topLevel = topLevelConfigSchema.parse({
      codingagents: { 'claude-code': { agentModel: 'profile-model' } },
    });
    const cli: CliOverrides = { agentModels: { 'claude-code': 'cli-model' } };
    expect(resolveModel(topLevel, { 'claude-code': 'case-model' }, cli)).toBe('cli-model');
  });

  it('no agentModel anywhere → undefined (no flag rendered)', () => {
    expect(resolveModel(topLevelConfigSchema.parse({}))).toBeUndefined();
  });
});

describe('agentModel arg rendering (buildLaunch)', () => {
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

  it('claude-code renders `--model <id>` when agentModel is set', () => {
    const frag = new ClaudeCodeAdapter().buildLaunch(ctx({ ...CLAUDE_CODE_DEFAULT_PROFILE, agentModel: 'haiku' }));
    expect(frag.args).toContain('--model');
    const i = frag.args!.indexOf('--model');
    expect(frag.args![i + 1]).toBe('haiku');
  });

  it('claude-code renders NO model flag when agentModel is unset', () => {
    const frag = new ClaudeCodeAdapter().buildLaunch(ctx({ ...CLAUDE_CODE_DEFAULT_PROFILE }));
    expect(frag.args).not.toContain('--model');
  });

  it('codex renders `-m <id>` when agentModel is set', () => {
    const frag = new CodexAdapter().buildLaunch(ctx({ ...CODEX_DEFAULT_PROFILE, agentModel: 'gpt-5.4-mini' }));
    expect(frag.args).toContain('-m');
    const i = frag.args!.indexOf('-m');
    expect(frag.args![i + 1]).toBe('gpt-5.4-mini');
  });

  it('mock accepts+records agentModel but renders NO model flag (no-op)', () => {
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
      agentModel: 'some-model',
    };
    const frag = new MockAdapter().buildLaunch(ctx(mockProfile));
    expect(frag.args).toEqual(['do it']);
    expect(frag.args).not.toContain('some-model');
  });
});

describe('agentModel requested-vs-observed mismatch flag', () => {
  it('agentModelsAgree: exact + alias/full-id substring both directions', () => {
    expect(agentModelsAgree('haiku', 'haiku')).toBe(true);
    expect(agentModelsAgree('haiku', 'claude-haiku-3-5-20241022')).toBe(true);
    expect(agentModelsAgree('claude-haiku-3-5', 'haiku')).toBe(true);
    expect(agentModelsAgree('haiku', 'sonnet')).toBe(false);
    expect(agentModelsAgree('', 'haiku')).toBe(false);
  });

  it('agentModelsAgree: minimum-length floor rejects lone-char substring false-positives', () => {
    // A single char is a substring of almost every full id — must NOT imply agreement.
    expect(agentModelsAgree('4', 'claude-sonnet-4-5')).toBe(false);
    expect(agentModelsAgree('5', 'gpt-5.4-mini')).toBe(false);
    expect(agentModelsAgree('claude-sonnet-4-5', '5')).toBe(false);
    // Exact 1-char equality still agrees (nothing to spuriously match).
    expect(agentModelsAgree('x', 'x')).toBe(true);
    // Real 2-char aliases (OpenAI o1/o3) still match their full ids via substring.
    expect(agentModelsAgree('o1', 'o1-mini')).toBe(true);
    expect(agentModelsAgree('o3-pro', 'o3')).toBe(true);
  });

  it('buildAgentModelRecord flags a genuine mismatch, clears an alias match', () => {
    expect(buildAgentModelRecord('haiku', 'claude-haiku-3-5')).toEqual({
      requested: 'haiku',
      observed: 'claude-haiku-3-5',
      mismatch: false,
    });
    expect(buildAgentModelRecord('haiku', 'gpt-5.5')).toEqual({
      requested: 'haiku',
      observed: 'gpt-5.5',
      mismatch: true,
    });
  });

  it('omits mismatch when one side is unknown, and returns undefined when both are', () => {
    expect(buildAgentModelRecord('haiku', undefined)).toEqual({ requested: 'haiku' });
    expect(buildAgentModelRecord(undefined, 'gpt-5.5')).toEqual({ observed: 'gpt-5.5' });
    expect(buildAgentModelRecord(undefined, undefined)).toBeUndefined();
  });
});
