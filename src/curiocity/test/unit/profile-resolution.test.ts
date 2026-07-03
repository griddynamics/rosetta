import { describe, it, expect } from 'vitest';
import { resolveAgentProfile } from '../../src/orchestrator/profile';
import { buildTrialSpecs } from '../../src/orchestrator/spec';
import { buildMatrix } from '../../src/config/matrix';
import { resolveCaseConfig } from '../../src/config/merge';
import { topLevelConfigSchema, caseConfigSchema } from '../../src/config/schema';
import { CLAUDE_CODE_DEFAULT_PROFILE } from '../../src/agents/claude-code/profile';
import type { CaseDefinition } from '../../src/cases/types';

/**
 * Part A (orchestrator ruling): the D13 defaults layer. Adapter built-in
 * `defaultProfile` is reachable via `resolveAgentProfile`, merged PER-FIELD under
 * top-level `codingagents`. Out-of-the-box (no config) a `claude-code` cell must NOT
 * be skipped; a partial config overrides the default field-by-field; an agent with
 * neither a built-in default nor a config entry stays skipped.
 */

describe('resolveAgentProfile (D13 defaults layer)', () => {
  it('out-of-the-box: no config → claude-code resolves to its built-in default', () => {
    const topLevel = topLevelConfigSchema.parse({}); // no config file at all
    const profile = resolveAgentProfile('claude-code', topLevel);
    expect(profile).not.toBeNull();
    expect(profile!.command).toBe('claude');
    expect(profile!.adapter).toBe('claude-code');
    // Full default carried through (dialogPatterns present, strategy json-only).
    expect(profile!.strategy).toBe(CLAUDE_CODE_DEFAULT_PROFILE.strategy);
    expect(profile!.dialogPatterns?.length).toBeGreaterThan(0);
  });

  it('config overrides the default PER-FIELD (untouched fields inherit the default)', () => {
    const topLevel = topLevelConfigSchema.parse({
      codingagents: {
        'claude-code': {
          // Partial: override only the command + one nested tuning field.
          command: 'claude-canary',
          stall: { quietMs: 9999 },
        },
      },
    });
    const profile = resolveAgentProfile('claude-code', topLevel);
    expect(profile).not.toBeNull();
    // Overridden fields:
    expect(profile!.command).toBe('claude-canary');
    expect(profile!.stall.quietMs).toBe(9999);
    // Inherited-from-default fields:
    expect(profile!.args).toEqual(CLAUDE_CODE_DEFAULT_PROFILE.args);
    expect(profile!.strategy).toBe(CLAUDE_CODE_DEFAULT_PROFILE.strategy);
    expect(profile!.envRemove).toEqual(CLAUDE_CODE_DEFAULT_PROFILE.envRemove);
    expect(profile!.dialogPatterns).toEqual(CLAUDE_CODE_DEFAULT_PROFILE.dialogPatterns);
  });

  it('unknown agent with no default and no config → null (cell stays skipped)', () => {
    const topLevel = topLevelConfigSchema.parse({});
    expect(resolveAgentProfile('ghost', topLevel)).toBeNull();
  });

  it('an agent with only a full config entry (no built-in default) still resolves', () => {
    const topLevel = topLevelConfigSchema.parse({
      codingagents: {
        mock: {
          adapter: 'mock',
          command: 'node',
          args: ['{prompt}'],
          strategy: 'json-only',
          readiness: { quietMs: 50 },
          submit: 'enter',
          stall: { quietMs: 100 },
        },
      },
    });
    const profile = resolveAgentProfile('mock', topLevel);
    expect(profile).not.toBeNull();
    expect(profile!.command).toBe('node');
    // `mock` ships no built-in default → an agent with neither is still skipped.
    const bare = topLevelConfigSchema.parse({});
    expect(resolveAgentProfile('mock', bare)).toBeNull();
  });
});

describe('buildTrialSpecs (D13 defaults reachable end-to-end)', () => {
  function makeCase(name: string, agents: string[]): CaseDefinition {
    return {
      name,
      ephemeral: false,
      prompt: 'Reply PONG.',
      qna: 'If unsure, abort.',
      config: caseConfigSchema.parse({ agents }),
    };
  }

  it('out-of-the-box (empty codingagents): claude-code cell is BUILT, not skipped', () => {
    const topLevel = topLevelConfigSchema.parse({}); // no config file
    const cases = [makeCase('pong', ['claude-code'])];
    const resolvedCases = cases.map((c) =>
      resolveCaseConfig({ caseName: c.name, topLevel, caseConfig: c.config, evaluateDefault: false }),
    );
    const matrix = buildMatrix({ topLevel, cases: resolvedCases });

    const { specs, skipped } = buildTrialSpecs({
      topLevel,
      cases,
      resolvedCases,
      matrix,
      runDir: '/tmp/does-not-matter',
      configDir: process.cwd(),
      keepWorkspace: false,
      mirror: false,
      keys: {},
    });

    expect(skipped).toHaveLength(0);
    expect(specs).toHaveLength(1);
    expect(specs[0]!.agentId).toBe('claude-code');
    expect((specs[0]!.profile as { command?: string }).command).toBe('claude');
  });

  it('an agent with neither default nor config → still skipped with a clear reason', () => {
    const topLevel = topLevelConfigSchema.parse({});
    const cases = [makeCase('pong', ['ghost'])];
    const resolvedCases = cases.map((c) =>
      resolveCaseConfig({ caseName: c.name, topLevel, caseConfig: c.config, evaluateDefault: false }),
    );
    const matrix = buildMatrix({ topLevel, cases: resolvedCases });

    const { specs, skipped } = buildTrialSpecs({
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

    expect(specs).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]!.reason).toContain('ghost');
  });
});
