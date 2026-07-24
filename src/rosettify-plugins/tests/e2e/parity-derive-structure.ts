/**
 * Structural-parity expected-path derivation (NFR-0001).
 *
 * Given the ACTUAL instruction source folder (`instructions/<release>/<domain>`) and the
 * committed preserved-file sources (`src/rosettify-plugins/plugins/<target>/`), this module
 * enumerates the SET OF OUTPUT FILE PATHS each target is expected to produce, by applying that
 * target's documented mapping contract.
 *
 * This is an INDEPENDENT restatement of the mapping rules taken from the requirements docs
 * (STRUCTURES.md, FR-VAR-*, FR-COPY-*, FR-SEED-*) — it is NOT copied from the generator's
 * TypeScript implementation and NOT a hardcoded file list. Because expected paths are derived
 * from the LIVE source tree, adding or removing a skill/workflow/rule/agent in the source
 * changes both the derived-expected set and the generated-actual set identically, so the parity
 * gate keeps passing with no test edits.
 *
 * Contracts encoded (verify against docs/requirements/plugin-generator/):
 *   - Global rule exclusions (FR-COPY-0011): rules/bootstrap.md, rules/mcp-files-mode.md,
 *     rules/local-files-mode.md; and the whole templates/shell-schemas/ tree — which is the
 *     entire templates/ folder, so no templates/ folder appears in any target.
 *   - Preserved-file seeding (FR-SEED-0001 + the STRUCTURES.md `.tmpl` contract): every preserved
 *     file is copied as-is EXCEPT a `*.tmpl`, which is rendered to its sibling minus the suffix;
 *     the `.tmpl` itself never appears in output.
 *   - Folder / file renames (FR-COPY-0030/0031), alternate-name hook copies (FR-VAR-0031),
 *     Codex `.agents/` relocation + TOML subagents (FR-VAR-0040/0041), standalone IDE-rooted
 *     layouts (FR-VAR-0050/0051), and Antigravity workflow→skill mapping (FR-VAR-0081,
 *     FR-COPY-0080).
 *   - deterministicHooks:false ⇒ NO `*.js` hook bundles are expected (so none are derived).
 *
 * PATHS/STRUCTURE ONLY — this module never reads or compares file CONTENT.
 */
import fs from 'fs';
import path from 'path';

export const TARGETS = [
  'core-claude',
  'core-cursor',
  'core-copilot',
  'core-codex',
  'core-cursor-standalone',
  'core-copilot-standalone',
  'core-antigravity',
] as const;

export type Target = (typeof TARGETS)[number];

// FR-COPY-0011: legacy MCP-mode / bootstrap rule files never emitted to any target.
const RULES_EXCLUDES = new Set(['bootstrap.md', 'mcp-files-mode.md', 'local-files-mode.md']);

/** Direct child files of a folder (one level), sorted, OS-artifact filtered. */
function listTopFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name !== '.DS_Store')
    .map((e) => e.name)
    .sort();
}

/** All files under a folder as forward-slash paths relative to `base`, OS-artifact filtered. */
function walkRel(dir: string, base: string = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walkRel(full, base);
    if (e.name === '.DS_Store') return [];
    return [path.relative(base, full).split(path.sep).join('/')];
  });
}

/**
 * Preserved output paths for a target: every preserved file under plugins/<target>/, with each
 * `*.tmpl` mapped to its rendered sibling (suffix dropped). deterministicHooks:false ⇒ the
 * committed sources carry no `*.js`, so none are added.
 */
function preservedOutputs(pluginsDir: string, target: string): string[] {
  return walkRel(path.join(pluginsDir, target))
    .map((p) => (p.endsWith('.tmpl') ? p.slice(0, -'.tmpl'.length) : p));
}

/** True if a rule's frontmatter declares `applyTo: "**"` — the auto-loaded bootstrap instructions
 *  that Copilot-standalone relocates to `.github/instructions/*.instructions.md` (STRUCTURES.md). */
function isAutoLoadedBootstrapRule(coreDir: string, ruleStem: string): boolean {
  const text = fs.readFileSync(path.join(coreDir, 'rules', `${ruleStem}.md`), 'utf-8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return fm ? /^applyTo:\s*"\*\*"\s*$/m.test(fm[1]) : false;
}

/**
 * Antigravity workflow→skill root: the shortest workflow stem that is a prefix (on a `-` boundary)
 * of the given stem. The root workflow becomes skills/<root>/SKILL.md; every non-root workflow
 * that shares that root becomes skills/<root>/phases/<stem>.md (FR-VAR-0081, FR-COPY-0080).
 */
function workflowRoot(stem: string, allStems: string[]): string {
  let best: string | null = null;
  for (const r of allStems) {
    if (stem === r || stem.startsWith(`${r}-`)) {
      if (best === null || r.length < best.length) best = r;
    }
  }
  return best ?? stem;
}

/**
 * Enumerate the expected set of output-relative file paths for a target, from the live source
 * folder `coreDir` (= instructions/<release>/<domain>) and preserved sources under `pluginsDir`.
 */
export function deriveExpectedPaths(target: Target, coreDir: string, pluginsDir: string): Set<string> {
  const ruleStems = listTopFiles(path.join(coreDir, 'rules'))
    .filter((f) => f.endsWith('.md') && !RULES_EXCLUDES.has(f))
    .map((f) => f.replace(/\.md$/, ''));
  const workflows = listTopFiles(path.join(coreDir, 'workflows')).filter((f) => f.endsWith('.md'));
  const workflowStems = workflows.map((f) => f.replace(/\.md$/, ''));
  const agents = listTopFiles(path.join(coreDir, 'agents')).filter((f) => f.endsWith('.md'));
  const agentStems = agents.map((f) => f.replace(/\.md$/, ''));
  // Skill folders and configure/ pass through with their full relative layout, for every target.
  const skillFiles = walkRel(path.join(coreDir, 'skills')).map((p) => `skills/${p}`);
  const configureFiles = walkRel(path.join(coreDir, 'configure')).map((p) => `configure/${p}`);
  // templates/ is entirely templates/shell-schemas/** ⇒ fully excluded ⇒ no templates/ folder.

  const out = new Set<string>();
  // Single-argument on purpose: used both directly and as `arr.forEach(add)`, where forEach passes
  // (item, index, array) — extra args are ignored, only the path is added.
  const add = (p: string): void => {
    out.add(p);
  };

  switch (target) {
    // FR-VAR-0010: native folder names; rules+workflows indexes; hooks/hooks.json rendered.
    case 'core-claude': {
      ruleStems.forEach((x) => add(`rules/${x}.md`));
      add('rules/INDEX.md');
      workflows.forEach((w) => add(`workflows/${w}`));
      add('workflows/INDEX.md');
      agents.forEach((a) => add(`agents/${a}`));
      skillFiles.forEach(add);
      configureFiles.forEach(add);
      preservedOutputs(pluginsDir, 'core-claude').forEach(add); // .claude-plugin/plugin.json + hooks/hooks.json
      break;
    }
    // FR-VAR-0020: rules→.mdc, workflows→commands; two rendered hook forms preserved.
    case 'core-cursor': {
      ruleStems.forEach((x) => add(`rules/${x}.mdc`));
      add('rules/INDEX.md');
      workflows.forEach((w) => add(`commands/${w}`));
      add('commands/INDEX.md');
      agents.forEach((a) => add(`agents/${a}`));
      skillFiles.forEach(add);
      configureFiles.forEach(add);
      preservedOutputs(pluginsDir, 'core-cursor').forEach(add); // .cursor-plugin/plugin.json + hooks.json + hooks/hooks.json
      break;
    }
    // FR-VAR-0030/0031: agents→*.agent.md, workflows→commands; root hooks.json is an
    // alternate-name copy of .github/plugin/hooks.json.
    case 'core-copilot': {
      ruleStems.forEach((x) => add(`rules/${x}.md`));
      add('rules/INDEX.md');
      workflows.forEach((w) => add(`commands/${w}`));
      add('commands/INDEX.md');
      agentStems.forEach((a) => add(`agents/${a}.agent.md`));
      skillFiles.forEach(add);
      configureFiles.forEach(add);
      preservedOutputs(pluginsDir, 'core-copilot').forEach(add); // .github/plugin/{plugin.json,hooks.json} + hooks/hooks.json
      add('hooks.json'); // FR-VAR-0031 alternate-name copy of .github/plugin/hooks.json
      break;
    }
    // FR-VAR-0040/0041: instruction folders under .agents/; agents→.codex/agents/*.toml;
    // hook config mirrored to .codex/hooks.json.
    case 'core-codex': {
      ruleStems.forEach((x) => add(`.agents/rules/${x}.md`));
      add('.agents/rules/INDEX.md');
      workflows.forEach((w) => add(`.agents/workflows/${w}`));
      add('.agents/workflows/INDEX.md');
      skillFiles.forEach((f) => add(`.agents/${f}`));
      configureFiles.forEach((f) => add(`.agents/${f}`));
      agentStems.forEach((a) => add(`.codex/agents/${a}.toml`));
      preservedOutputs(pluginsDir, 'core-codex').forEach(add); // .codex-plugin/{plugin.json,hooks.json}
      add('.codex/hooks.json'); // mirror of .codex-plugin/hooks.json
      break;
    }
    // FR-VAR-0050: everything under .cursor/; bootstrap stays as native .mdc rules; generated
    // plugin.json at root; standalone-form .cursor/hooks.json.
    case 'core-cursor-standalone': {
      add('plugin.json');
      ruleStems.forEach((x) => add(`.cursor/rules/${x}.mdc`));
      add('.cursor/rules/INDEX.md');
      workflows.forEach((w) => add(`.cursor/commands/${w}`));
      add('.cursor/commands/INDEX.md');
      agents.forEach((a) => add(`.cursor/agents/${a}`));
      skillFiles.forEach((f) => add(`.cursor/${f}`));
      configureFiles.forEach((f) => add(`.cursor/${f}`));
      add('.cursor/hooks.json');
      break;
    }
    // FR-VAR-0051: everything under .github/; auto-loaded (applyTo "**") bootstrap rules relocate
    // to instructions/*.instructions.md; remaining rules stay in rules/; workflows→prompts/*.prompt.md.
    case 'core-copilot-standalone': {
      add('plugin.json');
      const bootstrapStems = ruleStems.filter((x) => isAutoLoadedBootstrapRule(coreDir, x));
      const remainingStems = ruleStems.filter((x) => !bootstrapStems.includes(x));
      bootstrapStems.forEach((x) => add(`.github/instructions/${x}.instructions.md`));
      remainingStems.forEach((x) => add(`.github/rules/${x}.md`));
      add('.github/rules/INDEX.md');
      workflows.forEach((w) => add(`.github/prompts/${w.replace(/\.md$/, '.prompt.md')}`));
      add('.github/prompts/INDEX.md');
      agentStems.forEach((a) => add(`.github/agents/${a}.agent.md`));
      skillFiles.forEach((f) => add(`.github/${f}`));
      configureFiles.forEach((f) => add(`.github/${f}`));
      add('.github/hooks/hooks.json');
      break;
    }
    // FR-VAR-0080/0081, FR-COPY-0080: root plugin.json + rendered hooks.json; rules/ (rules+templates)
    // with index; source skills pass through; each workflow→skills/<root>/SKILL.md (+ phases/);
    // agents/ (frontmatter reduced, path unchanged); skills index; no workflows/ folder.
    case 'core-antigravity': {
      add('plugin.json');
      add('hooks.json');
      ruleStems.forEach((x) => add(`rules/${x}.md`));
      add('rules/INDEX.md');
      agents.forEach((a) => add(`agents/${a}`));
      configureFiles.forEach(add);
      skillFiles.forEach(add); // source skills pass through
      for (const stem of workflowStems) {
        const root = workflowRoot(stem, workflowStems);
        if (stem === root) add(`skills/${root}/SKILL.md`);
        else add(`skills/${root}/phases/${stem}.md`);
      }
      add('skills/INDEX.md');
      break;
    }
  }

  return out;
}

/** All files under `dir` as forward-slash paths relative to `dir` (structure only). */
export function listGeneratedPaths(dir: string): Set<string> {
  return new Set(walkRel(dir));
}
