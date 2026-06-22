// FR-ARCH-0043 — fileRename: full-anchored path-only; non-match unchanged; never touches content
import { describe, it, expect } from 'vitest';
import { fileRename } from '../../../src/file-processors/file-rename.js';
import type { FileProcessingFrame, TargetContext, PluginSpec, Vfs } from '../../../src/types.js';

function makeCtx(): TargetContext {
  return {
    spec: { name: 'core-cursor' } as unknown as PluginSpec,
    vfs: [] as unknown as Vfs,
    release: { name: 'r2', deterministicHooks: false, displayName: 'R2' },
    repoRoot: '',
  };
}

function makeFrame(target: string, content = '# Content'): FileProcessingFrame {
  return {
    sourcePath: target,
    target,
    isBinary: false,
    target_contents: content,
    source: [],
  };
}

describe('fileRename', () => {
  it('renames matching path (md→mdc)', () => {
    const rename = fileRename('rules/(.+)\\.md', 'rules/$1.mdc');
    const frame = makeFrame('rules/bootstrap-core.md');
    const result = rename(frame, makeCtx());
    expect(result.target).toBe('rules/bootstrap-core.mdc');
  });

  it('returns frame unchanged for non-matching path', () => {
    const rename = fileRename('rules/(.+)\\.md', 'rules/$1.mdc');
    const frame = makeFrame('workflows/coding-flow.md');
    const result = rename(frame, makeCtx());
    expect(result).toBe(frame);
  });

  it('never touches target_contents', () => {
    const originalContent = '---\nname: test\n---\n\n# Body\n';
    const rename = fileRename('rules/(.+)\\.md', 'rules/$1.mdc');
    const frame = makeFrame('rules/bootstrap-core.md', originalContent);
    const result = rename(frame, makeCtx());
    expect(result.target_contents).toBe(originalContent);
  });

  it('is full-anchored: does not rename partial substring match', () => {
    // Pattern is anchored with ^ and $ so 'workflows/coding-flow.md' should NOT match rules/...
    const rename = fileRename('rules/(.+)\\.md', 'rules/$1.mdc');
    const frame = makeFrame('my-rules/coding-flow.md');
    // "my-rules/..." should NOT match "^rules/(.+)\\.md$"
    const result = rename(frame, makeCtx());
    expect(result).toBe(frame);
  });

  it('prose content with agents path is untouched', () => {
    // Rename pattern for agents → should never touch a file whose path is not agents/...
    const rename = fileRename('\\.github/agents/(.+)\\.md', '.github/agents/$1.agent.md');
    const frame = makeFrame('.github/agents/architect.md', 'Content mentioning agents/foo.md');
    const result = rename(frame, makeCtx());
    expect(result.target).toBe('.github/agents/architect.agent.md');
    // Content unchanged
    expect(result.target_contents).toBe('Content mentioning agents/foo.md');
  });

  it('handles nested path groups', () => {
    const rename = fileRename('\\.codex/agents/(.+)\\.md', '.codex/agents/$1.toml');
    const frame = makeFrame('.codex/agents/architect.md');
    const result = rename(frame, makeCtx());
    expect(result.target).toBe('.codex/agents/architect.toml');
  });
});
