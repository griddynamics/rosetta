import { describe, it, expect } from 'vitest';
import { maskSecret, maskSecretsIn } from '../../src/shared/mask';

describe('secret masking (§4/§12)', () => {
  it('reveals at most the last 4 chars, never the middle', () => {
    const masked = maskSecret('sk-ant-1234abcd');
    expect(masked).toHaveLength('sk-ant-1234abcd'.length);
    expect(masked.endsWith('abcd')).toBe(true);
    expect(masked.slice(0, -4)).toMatch(/^\*+$/);
    expect(masked).not.toContain('1234');
    expect(maskSecret('abcd')).toBe('****'); // ≤4 chars: fully masked
    expect(maskSecret('')).toBe('');
  });

  it('masks every value in a record (keys are safe to log)', () => {
    const masked = maskSecretsIn({ anthropic: 'sk-verysecretkey', openai: 'sk-anothersecret' });
    expect(masked.anthropic.endsWith('tkey')).toBe(true);
    expect(masked.anthropic).not.toContain('verysecret');
    expect(masked.openai).not.toContain('anothersec');
  });
});
