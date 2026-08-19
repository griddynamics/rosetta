// FR-ARCH-0046, FR-COPY-0021 — claude model-normalization case-specific processor
// Scans for first claude-compatible token (NOT first overall — PARITY-9).

import { normalizeClaude } from '../spec/model-maps.js';
import { extractFrontmatterModelField, applyModelRewrite, removeModelLine } from './file-normalize-models.js';
import { updateFileFrame } from '../frames.js';
import { MODEL_DROP } from '../types.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * fileNormalizeClaudeModels: rewrite frontmatter model: to Claude short-name vocabulary.
 * Scans all comma-split tokens for first claude-compatible one.
 * No model field → unchanged. Binary or null contents → unchanged.
 * FR-ARCH-0059: map/exhaustive sourced from ctx.spec.modelVocabulary — the sole live carrier.
 * Three-state return: normalized string → rewrite; null → frame unchanged (today's no-survivor
 * idiom, raw line ships, FR-PROF-0040); MODEL_DROP → drop the model: line (FR-PROF-0011).
 * FR-ARCH-0046, FR-ARCH-0005
 */
export function fileNormalizeClaudeModels(
  frame: FileProcessingFrame,
  ctx: TargetContext,
): FileProcessingFrame {
  if (frame.isBinary || frame.target_contents === null) return frame;
  const content = frame.target_contents as string;
  const modelField = extractFrontmatterModelField(content);
  if (!modelField) return frame;
  const { map, exhaustive } = ctx.spec.modelVocabulary;
  const normalized = normalizeClaude(modelField, map, exhaustive);
  if (normalized === MODEL_DROP) {
    const newContent = removeModelLine(content);
    if (newContent === content) return frame;
    return updateFileFrame(frame, (draft) => {
      draft.target_contents = newContent;
    });
  }
  if (!normalized) return frame;
  return applyModelRewrite(frame, normalized);
}
