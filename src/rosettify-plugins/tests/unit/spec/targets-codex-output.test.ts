// FR-VAR-0041, FR-VAR-0042, FR-STRUCT-0010, FR-COPY-0080 — core-codex output shape: workflows
// emit as skills under .agents/skills, Codex model normalization runs on main skill frontmatter,
// rules index + .codex-plugin + .codex/hooks.json mirror are preserved, and NO workflows
// tree/index is emitted (existing absent-document handling omits that payload entry). Runs the
// REAL coreCodex PluginSpec pipeline (buildAllSpecs -> createPluginFrame -> spec.pluginProcessors)
// against a self-contained temp instructions tree, writing to a scratch temp output dir (isolated,
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
// Real preserved core-codex plugin dir ships only .codex-plugin/{plugin.json,hooks.json.tmpl} (read-only use).
const REAL_PLUGINS_ROOT = path.join(__dirname, '..', '..', '..', 'plugins');

const RELEASE: ReleaseDescriptor = { name: 'r1', deterministicHooks: false, displayName: 'R1' };

function writeFile(root: string, relPath: string, content: string): void {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf-8');
}

// Builds a minimal, self-contained instructions tree at <tmp>/r1/core covering rules, a
// workflow with one phase (main doc carries a gpt-* model token so codex normalization is
// positively exercised BEFORE the workflow->skill transform), a real (folder-form) skill, and an
// agent — enough surface to exercise FR-COPY-0080/FR-VAR-0041/0042 together.
function buildInstructionsTree(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-shape-'));
  const base = path.join(tmpDir, 'r1', 'core');

  writeFile(
    base,
    'rules/sample-rule.md',
    '---\nname: sample-rule\ndescription: A sample rule\n---\n\n# Sample Rule\n\nBody text.\n',
  );

  writeFile(
    base,
    'workflows/demo-flow.md',
    '---\nname: demo-flow\ndescription: Demo workflow\ntags: ["workflow"]\nmodel: claude-4.8-opus-high, gpt-5.5-high\n---\n\n' +
      '# Demo Flow\n\n1. APPLY PHASE `demo-flow-step.md`\n',
  );
  writeFile(
    base,
    'workflows/demo-flow-step.md',
    '---\nname: demo-flow-step\ndescription: Demo flow step one\n---\n\n# Step One\n\nDo the step.\n',
  );

  writeFile(
    base,
    'skills/mytool/SKILL.md',
    '---\nname: mytool\ndescription: My tool skill\nbaseSchema: docs/schemas/skill.md\n---\n\n# My Tool\n\nSkill body.\n',
  );

  writeFile(
    base,
    'agents/myagent.md',
    '---\nname: myagent\ndescription: My agent\nmodel: claude-4.8-opus-high, gpt-5.5-high\nreadonly: false\n---\n\n' +
      '# My Agent\n\nspawn: subagent_required_model="claude-opus-4-8, gpt-5.5-high"\n',
  );

  writeFile(
    base,
    'configure/guide.md',
    '---\nname: guide\ndescription: Setup guide\n---\n\n# Guide\n',
  );

  return tmpDir;
}

describe('core-codex — generated output shape (FR-VAR-0041, FR-VAR-0042, FR-STRUCT-0010)', () => {
  let instructionsSource: string;
  let outputDir: string;
  let result: PluginProcessingFrame;
  let targetRoot: string;

  beforeAll(() => {
    instructionsSource = buildInstructionsTree();
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-out-'));

    const vfs = buildVfs(instructionsSource, 'r1', 'core');
    const specs = buildAllSpecs({
      pluginsSource: REAL_PLUGINS_ROOT,
      hooksSource: path.join(outputDir, '__no-hooks-source__'),
      outputDir,
      release: RELEASE,
      dryRun: false,
    });

    const coreCodex = specs.find((s) => s.name === 'core-codex');
    if (!coreCodex) throw new Error('core-codex spec not found in buildAllSpecs() output');

    let frame: PluginProcessingFrame = createPluginFrame(coreCodex, vfs, {
      release: 'r1',
      deterministic_hooks: RELEASE.deterministicHooks,
      bootstrap_hooks: '',
    });
    for (const processor of coreCodex.pluginProcessors) {
      frame = processor(frame);
    }
    result = frame;
    targetRoot = path.join(outputDir, 'core-codex');
  });

  afterAll(() => {
    fs.rmSync(instructionsSource, { recursive: true, force: true });
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it('completes with no hard/soft errors', () => {
    expect(result.errors).toEqual([]);
  });

  it('emits the workflow as a skill folder under .agents/skills with its phase under phases/', () => {
    const skillDoc = path.join(targetRoot, '.agents', 'skills', 'demo-flow', 'SKILL.md');
    const phaseDoc = path.join(targetRoot, '.agents', 'skills', 'demo-flow', 'phases', 'demo-flow-step.md');
    expect(fs.existsSync(skillDoc)).toBe(true);
    expect(fs.existsSync(phaseDoc)).toBe(true);

    const skillContent = fs.readFileSync(skillDoc, 'utf-8');
    // FR-COPY-0080: phase reference rewritten to the shared APPLY SKILL FILE form
    expect(skillContent).toContain('APPLY SKILL FILE `phases/demo-flow-step.md`');
    expect(skillContent).not.toContain('APPLY PHASE');
  });

  it('strips phase frontmatter but retains a distinct body (FR-STRUCT-0030 shared contract)', () => {
    const phaseDoc = path.join(targetRoot, '.agents', 'skills', 'demo-flow', 'phases', 'demo-flow-step.md');
    const phaseContent = fs.readFileSync(phaseDoc, 'utf-8');
    expect(phaseContent).not.toContain('---');
    expect(phaseContent).not.toContain('name: demo-flow-step');
    expect(phaseContent).toContain('Do the step.');
  });

  it('normalizes the main skill model field for Codex (gpt token, two-field split) BEFORE the workflow->skill transform (FR-VAR-0042)', () => {
    const skillDoc = path.join(targetRoot, '.agents', 'skills', 'demo-flow', 'SKILL.md');
    const skillContent = fs.readFileSync(skillDoc, 'utf-8');
    expect(skillContent).toContain('model: gpt-5.5');
    expect(skillContent).toContain('model_reasoning_effort: high');
    expect(skillContent).not.toContain('claude-4.8-opus-high');
  });

  it('main skill retains other frontmatter fields untouched (no Antigravity-style reduction)', () => {
    const skillDoc = path.join(targetRoot, '.agents', 'skills', 'demo-flow', 'SKILL.md');
    const skillContent = fs.readFileSync(skillDoc, 'utf-8');
    expect(skillContent).toContain('name: demo-flow');
    expect(skillContent).toContain('description: Demo workflow');
    expect(skillContent).toContain('tags: ["workflow"]');
  });

  it('preserves a real (non-workflow) skill under .agents/skills/ with its folder structure and non-model fields intact', () => {
    const realSkillDoc = path.join(targetRoot, '.agents', 'skills', 'mytool', 'SKILL.md');
    expect(fs.existsSync(realSkillDoc)).toBe(true);
    const content = fs.readFileSync(realSkillDoc, 'utf-8');
    // baseSchema is untouched by Codex model normalization (which only rewrites model:)
    expect(content).toContain('baseSchema: docs/schemas/skill.md');
  });

  it('emits NO .agents/workflows folder or index anywhere in output (FR-VAR-0041)', () => {
    expect(fs.existsSync(path.join(targetRoot, '.agents', 'workflows'))).toBe(false);

    function listFilesRecursive(dir: string): string[] {
      if (!fs.existsSync(dir)) return [];
      const out: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listFilesRecursive(full));
        else out.push(full);
      }
      return out;
    }
    const allFiles = listFilesRecursive(targetRoot);
    expect(allFiles.some((f) => f.split(path.sep).includes('workflows'))).toBe(false);
    // No skills-folder INDEX.md either — Codex declares only a rules index (FR-VAR-0041).
    expect(fs.existsSync(path.join(targetRoot, '.agents', 'skills', 'INDEX.md'))).toBe(false);
  });

  it('generates a rules index only (FR-VAR-0041)', () => {
    expect(fs.existsSync(path.join(targetRoot, '.agents', 'rules', 'INDEX.md'))).toBe(true);
    const idx = fs.readFileSync(path.join(targetRoot, '.agents', 'rules', 'INDEX.md'), 'utf-8');
    expect(idx).toContain('# Rosetta Rules Index');
  });

  it('preserves .codex-plugin/plugin.json (FR-STRUCT-0010) and it names NO workflows folder/index (FR-VAR-0041 regression guard)', () => {
    const manifestPath = path.join(targetRoot, '.codex-plugin', 'plugin.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = fs.readFileSync(manifestPath, 'utf-8');
    // The preserved config is byte-copied and never passes through pluginRewriteReferences — a
    // stale workflows/INDEX.md pointer in interface.defaultPrompt was found and fixed there
    // (Phase 9). This is the only test surface that can catch a regression of that pointer.
    expect(manifest).not.toContain('workflows/');
    expect(manifest).not.toContain('workflows/INDEX');
    expect(manifest).not.toMatch(/\bworkflows\/INDEX\.md\b/);
  });

  it('mirrors .codex-plugin/hooks.json to .codex/hooks.json with NO "Rosetta Workflows Index" content (FR-VAR-0041)', () => {
    const mirrorPath = path.join(targetRoot, '.codex', 'hooks.json');
    expect(fs.existsSync(mirrorPath)).toBe(true);
    const mirrored = fs.readFileSync(mirrorPath, 'utf-8');
    expect(mirrored).not.toContain('Rosetta Workflows Index');
    // The rendered SessionStart payload must still contain real bootstrap content (not empty).
    expect(mirrored).toContain('SessionStart');
  });

  it('converts the agent to TOML under .codex/agents/ without Antigravity-only subagent_required_model rewrite', () => {
    const agentToml = path.join(targetRoot, '.codex', 'agents', 'myagent.toml');
    expect(fs.existsSync(agentToml)).toBe(true);
    const content = fs.readFileSync(agentToml, 'utf-8');
    // pluginAntigravitySubagentModel is wired only into core-antigravity's pipeline; Codex must
    // retain the original spawn string verbatim (no rewrite to "inherit").
    expect(content).toContain('subagent_required_model="claude-opus-4-8, gpt-5.5-high"');
    expect(content).not.toContain('subagent_required_model="inherit"');
  });

  it('produces no dot-prefixed Antigravity-style plugin.json at the target root (structure stays under .agents/.codex)', () => {
    expect(fs.existsSync(path.join(targetRoot, 'plugin.json'))).toBe(false);
  });
});
