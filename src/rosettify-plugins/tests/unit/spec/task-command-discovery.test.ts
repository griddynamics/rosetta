import { describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildAllSpecs } from '../../../src/spec/targets.js';
import { fileWorkflowToSkill } from '../../../src/file-processors/file-workflow-to-skill.js';
import type { FileProcessingFrame, PluginProcessingFrame, TargetContext } from '../../../src/types.js';

const commands = ['task-define', 'task-spec', 'task-implement', 'tasks-list'];
const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../plugins');

describe('task commands without a -flow suffix', () => {
  it.each(['.agents/skills', 'skills'])('keeps four independent command roots in %s', (base) => {
    const ctx = {
      spec: {},
      vfs: commands.map((name) => ({ path: `workflows/${name}.md`, sourceFiles: [] })),
      release: { name: 'r3', deterministicHooks: false, displayName: 'R3' },
    } as unknown as TargetContext;
    for (const name of commands) {
      const content = `---\nname: ${name}\ntags: [workflow]\n---\nCommand body.\n`;
      const frame: FileProcessingFrame = {
        sourcePath: `workflows/${name}.md`, target: `${base}/${name}.md`,
        source: [], isBinary: false, target_contents: content,
      };
      const result = fileWorkflowToSkill(frame, ctx);
      expect(result.target).toBe(`${base}/${name}/SKILL.md`);
      expect(result.target_contents).toBe(content);
    }
  });

  it.each(['core-codex', 'core-antigravity'])('%s discovery includes short command names', (name) => {
    const spec = buildAllSpecs({
      pluginsSource: pluginRoot, hooksSource: path.join(os.tmpdir(), '__no-hooks-source__'),
      outputDir: os.tmpdir(), dryRun: true,
      release: { name: 'r3', deterministicHooks: false, displayName: 'R3' },
    }).find((candidate) => candidate.name === name)!;
    const processor = spec.pluginProcessors!.find((fn) => fn.name === 'pluginReplaceLiteralsProcessor')!;
    expect(processor).toBeDefined();
    const frame = {
      spec, vfs: [], templateContext: {}, errors: [],
      frames: [{
        sourcePath: 'rules/plugin-files-mode.md', target: 'rules/plugin-files-mode.md',
        source: [], isBinary: false,
        target_contents: 'WORKFLOW/COMMAND `workflows/*.md`; unrelated `workflows/*.md`',
      }],
    } as unknown as PluginProcessingFrame;
    const result = processor(frame);
    expect(result.frames[0].target_contents).toBe(
      'WORKFLOW/COMMAND `skills/*/SKILL.md`; unrelated `workflows/*.md`',
    );
  });
});
