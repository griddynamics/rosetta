// FR-ARCH-0046, FR-COPY-0021 — fileNormalizeCursorModels: per-vocabulary processor for cursor
import { describe, it, expect } from 'vitest';
import { fileNormalizeCursorModels } from '../../../src/file-processors/file-normalize-cursor-models.js';
import type { FileProcessingFrame, TargetContext, PluginSpec, Vfs } from '../../../src/types.js';

function makeCtx(): TargetContext {
  return {
    spec: { name: 'core-cursor' } as unknown as PluginSpec,
    vfs: [] as unknown as Vfs,
    release: { name: 'r2', deterministicHooks: false, displayName: 'R2' },
    repoRoot: '',
  };
}

function makeFrame(content: string, model?: string): FileProcessingFrame {
  return {
    sourcePath: 'rules/test.md',
    target: 'rules/test.md',
    isBinary: false,
    target_contents: content,
    source: [
      {
        origin: 'rules/test.md',
        frontmatter: model !== undefined ? { model } : {},
        order: '0',
        conditions: new Set(),
      },
    ],
  };
}

// ─── Guard cases ──────────────────────────────────────────────────────────────

describe('fileNormalizeCursorModels — guard cases (same instance)', () => {
  it('binary frame → returns exact same instance', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'test.png',
      target: 'test.png',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    expect(fileNormalizeCursorModels(frame, makeCtx())).toBe(frame);
  });

  it('null target_contents → returns exact same instance', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'test.md',
      target: 'test.md',
      isBinary: false,
      target_contents: null,
      source: [],
    };
    expect(fileNormalizeCursorModels(frame, makeCtx())).toBe(frame);
  });

  it('no frontmatter → returns exact same instance', () => {
    const content = '# No frontmatter here\nmodel: claude-opus-4-6\n';
    const frame = makeFrame(content);
    expect(fileNormalizeCursorModels(frame, makeCtx())).toBe(frame);
  });

  it('frontmatter with no model: line → returns exact same instance', () => {
    const content = '---\nname: test\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content);
    expect(fileNormalizeCursorModels(frame, makeCtx())).toBe(frame);
  });
});

// ─── Claude token normalization via CURSOR_CLAUDE_MAP ────────────────────────

describe('fileNormalizeCursorModels — claude token mapping', () => {
  it('claude-opus-4-6 → CURSOR_CLAUDE_MAP passthrough → claude-opus-4-6', () => {
    // CURSOR_CLAUDE_MAP: 'claude-opus-4-6' → 'claude-opus-4-6'
    const content = '---\nmodel: claude-opus-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-opus-4-6');
    const result = fileNormalizeCursorModels(frame, makeCtx());
    // claude-opus-4-6 maps to claude-opus-4-6 in CURSOR_CLAUDE_MAP
    expect(result.target_contents as string).toContain('model: claude-opus-4-6');
    expect((result.source[0]?.frontmatter as any).model).toBe('claude-opus-4-6');
  });

  it('claude-4.8-opus-high → CURSOR_CLAUDE_MAP → claude-opus-4-6', () => {
    const content = '---\nmodel: claude-4.8-opus-high\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-4.8-opus-high');
    const result = fileNormalizeCursorModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: claude-opus-4-6');
    expect((result.source[0]?.frontmatter as any).model).toBe('claude-opus-4-6');
  });

  it('claude-4.6-sonnet → CURSOR_CLAUDE_MAP → claude-sonnet-4-6', () => {
    const content = '---\nmodel: claude-4.6-sonnet\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-4.6-sonnet');
    const result = fileNormalizeCursorModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: claude-sonnet-4-6');
  });
});

// ─── GPT token: strip -effort suffix ─────────────────────────────────────────

describe('fileNormalizeCursorModels — gpt token effort stripping', () => {
  it('gpt-4o-high → strips -high suffix → gpt-4o', () => {
    const content = '---\nmodel: gpt-4o-high\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-4o-high');
    const result = fileNormalizeCursorModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: gpt-4o');
    expect((result.source[0]?.frontmatter as any).model).toBe('gpt-4o');
  });

  it('gpt-5.5-high → strips -high suffix → gpt-5.5', () => {
    const content = '---\nmodel: gpt-5.5-high\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-5.5-high');
    const result = fileNormalizeCursorModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: gpt-5.5');
  });

  it('gpt-4o (no suffix) → remains gpt-4o, same frame (no rewrite needed)', () => {
    // normalizeCursor returns 'gpt-4o' (strip no suffix), rewriteModelLine returns same string
    const content = '---\nmodel: gpt-4o\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-4o');
    const result = fileNormalizeCursorModels(frame, makeCtx());
    // Same content → same frame instance
    expect(result).toBe(frame);
  });
});

// ─── Unknown token passthrough ────────────────────────────────────────────────

describe('fileNormalizeCursorModels — unknown token passthrough', () => {
  it('unknown model not in any map → normalizeCursor returns token as-is → same frame (no change)', () => {
    // normalizeCursor: unknown token (not claude-, not gpt-) → returns first (passthrough)
    // applyModelRewrite: rewriteModelLine with same value → same content → same frame instance
    const content = '---\nmodel: some-unknown-model\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'some-unknown-model');
    const result = fileNormalizeCursorModels(frame, makeCtx());
    expect(result).toBe(frame);
  });

  it('uses FIRST token only (not scanning all like claude)', () => {
    // Cursor uses first token, not scan-for-claude logic
    const content = '---\nmodel: gpt-4o-high, claude-opus-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-4o-high, claude-opus-4-6');
    const result = fileNormalizeCursorModels(frame, makeCtx());
    // First token is gpt-4o-high → strips effort → gpt-4o (not claude)
    expect(result.target_contents as string).toContain('model: gpt-4o');
  });
});
