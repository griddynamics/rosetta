import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { assertNoProviderSecrets, buildChildEnv, shouldStrip } from '../../src/orchestrator/env';
import { filterAgentEnv } from '../../src/agents/launch';
import { CLAUDE_CODE_DEFAULT_PROFILE } from '../../src/agents/claude-code/profile';
import { CuriocityError } from '../../src/shared/errors';

const ENV_ECHO = fileURLToPath(new URL('../fixtures/env-echo.mjs', import.meta.url));

const POLLUTED = {
  PATH: '/usr/bin:/bin',
  HOME: '/home/tester',
  TERM: 'xterm-256color',
  USER: 'tester',
  LOGNAME: 'tester',
  LANG: 'en_US.UTF-8',
  LC_TIME: 'en_US.UTF-8',
  JAVA_HOME: '/opt/jdk',
  MAVEN_OPTS: '-Xmx512m',
  ANTHROPIC_API_KEY: 'sk-ant-super-secret-value',
  OPENAI_API_KEY: 'sk-proj-abc123',
  ANTHROPIC_AUTH_TOKEN: 'tok',
  ANTHROPIC_BASE_URL: 'http://x',
  OPENAI_ORG: 'org-x',
  MY_CI_TOKEN: 'ghp_deadbeef',
  GITHUB_TOKEN: 'ghp_realvalue',
  AWS_SECRET_ACCESS_KEY: 'aws-secret-value',
  RANDOM_VAR: 'keep-me',
};

describe('child env scrub (§4, deny-list)', () => {
  it('buildChildEnv passes through the full env EXCEPT ANTHROPIC_*/OPENAI_*, except the two whitelisted keys', () => {
    const env = buildChildEnv({
      JAVA_HOME: '/jdk',
      MAVEN_OPTS: '-x',
      PATH: '/bin',
      FOO: 'bar',
      GITHUB_TOKEN: 'ghp_x',
      AWS_SECRET_ACCESS_KEY: 'z',
      ANTHROPIC_API_KEY: 'sk-ant-x',
      OPENAI_API_KEY: 'sk-x',
      ANTHROPIC_AUTH_TOKEN: 't',
      ANTHROPIC_BASE_URL: 'u',
      OPENAI_ORG: 'o',
    });

    // Full pass-through for ordinary vars, including toolchain env and other secrets.
    expect(env).toMatchObject({
      JAVA_HOME: '/jdk',
      MAVEN_OPTS: '-x',
      PATH: '/bin',
      FOO: 'bar',
      GITHUB_TOKEN: 'ghp_x',
      AWS_SECRET_ACCESS_KEY: 'z',
      ANTHROPIC_API_KEY: 'sk-ant-x',
      OPENAI_API_KEY: 'sk-x',
    });
    // Provider secret vars (not on the whitelist) are stripped.
    expect(env).not.toHaveProperty('ANTHROPIC_AUTH_TOKEN');
    expect(env).not.toHaveProperty('ANTHROPIC_BASE_URL');
    expect(env).not.toHaveProperty('OPENAI_ORG');
  });

  it('buildChildEnv on the full POLLUTED fixture: toolchain + ordinary secrets pass through, provider secrets stripped, whitelisted keys survive', () => {
    const env = buildChildEnv(POLLUTED);
    expect(env['JAVA_HOME']).toBe('/opt/jdk');
    expect(env['MAVEN_OPTS']).toBe('-Xmx512m');
    expect(env['PATH']).toBe('/usr/bin:/bin');
    expect(env['MY_CI_TOKEN']).toBe('ghp_deadbeef');
    expect(env['GITHUB_TOKEN']).toBe('ghp_realvalue');
    expect(env['AWS_SECRET_ACCESS_KEY']).toBe('aws-secret-value');
    expect(env['RANDOM_VAR']).toBe('keep-me');
    expect(env['ANTHROPIC_API_KEY']).toBe('sk-ant-super-secret-value');
    expect(env['OPENAI_API_KEY']).toBe('sk-proj-abc123');
    expect(env).not.toHaveProperty('ANTHROPIC_AUTH_TOKEN');
    expect(env).not.toHaveProperty('ANTHROPIC_BASE_URL');
    expect(env).not.toHaveProperty('OPENAI_ORG');
  });

  describe('shouldStrip', () => {
    it('strips non-whitelisted ANTHROPIC_*/OPENAI_* vars', () => {
      expect(shouldStrip('ANTHROPIC_AUTH_TOKEN')).toBe(true);
      expect(shouldStrip('OPENAI_ORG')).toBe(true);
      expect(shouldStrip('ANTHROPIC_API_KEY_BACKUP')).toBe(true);
    });

    it('does not strip the whitelisted keys, unrelated vars, or near-misses that do not start with the prefix', () => {
      expect(shouldStrip('ANTHROPIC_API_KEY')).toBe(false);
      expect(shouldStrip('OPENAI_API_KEY')).toBe(false);
      expect(shouldStrip('JAVA_HOME')).toBe(false);
      // Does not START with the prefix, so it isn't touched.
      expect(shouldStrip('MY_ANTHROPIC_API_KEY')).toBe(false);
    });
  });

  describe('assertNoProviderSecrets', () => {
    it('throws when a non-whitelisted provider-secret-shaped key is present', () => {
      expect(() => assertNoProviderSecrets({ ANTHROPIC_AUTH_TOKEN: 't' })).toThrow(CuriocityError);
    });

    it('does not throw for whitelisted keys or ordinary env', () => {
      expect(() => assertNoProviderSecrets({ ANTHROPIC_API_KEY: 'sk-ant', JAVA_HOME: '/jdk' })).not.toThrow();
    });
  });

  it('end-to-end (§4 → §5.2): the two API keys survive buildChildEnv THEN filterAgentEnv with the real claude-code envRemove', () => {
    // Stage 1: scrub the polluted source env (fork boundary).
    const childEnv = buildChildEnv(POLLUTED);
    expect(childEnv['ANTHROPIC_API_KEY']).toBe('sk-ant-super-secret-value');
    expect(childEnv['OPENAI_API_KEY']).toBe('sk-proj-abc123');

    // Stage 2: derive the agent PTY env using the REAL claude-code profile envRemove.
    const agentEnv = filterAgentEnv(
      { ...childEnv, CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'cli' },
      CLAUDE_CODE_DEFAULT_PROFILE.envRemove ?? [],
      undefined,
    );

    // Both API keys survive both stages...
    expect(agentEnv['ANTHROPIC_API_KEY']).toBe('sk-ant-super-secret-value');
    expect(agentEnv['OPENAI_API_KEY']).toBe('sk-proj-abc123');
    // ...an unrelated non-secret survives...
    expect(agentEnv['PATH']).toBe('/usr/bin:/bin');
    // ...and the nested-session marker is stripped.
    expect(agentEnv).not.toHaveProperty('CLAUDECODE');
    expect(agentEnv).not.toHaveProperty('CLAUDE_CODE_ENTRYPOINT');
  });

  it('a forked child inherits the deny-listed env: toolchain + ordinary secrets pass through, provider secrets (bar the two whitelisted keys) are stripped', async () => {
    const childEnv = buildChildEnv(POLLUTED);
    const seen: Record<string, string> = await new Promise((resolve, reject) => {
      const child = fork(ENV_ECHO, [], { env: childEnv, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
      child.on('message', (m: { env: Record<string, string> }) => resolve(m.env));
      child.on('error', reject);
      setTimeout(() => reject(new Error('env-echo timeout')), 5000);
    });
    for (const key of Object.keys(seen)) {
      const isAgentApiKey = key === 'ANTHROPIC_API_KEY' || key === 'OPENAI_API_KEY';
      if (isAgentApiKey) continue;
      expect(/^(ANTHROPIC|OPENAI)_/i.test(key)).toBe(false);
    }
    expect(seen['ANTHROPIC_API_KEY']).toBe('sk-ant-super-secret-value');
    expect(seen['OPENAI_API_KEY']).toBe('sk-proj-abc123');
    expect(seen['JAVA_HOME']).toBe('/opt/jdk');
    expect(seen['MAVEN_OPTS']).toBe('-Xmx512m');
    expect(seen['MY_CI_TOKEN']).toBe('ghp_deadbeef');
    expect(seen['GITHUB_TOKEN']).toBe('ghp_realvalue');
    expect(seen['PATH']).toBe('/usr/bin:/bin');
  });
});
