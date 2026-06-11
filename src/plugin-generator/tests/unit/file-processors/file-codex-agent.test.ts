// FR-ARCH-0044 — fileCodexAgentFormat: produces TOML, sandbox from readonly, field order GT-6
import { describe, it, expect } from 'vitest';
import { fileCodexAgentFormat } from '../../../src/file-processors/file-codex-agent.js';
import type { FileProcessingFrame, TargetContext, PluginSpec, Vfs } from '../../../src/types.js';

function makeCtx(): TargetContext {
  return {
    spec: { name: 'core-codex', modelVocabulary: { kind: 'codex', map: {} } } as unknown as PluginSpec,
    vfs: [] as unknown as Vfs,
    release: { name: 'r2', deterministicHooks: false, displayName: 'R2' },
    repoRoot: '',
  };
}

function makeFrame(content: string): FileProcessingFrame {
  return {
    sourcePath: 'agents/architect.md',
    target: '.codex/agents/architect.md',
    isBinary: false,
    target_contents: content,
    source: [],
  };
}

describe('fileCodexAgentFormat', () => {
  it('produces valid TOML with correct field order (GT-6)', () => {
    const content =
      '---\nname: architect\ndescription: Sample architect\nmodel: claude-4.8-opus-high, gpt-5.5-high\nreadonly: false\n---\n\n# Architect Body\n\nDoes architecture.\n';
    const result = fileCodexAgentFormat(makeFrame(content), makeCtx());
    const toml = result.target_contents as string;
    // Field order: name, description, developer_instructions, model, model_reasoning_effort, sandbox_mode
    const nameIdx = toml.indexOf('name =');
    const descIdx = toml.indexOf('description =');
    const instrIdx = toml.indexOf('developer_instructions =');
    const modelIdx = toml.indexOf('model =');
    const effortIdx = toml.indexOf('model_reasoning_effort =');
    const sandboxIdx = toml.indexOf('sandbox_mode =');
    expect(nameIdx).toBeLessThan(descIdx);
    expect(descIdx).toBeLessThan(instrIdx);
    expect(instrIdx).toBeLessThan(modelIdx);
    expect(modelIdx).toBeLessThan(effortIdx);
    expect(effortIdx).toBeLessThan(sandboxIdx);
  });

  it('sets sandbox_mode to workspace-write when readonly=false', () => {
    const content = '---\nname: test\ndescription: desc\nmodel: gpt-5.5-high\nreadonly: false\n---\n\n# Body\n';
    const result = fileCodexAgentFormat(makeFrame(content), makeCtx());
    expect(result.target_contents as string).toContain('sandbox_mode = "workspace-write"');
  });

  it('sets sandbox_mode to read-only when readonly=true', () => {
    const content = '---\nname: test\ndescription: desc\nmodel: gpt-5.5-high\nreadonly: true\n---\n\n# Body\n';
    const result = fileCodexAgentFormat(makeFrame(content), makeCtx());
    expect(result.target_contents as string).toContain('sandbox_mode = "read-only"');
  });

  it('omits model fields when no gpt-* token', () => {
    const content = '---\nname: test\ndescription: desc\nmodel: claude-4.8-opus-high\nreadonly: false\n---\n\n# Body\n';
    const result = fileCodexAgentFormat(makeFrame(content), makeCtx());
    const toml = result.target_contents as string;
    expect(toml).not.toContain('model =');
    expect(toml).not.toContain('model_reasoning_effort');
  });

  it('includes developer_instructions as triple-quoted multiline block', () => {
    const content = '---\nname: test\ndescription: desc\nreadonly: false\n---\n\n# Body\n\nMore content.\n';
    const result = fileCodexAgentFormat(makeFrame(content), makeCtx());
    const toml = result.target_contents as string;
    expect(toml).toContain('developer_instructions = """');
    expect(toml).toContain('# Body');
    expect(toml).toContain('More content.');
  });

  it('returns frame unchanged when binary', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'test.png',
      target: 'test.png',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    expect(fileCodexAgentFormat(frame, makeCtx())).toBe(frame);
  });

  it('returns frame unchanged when target_contents is null', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'test.md',
      target: 'test.md',
      isBinary: false,
      target_contents: null,
      source: [],
    };
    expect(fileCodexAgentFormat(frame, makeCtx())).toBe(frame);
  });
});
