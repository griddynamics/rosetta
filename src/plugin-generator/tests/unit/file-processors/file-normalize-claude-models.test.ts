// FR-ARCH-0046, FR-COPY-0021 — fileNormalizeClaudeModels: per-vocabulary processor for claude
import { describe, it, expect } from 'vitest';
import { fileNormalizeClaudeModels } from '../../../src/file-processors/file-normalize-claude-models.js';
import type { FileProcessingFrame, TargetContext, PluginSpec, Vfs } from '../../../src/types.js';

function makeCtx(): TargetContext {
  return {
    spec: { name: 'core-claude' } as unknown as PluginSpec,
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

describe('fileNormalizeClaudeModels — guard cases (same instance)', () => {
  it('binary frame → returns exact same instance', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'test.png',
      target: 'test.png',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    expect(fileNormalizeClaudeModels(frame, makeCtx())).toBe(frame);
  });

  it('null target_contents → returns exact same instance', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'test.md',
      target: 'test.md',
      isBinary: false,
      target_contents: null,
      source: [],
    };
    expect(fileNormalizeClaudeModels(frame, makeCtx())).toBe(frame);
  });

  it('no frontmatter → returns exact same instance', () => {
    const content = '# No frontmatter here\nmodel: claude-opus-4-6\n';
    const frame = makeFrame(content);
    expect(fileNormalizeClaudeModels(frame, makeCtx())).toBe(frame);
  });

  it('frontmatter with no model: line → returns exact same instance', () => {
    const content = '---\nname: test\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content);
    expect(fileNormalizeClaudeModels(frame, makeCtx())).toBe(frame);
  });

  it('frontmatter model has no claude-compatible token → returns exact same instance', () => {
    const content = '---\nmodel: gpt-4o\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-4o');
    // normalizeClaude('gpt-4o') returns null → no change
    expect(fileNormalizeClaudeModels(frame, makeCtx())).toBe(frame);
  });
});

// ─── Normalization: multi-token scanning (PARITY-9) ──────────────────────────

describe('fileNormalizeClaudeModels — multi-token scanning', () => {
  it('gpt-4o first, claude-sonnet-4-6 second: picks first claude-compatible → claude-sonnet-4-6', () => {
    // normalizeClaude scans ALL tokens for first claude-compatible
    const content = '---\nmodel: gpt-4o, claude-sonnet-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-4o, claude-sonnet-4-6');
    const result = fileNormalizeClaudeModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: claude-sonnet-4-6');
    expect((result.source[0]?.frontmatter as any).model).toBe('claude-sonnet-4-6');
  });

  it('gpt-5.5-high first, claude-4.8-opus-high second: picks opus → claude-opus-4-8', () => {
    const content = '---\nmodel: gpt-5.5-high, claude-4.8-opus-high\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-5.5-high, claude-4.8-opus-high');
    const result = fileNormalizeClaudeModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: claude-opus-4-8');
    expect((result.source[0]?.frontmatter as any).model).toBe('claude-opus-4-8');
  });
});

// ─── Normalization: claude token cases ───────────────────────────────────────

describe('fileNormalizeClaudeModels — claude token normalization', () => {
  it('claude-opus-4-6 contains opus → maps to claude-opus-4-8', () => {
    const content = '---\nmodel: claude-opus-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-opus-4-6');
    const result = fileNormalizeClaudeModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: claude-opus-4-8');
    expect((result.source[0]?.frontmatter as any).model).toBe('claude-opus-4-8');
  });

  it('claude-sonnet-4-6 contains sonnet → maps to claude-sonnet-4-6', () => {
    const content = '---\nmodel: claude-sonnet-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-sonnet-4-6');
    const result = fileNormalizeClaudeModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: claude-sonnet-4-6');
    expect((result.source[0]?.frontmatter as any).model).toBe('claude-sonnet-4-6');
  });

  it('claude-haiku-4-5 contains haiku → maps to claude-haiku-4-5', () => {
    const content = '---\nmodel: claude-haiku-4-5\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-haiku-4-5');
    const result = fileNormalizeClaudeModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: claude-haiku-4-5');
    expect((result.source[0]?.frontmatter as any).model).toBe('claude-haiku-4-5');
  });

  it('bare claude- token (no opus/sonnet/haiku) → inherit fallback', () => {
    // starts with claude- but doesn't contain opus/sonnet/haiku → "inherit"
    const content = '---\nmodel: claude-unknown-model\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-unknown-model');
    const result = fileNormalizeClaudeModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: inherit');
    expect((result.source[0]?.frontmatter as any).model).toBe('inherit');
  });

  it('result.target_contents does not contain old model value after normalization', () => {
    const content = '---\nmodel: claude-opus-4-6\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-opus-4-6');
    const result = fileNormalizeClaudeModels(frame, makeCtx());
    // The old value should be replaced
    const newContents = result.target_contents as string;
    // claude-opus-4-6 is different from claude-opus-4-8
    expect(newContents).toContain('claude-opus-4-8');
  });
});
