// FR-ARCH-0046, FR-COPY-0021 — claude model-normalization case-specific processor
// Scans for first claude-compatible token (NOT first overall — PARITY-9).

import { normalizeClaude } from '../spec/model-maps.js';
import { extractFrontmatterModelField, applyModelRewrite } from './file-normalize-models.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * fileNormalizeClaudeModels: rewrite frontmatter model: to Claude short-name vocabulary.
 * Scans all comma-split tokens for first claude-compatible one.
 * No model field → unchanged. Binary or null contents → unchanged.
 * FR-ARCH-0046, FR-ARCH-0005
 */
export function fileNormalizeClaudeModels(
  frame: FileProcessingFrame,
  _ctx: TargetContext,
): FileProcessingFrame {
  if (frame.isBinary || frame.target_contents === null) return frame;
  const modelField = extractFrontmatterModelField(frame.target_contents as string);
  if (!modelField) return frame;
  const normalized = normalizeClaude(modelField);
  if (!normalized) return frame;
  return applyModelRewrite(frame, normalized);
}
