// FR-ARCH-0047, FR-GEN-0001-0004, PARITY-2 — INDEX.md from final paths

import path from 'path';
import { updatePluginFrame } from '../frames.js';
import {
  emitMarkdownIndex,
  resolveDescription,
  type IndexEntry,
} from '../serialize/markdown-index.js';
import { parseFrontmatter } from '../serialize/frontmatter.js';
import { sortPaths } from '../vfs/sort.js';
import type {
  FileProcessingFrame,
  IndexDecl,
  PluginProcessingFrame,
} from '../types.js';

/**
 * pluginGenerateIndexes: for each IndexDecl, build INDEX.md from final paths.
 * Membership: all frames in targetFolder (for rules), or those with exact tag (for workflows).
 * No qualifying members → no index (FR-GEN-0001).
 * FR-ARCH-0047
 */
export function pluginGenerateIndexes(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { spec, frames } = p;
  const additionalFrames: FileProcessingFrame[] = [];

  for (const indexDecl of spec.indexes) {
    const indexFrame = buildIndex(indexDecl, frames, spec.name, spec.baseSubfolder);
    if (indexFrame) {
      additionalFrames.push(indexFrame);
    }
  }

  if (additionalFrames.length === 0) return p;

  return updatePluginFrame(p, (draft) => {
    draft.frames = [...draft.frames, ...additionalFrames] as typeof draft.frames;
  });
}

function buildIndex(
  decl: IndexDecl,
  frames: FileProcessingFrame[],
  specName: string,
  baseSubfolder: string,
): FileProcessingFrame | null {
  const indexPath = `${decl.targetFolder}/INDEX.md`;

  // Collect qualifying frames
  const qualifying = frames.filter((frame) => {
    if (frame.target_contents === null) return false;
    if (frame.isBinary) return false;

    // Must be in the target folder
    if (!frame.target.startsWith(decl.targetFolder + '/')) return false;

    // Must not be the INDEX.md itself
    if (frame.target === indexPath) return false;

    // If requiredTag specified, must have that tag in frontmatter
    if (decl.requiredTag) {
      const content = frame.target_contents as string;
      const parsed = parseFrontmatter(content);
      const fm = parsed.frontmatter ?? {};
      const tags = fm.tags as string[] | undefined;
      if (!Array.isArray(tags) || !tags.includes(decl.requiredTag)) return false;
    }

    return true;
  });

  if (qualifying.length === 0) return null; // FR-GEN-0001

  // Sort by final target path (PARITY-5, NFR-0002)
  const sorted = sortPaths(qualifying, (f) => f.target);

  // Build entries: strip baseSubfolder prefix for plugin-root-relative paths (GT-5)
  // e.g. codex: ".agents/rules/foo.md" → "rules/foo.md" (relative to ".agents/" plugin root)
  // e.g. cursor-standalone: ".cursor/rules/foo.mdc" → "rules/foo.mdc" (relative to ".cursor/" plugin root)
  const subfolderPrefix = baseSubfolder ? baseSubfolder + '/' : '';
  const entries: IndexEntry[] = sorted.map((frame) => {
    const content = frame.target_contents as string;
    const parsed = parseFrontmatter(content);
    const fm = parsed.frontmatter ?? {};
    const description = resolveDescription(fm.description as string | undefined, frame.target, content);

    const pluginRelPath = subfolderPrefix && frame.target.startsWith(subfolderPrefix)
      ? frame.target.slice(subfolderPrefix.length)
      : frame.target;

    return {
      targetPath: pluginRelPath,
      description,
    };
  });

  const indexContent = emitMarkdownIndex(decl.heading, entries);
  if (!indexContent) return null;

  // Create a synthetic frame for the INDEX.md
  const indexFrame: FileProcessingFrame = {
    sourcePath: indexPath, // synthetic; no real source
    target: indexPath,
    isBinary: false,
    target_contents: indexContent,
    source: [],
  };

  return indexFrame;
}
