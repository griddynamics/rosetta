// FR-COPY-0082 — Antigravity subagent_required_model → inherit (any value, idempotent)
import { describe, it, expect } from 'vitest';
import { pluginAntigravitySubagentModel } from '../../../src/plugin-processors/plugin-antigravity-subagent-model.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec } from '../../../src/types.js';

function makeFrame(target: string, content: string, verbatim = false): FileProcessingFrame {
  return {
    sourcePath: target,
    target,
    isBinary: false,
    target_contents: content,
    source: [],
    ...(verbatim ? { verbatim: true } : {}),
  };
}

function makePluginFrame(frames: FileProcessingFrame[]): PluginProcessingFrame {
  return {
    spec: { name: 'core-antigravity' } as unknown as PluginSpec,
    vfs: [] as any,
    frames,
    templateContext: {},
    errors: [],
  };
}

describe('pluginAntigravitySubagentModel — any value → inherit', () => {
  it('rewrites a multi-token subagent_required_model value to "inherit"', () => {
    const frame = makeFrame(
      'agents/orchestrator.md',
      'subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol"',
    );
    const p = makePluginFrame([frame]);
    const result = pluginAntigravitySubagentModel(p);
    expect(result.frames[0].target_contents).toBe('subagent_required_model="inherit"');
  });

  it('rewrites every occurrence when the attribute appears more than once', () => {
    const frame = makeFrame(
      'rules/orchestration.md',
      'First: subagent_required_model="claude-opus-4-8"\nSecond: subagent_required_model="gpt-5.5-high"',
    );
    const p = makePluginFrame([frame]);
    const result = pluginAntigravitySubagentModel(p);
    expect(result.frames[0].target_contents).toBe(
      'First: subagent_required_model="inherit"\nSecond: subagent_required_model="inherit"',
    );
  });

  it('leaves content with no subagent_required_model attribute unchanged (no-op, same references)', () => {
    const frame = makeFrame('rules/plain.md', 'Nothing to see here.');
    const p = makePluginFrame([frame]);
    const result = pluginAntigravitySubagentModel(p);
    expect(result).toBe(p);
    expect(result.frames[0]).toBe(frame);
  });
});

describe('pluginAntigravitySubagentModel — idempotent', () => {
  it('a value already "inherit" remains "inherit" and the frame is left as-is (no-op)', () => {
    const frame = makeFrame('agents/x.md', 'subagent_required_model="inherit"');
    const p = makePluginFrame([frame]);
    const result = pluginAntigravitySubagentModel(p);
    expect(result).toBe(p);
    expect(result.frames[0].target_contents).toBe('subagent_required_model="inherit"');
  });
});

describe('pluginAntigravitySubagentModel — pass-through cases', () => {
  it('skips binary frames', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'agents/icon.png',
      target: 'agents/icon.png',
      isBinary: true,
      target_contents: Buffer.from([0x00]) as unknown as string,
      source: [],
    };
    const p = makePluginFrame([frame]);
    const result = pluginAntigravitySubagentModel(p);
    expect(result).toBe(p);
  });

  it('skips null-content (dropped) frames', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'agents/dropped.md',
      target: 'agents/dropped.md',
      isBinary: false,
      target_contents: null,
      source: [],
    };
    const p = makePluginFrame([frame]);
    const result = pluginAntigravitySubagentModel(p);
    expect(result).toBe(p);
  });

  it('skips verbatim frames (e.g. configure/) even when they contain the attribute', () => {
    const frame = makeFrame('configure/guide.md', 'subagent_required_model="claude-opus-4-8"', true);
    const p = makePluginFrame([frame]);
    const result = pluginAntigravitySubagentModel(p);
    expect(result).toBe(p);
    expect(result.frames[0].target_contents).toBe('subagent_required_model="claude-opus-4-8"');
  });
});
