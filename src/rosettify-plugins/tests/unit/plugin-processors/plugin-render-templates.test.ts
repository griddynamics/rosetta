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

  it('drops .tmpl frame for main targets (not standalone) — only the rendered sibling remains', () => {
    const tmpl = makeTmplFrame('hooks/hooks.json.tmpl', '{"test": true}');
    const p = makePluginFrame([tmpl], {});
    const result = pluginRenderTemplates(p);
    const tmplFrame = result.frames.find((f) => f.target === 'hooks/hooks.json.tmpl');
    expect(tmplFrame).toBeUndefined();
    const rendered = result.frames.find((f) => f.target === 'hooks/hooks.json');
    expect(rendered).toBeDefined();
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

  it('drops binary .tmpl frame for main target — no sibling emitted, frames actually change', () => {
    // binary frame ending in .tmpl — not renderable, dropped entirely (no sibling produced)
    const frame: FileProcessingFrame = {
      sourcePath: 'hooks/test.bin.tmpl',
      target: 'hooks/test.bin.tmpl',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    const p = makePluginFrame([frame], {});
    const result = pluginRenderTemplates(p);
    // .tmpl dropped unconditionally → resultFrames differs from input → new frame returned
    expect(result).not.toBe(p);
    expect(result.frames.some((f) => f.target === 'hooks/test.bin.tmpl')).toBe(false);
    expect(result.frames.some((f) => f.target === 'hooks/test.bin')).toBe(false);
  });

  it('drops binary .tmpl frame for standalone target — same behavior as main', () => {
    const frame: FileProcessingFrame = {
      sourcePath: '.cursor/hooks/test.bin.tmpl',
      target: '.cursor/hooks/test.bin.tmpl',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    const p = makePluginFrame([frame], {}, true /* isStandalone */);
    const result = pluginRenderTemplates(p);
    expect(result).not.toBe(p);
    expect(result.frames.some((f) => f.target === '.cursor/hooks/test.bin.tmpl')).toBe(false);
  });

  it('drops .tmpl frame even on render error — no sibling, soft error recorded (FR-GEN-0010)', () => {
    // Invalid Handlebars template that will throw on compile
    const tmpl = makeTmplFrame('hooks/bad.tmpl', '{{#if}}{{/each}}'); // mismatched block
    const p = makePluginFrame([tmpl], {});
    // Should not throw, should drop the .tmpl frame and record a soft error
    const result = pluginRenderTemplates(p);
    expect(result.frames.some((f) => f.target === 'hooks/bad.tmpl')).toBe(false);
    expect(result.frames.some((f) => f.target === 'hooks/bad')).toBe(false);
    expect(result.errors.some((e) => e.kind === 'soft' && e.message.includes('Template render error'))).toBe(true);
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

// FR-GEN-0010, DATA-CFG-0008 — strict rendering.
// The template context carried exactly three keys and rendered with `strict: false`, so an
// unplumbed `{{var}}` rendered EMPTY and silently produced malformed JSON with no error anywhere.
// Rendering is strict now: an unknown variable is a loud (soft) error and emits no sibling file.
describe('pluginRenderTemplates — a missing context key fails loudly', () => {
  function frameWith(template: string, templateContext: Record<string, unknown>) {
    return {
      spec: { name: 'claude', set: 'core', destination: 'core-claude' },
      vfs: [],
      frames: [{
        sourcePath: 'hooks/hooks.json.tmpl',
        target: 'hooks/hooks.json.tmpl',
        isBinary: false,
        target_contents: template,
        source: [],
      }],
      templateContext,
      errors: [],
    } as unknown as Parameters<typeof pluginRenderTemplates>[0];
  }

  it('records a soft error and emits NO sibling when a referenced key is absent', () => {
    const result = pluginRenderTemplates(frameWith('{"a": {{nope}}}', { release: 'r3' }));

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].kind).toBe('soft');
    expect(result.errors[0].message).toMatch(/nope/);
    // The .tmpl frame is dropped and no rendered sibling replaces it — a malformed hooks.json
    // never reaches the output.
    expect(result.frames).toHaveLength(0);
  });

  it('renders normally when every referenced key is plumbed', () => {
    const result = pluginRenderTemplates(
      frameWith('{{{hooks_json}}}', { hooks_json: '{"hooks":{}}' }),
    );

    expect(result.errors).toHaveLength(0);
    expect(result.frames).toHaveLength(1);
    expect(result.frames[0].target).toBe('hooks/hooks.json');
    expect(JSON.parse(result.frames[0].target_contents as string)).toEqual({ hooks: {} });
  });

  // Scope note, verified against Handlebars 4.7: `strict: true` throws for a bare `{{var}}` whose
  // key is absent — the case that silently produced malformed JSON — but NOT for `{{#if absent}}`,
  // which still evaluates falsy. Block helpers are therefore not covered by strict mode, which is
  // why every key a template may use is ALSO plumbed explicitly in generate().
  it('a false-valued key renders its {{#if}} as falsy without error', () => {
    const result = pluginRenderTemplates(
      frameWith('{"v":1{{#if deterministic_hooks}},"d":true{{/if}} }', { deterministic_hooks: false }),
    );

    expect(result.errors).toHaveLength(0);
    expect(JSON.parse(result.frames[0].target_contents as string)).toEqual({ v: 1 });
  });
});
