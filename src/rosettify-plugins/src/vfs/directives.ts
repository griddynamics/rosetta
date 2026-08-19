// FR-ARCH-0020–0024 — FilenameDirective parse and validate

export type DirectiveToken = string;

/**
 * Parse tilde-separated directives from a filename stem.
 * e.g. "file~overwrite~r2-only" → { stem: "file", directives: ["overwrite", "r2-only"] }
 * FR-ARCH-0020: tilde grammar
 */
export interface ParsedFilename {
  cleanName: string;    // filename without directive tokens (for VFS path)
  conditions: Set<DirectiveToken>;
}

const KNOWN_DIRECTIVES = new Set(['overwrite', 'target-only']);

export function parseDirectives(filename: string): ParsedFilename {
  const dotIdx = filename.lastIndexOf('.');
  const ext = dotIdx >= 0 ? filename.slice(dotIdx) : '';
  const stem = dotIdx >= 0 ? filename.slice(0, dotIdx) : filename;

  const parts = stem.split('~');
  const baseStem = parts[0];
  const rawDirectives = parts.slice(1);

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
