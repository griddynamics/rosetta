// FR-ARCH-0048 — pluginRenderTemplates: raw {{{}}}, {{#if}}, r2 false-block no stray blank line
import { describe, it, expect } from 'vitest';
import { pluginRenderTemplates } from '../../../src/plugin-processors/plugin-render-templates.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec } from '../../../src/types.js';

function makeTmplFrame(target: string, content: string): FileProcessingFrame {
  return {
    sourcePath: target,
    target,
    isBinary: false,
    target_contents: content,
    source: [],
  };
}

function makePluginFrame(
  frames: FileProcessingFrame[],
  ctx: Record<string, unknown>,
  isStandalone = false,
): PluginProcessingFrame {
  return {
    spec: {
      name: 'core-claude',
      destination: 'core-claude',
      manifestOverride: isStandalone ? { name: 'standalone', version: 'parent' } : undefined,
    } as unknown as PluginSpec,
    vfs: [] as any,
    frames,
    templateContext: ctx,
    errors: [],
  };
}

describe('pluginRenderTemplates', () => {
  it('renders raw triple-stache {{{}}} without HTML escaping', () => {
    const tmpl = makeTmplFrame('hooks/hooks.json.tmpl', '{{{myVar}}}');
    const p = makePluginFrame([tmpl], { myVar: '"<raw>"' });
    const result = pluginRenderTemplates(p);
    const rendered = result.frames.find((f) => f.target === 'hooks/hooks.json');
    expect(rendered).toBeDefined();
    expect(rendered!.target_contents as string).toBe('"<raw>"');
  });

  it('r2: false {{#if}} block removes entire block — no stray blank lines (GT-1/PARITY-7)', () => {
    const template = `{\n  "hooks": {\n    "SessionStart": []\n  }{{#if flag}},{{/if}}\n{{#if flag}}\n  "extra": true\n{{/if}}\n}`;
    const tmpl = makeTmplFrame('hooks/hooks.json.tmpl', template);
    const p = makePluginFrame([tmpl], { flag: false });
    const result = pluginRenderTemplates(p);
    const rendered = result.frames.find((f) => f.target === 'hooks/hooks.json');
    expect(rendered).toBeDefined();
    const content = rendered!.target_contents as string;
    // No trailing comma from false {{#if}}
    expect(content).not.toContain(',\n  }');
    // No "extra" block
    expect(content).not.toContain('"extra"');
  });

  it('r3: true {{#if}} block is rendered', () => {
    const template = `A{{#if flag}}B{{/if}}C`;
    const tmpl = makeTmplFrame('test.tmpl', template);
    const p = makePluginFrame([tmpl], { flag: true });
    const result = pluginRenderTemplates(p);
    const rendered = result.frames.find((f) => f.target === 'test');
    expect(rendered?.target_contents as string).toBe('ABC');
  });

  it('produces sibling frame without .tmpl extension', () => {
    const tmpl = makeTmplFrame('hooks/hooks.json.tmpl', '{"test": true}');
    const p = makePluginFrame([tmpl], {});
    const result = pluginRenderTemplates(p);
    const rendered = result.frames.find((f) => f.target === 'hooks/hooks.json');
    expect(rendered).toBeDefined();
  });

  it('keeps .tmpl frame for main targets (not standalone)', () => {
    const tmpl = makeTmplFrame('hooks/hooks.json.tmpl', '{"test": true}');
    const p = makePluginFrame([tmpl], {});
    const result = pluginRenderTemplates(p);
    const tmplFrame = result.frames.find((f) => f.target === 'hooks/hooks.json.tmpl');
    expect(tmplFrame).toBeDefined();
  });

  it('drops .tmpl frame for standalone targets (manifestOverride set)', () => {
    const tmpl = makeTmplFrame('.cursor/hooks.json.tmpl', '{"test": true}');
    const p = makePluginFrame([tmpl], {}, true /* isStandalone */);
    const result = pluginRenderTemplates(p);
    const tmplFrame = result.frames.find((f) => f.target === '.cursor/hooks.json.tmpl');
    expect(tmplFrame).toBeUndefined();
  });

  it('returns original frame for non-tmpl files unchanged', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'rules/test.md',
      target: 'rules/test.md',
      isBinary: false,
      target_contents: '# Content',
      source: [],
    };
    const p = makePluginFrame([frame], {});
    const result = pluginRenderTemplates(p);
    expect(result.frames[0]).toBe(frame);
  });

  it('skips binary .tmpl frame for main target — no new frames, original p returned', () => {
    // binary frame ending in .tmpl — not renderable, not producing new frames
    // → hasNewFrames stays false → original p returned
    const frame: FileProcessingFrame = {
      sourcePath: 'hooks/test.bin.tmpl',
      target: 'hooks/test.bin.tmpl',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    const p = makePluginFrame([frame], {});
    const result = pluginRenderTemplates(p);
    // Binary .tmpl on main target: no new renders → hasNewFrames=false → original p
    expect(result).toBe(p);
    expect(result.frames.some((f) => f.target === 'hooks/test.bin')).toBe(false);
  });

  it('standalone + binary .tmpl: no new frames → original p returned unchanged', () => {
    // When only frame is binary .tmpl on standalone, hasNewFrames stays false → return original p
    // The binary tmpl frame is "skipped" in resultFrames but p is returned as-is
    const frame: FileProcessingFrame = {
      sourcePath: '.cursor/hooks/test.bin.tmpl',
      target: '.cursor/hooks/test.bin.tmpl',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    const p = makePluginFrame([frame], {}, true /* isStandalone */);
    const result = pluginRenderTemplates(p);
    // No new rendered frames → hasNewFrames=false → original p returned
    expect(result).toBe(p);
  });

  it('handles render error — keeps .tmpl frame for main target (FR-GEN-0010)', () => {
    // Invalid Handlebars template that will throw on compile
    const tmpl = makeTmplFrame('hooks/bad.tmpl', '{{#if}}{{/each}}'); // mismatched block
    const p = makePluginFrame([tmpl], {});
    // Should not throw, should return with original .tmpl frame
    const result = pluginRenderTemplates(p);
    // .tmpl frame kept for main target even on error
    expect(result.frames.some((f) => f.target === 'hooks/bad.tmpl')).toBe(true);
  });

  it('returns original p when no tmpl frames at all', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'rules/test.md',
      target: 'rules/test.md',
      isBinary: false,
      target_contents: '# Content',
      source: [],
    };
    const p = makePluginFrame([frame], {});
    const result = pluginRenderTemplates(p);
    expect(result).toBe(p); // no new frames → original returned
  });
});
