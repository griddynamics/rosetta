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
 * FR-ARCH-0041
 */
export function matchesTarget(conditions: Set<DirectiveToken>, targetName: string): boolean {
  // If there's a <target>-only directive, only include for that target
  for (const cond of conditions) {
    if (cond.endsWith('-only')) {
      const target = cond.replace(/-only$/, '');
      if (target !== targetName) return false;
    }
  }
  return true;
}
