// FR-ARCH-0046, FR-COPY-0021 — fileNormalizeCopilotModels: per-vocabulary processor for copilot
import { describe, it, expect } from 'vitest';
import { fileNormalizeCopilotModels } from '../../../src/file-processors/file-normalize-copilot-models.js';
import { COPILOT_VOCABULARY } from '../../../src/spec/model-maps.js';
import type { FileProcessingFrame, TargetContext, PluginSpec, Vfs } from '../../../src/types.js';

function makeCtx(): TargetContext {
  return {
    spec: { name: 'core-copilot', modelVocabulary: COPILOT_VOCABULARY } as unknown as PluginSpec,
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
  it('claude-opus-4-6 → Claude Opus 5.5 (upgrade)', () => {
    const content = '---\nmodel: claude-opus-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-opus-4-6');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Claude Opus 5.5');
    expect((result.source[0]?.frontmatter as any).model).toBe('Claude Opus 5.5');
  });

  it('claude-opus-4-8 → Claude Opus 5.5', () => {
    const content = '---\nmodel: claude-opus-4-8\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-opus-4-8');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Claude Opus 5.5');
    expect((result.source[0]?.frontmatter as any).model).toBe('Claude Opus 5.5');
  });

  it('claude-opus-4-7 → Claude Opus 5.5 (upgrade)', () => {
    const content = '---\nmodel: claude-opus-4-7\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-opus-4-7');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Claude Opus 5.5');
    expect((result.source[0]?.frontmatter as any).model).toBe('Claude Opus 5.5');
  });

  it('claude-sonnet-4-6 → Claude Sonnet 5.5', () => {
    const content = '---\nmodel: claude-sonnet-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-sonnet-4-6');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Claude Sonnet 5.5');
    expect((result.source[0]?.frontmatter as any).model).toBe('Claude Sonnet 5.5');
  });

  it('claude-haiku-4-5 → Claude Haiku 5.5', () => {
    const content = '---\nmodel: claude-haiku-4-5\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'claude-haiku-4-5');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Claude Haiku 5.5');
  });

  it('uses first token only (not scan-for-claude)', () => {
    // gpt-5.5 is first → maps to GPT-6.1 Sol display name
    const content = '---\nmodel: gpt-5.5, claude-opus-4-6\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-5.5, claude-opus-4-6');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: GPT-6.1 Sol');
  });
});

// ─── GPT → display name (COPILOT_GPT_MAP) ────────────────────────────────────

describe('fileNormalizeCopilotModels — gpt token to display name', () => {
  it('gpt-5.5 → GPT-6.1 Sol', () => {
    const content = '---\nmodel: gpt-5.5\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-5.5');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: GPT-6.1 Sol');
  });

  it('gpt-5.4-high → COPILOT_GPT_MAP → GPT-6 Luna', () => {
    const content = '---\nmodel: gpt-5.4-high\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-5.4-high');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: GPT-6 Luna');
    expect((result.source[0]?.frontmatter as any).model).toBe('GPT-6 Luna');
  });

  it('gpt-5.5-medium → COPILOT_GPT_MAP → GPT-6.1 Sol', () => {
    const content = '---\nmodel: gpt-5.5-medium\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-5.5-medium');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: GPT-6.1 Sol');
    expect((result.source[0]?.frontmatter as any).model).toBe('GPT-6.1 Sol');
  });

  it('gpt-5.3-codex → COPILOT_GPT_MAP upgrade → GPT-6 Luna', () => {
    const content = '---\nmodel: gpt-5.3-codex\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gpt-5.3-codex');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: GPT-6 Luna');
    expect((result.source[0]?.frontmatter as any).model).toBe('GPT-6 Luna');
  });
});

// ─── Gemini → display name (COPILOT_GEMINI_MAP) ───────────────────────────────

describe('fileNormalizeCopilotModels — gemini token to display name', () => {
  it('gemini-3-flash → COPILOT_GEMINI_MAP → Gemini 3.8 Flash', () => {
    const content = '---\nmodel: gemini-3-flash\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gemini-3-flash');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Gemini 3.8 Flash');
    expect((result.source[0]?.frontmatter as any).model).toBe('Gemini 3.8 Flash');
  });

  it('gemini-3.1-pro → COPILOT_GEMINI_MAP → Gemini 4 Argon (Pro tier resolves forward, not to Flash)', () => {
    const content = '---\nmodel: gemini-3.1-pro\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gemini-3.1-pro');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Gemini 4 Argon');
    expect(result.target_contents as string).not.toContain('Gemini 3.8 Flash');
  });

  it('gemini-4-argon-high → COPILOT_GEMINI_MAP → Gemini 4 Argon (effort suffix dropped)', () => {
    const content = '---\nmodel: gemini-4-argon-high\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gemini-4-argon-high');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Gemini 4 Argon\n');
    expect((result.source[0]?.frontmatter as any).model).toBe('Gemini 4 Argon');
  });

  // #197 — this token had no Copilot key, so it fell through normalizeCopilot's passthrough and the
  // raw lowercase id was written into a Copilot plugin as if it were a display name. Cursor mapped
  // the same literal correctly; this was the only unexplained gap between the two vocabularies.
  it('gemini-3.5-flash → COPILOT_GEMINI_MAP → Gemini 3.8 Flash, not raw passthrough (#197)', () => {
    const content = '---\nmodel: gemini-3.5-flash\ntags: []\n---\n# Body\n';
    const frame = makeFrame(content, 'gemini-3.5-flash');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Gemini 3.8 Flash');
    expect(result.target_contents as string).not.toContain('model: gemini-3.5-flash');
    expect((result.source[0]?.frontmatter as any).model).toBe('Gemini 3.8 Flash');
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

// ─── Current-generation display names ─────────────────────────────────────────

describe('fileNormalizeCopilotModels — current display names', () => {
  it('claude-sonnet-5-5-medium → Claude Sonnet 5.5 (no raw effort-suffixed id)', () => {
    const frame = makeFrame('---\nmodel: claude-sonnet-5-5-medium\ntags: []\n---\n# Body\n', 'claude-sonnet-5-5-medium');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Claude Sonnet 5.5\n');
  });

  it('gpt-6.1-sol-high → GPT-6.1 Sol and gpt-6-luna-high → GPT-6 Luna', () => {
    const sol = fileNormalizeCopilotModels(makeFrame('---\nmodel: gpt-6.1-sol-high\ntags: []\n---\n# Body\n', 'gpt-6.1-sol-high'), makeCtx());
    expect(sol.target_contents as string).toContain('model: GPT-6.1 Sol\n');
    const luna = fileNormalizeCopilotModels(makeFrame('---\nmodel: gpt-6-luna-high\ntags: []\n---\n# Body\n', 'gpt-6-luna-high'), makeCtx());
    expect(luna.target_contents as string).toContain('model: GPT-6 Luna\n');
  });

  it('gemini-3.8-flash-high → Gemini 3.8 Flash', () => {
    const frame = makeFrame('---\nmodel: gemini-3.8-flash-high\ntags: []\n---\n# Body\n', 'gemini-3.8-flash-high');
    const result = fileNormalizeCopilotModels(frame, makeCtx());
    expect(result.target_contents as string).toContain('model: Gemini 3.8 Flash\n');
  });
});
