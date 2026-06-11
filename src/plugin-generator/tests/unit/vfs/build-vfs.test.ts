// FR-ARCH-0010–0014 — flat sorted immutable VFS, deep-frozen, multi-source ordering
import { describe, it, expect } from 'vitest';
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
    // Two files: 'policy~overwrite.md' and 'policy~append.md' both map to 'policy.md'.
    // This exercises the "existing" merge branch in buildVfs (line 37).
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vfs-collision-'));
    try {
      // instructionsSource = tmpDir; path: tmpDir/<release>/<domain>/
      const base = path.join(tmpDir, 'r1', 'core', 'rules');
      fs.mkdirSync(base, { recursive: true });
      fs.writeFileSync(path.join(base, 'policy~overwrite.md'), '# Overwrite');
      fs.writeFileSync(path.join(base, 'policy~append.md'), '# Append');

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
