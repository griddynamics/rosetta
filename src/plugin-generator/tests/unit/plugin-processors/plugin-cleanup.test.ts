// FR-ARCH-0052 — pluginCleanup: wipe+mkdir
import { describe, it, expect } from 'vitest';
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
      const processor = pluginCleanup(outputDir, true /* dryRun */);
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
