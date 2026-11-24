// FR-CLI-0035.AC1-4 — parseListArg, resolveCustomizationRoots; FR-CLI-0036 (A1) dedupe.
import { describe, it, expect } from 'vitest';
import path from 'path';
import { InvalidArgumentError } from 'commander';
import { parseListArg, dedupe, resolveCustomizationRoots } from '../../src/cli-args.js';

const SRC = path.resolve('/work/src-root');

// Mirrors commander's repeatable-option accumulation: fold each occurrence through the parser.
const fold = (...occurrences: string[]) => occurrences.reduce<string[]>((acc, v) => parseListArg(v, acc), []);

describe('parseListArg', () => {
  it('splits on comma and trims', () => {
    expect(parseListArg(' acme , team ', [])).toEqual(['acme', 'team']);
  });
  it('accumulates left to right across repeats (FR-CLI-0035.AC2)', () => {
    expect(fold('acme', 'team')).toEqual(['acme', 'team']);
    expect(fold('a,b', 'c', 'd,e')).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
  it('rejects an empty value (FR-CLI-0035.AC4)', () => {
    expect(() => parseListArg('', [])).toThrow(InvalidArgumentError);
  });
  it('rejects empty tokens: middle, leading, trailing, whitespace-only (FR-CLI-0035.AC4)', () => {
    for (const bad of ['acme,,team', ',acme', 'acme,', ' ', 'a, ,b']) {
      expect(() => parseListArg(bad, [])).toThrow(InvalidArgumentError);
    }
  });
});

describe('resolveCustomizationRoots', () => {
  it('resolves relative values against the source root, in order (FR-CLI-0035.AC1)', () => {
    expect(resolveCustomizationRoots(SRC, ['acme', 'team'])).toEqual([path.join(SRC, 'acme'), path.join(SRC, 'team')]);
  });
  it('keeps order across commas and repeats (FR-CLI-0035.AC1-2)', () => {
    expect(resolveCustomizationRoots(SRC, fold('acme,team'))).toEqual(resolveCustomizationRoots(SRC, fold('acme', 'team')));
  });
  it('uses an absolute value verbatim, with no normalization (FR-CLI-0035.AC3)', () => {
    expect(resolveCustomizationRoots(SRC, ['/opt/acme'])).toEqual(['/opt/acme']);
    expect(resolveCustomizationRoots(SRC, ['/opt/acme/../x'])).toEqual(['/opt/acme/../x']);
  });
  it('resolves ./ and ../ relative values against source', () => {
    expect(resolveCustomizationRoots(SRC, ['./a', '../b'])).toEqual([path.join(SRC, 'a'), path.resolve(SRC, '../b')]);
  });
  it('returns [] for no values', () => {
    expect(resolveCustomizationRoots(SRC, [])).toEqual([]);
  });
});

describe('dedupe (FR-CLI-0036, A1)', () => {
  it('collapses repeats keeping first-seen order', () => {
    expect(dedupe(['rosetta', 'rosetta-light', 'rosetta'])).toEqual(['rosetta', 'rosetta-light']);
  });
});
