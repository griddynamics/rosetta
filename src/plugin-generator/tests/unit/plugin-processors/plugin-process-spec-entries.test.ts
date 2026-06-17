// FR-ARCH-0054 — pluginProcessSpecEntries: glob match, exclude, computeTargetPath edge cases
import { describe, it, expect } from 'vitest';
import { pluginProcessSpecEntries } from '../../../src/plugin-processors/plugin-process-spec-entries.js';
import type {
  FileProcessingFrame,
  PluginProcessingFrame,
  PluginSpec,
  ReleaseDescriptor,
  SpecEntry,
  TargetContext,
} from '../../../src/types.js';

const RELEASE: ReleaseDescriptor = { name: 'r2', deterministicHooks: false, displayName: 'R2' };

function makeVfs(paths: string[]) {
  return paths.map((p) => ({
    path: p,
    sourceFiles: [{ origin: '/dev/null', order: '0', conditions: new Set<string>() }],
  }));
}

function makePluginFrame(
  vfsPaths: string[],
  specEntries: SpecEntry[],
  existingFrames: FileProcessingFrame[] = [],
): PluginProcessingFrame {
  return {
    spec: {
      name: 'core-claude',
      destination: 'core-claude',
      specEntries,
      modelVocabulary: { kind: 'claude', map: {} },
    } as unknown as PluginSpec,
    vfs: makeVfs(vfsPaths) as any,
    frames: existingFrames,
    templateContext: {},
    errors: [],
  };
}

// Content-setting processor — sets target_contents so frame is not dropped
const contentProc = (f: FileProcessingFrame, _ctx: TargetContext): FileProcessingFrame => ({
  ...f,
  target_contents: '# content',
});

// Null-out processor — sets target_contents = null (frame dropped if path unchanged)
const nullProc = (f: FileProcessingFrame, _ctx: TargetContext): FileProcessingFrame => ({
  ...f,
  target_contents: null,
});

describe('pluginProcessSpecEntries', () => {
  it('matches files via glob and creates frames', () => {
    const entry: SpecEntry = {
      source: 'rules/**',
      target: 'rules',
      exclude: [],
      processors: [contentProc],
    };
    const p = makePluginFrame(['rules/bootstrap.md', 'workflows/coding.md'], [entry]);
    const result = pluginProcessSpecEntries(RELEASE)(p);
    const targets = result.frames.map((f) => f.target);
    expect(targets).toContain('rules/bootstrap.md');
    expect(targets).not.toContain('workflows/coding.md');
  });

  it('excludes files matching exclude patterns', () => {
    const entry: SpecEntry = {
      source: 'rules/**',
      target: 'rules',
      exclude: ['rules/bootstrap.md'],
      processors: [contentProc],
    };
    const p = makePluginFrame(['rules/bootstrap.md', 'rules/other.md'], [entry]);
    const result = pluginProcessSpecEntries(RELEASE)(p);
    const targets = result.frames.map((f) => f.target);
    expect(targets).not.toContain('rules/bootstrap.md');
    expect(targets).toContain('rules/other.md');
  });

  it('excludes files matching glob folder pattern (templates/shell-schemas/**)', () => {
    const entry: SpecEntry = {
      source: 'templates/**',
      target: 'templates',
      exclude: ['templates/shell-schemas/**'],
      processors: [contentProc],
    };
    const p = makePluginFrame(
      ['templates/hooks.json.tmpl', 'templates/shell-schemas/my-schema.json'],
      [entry],
    );
    const result = pluginProcessSpecEntries(RELEASE)(p);
    const targets = result.frames.map((f) => f.target);
    expect(targets).not.toContain('templates/shell-schemas/my-schema.json');
    expect(targets).toContain('templates/hooks.json.tmpl');
  });

  it('drops null-content frames when path is unchanged (FR-ARCH-0049)', () => {
    const entry: SpecEntry = {
      source: 'rules/**',
      target: 'rules',
      exclude: [],
      processors: [nullProc], // null out target_contents
    };
    const p = makePluginFrame(['rules/dropped.md'], [entry]);
    const result = pluginProcessSpecEntries(RELEASE)(p);
    // Frame with null contents and unchanged path must be dropped
    expect(result.frames.some((f) => f.sourcePath === 'rules/dropped.md')).toBe(false);
  });

  it('computeTargetPath: vfsPath equals sourcePrefix (not under it) — uses basename', () => {
    // When source="rules/bootstrap.md" (exact file, no glob) and vfsPath="rules/bootstrap.md"
    // sourcePrefix = "rules/bootstrap.md" (stripped *..)
    // vfsPath === sourcePrefix → relativePart = basename = "bootstrap.md"
    const entry: SpecEntry = {
      source: 'rules/bootstrap.md',
      target: 'rules',
      exclude: [],
      processors: [contentProc],
    };
    const p = makePluginFrame(['rules/bootstrap.md'], [entry]);
    const result = pluginProcessSpecEntries(RELEASE)(p);
    const targets = result.frames.map((f) => f.target);
    expect(targets).toContain('rules/bootstrap.md');
  });

  it('computeTargetPath: empty targetBase — returns relativePart directly', () => {
    // When targetBase is empty, path is returned without prefix
    const entry: SpecEntry = {
      source: 'rules/**',
      target: '', // empty targetBase → branch line 139
      exclude: [],
      processors: [contentProc],
    };
    const p = makePluginFrame(['rules/test.md'], [entry]);
    const result = pluginProcessSpecEntries(RELEASE)(p);
    // With empty target, relativePart = "test.md" (rules/ stripped)
    const targets = result.frames.map((f) => f.target);
    expect(targets).toContain('test.md');
  });

  it('computeTargetPath: no sourcePrefix match — uses full vfsPath', () => {
    // When sourcePrefix is empty (e.g. pattern "**"), relativePart = vfsPath
    const entry: SpecEntry = {
      source: '**',
      target: 'output',
      exclude: [],
      processors: [contentProc],
    };
    const p = makePluginFrame(['rules/test.md'], [entry]);
    const result = pluginProcessSpecEntries(RELEASE)(p);
    const targets = result.frames.map((f) => f.target);
    // Empty sourcePrefix → relativePart = full vfsPath = "rules/test.md"
    expect(targets).toContain('output/rules/test.md');
  });

  it('FR-ARCH-0056: emits hard error when two SpecEntries produce frames with the same target path', () => {
    // Two SpecEntries both glob over 'rules/shared.md' and map it to the same target 'rules/shared.md'.
    const entry1: SpecEntry = {
      source: 'rules/**',
      target: 'rules',
      exclude: [],
      processors: [contentProc],
    };
    const entry2: SpecEntry = {
      source: 'rules/**',
      target: 'rules',
      exclude: [],
      processors: [contentProc],
    };
    const p = makePluginFrame(['rules/shared.md'], [entry1, entry2]);
    const result = pluginProcessSpecEntries(RELEASE)(p);

    const hardErrors = result.errors.filter((e) => e.kind === 'hard');
    expect(hardErrors.length).toBeGreaterThan(0);

    const conflictError = hardErrors.find((e) => e.message.includes('rules/shared.md'));
    expect(conflictError).toBeDefined();
    expect(conflictError!.message).toContain('Target conflict');
    expect(conflictError!.message).toContain('"rules/shared.md"');
    // Both entries' source and target info must appear
    expect(conflictError!.message).toContain('source="rules/**"');
    // The VFS source path of both conflicting frames
    expect(conflictError!.message).toContain('file VFS path="rules/shared.md"');
  });

  it('FR-ARCH-0056: no error when all SpecEntries produce frames with distinct target paths', () => {
    const entryA: SpecEntry = {
      source: 'rules/**',
      target: 'rules',
      exclude: [],
      processors: [contentProc],
    };
    const entryB: SpecEntry = {
      source: 'workflows/**',
      target: 'commands',
      exclude: [],
      processors: [contentProc],
    };
    const p = makePluginFrame(['rules/bootstrap.md', 'workflows/coding.md'], [entryA, entryB]);
    const result = pluginProcessSpecEntries(RELEASE)(p);

    const hardErrors = result.errors.filter((e) => e.kind === 'hard');
    expect(hardErrors.length).toBe(0);
  });
});
