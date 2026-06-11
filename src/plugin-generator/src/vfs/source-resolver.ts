// FR-CLI-0030/0031 — release+domain resolution & layer bundling
// NFR-0010: uses fast-glob (fast-glob = filesystem traversal; uses micromatch internally) for directory traversal
// FR-CLI-0020: instructionsSource is resolved externally and passed in directly

import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';
import { sortPaths } from './sort.js';

/**
 * Resolve instruction source directories for a release+domain combination.
 * instructionsSource: absolute path to the instructions root (e.g. /repo/instructions).
 * Returns ordered list of absolute directory paths (left=lower priority, right=higher priority).
 * Left-to-right bundling: same path → concat; FR-ARCH-0042.
 * FR-CLI-0020/0030/0031
 */
export function resolveSourceDirs(instructionsSource: string, release: string, domain: string): string[] {
  const domainList = domain.split(',').map((d) => d.trim()).filter(Boolean);
  const dirs: string[] = [];

  for (const dom of domainList) {
    const dir = path.join(instructionsSource, release, dom);
    if (!fs.existsSync(dir)) {
      throw new Error(`Instruction source not found: ${dir} (release=${release}, domain=${dom})`);
    }
    dirs.push(dir);
  }

  return dirs;
}

/**
 * Given a list of source dirs, list all relative file paths (across all dirs).
 * Returns a map: relative path → ordered list of absolute paths (for bundling).
 * NFR-0002: sorted (lexicographic, matching Python sorted()).
 * NFR-0010: uses fast-glob instead of hand-rolled recursive readdir.
 */
export function collectSourceFiles(
  sourceDirs: string[],
): Map<string, string[]> {
  const fileMap = new Map<string, string[]>();

  for (const dir of sourceDirs) {
    // fast-glob returns paths in arbitrary order; apply stable sort after (NFR-0002, PARITY-5)
    const absolutePaths = fg.sync('**/*', {
      cwd: dir,
      dot: true,        // include dot-files (e.g. .mcp.json, .DS_Store)
      onlyFiles: true,
      followSymbolicLinks: false,
    });

    // Apply stable lexicographic sort matching Python sorted() (NFR-0002, PARITY-5)
    const sorted = sortPaths(absolutePaths, (p) => p);

    for (const relPath of sorted) {
      if (path.basename(relPath) === '.DS_Store') continue; // FR-COPY-0010

      const absPath = path.join(dir, relPath);
      // Normalize to forward slashes (cross-platform)
      const normalizedRel = relPath.replace(/\\/g, '/');
      const existing = fileMap.get(normalizedRel) ?? [];
      existing.push(absPath);
      fileMap.set(normalizedRel, existing);
    }
  }

  return fileMap;
}
