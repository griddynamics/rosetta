// FR-ARCH-0020–0024 — FilenameDirective parse and validate

import { TARGET_NAME_LIST } from '../spec/target-names.js';

export type DirectiveToken = string;

/**
 * Parse tilde-separated directives from a filename stem.
 * e.g. "file~overwrite~core-claude-only" →
 * { stem: "file", directives: ["overwrite", "core-claude-only"] }
 * FR-ARCH-0020: tilde grammar
 */
export interface ParsedFilename {
  cleanName: string;    // filename without directive tokens (for VFS path)
  conditions: Set<DirectiveToken>;
}

const KNOWN_DIRECTIVES = new Set([
  'overwrite',
  ...TARGET_NAME_LIST.map((target) => `${target}-only`),
]);

/**
 * A profile-scoped token is `profile-<name>-only` (FR-PROF-0030). Unlike `overwrite` and the
 * target-only tokens, its `<name>` is an arbitrary profile name, so the kind is recognized by SHAPE
 * rather than enumerated in KNOWN_DIRECTIVES. `profile-only` (no name) does not match and is
 * therefore still rejected as a typo.
 *
 * The name is deliberately NOT validated against the profiles that exist: a file scoped to a
 * profile that is not active is simply excluded (matchesProfile), and an unknown `--profile` value
 * is rejected at CLI pre-flight before any source file is read. Resolving profiles here would make
 * VFS parsing depend on the profile directory, which it does not otherwise know about.
 */
const PROFILE_ONLY_PATTERN = /^profile-[a-z0-9]+(?:-[a-z0-9]+)*-only$/;

function isKnownDirective(directive: DirectiveToken): boolean {
  return KNOWN_DIRECTIVES.has(directive) || PROFILE_ONLY_PATTERN.test(directive);
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
      const allowed = [...KNOWN_DIRECTIVES, 'profile-<name>-only'].join(', ');
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
 * Check if a file frame passes for a given target, applying overwrite/target-only logic.
 * FR-ARCH-0041, FR-ARCH-0020, FR-ARCH-0021
 */
export function matchesTarget(conditions: Set<DirectiveToken>, targetName: string): boolean {
  // If there's a <target>-only directive, only include for that target
  for (const cond of conditions) {
    if (cond.endsWith('-only')) {
      // FR-PROF-0030: profile-<name>-only is a distinct, namespaced token kind — not a target
      // selector. Ignoring it here keeps the two -only namespaces disjoint.
      if (cond.startsWith('profile-')) continue;
      const target = cond.replace(/-only$/, '');
      if (target !== targetName) return false;
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
