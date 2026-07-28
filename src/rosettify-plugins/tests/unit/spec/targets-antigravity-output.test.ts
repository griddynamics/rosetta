// FR-VAR-0080, FR-STRUCT-0030 — core-antigravity output shape: rules/skills/agents present,
// no workflows/ folder, rules+skills indexes generated. Runs the REAL coreAntigravity
// PluginSpec pipeline (buildAllSpecs → createPluginFrame → spec.pluginProcessors) against a
// self-contained temp instructions tree, writing to a scratch temp output dir (isolated,
// idempotent — the temp dirs are created fresh and removed after each test).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildAllSpecs } from '../../../src/spec/targets.js';
import { createPluginFrame } from '../../../src/frames.js';
import { buildVfs } from '../../../src/vfs/build-vfs.js';
import type { PluginProcessingFrame, ReleaseDescriptor } from '../../../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Real preserved core-antigravity plugin dir ships only plugin.json + hooks.json.tmpl (read-only use).
const REAL_PLUGINS_ROOT = path.join(__dirname, '..', '..', '..', 'plugins');

const RELEASE: ReleaseDescriptor = { name: 'r1', deterministicHooks: false, displayName: 'R1' };

function writeFile(root: string, relPath: string, content: string): void {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf-8');
}

// Builds a minimal, self-contained instructions tree at <tmp>/r1/core covering rules, a
// workflow with one phase, a real (folder-form) skill, and an agent — enough surface to
// exercise FR-COPY-0080/0081/0082 together with FR-VAR-0080/0081.
function buildInstructionsTree(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'antigravity-shape-'));
  const base = path.join(tmpDir, 'r1', 'core');

  writeFile(
    base,
    'rules/sample-rule.md',
    '---\nname: sample-rule\ndescription: A sample rule\ntrigger: always_on\n---\n\n# Sample Rule\n\nBody text.\n',
  );

  writeFile(
    base,
    'workflows/demo-flow.md',
    '---\nname: demo-flow\ndescription: Demo workflow\ntags: ["workflow"]\n---\n\n# Demo Flow\n\n' +
      '1. APPLY PHASE `demo-flow-step.md`\n',
  );
  writeFile(
    base,
    'workflows/demo-flow-step.md',
    '---\nname: demo-flow-step\ndescription: Demo flow step one\n---\n\n# Step One\n\nDo the step.\n',
  );

  writeFile(
    base,
    'skills/mytool/SKILL.md',
    '---\nname: mytool\ndescription: My tool skill\nmodel: claude-4.8-opus-high\nbaseSchema: docs/schemas/skill.md\n---\n\n# My Tool\n\nSkill body.\n',
  );

  writeFile(
    base,
    'agents/myagent.md',
    '---\nname: myagent\ndescription: My agent\nmodel: claude-4.8-opus-high, gpt-5.5-high\nmode: subagent\nreadonly: false\n---\n\n' +
      '# My Agent\n\nspawn: subagent_required_model="claude-opus-4-8, gpt-5.5-high"\n',
  );

  writeFile(
    base,
    'configure/guide.md',
    '---\nname: guide\ndescription: Setup guide\n---\n\n# Guide\n',
  );

  return tmpDir;
}

describe('core-antigravity — generated output shape (FR-VAR-0080, FR-STRUCT-0030)', () => {
  let instructionsSource: string;
  let outputDir: string;
  let result: PluginProcessingFrame;
  let targetRoot: string;

  beforeAll(() => {
    instructionsSource = buildInstructionsTree();
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'antigravity-out-'));

    const vfs = buildVfs(instructionsSource, 'r1', 'core');
    const specs = buildAllSpecs({
      pluginsSource: REAL_PLUGINS_ROOT,
      hooksSource: path.join(outputDir, '__no-hooks-source__'),
      outputDir,
      release: RELEASE,
      dryRun: false,
    });

    const coreAntigravity = specs.find((s) => s.name === 'core-antigravity');
    if (!coreAntigravity) throw new Error('core-antigravity spec not found in buildAllSpecs() output');

    let frame: PluginProcessingFrame = createPluginFrame(coreAntigravity, vfs, {
      release: 'r1',
      deterministic_hooks: RELEASE.deterministicHooks,
      bootstrap_hooks: '',
    });
    for (const processor of coreAntigravity.pluginProcessors) {
      frame = processor(frame);
    }
    result = frame;
    targetRoot = path.join(outputDir, 'core-antigravity');
  });

  afterAll(() => {
    fs.rmSync(instructionsSource, { recursive: true, force: true });
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it('completes with no hard/soft errors', () => {
    expect(result.errors).toEqual([]);
  });

  it('produces rules/, skills/, and agents/ folders, and no workflows/ folder', () => {
    expect(fs.existsSync(path.join(targetRoot, 'rules'))).toBe(true);
    expect(fs.existsSync(path.join(targetRoot, 'skills'))).toBe(true);
    expect(fs.existsSync(path.join(targetRoot, 'agents'))).toBe(true);
    expect(fs.existsSync(path.join(targetRoot, 'workflows'))).toBe(false);
  });

  it('generates a rules index and a skills (workflow) index', () => {
    expect(fs.existsSync(path.join(targetRoot, 'rules', 'INDEX.md'))).toBe(true);
    const skillsIndexPath = path.join(targetRoot, 'skills', 'INDEX.md');
    expect(fs.existsSync(skillsIndexPath)).toBe(true);
    const idx = fs.readFileSync(skillsIndexPath, 'utf-8');
    // AG-5: skills index lists only workflow-tagged skills (the workflow-derived one)
    expect(idx).toContain('demo-flow');
  });

  it('emits the workflow as a skill folder with its phase under phases/', () => {
    const skillDoc = path.join(targetRoot, 'skills', 'demo-flow', 'SKILL.md');
    const phaseDoc = path.join(targetRoot, 'skills', 'demo-flow', 'phases', 'demo-flow-step.md');
    expect(fs.existsSync(skillDoc)).toBe(true);
    expect(fs.existsSync(phaseDoc)).toBe(true);

    const skillContent = fs.readFileSync(skillDoc, 'utf-8');
    // FR-COPY-0080: phase reference rewritten to Antigravity's APPLY SKILL FILE form
    expect(skillContent).toContain('APPLY SKILL FILE `phases/demo-flow-step.md`');
    expect(skillContent).not.toContain('APPLY PHASE');
  });

  it('strips phase frontmatter but retains a distinct body (FR-STRUCT-0030: workflow phases contain no YAML frontmatter)', () => {
    const phaseDoc = path.join(targetRoot, 'skills', 'demo-flow', 'phases', 'demo-flow-step.md');
    const phaseContent = fs.readFileSync(phaseDoc, 'utf-8');
    expect(phaseContent).not.toContain('---');
    expect(phaseContent).not.toContain('name: demo-flow-step');
    expect(phaseContent).toContain('Do the step.');
  });

  it('preserves a real (non-workflow) skill under skills/ with its folder structure intact', () => {
    expect(fs.existsSync(path.join(targetRoot, 'skills', 'mytool', 'SKILL.md'))).toBe(true);
  });

  it('reduces agent + skill SKILL.md frontmatter to name+description (FR-COPY-0081)', () => {
    const agentContent = fs.readFileSync(path.join(targetRoot, 'agents', 'myagent.md'), 'utf-8');
    expect(agentContent).toContain('name: myagent');
    expect(agentContent).toContain('description: My agent');
    expect(agentContent).not.toContain('model:');
    expect(agentContent).not.toContain('mode:');
    expect(agentContent).not.toContain('readonly:');

    const skillContent = fs.readFileSync(path.join(targetRoot, 'skills', 'mytool', 'SKILL.md'), 'utf-8');
    expect(skillContent).not.toContain('model:');
    expect(skillContent).not.toContain('baseSchema:');
  });

  it('does NOT reduce rule frontmatter — trigger: and other authored fields survive (FR-VAR-0081)', () => {
    const ruleContent = fs.readFileSync(path.join(targetRoot, 'rules', 'sample-rule.md'), 'utf-8');
    expect(ruleContent).toContain('trigger: always_on');
  });

  it('rewrites subagent_required_model to inherit in generated content (FR-COPY-0082)', () => {
    const agentContent = fs.readFileSync(path.join(targetRoot, 'agents', 'myagent.md'), 'utf-8');
    expect(agentContent).toContain('subagent_required_model="inherit"');
    expect(agentContent).not.toContain('claude-opus-4-8, gpt-5.5-high');
  });

  it('preserves plugin.json and produces no dot-prefixed IDE config folder', () => {
    expect(fs.existsSync(path.join(targetRoot, 'plugin.json'))).toBe(true);
    const entries = fs.readdirSync(targetRoot);
    expect(entries.some((e) => e.startsWith('.'))).toBe(false);
  });

  it('renders hooks.json from the preserved hooks.json.tmpl and emits NO .tmpl anywhere in output', () => {
    // DATA-CFG-0005 / FR-VAR-0083: the preserved hooks.json.tmpl is source-only — the generator
    // renders it to a real hooks.json and the .tmpl itself must never reach the output, for
    // core-antigravity same as every other target.
    expect(fs.existsSync(path.join(targetRoot, 'hooks.json'))).toBe(true);
    expect(fs.existsSync(path.join(targetRoot, 'hooks.json.tmpl'))).toBe(false);

    function listFilesRecursive(dir: string): string[] {
      const out: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listFilesRecursive(full));
        else out.push(full);
      }
      return out;
    }
    const tmplFiles = listFilesRecursive(targetRoot).filter((f) => f.endsWith('.tmpl'));
    expect(tmplFiles, `no .tmpl file may appear in core-antigravity output; found: ${tmplFiles.join(', ')}`).toHaveLength(0);
  });
});
