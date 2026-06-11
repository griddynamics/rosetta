// FR-ARCH-0046, FR-COPY-0021 — fileNormalizeCopilotModels: per-vocabulary processor for copilot
import { describe, it, expect } from 'vitest';
import { fileNormalizeCopilotModels } from '../../../src/file-processors/file-normalize-copilot-models.js';
import type { FileProcessingFrame, TargetContext, PluginSpec, Vfs } from '../../../src/types.js';

function makeCtx(): TargetContext {
  return {
    spec: { name: 'core-copilot' } as unknown as PluginSpec,
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

describe('fileNormalizeCopilotModels — guard cases (same instance)', () => {
  it('binary frame → returns exact same instance', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'test.png',
      target: 'test.png',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    expect(fileNormalizeCopilotModels(frame, makeCtx())).toBe(frame);
  });

  it('null target_contents → returns exact same instance', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'test.md',
      target: 'test.md',
      isBinary: false,
      target_contents: null,
      source: [],
    };
    expect(fileNormalizeCopilotModels(frame, makeCtx())).toBe(frame);
  });

  it('no frontmatter → returns exact same instance', () => {
    const content = '# No frontmatter\nmodel: claude-opus-4-6\n';
    const frame = makeFrame(content);
    expect(fileNormalizeCopilotModels(frame, makeCtx())).toBe(frame);
  });

  it('frontmatter with no model: line → returns exact same instance', () => {
    const content = '---\nname: test\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content);
    expect(fileNormalizeCopilotModels(frame, makeCtx())).toBe(frame);
  });
});

// ─── Claude → display name (COPILOT_CLAUDE_MAP) ──────────────────────────────

describe('fileNormalizeCopilotModels — claude token to display name', () => {
  it('claude-opus-4-6 → Claude Opus 4.6', () => {
    const content = '---\nmodel: claude-opus-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-opus-4-6');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Claude Opus 4.6');
    expect((result.source[0]?.frontmatter as any).model).toBe('Claude Opus 4.6');
  });

  it('claude-opus-4-8 → Claude Opus 4.6 (alias)', () => {
    const content = '---\nmodel: claude-opus-4-8\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-opus-4-8');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Claude Opus 4.6');
    expect((result.source[0]?.frontmatter as any).model).toBe('Claude Opus 4.6');
  });

  it('claude-sonnet-4-6 → Claude Sonnet 4.6', () => {
    const content = '---\nmodel: claude-sonnet-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-sonnet-4-6');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Claude Sonnet 4.6');
    expect((result.source[0]?.frontmatter as any).model).toBe('Claude Sonnet 4.6');
  });

  it('claude-haiku-4-5 → Claude Haiku 4.5', () => {
    const content = '---\nmodel: claude-haiku-4-5\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-haiku-4-5');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Claude Haiku 4.5');
  });

  it('uses first token only (not scan-for-claude)', () => {
    // gpt-4o is first → maps to GPT-4o display name
    const content = '---\nmodel: gpt-4o, claude-opus-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-4o, claude-opus-4-6');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: GPT-4o');
  });
});

// ─── GPT → display name (COPILOT_GPT_MAP) ────────────────────────────────────

describe('fileNormalizeCopilotModels — gpt token to display name', () => {
  it('gpt-4o → GPT-4o', () => {
    const content = '---\nmodel: gpt-4o\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-4o');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: GPT-4o');
    expect((result.source[0]?.frontmatter as any).model).toBe('GPT-4o');
  });

  it('gpt-5.5 → GPT-5.5', () => {
    const content = '---\nmodel: gpt-5.5\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-5.5');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: GPT-5.5');
  });

  it('gpt-4o-high strips effort suffix then maps to GPT-4o', () => {
    const content = '---\nmodel: gpt-4o-high\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-4o-high');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: GPT-4o');
  });
});

// ─── Unknown token passthrough ────────────────────────────────────────────────

describe('fileNormalizeCopilotModels — unknown token passthrough', () => {
  it('unknown model not in any map → normalizeCopilot returns token as-is → same frame', () => {
    // normalizeCopilot: not claude-/gpt-/o3/o4 → returns first (passthrough)
    // same value → same content → same frame instance
    const content = '---\nmodel: some-unknown-model\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'some-unknown-model');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result).toBe(frame);
  });
});
