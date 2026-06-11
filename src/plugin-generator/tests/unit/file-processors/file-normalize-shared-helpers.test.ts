// FR-ARCH-0046 — shared helpers: extractFrontmatterModelField, applyModelRewrite, removeModelLine, rewriteCodexModelFields
import { describe, it, expect } from 'vitest';
import {
  extractFrontmatterModelField,
  applyModelRewrite,
  removeModelLine,
  rewriteCodexModelFields,
} from '../../../src/file-processors/file-normalize-models.js';
import type { FileProcessingFrame } from '../../../src/types.js';

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

// ─── extractFrontmatterModelField ────────────────────────────────────────────

describe('extractFrontmatterModelField', () => {
  it('returns model field value from standard frontmatter', () => {
    const content = '---\nmodel: claude-opus-4-6\ntags: []\n---\n# Body\n';
    expect(extractFrontmatterModelField(content)).toBe('claude-opus-4-6');
  });

  it('returns null when content has no leading ---', () => {
    const content = '# Not frontmatter\nmodel: claude-opus-4-6\n';
    expect(extractFrontmatterModelField(content)).toBeNull();
  });

  it('returns null when frontmatter has no model: line', () => {
    const content = '---\nname: test\ntags: []\n---\n# Body\n';
    expect(extractFrontmatterModelField(content)).toBeNull();
  });

  it('returns null when content starts with leading blank lines before ---', () => {
    // trimStart check: blank lines before --- → not a frontmatter file
    const content = '\n---\nmodel: claude-opus-4-6\n---\n# Body\n';
    expect(extractFrontmatterModelField(content)).toBeNull();
  });

  it('returns full multi-value string for multi-token model field', () => {
    const content = '---\nmodel: claude-opus-4-6, gpt-4\n---\n# Body\n';
    expect(extractFrontmatterModelField(content)).toBe('claude-opus-4-6, gpt-4');
  });

  it('trims whitespace from returned model value', () => {
    const content = '---\nmodel:   claude-sonnet-4-6  \n---\n# Body\n';
    expect(extractFrontmatterModelField(content)).toBe('claude-sonnet-4-6');
  });
});

// ─── applyModelRewrite ───────────────────────────────────────────────────────

describe('applyModelRewrite', () => {
  it('rewrites content and updates source[0].frontmatter.model', () => {
    const content = '---\nmodel: claude-opus-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-opus-4-6');
    const result = applyModelRewrite(frame, 'claude-opus-4-8');
    expect(result.target_contents as string).toContain('model: claude-opus-4-8');
    expect((result.source[0]?.frontmatter as any).model).toBe('claude-opus-4-8');
  });

  it('returns SAME frame instance when rewritten content equals original (no-op)', () => {
    // The normalizer would produce the same value already in the content
    const content = '---\nmodel: claude-opus-4-8\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-opus-4-8');
    // Rewriting with same value → rewriteModelLine returns same string → same frame instance
    const result = applyModelRewrite(frame, 'claude-opus-4-8');
    expect(result).toBe(frame);
  });

  it('returns a new frame (not same instance) when content changes', () => {
    const content = '---\nmodel: old-model\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'old-model');
    const result = applyModelRewrite(frame, 'new-model');
    expect(result).not.toBe(frame);
  });

  it('does not mutate the original frame', () => {
    const content = '---\nmodel: old-model\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'old-model');
    const originalContents = frame.target_contents;
    applyModelRewrite(frame, 'new-model');
    expect(frame.target_contents).toBe(originalContents);
  });
});

// ─── removeModelLine ─────────────────────────────────────────────────────────

describe('removeModelLine', () => {
  it('removes model: line from frontmatter', () => {
    const content = '---\nmodel: claude-opus-4-6\ntags: []\n---\n# Body\n';
    const result = removeModelLine(content);
    expect(result).not.toContain('model:');
    expect(result).toContain('tags:');
    expect(result).toContain('# Body');
  });

  it('returns content unchanged (same string) when no model: line present', () => {
    const content = '---\nname: test\ntags: []\n---\n# Body\n';
    const result = removeModelLine(content);
    expect(result).toBe(content);
  });

  it('also removes model_reasoning_effort: line if present alongside model:', () => {
    const content = '---\nmodel: gpt-5.5\nmodel_reasoning_effort: high\ntags: []\n---\n# Body\n';
    const result = removeModelLine(content);
    expect(result).not.toContain('model:');
    expect(result).not.toContain('model_reasoning_effort:');
    expect(result).toContain('tags:');
  });

  it('preserves document body after frontmatter', () => {
    const content = '---\nmodel: claude-opus-4-6\n---\n\n# Body text\nsome content\n';
    const result = removeModelLine(content);
    expect(result).toContain('# Body text');
    expect(result).toContain('some content');
  });
});

// ─── rewriteCodexModelFields ─────────────────────────────────────────────────

describe('rewriteCodexModelFields', () => {
  it('rewrites model: line into two fields for codex', () => {
    const content = '---\nmodel: claude-sonnet-4-6\ntags: []\n---\n# Body\n';
    const result = rewriteCodexModelFields(content, 'gpt-5.5', 'high');
    expect(result).toContain('model: gpt-5.5\nmodel_reasoning_effort: high');
    expect(result).not.toContain('claude-sonnet-4-6');
  });

  it('returns content unchanged when no model: line present', () => {
    const content = '---\nname: test\ntags: []\n---\n# Body\n';
    const result = rewriteCodexModelFields(content, 'gpt-5.5', 'high');
    expect(result).toBe(content);
  });

  it('preserves all other frontmatter fields', () => {
    const content = '---\nname: my-agent\nmodel: claude-opus-4-6\ntags: []\n---\n# Body\n';
    const result = rewriteCodexModelFields(content, 'gpt-4o', 'medium');
    expect(result).toContain('name: my-agent');
    expect(result).toContain('tags:');
    expect(result).toContain('model: gpt-4o\nmodel_reasoning_effort: medium');
  });

  it('preserves document body after frontmatter', () => {
    const content = '---\nmodel: claude-sonnet-4-6\n---\n\n# Body text\nsome content\n';
    const result = rewriteCodexModelFields(content, 'gpt-5.5', 'low');
    expect(result).toContain('# Body text');
    expect(result).toContain('some content');
  });
});
