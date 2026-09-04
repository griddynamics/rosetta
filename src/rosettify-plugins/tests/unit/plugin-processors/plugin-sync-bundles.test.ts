// FR-HOOK-0020–0022 — pluginSyncBundles: r3 adds .js; r2 removes stale; preserve unmanaged
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pluginSyncBundles } from '../../../src/plugin-processors/plugin-sync-bundles.js';
import type { PluginProcessingFrame, PluginSpec } from '../../../src/types.js';

// The modules a set ships are DATA now (plugins.json `hooks` + support modules), carried on
// spec.hookModules — no longer a hardcoded list inside the processor.
const BUNDLE_MODULES = [
  'dangerous-actions',
  'codemap-refresh',
  'lint-format-advisory',
  'loose-files',
  'md-file-advisory',
  'read-once',
  'read-once-reset',
];
const BUNDLE_NAMES = BUNDLE_MODULES.map((m) => `${m}.js`);

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
    const { hooksSource, outputDir, cleanup } = makeTempRepo('claude', BUNDLE_NAMES);
    try {
      const spec: Partial<PluginSpec> = {
        name: 'claude',
        set: 'core',
        hookModules: BUNDLE_MODULES,
        destination: 'core-claude',
        hookFolder: 'hooks',
        bundleSource: 'claude',
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
        name: 'claude',
        set: 'core',
        hookModules: BUNDLE_MODULES,
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
        name: 'claude',
        set: 'core',
        hookModules: BUNDLE_MODULES,
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

  // Replaces the former "unknown bundle dir is ignored (PARITY-15)" case. Ignoring it meant a
  // wrong bundleSource shipped ZERO hooks with no error and no log, and the plugin still looked
  // complete — the exact silent failure this scale of build cannot absorb.
  it('r3: a missing bundle dir is a HARD ERROR naming the directory and the set', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-unknown-'));
    try {
      const hooksSource = path.join(tmpDir, 'hooks');
      const outputDir = path.join(tmpDir, 'output');
      const targetDir = path.join(outputDir, 'qe-claude');
      fs.mkdirSync(targetDir, { recursive: true });
      const spec: Partial<PluginSpec> = {
        name: 'claude',
        set: 'qe',
        hookModules: BUNDLE_MODULES,
        destination: 'qe-claude',
        hookFolder: 'hooks',
        bundleSource: 'typo-not-a-real-ide', // no bundle dir exists
      };
      const result = pluginSyncBundles(hooksSource, outputDir, true)(makePluginFrame(spec));

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].kind).toBe('hard');
      expect(result.errors[0].target).toBe('qe-claude');
      expect(result.errors[0].message).toContain('typo-not-a-real-ide');
      expect(result.errors[0].message).toContain('qe');
      // Nothing was written into the hook folder.
      expect(fs.existsSync(path.join(targetDir, 'hooks'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('a set that ships no hook modules creates no hook folder and reports no error', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-nohooks-'));
    try {
      const hooksSource = path.join(tmpDir, 'hooks');
      const outputDir = path.join(tmpDir, 'output');
      const targetDir = path.join(outputDir, 'search-claude');
      fs.mkdirSync(targetDir, { recursive: true });
      const spec: Partial<PluginSpec> = {
        name: 'claude',
        set: 'search',
        hookModules: [], // sparse set: no hooks at all
        destination: 'search-claude',
        hookFolder: 'hooks',
        bundleSource: 'claude',
      };
      const result = pluginSyncBundles(hooksSource, outputDir, true)(makePluginFrame(spec));
      expect(result.errors).toHaveLength(0);
      expect(fs.existsSync(path.join(targetDir, 'hooks'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('r3: adds hard error when some bundle files are missing', () => {
    // Only provide 3 of the expected bundles
    const partialBundles = ['dangerous-actions.js', 'codemap-refresh.js', 'lint-format-advisory.js'];
    const { hooksSource, outputDir, cleanup } = makeTempRepo('claude', partialBundles);
    try {
      const spec: Partial<PluginSpec> = {
        name: 'claude',
        set: 'core',
        hookModules: BUNDLE_MODULES,
        destination: 'core-claude',
        hookFolder: 'hooks',
        bundleSource: 'claude',
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
        name: 'codex',
        set: 'core',
        hookModules: BUNDLE_MODULES,
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
    const { hooksSource, outputDir, cleanup } = makeTempRepo('claude', BUNDLE_NAMES);
    try {
      const spec: Partial<PluginSpec> = {
        name: 'claude',
        set: 'core',
        hookModules: BUNDLE_MODULES,
        destination: 'core-claude',
        hookFolder: 'hooks',
        bundleSource: 'claude',
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

// FR-HOOK-0022.AC2 — a bundle a set no longer declares must be REMOVED from its hook folder.
// Copying the declared modules is not enough: a bundle shipped by an earlier build and since
// dropped persists forever otherwise, and the plugin keeps a hook its hooks.json no longer names.
describe('pluginSyncBundles — sweeps bundles the set no longer declares', () => {
  /** Seed a hook folder as a previous build would have left it. */
  function seedHookFolder(targetDir: string, files: string[]): string {
    const hookDir = path.join(targetDir, 'hooks');
    fs.mkdirSync(hookDir, { recursive: true });
    for (const f of files) fs.writeFileSync(path.join(hookDir, f), `// stale ${f}`);
    return hookDir;
  }

  it('r3: removes a previously-shipped bundle that the set has since dropped', () => {
    const { hooksSource, outputDir, cleanup } = makeTempRepo('claude', BUNDLE_NAMES);
    try {
      const targetDir = path.join(outputDir, 'core-claude');
      // A previous build shipped the full suite.
      const hookDir = seedHookFolder(targetDir, BUNDLE_NAMES);

      // The set now declares only the two guardrail modules.
      const spec: Partial<PluginSpec> = {
        name: 'claude',
        set: 'core',
        hookModules: ['dangerous-actions', 'read-once'],
        destination: 'core-claude',
        hookFolder: 'hooks',
        bundleSource: 'claude',
      };
      const result = pluginSyncBundles(hooksSource, outputDir, true)(makePluginFrame(spec));

      expect(result.errors).toHaveLength(0);
      expect(fs.readdirSync(hookDir).sort()).toEqual(['dangerous-actions.js', 'read-once.js']);
      // The dropped ones are really gone, not merely un-refreshed.
      expect(fs.existsSync(path.join(hookDir, 'codemap-refresh.js'))).toBe(false);
      expect(fs.existsSync(path.join(hookDir, 'loose-files.js'))).toBe(false);
    } finally {
      cleanup();
    }
  });

  it('r3: a set that dropped hooks entirely has its whole bundle set swept', () => {
    const { hooksSource, outputDir, cleanup } = makeTempRepo('claude', BUNDLE_NAMES);
    try {
      const targetDir = path.join(outputDir, 'search-claude');
      const hookDir = seedHookFolder(targetDir, BUNDLE_NAMES);
      fs.writeFileSync(path.join(hookDir, 'hooks.json'), '{"hooks":{}}');

      const spec: Partial<PluginSpec> = {
        name: 'claude',
        set: 'search',
        hookModules: [], // sparse set: declares no hooks at all
        destination: 'search-claude',
        hookFolder: 'hooks',
        bundleSource: 'claude',
      };
      const result = pluginSyncBundles(hooksSource, outputDir, true)(makePluginFrame(spec));

      expect(result.errors).toHaveLength(0);
      // Every bundle gone; the unmanaged hooks.json survives (FR-HOOK-0022 main clause).
      expect(fs.readdirSync(hookDir)).toEqual(['hooks.json']);
    } finally {
      cleanup();
    }
  });

  it('preserves unmanaged files: a non-bundle .js and a non-.js file both survive', () => {
    const { hooksSource, outputDir, cleanup } = makeTempRepo('claude', BUNDLE_NAMES);
    try {
      const targetDir = path.join(outputDir, 'core-claude');
      const hookDir = seedHookFolder(targetDir, ['loose-files.js']);
      // Neither of these is a generator bundle: one is not .js, the other is a .js the hook build
      // does not produce and the set does not declare.
      fs.writeFileSync(path.join(hookDir, 'hooks.json'), '{}');
      fs.writeFileSync(path.join(hookDir, 'my-own-helper.js'), '// hand-added');

      const spec: Partial<PluginSpec> = {
        name: 'claude',
        set: 'core',
        hookModules: ['dangerous-actions'],
        destination: 'core-claude',
        hookFolder: 'hooks',
        bundleSource: 'claude',
      };
      pluginSyncBundles(hooksSource, outputDir, true)(makePluginFrame(spec));

      expect(fs.existsSync(path.join(hookDir, 'hooks.json'))).toBe(true);
      expect(fs.existsSync(path.join(hookDir, 'my-own-helper.js'))).toBe(true);
      // ...while the managed, now-undeclared bundle is swept.
      expect(fs.existsSync(path.join(hookDir, 'loose-files.js'))).toBe(false);
    } finally {
      cleanup();
    }
  });

  it('r2: sweeps every managed bundle, including names the set never declared', () => {
    const { hooksSource, outputDir, cleanup } = makeTempRepo('claude', BUNDLE_NAMES);
    try {
      const targetDir = path.join(outputDir, 'core-claude');
      const hookDir = seedHookFolder(targetDir, BUNDLE_NAMES);
      fs.writeFileSync(path.join(hookDir, 'hooks.json'), '{}');

      // r2 ships no bundles at all, so nothing is kept — regardless of what the set declares.
      const spec: Partial<PluginSpec> = {
        name: 'claude',
        set: 'core',
        hookModules: ['dangerous-actions'],
        destination: 'core-claude',
        hookFolder: 'hooks',
        bundleSource: 'claude',
      };
      pluginSyncBundles(hooksSource, outputDir, false)(makePluginFrame(spec));

      expect(fs.readdirSync(hookDir)).toEqual(['hooks.json']);
    } finally {
      cleanup();
    }
  });
});
