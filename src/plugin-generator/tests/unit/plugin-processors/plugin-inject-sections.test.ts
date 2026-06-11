// FR-ARCH-0051 — pluginInjectSections: anchor insert, missing host/anchor error
import { describe, it, expect } from 'vitest';
import { pluginInjectSections } from '../../../src/plugin-processors/plugin-inject-sections.js';
import type { FileProcessingFrame, InjectionDecl, PluginProcessingFrame, PluginSpec } from '../../../src/types.js';

function makeFrame(target: string, content: string): FileProcessingFrame {
  return { sourcePath: target, target, isBinary: false, target_contents: content, source: [] };
}

function makePluginFrame(frames: FileProcessingFrame[], injections: InjectionDecl[]): PluginProcessingFrame {
  return {
    spec: {
      name: 'core-cursor-standalone',
      destination: 'core-cursor-standalone',
      injections,
    } as unknown as PluginSpec,
    vfs: [] as any,
    frames,
    templateContext: {},
    errors: [],
  };
}

describe('pluginInjectSections', () => {
  it('inserts literal text after anchor section', () => {
    const hostContent =
      '# Some Heading\n\n# PREP STEP 1:\n\n- Do step 1\n- Do step 2\n\n# Next Section\n';
    const frames = [makeFrame('.cursor/rules/plugin-files-mode.mdc', hostContent)];
    const injections: InjectionDecl[] = [
      {
        hostFramePath: '.cursor/rules/plugin-files-mode.mdc',
        anchor: '# PREP STEP 1:',
        sections: [{ kind: 'literal', text: '\nInjected Text\n\n' }],
      },
    ];
    const p = makePluginFrame(frames, injections);
    const result = pluginInjectSections(p);
    const host = result.frames.find((f) => f.target === '.cursor/rules/plugin-files-mode.mdc');
    expect(host!.target_contents as string).toContain('Injected Text');
    // Injected AFTER the bullet lines
    const content = host!.target_contents as string;
    const bulletEnd = content.lastIndexOf('- Do step 2');
    const injectedPos = content.indexOf('Injected Text');
    expect(injectedPos).toBeGreaterThan(bulletEnd);
  });

  it('inserts index section from frames', () => {
    const hostContent = '# PREP STEP 1:\n\n- bullet\n\n# Next\n';
    const indexContent = '# Rosetta Workflows Index\n\n- `commands/coding-flow.md`: Coding Flow\n';
    const frames = [
      makeFrame('.cursor/rules/plugin-files-mode.mdc', hostContent),
      makeFrame('.cursor/commands/INDEX.md', indexContent),
    ];
    const injections: InjectionDecl[] = [
      {
        hostFramePath: '.cursor/rules/plugin-files-mode.mdc',
        anchor: '# PREP STEP 1:',
        sections: [{ kind: 'index', indexFolder: '.cursor/commands' }],
      },
    ];
    const p = makePluginFrame(frames, injections);
    const result = pluginInjectSections(p);
    const host = result.frames.find((f) => f.target === '.cursor/rules/plugin-files-mode.mdc');
    expect(host!.target_contents as string).toContain('Rosetta Workflows Index');
  });

  it('returns original frame when no injections declared', () => {
    const p = makePluginFrame([makeFrame('rules/test.md', '# Test')], []);
    const result = pluginInjectSections(p);
    expect(result).toBe(p);
  });

  it('adds error when host frame not found', () => {
    const frames = [makeFrame('rules/other.md', '# Other')];
    const injections: InjectionDecl[] = [
      {
        hostFramePath: '.cursor/rules/missing.mdc',
        anchor: '# ANCHOR',
        sections: [{ kind: 'literal', text: 'text' }],
      },
    ];
    const p = makePluginFrame(frames, injections);
    const result = pluginInjectSections(p);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('not found');
  });

  it('skips gracefully when anchor not found (r3 compatibility)', () => {
    const hostContent = '# No Anchor Here\n\n# Just Content\n';
    const frames = [makeFrame('.cursor/rules/plugin-files-mode.mdc', hostContent)];
    const injections: InjectionDecl[] = [
      {
        hostFramePath: '.cursor/rules/plugin-files-mode.mdc',
        anchor: '# PREP STEP 1:',
        sections: [{ kind: 'literal', text: 'text' }],
      },
    ];
    const p = makePluginFrame(frames, injections);
    const result = pluginInjectSections(p);
    // No error, no change — skip gracefully
    expect(result.errors.length).toBe(0);
  });

  it('adds error when host frame is binary (FR-ARCH-0051)', () => {
    const binaryFrame: FileProcessingFrame = {
      sourcePath: '.cursor/rules/plugin-files-mode.mdc',
      target: '.cursor/rules/plugin-files-mode.mdc',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    const injections: InjectionDecl[] = [
      {
        hostFramePath: '.cursor/rules/plugin-files-mode.mdc',
        anchor: '# PREP STEP 1:',
        sections: [{ kind: 'literal', text: 'text' }],
      },
    ];
    const p = makePluginFrame([binaryFrame], injections);
    const result = pluginInjectSections(p);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('binary or empty');
  });

  it('handles plugin-root section kind gracefully (no-op)', () => {
    const hostContent = '# PREP STEP 1:\n\n- bullet\n\n# Next\n';
    const frames = [makeFrame('.cursor/rules/plugin-files-mode.mdc', hostContent)];
    const injections: InjectionDecl[] = [
      {
        hostFramePath: '.cursor/rules/plugin-files-mode.mdc',
        anchor: '# PREP STEP 1:',
        sections: [{ kind: 'plugin-root' }],
      },
    ];
    const p = makePluginFrame(frames, injections);
    const result = pluginInjectSections(p);
    // plugin-root injects nothing; no error, content unchanged
    expect(result.errors.length).toBe(0);
  });
});
