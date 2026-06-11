// FR-ARCH-0054 — glob→frames→file pipeline for SpecEntries
// NFR-0010: uses micromatch (fast-glob dependency) for in-memory VFS glob matching

import path from 'path';
import micromatch from 'micromatch';
import { updatePluginFrame, createFileFrame } from '../frames.js';
import { sortPaths } from '../vfs/sort.js';
import { getLogger } from '../logging.js';
import type {
  FileProcessingFrame,
  PluginProcessingFrame,
  SpecEntry,
  TargetContext,
} from '../types.js';

/**
 * pluginProcessSpecEntries: for each SpecEntry in order →
 *   glob source pattern over VFS → skip exclude paths → frame → run processors → collect.
 * FR-ARCH-0054
 */
export function pluginProcessSpecEntries(
  release: import('../types.js').ReleaseDescriptor,
): (p: PluginProcessingFrame) => PluginProcessingFrame {
  return function pluginProcessSpecEntriesProcessor(
    p: PluginProcessingFrame,
  ): PluginProcessingFrame {
    const { spec, vfs } = p;
    const allFrames: FileProcessingFrame[] = [];

    const ctx: TargetContext = {
      spec,
      vfs,
      release,
    };

    const logger = getLogger();

    for (const entry of spec.specEntries) {
      // Match VFS paths against the entry source pattern (glob-style)
      const matchedPaths = matchVfsGlob(vfs.map((vf) => vf.path), entry.source);

      // Sort matched paths for deterministic order (PARITY-5, NFR-0002)
      const sortedPaths = sortPaths(matchedPaths, (p) => p);

      for (const vfsPath of sortedPaths) {
        // Check excludes (supports exact match, folder prefix, and glob patterns ending in /**)
        // FR-COPY-0011, GT-8: 'templates/shell-schemas/**' matches all files under that folder
        const isExcludedFile = entry.exclude.some((ex) => isExcluded(vfsPath, ex));

        const vf = vfs.find((v) => v.path === vfsPath);
        if (!vf) continue;

        // Determine target path: join entry.target with the file name relative to entry.source
        const targetPath = computeTargetPath(entry.source, entry.target, vfsPath);

        if (isExcludedFile) {
          // FR-ARCH-0049: for excluded files, run ALL processors on a null-content ghost frame.
          // fileRead is a no-op on empty source (source.length === 0 → immediate return).
          // Only fileRename changes the target; content processors are no-ops on null content.
          // buildRenamePairs filters ghost frame pairs by folder to avoid cross-folder ghost pairs.
          // pluginWrite skips null-content frames (no file emitted).
          let ghostFrame: FileProcessingFrame = {
            sourcePath: vfsPath,
            target: targetPath,
            isBinary: false,
            target_contents: null,
            source: [],
          };
          for (const processor of entry.processors) {
            ghostFrame = processor(ghostFrame, ctx);
          }
          if (ghostFrame.target !== vfsPath) {
            allFrames.push(ghostFrame);
          }
          logger.debug({ target: spec.name, vfsPath, ghostTarget: ghostFrame.target }, 'FR-ARCH-0049: excluded file ghost frame for reference-rewrite lookup');
          continue;
        }

        // FR-ARCH-0050: log per-VirtualFile processing metadata (path decisions only, no content)
        logger.debug({ target: spec.name, vfsPath, targetPath, sourceCount: vf.sourceFiles.length }, 'FR-ARCH-0050: processing VirtualFile');

        // Create frame
        let frame = createFileFrame(vf, targetPath);

        // Run entry processors — log per-processor input/output metadata at debug level (FR-ARCH-0050)
        for (const processor of entry.processors) {
          const beforeTarget = frame.target;
          const beforeNull = frame.target_contents === null;
          frame = processor(frame, ctx);
          logger.debug({
            target: spec.name,
            vfsPath,
            processor: processor.name || '(anonymous)',
            targetBefore: beforeTarget,
            targetAfter: frame.target,
            droppedBefore: beforeNull,
            droppedAfter: frame.target_contents === null,
          }, 'FR-ARCH-0050: file-processor applied');
        }

        // FR-ARCH-0049: carry frames whose path changed even if target_contents is null,
        // so pluginRewriteReferences can include them in the lookup.
        // Null-content frames with unchanged paths are dropped (no path change = no reference rewrite needed).
        // pluginWrite skips null-content frames (no file emitted).
        const pathChanged = frame.target !== frame.sourcePath;
        if (frame.target_contents !== null || frame.isBinary || pathChanged) {
          allFrames.push(frame);
        }
      }
    }

    // Preserve existing frames (e.g. .tmpl frames from pluginCopy) + add new content frames
    // But deduplicate: if a frame with the same target already exists, the new one wins
    const existingByTarget = new Map(p.frames.map(f => [f.target, f]));
    for (const f of allFrames) {
      existingByTarget.set(f.target, f);
    }
    // Maintain: existing .tmpl frames first, then spec-entry frames
    const existingTmplFrames = p.frames.filter(f => f.target.endsWith('.tmpl'));
    const mergedFrames = [...existingTmplFrames, ...allFrames];

    return updatePluginFrame(p, (draft) => {
      draft.frames = mergedFrames as typeof draft.frames;
    });
  };
}

/**
 * Check if a VFS path matches an exclude pattern.
 * Supports:
 *   - Exact path: 'rules/bootstrap.md'
 *   - Folder prefix: 'rules/bootstrap.md' also matches children via startsWith
 *   - Glob ending in **: 'templates/shell-schemas/**' matches any path under that folder
 * GT-8, FR-COPY-0011
 */
function isExcluded(vfsPath: string, excludePattern: string): boolean {
  // Glob ending with /** → folder prefix match
  if (excludePattern.endsWith('/**')) {
    const folder = excludePattern.slice(0, -3);
    return vfsPath === folder || vfsPath.startsWith(folder + '/');
  }
  // Exact match or folder child match
  return vfsPath === excludePattern || vfsPath.startsWith(excludePattern + '/');
}

/**
 * Match VFS paths against a glob pattern using micromatch (fast-glob's glob engine).
 * Supports: "folder/**", "folder/*.ext", "folder/name.ext"
 * NFR-0010: uses micromatch instead of hand-rolled regex glob.
 * NFR-0002: caller sorts results for determinism.
 */
function matchVfsGlob(paths: string[], pattern: string): string[] {
  return micromatch(paths, pattern, { dot: true });
}

/**
 * Compute the target path from a source pattern, target base, and actual VFS path.
 * Example: source="rules/**", target="rules", vfsPath="rules/bootstrap.md" → "rules/bootstrap.md"
 */
function computeTargetPath(sourcePattern: string, targetBase: string, vfsPath: string): string {
  // Strip the glob part to get the source prefix
  const sourcePrefix = sourcePattern.replace(/\/?\*.*$/, '');

  let relativePart: string;
  if (sourcePrefix && vfsPath.startsWith(sourcePrefix + '/')) {
    relativePart = vfsPath.slice(sourcePrefix.length + 1);
  } else if (sourcePrefix && vfsPath === sourcePrefix) {
    relativePart = path.basename(vfsPath);
  } else {
    relativePart = vfsPath;
  }

  if (targetBase) {
    return `${targetBase}/${relativePart}`;
  }
  return relativePart;
}
