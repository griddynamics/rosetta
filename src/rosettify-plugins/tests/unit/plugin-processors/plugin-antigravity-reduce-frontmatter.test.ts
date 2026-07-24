// FR-COPY-0081 — Antigravity frontmatter reduction: agent files + skill SKILL.md → name+description
// only; body unchanged; rules are NOT reduced (trigger: and any other authored field preserved).
import { describe, it, expect } from 'vitest';
import { pluginAntigravityReduceFrontmatter } from '../../../src/plugin-processors/plugin-antigravity-reduce-frontmatter.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec } from '../../../src/types.js';

function makeFrame(target: string, content: string): FileProcessingFrame {
  return {
    sourcePath: target,
    target,
    isBinary: false,
    target_contents: content,
    source: [{ origin: '/dev/null', order: '0', conditions: new Set() }],
  };
}

function makePluginFrame(frames: FileProcessingFrame[]): PluginProcessingFrame {
  return {
    spec: { name: 'core-antigravity' } as unknown as PluginSpec,
    vfs: [] as any,
    frames,
    templateContext: {},
    errors: [],
  };
}

describe('pluginAntigravityReduceFrontmatter — agent files', () => {
  it('reduces an agent file with name/description/model/mode/readonly/baseSchema to exactly name+description; body unchanged', () => {
    const body = '\n\n# Architect Agent\n\nDoes architecture work.\n';
    const content =
      '---\nname: architect\ndescription: An architect\nmodel: claude-4.8-opus-high\nmode: subagent\nreadonly: false\nbaseSchema: docs/schemas/agent.md\n---' +
      body;
    const frame = makeFrame('agents/architect.md', content);
    const p = makePluginFrame([frame]);
    const result = pluginAntigravityReduceFrontmatter(p);
    const out = result.frames[0].target_contents as string;

    expect(out).toBe('---\nname: architect\ndescription: An architect\n---' + body);
    expect(out).not.toContain('model:');
    expect(out).not.toContain('mode:');
    expect(out).not.toContain('readonly:');
    expect(out).not.toContain('baseSchema:');
    // Body preserved verbatim
    expect(out).toContain('# Architect Agent');
    expect(out).toContain('Does architecture work.');
  });
});

describe('pluginAntigravityReduceFrontmatter — skill SKILL.md', () => {
  it('reduces a skill SKILL.md carrying a model: field to exactly name+description', () => {
    const content =
      '---\nname: mytool\ndescription: A tool skill\nmodel: claude-4.8-opus-high\nbaseSchema: docs/schemas/skill.md\n---\n\n# My Tool\n\nBody text.\n';
    const frame = makeFrame('skills/mytool/SKILL.md', content);
    const p = makePluginFrame([frame]);
    const result = pluginAntigravityReduceFrontmatter(p);
    const out = result.frames[0].target_contents as string;

    expect(out).toBe('---\nname: mytool\ndescription: A tool skill\n---\n\n# My Tool\n\nBody text.\n');
    expect(out).not.toContain('model:');
    expect(out).not.toContain('baseSchema:');
  });

  it('also reduces a workflow-derived SKILL.md (already renamed by fileAntigravityWorkflowToSkill)', () => {
    const content = '---\nname: demo-flow\ndescription: Demo flow\ntags: ["workflow"]\n---\n\n# Demo Flow\n';
    const frame = makeFrame('skills/demo-flow/SKILL.md', content);
    const p = makePluginFrame([frame]);
    const result = pluginAntigravityReduceFrontmatter(p);
    const out = result.frames[0].target_contents as string;
    expect(out).toBe('---\nname: demo-flow\ndescription: Demo flow\n---\n\n# Demo Flow\n');
    expect(out).not.toContain('tags:');
  });

  it('leaves other skill-folder files (e.g. README.md, phase files) untouched', () => {
    const content = '---\nmodel: claude-4.8-opus-high\n---\n\n# Not reduced\n';
    const readme = makeFrame('skills/mytool/README.md', content);
    const phase = makeFrame('skills/demo-flow/phases/demo-flow-step.md', content);
    const p = makePluginFrame([readme, phase]);
    const result = pluginAntigravityReduceFrontmatter(p);
    expect(result.frames[0].target_contents).toBe(content);
    expect(result.frames[1].target_contents).toBe(content);
    expect(result).toBe(p); // no qualifying frames changed → same frame reference (no-op)
  });
});

describe('pluginAntigravityReduceFrontmatter — rules are NOT reduced', () => {
  it('a rule file frontmatter (incl. trigger:) is left completely unchanged', () => {
    const content =
      '---\nname: sample-rule\ndescription: A rule\ntrigger: always_on\n---\n\n# Rule Body\n';
    const frame = makeFrame('rules/sample-rule.md', content);
    const p = makePluginFrame([frame]);
    const result = pluginAntigravityReduceFrontmatter(p);

    expect(result.frames[0].target_contents).toBe(content);
    expect(result).toBe(p); // untouched → same PluginProcessingFrame reference
  });
});

describe('pluginAntigravityReduceFrontmatter — pass-through cases', () => {
  it('skips binary frames', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'agents/icon.png',
      target: 'agents/icon.png',
      isBinary: true,
      target_contents: Buffer.from([0x00]) as unknown as string,
      source: [],
    };
    const p = makePluginFrame([frame]);
    const result = pluginAntigravityReduceFrontmatter(p);
    expect(result).toBe(p);
    expect(result.frames[0]).toBe(frame);
  });

  it('skips null-content (dropped) frames', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'agents/dropped.md',
      target: 'agents/dropped.md',
      isBinary: false,
      target_contents: null,
      source: [],
    };
    const p = makePluginFrame([frame]);
    const result = pluginAntigravityReduceFrontmatter(p);
    expect(result).toBe(p);
  });

  it('is idempotent: frontmatter already exactly name+description is unchanged', () => {
    const content = '---\nname: architect\ndescription: An architect\n---\n\n# Body\n';
    const frame = makeFrame('agents/architect.md', content);
    const p = makePluginFrame([frame]);
    const result = pluginAntigravityReduceFrontmatter(p);
    expect(result).toBe(p);
    expect(result.frames[0].target_contents).toBe(content);
  });
});
