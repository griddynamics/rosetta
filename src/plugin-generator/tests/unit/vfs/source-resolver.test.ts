// FR-CLI-0030/0031 — single domain, multi-domain bundling, missing domain error
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { resolveSourceDirs, collectSourceFiles } from '../../../src/vfs/source-resolver.js';

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

describe('resolveSourceDirs', () => {
  it('returns single dir for single domain', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core']);
    try {
      const dirs = resolveSourceDirs(tmpDir, 'r2', 'core');
      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toContain('r2/core');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns ordered dirs for multi-domain (left→right)', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core', 'acme']);
    try {
      const dirs = resolveSourceDirs(tmpDir, 'r2', 'core,acme');
      expect(dirs).toHaveLength(2);
      expect(dirs[0]).toContain('core');
      expect(dirs[1]).toContain('acme');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('throws for missing domain', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core']);
    try {
      expect(() => resolveSourceDirs(tmpDir, 'r2', 'missing-domain')).toThrow(/not found/i);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('trims spaces around domain names', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core']);
    try {
      const dirs = resolveSourceDirs(tmpDir, 'r2', ' core ');
      expect(dirs).toHaveLength(1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('collectSourceFiles', () => {
  it('collects all files under source dir', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core']);
    try {
      const dirs = resolveSourceDirs(tmpDir, 'r2', 'core');
      const fileMap = collectSourceFiles(dirs);
      expect(fileMap.size).toBeGreaterThan(0);
      expect(fileMap.has('rules/core-rule.md')).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('concatenates same-path sources for multi-domain (left→right)', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core', 'acme']);
    try {
      const dirs = resolveSourceDirs(tmpDir, 'r2', 'core,acme');
      const fileMap = collectSourceFiles(dirs);
      const shared = fileMap.get('rules/shared.md');
      expect(shared).toBeDefined();
      expect(shared!.length).toBe(2);
      // core is first (left), acme is second (right)
      expect(shared![0]).toContain('core');
      expect(shared![1]).toContain('acme');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('acme-only file appears with single source', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core', 'acme']);
    try {
      const dirs = resolveSourceDirs(tmpDir, 'r2', 'core,acme');
      const fileMap = collectSourceFiles(dirs);
      const acmeOnly = fileMap.get('rules/acme-rule.md');
      expect(acmeOnly).toBeDefined();
      expect(acmeOnly!.length).toBe(1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('skips .DS_Store files', () => {
    const tmpDir = makeTempInstructionDir('r2', ['core']);
    try {
      const base = path.join(tmpDir, 'r2', 'core');
      fs.writeFileSync(path.join(base, '.DS_Store'), '');
      const dirs = resolveSourceDirs(tmpDir, 'r2', 'core');
      const fileMap = collectSourceFiles(dirs);
      expect([...fileMap.keys()].some((k) => k.includes('.DS_Store'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
