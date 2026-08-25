// FR-ARCH-0046, FR-COPY-0021 — cursor model-normalization case-specific processor
// Uses the FIRST comma-split token by design: frontmatter model order is the multi-vendor
// selection mechanism — authors put the desired Cursor/Copilot model first (FR-ARCH-0046).

import { normalizeCursor } from '../spec/model-maps.js';
import { extractFrontmatterModelField, applyModelRewrite, removeModelLine } from './file-normalize-models.js';
import { updateFileFrame } from '../frames.js';
import { MODEL_DROP } from '../types.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * Rewrites frontmatter `model:` to Cursor vocabulary.
 * Takes the FIRST comma-split token — intentional multi-vendor ordering design (FR-ARCH-0046):
 * authors put the preferred Cursor model first so Cursor/Copilot always use the leading token.
 * Maps Claude tokens via CURSOR_CLAUDE_MAP; strips -effort suffix on gpt tokens.
 * No model field → unchanged. Binary or null contents → unchanged.
 * FR-ARCH-0059: map/exhaustive sourced from ctx.spec.modelVocabulary — the sole live carrier.
 * Three-state return: normalized string → rewrite; null → frame unchanged (today's no-survivor
 * idiom, FR-PROF-0040); MODEL_DROP → drop the model: line (FR-PROF-0011).
 */
export function fileNormalizeCursorModels(
  frame: FileProcessingFrame,
  ctx: TargetContext,
): FileProcessingFrame {
  if (frame.isBinary || frame.target_contents === null) return frame;
  const content = frame.target_contents as string;
  const modelField = extractFrontmatterModelField(content);
  if (!modelField) return frame;
  const { map, exhaustive } = ctx.spec.modelVocabulary;
  const normalized = normalizeCursor(modelField, map, exhaustive);
  if (normalized === MODEL_DROP) {
    const newContent = removeModelLine(content);
    if (newContent === content) return frame;
    return updateFileFrame(frame, (draft) => {
      draft.target_contents = newContent;
    });
  }
  // null → frame unchanged (today's no-survivor idiom: an empty leading token, retained for
  // structural symmetry with other per-vocabulary processors).
  if (!normalized) return frame;
  return applyModelRewrite(frame, normalized);
}
