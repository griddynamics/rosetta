import { test, describe, expect, vi, afterEach } from 'vitest';
import { hasExtension, pathContainsAny,
         isInTempDir, toRelative, walkUp, hasMarkerBeforeBoundary } from '../../src/runtime/path-utils';
import path from 'path';
import os from 'os';
import fs from 'fs';

describe('hasExtension', () => {
  test('matches .py', () => expect(hasExtension('foo/bar.py', ['.py', '.js'])).toBe(true));
  test('no match .ts', () => expect(hasExtension('foo/bar.ts', ['.py', '.js'])).toBe(false));
  test('empty path returns false', () => expect(hasExtension('', ['.py'])).toBe(false));
});

describe('pathContainsAny', () => {
  test('matches segment', () => expect(pathContainsAny('a/agents/TEMP/b.py', ['agents/TEMP/'])).toBe(true));
  test('no match', () => expect(pathContainsAny('a/src/b.py', ['agents/TEMP/'])).toBe(false));
});

describe('isInTempDir', () => {
  test('tmp/ → true', () => expect(isInTempDir('tmp/foo.md')).toBe(true));
  test('agents/TEMP/ → true', () => expect(isInTempDir('agents/TEMP/bar.md')).toBe(true));
  test('.tmp/ → true', () => expect(isInTempDir('.tmp/foo.md')).toBe(true));
  test('docs/ → false', () => expect(isInTempDir('docs/foo.md')).toBe(false));
  test('templates/ → false', () => expect(isInTempDir('templates/foo.md')).toBe(false));
});

describe('toRelative', () => {
  test('strips leading /', () => expect(toRelative('/foo/bar.ts')).toBe('foo/bar.ts'));
  test('strips leading ./', () => expect(toRelative('./foo/bar.ts')).toBe('foo/bar.ts'));
  test('normalizes backslash', () => expect(toRelative('foo\\bar.ts')).toBe('foo/bar.ts'));
});

describe('hasMarkerBeforeBoundary', () => {
  afterEach(() => vi.restoreAllMocks());

  test('marker found in startDir → true', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p) =>
      (p as string).endsWith('/__init__.py'),
    );
    expect(hasMarkerBeforeBoundary('/proj/src', '__init__.py', '.git')).toBe(true);
  });

  test('boundary found before marker → false', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p) =>
      (p as string).endsWith('/.git'),
    );
    expect(hasMarkerBeforeBoundary('/proj/src', '__init__.py', '.git')).toBe(false);
  });

  test('neither found within maxLevels → false', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    expect(hasMarkerBeforeBoundary('/proj/src', '__init__.py', '.git')).toBe(false);
  });

  test('marker one level up → true', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => (p as string) === '/proj/__init__.py');
    expect(hasMarkerBeforeBoundary('/proj/src', '__init__.py', '.git')).toBe(true);
  });
});

describe('walkUp', () => {
  test('returns null when marker not found', () =>
    expect(walkUp('/tmp', '.nonexistent-marker-xyzzy')).toBeNull());

  test('finds marker in parent dir', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rosetta-test-'));
    const sub = path.join(tmp, 'a', 'b');
    fs.mkdirSync(sub, { recursive: true });
    fs.writeFileSync(path.join(tmp, '.testmarker'), '');
    expect(walkUp(sub, '.testmarker')).toBe(tmp);
    fs.rmSync(tmp, { recursive: true });
  });
});
