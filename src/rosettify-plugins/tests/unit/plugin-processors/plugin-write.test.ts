// FR-ARCH-0045 — pluginWrite: null→no file, ''→empty file, content→file, dry-run writes nothing
import { describe, it, expect } from 'vitest';
import { PassThrough as LogSink } from 'stream';
import { initLogger } from '../../../src/logging.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PassThrough } from 'stream';
import { pluginWrite } from '../../../src/plugin-processors/plugin-write.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec } from '../../../src/types.js';

function makeFrame(target: string, content: string | null, binary = false): FileProcessingFrame {
  return {
    sourcePath: target,
    target,
    isBinary: binary,
    target_contents: content,
    source: [],
  };
}

function makePluginFrame(frames: FileProcessingFrame[], spec = 'core-claude'): PluginProcessingFrame {
  return {
    spec: {
      name: spec,
      destination: spec,
    } as unknown as PluginSpec,
    vfs: [] as any,
    frames,
    templateContext: {},
    errors: [],
  };
}

describe('pluginWrite', () => {
  it('writes text file with content', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'write-test-'));
    const outputDir = path.join(tmpDir, 'output');
    try {
      const frame = makeFrame('rules/test.md', '# Hello\n');
      const p = makePluginFrame([frame]);
      pluginWrite(outputDir, 'write')(p);
      const filePath = path.join(outputDir, 'core-claude', 'rules', 'test.md');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('# Hello\n');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('writes empty file for empty string content', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'write-test-'));
    const outputDir = path.join(tmpDir, 'output');
    try {
      const frame = makeFrame('rules/empty.md', '');
      const p = makePluginFrame([frame]);
      pluginWrite(outputDir, 'write')(p);
      const filePath = path.join(outputDir, 'core-claude', 'rules', 'empty.md');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('does not write file when target_contents is null (FR-ARCH-0036)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'write-test-'));
    const outputDir = path.join(tmpDir, 'output');
    try {
      const frame = makeFrame('rules/dropped.md', null);
      const p = makePluginFrame([frame]);
      pluginWrite(outputDir, 'write')(p);
      const filePath = path.join(outputDir, 'core-claude', 'rules', 'dropped.md');
      expect(fs.existsSync(filePath)).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('writes nothing in dry-run mode (FR-CLI-0050)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'write-test-'));
    const outputDir = path.join(tmpDir, 'output');
    try {
      const frame = makeFrame('rules/test.md', '# Hello\n');
      const p = makePluginFrame([frame]);
      const discard = new PassThrough();
      discard.resume(); // this test checks disk side effects only; discard the dump
      pluginWrite(outputDir, 'dry-run', discard)(p);
      const targetDir = path.join(outputDir, 'core-claude');
      // No files written
      expect(fs.existsSync(targetDir)).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('dry-run emits full target path AND full contents to the output sink (FR-ARCH-0045, FR-CLI-0050, G-2)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'write-test-'));
    const outputDir = path.join(tmpDir, 'output');
    try {
      const frame = makeFrame('rules/test.md', '# Hello World\nContent here.\n');
      const p = makePluginFrame([frame]);

      // FR-ARCH-0045: dry-run emits "to the output" — inject our own sink instead of
      // writing to the process's stdout (no monkeypatching, no log-level coupling).
      let captured = '';
      const sink = new PassThrough();
      sink.on('data', (chunk: Buffer | string) => {
        captured += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
      });

      pluginWrite(outputDir, 'dry-run', sink)(p);
      sink.end();

      // Must emit the full target path
      expect(captured.replace(/\\/g, '/')).toContain('rules/test.md');
      // Must emit the full file contents
      expect(captured).toContain('# Hello World');
      expect(captured).toContain('Content here.');
      // Must NOT write any files to disk
      expect(fs.existsSync(path.join(outputDir, 'core-claude'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('normalizes CRLF to LF in written files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'write-test-'));
    const outputDir = path.join(tmpDir, 'output');
    try {
      const frame = makeFrame('rules/crlf.md', '# Hello\r\nLine 2\r\n');
      const p = makePluginFrame([frame]);
      pluginWrite(outputDir, 'write')(p);
      const filePath = path.join(outputDir, 'core-claude', 'rules', 'crlf.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content.includes('\r')).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('does NOT create empty directories (FR-ARCH-0004: folders emerge from files)', () => {
    // Change D: ensureDirs removed; empty folders must not be created
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'write-test-'));
    const outputDir = path.join(tmpDir, 'output');
    try {
      const p: PluginProcessingFrame = {
        spec: {
          name: 'core-claude',
          destination: 'core-claude',
        } as unknown as PluginSpec,
        vfs: [] as any,
        frames: [],
        templateContext: {},
        errors: [],
      };
      pluginWrite(outputDir, 'write')(p);
      // No files → no output directory created at all
      expect(fs.existsSync(path.join(outputDir, 'core-claude'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// FR-CLI-0036 — suppressed: no disk write, nothing to the dry-run sink, no per-file log
describe('pluginWrite — suppressed', () => {
  it('writes nothing, emits nothing to the sink, logs nothing', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'write-suppressed-'));
    const outputDir = path.join(tmpDir, 'output');
    try {
      let captured = '';
      const sink = new PassThrough();
      sink.on('data', (c: Buffer | string) => { captured += c.toString(); });
      let logged = '';
      const logSink = new LogSink();
      logSink.on('data', (c: Buffer | string) => { logged += c.toString(); });
      initLogger(false, logSink);

      const p = makePluginFrame([makeFrame('rules/test.md', '# Hello\n'), makeFrame('bin.dat', 'x', true)]);
      const result = pluginWrite(outputDir, 'suppressed', sink)(p);
      sink.end();

      expect(result).toBe(p);
      expect(captured).toBe('');
      expect(logged).toBe('');
      expect(fs.existsSync(outputDir)).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
