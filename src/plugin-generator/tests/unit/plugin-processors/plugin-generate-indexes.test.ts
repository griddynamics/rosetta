// FR-ARCH-0047, FR-GEN-* — tag membership, heading alias, description fallback, no-members→no index
import { describe, it, expect } from 'vitest';
import { pluginGenerateIndexes } from '../../../src/plugin-processors/plugin-generate-indexes.js';
import type { FileProcessingFrame, IndexDecl, PluginProcessingFrame, PluginSpec } from '../../../src/types.js';

function makeWorkflowFrame(target: string, tags: string[], description?: string): FileProcessingFrame {
  const desc = description ? `description: ${description}\n` : '';
  const tagStr = tags.length > 0 ? `tags: [${tags.map((t) => `"${t}"`).join(', ')}]\n` : '';
  return {
    sourcePath: target,
    target,
    isBinary: false,
    target_contents: `---\n${desc}${tagStr}---\n\n# Body\n`,
    source: [],
  };
}

function makeRulesFrame(target: string, description?: string): FileProcessingFrame {
  const desc = description ? `description: ${description}\n` : '';
  return {
    sourcePath: target,
    target,
    isBinary: false,
    target_contents: `---\n${desc}---\n\n# Rules Body\n`,
    source: [],
  };
}

function makePluginFrame(frames: FileProcessingFrame[], indexes: IndexDecl[]): PluginProcessingFrame {
  return {
    spec: {
      name: 'core-claude',
      baseSubfolder: '',
      indexes,
    } as unknown as PluginSpec,
    vfs: [] as any,
    frames,
    templateContext: {},
    errors: [],
  };
}

describe('pluginGenerateIndexes', () => {
  it('generates rules index for all rule frames in folder', () => {
    const frames = [
      makeRulesFrame('rules/bootstrap-core.md', 'Core Policy'),
      makeRulesFrame('rules/coding-best.md'),
    ];
    const p = makePluginFrame(frames, [
      { folder: 'rules', targetFolder: 'rules', heading: 'rules' },
    ]);
    const result = pluginGenerateIndexes(p);
    const idx = result.frames.find((f) => f.target === 'rules/INDEX.md');
    expect(idx).toBeDefined();
    expect(idx!.target_contents as string).toContain('# Rosetta Rules Index');
    expect(idx!.target_contents as string).toContain('rules/bootstrap-core.md');
  });

  it('only includes workflow-tagged files in workflows index (FR-GEN-0003)', () => {
    const frames = [
      makeWorkflowFrame('workflows/coding-flow.md', ['workflow'], 'Coding flow'),
      makeWorkflowFrame('workflows/planning.md', []), // no workflow tag
      makeWorkflowFrame('workflows/helper.md', ['workflow-helper']), // wrong tag
    ];
    const p = makePluginFrame(frames, [
      { folder: 'workflows', targetFolder: 'workflows', requiredTag: 'workflow', heading: 'workflows' },
    ]);
    const result = pluginGenerateIndexes(p);
    const idx = result.frames.find((f) => f.target === 'workflows/INDEX.md');
    expect(idx).toBeDefined();
    const content = idx!.target_contents as string;
    expect(content).toContain('coding-flow.md');
    expect(content).not.toContain('planning.md');
    expect(content).not.toContain('helper.md');
  });

  it('produces no index when zero qualifying members (FR-GEN-0001)', () => {
    const frames = [
      makeWorkflowFrame('workflows/planning.md', []), // no workflow tag
    ];
    const p = makePluginFrame(frames, [
      { folder: 'workflows', targetFolder: 'workflows', requiredTag: 'workflow', heading: 'workflows' },
    ]);
    const result = pluginGenerateIndexes(p);
    const idx = result.frames.find((f) => f.target === 'workflows/INDEX.md');
    expect(idx).toBeUndefined();
  });

  it('uses "Workflows" heading for workflows folder (FR-GEN-0004 alias)', () => {
    const frames = [
      makeWorkflowFrame('commands/coding-flow.md', ['workflow'], 'Coding'),
    ];
    const p = makePluginFrame(frames, [
      { folder: 'commands', targetFolder: 'commands', requiredTag: 'workflow', heading: 'workflows' },
    ]);
    const result = pluginGenerateIndexes(p);
    const idx = result.frames.find((f) => f.target === 'commands/INDEX.md');
    expect(idx).toBeDefined();
    expect(idx!.target_contents as string).toContain('# Rosetta Workflows Index');
  });

  it('uses title-cased stem as description fallback (FR-GEN-0002)', () => {
    const frames = [makeRulesFrame('rules/coding-best-practices.md')]; // no description in FM
    const p = makePluginFrame(frames, [{ folder: 'rules', targetFolder: 'rules', heading: 'rules' }]);
    const result = pluginGenerateIndexes(p);
    const idx = result.frames.find((f) => f.target === 'rules/INDEX.md');
    expect(idx!.target_contents as string).toContain('Coding Best Practices');
  });

  it('strips baseSubfolder prefix from index paths (codex case)', () => {
    const frames = [makeRulesFrame('.agents/rules/bootstrap-core.md', 'Core')];
    const p: PluginProcessingFrame = {
      spec: {
        name: 'core-codex',
        baseSubfolder: '.agents',
        indexes: [{ folder: '.agents/rules', targetFolder: '.agents/rules', heading: 'rules' }],
      } as unknown as PluginSpec,
      vfs: [] as any,
      frames,
      templateContext: {},
      errors: [],
    };
    const result = pluginGenerateIndexes(p);
    const idx = result.frames.find((f) => f.target === '.agents/rules/INDEX.md');
    expect(idx).toBeDefined();
    // Path in index entry should be relative to .agents/ plugin root → "rules/bootstrap-core.md"
    expect(idx!.target_contents as string).toContain('`rules/bootstrap-core.md`');
  });
});
