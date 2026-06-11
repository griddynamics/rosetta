// GT-6, PARITY-3 — codex TOML emitter field order and triple-quote
import { describe, it, expect } from 'vitest';
import { emitCodexToml } from '../../../src/serialize/toml.js';

describe('emitCodexToml', () => {
  it('emits correct field order: name, description, developer_instructions, model, model_reasoning_effort, sandbox_mode', () => {
    const toml = emitCodexToml({
      name: 'architect',
      description: 'Test agent',
      developerInstructions: 'Do work.',
      model: 'gpt-5.5',
      modelReasoningEffort: 'high',
      sandboxMode: 'workspace-write',
    });
    const lines = toml.split('\n');
    const nameIdx = lines.findIndex((l) => l.startsWith('name ='));
    const descIdx = lines.findIndex((l) => l.startsWith('description ='));
    const instrIdx = lines.findIndex((l) => l.startsWith('developer_instructions ='));
    const modelIdx = lines.findIndex((l) => l.startsWith('model ='));
    const effortIdx = lines.findIndex((l) => l.startsWith('model_reasoning_effort ='));
    const sandboxIdx = lines.findIndex((l) => l.startsWith('sandbox_mode ='));
    expect(nameIdx).toBeGreaterThanOrEqual(0);
    expect(nameIdx).toBeLessThan(descIdx);
    expect(descIdx).toBeLessThan(instrIdx);
    expect(instrIdx).toBeLessThan(modelIdx);
    expect(modelIdx).toBeLessThan(effortIdx);
    expect(effortIdx).toBeLessThan(sandboxIdx);
  });

  it('omits model and model_reasoning_effort when not provided', () => {
    const toml = emitCodexToml({
      name: 'test',
      description: 'no model',
      developerInstructions: '# Body',
      sandboxMode: 'workspace-write',
    });
    expect(toml).not.toContain('model =');
    expect(toml).not.toContain('model_reasoning_effort =');
  });

  it('uses triple-quote block for developer_instructions', () => {
    const toml = emitCodexToml({
      name: 'test',
      description: 'desc',
      developerInstructions: '# Body\nMore content.',
      sandboxMode: 'workspace-write',
    });
    expect(toml).toContain('developer_instructions = """');
    // Body content should appear between the delimiters
    expect(toml).toContain('# Body');
    expect(toml).toContain('More content.');
  });

  it('escapes double-quotes in name and description', () => {
    const toml = emitCodexToml({
      name: 'test "name"',
      description: 'desc with "quotes"',
      developerInstructions: 'body',
      sandboxMode: 'workspace-write',
    });
    expect(toml).toContain('name = "test \\"name\\""');
    expect(toml).toContain('description = "desc with \\"quotes\\""');
  });

  it('ends with trailing newline', () => {
    const toml = emitCodexToml({
      name: 'x',
      description: 'y',
      developerInstructions: 'body',
      sandboxMode: 'workspace-write',
    });
    expect(toml.endsWith('\n')).toBe(true);
  });

  it('sets sandbox_mode = read-only for readonly agents', () => {
    const toml = emitCodexToml({
      name: 'reviewer',
      description: 'reviews code',
      developerInstructions: '# Review',
      sandboxMode: 'read-only',
    });
    expect(toml).toContain('sandbox_mode = "read-only"');
  });
});
