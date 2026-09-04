// FR-ARCH-0058 — pluginReplaceLiterals: exact literal substring substitution over prose/glob
// content. Deliberately NOT `pluginRewriteReferences`'s boundary/regex/path-token semantics
// (FR-ARCH-0037) — this processor targets prose and glob-documentation strings, not path
// references, so a plain `String.prototype.split/join` substring replacement is correct.
import { describe, it, expect } from 'vitest';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { pluginReplaceLiterals } from '../../../src/plugin-processors/plugin-replace-literals.js';
import { buildTestSpecs } from '../../helpers/build-specs.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec, ReleaseDescriptor } from '../../../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Real preserved plugin dirs (read-only use) — same pattern as tests/unit/spec/targets-*-output.test.ts.
const REAL_PLUGINS_ROOT = path.join(__dirname, '..', '..', '..', 'plugins');

function makeFrame(sourcePath: string, target: string, content: string): FileProcessingFrame {
  return {
    sourcePath,
    target,
    isBinary: false,
    target_contents: content,
    source: [],
  };
}

function makePluginFrame(frames: FileProcessingFrame[]): PluginProcessingFrame {
  return {
    spec: { name: 'core-cursor', baseSubfolder: '', specEntries: [] } as unknown as PluginSpec,
    vfs: [] as any,
    frames,
    templateContext: {},
    errors: [],
  };
}

const WORKFLOW_PAIR: readonly [string, string] = [
  'WORKFLOW/COMMAND `workflows/*.md`',
  'WORKFLOW/COMMAND `skills/*-flow/SKILL.md`',
];

describe('pluginReplaceLiterals', () => {
  it('applies a single pair to a text frame\'s content', () => {
    const frame = makeFrame('rules/plugin-files-mode.md', 'rules/plugin-files-mode.md',
      'RULE `rules/*.md`, WORKFLOW/COMMAND `workflows/*.md`, CONFIGURE `configure/*.md`');
    const p = makePluginFrame([frame]);
    const processor = pluginReplaceLiterals([WORKFLOW_PAIR]);
    const result = processor(p);
    expect(result.frames[0].target_contents).toBe(
      'RULE `rules/*.md`, WORKFLOW/COMMAND `skills/*-flow/SKILL.md`, CONFIGURE `configure/*.md`',
    );
  });

  it('applies multiple pairs, each independently, across frames', () => {
    const frames = [
      makeFrame('a.md', 'a.md', 'alpha token here'),
      makeFrame('b.md', 'b.md', 'beta token here'),
    ];
    const p = makePluginFrame(frames);
    const processor = pluginReplaceLiterals([
      ['alpha token', 'ALPHA'],
      ['beta token', 'BETA'],
    ]);
    const result = processor(p);
    expect(result.frames[0].target_contents).toBe('ALPHA here');
    expect(result.frames[1].target_contents).toBe('BETA here');
  });

  it('empty pairs array is a no-op returning the same PluginProcessingFrame object', () => {
    const frame = makeFrame('a.md', 'a.md', 'content with workflows/*.md in it');
    const p = makePluginFrame([frame]);
    const processor = pluginReplaceLiterals([]);
    const result = processor(p);
    expect(result).toBe(p);
  });

  it('critical negative case: only the long literal is rewritten; a separate bare `workflows/*.md` mention in a different file is untouched (this is why the long form was chosen)', () => {
    const frames = [
      makeFrame('rules/plugin-files-mode.md', 'rules/plugin-files-mode.md',
        'WORKFLOW/COMMAND `workflows/*.md`'),
      makeFrame('skills/rosetta/README.md', 'skills/rosetta/README.md',
        'The glob `workflows/*.md` used to describe legacy workflow files is unrelated here.'),
    ];
    const p = makePluginFrame(frames);
    const processor = pluginReplaceLiterals([WORKFLOW_PAIR]);
    const result = processor(p);
    expect(result.frames[0].target_contents).toBe('WORKFLOW/COMMAND `skills/*-flow/SKILL.md`');
    expect(result.frames[1].target_contents).toBe(
      'The glob `workflows/*.md` used to describe legacy workflow files is unrelated here.',
    );
  });

  it('is idempotent: running it twice does not double-rewrite', () => {
    const frame = makeFrame('rules/plugin-files-mode.md', 'rules/plugin-files-mode.md',
      'WORKFLOW/COMMAND `workflows/*.md` and more prose.');
    const p = makePluginFrame([frame]);
    const processor = pluginReplaceLiterals([WORKFLOW_PAIR]);
    const once = processor(p);
    const twice = processor(once);
    expect(twice.frames[0].target_contents).toBe(once.frames[0].target_contents);
    expect(once.frames[0].target_contents).toBe('WORKFLOW/COMMAND `skills/*-flow/SKILL.md` and more prose.');
    const occurrences = (twice.frames[0].target_contents as string).match(/skills\/\*-flow\/SKILL\.md/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });

  it('skips binary frames', () => {
    const binary: FileProcessingFrame = {
      sourcePath: 'hooks/test.js',
      target: 'hooks/test.js',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    const p = makePluginFrame([binary]);
    const processor = pluginReplaceLiterals([WORKFLOW_PAIR]);
    const result = processor(p);
    expect(result.frames[0]).toBe(binary);
  });

  it('skips null-content frames', () => {
    const dropped: FileProcessingFrame = {
      sourcePath: 'rules/dropped.md',
      target: 'rules/dropped.md',
      isBinary: false,
      target_contents: null,
      source: [],
    };
    const p = makePluginFrame([dropped]);
    const processor = pluginReplaceLiterals([WORKFLOW_PAIR]);
    const result = processor(p);
    expect(result).toBe(p);
  });

  it('skips verbatim frames even when content matches a pair', () => {
    const verbatim: FileProcessingFrame = {
      sourcePath: 'configure/windsurf.md',
      target: 'configure/windsurf.md',
      isBinary: false,
      target_contents: 'WORKFLOW/COMMAND `workflows/*.md`',
      source: [],
      verbatim: true,
    };
    const p = makePluginFrame([verbatim]);
    const processor = pluginReplaceLiterals([WORKFLOW_PAIR]);
    const result = processor(p);
    expect(result.frames[0].target_contents).toBe('WORKFLOW/COMMAND `workflows/*.md`');
    expect(result.frames[0]).toBe(verbatim);
  });

  it('does not mutate the input frame or plugin frame', () => {
    const frame = makeFrame('rules/plugin-files-mode.md', 'rules/plugin-files-mode.md',
      'WORKFLOW/COMMAND `workflows/*.md`');
    const p = makePluginFrame([frame]);
    const processor = pluginReplaceLiterals([WORKFLOW_PAIR]);
    const result = processor(p);
    expect(frame.target_contents).toBe('WORKFLOW/COMMAND `workflows/*.md`');
    expect(p.frames[0].target_contents).toBe('WORKFLOW/COMMAND `workflows/*.md`');
    expect(result).not.toBe(p);
    expect(result.frames[0]).not.toBe(frame);
  });

  it('a pair whose from === to is a no-op', () => {
    const frame = makeFrame('a.md', 'a.md', 'unchanged content here');
    const p = makePluginFrame([frame]);
    const processor = pluginReplaceLiterals([['same', 'same']]);
    const result = processor(p);
    expect(result).toBe(p);
    expect(result.frames[0]).toBe(frame);
  });

  it('prose semantics, not path-token semantics: a literal preceded by a word character IS still replaced (unlike pluginRewriteReferences\' boundary rule)', () => {
    // pluginRewriteReferences would refuse to match "workflows/x.md" when immediately preceded by
    // an alphanumeric/hyphen (e.g. "my-workflows/x.md") — that guard exists to protect path
    // references. pluginReplaceLiterals has no such guard: it is plain substring substitution.
    const frame = makeFrame('a.md', 'a.md', 'my-workflows/x.md and also workflows/x.md');
    const p = makePluginFrame([frame]);
    const processor = pluginReplaceLiterals([['workflows/x.md', 'skills/x/SKILL.md']]);
    const result = processor(p);
    // Both occurrences replaced, including the one immediately preceded by a hyphen/word char —
    // no boundary/lookbehind semantics are applied.
    expect(result.frames[0].target_contents).toBe('my-skills/x/SKILL.md and also skills/x/SKILL.md');
  });

  it('prose semantics: a literal preceded by a dot-directory segment IS still replaced (unlike pluginRewriteReferences\' dot-directory guard)', () => {
    // pluginRewriteReferences deliberately never rewrites a token preceded by a dot-directory
    // segment such as `.cursor/` (IDE-native filesystem documentation). pluginReplaceLiterals has
    // no such carve-out.
    const frame = makeFrame('a.md', 'a.md', 'See `.cursor/workflows/*.md` for details.');
    const p = makePluginFrame([frame]);
    const processor = pluginReplaceLiterals([['workflows/*.md', 'skills/*-flow/SKILL.md']]);
    const result = processor(p);
    expect(result.frames[0].target_contents).toBe('See `.cursor/skills/*-flow/SKILL.md` for details.');
  });
});

// FR-ARCH-0058, FR-ARCH-0004/0005 — composed only into the pipelines of the specs that need it
// (Codex, Antigravity), never selected by a runtime identity branch inside a shared processor.
// Verified directly against the real buildTestSpecs() pipeline composition.
describe('pluginReplaceLiteralsProcessor composition (FR-ARCH-0058)', () => {
  const RELEASE: ReleaseDescriptor = { name: 'r1', deterministicHooks: false, displayName: 'R1' };

  it('every spec whose emitted filenames differ from the documented glob composes the processor', () => {
    const outputDir = os.tmpdir();
    const specs = buildTestSpecs({
      pluginsSource: REAL_PLUGINS_ROOT,
      hooksSource: path.join(outputDir, '__no-hooks-source__'),
      outputDir,
      release: RELEASE,
      dryRun: true,
    });

    const byName = new Map(specs.map((s) => [s.name, s]));

    const hasProcessor = (name: string): boolean => {
      const spec = byName.get(name);
      expect(spec, `spec ${name} not found`).toBeDefined();
      return (spec!.pluginProcessors ?? []).some((fn) => fn.name === 'pluginReplaceLiteralsProcessor');
    };

    // Codex and Antigravity RESTRUCTURE workflows into skills, so FR-ARCH-0049 emits no folder
    // pair at all and the glob-doc string needs an explicit correction.
    expect(hasProcessor('codex')).toBe(true);
    expect(hasProcessor('antigravity')).toBe(true);
    // The rest RENAME files: a folder pair relocates the folder but never touches the `*.md`
    // suffix inside a glob string. Cursor -> *.mdc rules; Copilot -> *.agent.md agents;
    // Copilot-standalone additionally -> *.prompt.md workflows.
    expect(hasProcessor('cursor')).toBe(true);
    expect(hasProcessor('cursor-standalone')).toBe(true);
    expect(hasProcessor('copilot')).toBe(true);
    expect(hasProcessor('copilot-standalone')).toBe(true);

    // Claude alone renames nothing and restructures nothing, so it needs no correction.
    for (const name of ['claude']) {
      expect(hasProcessor(name)).toBe(false);
    }
  });
});

// FR-ARCH-0058 — the drift guard (requiredIn + driftGuard). A literal pair silently no-ops when
// its key is absent, so a reworded source would ship a stale instruction with no error. The guard
// turns that into a hard failure — but ONLY if it can find the host document in the first place.
describe('pluginReplaceLiterals — drift guard', () => {
  const PAIR: readonly [string, string] = [
    'WORKFLOW/COMMAND `prompts/*.md`',
    'WORKFLOW/COMMAND `prompts/*.prompt.md`',
  ];
  const OPTS = { requiredIn: 'plugin-files-mode', driftGuard: 'WORKFLOW/COMMAND' };

  function hostFrame(target: string, content: string): FileProcessingFrame {
    return { sourcePath: 'rules/plugin-files-mode.md', target, isBinary: false, target_contents: content, source: [] };
  }

  it('finds a host renamed with a COMPOUND extension (regression: guard was inert for Copilot)', () => {
    // Copilot-standalone renames this document to `plugin-files-mode.instructions.md`. Matching
    // the stem by stripping only the LAST extension yields `plugin-files-mode.instructions`, so
    // the guard never engaged and a stale glob could ship unnoticed on the one target that needs
    // the correction most.
    const stale = hostFrame(
      '.github/instructions/plugin-files-mode.instructions.md',
      'WORKFLOW/COMMAND `somewhere-else/*.md` is the layout.',
    );
    const out = pluginReplaceLiterals([PAIR], OPTS)(makePluginFrame([stale]));

    expect(out.errors).toHaveLength(1);
    expect(out.errors[0].kind).toBe('hard');
    expect(out.errors[0].message).toContain('WORKFLOW/COMMAND');
  });

  it('substitutes and stays silent when the key IS present in the compound-named host', () => {
    const ok = hostFrame(
      '.github/instructions/plugin-files-mode.instructions.md',
      'WORKFLOW/COMMAND `prompts/*.md` is the layout.',
    );
    const out = pluginReplaceLiterals([PAIR], OPTS)(makePluginFrame([ok]));

    expect(out.errors).toHaveLength(0);
    expect(out.frames[0].target_contents).toContain('`prompts/*.prompt.md`');
    expect(out.frames[0].target_contents).not.toContain('`prompts/*.md`');
  });

  it('stays silent when the host does not carry the guarded passage at all', () => {
    // A minimal or unrelated host must not fail the build — only a host that HAS the passage but
    // no longer matches the key indicates drift.
    const unrelated = hostFrame('.cursor/rules/plugin-files-mode.mdc', 'No globs documented here.');
    const out = pluginReplaceLiterals([PAIR], OPTS)(makePluginFrame([unrelated]));
    expect(out.errors).toHaveLength(0);
  });
});
