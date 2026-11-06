// FR-CLI-0030/0031 — release+domain resolution & layer bundling
// FR-CUST-0001, FR-CUST-0003.AC3 — customization roots as additional ordered sources
// NFR-0010: uses fast-glob (fast-glob = filesystem traversal; uses micromatch internally) for directory traversal
// FR-CLI-0020: instructionsSource is resolved externally and passed in directly

import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';
import { sortPaths } from './sort.js';
import { sourceLetter } from './customizations.js';

/** One folder of one source: letter A = main source, B.. = customization roots (FR-ARCH-0026). */
export interface LayerDir {
  letter: string;
  dir: string;
}

/** One file found under a layer, in load order. */
export interface LoadedFile {
  letter: string;
  /** Path relative to its layer dir, forward slashes, raw (directives not yet parsed). */
  relPath: string;
  absPath: string;
}

/**
 * Resolve layer directories: letter A (main) first, then B.. per customization root in the given
 * order; within a letter, `folders` (the set's declared folder list) order.
 * Main source: a missing `<root>/<release>/<folder>` throws (FR-SET-0010, unchanged).
 * Customization: a missing `<release>/` or `<folder>/` is skipped (FR-CUST-0003.AC3).
 * FR-CLI-0020/0030/0031, FR-ARCH-0026
 */
export function resolveLayerDirs(
  instructionsSource: string,
  customizationRoots: readonly string[],
  release: string,
  folders: string,
): LayerDir[] {
  const folderList = folders.split(',').map((d) => d.trim()).filter(Boolean);
  const layers: LayerDir[] = [];

  for (const folder of folderList) {
    const dir = path.join(instructionsSource, release, folder);
    if (!fs.existsSync(dir)) {
      throw new Error(`Instruction source not found: ${dir} (release=${release}, domain=${folder})`);
    }
    layers.push({ letter: sourceLetter(0), dir });
  }

  customizationRoots.forEach((root, i) => {
    const letter = sourceLetter(i + 1);
    for (const folder of folderList) {
      const dir = path.join(root, release, folder);
      if (isDirectory(dir)) layers.push({ letter, dir });
    }
  });

  return layers;
}

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * List all files of all layers in load order: layers order, then raw relPath in string order
 * within a layer (FR-ARCH-0026 stable-sort tie-break). Only files below a layer dir are listed,
 * so entries directly under a customization `<root>/<release>/` (e.g. an ignored `.DS_Store`,
 * FR-CUST-0002.AC5) never become VFS files.
 * NFR-0002: sorted (lexicographic, matching Python sorted()).
 * NFR-0010: uses fast-glob instead of hand-rolled recursive readdir.
 */
export function collectSourceFiles(layers: readonly LayerDir[]): LoadedFile[] {
  const loaded: LoadedFile[] = [];

  for (const { letter, dir } of layers) {
    // fast-glob returns paths in arbitrary order; apply stable sort after (NFR-0002, PARITY-5)
    const relPaths = fg.sync('**/*', {
      cwd: dir,
      dot: true,        // include dot-files (e.g. .mcp.json, .DS_Store)
      onlyFiles: true,
      followSymbolicLinks: false,
    });

    for (const relPath of sortPaths(relPaths, (p) => p)) {
      if (path.basename(relPath) === '.DS_Store') continue; // FR-COPY-0010
      loaded.push({
        letter,
        relPath: relPath.replace(/\\/g, '/'),
        absPath: path.join(dir, relPath),
      });
    }
  }

  return loaded;
}
