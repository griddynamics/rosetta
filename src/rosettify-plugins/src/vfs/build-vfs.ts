// FR-ARCH-0010/0011/0012 — build flat sorted immutable VFS from filesystem
// NFR-0002: stable lexicographic sort

import path from 'path';
import { type Vfs, type VirtualFile, type SourceFile } from '../types.js';
import { parseDirectives } from './directives.js';
import { resolveLayerDirs, collectSourceFiles } from './source-resolver.js';
import { sortPaths, lexicographicCompare } from './sort.js';

/**
 * Build the immutable VFS for a release+domain.
 * VFS is a sorted, flat list of VirtualFiles, each with ordered SourceFiles.
 * instructionsSource: absolute path to the instructions root (FR-CLI-0020).
 * customizationRoots: absolute roots in CLI order, letters B.. (FR-CUST-0001); default none.
 * Each SourceFile gets the order key `<letter>:<VFS path>:<OrderToken>` (FR-ARCH-0026); the
 * SourceFiles of each VirtualFile are stable-sorted by it BEFORE freezing (FR-ARCH-0013/0014).
 * FR-ARCH-0010/0011/0012/0022/0026
 */
export function buildVfs(
  instructionsSource: string,
  release: string,
  domain: string,
  customizationRoots: readonly string[] = [],
): Vfs {
  const layers = resolveLayerDirs(instructionsSource, customizationRoots, release, domain);
  const loaded = collectSourceFiles(layers);

  const groups = new Map<string, SourceFile[]>();

  // Load order = letter → folder → sorted raw path; Map keeps first-seen order per clean path.
  for (const file of loaded) {
    // Parse directives from filename (FR-ARCH-0020/0021); name the file in any error
    let parsed;
    try {
      parsed = parseDirectives(path.basename(file.relPath));
    } catch (err) {
      throw new Error(`${file.absPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
    const cleanRelPath = path.posix.join(path.posix.dirname(file.relPath), parsed.cleanName);

    const sourceFile: SourceFile = {
      origin: file.absPath,
      order: `${file.letter}:${cleanRelPath}:${parsed.orderToken}`, // FR-ARCH-0026
      conditions: new Set(parsed.conditions),
    };
    const group = groups.get(cleanRelPath);
    if (group) group.push(sourceFile);
    else groups.set(cleanRelPath, [sourceFile]);
  }

  const virtualFiles: VirtualFile[] = [];
  for (const [vfsPath, sourceFiles] of groups) {
    // Stable sort (ES2019) by order key, plain string order (FR-ARCH-0022, FR-ARCH-0026)
    sourceFiles.sort((a, b) => lexicographicCompare(a.order, b.order));
    virtualFiles.push({ path: vfsPath, sourceFiles });
  }

  // Sort by path — NFR-0002, PARITY-5
  const sorted = sortPaths(virtualFiles, (vf) => vf.path);

  // Deep-freeze for immutability (FR-ARCH-0013, FR-ARCH-0014, F-J fix):
  // freeze each SourceFile, each sourceFiles array, each VirtualFile, and the outer array.
  // Processors operate on FileProcessingFrame copies; the VFS itself must not be mutable.
  return Object.freeze(sorted.map((vf) => {
    const frozenSources = Object.freeze(vf.sourceFiles.map((sf) => Object.freeze({ ...sf })));
    return Object.freeze({ path: vf.path, sourceFiles: frozenSources });
  })) as Vfs;
}
