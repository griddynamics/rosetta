// FR-ARCH-0010–0014 — flat sorted immutable VFS, deep-frozen, multi-source ordering
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildVfs } from '../../../src/vfs/build-vfs.js';

// Returns instructionsSource dir (tmpDir itself) — FR-CLI-0020
function makeTempInstructionTree(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vfs-test-'));
  const release = 'r1';
  const domain = 'core';
  // instructionsSource = tmpDir; path: tmpDir/<release>/<domain>/
  const base = path.join(tmpDir, release, domain);

  fs.mkdirSync(path.join(base, 'rules'), { recursive: true });
  fs.mkdirSync(path.join(base, 'workflows'), { recursive: true });

  fs.writeFileSync(path.join(base, 'rules', 'bootstrap-core.md'), '# Bootstrap Core');
  fs.writeFileSync(path.join(base, 'rules', 'plugin-files-mode.md'), '# Plugin Files Mode');
  fs.writeFileSync(path.join(base, 'workflows', 'coding-flow.md'), '# Coding Flow');
  // DS_Store should be skipped
  fs.writeFileSync(path.join(base, 'rules', '.DS_Store'), '');
  // Directive file — cleanName maps to "policy.md"
  fs.writeFileSync(path.join(base, 'rules', 'policy~overwrite.md'), '# Overwrite Policy');

  return tmpDir;
}

describe('buildVfs', () => {
  it('builds flat sorted VFS from filesystem', () => {
    const tmpDir = makeTempInstructionTree();
    try {
      const vfs = buildVfs(tmpDir, 'r1', 'core');
      // Should have files (excluding .DS_Store)
      expect(vfs.length).toBeGreaterThan(0);
      const paths = vfs.map((v) => v.path);
      // Lexicographic: rules/* before workflows/*
      const rulesIdx = paths.findIndex((p) => p.startsWith('rules/'));
      const workflowsIdx = paths.findIndex((p) => p.startsWith('workflows/'));
      expect(rulesIdx).toBeLessThan(workflowsIdx);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('skips .DS_Store files (FR-COPY-0010)', () => {
    const tmpDir = makeTempInstructionTree();
    try {
      const vfs = buildVfs(tmpDir, 'r1', 'core');
      const paths = vfs.map((v) => v.path);
      expect(paths.some((p) => p.includes('.DS_Store'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('applies directive parsing — clean name used for path', () => {
    const tmpDir = makeTempInstructionTree();
    try {
      const vfs = buildVfs(tmpDir, 'r1', 'core');
      const paths = vfs.map((v) => v.path);
      // policy~overwrite.md → policy.md (clean name)
      expect(paths).toContain('rules/policy.md');
      // The tilde filename must not appear in VFS paths
      expect(paths.some((p) => p.includes('~'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('deep-freezes VirtualFiles and SourceFiles', () => {
    const tmpDir = makeTempInstructionTree();
    try {
      const vfs = buildVfs(tmpDir, 'r1', 'core');
      expect(Object.isFrozen(vfs)).toBe(true);
      for (const vf of vfs) {
        expect(Object.isFrozen(vf)).toBe(true);
        expect(Object.isFrozen(vf.sourceFiles)).toBe(true);
        for (const sf of vf.sourceFiles) {
          expect(Object.isFrozen(sf)).toBe(true);
        }
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns sorted paths (lexicographic NFR-0002)', () => {
    const tmpDir = makeTempInstructionTree();
    try {
      const vfs = buildVfs(tmpDir, 'r1', 'core');
      const paths = vfs.map((v) => v.path);
      const sorted = [...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      expect(paths).toEqual(sorted);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('throws when instruction source directory does not exist', () => {
    expect(() => buildVfs('/nonexistent/path', 'r1', 'core')).toThrow();
  });

  it('multi-domain bundling: same relative path has multiple sourceFiles', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vfs-multi-'));
    try {
      // instructionsSource = tmpDir; path: tmpDir/<release>/<domain>/
      const coreBase = path.join(tmpDir, 'r1', 'core', 'rules');
      const acmeBase = path.join(tmpDir, 'r1', 'acme', 'rules');
      fs.mkdirSync(coreBase, { recursive: true });
      fs.mkdirSync(acmeBase, { recursive: true });
      fs.writeFileSync(path.join(coreBase, 'shared.md'), '# Core Shared');
      fs.writeFileSync(path.join(acmeBase, 'shared.md'), '# Acme Shared');
      fs.writeFileSync(path.join(acmeBase, 'acme-only.md'), '# Acme Only');

      const vfs = buildVfs(tmpDir, 'r1', 'core,acme');
      const sharedFile = vfs.find((v) => v.path === 'rules/shared.md');
      expect(sharedFile).toBeDefined();
      expect(sharedFile!.sourceFiles.length).toBe(2); // two sources bundled
      const acmeOnly = vfs.find((v) => v.path === 'rules/acme-only.md');
      expect(acmeOnly).toBeDefined();
      expect(acmeOnly!.sourceFiles.length).toBe(1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('directive rename collision: two differently-named files map to same cleanRelPath', () => {
    // Two valid directive filenames both map to 'policy.md'.
    // This exercises the "existing" merge branch in buildVfs (line 37).
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vfs-collision-'));
    try {
      // instructionsSource = tmpDir; path: tmpDir/<release>/<domain>/
      const base = path.join(tmpDir, 'r1', 'core', 'rules');
      fs.mkdirSync(base, { recursive: true });
      fs.writeFileSync(path.join(base, 'policy~overwrite.md'), '# Overwrite');
      fs.writeFileSync(path.join(base, 'policy~target-claude-only.md'), '# Core Claude only');

      const vfs = buildVfs(tmpDir, 'r1', 'core');
      const policyFile = vfs.find((v) => v.path === 'rules/policy.md');
      expect(policyFile).toBeDefined();
      // Both source files merged into the same VirtualFile
      expect(policyFile!.sourceFiles.length).toBe(2);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---- Multi-source VFS + order key (S3): FR-ARCH-0022, FR-ARCH-0026, FR-CUST-0001/0002.AC5, FR-ARCH-0024.AC1 ----
describe('buildVfs order key and customization roots', () => {
  const made: string[] = [];
  afterEach(() => {
    for (const d of made.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  function tree(layout: Record<string, string>): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vfs-key-'));
    made.push(root);
    for (const [rp, body] of Object.entries(layout)) {
      const abs = path.join(root, rp);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, body);
    }
    return root;
  }
  const orders = (vfs: ReturnType<typeof buildVfs>, p: string) =>
    vfs.find((v) => v.path === p)!.sourceFiles.map((s) => s.order);
  const origins = (vfs: ReturnType<typeof buildVfs>, p: string) =>
    vfs.find((v) => v.path === p)!.sourceFiles.map((s) => path.basename(s.origin));

  it('FR-ARCH-0022.AC1: ~1a~,~2a~,~10a~ order 10a,1a,2a', () => {
    const main = tree({
      'r3/core/w/f~1a~.md': '', 'r3/core/w/f~2a~.md': '', 'r3/core/w/f~10a~.md': '',
    });
    const vfs = buildVfs(main, 'r3', 'core');
    expect(orders(vfs, 'w/f.md')).toEqual(['A:w/f.md:10a', 'A:w/f.md:1a', 'A:w/f.md:2a']);
  });

  it('FR-ARCH-0022.AC2: bare file sorts before tokened file of same source', () => {
    const main = tree({ 'r3/core/w/f~5~.md': '', 'r3/core/w/f.md': '' });
    expect(origins(buildVfs(main, 'r3', 'core'), 'w/f.md')).toEqual(['f.md', 'f~5~.md']);
  });

  it('FR-ARCH-0022.AC3: main ~9z~ precedes customization ~0~ (letter A before B)', () => {
    const main = tree({ 'r3/core/w/f~9z~.md': '' });
    const acme = tree({ 'r3/core/w/f~0~.md': '' });
    const vfs = buildVfs(main, 'r3', 'core', [acme]);
    expect(orders(vfs, 'w/f.md')).toEqual(['A:w/f.md:9z', 'B:w/f.md:0']);
    expect(vfs.find((v) => v.path === 'w/f.md')!.sourceFiles[0].origin).toContain(main);
  });

  it('FR-ARCH-0022.AC4: zero-padded 001,002,010 order numerically', () => {
    const main = tree({
      'r3/core/w/f~010~.md': '', 'r3/core/w/f~001~.md': '', 'r3/core/w/f~002~.md': '',
    });
    expect(orders(buildVfs(main, 'r3', 'core'), 'w/f.md'))
      .toEqual(['A:w/f.md:001', 'A:w/f.md:002', 'A:w/f.md:010']);
  });

  it('FR-ARCH-0026.AC1: main + acme overwrite get keys A:/B: with main first', () => {
    const main = tree({ 'r3/core/agents/architect.md': '' });
    const acme = tree({ 'r3/core/agents/architect~overwrite~.md': '' });
    const vfs = buildVfs(main, 'r3', 'core', [acme]);
    expect(orders(vfs, 'agents/architect.md')).toEqual(['A:agents/architect.md:', 'B:agents/architect.md:']);
    expect(vfs.find((v) => v.path === 'agents/architect.md')!.sourceFiles[1].conditions.has('overwrite')).toBe(true);
  });

  it('FR-ARCH-0026.AC2: acme,team order main, acme (B), team (C)', () => {
    const main = tree({ 'r3/core/workflows/coding-flow.md': '' });
    const acme = tree({ 'r3/core/workflows/coding-flow.md': '' });
    const team = tree({ 'r3/core/workflows/coding-flow.md': '' });
    const sf = buildVfs(main, 'r3', 'core', [acme, team]).find((v) => v.path === 'workflows/coding-flow.md')!.sourceFiles;
    expect(sf.map((s) => s.order[0])).toEqual(['A', 'B', 'C']);
    expect([main, acme, team].map((r) => sf.findIndex((s) => s.origin.startsWith(r)))).toEqual([0, 1, 2]);
  });

  it('FR-ARCH-0026.AC3: same-source tie keeps raw filename order (bare before ~directive~)', () => {
    const main = tree({
      'r3/core/agents/architect~profile-lightweight-only~overwrite~.md': '',
      'r3/core/agents/architect.md': '',
    });
    const vfs = buildVfs(main, 'r3', 'core');
    expect(orders(vfs, 'agents/architect.md')).toEqual(['A:agents/architect.md:', 'A:agents/architect.md:']);
    expect(origins(vfs, 'agents/architect.md'))
      .toEqual(['architect.md', 'architect~profile-lightweight-only~overwrite~.md']);
  });

  it('FR-ARCH-0026.AC4: acme ~2~ and ~1~overwrite~ get B:...:1 then B:...:2', () => {
    const main = tree({ 'r3/core/workflows/coding-flow.md': '' });
    const acme = tree({
      'r3/core/workflows/coding-flow~2~.md': '', 'r3/core/workflows/coding-flow~1~overwrite~.md': '',
    });
    const vfs = buildVfs(main, 'r3', 'core', [acme]);
    expect(orders(vfs, 'workflows/coding-flow.md')).toEqual([
      'A:workflows/coding-flow.md:', 'B:workflows/coding-flow.md:1', 'B:workflows/coding-flow.md:2',
    ]);
  });

  it('FR-ARCH-0026: equal keys across folders keep folder (declared) order, not raw-path-major', () => {
    const main = tree({
      'r3/core/rules/a.md': '', 'r3/core/rules/b.md': '', 'r3/acme/rules/a.md': '', 'r3/acme/rules/b.md': '',
    });
    const vfs = buildVfs(main, 'r3', 'core,acme');
    for (const p of ['rules/a.md', 'rules/b.md']) {
      expect(vfs.find((v) => v.path === p)!.sourceFiles.map((s) => path.basename(path.dirname(path.dirname(s.origin)))))
        .toEqual(['core', 'acme']);
    }
    const dir = vfs.find((v) => v.path === 'rules/a.md')!.sourceFiles[0].origin;
    expect(dir).toContain(path.join('r3', 'core'));
  });

  it('FR-ARCH-0024.AC1 (order): four roots cust1..cust4 yield sources A,B,C,D,E', () => {
    const main = tree({ 'r3/core/agents/architect.md': '' });
    const roots = [1, 2, 3, 4].map((n) => {
      const r = tree({
        [`r3/core/agents/architect${n === 2 || n === 4 ? '~overwrite~' : ''}.md`]: '',
      });
      return r;
    });
    const sf = buildVfs(main, 'r3', 'core', roots).find((v) => v.path === 'agents/architect.md')!.sourceFiles;
    expect(sf.map((s) => s.order)).toEqual(
      ['A', 'B', 'C', 'D', 'E'].map((l) => `${l}:agents/architect.md:`),
    );
    expect(sf.map((s) => s.conditions.has('overwrite'))).toEqual([false, false, true, false, true]);
  });

  it('customization-only path becomes a new VirtualFile; missing release/folder contributes nothing', () => {
    const main = tree({ 'r3/core/rules/x.md': '' });
    const acme = tree({ 'r3/core/skills/new/SKILL.md': '' });
    const r2only = tree({ 'r2/core/rules/x.md': '' });
    const vfs = buildVfs(main, 'r3', 'core', [acme, r2only]);
    expect(vfs.map((v) => v.path)).toEqual(['rules/x.md', 'skills/new/SKILL.md']);
    expect(orders(vfs, 'skills/new/SKILL.md')).toEqual(['B:skills/new/SKILL.md:']);
  });

  it('FR-CUST-0001.AC5: no roots ⇒ identical result to omitted parameter, legacy order', () => {
    const main = tree({ 'r3/core/a/x.md': '', 'r3/core/a/x~overwrite~.md': '', 'r3/acme/a/x.md': '' });
    const withEmpty = buildVfs(main, 'r3', 'core,acme', []);
    const omitted = buildVfs(main, 'r3', 'core,acme');
    expect(withEmpty).toEqual(omitted);
    expect(origins(omitted, 'a/x.md')).toEqual(['x.md', 'x~overwrite~.md', 'x.md']);
  });

  it('FR-CUST-0002.AC5: ignored r3/.DS_Store in a root is not in the VFS', () => {
    const main = tree({ 'r3/core/rules/x.md': '' });
    const acme = tree({ 'r3/.DS_Store': '', 'r3/.gitkeep': '', 'r3/core/rules/y.md': '' });
    const paths = buildVfs(main, 'r3', 'core', [acme]).map((v) => v.path);
    expect(paths).toEqual(['rules/x.md', 'rules/y.md']);
  });

  it('result with roots is deep-frozen (sort happens before freeze, FR-ARCH-0013)', () => {
    const main = tree({ 'r3/core/w/f~2~.md': '', 'r3/core/w/f~1~.md': '' });
    const acme = tree({ 'r3/core/w/f.md': '' });
    const vfs = buildVfs(main, 'r3', 'core', [acme]);
    expect(Object.isFrozen(vfs)).toBe(true);
    const vf = vfs[0];
    expect(Object.isFrozen(vf.sourceFiles)).toBe(true);
    expect(vf.sourceFiles.every((s) => Object.isFrozen(s))).toBe(true);
  });

  it('names the offending file when a directive is invalid (FR-ARCH-0021)', () => {
    const main = tree({ 'r3/core/w/f~overwrite~overwrite~.md': '' });
    expect(() => buildVfs(main, 'r3', 'core')).toThrow(/f~overwrite~overwrite~\.md: .*overwrite/);
  });

  it('missing main folder still throws with roots supplied', () => {
    const acme = tree({ 'r3/core/rules/y.md': '' });
    expect(() => buildVfs('/nonexistent/path', 'r3', 'core', [acme])).toThrow(/not found/i);
  });
});
