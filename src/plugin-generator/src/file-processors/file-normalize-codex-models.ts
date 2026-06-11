// FR-ARCH-0046, FR-COPY-0022 — codex model-normalization case-specific processor
// Unique behavior: no gpt token → strip model line; gpt token → two-field rewrite.
// frontmatter.model NOT updated in either branch (field removed or split into two lines).

import { normalizeCodex } from '../spec/model-maps.js';
import {
  extractFrontmatterModelField,
  removeModelLine,
  rewriteCodexModelFields,
} from './file-normalize-models.js';
import { updateFileFrame } from '../frames.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * fileNormalizeCodexModels: rewrite frontmatter model: for codex markdown files.
 * If no gpt-* token found: strip the model: line entirely.
 * If gpt-* token found: replace "model: <old>" with "model: <gpt>\nmodel_reasoning_effort: <effort>".
 * frontmatter.model is NOT updated (field removed or becomes two fields).
 * Binary or null contents → unchanged. No model field → unchanged.
 * FR-ARCH-0046, FR-ARCH-0005
 */
export function fileNormalizeCodexModels(
  frame: FileProcessingFrame,
  _ctx: TargetContext,
): FileProcessingFrame {
  if (frame.isBinary || frame.target_contents === null) return frame;
  const content = frame.target_contents as string;
  const modelField = extractFrontmatterModelField(content);
  if (!modelField) return frame;
  const codexModel = normalizeCodex(modelField);
  if (!codexModel) {
    // No gpt token found → strip the model: line from frontmatter
    const newContent = removeModelLine(content);
    if (newContent === content) return frame;
    return updateFileFrame(frame, (draft) => {
      draft.target_contents = newContent;
      // frontmatter.model NOT updated — field being removed, not rewritten
    });
  }
  // gpt token found → two-field replacement
  const newContent = rewriteCodexModelFields(content, codexModel.model, codexModel.effort);
  if (newContent === content) return frame;
  return updateFileFrame(frame, (draft) => {
    draft.target_contents = newContent;
    // frontmatter.model NOT updated — two-field replacement, not a single value
  });
}
