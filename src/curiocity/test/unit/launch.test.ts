import { dirname } from 'node:path';
import { describe, it, expect } from 'vitest';
import { applyTemplate, composeLaunchPlan, filterAgentEnv, resolveCommand } from '../../src/agents/launch';
import { minimatch } from '../../src/agents/minimatch';
import type { AgentAdapter, TrialContext } from '../../src/agents/types';

describe('launch glue (§5.2)', () => {
  it('applyTemplate substitutes known vars and leaves unknowns intact', () => {
    expect(applyTemplate('{prompt} in {workspace}', { prompt: 'do', workspace: '/ws' })).toBe('do in /ws');
    expect(applyTemplate('{unknown}', {})).toBe('{unknown}');
  });

  it('minimatch supports * and ? anchored full match', () => {
    expect(minimatch('CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_CODE*')).toBe(true);
    expect(minimatch('ANTHROPIC_API_KEY', 'ANTHROPIC_*')).toBe(true);
    expect(minimatch('PATH', 'CLAUDE_CODE*')).toBe(false);
    expect(minimatch('ab', 'a?')).toBe(true);
  });

  it('filterAgentEnv strips envRemove globs and applies envSet (allowlisted API keys survive)', () => {
    const out = filterAgentEnv(
      { PATH: '/bin', CLAUDECODE: '1', CLAUDE_CODE_X: 'y', ANTHROPIC_API_KEY: 'sk-x', HOME: '/h' },
      ['CLAUDECODE', 'CLAUDE_CODE*', 'ANTHROPIC_*'],
      { FOO: 'bar' },
    );
    // ANTHROPIC_API_KEY is in the global AGENT_API_KEY_ALLOWLIST, so it survives the
    // 'ANTHROPIC_*' envRemove pattern even though the pattern would otherwise strip it.
    expect(out).toEqual({ PATH: '/bin', HOME: '/h', ANTHROPIC_API_KEY: 'sk-x', FOO: 'bar' });
  });

  it('filterAgentEnv: allowlisted API key is kept even when explicitly named in envRemove', () => {
    const out = filterAgentEnv(
      { ANTHROPIC_API_KEY: 'sk-ant-x', CLAUDECODE: '1', FOO: 'bar' },
      ['CLAUDECODE', 'ANTHROPIC_API_KEY'],
      undefined,
    );
    expect(out).toEqual({ ANTHROPIC_API_KEY: 'sk-ant-x', FOO: 'bar' });
    expect(out).not.toHaveProperty('CLAUDECODE');
  });

  it('resolveCommand (R1 preflight): resolves an absolute executable, a PATH lookup, and rejects the unresolvable', () => {
    const node = process.execPath; // an absolute, executable path
    const nodeDir = dirname(node);

    // Absolute path to an executable resolves to itself.
    expect(resolveCommand(node, {})).toBe(node);
    // A path-shaped command that does not exist → null (not silently accepted).
    expect(resolveCommand('/definitely/not/a/real/binary-xyz', { PATH: nodeDir })).toBeNull();
    // Bare name found on PATH resolves to the joined path.
    expect(resolveCommand('node', { PATH: nodeDir })).toBe(node);
    // Bare name absent from PATH → null.
    expect(resolveCommand('curiocity-nonexistent-binary-xyz', { PATH: nodeDir })).toBeNull();
    // Bare name with an empty PATH → null.
    expect(resolveCommand('node', {})).toBeNull();
  });

  it('composeLaunchPlan runs the three steps in order and merges fragments', async () => {
    const ctx = {
      agentId: 'x',
      caseName: 'c',
      repeat: 1,
      workspace: '/ws',
      ctrlDir: '/ctrl',
      sessionId: 'sid-1',
      prompt: 'do it',
      profile: { command: 'run {sessionId}' } as TrialContext['profile'],
      provision: { mcps: [], plugins: [] },
      startedAt: 0,
    } as TrialContext;

    const adapter: Pick<AgentAdapter, 'renderHooks' | 'renderProvisioning' | 'buildLaunch'> = {
      renderHooks: async () => ({ args: ['--hook'], env: { H: '1' }, files: [{ path: '/ctrl/s.json', content: '{}' }] }),
      renderProvisioning: async () => ({ args: ['--prov'], commands: ['echo prov'] }),
      buildLaunch: () => ({ args: ['--launch'], env: { L: '2' } }),
    };

    const plan = await composeLaunchPlan(adapter as AgentAdapter, ctx, {
      sessionStart: { writeTo: '/ctrl/session-start.json' },
      stop: { appendTo: '/ctrl/stop.jsonl' },
    });

    expect(plan.command).toBe('run sid-1'); // command templated from profile
    expect(plan.args).toEqual(['--hook', '--prov', '--launch']); // hooks → prov → launch
    expect(plan.env).toEqual({ H: '1', L: '2' });
    expect(plan.files).toHaveLength(1);
    expect(plan.commands).toEqual(['echo prov']);
  });
});
