// FR-COPY-0081 — Antigravity frontmatter reduction (agent files + skill SKILL.md only)
// Antigravity-only PluginProcessor: composed into coreAntigravity's pipeline only, AFTER
// pluginGenerateIndexes (composition, FR-ARCH — no target/IDE branching inside this function).
//
// Ordering matters: pluginGenerateIndexes' skills index (FR-VAR-0080, AG-5) selects workflow-
// derived skills by their `tags: ["workflow"]` frontmatter field. Reducing frontmatter to
// name+description drops that field, so reduction MUST run after index generation — otherwise
// every workflow-derived SKILL.md would already have lost its `tags` and the index would find
// zero qualifying members (FR-GEN-0001: no qualifying members → no index at all).

import { updatePluginFrame } from '../frames.js';
import { reduceFrontmatterToNameDescription, parseFrontmatter } from '../serialize/frontmatter.js';
import type { FileProcessingFrame, PluginProcessingFrame } from '../types.js';

/**
 * pluginAntigravityReduceFrontmatter: reduce frontmatter to exactly `name` + `description` for:
 *   - every agent file (final target under `agents/`), and
 *   - every skill `SKILL.md` (final target basename `SKILL.md` — this also covers workflow-
 *     derived skills, whose main doc fileAntigravityWorkflowToSkill has already renamed to
 *     `skills/<name>/SKILL.md`).
 * Left untouched: other skill-folder files (README.md, assets/*, references/*) and phase files
 * (`skills/<name>/phases/*.md`) — the requirement scopes reduction to agent files and SKILL.md
 * only. Rules are never touched by this pass (frontmatter, incl. `trigger:`, preserved as
 * authored — FR-VAR-0081).
 * FR-COPY-0081
 */
export function pluginAntigravityReduceFrontmatter(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { frames } = p;
  let changed = false;

  const rewrittenFrames = frames.map((frame) => {
    if (frame.isBinary || frame.target_contents === null) return frame;

    const basename = frame.target.split('/').pop() ?? '';
    const isAgentFile = frame.target.startsWith('agents/');
    const isSkillDoc = basename === 'SKILL.md';
    if (!isAgentFile && !isSkillDoc) return frame;

    const content = frame.target_contents as string;
    const reduced = reduceFrontmatterToNameDescription(content);
    if (reduced === content) return frame;

    changed = true;
    const newFrontmatter = parseFrontmatter(reduced).frontmatter;
    const newSource = frame.source.length > 0
      ? [{ ...frame.source[0], frontmatter: newFrontmatter }, ...frame.source.slice(1)]
      : frame.source;

    return { ...frame, target_contents: reduced, source: newSource } as FileProcessingFrame;
  });

  if (!changed) return p;

  return updatePluginFrame(p, (draft) => {
    draft.frames = rewrittenFrames as typeof draft.frames;
  });
}
