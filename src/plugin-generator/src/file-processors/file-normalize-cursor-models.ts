// FR-ARCH-0046, FR-COPY-0021 — cursor model-normalization case-specific processor
// Uses the FIRST comma-split token by design: frontmatter model order is the multi-vendor
// selection mechanism — authors put the desired Cursor/Copilot model first (FR-ARCH-0046).

import { normalizeCursor } from '../spec/model-maps.js';
import { extractFrontmatterModelField, applyModelRewrite } from './file-normalize-models.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * Rewrites frontmatter `model:` to Cursor vocabulary.
 * Takes the FIRST comma-split token — intentional multi-vendor ordering design (FR-ARCH-0046):
 * authors put the preferred Cursor model first so Cursor/Copilot always use the leading token.
 * Maps Claude tokens via CURSOR_CLAUDE_MAP; strips -effort suffix on gpt tokens.
 * No model field → unchanged. Binary or null contents → unchanged.
 */
export function fileNormalizeCursorModels(
  frame: FileProcessingFrame,
  _ctx: TargetContext,
): FileProcessingFrame {
  if (frame.isBinary || frame.target_contents === null) return frame;
  const modelField = extractFrontmatterModelField(frame.target_contents as string);
  if (!modelField) return frame;
  const normalized = normalizeCursor(modelField);
  // normalizeCursor returns non-null for any non-empty input; guard is unreachable
  // but retained for structural symmetry with other per-vocabulary processors
  if (!normalized) return frame;
  return applyModelRewrite(frame, normalized);
}
