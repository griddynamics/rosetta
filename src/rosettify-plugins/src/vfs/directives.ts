// FR-ARCH-0020–0024 — FilenameDirective parse and validate

import { TARGET_NAMES } from '../spec/target-names.js';

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
  ...Object.values(TARGET_NAMES).map((target) => `${target}-only`),
]);

function isKnownDirective(directive: DirectiveToken): boolean {
  return KNOWN_DIRECTIVES.has(directive);
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
      const allowed = [...KNOWN_DIRECTIVES].join(', ');
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
