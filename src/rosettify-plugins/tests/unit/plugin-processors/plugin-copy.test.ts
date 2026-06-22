// FR-ARCH-0053, FR-SEED-0001/0002 — pluginCopy: preserved-source copy, tmpl frame registration,
// standalone manifest, readParentVersion fallback
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
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
        name: 'core-claude',
        destination: 'core-claude',
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
      fs.writeFileSync(path.join(preservedSource, 'hooks.json.tmpl'), '{{content}}');
      fs.writeFileSync(path.join(preservedSource, 'plugin.json'), '{}');

      const spec: Partial<PluginSpec> = {
        name: 'core-claude',
        destination: 'core-claude',
        preservedSource,
      };
      const frame = makePluginFrame(spec);
      const result = pluginCopy(outputDir, true)(frame);

      // In dry-run: no files written to disk
      expect(fs.existsSync(path.join(outputDir, 'core-claude'))).toBe(false);
      // But .tmpl file was registered as a frame
      const tmplFrame = result.frames.find((f: FileProcessingFrame) => f.target === 'hooks.json.tmpl');
      expect(tmplFrame).toBeDefined();
      expect(tmplFrame!.target_contents).toBe('{{content}}');
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
        name: 'core-claude',
        destination: 'core-claude',
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
        name: 'core-claude',
        destination: 'core-claude',
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
        name: 'core-cursor-standalone',
        destination: 'core-cursor-standalone',
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
        name: 'core-cursor-standalone',
        destination: 'core-cursor-standalone',
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
        name: 'core-cursor-standalone',
        destination: 'core-cursor-standalone',
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
        name: 'core-cursor-standalone',
        destination: 'core-cursor-standalone',
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
        name: 'core-cursor-standalone',
        destination: 'core-cursor-standalone',
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
        name: 'core-cursor-standalone',
        destination: 'core-cursor-standalone',
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
