import { describe, it, expect } from 'vitest';
import {
  concatScripts,
  mergeProvision,
  mergeModels,
  resolveCaseConfig,
  resolveGlobals,
} from '../../src/config/merge';
import { buildMatrix } from '../../src/config/matrix';
import { agentProfileSchema, caseConfigSchema, topLevelConfigSchema } from '../../src/config/schema';
import { DEFAULT_COMBINER, DEFAULT_REPEATS, DEFAULT_TIMEOUT_SEC } from '../../src/config/defaults';

function profile(models?: Record<string, string>) {
  return agentProfileSchema.parse({
    adapter: 'mock',
    command: 'node',
    args: [],
    strategy: 'json-only',
    readiness: { quietMs: 500 },
    submit: 'enter',
    stall: { quietMs: 1000 },
    ...(models ? { models } : {}),
  });
}

describe('D14: setup/teardown are concatenated (top-level first), never overridden', () => {
  it('concatenates top-level then case, preserving both', () => {
    expect(concatScripts(['a.sh'], ['b.sh'])).toEqual(['a.sh', 'b.sh']);
  });

  it('keeps top-level even when case has its own (never override)', () => {
    const resolved = resolveCaseConfig({
      caseName: 'c',
      topLevel: topLevelConfigSchema.parse({ setup: ['top.sh'], teardown: ['topdown.sh'] }),
      caseConfig: caseConfigSchema.parse({ agents: ['x'], setup: ['case.sh'], teardown: ['casedown.sh'] }),
      evaluateDefault: true,
    });
    expect(resolved.setup).toEqual(['top.sh', 'case.sh']);
    expect(resolved.teardown).toEqual(['topdown.sh', 'casedown.sh']);
  });

  it('handles empty layers', () => {
    expect(concatScripts([], ['only.sh'])).toEqual(['only.sh']);
    expect(concatScripts(['only.sh'], [])).toEqual(['only.sh']);
  });
});

describe('D13: provisioning merges by name (same name overrides, new name adds)', () => {
  it('overrides same name and adds new ones, keeping untouched defaults', () => {
    const base = {
      mcps: [
        { name: 'keep', command: 'x' },
        { name: 'override', command: 'old' },
      ],
      plugins: [{ name: 'p1' }],
    };
    const override = {
      mcps: [
        { name: 'override', command: 'new' },
        { name: 'added', command: 'z' },
      ],
      plugins: [],
    };
    const merged = mergeProvision(base, override);
    expect(merged.mcps).toEqual([
      { name: 'keep', command: 'x' },
      { name: 'override', command: 'new' },
      { name: 'added', command: 'z' },
    ]);
    expect(merged.plugins).toEqual([{ name: 'p1' }]);
  });

  it('returns a copy of base when there is no override', () => {
    const base = { mcps: [{ name: 'a' }], plugins: [] };
    const merged = mergeProvision(base);
    expect(merged).toEqual(base);
    expect(merged.mcps).not.toBe(base.mcps);
  });
});

describe('D13: scalar precedence (defaults < top-level < case < CLI)', () => {
  it('repeats: CLI wins over case wins over default', () => {
    const topLevel = topLevelConfigSchema.parse({});
    const caseConfig = caseConfigSchema.parse({ agents: ['x'], repeats: 3, timeoutSec: 500 });

    // default only
    expect(
      resolveCaseConfig({ caseName: 'c', topLevel, caseConfig: caseConfigSchema.parse({ agents: ['x'] }), evaluateDefault: true })
        .repeats,
    ).toBe(DEFAULT_REPEATS);

    // case beats default
    expect(resolveCaseConfig({ caseName: 'c', topLevel, caseConfig, evaluateDefault: true }).repeats).toBe(3);

    // CLI beats case
    expect(
      resolveCaseConfig({ caseName: 'c', topLevel, caseConfig, cli: { repeats: 7 }, evaluateDefault: true }).repeats,
    ).toBe(7);
  });

  it('timeout falls back to the built-in default', () => {
    const resolved = resolveCaseConfig({
      caseName: 'c',
      topLevel: topLevelConfigSchema.parse({}),
      caseConfig: caseConfigSchema.parse({ agents: ['x'] }),
      evaluateDefault: true,
    });
    expect(resolved.timeoutSec).toBe(DEFAULT_TIMEOUT_SEC);
    expect(resolved.combiner).toBe(DEFAULT_COMBINER);
  });

  it('--agent narrows the case-declared agent list', () => {
    const resolved = resolveCaseConfig({
      caseName: 'c',
      topLevel: topLevelConfigSchema.parse({}),
      caseConfig: caseConfigSchema.parse({ agents: ['claude-code', 'codex'] }),
      cli: { agents: ['codex'] },
      evaluateDefault: true,
    });
    expect(resolved.agents).toEqual(['codex']);
  });

  it('evaluate default respects mode, CLI overrides it', () => {
    const topLevel = topLevelConfigSchema.parse({});
    const caseConfig = caseConfigSchema.parse({ agents: ['x'] });
    expect(resolveCaseConfig({ caseName: 'c', topLevel, caseConfig, evaluateDefault: false }).evaluate).toBe(false);
    expect(
      resolveCaseConfig({ caseName: 'c', topLevel, caseConfig, cli: { evaluate: true }, evaluateDefault: false }).evaluate,
    ).toBe(true);
  });
});

describe('D13: model roles merge', () => {
  it('mergeModels: later layer wins per role', () => {
    expect(mergeModels({ fast: 'A', workhorse: 'W' }, { fast: 'B' }, { judge: 'J' })).toEqual({
      fast: 'B',
      workhorse: 'W',
      judge: 'J',
    });
  });

  it('resolveCaseConfig.models excludes top-level (case < CLI only)', () => {
    const resolved = resolveCaseConfig({
      caseName: 'c',
      topLevel: topLevelConfigSchema.parse({ models: { fast: 'TOP', workhorse: 'TOPW' } }),
      caseConfig: caseConfigSchema.parse({ agents: ['x'], models: { fast: 'CASE' } }),
      cli: { models: { workhorse: 'CLI' } },
      evaluateDefault: true,
    });
    expect(resolved.models).toEqual({ fast: 'CASE', workhorse: 'CLI' });
  });

  it('buildMatrix folds the full chain: top-level < profile < case < CLI', () => {
    const topLevel = topLevelConfigSchema.parse({
      codingagents: { x: profile({ fast: 'PROFILE', workhorse: 'PROFILEW' }) },
      models: { fast: 'TOP', workhorse: 'TOPW', judge: 'TOPJ' },
    });
    // profile beats top-level; case beats profile; CLI beats case.
    const resolved = resolveCaseConfig({
      caseName: 'c',
      topLevel,
      caseConfig: caseConfigSchema.parse({ agents: ['x'], models: { workhorse: 'CASEW' } }),
      cli: { models: { judge: 'CLIJ' } },
      evaluateDefault: true,
    });
    const matrix = buildMatrix({ topLevel, cases: [resolved] });
    expect(matrix).toHaveLength(1);
    expect(matrix[0]!.models).toEqual({
      fast: 'PROFILE', // profile > top-level
      workhorse: 'CASEW', // case > profile
      judge: 'CLIJ', // CLI > top-level
    });
  });
});

describe('buildMatrix expands agent × case × repeat', () => {
  it('produces one cell per agent per repeat', () => {
    const topLevel = topLevelConfigSchema.parse({});
    const resolved = resolveCaseConfig({
      caseName: 'c',
      topLevel,
      caseConfig: caseConfigSchema.parse({ agents: ['a', 'b'], repeats: 2 }),
      evaluateDefault: true,
    });
    const matrix = buildMatrix({ topLevel, cases: [resolved] });
    expect(matrix.map((m) => `${m.agent}:${m.repeat}`)).toEqual(['a:1', 'a:2', 'b:1', 'b:2']);
  });
});

describe('resolveGlobals', () => {
  it('CLI > top-level > default for out', () => {
    expect(resolveGlobals(topLevelConfigSchema.parse({}), {}).out).toBe('./curiocity-results');
    expect(resolveGlobals(topLevelConfigSchema.parse({ out: './top' }), {}).out).toBe('./top');
    expect(resolveGlobals(topLevelConfigSchema.parse({ out: './top' }), { out: './cli' }).out).toBe('./cli');
  });
});
