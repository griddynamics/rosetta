// FR-HOOK-0020–0022 — pluginSyncBundles: r3 adds .js; r2 removes stale; preserve unmanaged
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pluginSyncBundles } from '../../../src/plugin-processors/plugin-sync-bundles.js';
import type { PluginProcessingFrame, PluginSpec } from '../../../src/types.js';

const BUNDLE_NAMES = [
  'dangerous-actions.js',
  'codemap-refresh.js',
  'lint-format-advisory.js',
  'loose-files.js',
  'md-file-advisory.js',
  'read-once.js',
  'read-once-reset.js',
];

function makePluginFrame(spec: Partial<PluginSpec>): PluginProcessingFrame {
  return {
    spec: spec as PluginSpec,
    vfs: [] as any,
    frames: [],
    templateContext: {},
    errors: [],
  };
}

// FR-CLI-0020: hooksSource = <source>/hooks; bundles at hooksSource/dist/bundles/<target>/
function makeTempRepo(targetName: string, bundles: string[]): {
  hooksSource: string;
  outputDir: string;
  cleanup: () => void;
} {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-bundles-'));
  const hooksSource = path.join(tmpDir, 'hooks');
  const outputDir = path.join(tmpDir, 'output');

  // Create bundle source files at hooksSource/dist/bundles/<target>/
  const bundleDir = path.join(hooksSource, 'dist', 'bundles', targetName);
  fs.mkdirSync(bundleDir, { recursive: true });
  for (const b of bundles) {
    fs.writeFileSync(path.join(bundleDir, b), `// ${b}`);
  }

  return {
    hooksSource,
    outputDir,
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
  };
}

describe('pluginSyncBundles', () => {
  it('r3: copies all bundle .js files to hook folder', () => {
    const { hooksSource, outputDir, cleanup } = makeTempRepo('core-claude', BUNDLE_NAMES);
    try {
      const spec: Partial<PluginSpec> = {
        name: 'core-claude',
        destination: 'core-claude',
        hookFolder: 'hooks',
        bundleSource: 'core-claude',
      };
      const targetDir = path.join(outputDir, 'core-claude');
      fs.mkdirSync(targetDir, { recursive: true });
      const p = makePluginFrame(spec);
      pluginSyncBundles(hooksSource, outputDir, true)(p);
      for (const b of BUNDLE_NAMES) {
        expect(fs.existsSync(path.join(targetDir, 'hooks', b))).toBe(true);
      }
    } finally {
      cleanup();
    }
  });

  it('r2: removes stale .js files from hook folder', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-stale-'));
    try {
      const hooksSource = path.join(tmpDir, 'hooks');
      const outputDir = path.join(tmpDir, 'output');
      const hookDir = path.join(outputDir, 'core-claude', 'hooks');
      fs.mkdirSync(hookDir, { recursive: true });
      fs.writeFileSync(path.join(hookDir, 'dangerous-actions.js'), '// stale');
      const spec: Partial<PluginSpec> = {
        name: 'core-claude',
        destination: 'core-claude',
        hookFolder: 'hooks',
      };
      pluginSyncBundles(hooksSource, outputDir, false)(makePluginFrame(spec));
      expect(fs.existsSync(path.join(hookDir, 'dangerous-actions.js'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('r2: preserves unmanaged files in hook folder', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-preserve-'));
    try {
      const hooksSource = path.join(tmpDir, 'hooks');
      const outputDir = path.join(tmpDir, 'output');
      const hookDir = path.join(outputDir, 'core-claude', 'hooks');
      fs.mkdirSync(hookDir, { recursive: true });
      fs.writeFileSync(path.join(hookDir, 'hooks.json'), '{"hooks":{}}'); // unmanaged
      const spec: Partial<PluginSpec> = {
        name: 'core-claude',
        destination: 'core-claude',
        hookFolder: 'hooks',
      };
      pluginSyncBundles(hooksSource, outputDir, false)(makePluginFrame(spec));
      // hooks.json must still exist
      expect(fs.existsSync(path.join(hookDir, 'hooks.json'))).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('r3: unknown bundle dir is ignored (PARITY-15)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-unknown-'));
    try {
      const hooksSource = path.join(tmpDir, 'hooks');
      const outputDir = path.join(tmpDir, 'output');
      const targetDir = path.join(outputDir, 'core-windsurf');
      fs.mkdirSync(targetDir, { recursive: true });
      const spec: Partial<PluginSpec> = {
        name: 'core-windsurf',
        destination: 'core-windsurf',
        hookFolder: 'hooks',
        bundleSource: 'core-windsurf', // no bundle dir exists
      };
      // Should not throw
      const result = pluginSyncBundles(hooksSource, outputDir, true)(makePluginFrame(spec));
      expect(result.errors.length).toBe(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('r3: adds hard error when some bundle files are missing', () => {
    // Only provide 3 of the expected bundles
    const partialBundles = ['dangerous-actions.js', 'codemap-refresh.js', 'lint-format-advisory.js'];
    const { hooksSource, outputDir, cleanup } = makeTempRepo('core-claude', partialBundles);
    try {
      const spec: Partial<PluginSpec> = {
        name: 'core-claude',
        destination: 'core-claude',
        hookFolder: 'hooks',
        bundleSource: 'core-claude',
      };
      const targetDir = path.join(outputDir, 'core-claude');
      fs.mkdirSync(targetDir, { recursive: true });
      const p = makePluginFrame(spec);
      const result = pluginSyncBundles(hooksSource, outputDir, true)(p);
      // The rest are missing → hard error
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].kind).toBe('hard');
      expect(result.errors[0].message).toContain('Missing');
    } finally {
      cleanup();
    }
  });

  it('r2: hook folder not created (createHookFolderInR2 removed)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-r2-nodir-'));
    try {
      const hooksSource = path.join(tmpDir, 'hooks');
      const outputDir = path.join(tmpDir, 'output');
      const targetDir = path.join(outputDir, 'core-codex');
      fs.mkdirSync(targetDir, { recursive: true });
      const spec: Partial<PluginSpec> = {
        name: 'core-codex',
        destination: 'core-codex',
        hookFolder: '.codex/hooks',
      };
      pluginSyncBundles(hooksSource, outputDir, false)(makePluginFrame(spec));
      // Hook folder is never created in r2 (createHookFolderInR2 removed, FR-ARCH-0004)
      expect(fs.existsSync(path.join(targetDir, '.codex', 'hooks'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });


  it('dry-run: skips all disk operations (FR-CLI-0050)', () => {
    const { hooksSource, outputDir, cleanup } = makeTempRepo('core-claude', BUNDLE_NAMES);
    try {
      const spec: Partial<PluginSpec> = {
        name: 'core-claude',
        destination: 'core-claude',
        hookFolder: 'hooks',
        bundleSource: 'core-claude',
      };
      const p = makePluginFrame(spec);
      // dryRun=true → no-op
      const result = pluginSyncBundles(hooksSource, outputDir, true, true)(p);
      expect(result).toBe(p); // frame returned unchanged
      // No output dir created
      const targetHookDir = path.join(outputDir, 'core-claude', 'hooks');
      expect(fs.existsSync(targetHookDir)).toBe(false);
    } finally {
      cleanup();
    }
  });
});
