// FR-CLI-0030/0031, FR-CUST-0001, FR-CUST-0003.AC3, FR-ARCH-0026 — single domain, multi-domain bundling, missing domain error
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { resolveLayerDirs, collectSourceFiles, type LayerDir } from '../../../src/vfs/source-resolver.js';

// Returns the instructionsSource dir (tmpDir/instructions/) — FR-CLI-0020
function makeTempInstructionDir(release: string, domains: string[]): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'src-resolver-'));
  for (const domain of domains) {
    const base = path.join(tmpDir, release, domain, 'rules');
    fs.mkdirSync(base, { recursive: true });
    fs.writeFileSync(path.join(base, `${domain}-rule.md`), `# ${domain} rule`);
    if (domain === 'core') {
      fs.writeFileSync(path.join(base, 'shared.md'), `# Core shared`);
    }
    if (domain === 'acme') {
      fs.writeFileSync(path.join(base, 'shared.md'), `# Acme shared`);
    }
  }
  return tmpDir;
}

const dirsOf = (layers: LayerDir[]) => layers.map((l) => l.dir);
const mainLayers = (src: string, rel: string, dom: string) => resolveLayerDirs(src, [], rel, dom);
const rel = (files: { relPath: string }[]) => files.map((f) => f.relPath);

describe('resolveLayerDirs', () => {
  it('returns single dir for single domain', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core']);
    try {
      const dirs = mainLayers(tmpDir, 'r2', 'core');
      expect(dirs).toHaveLength(1);
      expect(dirs[0].dir).toContain('r2/core');
      expect(dirs[0].letter).toBe('A');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns ordered dirs for multi-domain (left→right)', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core', 'acme']);
    try {
      const dirs = mainLayers(tmpDir, 'r2', 'core,acme');
      expect(dirs).toHaveLength(2);
      expect(dirs[0].dir).toContain('core');
      expect(dirs[1].dir).toContain('acme');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('throws for missing domain', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core']);
    try {
      expect(() => mainLayers(tmpDir, 'r2', 'missing-domain')).toThrow(/not found/i);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('trims spaces around domain names', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core']);
    try {
      const dirs = mainLayers(tmpDir, 'r2', ' core ');
      expect(dirs).toHaveLength(1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('collectSourceFiles', () => {
  it('collects all files under source dir, tagged with letter and abs path', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core']);
    try {
      const files = collectSourceFiles(mainLayers(tmpDir, 'r2', 'core'));
      expect(rel(files)).toContain('rules/core-rule.md');
      const f = files.find((x) => x.relPath === 'rules/core-rule.md')!;
      expect(f.letter).toBe('A');
      expect(f.absPath).toBe(path.join(tmpDir, 'r2', 'core', 'rules', 'core-rule.md'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('same path in two folders yields two entries in folder order (left→right)', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core', 'acme']);
    try {
      const files = collectSourceFiles(mainLayers(tmpDir, 'r2', 'core,acme'))
        .filter((f) => f.relPath === 'rules/shared.md');
      expect(files).toHaveLength(2);
      expect(files[0].absPath).toContain('core');
      expect(files[1].absPath).toContain('acme');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('load order is folder-major then sorted raw path (not raw-path-major)', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core', 'acme']);
    try {
      const files = collectSourceFiles(mainLayers(tmpDir, 'r2', 'core,acme'));
      expect(files.map((f) => `${path.basename(path.dirname(path.dirname(f.absPath)))}:${f.relPath}`)).toEqual([
        'core:rules/core-rule.md',
        'core:rules/shared.md',
        'acme:rules/acme-rule.md',
        'acme:rules/shared.md',
      ]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('skips .DS_Store files (FR-COPY-0010)', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core']);
    try {
      fs.writeFileSync(path.join(tmpDir, 'r2', 'core', '.DS_Store'), '');
      fs.writeFileSync(path.join(tmpDir, 'r2', 'core', 'rules', '.DS_Store'), '');
      const files = collectSourceFiles(mainLayers(tmpDir, 'r2', 'core'));
      expect(rel(files).some((k) => k.includes('.DS_Store'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('customization layers (FR-CUST-0001, FR-CUST-0003.AC3, FR-ARCH-0026)', () => {
  function makeRoot(name: string, layout: Record<string, string>): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `cust-${name}-`));
    for (const [rp, body] of Object.entries(layout)) {
      const abs = path.join(root, rp);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, body);
    }
    return root;
  }

  it('orders layers A (all folders) then B.. per root, folders in declared order', () => {
    const main = makeTempInstructionDir('r3', ['core', 'acme']);
    const c1 = makeRoot('c1', { 'r3/core/rules/x.md': 'x', 'r3/acme/rules/y.md': 'y' });
    const c2 = makeRoot('c2', { 'r3/core/rules/z.md': 'z' });
    try {
      const layers = resolveLayerDirs(main, [c1, c2], 'r3', 'core,acme');
      expect(layers.map((l) => l.letter)).toEqual(['A', 'A', 'B', 'B', 'C']);
      expect(dirsOf(layers)).toEqual([
        path.join(main, 'r3', 'core'), path.join(main, 'r3', 'acme'),
        path.join(c1, 'r3', 'core'), path.join(c1, 'r3', 'acme'),
        path.join(c2, 'r3', 'core'),
      ]);
    } finally {
      for (const d of [main, c1, c2]) fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it('skips a customization root without <release>/ or <folder>/ (FR-CUST-0003.AC3)', () => {
    const main = makeTempInstructionDir('r3', ['core']);
    const r2only = makeRoot('r2only', { 'r2/core/rules/x.md': 'x' });
    const nofolder = makeRoot('nofolder', { 'r3/other/rules/x.md': 'x' });
    try {
      const layers = resolveLayerDirs(main, [r2only, nofolder], 'r3', 'core');
      expect(layers).toEqual([{ letter: 'A', dir: path.join(main, 'r3', 'core') }]);
    } finally {
      for (const d of [main, r2only, nofolder]) fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it('keeps letters by root index even when an earlier root is skipped', () => {
    const main = makeTempInstructionDir('r3', ['core']);
    const skipped = makeRoot('skipped', { 'r2/core/rules/x.md': 'x' });
    const used = makeRoot('used', { 'r3/core/rules/x.md': 'x' });
    try {
      const layers = resolveLayerDirs(main, [skipped, used], 'r3', 'core');
      expect(layers.map((l) => l.letter)).toEqual(['A', 'C']);
    } finally {
      for (const d of [main, skipped, used]) fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it('main missing folder still throws even with customization roots', () => {
    const main = makeTempInstructionDir('r3', ['core']);
    const c1 = makeRoot('c1', { 'r3/nope/rules/x.md': 'x' });
    try {
      expect(() => resolveLayerDirs(main, [c1], 'r3', 'nope')).toThrow(/not found/i);
    } finally {
      for (const d of [main, c1]) fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it('ignored entries directly under <root>/<release>/ never become files (FR-CUST-0002.AC5)', () => {
    const main = makeTempInstructionDir('r3', ['core']);
    const c1 = makeRoot('c1', {
      'r3/.DS_Store': '', 'r3/.gitkeep': '', 'r3/.hidden/a.md': 'a', 'r3/core/rules/x.md': 'x',
    });
    try {
      const files = collectSourceFiles(resolveLayerDirs(main, [c1], 'r3', 'core'))
        .filter((f) => f.letter === 'B');
      expect(rel(files)).toEqual(['rules/x.md']);
    } finally {
      for (const d of [main, c1]) fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it('throws for more than 25 customization roots (letter range)', () => {
    const main = makeTempInstructionDir('r3', ['core']);
    try {
      const roots = Array.from({ length: 26 }, (_, i) => `/nonexistent/${i}`);
      expect(() => resolveLayerDirs(main, roots, 'r3', 'core')).toThrow(/25/);
    } finally {
      fs.rmSync(main, { recursive: true, force: true });
    }
  });
});
