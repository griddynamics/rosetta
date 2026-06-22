// FR-ARCH-0010/0011/0012 — build flat sorted immutable VFS from filesystem
// NFR-0002: stable lexicographic sort

import path from 'path';
import { type Vfs, type VirtualFile, type SourceFile } from '../types.js';
import { parseDirectives } from './directives.js';
import { resolveSourceDirs, collectSourceFiles } from './source-resolver.js';
import { sortPaths } from './sort.js';

/**
 * Build the immutable VFS for a release+domain.
 * VFS is a sorted, flat list of VirtualFiles, each with ordered SourceFiles.
 * instructionsSource: absolute path to the instructions root (FR-CLI-0020).
 * FR-ARCH-0010/0011/0012
 */
export function buildVfs(instructionsSource: string, release: string, domain: string): Vfs {
  const sourceDirs = resolveSourceDirs(instructionsSource, release, domain);
  const fileMap = collectSourceFiles(sourceDirs);

  const virtualFiles: VirtualFile[] = [];

  for (const [relPath, absolutePaths] of fileMap) {
    // Parse directives from filename (FR-ARCH-0020)
    const parsed = parseDirectives(path.basename(relPath));
    const cleanRelPath = path.join(path.dirname(relPath), parsed.cleanName)
      .replace(/\\/g, '/'); // normalize to forward slashes

    // Build SourceFiles (one per layer)
    const sourceFiles: SourceFile[] = absolutePaths.map((absPath, i) => ({
      origin: absPath,
      order: `${i}`,
      conditions: new Set(parsed.conditions),
    }));

    // Check if there's already a VirtualFile for this cleanRelPath (from directives rename)
    const existing = virtualFiles.find((vf) => vf.path === cleanRelPath);
    if (existing) {
      existing.sourceFiles.push(...sourceFiles);
    } else {
      virtualFiles.push({ path: cleanRelPath, sourceFiles });
    }
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
