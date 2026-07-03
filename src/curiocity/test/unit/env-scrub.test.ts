import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { assertNoSecrets, buildChildEnv } from '../../src/orchestrator/env';
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
  ANTHROPIC_API_KEY: 'sk-ant-super-secret-value',
  OPENAI_API_KEY: 'sk-proj-abc123',
  MY_CI_TOKEN: 'ghp_deadbeef',
  RANDOM_VAR: 'keep-me-out',
};

describe('child env scrub (§4)', () => {
  it('buildChildEnv keeps ONLY the allow-list', () => {
    const env = buildChildEnv(POLLUTED);
    expect(Object.keys(env).sort()).toEqual([
      'HOME',
      'LANG',
      'LC_TIME',
      'LOGNAME',
      'PATH',
      'TERM',
      'USER',
    ]);
    expect(env).not.toHaveProperty('ANTHROPIC_API_KEY');
    expect(env).not.toHaveProperty('OPENAI_API_KEY');
    expect(env).not.toHaveProperty('MY_CI_TOKEN');
    expect(env).not.toHaveProperty('RANDOM_VAR');
  });

  it('assertNoSecrets rejects secret-shaped keys and values', () => {
    expect(() => assertNoSecrets({ ANTHROPIC_API_KEY: 'x' })).toThrow(CuriocityError);
    expect(() => assertNoSecrets({ FOO: 'sk-ant-abcdefgh12345' })).toThrow(CuriocityError);
    expect(() => assertNoSecrets({ PATH: '/usr/bin', HOME: '/h' })).not.toThrow();
  });

  it('a forked child inherits only the allow-listed env (no ANTHROPIC/OPENAI/sk-*)', async () => {
    const childEnv = buildChildEnv(POLLUTED);
    const seen: Record<string, string> = await new Promise((resolve, reject) => {
      const child = fork(ENV_ECHO, [], { env: childEnv, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
      child.on('message', (m: { env: Record<string, string> }) => resolve(m.env));
      child.on('error', reject);
      setTimeout(() => reject(new Error('env-echo timeout')), 5000);
    });
    // Node may inject a couple of its own vars; assert NO secret ever crosses and
    // every key we passed is allow-listed.
    for (const key of Object.keys(seen)) {
      expect(/^(ANTHROPIC|OPENAI)_/.test(key)).toBe(false);
    }
    for (const value of Object.values(seen)) {
      expect(/\bsk-[A-Za-z0-9_-]{8,}/.test(value)).toBe(false);
    }
    expect(seen['ANTHROPIC_API_KEY']).toBeUndefined();
    expect(seen['MY_CI_TOKEN']).toBeUndefined();
    expect(seen['PATH']).toBe('/usr/bin:/bin');
  });
});
