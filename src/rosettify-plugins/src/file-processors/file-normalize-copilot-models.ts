// FR-ARCH-0046, FR-COPY-0021 — copilot model-normalization case-specific processor
// Uses the FIRST comma-split token by design: frontmatter model order is the multi-vendor
// selection mechanism — authors put the desired Cursor/Copilot model first (FR-ARCH-0046).

import { normalizeCopilot } from '../spec/model-maps.js';
import { extractFrontmatterModelField, applyModelRewrite } from './file-normalize-models.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * Rewrites frontmatter `model:` to Copilot display-name vocabulary.
 * Takes the FIRST comma-split token — intentional multi-vendor ordering design (FR-ARCH-0046):
 * authors put the preferred Copilot model first so Cursor/Copilot always use the leading token.
 * Maps to display name (e.g. "Claude Opus 4.6") via COPILOT_CLAUDE_MAP / COPILOT_GPT_MAP.
 * No model field → unchanged. Binary or null contents → unchanged.
 */
export function fileNormalizeCopilotModels(
  frame: FileProcessingFrame,
  _ctx: TargetContext,
): FileProcessingFrame {
  if (frame.isBinary || frame.target_contents === null) return frame;
  const modelField = extractFrontmatterModelField(frame.target_contents as string);
  if (!modelField) return frame;
  const normalized = normalizeCopilot(modelField);
  if (!normalized) return frame;
  return applyModelRewrite(frame, normalized);
}
