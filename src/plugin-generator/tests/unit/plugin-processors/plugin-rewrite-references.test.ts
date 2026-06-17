// FR-ARCH-0049 — rewrite-references: file-level + unambiguous folder pairs, prose NOT rewritten
import { describe, it, expect } from 'vitest';
import { pluginRewriteReferences, buildRenamePairs } from '../../../src/plugin-processors/plugin-rewrite-references.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec, SpecEntry } from '../../../src/types.js';

function makeFrame(sourcePath: string, target: string, content: string): FileProcessingFrame {
  return {
    sourcePath,
    target,
    isBinary: false,
    target_contents: content,
    source: [],
  };
}

function makePluginFrame(frames: FileProcessingFrame[], specEntries: SpecEntry[], baseSubfolder = ''): PluginProcessingFrame {
  return {
    spec: {
      name: 'core-cursor',
      baseSubfolder,
      specEntries,
    } as unknown as PluginSpec,
    vfs: [] as any,
    frames,
    templateContext: {},
    errors: [],
  };
}

describe('pluginRewriteReferences', () => {
  it('rewrites workflows/coding-flow.md ref using file-level pair', () => {
    // Frame: sourcePath=workflows/coding-flow.md, target=commands/coding-flow.md
    const frames = [
      makeFrame('workflows/coding-flow.md', 'commands/coding-flow.md', '# Coding Flow'),
      makeFrame('rules/test.md', 'rules/test.md', 'See workflows/coding-flow.md for details.'),
    ];
    const p = makePluginFrame(frames, []);
    const result = pluginRewriteReferences(p);
    const f = result.frames[1];
    expect(f.target_contents as string).toContain('commands/coding-flow.md');
    expect(f.target_contents as string).not.toContain('workflows/coding-flow.md');
  });

  it('does NOT rewrite prose substring "my-workflows/" (FR-ARCH-0037)', () => {
    const frames = [
      makeFrame('workflows/example.md', 'commands/example.md', '# Example'),
      makeFrame('rules/test.md', 'rules/test.md', 'Path my-workflows/example.md should not change.'),
    ];
    const p = makePluginFrame(frames, []);
    const result = pluginRewriteReferences(p);
    const f = result.frames[1];
    expect(f.target_contents as string).toContain('my-workflows/example.md');
  });

  it('does NOT rewrite IDE-native dot-directory paths (.windsurf/workflows/, .cursor/rules/)', () => {
    // These are IDE-native filesystem paths in configure guides — must never be touched
    const frames = [
      makeFrame('workflows/coding-flow.md', 'commands/coding-flow.md', '# Coding Flow'),
      makeFrame('configure/windsurf.md', 'configure/windsurf.md',
        '- `.windsurf/workflows/` - Automation workflows\n' +
        '**Location:** `.windsurf/workflows/setup.md`\n' +
        'See `.cursor/rules/agents.mdc` for Cursor rules.\n' +
        'See `.github/workflows/ci.yml` for CI.\n' +
        'But workflows/coding-flow.md should be rewritten.',
      ),
    ];
    const p = makePluginFrame(frames, [
      { source: 'workflows/**', target: 'commands', exclude: [], processors: [] },
    ]);
    const result = pluginRewriteReferences(p);
    const content = result.frames[1].target_contents as string;
    // IDE-native paths: untouched
    expect(content).toContain('.windsurf/workflows/');
    expect(content).toContain('.windsurf/workflows/setup.md');
    expect(content).toContain('.cursor/rules/agents.mdc');
    expect(content).toContain('.github/workflows/ci.yml');
    // Bare plugin-internal reference: rewritten
    expect(content).toContain('commands/coding-flow.md');
    expect(content).not.toContain('workflows/coding-flow.md');
  });

  it('returns original frame when no rewrites needed', () => {
    const frame = makeFrame('rules/test.md', 'rules/test.md', '# No references to rewrite\n');
    const p = makePluginFrame([frame], []);
    const result = pluginRewriteReferences(p);
    expect(result).toBe(p);
  });

  it('skips binary frames', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'hooks/test.js',
      target: 'hooks/test.js',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    const renamedFrame = makeFrame('workflows/coding-flow.md', 'commands/coding-flow.md', '# Coding Flow');
    const p = makePluginFrame([frame, renamedFrame], []);
    const result = pluginRewriteReferences(p);
    expect(result.frames[0]).toBe(frame);
  });

  it('skips null-content frames', () => {
    const f2: FileProcessingFrame = {
      sourcePath: 'rules/dropped.md',
      target: 'rules/dropped.md',
      isBinary: false,
      target_contents: null,
      source: [],
    };
    const p = makePluginFrame([f2], []);
    const result = pluginRewriteReferences(p);
    expect(result).toBe(p);
  });

  it('skips verbatim frames even when content matches a rename pair (TODO-2)', () => {
    // A configure file references "workflows/coding-flow.md" — must not be rewritten
    const renamedFrame = makeFrame('workflows/coding-flow.md', 'commands/coding-flow.md', '# Coding Flow');
    const verbatimFrame: FileProcessingFrame = {
      sourcePath: 'configure/windsurf.md',
      target: 'configure/windsurf.md',
      isBinary: false,
      target_contents: '.windsurf/workflows/ - Automation workflows for Cascade',
      source: [],
      verbatim: true,
    };
    const p = makePluginFrame([renamedFrame, verbatimFrame], [
      { source: 'workflows/**', target: 'commands', exclude: [], processors: [] },
    ]);
    const result = pluginRewriteReferences(p);
    // verbatim frame content must be identical — no rewrite applied
    expect(result.frames[1].target_contents).toBe('.windsurf/workflows/ - Automation workflows for Cascade');
    expect(result.frames[1]).toBe(verbatimFrame);
  });
});

// FR-ARCH-0049: buildRenamePairs derives pairs from frames + unambiguous folder specEntries
describe('buildRenamePairs', () => {
  it('produces unambiguous folder pair from specEntries (single target)', () => {
    // workflows/** -> commands: unambiguous, emits pair
    const spec: any = {
      baseSubfolder: '',
      specEntries: [
        { source: 'workflows/**', target: 'commands', exclude: [], processors: [] },
      ],
    };
    const pairs = buildRenamePairs([], spec);
    expect(pairs).toContainEqual(['workflows/', 'commands/']);
  });

  it('no folder pair when target matches source folder name', () => {
    const spec: any = {
      baseSubfolder: '',
      specEntries: [
        { source: 'workflows/**', target: 'workflows', exclude: [], processors: [] },
      ],
    };
    const pairs = buildRenamePairs([], spec);
    expect(pairs.some(([f, t]) => f === 'workflows/' && t === 'workflows/')).toBe(false);
  });

  it('no folder pair when source has multiple different targets (ambiguous)', () => {
    // rules/** -> instructions AND rules/** -> rules: ambiguous, no pair emitted
    const spec: any = {
      baseSubfolder: '',
      specEntries: [
        { source: 'rules/**', target: 'instructions', exclude: [], processors: [] },
        { source: 'rules/**', target: 'rules', exclude: [], processors: [] },
      ],
    };
    const pairs = buildRenamePairs([], spec);
    expect(pairs.some(([f]) => f === 'rules/')).toBe(false);
  });

  it('produces file-level pair from frames where path changed (extension rewrite)', () => {
    // rules/bootstrap.md -> rules/bootstrap.mdc (cursor extension rewrite)
    const frames: FileProcessingFrame[] = [
      {
        sourcePath: 'rules/bootstrap.md',
        target: 'rules/bootstrap.mdc',
        isBinary: false,
        target_contents: '# Bootstrap',
        source: [],
      },
    ];
    const spec: any = {
      baseSubfolder: '',
      specEntries: [],
    };
    const pairs = buildRenamePairs(frames, spec);
    expect(pairs).toContainEqual(['rules/bootstrap.md', 'rules/bootstrap.mdc']);
  });

  it('strips baseSubfolder from target when computing plugin-root-relative path', () => {
    // .github/prompts/coding-flow.prompt.md from workflows/coding-flow.md
    const frames: FileProcessingFrame[] = [
      {
        sourcePath: 'workflows/coding-flow.md',
        target: '.github/prompts/coding-flow.prompt.md',
        isBinary: false,
        target_contents: '# Coding Flow',
        source: [],
      },
    ];
    const spec: any = {
      baseSubfolder: '.github',
      specEntries: [
        { source: 'workflows/**', target: '.github/prompts', exclude: [], processors: [] },
      ],
    };
    const pairs = buildRenamePairs(frames, spec);
    expect(pairs).toContainEqual(['workflows/coding-flow.md', 'prompts/coding-flow.prompt.md']);
    expect(pairs).toContainEqual(['workflows/', 'prompts/']);
  });

  it('excludes frames outside baseSubfolder namespace (FR-ARCH-0049)', () => {
    // codex .codex/agents frames must not generate content-rewrite pairs
    const frames: FileProcessingFrame[] = [
      {
        sourcePath: 'agents/subagent.md',
        target: '.codex/agents/subagent.toml',
        isBinary: false,
        target_contents: '# Subagent',
        source: [],
      },
      {
        sourcePath: 'rules/bootstrap.md',
        target: '.agents/rules/bootstrap.md',
        isBinary: false,
        target_contents: '# Bootstrap',
        source: [],
      },
    ];
    const spec: any = {
      baseSubfolder: '.agents',
      specEntries: [],
    };
    const pairs = buildRenamePairs(frames, spec);
    expect(pairs.some(([f]) => f === 'agents/subagent.md')).toBe(false);
    expect(pairs.some(([f]) => f === 'rules/bootstrap.md')).toBe(false);
  });
});
