// FR-ARCH-0044, FR-VAR-0040 — fileCodexAgentFormat → serialize to TOML

import { updateFileFrame } from '../frames.js';
import { parseFrontmatter } from '../serialize/frontmatter.js';
import { emitCodexToml } from '../serialize/toml.js';
import { normalizeCodex } from '../spec/model-maps.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * fileCodexAgentFormat: convert agent markdown (frontmatter + body) to codex TOML.
 * The target path change (to .toml) is handled by fileRename.
 * This processor only changes target_contents to TOML format.
 * FR-ARCH-0044, FR-VAR-0040, GT-6
 */
export function fileCodexAgentFormat(
  frame: FileProcessingFrame,
  ctx: TargetContext,
): FileProcessingFrame {
  if (frame.isBinary || frame.target_contents === null) return frame;

  const content = frame.target_contents as string;
  const parsed = parseFrontmatter(content);
  const fm = parsed.frontmatter ?? {};

  const name = (fm.name as string) ?? '';
  const description = (fm.description as string) ?? '';
  const modelField = (fm.model as string) ?? '';
  const readonly = (fm.readonly as boolean) === true;

  // Extract gpt model+effort for codex
  const codexModel = modelField ? normalizeCodex(modelField) : null;

  // Body: content after frontmatter (the full markdown body)
  const body = parsed.body;
  // Body starts with \n after frontmatter — trim leading newline for TOML embedding
  const developerInstructions = body.startsWith('\n') ? body.slice(1) : body;
  // Strip trailing newline — the TOML join('\n') adds one before the closing """,
  // so the output becomes: opening"""\n<body>\n""" (exactly one \n before closing """).
  const normalizedBody = developerInstructions.replace(/\n$/, '');

  const toml = emitCodexToml({
    name,
    description,
    developerInstructions: normalizedBody,
    model: codexModel?.model,
    modelReasoningEffort: codexModel?.effort,
    sandboxMode: readonly ? 'read-only' : 'workspace-write',
  });

  return updateFileFrame(frame, (draft) => {
    draft.target_contents = toml;
  });
}
