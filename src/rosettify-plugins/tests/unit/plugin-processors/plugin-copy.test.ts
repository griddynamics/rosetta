// FR-ARCH-0053, FR-SEED-0001/0002 — pluginCopy: preserved-source copy, tmpl frame registration,
// standalone manifest, readParentVersion fallback
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PassThrough } from 'stream';
import { pluginCopy } from '../../../src/plugin-processors/plugin-copy.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec } from '../../../src/types.js';

function makePluginFrame(spec: Partial<PluginSpec>): PluginProcessingFrame {
  return {
    spec: spec as PluginSpec,
    vfs: [] as any,
    frames: [],
    templateContext: {},
    errors: [],
  };
}

describe('pluginCopy — main target (no manifestOverride)', () => {
  it('copies preserved source to output dir in non-dry-run mode', () => {
    // Arrange: a preserved-source dir with one .md file
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-main-'));
    try {
      const preservedSource = path.join(tmp, 'preserved');
      const outputDir = path.join(tmp, 'output');
      fs.mkdirSync(preservedSource, { recursive: true });
      fs.writeFileSync(path.join(preservedSource, 'plugin.json'), '{"name":"test","version":"1.0.0"}');
      fs.writeFileSync(path.join(preservedSource, 'readme.md'), '# readme');

      const spec: Partial<PluginSpec> = {
        name: 'claude',
        destination: 'core-claude',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
      };
      const frame = makePluginFrame(spec);
      const result = pluginCopy(outputDir, false)(frame);

      // Files should be on disk
      expect(fs.existsSync(path.join(outputDir, 'core-claude', 'plugin.json'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'core-claude', 'readme.md'))).toBe(true);
      // Frame is returned (no tmpl files → same object or no added frames)
      expect(result.errors.length).toBe(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('registers .tmpl files as frames without writing to disk in dry-run mode', () => {
    // Arrange: preserved-source with a .tmpl file and a non-tmpl file
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-dryrun-'));
    try {
      const preservedSource = path.join(tmp, 'preserved');
      const outputDir = path.join(tmp, 'output');
      fs.mkdirSync(preservedSource, { recursive: true });
      // Named readme.md.tmpl, not hooks.json.tmpl: this test is about GENERIC .tmpl frame
      // registration, unrelated to the hooks-emission skip pluginCopy now applies to
      // hooks.json.tmpl specifically (hooks-architecture.md §1.8) — this spec ships no hooks
      // (hookModules: [], bootstrap: false) and must not be conflated with that logic.
      fs.writeFileSync(path.join(preservedSource, 'readme.md.tmpl'), '{{content}}');
      fs.writeFileSync(path.join(preservedSource, 'plugin.json'), '{}');

      const spec: Partial<PluginSpec> = {
        name: 'claude',
        destination: 'core-claude',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
      };
      const frame = makePluginFrame(spec);
      const result = pluginCopy(outputDir, true)(frame);

      // In dry-run: no files written to disk
      expect(fs.existsSync(path.join(outputDir, 'core-claude'))).toBe(false);
      // But .tmpl file was registered as a frame
      const tmplFrame = result.frames.find((f: FileProcessingFrame) => f.target === 'readme.md.tmpl');
      expect(tmplFrame).toBeDefined();
      expect(tmplFrame!.target_contents).toBe('{{content}}');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('does NOT write .tmpl files to disk in non-dry-run mode — only registers them as frames', () => {
    // .tmpl files must never reach the output tree, for any target: the raw preserved-source
    // copy must skip them, leaving only the rendered sibling (written later by pluginWrite from
    // the registered frame) on disk.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-notmpl-'));
    try {
      const preservedSource = path.join(tmp, 'preserved');
      const outputDir = path.join(tmp, 'output');
      // readme.md.tmpl, not hooks.json.tmpl: generic .tmpl handling, not the hooks-emission skip
      // (hooks-architecture.md §1.8) — this spec ships no hooks (hookModules: [], bootstrap: false).
      fs.mkdirSync(path.join(preservedSource, 'docs'), { recursive: true });
      fs.writeFileSync(path.join(preservedSource, 'docs', 'readme.md.tmpl'), '{{content}}');
      fs.writeFileSync(path.join(preservedSource, 'plugin.json'), '{}');

      const spec: Partial<PluginSpec> = {
        name: 'claude',
        destination: 'core-claude',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
      };
      const result = pluginCopy(outputDir, false)(makePluginFrame(spec));

      // Non-.tmpl file physically copied
      expect(fs.existsSync(path.join(outputDir, 'core-claude', 'plugin.json'))).toBe(true);
      // .tmpl file must NOT be physically copied to disk
      expect(fs.existsSync(path.join(outputDir, 'core-claude', 'docs', 'readme.md.tmpl'))).toBe(false);
      // But it is still registered as a frame for pluginRenderTemplates to render
      const tmplFrame = result.frames.find((f: FileProcessingFrame) => f.target === 'docs/readme.md.tmpl');
      expect(tmplFrame).toBeDefined();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('skips .DS_Store files during copy (FR-COPY-0010)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-ds-'));
    try {
      const preservedSource = path.join(tmp, 'preserved');
      const outputDir = path.join(tmp, 'output');
      fs.mkdirSync(preservedSource, { recursive: true });
      fs.writeFileSync(path.join(preservedSource, '.DS_Store'), 'junk');
      fs.writeFileSync(path.join(preservedSource, 'real.md'), '# real');

      const spec: Partial<PluginSpec> = {
        name: 'claude',
        destination: 'core-claude',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
      };
      pluginCopy(outputDir, false)(makePluginFrame(spec));

      expect(fs.existsSync(path.join(outputDir, 'core-claude', '.DS_Store'))).toBe(false);
      expect(fs.existsSync(path.join(outputDir, 'core-claude', 'real.md'))).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('handles non-existent preservedSource gracefully (no-op)', () => {
    // If preservedSource does not exist, pluginCopy should return unchanged frame
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-nodir-'));
    try {
      const spec: Partial<PluginSpec> = {
        name: 'claude',
        destination: 'core-claude',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource: path.join(tmp, 'does-not-exist'),
      };
      const frame = makePluginFrame(spec);
      // Should not throw; returns the same frame (no tmpl frames added)
      const result = pluginCopy(tmp, false)(frame);
      expect(result).toBe(frame); // no tmpl frames → returns same reference
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('pluginCopy — standalone target (manifestOverride set)', () => {
  it('registers standaloneTemplates as frames and writes plugin.json in non-dry-run (readParentVersion reads claude-plugin)', () => {
    // Scenario:
    // 1. Standalone spec with manifestOverride and standaloneTemplates pointing to a .tmpl file
    //    in the parent (preservedSource) plugin dir that has a .claude-plugin/plugin.json
    // 2. pluginCopy registers the template as a frame
    // 3. In non-dry-run mode, emits standalone plugin.json to disk using parent version
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-standalone-'));
    try {
      // Parent preservedSource has .claude-plugin/plugin.json with version
      const preservedSource = path.join(tmp, 'core-claude');
      fs.mkdirSync(path.join(preservedSource, '.claude-plugin'), { recursive: true });
      fs.writeFileSync(
        path.join(preservedSource, '.claude-plugin', 'plugin.json'),
        '{"name":"core-claude","version":"9.9.9"}',
      );
      // Standalone template: hooks.json.tmpl at root of preservedSource
      fs.writeFileSync(path.join(preservedSource, 'hooks.json.tmpl'), '{"hooks":{}}');

      const outputDir = path.join(tmp, 'output');
      const spec: Partial<PluginSpec> = {
        name: 'cursor-standalone',
        destination: 'core-cursor-standalone',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        // bootstrap: true — this spec ships hooks, so its hooks.json.tmpl standaloneTemplates
        // entry is not skipped by pluginCopy's emitsHooksJson gate (hooks-architecture.md §1.8).
        hookModules: [],
        bootstrap: true,
        preservedSource,
        manifestOverride: { name: 'core-cursor-standalone', version: 'parent' },
        standaloneTemplates: [['hooks.json.tmpl', '.cursor/hooks.json.tmpl']],
      };
      const frame = makePluginFrame(spec);
      const result = pluginCopy(outputDir, false)(frame);

      // standaloneTemplates entry registered as a frame
      const tmplFrame = result.frames.find((f: FileProcessingFrame) => f.target === '.cursor/hooks.json.tmpl');
      expect(tmplFrame).toBeDefined();
      expect(tmplFrame!.target_contents).toBe('{"hooks":{}}');

      // Standalone plugin.json written to disk with parent version
      const manifestPath = path.join(outputDir, 'core-cursor-standalone', 'plugin.json');
      expect(fs.existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.name).toBe('core-cursor-standalone');
      expect(manifest.version).toBe('9.9.9'); // from parent .claude-plugin/plugin.json
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('readParentVersion falls back to "2.0.40" when no plugin.json found in any candidate path (line 170)', () => {
    // Scenario:
    // 1. preservedSource has no .claude-plugin, .cursor-plugin, .github, or .codex-plugin dirs
    // 2. readParentVersion iterates all candidates, finds none, returns hardcoded fallback "2.0.40"
    // 3. standalone plugin.json is written with version "2.0.40"
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-fallback-'));
    try {
      // preservedSource exists but has no plugin.json in any candidate path
      const preservedSource = path.join(tmp, 'core-cursor');
      fs.mkdirSync(preservedSource, { recursive: true });
      // No .claude-plugin, .cursor-plugin, .github, .codex-plugin → all candidates missing
      fs.writeFileSync(path.join(preservedSource, 'hooks.json.tmpl'), '{}');

      const outputDir = path.join(tmp, 'output');
      const spec: Partial<PluginSpec> = {
        name: 'cursor-standalone',
        destination: 'core-cursor-standalone',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
        manifestOverride: { name: 'core-cursor-standalone', version: 'parent' },
        standaloneTemplates: [['hooks.json.tmpl', '.cursor/hooks.json.tmpl']],
      };
      pluginCopy(outputDir, false)(makePluginFrame(spec));

      const manifest = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'core-cursor-standalone', 'plugin.json'), 'utf-8'),
      );
      // Fallback version must be exactly "2.0.40" (GT-7)
      expect(manifest.version).toBe('2.0.40');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('readParentVersion falls back to "2.0.40" when plugin.json JSON is malformed (catch branch)', () => {
    // Scenario: candidate plugin.json exists but contains malformed JSON.
    // JSON.parse throws → caught silently → loop continues → fallback "2.0.40" returned.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-badjson-'));
    try {
      const preservedSource = path.join(tmp, 'core-cursor');
      fs.mkdirSync(path.join(preservedSource, '.cursor-plugin'), { recursive: true });
      // Write malformed JSON → JSON.parse in readParentVersion throws → silently ignored
      fs.writeFileSync(path.join(preservedSource, '.cursor-plugin', 'plugin.json'), '{bad json}');
      fs.writeFileSync(path.join(preservedSource, 'hooks.json.tmpl'), '{}');

      const outputDir = path.join(tmp, 'output');
      const spec: Partial<PluginSpec> = {
        name: 'cursor-standalone',
        destination: 'core-cursor-standalone',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
        manifestOverride: { name: 'core-cursor-standalone', version: 'parent' },
        standaloneTemplates: [['hooks.json.tmpl', '.cursor/hooks.json.tmpl']],
      };
      pluginCopy(outputDir, false)(makePluginFrame(spec));

      const manifest = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'core-cursor-standalone', 'plugin.json'), 'utf-8'),
      );
      expect(manifest.version).toBe('2.0.40');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('readParentVersion falls back to "2.0.40" when plugin.json has no version field', () => {
    // Scenario: plugin.json parses but has no version key.
    // data.version is undefined → falsy → loop continues → fallback returned.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-nover-'));
    try {
      const preservedSource = path.join(tmp, 'core-cursor');
      fs.mkdirSync(path.join(preservedSource, '.cursor-plugin'), { recursive: true });
      fs.writeFileSync(
        path.join(preservedSource, '.cursor-plugin', 'plugin.json'),
        '{"name":"core-cursor"}', // no version field
      );
      fs.writeFileSync(path.join(preservedSource, 'hooks.json.tmpl'), '{}');

      const outputDir = path.join(tmp, 'output');
      const spec: Partial<PluginSpec> = {
        name: 'cursor-standalone',
        destination: 'core-cursor-standalone',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
        manifestOverride: { name: 'core-cursor-standalone', version: 'parent' },
        standaloneTemplates: [['hooks.json.tmpl', '.cursor/hooks.json.tmpl']],
      };
      pluginCopy(outputDir, false)(makePluginFrame(spec));

      const manifest = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'core-cursor-standalone', 'plugin.json'), 'utf-8'),
      );
      expect(manifest.version).toBe('2.0.40');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('dry-run standalone: registers template frames but writes nothing to disk', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-std-dry-'));
    try {
      const preservedSource = path.join(tmp, 'core-cursor');
      fs.mkdirSync(preservedSource, { recursive: true });
      fs.writeFileSync(path.join(preservedSource, 'hooks.json.tmpl'), '{"hooks":{}}');

      const outputDir = path.join(tmp, 'output');
      const spec: Partial<PluginSpec> = {
        name: 'cursor-standalone',
        destination: 'core-cursor-standalone',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        // bootstrap: true — see the identical note above; this spec ships hooks.
        hookModules: [],
        bootstrap: true,
        preservedSource,
        manifestOverride: { name: 'core-cursor-standalone', version: 'parent' },
        standaloneTemplates: [['hooks.json.tmpl', '.cursor/hooks.json.tmpl']],
      };
      const result = pluginCopy(outputDir, true)(makePluginFrame(spec));

      // Template frame registered even in dry-run
      const tmplFrame = result.frames.find((f: FileProcessingFrame) => f.target === '.cursor/hooks.json.tmpl');
      expect(tmplFrame).toBeDefined();
      // No files written to disk
      expect(fs.existsSync(path.join(outputDir, 'core-cursor-standalone'))).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('standalone with standaloneTemplates source missing: no frame added (graceful)', () => {
    // standaloneTemplates lists a file that does not exist in preservedSource
    // pluginCopy should skip it silently (fs.existsSync guard)
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-std-miss-'));
    try {
      const preservedSource = path.join(tmp, 'core-cursor');
      fs.mkdirSync(preservedSource, { recursive: true });
      // No hooks.json.tmpl in preservedSource

      const outputDir = path.join(tmp, 'output');
      const spec: Partial<PluginSpec> = {
        name: 'cursor-standalone',
        destination: 'core-cursor-standalone',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
        manifestOverride: { name: 'core-cursor-standalone', version: 'parent' },
        standaloneTemplates: [['hooks.json.tmpl', '.cursor/hooks.json.tmpl']],
      };
      // dry-run=true to skip manifest disk write and focus on frame collection
      const result = pluginCopy(outputDir, true)(makePluginFrame(spec));
      // Missing source → no frame added
      expect(result.frames.length).toBe(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('pluginCopy — set-driven manifest overlay (DATA-CFG-0007)', () => {
  // The template plugin.json now holds only what EVERY set shares. Identity (name/description) is
  // set-driven and already variant-suffixed, and folder-advertising fields are conditional on the
  // set actually shipping that folder.
  const baseSpec = (preservedSource: string): Partial<PluginSpec> => ({
    name: 'claude',
    destination: 'rosetta-claude',
    set: 'rosetta',
    manifest: { name: 'rosetta', description: 'Rosetta.' },
    manifestConditionalFields: [],
    hookModules: [],
    bootstrap: false,
    preservedSource,
  });

  function withTemp(fn: (preservedSource: string, outputDir: string) => void): void {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-overlay-'));
    try {
      const preservedSource = path.join(tmp, 'preserved');
      fs.mkdirSync(preservedSource, { recursive: true });
      fn(preservedSource, path.join(tmp, 'output'));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  it('takes name/description from the set and preserves every shared template key', () => {
    withTemp((preservedSource, outputDir) => {
      fs.writeFileSync(
        path.join(preservedSource, 'plugin.json'),
        JSON.stringify({ version: '2.0.40', author: 'griddynamics' }, null, 2) + '\n',
      );

      pluginCopy(outputDir, false)(makePluginFrame({
        ...baseSpec(preservedSource),
        manifest: { name: 'rosetta-light', description: 'Rosetta. (lightweight)' },
      }));

      const written = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'rosetta-claude', 'plugin.json'), 'utf-8'),
      );
      expect(written.name).toBe('rosetta-light');
      expect(written.description).toBe('Rosetta. (lightweight)');
      // Identity leads; the shared template keys follow, in their original order.
      expect(Object.keys(written)).toEqual(['name', 'description', 'version', 'author']);
      expect(written.version).toBe('2.0.40');
      expect(written.author).toBe('griddynamics');
    });
  });

  it('emits a conditional field only when the VFS actually ships that folder', () => {
    withTemp((preservedSource, outputDir) => {
      fs.writeFileSync(path.join(preservedSource, 'plugin.json'), '{"version":"1.0.0"}');

      const spec = {
        ...baseSpec(preservedSource),
        manifestConditionalFields: [
          { field: 'commands', requires: 'workflows', value: './workflows/' },
          { field: 'skills', requires: 'skills', value: './skills/' },
        ],
      };
      // A `search`-shaped set: skills but NO workflows.
      const frame = makePluginFrame(spec);
      (frame as { vfs: unknown }).vfs = [{ path: 'skills/solr-query/SKILL.md', sourceFiles: [] }];

      pluginCopy(outputDir, false)(frame);

      const written = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'rosetta-claude', 'plugin.json'), 'utf-8'),
      );
      expect(written.skills).toBe('./skills/');
      expect(written).not.toHaveProperty('commands');
    });
  });

  it('drops the hooks field for a set that ships no hooks (@hooks pseudo-folder)', () => {
    withTemp((preservedSource, outputDir) => {
      fs.writeFileSync(path.join(preservedSource, 'plugin.json'), '{"version":"1.0.0"}');

      pluginCopy(outputDir, false)(makePluginFrame({
        ...baseSpec(preservedSource),
        manifestConditionalFields: [
          { field: 'hooks', requires: '@hooks', value: './hooks/hooks.json' },
        ],
        hookModules: [],
        bootstrap: false,
      }));

      const written = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'rosetta-claude', 'plugin.json'), 'utf-8'),
      );
      expect(written).not.toHaveProperty('hooks');
    });
  });

  it('uses the standalone manifestOverride name verbatim — the variant suffix is applied once, upstream', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-standalone-overlay-'));
    try {
      const preservedSource = path.join(tmp, 'template-cursor');
      fs.mkdirSync(path.join(preservedSource, '.claude-plugin'), { recursive: true });
      fs.writeFileSync(
        path.join(preservedSource, '.claude-plugin', 'plugin.json'),
        '{"version":"9.9.9"}',
      );
      fs.writeFileSync(path.join(preservedSource, 'hooks.json.tmpl'), '{{{hooks_json}}}');

      const outputDir = path.join(tmp, 'output');
      pluginCopy(outputDir, false)(makePluginFrame({
        ...baseSpec(preservedSource),
        name: 'cursor-standalone',
        destination: 'rosetta-cursor-standalone-light',
        manifestOverride: { name: 'rosetta-light-standalone', version: 'parent' },
        standaloneTemplates: [['hooks.json.tmpl', '.cursor/hooks.json.tmpl']],
      }));

      const manifest = JSON.parse(
        fs.readFileSync(
          path.join(outputDir, 'rosetta-cursor-standalone-light', 'plugin.json'), 'utf-8',
        ),
      );
      expect(manifest.name).toBe('rosetta-light-standalone');
      // Standalone manifests carry only {name, version}.
      expect(manifest.version).toBe('9.9.9');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});


describe('pluginCopy — dry-run reports every write it would make (FR-ARCH-0045 parity fix)', () => {
  // Regression coverage for the bug where a real run wrote a raw preserved-file copy (e.g. the
  // target's own plugin.json) and a standalone manifest emission, but --dry-run reported neither
  // — so the dry-run preview under-counted what a real run actually produces.

  it('main target: reports the raw preserved plugin.json copy to the sink and writes nothing to disk', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-dry-manifest-'));
    try {
      const preservedSource = path.join(tmp, 'preserved');
      const outputDir = path.join(tmp, 'output');
      fs.mkdirSync(preservedSource, { recursive: true });
      fs.writeFileSync(path.join(preservedSource, 'plugin.json'), '{"name":"core-claude"}');

      const spec: Partial<PluginSpec> = {
        name: 'claude',
        destination: 'core-claude',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
      };

      let captured = '';
      const sink = new PassThrough();
      sink.on('data', (chunk: Buffer | string) => {
        captured += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
      });

      pluginCopy(outputDir, true, sink)(makePluginFrame(spec));
      sink.end();

      // Reported: full target path and full content, same shape pluginWrite uses.
      const expectedPath = path.join(outputDir, 'core-claude', 'plugin.json');
      expect(captured).toContain(expectedPath);
      // plugin.json is always composed now (identity comes from the set), so the preview shows
      // the COMPOSED manifest rather than the raw template bytes.
      expect(captured).toContain('"name": "rosetta-core"');
      // Nothing written to disk.
      expect(fs.existsSync(outputDir)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('standalone target: reports the emitStandaloneManifest write to the sink and writes nothing to disk', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-dry-standalone-'));
    try {
      const preservedSource = path.join(tmp, 'core-cursor');
      fs.mkdirSync(path.join(preservedSource, '.claude-plugin'), { recursive: true });
      fs.writeFileSync(
        path.join(preservedSource, '.claude-plugin', 'plugin.json'),
        '{"name":"core-cursor","version":"9.9.9"}',
      );
      fs.writeFileSync(path.join(preservedSource, 'hooks.json.tmpl'), '{"hooks":{}}');

      const outputDir = path.join(tmp, 'output');
      const spec: Partial<PluginSpec> = {
        name: 'cursor-standalone',
        destination: 'core-cursor-standalone',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
        manifestOverride: { name: 'core-cursor-standalone', version: 'parent' },
        standaloneTemplates: [['hooks.json.tmpl', '.cursor/hooks.json.tmpl']],
      };

      let captured = '';
      const sink = new PassThrough();
      sink.on('data', (chunk: Buffer | string) => {
        captured += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
      });

      pluginCopy(outputDir, true, sink)(makePluginFrame(spec));
      sink.end();

      const expectedManifestPath = path.join(outputDir, 'core-cursor-standalone', 'plugin.json');
      expect(captured).toContain(expectedManifestPath);
      // Content mirrors what emitStandaloneManifest would actually write (name/version, from
      // the parent's preserved plugin.json).
      expect(captured).toContain('"name": "core-cursor-standalone"');
      expect(captured).toContain('"version": "9.9.9"');
      // Nothing written to disk (existing coverage already checks the target dir; this also
      // covers the plugin.json file specifically).
      expect(fs.existsSync(expectedManifestPath)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('dry-run preview mirrors the composed manifest a real run would write', () => {
    // Scenario: a profile is active (non-null manifestSuffix). The real-run branch appends the
    // suffix to name/description and re-serializes via emitJson; the dry-run preview must show
    // that exact suffixed content, not the raw preserved bytes.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-dry-suffix-'));
    try {
      const preservedSource = path.join(tmp, 'preserved');
      const outputDir = path.join(tmp, 'output');
      fs.mkdirSync(preservedSource, { recursive: true });
      fs.writeFileSync(
        path.join(preservedSource, 'plugin.json'),
        JSON.stringify({ name: 'core-claude', description: 'desc', version: '1.0.0' }, null, 2) + '\n',
      );

      const spec: Partial<PluginSpec> = {
        name: 'claude',
        destination: 'core-claude',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
      };
      let captured = '';
      const sink = new PassThrough();
      sink.on('data', (chunk: Buffer | string) => {
        captured += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
      });

      pluginCopy(outputDir, true, sink)(makePluginFrame(spec));
      sink.end();

      expect(captured).toContain('"name": "rosetta-core"');
      expect(captured).toContain('"description": "Rosetta Core."');
      expect(fs.existsSync(outputDir)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('dry-run and a real run report/write the identical set of preserved-file paths', () => {
    // Parity check: everything a real run writes for a main target (raw preserved copy + the
    // .tmpl-rendered sibling is out of scope here, pluginCopy only owns the raw copy) must show
    // up as a reported path in dry-run mode too.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-parity-'));
    try {
      const preservedSource = path.join(tmp, 'preserved');
      fs.mkdirSync(path.join(preservedSource, 'nested'), { recursive: true });
      fs.writeFileSync(path.join(preservedSource, 'plugin.json'), '{"name":"core-claude"}');
      fs.writeFileSync(path.join(preservedSource, 'nested', 'readme.md'), '# readme');

      const spec: Partial<PluginSpec> = {
        name: 'claude',
        destination: 'core-claude',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
      };

      // Real run.
      const realOutputDir = path.join(tmp, 'real-output');
      pluginCopy(realOutputDir, false)(makePluginFrame(spec));
      const realPaths = new Set<string>();
      const walk = (dir: string, prefix: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
          else realPaths.add(rel);
        }
      };
      walk(path.join(realOutputDir, 'core-claude'), '');

      // Dry-run over the same source.
      const dryOutputDir = path.join(tmp, 'dry-output');
      let captured = '';
      const sink = new PassThrough();
      sink.on('data', (chunk: Buffer | string) => {
        captured += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
      });
      pluginCopy(dryOutputDir, true, sink)(makePluginFrame(spec));
      sink.end();

      expect(realPaths.size).toBe(2); // plugin.json + nested/readme.md
      for (const relPath of realPaths) {
        expect(captured).toContain(path.join(dryOutputDir, 'core-claude', relPath));
      }
      expect(fs.existsSync(dryOutputDir)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('dry-run reports a binary-looking preserved file as a placeholder instead of decoding it', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-dry-binary-'));
    try {
      const preservedSource = path.join(tmp, 'preserved');
      const outputDir = path.join(tmp, 'output');
      fs.mkdirSync(preservedSource, { recursive: true });
      // A NUL byte anywhere in the first bytes marks content as binary (the same heuristic
      // git/most diff tools use).
      fs.writeFileSync(path.join(preservedSource, 'icon.bin'), Buffer.from([0x00, 0x01, 0x02]));

      const spec: Partial<PluginSpec> = {
        name: 'claude',
        destination: 'core-claude',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
      };

      let captured = '';
      const sink = new PassThrough();
      sink.on('data', (chunk: Buffer | string) => {
        captured += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
      });

      pluginCopy(outputDir, true, sink)(makePluginFrame(spec));
      sink.end();

      const expectedPath = path.join(outputDir, 'core-claude', 'icon.bin');
      expect(captured).toContain(`${expectedPath} (binary)`);
      expect(fs.existsSync(outputDir)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('defaults the dry-run sink to process.stdout when not provided (matches pluginWrite convention)', () => {
    // No sink passed: must not throw, and must still write nothing to disk.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pcopy-dry-default-sink-'));
    try {
      const preservedSource = path.join(tmp, 'preserved');
      const outputDir = path.join(tmp, 'output');
      fs.mkdirSync(preservedSource, { recursive: true });
      fs.writeFileSync(path.join(preservedSource, 'plugin.json'), '{}');

      const spec: Partial<PluginSpec> = {
        name: 'claude',
        destination: 'core-claude',
        set: 'core',
        manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
        manifestConditionalFields: [],
        hookModules: [],
        bootstrap: false,
        preservedSource,
      };

      const originalWrite = process.stdout.write.bind(process.stdout);
      let sawOutput = false;
      // Swallow the write so the test doesn't pollute the runner's own stdout stream.
      process.stdout.write = ((chunk: unknown, ...rest: unknown[]) => {
        sawOutput = true;
        return true;
      }) as typeof process.stdout.write;
      try {
        expect(() => pluginCopy(outputDir, true)(makePluginFrame(spec))).not.toThrow();
      } finally {
        process.stdout.write = originalWrite;
      }

      expect(sawOutput).toBe(true);
      expect(fs.existsSync(outputDir)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
