import { describe, it, expect } from 'vitest';
import { buildEphemeralCase, DEFAULT_INLINE_QNA } from '../../src/cases/ephemeral';
import { ConfigError } from '../../src/shared/errors';

describe('ephemeral case builder (D7, §8)', () => {
  it('applies neutral defaults: permissive qna with abort fallback, no evaluators', () => {
    const c = buildEphemeralCase({ prompt: 'do the thing', agents: ['claude-code'] });
    expect(c.ephemeral).toBe(true);
    expect(c.name).toBe('inline');
    expect(c.prompt).toBe('do the thing');
    expect(c.qna).toBe(DEFAULT_INLINE_QNA);
    expect(c.qna.toLowerCase()).toContain('abort');
    expect(c.evaluation).toBeUndefined();
    expect(c.config.evaluators).toEqual([]);
    expect(c.config.agents).toEqual(['claude-code']);
  });

  it('adds evaluators only when both --evaluate and --eval are supplied', () => {
    const withoutEval = buildEphemeralCase({ prompt: 'p', agents: ['x'], evaluate: true });
    expect(withoutEval.config.evaluators).toEqual([]);
    expect(withoutEval.evaluation).toBeUndefined();

    const withEval = buildEphemeralCase({
      prompt: 'p',
      agents: ['x'],
      evaluate: true,
      eval: 'Score 100 if done.',
    });
    expect(withEval.evaluation).toBe('Score 100 if done.');
    expect(withEval.config.evaluators).toEqual([{ use: 'llm-judge', weight: 1.0 }]);
  });

  it('uses a supplied qna policy over the default', () => {
    const c = buildEphemeralCase({ prompt: 'p', agents: ['x'], qna: 'always approve' });
    expect(c.qna).toBe('always approve');
  });

  it('throws when prompt is empty', () => {
    expect(() => buildEphemeralCase({ prompt: '   ', agents: ['x'] })).toThrow(ConfigError);
  });

  it('throws when no agents are provided', () => {
    expect(() => buildEphemeralCase({ prompt: 'p', agents: [] })).toThrow(ConfigError);
  });
});
