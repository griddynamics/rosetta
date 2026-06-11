// FR-ARCH-0041, FR-ARCH-0024 — drop SourceFiles by overwrite/target-only directive mismatch

import { updateFileFrame } from '../frames.js';
import { matchesTarget } from '../vfs/directives.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * fileApplyOverrides: filter source files by directive conditions.
 * 1. Drop SourceFiles that don't match the current target (via target-only directive).
 * 2. Apply overwrite token: if any remaining SourceFile has conditions.has('overwrite'),
 *    drop all earlier-ordered SourceFiles before the first overwriting one (FR-ARCH-0024).
 *    When the first source changes due to overwrite, update target_contents from the new
 *    first source's _readContent so fileBundle's single-source fast path uses correct content.
 * FR-ARCH-0041
 */
export function fileApplyOverrides(
  frame: FileProcessingFrame,
  ctx: TargetContext,
): FileProcessingFrame {
  const targetName = ctx.spec.name;
  const originalFirstOrigin = frame.source[0]?.origin;

  // Step 1: filter by target-only directive
  const targetFiltered = frame.source.filter((sf) => matchesTarget(sf.conditions, targetName));

  // Step 2: apply overwrite token — find the first SourceFile with overwrite condition,
  // drop all earlier-ordered SourceFiles before it (FR-ARCH-0024).
  // After target-only filtering, source order is preserved (same indices as before filter).
  const firstOverwriteIdx = targetFiltered.findIndex((sf) => sf.conditions.has('overwrite'));
  const filtered = firstOverwriteIdx > 0
    ? targetFiltered.slice(firstOverwriteIdx)
    : targetFiltered;

  if (filtered.length === frame.source.length) return frame;

  const newFirstOrigin = filtered[0]?.origin;
  const firstSourceChanged = newFirstOrigin !== undefined && newFirstOrigin !== originalFirstOrigin;

  return updateFileFrame(frame, (draft) => {
    draft.source = filtered;
    if (filtered.length === 0) {
      // All sources dropped
      draft.target_contents = null;
    } else if (firstSourceChanged && !frame.isBinary) {
      // FR-ARCH-0024: overwrite changed the lead source; update target_contents from new lead.
      // fileBundle uses source.length <= 1 fast-path and keeps target_contents as-is, so we
      // must set it here from the new lead's _readContent (set by fileRead before this processor).
      // If _readContent is not set (unit tests without fileRead), skip (content unchanged).
      const newLeadSf = filtered[0];
      if (newLeadSf._readContent !== undefined) {
        draft.target_contents = newLeadSf._readContent;
      }
    }
  });
}
