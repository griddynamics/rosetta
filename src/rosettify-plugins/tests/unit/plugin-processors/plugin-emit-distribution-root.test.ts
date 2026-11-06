// FR-VAR-0072 — the standalone distribution root declaration.
import { describe, it, expect } from 'vitest';
import {
  pluginEmitDistributionRoot,
  buildRootDeclaration,
} from '../../../src/plugin-processors/plugin-emit-distribution-root.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec, Vfs } from '../../../src/types.js';

const RULE_BODY = [
  '---',
  'name: plugin-files-mode',
  '---',
  '',
  '<rosetta:plugin_files_mode REQUIRED="true">',
  '',
  'SKILL `skills/*/SKILL.md`, AGENT/SUBAGENT `agents/*.md`.',
  '',
  '</rosetta:plugin_files_mode>',
  '',
].join('\n');

function frame(target: string, sourcePath: string, contents: string | null): FileProcessingFrame {
  return { sourcePath, target, isBinary: false, target_contents: contents, source: [] };
}

function makeFrame(
  spec: Partial<PluginSpec>,
  frames: FileProcessingFrame[],
  vfsPaths: string[] = ['rules/plugin-files-mode.md'],
): PluginProcessingFrame {
  return {
    spec: { baseSubfolder: '', destination: 'rosetta-cursor-standalone', ...spec } as PluginSpec,
    vfs: vfsPaths.map((path) => ({ path, sourceFiles: [] })) as unknown as Vfs,
    frames,
    templateContext: {},
    errors: [],
  };
}

const cursorFrames = (): FileProcessingFrame[] => [
  frame('.cursor/rules/plugin-files-mode.mdc', 'rules/plugin-files-mode.md', RULE_BODY),
  frame('.cursor/commands/coding-flow.md', 'workflows/coding-flow.md', '# flow'),
];

const cursorRoot = pluginEmitDistributionRoot({ root: '.cursor', workflowFolder: 'commands' });
const copilotRoot = pluginEmitDistributionRoot({ root: '.github', workflowFolder: 'prompts' });

// The processor exists ONLY on the two standalone specs, so there is no "marketplace target"
// case to test here — the behaviour is absent for them by composition, not by a runtime guard.
// tests/unit/spec/targets-*.test.ts and the e2e output assertions cover that placement.
describe('pluginEmitDistributionRoot', () => {
  it('appends the declaration INSIDE the block, immediately before its closing tag', () => {
    const p = makeFrame({ baseSubfolder: '.cursor' }, cursorFrames());
    const out = cursorRoot(p);
    const content = out.frames[0].target_contents as string;

    expect(content).toContain('Rosetta plugin root: `.cursor`');
    // Inside the block, not after it.
    expect(content.indexOf('STANDALONE DISTRIBUTION'))
      .toBeLessThan(content.indexOf('</rosetta:plugin_files_mode>'));
    // The original body survives.
    expect(content).toContain('SKILL `skills/*/SKILL.md`');
  });

  it('takes the workflow FOLDER from config and the EXTENSION from the frames, per IDE', () => {
    const cursor = cursorRoot(makeFrame({ baseSubfolder: '.cursor' }, cursorFrames()));
    expect(cursor.frames[0].target_contents).toContain('`commands/*.md`');

    // Copilot renames workflows to *.prompt.md — the compound extension must survive.
    const copilot = copilotRoot(makeFrame({ baseSubfolder: '.github' }, [
      frame('.github/instructions/plugin-files-mode.instructions.md', 'rules/plugin-files-mode.md', RULE_BODY),
      frame('.github/prompts/coding-flow.prompt.md', 'workflows/coding-flow.md', '# flow'),
    ]));
    expect(copilot.frames[0].target_contents).toContain('`prompts/*.prompt.md`');
    expect(copilot.frames[0].target_contents).toContain('Rosetta plugin root: `.github`');
  });

  it('omits the workflow clause when the set ships no workflows', () => {
    const p = makeFrame({ baseSubfolder: '.cursor' }, [
      frame('.cursor/rules/plugin-files-mode.mdc', 'rules/plugin-files-mode.md', RULE_BODY),
    ]);
    const content = cursorRoot(p).frames[0].target_contents as string;
    expect(content).toContain('Rosetta plugin root: `.cursor`');
    expect(content).not.toContain('WORKFLOW/COMMAND lives at');
  });

  it('appends at end of document when the block tag is absent — never silently skips', () => {
    // The predecessor injection matched a `# PREP STEP 1:` anchor that did not exist in the real
    // rule and skipped silently. Any host shape must still receive the declaration.
    const p = makeFrame({ baseSubfolder: '.cursor' }, [
      frame('.cursor/rules/plugin-files-mode.mdc', 'rules/plugin-files-mode.md', '# no block here\n'),
    ]);
    expect(cursorRoot(p).frames[0].target_contents).toContain('Rosetta plugin root: `.cursor`');
  });

  it('hard-errors when a rules-shipping set has no plugin-files-mode document to carry it', () => {
    const p = makeFrame(
      { baseSubfolder: '.cursor' },
      [frame('.cursor/rules/other.mdc', 'rules/other.md', '# other')],
      ['rules/other.md'],
    );
    const out = cursorRoot(p);
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0].kind).toBe('hard');
    expect(out.errors[0].message).toContain('.cursor');
  });

  it('skips an add-on set that ships no rules/ folder at all', () => {
    const p = makeFrame(
      { baseSubfolder: '.cursor' },
      [frame('.cursor/skills/x/SKILL.md', 'skills/x/SKILL.md', '# skill')],
      ['skills/x/SKILL.md'],
    );
    const out = cursorRoot(p);
    expect(out.errors).toHaveLength(0);
    expect(out).toBe(p);
  });
});

describe('buildRootDeclaration', () => {
  it('states the root, the relativity rule, the workflow location and the prep directive', () => {
    const text = buildRootDeclaration('.cursor', 'commands/*.md');
    expect(text).toContain('Rosetta plugin root: `.cursor`');
    expect(text).toContain('relative to `.cursor/`');
    expect(text).toContain('`commands/*.md`');
    expect(text).toContain('prep step');
    // The target-repo disambiguation is the reason a path rewrite was rejected — keep it stated.
    expect(text).toContain('agents/IMPLEMENTATION.md');
  });
});
