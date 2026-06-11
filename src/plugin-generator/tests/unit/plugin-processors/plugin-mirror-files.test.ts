// GT-4 — pluginMirrorFiles: data-driven mirrors byte-identical
import { describe, it, expect } from 'vitest';
import { pluginMirrorFiles } from '../../../src/plugin-processors/plugin-mirror-files.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec } from '../../../src/types.js';

function makeFrame(target: string, content: string): FileProcessingFrame {
  return { sourcePath: target, target, isBinary: false, target_contents: content, source: [] };
}

function makePluginFrame(
  frames: FileProcessingFrame[],
  mirrors: Array<{ from: string; to: string }>,
): PluginProcessingFrame {
  return {
    spec: {
      name: 'core-copilot',
      mirrors,
    } as unknown as PluginSpec,
    vfs: [] as any,
    frames,
    templateContext: {},
    errors: [],
  };
}

describe('pluginMirrorFiles', () => {
  it('returns original frame when no mirrors declared', () => {
    const p = makePluginFrame([makeFrame('hooks/hooks.json', '{}')], []);
    expect(pluginMirrorFiles(p)).toBe(p);
  });

  it('clones frame with new target path (byte-identical)', () => {
    const content = '{"hooks":{}}';
    const frames = [makeFrame('.github/plugin/hooks.json', content)];
    const p = makePluginFrame(frames, [
      { from: '.github/plugin/hooks.json', to: 'hooks.json' },
    ]);
    const result = pluginMirrorFiles(p);
    const mirror = result.frames.find((f) => f.target === 'hooks.json');
    expect(mirror).toBeDefined();
    expect(mirror!.target_contents).toBe(content); // byte-identical
  });

  it('gracefully skips when source frame not found', () => {
    const p = makePluginFrame(
      [makeFrame('other/file.json', '{}')],
      [{ from: '.github/plugin/hooks.json', to: 'hooks.json' }],
    );
    const result = pluginMirrorFiles(p);
    // No new frames added, returns original or frame count unchanged
    expect(result.frames.length).toBe(1);
  });

  it('codex: mirrors .codex-plugin/hooks.json → .codex/hooks.json', () => {
    const content = '{"hooks":{"SessionStart":[]}}';
    const frames = [makeFrame('.codex-plugin/hooks.json', content)];
    const p: PluginProcessingFrame = {
      spec: {
        name: 'core-codex',
        mirrors: [{ from: '.codex-plugin/hooks.json', to: '.codex/hooks.json' }],
      } as unknown as PluginSpec,
      vfs: [] as any,
      frames,
      templateContext: {},
      errors: [],
    };
    const result = pluginMirrorFiles(p);
    const mirror = result.frames.find((f) => f.target === '.codex/hooks.json');
    expect(mirror).toBeDefined();
    expect(mirror!.target_contents).toBe(content);
  });
});
