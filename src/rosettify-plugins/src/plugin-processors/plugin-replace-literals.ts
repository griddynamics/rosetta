// FR-ARCH-0058 — exact literal substitution over plugin text content
// Generic PluginProcessor factory: the pairs are data supplied at composition time, and the
// returned processor is composed only into the pipelines of the specs that need it — never
// selected by an identity branch inside a shared processor (FR-ARCH-0004, FR-ARCH-0005).

import { updatePluginFrame } from '../frames.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginProcessor } from '../types.js';

/**
 * pluginReplaceLiterals: replace exact literal strings in every text frame's content.
 *
 * Deliberately NOT path-token rewriting. `pluginRewriteReferences` (FR-ARCH-0049) matches
 * complete boundary-delimited PATH tokens with negative lookbehinds, which is right for
 * references to files that moved. This processor targets PROSE and glob-documentation strings,
 * where the correct semantics are plain substring substitution: no boundary rules, no regex,
 * no escaping. Callers make a pair unambiguous by choosing a long enough literal.
 *
 * Motivating case: a restructuring mapping such as `workflows/<name>.md` →
 * `skills/<name>/SKILL.md` deliberately emits no folder-level rewrite pair (FR-ARCH-0049), and
 * per-document pairs do not apply to a glob string, so a doc line like
 * `` WORKFLOW/COMMAND `workflows/*.md` `` would otherwise keep naming a layout that no longer
 * exists for that target.
 *
 * Skipped frames: binary, null-content, and `verbatim` (configure entries), matching the skip
 * set used by `pluginRewriteReferences` and `pluginAntigravityReduceFrontmatter`.
 *
 * Ordering: composed via `buildPipeline`'s `extraAfterIndexes`, so it runs after
 * `pluginGenerateIndexes` and before the bootstrap assembler. The assembler reads document
 * bodies out of `frames`, so hook payloads inherit these substitutions without a second pass.
 *
 * FR-ARCH-0058
 */
export function pluginReplaceLiterals(
  pairs: ReadonlyArray<readonly [string, string]>,
): PluginProcessor {
  return function pluginReplaceLiteralsProcessor(
    p: PluginProcessingFrame,
  ): PluginProcessingFrame {
    if (pairs.length === 0) return p;

    const { frames } = p;
    let changed = false;

    const rewrittenFrames = frames.map((frame) => {
      if (frame.isBinary || frame.target_contents === null || frame.verbatim) return frame;

      const original = frame.target_contents as string;
      let content = original;
      for (const [from, to] of pairs) {
        if (from === to || from.length === 0) continue;
        if (content.includes(from)) content = content.split(from).join(to);
      }

      if (content === original) return frame;
      changed = true;
      return { ...frame, target_contents: content } as FileProcessingFrame;
    });

    if (!changed) return p;

    return updatePluginFrame(p, (draft) => {
      draft.frames = rewrittenFrames as typeof draft.frames;
    });
  };
}
