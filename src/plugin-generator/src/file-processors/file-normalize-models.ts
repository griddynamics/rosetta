// FR-ARCH-0046, FR-COPY-0020–0022 — shared helpers for per-vocabulary model normalization
// fileNormalizeModels dispatcher DELETED (FR-ARCH-0005); replaced by 4 per-vocabulary processors.

import { updateFileFrame } from '../frames.js';
import { rewriteModelLine } from '../serialize/frontmatter.js';
import type { FileProcessingFrame } from '../types.js';

/**
 * Extract the model field value from a file's frontmatter.
 * Returns null if: no frontmatter, no model line, or not a YAML-frontmatter file.
 * Shared by all 4 per-vocabulary model-normalization processors.
 * FR-ARCH-0046
 */
export function extractFrontmatterModelField(content: string): string | null {
  if (!content.trimStart().startsWith('---')) return null;
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const modelLineMatch = fmMatch[1].match(/^model:\s*(.+)$/m);
  if (!modelLineMatch) return null;
  return modelLineMatch[1].trim();
}

/**
 * Apply a normalized model value to a frame: rewrite the model: line in content
 * and update source[0].frontmatter.model.
 * Returns input frame unchanged when content would not change.
 * FR-ARCH-0046
 */
export function applyModelRewrite(frame: FileProcessingFrame, normalizedModel: string): FileProcessingFrame {
  const content = frame.target_contents as string;
  const newContent = rewriteModelLine(content, normalizedModel);
  if (newContent === content) return frame;
  return updateFileFrame(frame, (draft) => {
    draft.target_contents = newContent;
    if (draft.source[0]?.frontmatter) {
      draft.source[0].frontmatter!.model = normalizedModel;
    }
  });
}

/**
 * Remove the model: line (and model_reasoning_effort: if present) from frontmatter.
 * Used for codex when model field has no gpt-* token.
 * FR-ARCH-0046
 */
export function removeModelLine(content: string): string {
  const fmMatch = content.match(/^(---\n)([\s\S]*?)(\n---)([\s\S]*)$/);
  if (!fmMatch) return content;
  const [, openDelim, yamlBody, closeDelim, rest] = fmMatch;
  const newYaml = yamlBody
    .replace(/^model:\s*.+\n?/m, '')
    .replace(/^model_reasoning_effort:\s*.+\n?/m, '');
  if (newYaml === yamlBody) return content;
  return openDelim + newYaml + closeDelim + rest;
}

/**
 * Rewrite frontmatter model field for codex.
 * When effort is defined: replaces "model: <old>" with "model: <gptModel>\nmodel_reasoning_effort: <effort>".
 * When effort is undefined: replaces "model: <old>" with "model: <gptModel>" only (no effort line).
 * frontmatter.model is NOT updated (two-field replacement, not a single-value rewrite).
 * FR-ARCH-0046
 */
export function rewriteCodexModelFields(content: string, gptModel: string, effort: string | undefined): string {
  const fmMatch = content.match(/^(---\n)([\s\S]*?)(\n---)([\s\S]*)$/);
  if (!fmMatch) return content;
  const [, openDelim, yamlBody, closeDelim, rest] = fmMatch;
  const replacement = effort !== undefined
    ? `$1${gptModel}\nmodel_reasoning_effort: ${effort}`
    : `$1${gptModel}`;
  const newYaml = yamlBody.replace(/^(model:\s*)(.+)$/m, replacement);
  if (newYaml === yamlBody) return content;
  return openDelim + newYaml + closeDelim + rest;
}
