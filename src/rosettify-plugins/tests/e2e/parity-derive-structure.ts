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
  'claude',
  'cursor',
  'copilot',
  'codex',
  'cursor-standalone',
  'copilot-standalone',
  'antigravity',
] as const;

export type Target = (typeof TARGETS)[number];

/** The IDE family a target belongs to — its preserved-template family and bundle source. */
function familyOf(target: Target): string {
  return target.replace(/-standalone$/, '');
}

/**
 * The parts of a plugin-set declaration this oracle needs. Restated here rather than imported from
 * `src/spec/plugin-sets.ts` for the same reason the directive grammar is restated below: the oracle
 * must not be defeated by mirroring a bug in the code it checks.
 */
export interface SetShape {
  name: string;
  /** Instruction folders layered into the set, in order (left = lower priority). */
  folders: string[];
  /** Preserved-template family: `<template>-<ide>` under the plugins source root. */
  template: string;
  /** Whether the set registers a bootstrap payload. */
  bootstrap: boolean;
  /** Hook modules the set declares (before per-target narrowing). */
  hooks: string[];
}

/**
 * Whether a target emits a hooks.json for this set. Mirrors the shipped rule: a set with no hook
 * modules and no bootstrap ships neither a `hooks/` folder nor a `hooks.json`. The two Cursor forms
 * and Antigravity take no bootstrap payload, so for them only the hook modules count.
 */
function emitsHooks(set: SetShape, target: Target): boolean {
  if (set.hooks.length > 0) return true;
  const takesBootstrap = !['cursor', 'cursor-standalone', 'antigravity', 'copilot-standalone']
    .includes(target);
  return set.bootstrap && takesBootstrap;
}

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
 * FR-PROF-0030, DATA-CFG-0007: a `-only` token scopes a file to exactly one of FOUR disjoint
 * namespaces that share the same `-only` suffix shape, distinguished by prefix:
 *   `target-<id>-only`    — one exact IDE identity
 *   `ide-<family>-only`   — every target of one IDE (so `ide-copilot-only` covers copilot AND
 *                           copilot-standalone, while `target-copilot-only` covers only the former)
 *   `set-<name>-only`     — one plugin set
 *   `profile-<name>-only` — one build profile
 * Every `-only` token present must be satisfied (AND across tokens).
 *
 * This restates the rules independently of the generator's own `matchesTarget`/`matchesProfile`,
 * precisely so the oracle cannot be defeated by mirroring a bug in the generator's matcher. With no
 * active profile, a file carrying ANY `profile-*-only` token is excluded outright (FR-PROF-0040).
 */
function includedForTargetAndProfile(
  tokens: string[],
  target: Target,
  setName: string,
  activeProfile: string | null,
): boolean {
  for (const token of tokens) {
    if (!token.endsWith('-only')) continue;
    const scoped = token.slice(0, -'-only'.length);

    if (scoped.startsWith('profile-')) {
      if (scoped.slice('profile-'.length) !== activeProfile) return false;
    } else if (scoped.startsWith('set-')) {
      if (scoped.slice('set-'.length) !== setName) return false;
    } else if (scoped.startsWith('target-')) {
      if (scoped.slice('target-'.length) !== target) return false;
    } else if (scoped.startsWith('ide-')) {
      if (scoped.slice('ide-'.length) !== familyOf(target)) return false;
    } else {
      // An unrecognized namespace selects nothing — the generator rejects it at parse time.
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

/** The same one level, unioned across every instruction folder the set layers. */
function listTopFilesAcross(sourceDirs: string[], sub: string): string[] {
  return [...new Set(sourceDirs.flatMap((d) => listTopFiles(path.join(d, sub))))].sort();
}

/** A full recursive walk, unioned across every instruction folder the set layers. */
function walkRelAcross(sourceDirs: string[], sub: string): string[] {
  return [...new Set(sourceDirs.flatMap((d) => walkRel(path.join(d, sub))))].sort();
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
  sourceDirs: string[],
  sub: string,
  target: Target,
  setName: string,
  activeProfile: string | null,
  excludeCleanFilenames: Set<string> = new Set(),
): string[] {
  const stems = new Set<string>();
  for (const f of listTopFilesAcross(sourceDirs, sub)) {
    if (!f.endsWith('.md')) continue;
    const rawStem = f.slice(0, -'.md'.length);
    const { cleanStem, tokens } = splitDirectiveStem(rawStem);
    if (excludeCleanFilenames.has(`${cleanStem}.md`)) continue;
    if (!includedForTargetAndProfile(tokens, target, setName, activeProfile)) continue;
    stems.add(cleanStem);
  }
  return [...stems].sort();
}

/**
 * Preserved output paths for a target: every preserved file under plugins/<target>/, with each
 * `*.tmpl` mapped to its rendered sibling (suffix dropped). deterministicHooks:false ⇒ the
 * committed sources carry no `*.js`, so none are added.
 */
function preservedOutputs(
  pluginsDir: string,
  templateDir: string,
  includeHooks: boolean,
): string[] {
  return walkRel(path.join(pluginsDir, templateDir))
    .map((p) => (p.endsWith('.tmpl') ? p.slice(0, -'.tmpl'.length) : p))
    // A set that ships no hooks drops its hooks.json.tmpl frame, so no hooks.json is emitted.
    .filter((p) => includeHooks || !p.endsWith('hooks.json'));
}

/** True if a rule's frontmatter declares `applyTo: "**"` — the auto-loaded bootstrap instructions
 *  that Copilot-standalone relocates to `.github/instructions/*.instructions.md` (STRUCTURES.md). */
function isAutoLoadedBootstrapRule(sourceDirs: string[], ruleStem: string): boolean {
  for (const dir of sourceDirs) {
    const rulesDir = path.join(dir, 'rules');
    // The stem is directive-stripped, so match any filename that collapses onto it.
    const match = listTopFiles(rulesDir)
      .find((f) => f.endsWith('.md') && splitDirectiveStem(f.slice(0, -3)).cleanStem === ruleStem);
    if (!match) continue;
    const text = fs.readFileSync(path.join(rulesDir, match), 'utf-8');
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fm && /^applyTo:\s*"\*\*"\s*$/m.test(fm[1])) return true;
  }
  return false;
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
  set: SetShape,
  sourceDirs: string[],
  pluginsDir: string,
  activeProfile: string | null = null,
): Set<string> {
  const setName = set.name;
  const ruleStems = directiveAwareStems(sourceDirs, 'rules', target, setName, activeProfile, RULES_EXCLUDES);
  const workflowStems = directiveAwareStems(sourceDirs, 'workflows', target, setName, activeProfile);
  const agentStems = directiveAwareStems(sourceDirs, 'agents', target, setName, activeProfile);
  // Skill folders pass through with their full relative layout, for every target.
  const skillFiles = walkRelAcross(sourceDirs, 'skills').map((p) => `skills/${p}`);
  // templates/ is entirely templates/shell-schemas/** ⇒ fully excluded ⇒ no templates/ folder.
  // configure/ no longer exists in the instruction set — its guides live under
  // skills/harness/references/configure/, which arrives via skillFiles above.

  const hooks = emitsHooks(set, target);
  const preserved = (): string[] =>
    preservedOutputs(pluginsDir, `${set.template}-${familyOf(target)}`, hooks);

  const out = new Set<string>();
  // Single-argument on purpose: used both directly and as `arr.forEach(add)`, where forEach passes
  // (item, index, array) — extra args are ignored, only the path is added.
  const add = (p: string): void => {
    out.add(p);
  };

  // D6: no INDEX.md is expected anywhere — every set declares `indexes: []`.
  switch (target) {
    // FR-VAR-0010: native folder names; hooks/hooks.json rendered.
    case 'claude': {
      ruleStems.forEach((x) => add(`rules/${x}.md`));
      workflowStems.forEach((w) => add(`workflows/${w}.md`));
      agentStems.forEach((a) => add(`agents/${a}.md`));
      skillFiles.forEach(add);
      preserved().forEach(add); // .claude-plugin/plugin.json + hooks/hooks.json
      break;
    }
    // FR-VAR-0020: rules→.mdc, workflows→commands; two rendered hook forms preserved.
    case 'cursor': {
      ruleStems.forEach((x) => add(`rules/${x}.mdc`));
      workflowStems.forEach((w) => add(`commands/${w}.md`));
      agentStems.forEach((a) => add(`agents/${a}.md`));
      skillFiles.forEach(add);
      preserved().forEach(add); // .cursor-plugin/plugin.json + hooks.json + hooks/hooks.json
      break;
    }
    // FR-VAR-0030/0031: agents→*.agent.md, workflows→commands; root hooks.json is an
    // alternate-name copy of .github/plugin/hooks.json.
    case 'copilot': {
      ruleStems.forEach((x) => add(`rules/${x}.md`));
      workflowStems.forEach((w) => add(`commands/${w}.md`));
      agentStems.forEach((a) => add(`agents/${a}.agent.md`));
      skillFiles.forEach(add);
      preserved().forEach(add); // .github/plugin/{plugin.json,hooks.json} + hooks/hooks.json
      if (hooks) add('hooks.json'); // FR-VAR-0031 alternate-name copy
      break;
    }
    // FR-VAR-0040/0041/0042, FR-COPY-0080: instruction folders under .agents/; agents→
    // .codex/agents/*.toml; hook config mirrored to .codex/hooks.json.
    case 'codex': {
      ruleStems.forEach((x) => add(`.agents/rules/${x}.md`));
      for (const stem of workflowStems) {
        const root = workflowRoot(stem, workflowStems);
        if (stem === root) add(`.agents/skills/${root}/SKILL.md`);
        else add(`.agents/skills/${root}/phases/${stem}.md`);
      }
      skillFiles.forEach((f) => add(`.agents/${f}`));
      agentStems.forEach((a) => add(`.codex/agents/${a}.toml`));
      preserved().forEach(add); // .codex-plugin/{plugin.json,hooks.json}
      if (hooks) add('.codex/hooks.json'); // mirror of .codex-plugin/hooks.json
      break;
    }
    // FR-VAR-0050: everything under .cursor/; generated plugin.json at root; standalone-form
    // .cursor/hooks.json. Standalones copy NO parent preserved files — only their own manifest
    // and the one template routed via standaloneTemplates.
    case 'cursor-standalone': {
      add('plugin.json');
      ruleStems.forEach((x) => add(`.cursor/rules/${x}.mdc`));
      workflowStems.forEach((w) => add(`.cursor/commands/${w}.md`));
      agentStems.forEach((a) => add(`.cursor/agents/${a}.md`));
      skillFiles.forEach((f) => add(`.cursor/${f}`));
      if (hooks) add('.cursor/hooks.json');
      break;
    }
    // FR-VAR-0051: everything under .github/; auto-loaded (applyTo "**") bootstrap rules relocate
    // to instructions/*.instructions.md; remaining rules stay in rules/; workflows→prompts.
    case 'copilot-standalone': {
      add('plugin.json');
      // `speckit-integration-policy` carries applyTo:"**" but is DELIBERATELY excluded from
      // .github/instructions/ and routed to .github/rules/ instead (the instructions SpecEntry
      // names it in its exclude list), so the auto-loaded test alone does not decide this one.
      const INSTRUCTIONS_EXCLUDED = new Set(['speckit-integration-policy']);
      const bootstrapStems = ruleStems.filter(
        (x) => isAutoLoadedBootstrapRule(sourceDirs, x) && !INSTRUCTIONS_EXCLUDED.has(x),
      );
      const remainingStems = ruleStems.filter((x) => !bootstrapStems.includes(x));
      bootstrapStems.forEach((x) => add(`.github/instructions/${x}.instructions.md`));
      remainingStems.forEach((x) => add(`.github/rules/${x}.md`));
      workflowStems.forEach((w) => add(`.github/prompts/${w}.prompt.md`));
      agentStems.forEach((a) => add(`.github/agents/${a}.agent.md`));
      skillFiles.forEach((f) => add(`.github/${f}`));
      if (hooks) add('.github/hooks/hooks.json');
      break;
    }
    // FR-VAR-0080/0081, FR-COPY-0080: root plugin.json + rendered hooks.json; rules/;
    // source skills pass through; each workflow→skills/<root>/SKILL.md (+ phases/).
    case 'antigravity': {
      add('plugin.json');
      if (hooks) add('hooks.json');
      ruleStems.forEach((x) => add(`rules/${x}.md`));
      agentStems.forEach((a) => add(`agents/${a}.md`));
      skillFiles.forEach(add); // source skills pass through
      for (const stem of workflowStems) {
        const root = workflowRoot(stem, workflowStems);
        if (stem === root) add(`skills/${root}/SKILL.md`);
        else add(`skills/${root}/phases/${stem}.md`);
      }
      break;
    }
  }

  return out;
}

/** All files under `dir` as forward-slash paths relative to `dir` (structure only). */
export function listGeneratedPaths(dir: string): Set<string> {
  return new Set(walkRel(dir));
}
