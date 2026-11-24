// FR-CUST-0002.AC1-5, FR-CUST-0003.AC1-3, FR-ARCH-0026.AC5 — customization root validation, source letters
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  MAX_CUSTOMIZATION_ROOTS,
  sourceLetter,
  validateCustomizationRoots,
} from '../../../src/vfs/customizations.js';

const tmps: string[] = [];
afterEach(() => {
  for (const d of tmps.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

/** Creates a root; paths ending in `/` are directories, others files. */
function makeRoot(entries: string[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cust-val-'));
  tmps.push(root);
  for (const e of entries) {
    const abs = path.join(root, e);
    if (e.endsWith('/')) fs.mkdirSync(abs, { recursive: true });
    else {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, 'x');
    }
  }
  return root;
}

const declared = new Set(['core', 'qe']);

describe('sourceLetter (FR-ARCH-0026)', () => {
  it('maps 0→A, 1→B, 25→Z', () => {
    expect(sourceLetter(0)).toBe('A');
    expect(sourceLetter(1)).toBe('B');
    expect(sourceLetter(25)).toBe('Z');
  });
  it('throws above 25 and for negatives', () => {
    expect(() => sourceLetter(26)).toThrow(/25/);
    expect(() => sourceLetter(-1)).toThrow();
  });
});

describe('validateCustomizationRoots', () => {
  it('FR-ARCH-0026.AC5: 25 roots ok, 26 roots error stating the limit', () => {
    const root = makeRoot(['r3/core/']);
    expect(MAX_CUSTOMIZATION_ROOTS).toBe(25);
    expect(validateCustomizationRoots(Array(25).fill(root), 'r3', declared)).toEqual([]);
    const errs = validateCustomizationRoots(Array(26).fill(root), 'r3', declared);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/limit is 25/);
  });

  it('FR-CUST-0003.AC1: missing root names the resolved path', () => {
    const errs = validateCustomizationRoots(['/nonexistent/missing'], 'r3', declared);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain('/nonexistent/missing');
  });

  it('FR-CUST-0003.AC2: root that is a file names the path', () => {
    const root = makeRoot(['notes.md']);
    const file = path.join(root, 'notes.md');
    const errs = validateCustomizationRoots([file], 'r3', declared);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain(file);
    expect(errs[0]).toMatch(/not a directory/);
  });

  it('FR-CUST-0003.AC3: root without <release>/ is not an error', () => {
    const root = makeRoot(['r2/core/', 'r2/bogus/']);
    expect(validateCustomizationRoots([root], 'r3', declared)).toEqual([]);
  });

  it('FR-CUST-0002.AC3: root holding only declared folders is accepted', () => {
    const root = makeRoot(['r3/core/skills/x/SKILL.md']);
    expect(validateCustomizationRoots([root], 'r3', declared)).toEqual([]);
  });

  it('FR-CUST-0002.AC1: undeclared folder is an error naming the path', () => {
    const root = makeRoot(['r3/acme/skills/x/SKILL.md', 'r3/core/']);
    const errs = validateCustomizationRoots([root], 'r3', declared);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain(path.join(root, 'r3', 'acme'));
  });

  it('FR-CUST-0002.AC2: loose file under <root>/<release>/ is an error naming the path', () => {
    const root = makeRoot(['r3/README.md', 'r3/core/']);
    const errs = validateCustomizationRoots([root], 'r3', declared);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain(path.join(root, 'r3', 'README.md'));
  });

  it('FR-CUST-0002.AC4: entries directly under <root>/ other than the release are ignored', () => {
    const root = makeRoot(['README.md', 'LICENSE', '.git/HEAD', '.gitignore', 'docs/guide.md', 'r3/core/']);
    expect(validateCustomizationRoots([root], 'r3', declared)).toEqual([]);
  });

  it('FR-CUST-0002.AC5: dot-entries under <root>/<release>/ are ignored (file and dir)', () => {
    const root = makeRoot(['r3/.DS_Store', 'r3/.gitkeep', 'r3/.hidden/a.md', 'r3/core/']);
    expect(validateCustomizationRoots([root], 'r3', declared)).toEqual([]);
  });

  it('collects violations across roots (all, not first)', () => {
    const a = makeRoot(['r3/acme/']);
    const b = makeRoot(['r3/LOOSE.md']);
    const errs = validateCustomizationRoots([a, '/nonexistent/z', b], 'r3', declared);
    expect(errs).toHaveLength(3);
  });

  it('accepts the same root twice (A4: duplicates allowed)', () => {
    const root = makeRoot(['r3/core/']);
    expect(validateCustomizationRoots([root, root], 'r3', declared)).toEqual([]);
  });

  it('release entry that is a file is treated as no contribution', () => {
    const root = makeRoot(['r3']);
    expect(validateCustomizationRoots([root], 'r3', declared)).toEqual([]);
  });

  it('M1: a dangling symlink under <root>/<release>/ is a violation, not a thrown ENOENT', () => {
    const root = makeRoot(['r3/']);
    fs.symlinkSync(path.join(root, 'nowhere'), path.join(root, 'r3', 'core'));
    const errs = validateCustomizationRoots([root], 'r3', declared);
    expect(errs).toEqual([`Customization root has a broken symlink: ${path.join(root, 'r3', 'core')}`]);
  });

  it('M1: a folder-level symlink to a directory is accepted', () => {
    const target = makeRoot(['skills/x/SKILL.md']);
    const root = makeRoot(['r3/']);
    fs.symlinkSync(target, path.join(root, 'r3', 'core'));
    expect(validateCustomizationRoots([root], 'r3', declared)).toEqual([]);
  });
});
