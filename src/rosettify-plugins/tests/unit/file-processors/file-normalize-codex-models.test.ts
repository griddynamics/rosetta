// FR-ARCH-0046, FR-COPY-0022 — fileNormalizeCodexModels: per-vocabulary processor for codex
// Unique behavior: no gpt token → strip model line; gpt token → two-field rewrite.
// frontmatter.model NOT updated in either branch.
import { describe, it, expect } from 'vitest';
import { fileNormalizeCodexModels } from '../../../src/file-processors/file-normalize-codex-models.js';
import { CODEX_VOCABULARY } from '../../../src/spec/model-maps.js';
import type { FileProcessingFrame, TargetContext, PluginSpec, Vfs } from '../../../src/types.js';

function makeCtx(): TargetContext {
  return {
    spec: { name: 'core-codex', modelVocabulary: CODEX_VOCABULARY } as unknown as PluginSpec,
    vfs: [] as unknown as Vfs,
    release: { name: 'r2', deterministicHooks: false, displayName: 'R2' },
    activeProfile: null,
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

describe('fileNormalizeCodexModels — guard cases (same instance)', () => {
  it('binary frame → returns exact same instance', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'test.png',
      target: 'test.png',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    expect(fileNormalizeCodexModels(frame, makeCtx())).toBe(frame);
  });

  it('null target_contents → returns exact same instance', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'test.md',
      target: 'test.md',
      isBinary: false,
      target_contents: null,
      source: [],
    };
    expect(fileNormalizeCodexModels(frame, makeCtx())).toBe(frame);
  });

  it('no frontmatter → returns exact same instance', () => {
    const content = '# No frontmatter\nmodel: claude-opus-4-6\n';
    const frame = makeFrame(content);
    expect(fileNormalizeCodexModels(frame, makeCtx())).toBe(frame);
  });

  it('frontmatter with no model: line → returns exact same instance', () => {
    const content = '---\nname: test\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content);
    expect(fileNormalizeCodexModels(frame, makeCtx())).toBe(frame);
  });
});

// ─── No GPT token → strip model line ─────────────────────────────────────────

describe('fileNormalizeCodexModels — no gpt token: strip model line', () => {
  it('model: claude-opus-4-6 → model: line stripped from content', () => {
    const content = '---\nmodel: claude-opus-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-opus-4-6');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    expect(result.target_contents as string).not.toContain('model:');
    expect(result.target_contents as string).toContain('tags:');
  });

  it('CRITICAL: source[0].frontmatter.model NOT updated (field being removed)', () => {
    const content = '---\nmodel: claude-opus-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-opus-4-6');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    // frontmatter.model retains original value — field removed from content, not rewritten
    expect((result.source[0]?.frontmatter as any).model).toBe('claude-opus-4-6');
  });

  it('preserves body after stripping model line', () => {
    const content = '---\nmodel: claude-sonnet-4-6\n---\n\n# Body text\nsome content\n';
    const frame = makeFrame(content, 'claude-sonnet-4-6');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('# Body text');
    expect(result.target_contents as string).toContain('some content');
  });

  it('returns new frame (not same instance) when model line is stripped', () => {
    const content = '---\nmodel: claude-opus-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-opus-4-6');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    expect(result).not.toBe(frame);
  });
});

// ─── GPT token with effort → two-field rewrite ───────────────────────────────

describe('fileNormalizeCodexModels — gpt token with effort: two-field rewrite', () => {
  it('gpt-5.5-high → model: gpt-6.1-sol and model_reasoning_effort: high', () => {
    const content = '---\nmodel: gpt-5.5-high\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-5.5-high');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: gpt-6.1-sol\nmodel_reasoning_effort: high');
  });

  it('CRITICAL: source[0].frontmatter.model NOT updated for gpt token (two-field replacement)', () => {
    const content = '---\nmodel: gpt-5.5-high\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-5.5-high');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    // frontmatter.model retains original value — not updated because two-field replacement
    expect((result.source[0]?.frontmatter as any).model).toBe('gpt-5.5-high');
  });

  it('claude-first then gpt: scans all tokens, picks first gpt', () => {
    // normalizeCodex scans all tokens for first gpt-*
    const content = '---\nmodel: claude-4.8-opus-high, gpt-5.5-high\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-4.8-opus-high, gpt-5.5-high');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: gpt-6.1-sol');
    expect(result.target_contents as string).toContain('model_reasoning_effort: high');
  });

  it('preserves other frontmatter fields in two-field rewrite', () => {
    const content = '---\nname: my-agent\nmodel: gpt-5.5-high\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-5.5-high');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('name: my-agent');
    expect(result.target_contents as string).toContain('tags:');
  });
});

// ─── GPT token without effort → model line only, no model_reasoning_effort ───

describe('fileNormalizeCodexModels — gpt token without effort: model line only', () => {
  it('gpt-4o (no effort suffix) → only model: gpt-4o, no model_reasoning_effort line', () => {
    const content = '---\nmodel: gpt-4o\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-4o');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: gpt-4o');
    expect(result.target_contents as string).not.toContain('model_reasoning_effort');
  });

  it('CRITICAL: source[0].frontmatter.model NOT updated for no-effort gpt token', () => {
    const content = '---\nmodel: gpt-4o\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-4o');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    // frontmatter.model stays unchanged — codex never updates frontmatter.model
    expect((result.source[0]?.frontmatter as any).model).toBe('gpt-4o');
  });
});

// ─── GPT-6 tiers: sol keeps effort, the old terra tier moves to luna one effort step higher ────

describe('fileNormalizeCodexModels — GPT-6 tiers', () => {
  it('gpt-5.6-terra-medium → gpt-6-luna with model_reasoning_effort: high', () => {
    const frame = makeFrame('---\nmodel: gpt-5.6-terra-medium\ntags: []\n---\n# Body\n', 'gpt-5.6-terra-medium');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: gpt-6-luna\nmodel_reasoning_effort: high');
  });

  it('gpt-5.6-terra-xhigh stays xhigh (capped)', () => {
    const frame = makeFrame('---\nmodel: gpt-5.6-terra-xhigh\ntags: []\n---\n# Body\n', 'gpt-5.6-terra-xhigh');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: gpt-6-luna\nmodel_reasoning_effort: xhigh');
  });

  it('gpt-5.6-sol-high → gpt-6.1-sol, effort unchanged', () => {
    const frame = makeFrame('---\nmodel: gpt-5.6-sol-high\ntags: []\n---\n# Body\n', 'gpt-5.6-sol-high');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: gpt-6.1-sol\nmodel_reasoning_effort: high');
  });

  it('current gpt-6-luna-xhigh passes through unmapped, effort split', () => {
    const frame = makeFrame('---\nmodel: gpt-6-luna-xhigh\ntags: []\n---\n# Body\n', 'gpt-6-luna-xhigh');
    const result = fileNormalizeCodexModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: gpt-6-luna\nmodel_reasoning_effort: xhigh');
  });
});
