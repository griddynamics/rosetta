// FR-ARCH-0049, FR-COPY-0032 — content-only reference rewrite via frame lookup
// Complete boundary-delimited path token replacement only (FR-ARCH-0037)
// FR-ARCH-0004: no hardcoded target/release/folder names; lookup built entirely from frames + specEntries.

import { updatePluginFrame } from '../frames.js';
import type { FileProcessingFrame, PluginProcessingFrame } from '../types.js';

/**
 * pluginRewriteReferences: build lookup from frames (sourcePath to targetPath, plugin-root-relative)
 * + unambiguous folder pairs from SpecEntry source to target folder mappings.
 * Replace only complete boundary-delimited path tokens (FR-ARCH-0037).
 * Content-only; bootstrap payload gets it too via FR-HOOK-0008.
 * FR-ARCH-0049
 */
export function pluginRewriteReferences(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { frames, spec } = p;

  // Build the full rewrite lookup (FR-ARCH-0049):
  //   1. File-level pairs from frames: (sourcePath to plugin-root-relative targetPath)
  //   2. Unambiguous folder-level pairs: source folder has exactly one plugin-root-relative target
  const renamePairs = buildRenamePairs(frames, spec);

  if (renamePairs.length === 0) return p;

  // Rewrite content in all text frames
  let changed = false;
  const rewrittenFrames = frames.map((frame) => {
    if (frame.isBinary || frame.target_contents === null) return frame;

    const content = frame.target_contents as string;
    const newContent = applyRenamePairs(content, renamePairs);

    if (newContent === content) return frame;
    changed = true;
    return { ...frame, target_contents: newContent } as FileProcessingFrame;
  });

  if (!changed) return p;

  return updatePluginFrame(p, (draft) => {
    draft.frames = rewrittenFrames as typeof draft.frames;
  });
}

/**
 * Apply a set of rename pairs to content string references.
 * Applied longest/most-specific first (FR-ARCH-0049).
 * Only complete boundary-delimited occurrences (FR-ARCH-0037).
 */
export function applyFolderRewrites(
  content: string,
  pairs: Array<[string, string]>,
): string {
  return applyRenamePairs(content, pairs);
}

/**
 * Build the ordered rename pairs for a plugin target.
 * FR-ARCH-0049: pairs come from:
 *   1. File-level pairs: frames whose sourcePath differs from plugin-root-relative target.
 *      Only frames whose target is under the baseSubfolder namespace are included.
 *      Frames placed outside the baseSubfolder (e.g. codex .codex/agents/) are disk-placement
 *      targets, not content-referenced files, and must not generate rewrite pairs.
 *   2. Unambiguous folder-level pairs from SpecEntry source to target folder mappings.
 *      A source folder is "unambiguous" when ALL its specEntries under the baseSubfolder namespace
 *      map to the SAME plugin-root-relative target folder. If a source folder maps to two different
 *      targets (e.g. rules -> instructions AND rules -> rules), no folder pair is emitted.
 *      Entries outside the baseSubfolder namespace are excluded from both mapping and pairs.
 *
 * All paths are stripped of the spec's baseSubfolder prefix to give plugin-root-relative paths,
 * matching how document bodies reference sibling files (relative to plugin root, not output root).
 *
 * FR-ARCH-0004: no literal target/release/folder names; all values come from frame/spec data.
 */
export function buildRenamePairs(
  frames: PluginProcessingFrame['frames'],
  spec: PluginProcessingFrame['spec'],
): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const seen = new Set<string>();
  const base = spec.baseSubfolder; // e.g. '' | '.cursor' | '.github' | '.agents'
  const basePrefix = base ? base + '/' : '';

  // Helper: strip baseSubfolder prefix from a target path to get plugin-root-relative path
  function stripBase(targetPath: string): string {
    if (!base) return targetPath;
    return targetPath.startsWith(basePrefix) ? targetPath.slice(basePrefix.length) : targetPath;
  }

  // Helper: is this target path within the baseSubfolder namespace?
  // When base is empty (''), all targets are in-scope.
  // When base is set (e.g. '.agents'), only targets starting with '.agents/' are in-scope.
  function isInScope(targetPath: string): boolean {
    if (!base) return true;
    return targetPath.startsWith(basePrefix);
  }

  // 1. File-level pairs from frames (FR-ARCH-0049)
  // For every frame whose path changed (sourcePath to plugin-root-relative target).
  // Exclude frames whose target is outside baseSubfolder (disk-placement only, not content refs).
  // Ghost frames (source.length === 0, null content): only emit pair if target stays in the same
  // folder as source. Cross-folder ghost pairs arise when a file is excluded from entry A (folder X)
  // but processed by entry B (folder Y); the real frame from entry B takes precedence for references.
  for (const frame of frames) {
    if (!isInScope(frame.target)) continue;
    const pluginRelTarget = stripBase(frame.target);
    if (pluginRelTarget !== frame.sourcePath) {
      if (frame.source.length === 0 && frame.target_contents === null) {
        // Ghost frame (excluded file, never materialized): only same-folder renames (e.g. .md → .mdc)
        // generate valid pairs. Cross-folder ghost pairs arise when a file is excluded from entry A
        // (folder X) but processed by entry B (folder Y); the real frame from B takes precedence.
        const parentOf = (p: string): string => { const i = p.lastIndexOf('/'); return i >= 0 ? p.slice(0, i + 1) : ''; };
        if (parentOf(pluginRelTarget) !== parentOf(frame.sourcePath)) continue;
      }
      const key = frame.sourcePath + ' ' + pluginRelTarget;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push([frame.sourcePath, pluginRelTarget]);
      }
    }
  }

  // 2. Unambiguous folder-level pairs from SpecEntry source to target (FR-ARCH-0049)
  // Only emit a folder pair when:
  //   - All in-scope specEntries for a source folder agree on a single plugin-root-relative target
  //   - The target folder name differs from the source folder name
  // If a source folder appears in multiple entries with different targets (e.g. rules -> both
  //   instructions AND rules), no folder pair is emitted for that source (ambiguous).
  // Entries whose target is outside the baseSubfolder namespace are excluded.
  const srcToTargets = new Map<string, Set<string>>();
  for (const entry of spec.specEntries) {
    const srcFolder = entry.source.replace(/\/?\*.*$/, '');
    const tgtFolder = entry.target;
    if (!srcFolder || !tgtFolder) continue;
    if (!isInScope(tgtFolder)) continue; // out-of-namespace: disk-placement target, skip
    const pluginRelTarget = stripBase(tgtFolder);
    if (!srcToTargets.has(srcFolder)) {
      srcToTargets.set(srcFolder, new Set());
    }
    srcToTargets.get(srcFolder)!.add(pluginRelTarget);
  }

  for (const [srcFolder, targets] of srcToTargets) {
    if (targets.size !== 1) continue; // ambiguous: multiple distinct targets for this source folder
    const [pluginRelTarget] = targets;
    if (srcFolder === pluginRelTarget) continue; // same name: no rewrite needed

    const key = 'folder:' + srcFolder + '/ ' + pluginRelTarget + '/';
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push([srcFolder + '/', pluginRelTarget + '/']);
    }
  }

  // Sort: longest from-string first (most-specific pair applied first to avoid partial overlaps)
  pairs.sort((a, b) => b[0].length - a[0].length);

  return pairs;
}

/**
 * Apply rename pairs to a content string.
 * Applies longest/most-specific first (pairs must already be sorted).
 * Only complete boundary-delimited path tokens are replaced (FR-ARCH-0037).
 */
function applyRenamePairs(content: string, pairs: Array<[string, string]>): string {
  let result = content;
  for (const [from, to] of pairs) {
    if (from === to) continue; // no-op pair
    if (result.includes(from)) {
      result = rewritePathToken(result, from, to);
    }
  }
  return result;
}

/**
 * Replace complete boundary-delimited occurrences of `from` in content with `to`.
 * Boundaries: string start/end, whitespace, quotes, backticks, parens, brackets, or
 * a preceding path separator `/`. A preceding `-` or alphanumeric is NOT a boundary
 * (so `my-workflows/` must NOT match). FR-ARCH-0037.
 *
 * Negative lookbehind (?<![A-Za-z0-9_-]) ensures the token is not part of a longer word.
 * A preceding `/` IS allowed (e.g. `.windsurf/workflows/` to `.windsurf/commands/`).
 */
function rewritePathToken(content: string, from: string, to: string): string {
  // Escape regex special chars in 'from'
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Negative lookbehind: not preceded by alphanumeric, underscore, or hyphen
  const regex = new RegExp('(?<![A-Za-z0-9_-])' + escaped, 'g');
  return content.replace(regex, to);
}
