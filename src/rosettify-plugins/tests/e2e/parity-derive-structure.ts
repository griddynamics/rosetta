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
 *   - FilenameDirective resolution (NFR-0001 §9, FR-ARCH-0020/0021, FR-PROF-0030): rules/,
 *     workflows/, agents/ top-level source files may carry a tilde-fenced directive segment
 *     (`name~token[~token...]~.ext`). This module independently restates the grammar and the
 *     `<target>-only` / `profile-<name>-only` selection rules (see `splitDirectiveStem` and
 *     `includedForTargetAndProfile` below) — it does NOT import `parseDirectives`/`matchesTarget`/
 *     `matchesProfile` from `src/`, precisely so the oracle can't be defeated by mirroring a bug in
 *     the generator's own directive matcher.
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

/**
 * FilenameDirective grammar — INDEPENDENT restatement (FR-ARCH-0020/0021). A source filename stem
 * is tilde-separated into a leading base-document token followed by zero or more directive tokens,
 * closed by a trailing tilde fence: `name~token[~token...]~.ext`. Splitting the fenced stem on `~`
 * yields a final EMPTY segment (nothing follows the closing tilde) — that empty segment carries no
 * directive and is inert, so it must be dropped rather than treated as a (malformed) token.
 * Example: `coding-flow~profile-lightweight-only~overwrite~.md` → cleanStem `coding-flow`,
 * tokens `['profile-lightweight-only', 'overwrite']`.
 */
function splitDirectiveStem(rawStem: string): { cleanStem: string; tokens: string[] } {
  const parts = rawStem.split('~');
  return { cleanStem: parts[0], tokens: parts.slice(1).filter((t) => t.length > 0) };
}

/**
 * FR-PROF-0030: a `-only` token scopes a file to exactly one of two DISJOINT namespaces that share
 * the same `-only` suffix shape — a TARGET (one of the seven `spec.name` values) or, when prefixed
 * `profile-`, a PROFILE. This restates that distinction independently of the generator's own
 * `matchesTarget`/`matchesProfile`: a `profile-`-prefixed `-only` token is NEVER read as a target
 * selector (so it never accidentally excludes a file for every target), and a bare `-only` token is
 * never read as a profile selector. With no active profile (`activeProfile === null`), a file
 * carrying ANY `profile-*-only` token is excluded outright — every profile-scoped file is inert on
 * an unprofiled run (FR-PROF-0040 regression guard).
 */
function includedForTargetAndProfile(
  tokens: string[],
  target: Target,
  activeProfile: string | null,
): boolean {
  for (const token of tokens) {
    if (!token.endsWith('-only')) continue;
    const scoped = token.slice(0, -'-only'.length);
    if (scoped.startsWith('profile-')) {
      const profileName = scoped.slice('profile-'.length);
      if (profileName !== activeProfile) return false;
    } else if (scoped !== target) {
      return false;
    }
  }
  return true;
}

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
 * Directive-aware top-level `.md` stems for one folder (NFR-0001 §9, FR-PROF-0030): strips the
 * directive segment from each filename (independent restatement, see `splitDirectiveStem` above),
 * drops any file not selected for `target`/`activeProfile` (see `includedForTargetAndProfile`), and
 * COLLAPSES every directive-stripped stem onto its base document — a profile override of `x.md`
 * (e.g. `x~profile-foo-only~overwrite~.md`) contributes the SAME clean stem `x` as the base file,
 * never a second entry, because both collapse into one `Set` key. This is what keeps the Codex /
 * Antigravity workflow→skill ROOT GROUPING correct for a stripped stem: `workflowRoot` sees exactly
 * one `coding-flow` stem, so the light override still groups under `skills/coding-flow/...` rather
 * than being misread as its own (phantom) root or phase.
 */
function directiveAwareStems(
  dir: string,
  target: Target,
  activeProfile: string | null,
  excludeCleanFilenames: Set<string> = new Set(),
): string[] {
  const stems = new Set<string>();
  for (const f of listTopFiles(dir)) {
    if (!f.endsWith('.md')) continue;
    const rawStem = f.slice(0, -'.md'.length);
    const { cleanStem, tokens } = splitDirectiveStem(rawStem);
    if (excludeCleanFilenames.has(`${cleanStem}.md`)) continue;
    if (!includedForTargetAndProfile(tokens, target, activeProfile)) continue;
    stems.add(cleanStem);
  }
  return [...stems].sort();
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
 *
 * `activeProfile` (NFR-0001, FR-PROF-0030) is OPTIONAL and defaults to `null` (no profile) so this
 * remains backward compatible with existing 3-argument call sites: with no active profile every
 * `profile-*-only`-scoped source file is excluded (FR-PROF-0040), matching today's behavior exactly.
 * Passing a profile name makes that profile's directive-scoped files (and only that profile's)
 * eligible, for profile-and-target combo parity (NFR-0001 acceptance criterion 3).
 *
 * NOTE: no `destinationSuffix` parameter is needed here — every path this function returns is
 * relative to a target's OWN output root (e.g. `rules/x.md`), and a profile's `destinationSuffix`
 * only renames that output root itself (handled by the caller, e.g. `outputDir/<target><suffix>`),
 * never any path segment derived below it. Adding it would be a no-op inside this function.
 */
export function deriveExpectedPaths(
  target: Target,
  coreDir: string,
  pluginsDir: string,
  activeProfile: string | null = null,
): Set<string> {
  const ruleStems = directiveAwareStems(path.join(coreDir, 'rules'), target, activeProfile, RULES_EXCLUDES);
  const workflowStems = directiveAwareStems(path.join(coreDir, 'workflows'), target, activeProfile);
  const agentStems = directiveAwareStems(path.join(coreDir, 'agents'), target, activeProfile);
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
      workflowStems.forEach((w) => add(`workflows/${w}.md`));
      add('workflows/INDEX.md');
      agentStems.forEach((a) => add(`agents/${a}.md`));
      skillFiles.forEach(add);
      configureFiles.forEach(add);
      preservedOutputs(pluginsDir, 'core-claude').forEach(add); // .claude-plugin/plugin.json + hooks/hooks.json
      break;
    }
    // FR-VAR-0020: rules→.mdc, workflows→commands; two rendered hook forms preserved.
    case 'core-cursor': {
      ruleStems.forEach((x) => add(`rules/${x}.mdc`));
      add('rules/INDEX.md');
      workflowStems.forEach((w) => add(`commands/${w}.md`));
      add('commands/INDEX.md');
      agentStems.forEach((a) => add(`agents/${a}.md`));
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
      workflowStems.forEach((w) => add(`commands/${w}.md`));
      add('commands/INDEX.md');
      agentStems.forEach((a) => add(`agents/${a}.agent.md`));
      skillFiles.forEach(add);
      configureFiles.forEach(add);
      preservedOutputs(pluginsDir, 'core-copilot').forEach(add); // .github/plugin/{plugin.json,hooks.json} + hooks/hooks.json
      add('hooks.json'); // FR-VAR-0031 alternate-name copy of .github/plugin/hooks.json
      break;
    }
    // FR-VAR-0040/0041/0042, FR-COPY-0080: instruction folders under .agents/; agents→
    // .codex/agents/*.toml; hook config mirrored to .codex/hooks.json. Workflows restructure into
    // skills (same as Antigravity's mapping, target base ".agents/skills" instead of "skills"):
    // each workflow→.agents/skills/<root>/SKILL.md, each owned phase→
    // .agents/skills/<root>/phases/<phase>.md. NO .agents/workflows/ folder or index — the Codex
    // workflows-index declaration was removed; existing absent-document handling omits that entry.
    case 'core-codex': {
      ruleStems.forEach((x) => add(`.agents/rules/${x}.md`));
      add('.agents/rules/INDEX.md');
      for (const stem of workflowStems) {
        const root = workflowRoot(stem, workflowStems);
        if (stem === root) add(`.agents/skills/${root}/SKILL.md`);
        else add(`.agents/skills/${root}/phases/${stem}.md`);
      }
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
      workflowStems.forEach((w) => add(`.cursor/commands/${w}.md`));
      add('.cursor/commands/INDEX.md');
      agentStems.forEach((a) => add(`.cursor/agents/${a}.md`));
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
      workflowStems.forEach((w) => add(`.github/prompts/${w}.prompt.md`));
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
      agentStems.forEach((a) => add(`agents/${a}.md`));
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
