// NFR-0002, PARITY-5 — lexicographic comparator matches Python sorted()
import { describe, it, expect } from 'vitest';
import { lexicographicCompare, sortPaths } from '../../../src/vfs/sort.js';

describe('lexicographicCompare', () => {
  it('returns 0 for equal strings', () => {
    expect(lexicographicCompare('abc', 'abc')).toBe(0);
  });

  it('returns negative for lesser string', () => {
    expect(lexicographicCompare('abc', 'abd')).toBeLessThan(0);
  });

  it('returns positive for greater string', () => {
    expect(lexicographicCompare('abd', 'abc')).toBeGreaterThan(0);
  });

  // PARITY-5: byte order means '1' (49) < '2' (50), so "10a" < "2a"
  it('10a sorts before 2a (byte order, not numeric)', () => {
    expect(lexicographicCompare('10a', '2a')).toBeLessThan(0);
  });

  it('is case-sensitive — uppercase sorts before lowercase (byte order)', () => {
    // 'A' = 65, 'a' = 97 — uppercase comes first
    expect(lexicographicCompare('A', 'a')).toBeLessThan(0);
  });

  it('handles path separators correctly', () => {
    // '/' = 47, '-' = 45 — hyphen sorts BEFORE slash in byte order
    expect(lexicographicCompare('rules/a', 'rules-b')).toBeGreaterThan(0);
    // digits come before uppercase letters by byte order
    expect(lexicographicCompare('rules/10', 'rules/B')).toBeLessThan(0);
  });
});

describe('sortPaths', () => {
  it('sorts simple string array lexicographically', () => {
    const paths = ['workflows/z.md', 'rules/a.md', 'agents/b.md'];
    const sorted = sortPaths(paths, (p) => p);
    // 'a' < 'r' < 'w'
    expect(sorted).toEqual(['agents/b.md', 'rules/a.md', 'workflows/z.md']);
  });

  it('sorts objects by key function', () => {
    const items = [{ path: 'z.md' }, { path: 'a.md' }, { path: 'm.md' }];
    const sorted = sortPaths(items, (i) => i.path);
    expect(sorted.map((i) => i.path)).toEqual(['a.md', 'm.md', 'z.md']);
  });

  it('matches Python sorted() order for representative paths', () => {
    // Representative set covering case, digit, separator differences.
    // Python sorted() uses Unicode code point order (same as JS string comparison).
    // '1'=49, '2'=50, 'B'=66, 'b'=98 — digits < uppercase < lowercase
    const paths = [
      'rules/bootstrap-rosetta-files.md',
      'rules/bootstrap-core-policy.md',
      'rules/Bootstrap-Policy.md', // uppercase B (66) — sorts AFTER digits, BEFORE lowercase
      'rules/10-factor.md',        // '1'=49 < '2'=50 so "10" < "2"
      'rules/2-factor.md',
    ];
    const sorted = sortPaths(paths, (p) => p);
    // '1' (49) < '2' (50) < 'B' (66) < 'b' (98)
    expect(sorted[0]).toBe('rules/10-factor.md');         // "10" < "2" (1 < 2)
    expect(sorted[1]).toBe('rules/2-factor.md');           // "2" < "B" (50 < 66)
    expect(sorted[2]).toBe('rules/Bootstrap-Policy.md');  // "B" < "b" (66 < 98)
  });

  it('does not mutate the original array', () => {
    const original = ['b.md', 'a.md'];
    sortPaths(original, (p) => p);
    expect(original).toEqual(['b.md', 'a.md']);
  });

  it('handles empty array', () => {
    expect(sortPaths([], (p) => p)).toEqual([]);
  });
});
