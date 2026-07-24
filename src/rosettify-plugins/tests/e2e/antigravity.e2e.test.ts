/**
 * Antigravity E2E test — runs the generator against the REAL instruction source
 * (`instructions/r3/core`), not the toy sample fixtures (see sample.e2e.test.ts for the
 * generic fixture-driven suite). Exercises Antigravity-specific edge cases end-to-end:
 *
 *   - output structure (no workflows/, no dot-config folder, no .tmpl anywhere)
 *   - plugin.json schema strictness (Antigravity's schema is additionalProperties:false)
 *   - workflow → skill transform for both delimited (backtick) and bare `APPLY PHASE` refs
 *     (FR-COPY-0080), scanned generically across every workflow-derived skill (no hardcoded
 *     skill/phase name list beyond the two concrete workflows named in requirements)
 *   - agent/skill frontmatter reduction vs untouched rule frontmatter (FR-COPY-0081)
 *   - subagent_required_model → inherit, Antigravity-only scope (FR-COPY-0082)
 *   - hooks.json under both deterministic-hooks postures (FR-VAR-0082/0083)
 *   - a cross-skill reference (`USE FLOW ... PHASE ...`) that must NOT be touched by the
 *     workflow-owning-phase rewrite, since it is a different verb form referencing another
 *     skill's phase, not this skill's own.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate } from '../../src/index.js';
import type { ResolvedSources } from '../../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root: go up from tests/e2e/ → tests/ → rosettify-plugins/ → src/ → <repo root>
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function buildSources(outputDir: string): ResolvedSources {
  return {
    instructionsSource: path.join(REPO_ROOT, 'instructions'),
    pluginsSource: path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'plugins'),
    hooksSource: path.join(REPO_ROOT, 'src', 'hooks'),
    outputDir,
  };
}

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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Mirrors the un-rewritten-reference shape fileAntigravityWorkflowToSkill would have replaced:
// `APPLY PHASE <phaseFile>` either backtick/quote-delimited or bare (bounded by the `APPLY PHASE `
// prefix and a non-word right boundary) — used only to assert such a form is ABSENT post-rewrite.
function unrewrittenPhaseRefPattern(phaseFile: string): RegExp {
  const escaped = escapeRegExp(phaseFile);
  return new RegExp(
    'APPLY PHASE\\s+(?:`' + escaped + '`|\'' + escaped + "'|\"" + escaped + '"|' + escaped + '(?![A-Za-z0-9_-]))',
  );
}

let tmpFalse: string;
let outFalse: string; // deterministicHooks: false (matches pre_commit.py / committed plugins/)
let tmpTrue: string;
let outTrue: string; // deterministicHooks: true (hook-content-only assertions)

describe('Antigravity E2E — real instructions/r3/core', () => {
  beforeAll(async () => {
    tmpFalse = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-e2e-false-'));
    outFalse = path.join(tmpFalse, 'output');
    fs.mkdirSync(outFalse, { recursive: true });
    await generate({
      sources: buildSources(outFalse),
      release: 'r3',
      domain: 'core',
      dryRun: false,
      verbose: false,
      deterministicHooks: false,
    });

    tmpTrue = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-e2e-true-'));
    outTrue = path.join(tmpTrue, 'output');
    fs.mkdirSync(outTrue, { recursive: true });
    await generate({
      sources: buildSources(outTrue),
      release: 'r3',
      domain: 'core',
      dryRun: false,
      verbose: false,
      deterministicHooks: true,
    });
  }, 180000);

  afterAll(() => {
    if (tmpFalse) fs.rmSync(tmpFalse, { recursive: true, force: true });
    if (tmpTrue) fs.rmSync(tmpTrue, { recursive: true, force: true });
  });

  const ag = () => path.join(outFalse, 'core-antigravity');

  describe('structure', () => {
    it('plugin.json + hooks.json at root; rules/, skills/, agents/, configure/ present; no workflows/; no dot-config folder; no .tmpl anywhere', () => {
      const root = ag();
      expect(fs.existsSync(path.join(root, 'plugin.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'hooks.json'))).toBe(true);
      for (const dir of ['rules', 'skills', 'agents', 'configure']) {
        expect(fs.existsSync(path.join(root, dir)), `missing ${dir}/`).toBe(true);
      }
      expect(fs.existsSync(path.join(root, 'workflows'))).toBe(false);

      const entries = fs.readdirSync(root);
      expect(entries.some((e) => e.startsWith('.')), 'no dot-prefixed config folder expected').toBe(false);

      const tmplFiles = listFilesRecursive(root).filter((f) => f.endsWith('.tmpl'));
      expect(tmplFiles, `no .tmpl expected; found: ${tmplFiles.join(', ')}`).toHaveLength(0);
    });
  });

  describe('plugin.json schema (Antigravity strict, additionalProperties:false)', () => {
    it('keys are a subset of {$schema, name, description, version} only; name matches /^[a-zA-Z0-9-_]+$/', () => {
      const data = JSON.parse(fs.readFileSync(path.join(ag(), 'plugin.json'), 'utf-8'));
      // `version` is allowed: the release workflow derives each archive name from the manifest's
      // version (`<target>-<version>-<date>.zip`), so the Antigravity manifest carries one too.
      const allowed = new Set(['$schema', 'name', 'description', 'version']);
      for (const key of Object.keys(data)) {
        expect(allowed.has(key), `unexpected key "${key}" in plugin.json`).toBe(true);
      }
      expect(data.name).toMatch(/^[a-zA-Z0-9-_]+$/);
      expect(data.author).toBeUndefined();
      expect(data.homepage).toBeUndefined();
      expect(data.keywords).toBeUndefined();
      expect(data.commands).toBeUndefined();
    });
  });

  describe('workflow → skill transform (FR-COPY-0080)', () => {
    it('init-workspace-flow (source uses delimited `phase.md` refs): SKILL.md + phases/*.md exist, own-phase refs rewritten', () => {
      const skillDoc = path.join(ag(), 'skills', 'init-workspace-flow', 'SKILL.md');
      expect(fs.existsSync(skillDoc)).toBe(true);
      const phasesDir = path.join(ag(), 'skills', 'init-workspace-flow', 'phases');
      expect(fs.existsSync(phasesDir)).toBe(true);
      const phaseFiles = fs.readdirSync(phasesDir);
      expect(phaseFiles.length).toBeGreaterThan(0);

      const content = fs.readFileSync(skillDoc, 'utf-8');
      expect(content).toContain('APPLY SKILL FILE `phases/');
      for (const phaseFile of phaseFiles) {
        expect(content, `${skillDoc} still references own phase ${phaseFile} unrewritten`).not.toMatch(
          unrewrittenPhaseRefPattern(phaseFile),
        );
      }
    });

    it('modernization-flow (source uses BARE `APPLY PHASE x.md` refs, no backticks): rewritten to APPLY SKILL FILE `phases/...`', () => {
      const skillDoc = path.join(ag(), 'skills', 'modernization-flow', 'SKILL.md');
      expect(fs.existsSync(skillDoc)).toBe(true);
      const content = fs.readFileSync(skillDoc, 'utf-8');
      expect(content).toMatch(/APPLY SKILL FILE `phases\/modernization-flow-[a-z]+\.md`/);
      expect(content).not.toMatch(/APPLY PHASE\s+modernization-flow-[a-z]+\.md/);
    });

    it('no workflow-derived skill contains an un-rewritten reference to its OWN phase file (generic scan, all skills)', () => {
      const skillsRoot = path.join(ag(), 'skills');
      const skillDirs = fs
        .readdirSync(skillsRoot, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);

      let workflowDerivedSkillsScanned = 0;
      for (const skillName of skillDirs) {
        const phasesDir = path.join(skillsRoot, skillName, 'phases');
        if (!fs.existsSync(phasesDir)) continue; // not workflow-derived (no phases/ folder)
        workflowDerivedSkillsScanned++;
        const phaseFiles = fs.readdirSync(phasesDir);
        const filesToScan = [
          path.join(skillsRoot, skillName, 'SKILL.md'),
          ...phaseFiles.map((f) => path.join(phasesDir, f)),
        ];
        for (const file of filesToScan) {
          if (!fs.existsSync(file)) continue;
          const text = fs.readFileSync(file, 'utf-8');
          for (const phaseFile of phaseFiles) {
            expect(text, `${file} still references own phase ${phaseFile} unrewritten`).not.toMatch(
              unrewrittenPhaseRefPattern(phaseFile),
            );
          }
        }
      }
      // Sanity: the scan actually covered workflow-derived skills (not a vacuously-passing loop).
      expect(workflowDerivedSkillsScanned).toBeGreaterThan(0);
    });
  });

  describe('frontmatter reduction (FR-COPY-0081)', () => {
    it('agents/engineer.md frontmatter = exactly name+description (no model/mode/readonly/baseSchema)', () => {
      const content = fs.readFileSync(path.join(ag(), 'agents', 'engineer.md'), 'utf-8');
      expect(content).toContain('name: engineer');
      expect(content).toContain('description:');
      expect(content).not.toContain('model:');
      expect(content).not.toContain('mode:');
      expect(content).not.toContain('readonly:');
      expect(content).not.toContain('baseSchema:');
    });

    it('research skill (source had model:) → SKILL.md frontmatter reduced to name+description only', () => {
      const content = fs.readFileSync(path.join(ag(), 'skills', 'research', 'SKILL.md'), 'utf-8');
      expect(content).toContain('name: research');
      expect(content).toContain('description:');
      expect(content).not.toContain('model:');
      expect(content).not.toContain('baseSchema:');
      expect(content).not.toContain('license:');
    });

    it('bootstrap-alwayson rule is NOT reduced — retains its authored trigger: always_on', () => {
      const content = fs.readFileSync(path.join(ag(), 'rules', 'bootstrap-alwayson.md'), 'utf-8');
      expect(content).toContain('trigger: always_on');
    });
  });

  describe('subagent_required_model rewrite (FR-COPY-0082)', () => {
    it('every subagent_required_model in core-antigravity output is "inherit"', () => {
      const allFiles = listFilesRecursive(ag()).filter((f) => f.endsWith('.md'));
      let found = 0;
      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const matches = content.match(/subagent_required_model="[^"]*"/g) ?? [];
        for (const m of matches) {
          found++;
          expect(m, `${file}: unexpected non-inherit value ${m}`).toBe('subagent_required_model="inherit"');
        }
      }
      expect(found, 'expected at least one subagent_required_model occurrence in core-antigravity output').toBeGreaterThan(0);
    });

    it('core-claude output (Antigravity-only scope) still has NON-inherit subagent_required_model values', () => {
      const claudeRoot = path.join(outFalse, 'core-claude');
      const allFiles = listFilesRecursive(claudeRoot).filter((f) => f.endsWith('.md'));
      let nonInheritFound = false;
      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        if (/subagent_required_model="(?!inherit")[^"]+"/.test(content)) {
          nonInheritFound = true;
          break;
        }
      }
      expect(nonInheritFound, 'core-claude should retain non-inherit subagent_required_model values (Antigravity-only rewrite)').toBe(true);
    });
  });

  describe('bootstrap / hooks (FR-VAR-0082/0083)', () => {
    it('deterministic-hooks false: hooks.json has PreInvocation: [], no PreToolUse, no .js bundles, no bootstrap payload', () => {
      const hooksPath = path.join(ag(), 'hooks.json');
      const raw = fs.readFileSync(hooksPath, 'utf-8');
      const data = JSON.parse(raw);
      expect(Array.isArray(data.rosetta?.PreInvocation)).toBe(true);
      expect(data.rosetta.PreInvocation).toEqual([]);
      expect(data.rosetta.PreToolUse).toBeUndefined();
      expect(raw).not.toContain('bootstrap');

      const files = listFilesRecursive(ag());
      expect(files.some((f) => f.endsWith('.js'))).toBe(false);
    });

    it('deterministic-hooks true: PreToolUse dangerous-actions matcher is exactly "run_command|mcp__.*" (bash+MCP only, no file-write tools); no bootstrap payload', () => {
      const hooksPathTrue = path.join(outTrue, 'core-antigravity', 'hooks.json');
      expect(fs.existsSync(hooksPathTrue)).toBe(true);
      const raw = fs.readFileSync(hooksPathTrue, 'utf-8');
      const data = JSON.parse(raw);
      const preToolUse = data.rosetta?.PreToolUse;
      expect(Array.isArray(preToolUse)).toBe(true);

      const dangerousEntry = (preToolUse as Array<{ matcher: string; hooks: Array<{ command?: string }> }>).find(
        (e) => (e.hooks ?? []).some((h) => typeof h.command === 'string' && h.command.includes('dangerous-actions')),
      );
      expect(dangerousEntry, 'dangerous-actions PreToolUse entry not found').toBeDefined();
      expect(dangerousEntry!.matcher).toBe('run_command|mcp__.*');
      expect(dangerousEntry!.matcher).not.toContain('write_to_file');
      expect(dangerousEntry!.matcher).not.toContain('replace_file_content');
      expect(dangerousEntry!.matcher).not.toContain('multi_replace_file_content');

      expect(raw).not.toContain('bootstrap');
    });
  });

  describe('cross-skill reference (large-workspace-handling → init-workspace-flow)', () => {
    it('contains the USE FLOW `init-workspace-flow.md` form, untouched by the workflow-owning-phase rewrite', () => {
      const content = fs.readFileSync(path.join(ag(), 'skills', 'large-workspace-handling', 'SKILL.md'), 'utf-8');
      expect(content).toContain('USE FLOW `init-workspace-flow.md`');
      expect(content).not.toContain('APPLY PHASE `init-workspace-flow-discovery.md`');
      expect(content).not.toContain('APPLY SKILL FILE `phases/init-workspace-flow-discovery.md`');
    });
  });
});
