// FR-ARCH-0020–0024 — FilenameDirective parse and validate

import { TARGET_FAMILIES, TARGET_FAMILY_KEYS, TARGET_NAME_LIST } from '../spec/target-names.js';

export type DirectiveToken = string;

/**
 * Parse tilde-separated directives from a filename stem.
 * e.g. "file~overwrite~target-claude-only" →
 * { stem: "file", directives: ["overwrite", "target-claude-only"] }
 * FR-ARCH-0020: tilde grammar
 */
export interface ParsedFilename {
  cleanName: string;    // filename without directive tokens (for VFS path)
  conditions: Set<DirectiveToken>;
}

/**
 * The four `-only` namespaces, and why two are enumerated while two are shape-matched.
 *
 * ENUMERATED (a typo is rejected at parse time):
 *   `target-<id>-only`  — <id> is one of the seven closed IDE identities.
 *   `ide-<family>-only` — <family> is one of the closed family keys derived from those identities.
 * Both value sets are known at module load, so listing them turns `target-claud-only` into a loud
 * error instead of a file that silently matches nothing.
 *
 * SHAPE-MATCHED (recognized by form, `<name>` unvalidated):
 *   `set-<name>-only`     — <name> is a plugin-set name declared in plugins.json.
 *   `profile-<name>-only` — <name> is an arbitrary profile name.
 * Neither value set is knowable here. Resolving them would make VFS parsing depend on the
 * plugins.json / profiles directory, which it does not otherwise know about — and both are already
 * validated where they enter the run: an unknown `--profile` and an unparseable plugins.json are
 * both rejected at pre-flight, before any source file is read. A file scoped to a set or profile
 * that is not active is simply excluded (matchesTarget / matchesProfile). The bare forms
 * `set-only` / `profile-only` do not match the pattern and are still rejected as typos.
 *
 * The four prefixes are mutually disjoint, so no token is ambiguous between namespaces.
 */
const KNOWN_DIRECTIVES = new Set([
  'overwrite',
  ...TARGET_NAME_LIST.map((target) => `target-${target}-only`),
  ...TARGET_FAMILY_KEYS.map((family) => `ide-${family}-only`),
]);

const SET_ONLY_PATTERN = /^set-[a-z0-9]+(?:-[a-z0-9]+)*-only$/;
const PROFILE_ONLY_PATTERN = /^profile-[a-z0-9]+(?:-[a-z0-9]+)*-only$/;

function isKnownDirective(directive: DirectiveToken): boolean {
  return (
    KNOWN_DIRECTIVES.has(directive) ||
    SET_ONLY_PATTERN.test(directive) ||
    PROFILE_ONLY_PATTERN.test(directive)
  );
}

export function parseDirectives(filename: string): ParsedFilename {
  const dotIdx = filename.lastIndexOf('.');
  const ext = dotIdx >= 0 ? filename.slice(dotIdx) : '';
  const stem = dotIdx >= 0 ? filename.slice(0, dotIdx) : filename;

  const parts = stem.split('~');
  const baseStem = parts[0];
  const rawDirectives = parts.slice(1);
  if (rawDirectives[rawDirectives.length - 1] === '') rawDirectives.pop();

  for (const directive of rawDirectives) {
    if (!isKnownDirective(directive)) {
      const allowed = [...KNOWN_DIRECTIVES, 'set-<name>-only', 'profile-<name>-only'].join(', ');
      throw new Error(
        `Unknown filename directive "${directive}" in "${filename}". Allowed directives: ${allowed}`,
      );
    }
  }

  const conditions = new Set<DirectiveToken>(rawDirectives);

  return {
    cleanName: baseStem + ext,
    conditions,
  };
}

/**
 * The identity a file's `-only` directives are evaluated against: which IDE target is being built,
 * and which plugin set it is being built for. Passed as one object rather than two positional
 * strings so a caller cannot silently swap them.
 */
export interface TargetMatchContext {
  /** Bare IDE identity — `PluginSpec.name`, never the output folder. */
  target: string;
  /** Plugin-set name — `PluginSpec.set`; null in contexts with no set (unit tests, r2 legacy). */
  set: string | null;
}

/**
 * Check if a file frame passes for a given target and set, applying overwrite/-only logic.
 *
 * `target-<id>-only` matches that exact IDE identity alone; `ide-<family>-only` matches every
 * target of that IDE, so `ide-copilot-only` reaches copilot AND copilot-standalone while
 * `target-copilot-only` reaches only the former. `set-<name>-only` matches only while that set is
 * being built. `profile-<name>-only` is not a target selector at all and is handled by
 * matchesProfile — ignoring it here keeps the namespaces disjoint.
 *
 * Every `-only` token present must be satisfied (AND across tokens), which is what makes
 * `~ide-copilot-only~set-qe-only~` mean "the QE set's Copilot targets".
 * FR-ARCH-0041, FR-ARCH-0020, FR-ARCH-0021, FR-ARCH-0023
 */
export function matchesTarget(
  conditions: Set<DirectiveToken>,
  ctx: TargetMatchContext,
): boolean {
  for (const cond of conditions) {
    if (!cond.endsWith('-only')) continue;

    if (cond.startsWith('profile-')) continue; // matchesProfile's namespace, not ours

    if (cond.startsWith('set-')) {
      const name = cond.slice('set-'.length, -'-only'.length);
      if (name !== ctx.set) return false;
      continue;
    }

    if (cond.startsWith('target-')) {
      const name = cond.slice('target-'.length, -'-only'.length);
      if (name !== ctx.target) return false;
      continue;
    }

    if (cond.startsWith('ide-')) {
      const family = cond.slice('ide-'.length, -'-only'.length);
      const members = TARGET_FAMILIES[family] as readonly string[] | undefined;
      if (!members?.includes(ctx.target)) return false;
      continue;
    }
  }
  return true;
}

/**
 * Check if a file frame passes for the active build profile, applying profile-<name>-only logic.
 * A file carrying a profile-<name>-only token is included only while that profile is active;
 * with no active profile (activeProfile === null), every profile-scoped file is excluded.
 * FR-PROF-0030, FR-PROF-0040
 */
export function matchesProfile(
  conditions: Set<DirectiveToken>,
  activeProfile: string | null,
): boolean {
  for (const cond of conditions) {
    if (cond.endsWith('-only') && cond.startsWith('profile-')) {
      const name = cond.slice('profile-'.length).replace(/-only$/, '');
      if (name !== activeProfile) return false;
    }
  }
  return true;
}
