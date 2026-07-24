// FR-COPY-0082 — Antigravity subagent_required_model → inherit
// Antigravity-only PluginProcessor: composed into coreAntigravity's pipeline only (via
// buildPipeline's extraAfterIndexes param) — no target/IDE branching inside this function.
//
// Rewrites every `subagent_required_model="<any value>"` occurrence, regardless of original
// value, to `subagent_required_model="inherit"`. Scope is "generated content" (FR-COPY-0082),
// so this runs over every non-binary, non-null, non-verbatim frame the whole plugin produced —
// rules, skills, workflow-derived skills, agents, templates — mirroring the verbatim-skip
// convention already used by pluginRewriteReferences (configure/ stays untouched, as for every
// other target). Idempotent: an existing `="inherit"` value is left as `="inherit"`.

import { updatePluginFrame } from '../frames.js';
import type { FileProcessingFrame, PluginProcessingFrame } from '../types.js';

const SUBAGENT_MODEL_RE = /subagent_required_model="[^"]*"/g;

export function pluginAntigravitySubagentModel(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { frames } = p;
  let changed = false;

  const rewrittenFrames = frames.map((frame) => {
    if (frame.isBinary || frame.target_contents === null || frame.verbatim) return frame;

    const content = frame.target_contents as string;
    const newContent = content.replace(SUBAGENT_MODEL_RE, 'subagent_required_model="inherit"');
    if (newContent === content) return frame;

    changed = true;
    return { ...frame, target_contents: newContent } as FileProcessingFrame;
  });

  if (!changed) return p;

  return updatePluginFrame(p, (draft) => {
    draft.frames = rewrittenFrames as typeof draft.frames;
  });
}
