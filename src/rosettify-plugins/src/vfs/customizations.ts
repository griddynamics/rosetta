// FR-CUST-0002, FR-CUST-0003, FR-ARCH-0026 — customization root validation + source letters

import fs from 'fs';
import path from 'path';

/** FR-ARCH-0026: more than 25 customization roots is a hard error (letters B..Z). */
export const MAX_CUSTOMIZATION_ROOTS = 25;

/**
 * Source letter for a source index: 0 → 'A' (main instruction source), 1 → 'B' (first
 * customization root) … 25 → 'Z'. FR-ARCH-0026.
 */
export function sourceLetter(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > MAX_CUSTOMIZATION_ROOTS) {
    throw new Error(
      `Source index ${index} out of range: at most ${MAX_CUSTOMIZATION_ROOTS} customization roots are supported`,
    );
  }
  return String.fromCharCode('A'.charCodeAt(0) + index);
}

/**
 * Validate customization roots; returns every violation (empty = ok). Pure inspection, no writes.
 * - FR-ARCH-0026.AC5: count limit.
 * - FR-CUST-0003.AC1-2: each root must be an existing directory.
 * - FR-CUST-0002.AC1-2: ONLY `<root>/<release>/` is inspected; dot-entries (AC5) and entries
 *   directly under `<root>/` (AC4) are ignored; loose files and undeclared folders are errors.
 * - FR-CUST-0003.AC3: a missing `<root>/<release>/` is not an error.
 */
export function validateCustomizationRoots(
  roots: readonly string[],
  release: string,
  declaredFolders: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];

  if (roots.length > MAX_CUSTOMIZATION_ROOTS) {
    errors.push(
      `Too many customization roots: ${roots.length} supplied, the limit is ${MAX_CUSTOMIZATION_ROOTS}`,
    );
  }

  for (const root of roots) {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(root);
    } catch {
      errors.push(`Customization root not found: ${root}`);
      continue;
    }
    if (!stat.isDirectory()) {
      errors.push(`Customization root is not a directory: ${root}`);
      continue;
    }

    const releaseDir = path.join(root, release);
    let releaseStat: fs.Stats;
    try {
      releaseStat = fs.statSync(releaseDir);
    } catch {
      continue; // FR-CUST-0003.AC3: no release directory → contributes nothing
    }
    if (!releaseStat.isDirectory()) continue;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(releaseDir, { withFileTypes: true });
    } catch (err) {
      errors.push(`Customization root cannot be read: ${releaseDir} (${(err as Error).message})`);
      continue;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // FR-CUST-0002.AC5
      const entryPath = path.join(releaseDir, entry.name);
      // Follow symlinks so a linked folder counts as a directory; a dangling link is a violation,
      // never a raw ENOENT out of generate().
      let isDir = entry.isDirectory();
      if (entry.isSymbolicLink()) {
        try {
          isDir = fs.statSync(entryPath).isDirectory();
        } catch {
          errors.push(`Customization root has a broken symlink: ${entryPath}`);
          continue;
        }
      }
      if (!isDir) {
        errors.push(`Customization root has a loose file where a folder is expected: ${entryPath}`);
      } else if (!declaredFolders.has(entry.name)) {
        errors.push(
          `Customization folder is not declared by any plugin set for release ${release}: ${entryPath}`,
        );
      }
    }
  }

  return errors;
}
