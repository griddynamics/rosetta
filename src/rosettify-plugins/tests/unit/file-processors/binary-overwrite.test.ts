// FR-ARCH-0024, FR-ARCH-0042 — binary file through fileRead → fileApplyOverrides → fileBundle:
// overwrite and -only filtering decide which sources remain; only then is >1 source an error.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileRead } from '../../../src/file-processors/file-read.js';
import { fileApplyOverrides } from '../../../src/file-processors/file-apply-overrides.js';
import { fileBundle } from '../../../src/file-processors/file-bundle.js';
import type { FileProcessingFrame, TargetContext, PluginSpec, Vfs } from '../../../src/types.js';

const FIRST = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01]); // PNG magic + marker
const SECOND = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff]);

let dir: string;
let first: string;
let second: string;

function makeCtx(specName: string): TargetContext {
  return {
    spec: { name: specName, destination: `${specName}-out` } as unknown as PluginSpec,
    vfs: [] as unknown as Vfs,
    release: { name: 'r3', deterministicHooks: false, displayName: 'R3' },
    activeProfile: null,
  };
}

// Same order as BASE_PROCESSORS in src/spec/targets.ts.
function run(conditions: [string[], string[]], specName = 'claude'): FileProcessingFrame {
  let frame: FileProcessingFrame = {
    sourcePath: 'images/logo.png',
    target: 'images/logo.png',
    isBinary: false,
    target_contents: null,
    source: [first, second].map((origin, i) => ({
      origin, order: `${i}`, conditions: new Set(conditions[i]),
    })),
  };
  for (const processor of [fileRead, fileApplyOverrides, fileBundle]) {
    frame = processor(frame, makeCtx(specName));
  }
  return frame;
}

describe('binary file: fileRead → fileApplyOverrides → fileBundle', () => {
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-overwrite-'));
    first = path.join(dir, 'first.png');
    second = path.join(dir, 'second.png');
    fs.writeFileSync(first, FIRST);
    fs.writeFileSync(second, SECOND);
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('FR-ARCH-0024: base + overwrite → one source remains, the overwrite bytes, no error', () => {
    const result = run([[], ['overwrite']]);
    expect(result.errors).toBeUndefined();
    expect(result.source.map((sf) => sf.origin)).toEqual([second]);
    expect(result.isBinary).toBe(true);
    expect(result.target_contents).toEqual(SECOND);
  });

  it('FR-ARCH-0024: base + ide-claude-only overwrite → base bytes in cursor, overwrite bytes in claude', () => {
    const cursor = run([[], ['ide-claude-only', 'overwrite']], 'cursor');
    expect(cursor.errors).toBeUndefined();
    expect(cursor.source.map((sf) => sf.origin)).toEqual([first]);
    expect(cursor.target_contents).toEqual(FIRST);

    const claude = run([[], ['ide-claude-only', 'overwrite']], 'claude');
    expect(claude.errors).toBeUndefined();
    expect(claude.source.map((sf) => sf.origin)).toEqual([second]);
    expect(claude.target_contents).toEqual(SECOND);
  });

  it('FR-ARCH-0023: one file per IDE, no overwrite → each build ships its own bytes', () => {
    const conditions: [string[], string[]] = [['ide-cursor-only'], ['ide-claude-only']];
    const cursor = run(conditions, 'cursor');
    expect(cursor.errors).toBeUndefined();
    expect(cursor.target_contents).toEqual(FIRST);

    const claude = run(conditions, 'claude');
    expect(claude.errors).toBeUndefined();
    expect(claude.target_contents).toEqual(SECOND);
  });

  it('FR-ARCH-0042: two sources remain → one hard error naming the file', () => {
    const result = run([[], []]);
    expect(result.source).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]).toMatchObject({ kind: 'hard', target: 'images/logo.png' });
    expect(result.errors![0].message).toBe(
      'Binary file images/logo.png has 2 sources; only one source is allowed for binary files (FR-ARCH-0034/FR-ARCH-0042).',
    );
  });
});
