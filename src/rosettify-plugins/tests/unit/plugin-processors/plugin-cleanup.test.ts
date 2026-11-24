// FR-ARCH-0052 — pluginCleanup: wipe+mkdir
import { describe, it, expect } from 'vitest';
import { PassThrough as LogSink } from 'stream';
import { initLogger } from '../../../src/logging.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pluginCleanup } from '../../../src/plugin-processors/plugin-cleanup.js';
import type { PluginProcessingFrame, PluginSpec } from '../../../src/types.js';

function makePluginFrame(outputDir: string, specName = 'core-claude'): PluginProcessingFrame {
  return {
    spec: { name: specName, destination: specName } as unknown as PluginSpec,
    vfs: [] as any,
    frames: [],
    templateContext: {},
    errors: [],
  };
}

describe('pluginCleanup', () => {
  it('creates output directory if it does not exist', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-test-'));
    const outputDir = path.join(tmpDir, 'output');
    try {
      const processor = pluginCleanup(outputDir);
      const frame = makePluginFrame(outputDir);
      processor(frame);
      expect(fs.existsSync(path.join(outputDir, 'core-claude'))).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('wipes existing content from output directory (NFR-0003 idempotent)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-test-'));
    const outputDir = path.join(tmpDir, 'output');
    const targetDir = path.join(outputDir, 'core-claude');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'old-file.md'), '# old');
    try {
      const processor = pluginCleanup(outputDir);
      processor(makePluginFrame(outputDir));
      // Directory should exist but old-file.md should be gone
      expect(fs.existsSync(path.join(targetDir, 'old-file.md'))).toBe(false);
      expect(fs.existsSync(targetDir)).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns the plugin processing frame unchanged', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-test-'));
    const outputDir = path.join(tmpDir, 'output');
    try {
      const processor = pluginCleanup(outputDir);
      const frame = makePluginFrame(outputDir);
      const result = processor(frame);
      expect(result).toBe(frame);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('dry-run: skips all disk operations (FR-CLI-0050)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-dryrun-'));
    const outputDir = path.join(tmpDir, 'output');
    try {
      const processor = pluginCleanup(outputDir, 'dry-run');
      const frame = makePluginFrame(outputDir);
      const result = processor(frame);
      // Frame returned unchanged, no directory created
      expect(result).toBe(frame);
      expect(fs.existsSync(path.join(outputDir, 'core-claude'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// FR-CLI-0036 — suppressed (unpublished plugin): no disk operation at all
describe('pluginCleanup — suppressed', () => {
  it('does not wipe an existing folder nor create a missing one', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-suppressed-'));
    const outputDir = path.join(tmpDir, 'output');
    try {
      const existing = path.join(outputDir, 'core-claude');
      fs.mkdirSync(existing, { recursive: true });
      fs.writeFileSync(path.join(existing, 'keep.md'), 'keep');
      const frame = makePluginFrame(outputDir);
      expect(pluginCleanup(outputDir, 'suppressed')(frame)).toBe(frame);
      expect(fs.readFileSync(path.join(existing, 'keep.md'), 'utf-8')).toBe('keep');
      const other = makePluginFrame(outputDir, 'core-cursor');
      pluginCleanup(outputDir, 'suppressed')(other);
      expect(fs.existsSync(path.join(outputDir, 'core-cursor'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// FR-CLI-0036 — SpecBuildContext.publish=false threads 'suppressed' into the built pipeline
describe('buildSpecsForSet publish → WriteMode', () => {
  it('publish:false pipeline leaves existing output untouched; default pipeline wipes it', async () => {
    const { buildTestSpecs } = await import('../../helpers/build-specs.js');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-publish-'));
    try {
      for (const publish of [false, undefined]) {
        const outputDir = path.join(tmpDir, `out-${String(publish)}`);
        const spec = buildTestSpecs({
          pluginsSource: tmpDir, hooksSource: tmpDir, outputDir, publish,
          release: { name: 'r2', deterministicHooks: false, displayName: 'R2' },
        })[0];
        const dest = path.join(outputDir, spec.destination);
        fs.mkdirSync(dest, { recursive: true });
        fs.writeFileSync(path.join(dest, 'keep.md'), 'keep');
        spec.pluginProcessors[0]({ spec, vfs: [], frames: [], templateContext: {}, errors: [] });
        expect(fs.existsSync(path.join(dest, 'keep.md'))).toBe(publish === false);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
