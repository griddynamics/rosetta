import { DANGEROUS_BASH, DANGEROUS_PATHS, DANGEROUS_CONTENT } from '../src/hooks/dangerous-actions-patterns';
import { describe, test, expect } from 'vitest';

describe('patterns — structure', () => {
  test('DANGEROUS_BASH has at least 10 entries', () => {
    expect(DANGEROUS_BASH.length).toBeGreaterThanOrEqual(10);
  });
  test('DANGEROUS_PATHS has at least 5 entries', () => {
    expect(DANGEROUS_PATHS.length).toBeGreaterThanOrEqual(5);
  });
  test('DANGEROUS_CONTENT has at least 3 entries', () => {
    expect(DANGEROUS_CONTENT.length).toBeGreaterThanOrEqual(3);
  });
  test('each entry has id, re (RegExp), and label', () => {
    for (const p of [...DANGEROUS_BASH, ...DANGEROUS_PATHS, ...DANGEROUS_CONTENT]) {
      expect(typeof p.id).toBe('string');
      expect(p.re).toBeInstanceOf(RegExp);
      expect(typeof p.label).toBe('string');
    }
  });
});

describe('pattern correctness — positive matches', () => {
  const findById = (arr: typeof DANGEROUS_BASH, id: string) => {
    const p = arr.find(e => e.id === id);
    if (!p) throw new Error(`Pattern "${id}" not found`);
    return p.re;
  };

  describe('git-force-push', () => {
    let re: RegExp;
    test('setup', () => { re = findById(DANGEROUS_BASH, 'git-force-push'); });
    test('matches: git push --force', () => {
      expect(re.test('git push --force')).toBe(true);
    });
    test('matches: git push origin --force', () => {
      expect(re.test('git push origin --force')).toBe(true);
    });
    test('matches: git push origin main --force', () => {
      expect(re.test('git push origin main --force')).toBe(true);
    });
    test('does NOT match: git push --force-with-lease', () => {
      expect(re.test('git push --force-with-lease')).toBe(false);
    });
    test('does NOT match: git push origin main', () => {
      expect(re.test('git push origin main')).toBe(false);
    });
  });

  describe('secret-env (matched against basename)', () => {
    let re: RegExp;
    test('setup', () => { re = findById(DANGEROUS_PATHS, 'secret-env'); });
    test('matches basename: .env', () => {
      expect(re.test('.env')).toBe(true);
    });
    test('matches basename: .env.local', () => {
      expect(re.test('.env.local')).toBe(true);
    });
    test('does NOT match basename: .environment', () => {
      expect(re.test('.environment')).toBe(false);
    });
  });

  describe('content-sql-drop-table', () => {
    let re: RegExp;
    test('setup', () => { re = findById(DANGEROUS_CONTENT, 'content-sql-drop-table'); });
    test('matches: DROP TABLE users', () => {
      expect(re.test('DROP TABLE users')).toBe(true);
    });
  });

  describe('inline-aws-key', () => {
    let re: RegExp;
    test('setup', () => { re = findById(DANGEROUS_CONTENT, 'inline-aws-key'); });
    test('matches: AKIAIOSFODNN7EXAMPLE', () => {
      expect(re.test('AKIAIOSFODNN7EXAMPLE')).toBe(true);
    });
  });

  describe('safe commands do not match DANGEROUS_BASH', () => {
    test('git push origin main does not match any pattern', () => {
      const cmd = 'git push origin main';
      for (const p of DANGEROUS_BASH) {
        expect(p.re.test(cmd), `Pattern "${p.id}" should not match safe command`).toBe(false);
      }
    });
  });
});
