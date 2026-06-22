// FR-ARCH-0040 — fileRead: FM split, malformed-FM, no-FM, binary
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileRead } from '../../../src/file-processors/file-read.js';
import type { FileProcessingFrame, TargetContext, PluginSpec, ModelVocabulary, Vfs } from '../../../src/types.js';

function makeCtx(specName = 'core-claude'): TargetContext {
  return {
    spec: { name: specName, modelVocabulary: { kind: 'claude', map: {} } } as unknown as PluginSpec,
    vfs: [] as unknown as Vfs,
    release: { name: 'r2', deterministicHooks: false, displayName: 'R2' },
    repoRoot: '',
  };
}

function makeFrame(origins: string[], sourcePath = 'rules/test.md'): FileProcessingFrame {
  return {
    sourcePath,
    target: sourcePath,
    isBinary: false,
    target_contents: null,
    source: origins.map((o, i) => ({ origin: o, order: `${i}`, conditions: new Set() })),
  };
}

describe('fileRead', () => {
  it('parses frontmatter and body from single text source', () => {
    const tmpFile = path.join(os.tmpdir(), `fileread-fm-${Date.now()}.md`);
    fs.writeFileSync(tmpFile, '---\nname: test\ndescription: A test file\n---\n\n# Body\n\nContent here.\n');
    try {
      const frame = makeFrame([tmpFile]);
      const result = fileRead(frame, makeCtx());
      expect(result.target_contents).toContain('name: test');
      expect(result.source[0].frontmatter?.name).toBe('test');
      expect(result.source[0].frontmatter?.description).toBe('A test file');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('sets target_contents to raw content (including frontmatter)', () => {
    const content = '---\nname: x\n---\n\n# Hello\n';
    const tmpFile = path.join(os.tmpdir(), `fileread-raw-${Date.now()}.md`);
    fs.writeFileSync(tmpFile, content);
    try {
      const frame = makeFrame([tmpFile]);
      const result = fileRead(frame, makeCtx());
      expect(result.target_contents).toBe(content);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('sets frontmatter=undefined for file with no frontmatter', () => {
    const tmpFile = path.join(os.tmpdir(), `fileread-nofm-${Date.now()}.md`);
    fs.writeFileSync(tmpFile, '# No Frontmatter\n\nJust content.\n');
    try {
      const frame = makeFrame([tmpFile]);
      const result = fileRead(frame, makeCtx());
      expect(result.source[0].frontmatter).toBeUndefined();
      expect(result.target_contents).toContain('No Frontmatter');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('normalizes CRLF to LF in text files', () => {
    const tmpFile = path.join(os.tmpdir(), `fileread-crlf-${Date.now()}.md`);
    fs.writeFileSync(tmpFile, '---\r\nname: x\r\n---\r\n\r\n# Body\r\n');
    try {
      const frame = makeFrame([tmpFile]);
      const result = fileRead(frame, makeCtx());
      expect((result.target_contents as string).includes('\r')).toBe(false);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('reads binary file as Buffer', () => {
    const tmpFile = path.join(os.tmpdir(), `fileread-bin-${Date.now()}.png`);
    fs.writeFileSync(tmpFile, Buffer.from([0x89, 0x50, 0x4e, 0x47])); // PNG magic
    try {
      const frame = makeFrame([tmpFile], 'images/test.png');
      const result = fileRead(frame, makeCtx());
      expect(result.isBinary).toBe(true);
      expect(Buffer.isBuffer(result.target_contents)).toBe(true);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('treats .js files as binary (hook bundles)', () => {
    const tmpFile = path.join(os.tmpdir(), `fileread-js-${Date.now()}.js`);
    fs.writeFileSync(tmpFile, 'console.log("test")');
    try {
      const frame = makeFrame([tmpFile], 'hooks/test.js');
      const result = fileRead(frame, makeCtx());
      expect(result.isBinary).toBe(true);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('returns frame unchanged if no sources', () => {
    const frame = makeFrame([]);
    const result = fileRead(frame, makeCtx());
    expect(result).toBe(frame);
  });

  it('caches content in _readContent for multi-source bundling', () => {
    const f1 = path.join(os.tmpdir(), `fileread-s1-${Date.now()}.md`);
    const f2 = path.join(os.tmpdir(), `fileread-s2-${Date.now()}.md`);
    fs.writeFileSync(f1, '---\nname: first\n---\n\n# First\n');
    fs.writeFileSync(f2, '---\nname: second\n---\n\n# Second\n');
    try {
      const frame = makeFrame([f1, f2]);
      const result = fileRead(frame, makeCtx());
      expect(result.source[0]._readContent).toBeDefined();
      expect(result.source[1]._readContent).toBeDefined();
    } finally {
      fs.unlinkSync(f1);
      fs.unlinkSync(f2);
    }
  });

  it('binary + >1 source: emits hard error on frame.errors (FR-ARCH-0034)', () => {
    // binary + >1 source → hard GenError pushed onto frame, no throw
    const f1 = path.join(os.tmpdir(), `fileread-bin1-${Date.now()}.png`);
    const f2 = path.join(os.tmpdir(), `fileread-bin2-${Date.now()}.png`);
    fs.writeFileSync(f1, Buffer.from([0x89, 0x50, 0x4e, 0x47])); // PNG
    fs.writeFileSync(f2, Buffer.from([0xff, 0xfe, 0x00, 0x01])); // different binary
    try {
      const frame = makeFrame([f1, f2], 'images/test.png');
      const result = fileRead(frame, makeCtx());
      expect(result.isBinary).toBe(true);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBe(1);
      expect(result.errors![0].kind).toBe('hard');
      expect(result.errors![0].message).toBe(
        'Binary file images/test.png has 2 sources; only one source is allowed for binary files (FR-ARCH-0034/FR-ARCH-0042).',
      );
    } finally {
      fs.unlinkSync(f1);
      fs.unlinkSync(f2);
    }
  });
});
