// FR-ARCH-0041, FR-ARCH-0024 — drop SourceFiles by overwrite/target-only directive mismatch

import { updateFileFrame } from '../frames.js';
import { resolveEffectiveSources } from '../vfs/effective-sources.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * fileApplyOverrides: filter source files by directive conditions.
 * 1. Drop SourceFiles that don't match the current target/set (via the target-/ide-/set-only
 *    directives) OR the
 *    active build profile (via profile-<name>-only directive, FR-PROF-0030). Both filters apply
 *    in this same step, before overwrite truncation, so `overwrite` cannot bypass either exclusion.
 * 2. Apply overwrite token: keep from the LAST surviving overwrite, dropping every earlier
 *    SourceFile (FR-ARCH-0024; shared helper resolveEffectiveSources).
 *    An overwrite with no surviving predecessor is a hard error on the frame (defensive; the
 *    generate pre-flight reports it first, FR-ARCH-0024.AC4/AC6); sources stay untouched then.
 *    When the first source changes due to overwrite, update target_contents from the new
 *    first source's _readContent so fileBundle's single-source fast path uses correct content.
 * FR-ARCH-0041, FR-PROF-0030
 */
export function fileApplyOverrides(
  frame: FileProcessingFrame,
  ctx: TargetContext,
): FileProcessingFrame {
  const matchCtx = { target: ctx.spec.name, set: ctx.spec.set ?? null };
  const originalFirstOrigin = frame.source[0]?.origin;

  const { kept: filtered, orphanOverwrite } = resolveEffectiveSources(
    frame.source, matchCtx, ctx.activeProfile,
  );

  if (orphanOverwrite) {
    // FR-ARCH-0024.AC4/AC6: nothing precedes the overwrite in this build.
    return updateFileFrame(frame, (draft) => {
      draft.errors = [
        ...(draft.errors ?? []),
        {
          target: frame.target,
          file: orphanOverwrite.origin,
          message: `overwrite has no predecessor in build ${ctx.spec.destination}`,
          kind: 'hard' as const,
        },
      ];
    });
  }

  if (filtered.length === frame.source.length) return frame; // FR-ARCH-0014 identity

  const newFirstOrigin = filtered[0]?.origin;
  const firstSourceChanged = newFirstOrigin !== undefined && newFirstOrigin !== originalFirstOrigin;

  return updateFileFrame(frame, (draft) => {
    draft.source = [...filtered];
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
