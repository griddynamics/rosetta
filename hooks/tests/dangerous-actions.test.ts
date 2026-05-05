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
