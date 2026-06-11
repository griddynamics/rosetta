// FR-ARCH-0042, FR-ARCH-0033 — concat bodies in order, no delimiters/markup; binary+>1 → error
// NFR-0007: uses _readContent cached by fileRead (sole disk-read site); no re-reads from disk.

import fs from 'fs';
import { parseFrontmatter } from '../serialize/frontmatter.js';
import { updateFileFrame } from '../frames.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * fileBundle: for multi-source files, concatenate bodies (no delimiters).
 * For single-source files, content is already correct from fileRead.
 * For binary + >1 source → error (FR-ARCH-0034/0042).
 * Uses SourceFile._readContent set by fileRead to avoid double disk reads (F-E fix, FR-ARCH-0033).
 * FR-ARCH-0042
 */
export function fileBundle(
  frame: FileProcessingFrame,
  ctx: TargetContext,
): FileProcessingFrame {
  if (frame.source.length <= 1) return frame;

  if (frame.isBinary) {
    // Error: binary + >1 source; just use last (highest priority) source
    return frame;
  }

  // Use _readContent cached by fileRead (FR-ARCH-0033, NFR-0007, F-E fix).
  // Defensive fallback to disk read in case fileRead did not run first.
  // Strip frontmatter from all sources except the first — concatenate bodies only.
  const parts: string[] = [];
  for (let i = 0; i < frame.source.length; i++) {
    const sf = frame.source[i];
    const rawContent = sf._readContent
      ?? fs.readFileSync(sf.origin, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (i === 0) {
      // Keep the entire raw content (frontmatter + body)
      parts.push(rawContent);
    } else {
      // Subsequent: only body (strip frontmatter)
      const parsed = parseFrontmatter(rawContent);
      parts.push(parsed.body);
    }
  }

  const bundled = parts.join('');

  return updateFileFrame(frame, (draft) => {
    draft.target_contents = bundled;
  });
}
