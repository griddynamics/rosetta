// FR-ARCH-0058 — exact literal substitution over plugin text content
// Generic PluginProcessor factory: the pairs are data supplied at composition time, and the
// returned processor is composed only into the pipelines of the specs that need it — never
// selected by an identity branch inside a shared processor (FR-ARCH-0004, FR-ARCH-0005).

import { updatePluginFrame, baseDocName } from '../frames.js';
import type {
  FileProcessingFrame, GenError, PluginProcessingFrame, PluginProcessor,
} from '../types.js';

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
export interface ReplaceLiteralsOptions {
  /**
   * Basename stem of the document these pairs are expected to correct (e.g. `plugin-files-mode`).
   *
   * A literal pair is keyed on an exact prose string, and substitution SILENTLY NO-OPS when that
   * string is absent — so an upstream reword of the host document leaves the pair dead and ships a
   * stale instruction with no error anywhere. Naming the host document here turns that into a hard
   * failure: if the document IS in this build and no pair matched it, the key has drifted.
   *
   * The check is scoped to the document rather than the whole plugin because plugin sets are
   * sparse — an add-on set that ships no rules/ folder legitimately contains no host document at
   * all, and must not fail for a correction that does not apply to it.
   */
  requiredIn?: string;
  /**
   * A short, stable substring of the passage the pairs correct — the part a reword is unlikely to
   * touch (e.g. `WORKFLOW/COMMAND`, where the volatile part is the glob that follows).
   *
   * Without it, `requiredIn` would fire on any host document that simply never contained the
   * passage — a perfectly valid minimal document. With it, the error means specifically: "the
   * passage IS here, but the exact key no longer matches it", which is the drift being guarded
   * against. Required for the check to run at all.
   */
  driftGuard?: string;
}

export function pluginReplaceLiterals(
  pairs: ReadonlyArray<readonly [string, string]>,
  options: ReplaceLiteralsOptions = {},
): PluginProcessor {
  return function pluginReplaceLiteralsProcessor(
    p: PluginProcessingFrame,
  ): PluginProcessingFrame {
    if (pairs.length === 0) return p;

    const { frames } = p;
    let changed = false;
    let matchedInHost = false;
    let hostCarriesPassage = false;

    const rewrittenFrames = frames.map((frame) => {
      if (frame.isBinary || frame.target_contents === null || frame.verbatim) return frame;

      const original = frame.target_contents as string;
      const isHost = options.requiredIn !== undefined && baseDocName(frame) === options.requiredIn;
      if (isHost && options.driftGuard !== undefined && original.includes(options.driftGuard)) {
        hostCarriesPassage = true;
      }

      let content = original;
      for (const [from, to] of pairs) {
        if (from === to || from.length === 0) continue;
        if (content.includes(from)) {
          if (isHost) matchedInHost = true;
          content = content.split(from).join(to);
        }
      }

      if (content === original) return frame;
      changed = true;
      return { ...frame, target_contents: content } as FileProcessingFrame;
    });

    const errors: GenError[] =
      hostCarriesPassage && !matchedInHost
        ? [{
            target: p.spec.destination,
            file: options.requiredIn,
            message:
              `Literal rewrite pair matched nothing in "${options.requiredIn}", even though that ` +
              `document does contain ${JSON.stringify(options.driftGuard)}. The pair is keyed on ` +
              `the exact string ${JSON.stringify(pairs[0][0])}, which is no longer present — the ` +
              `source document was reworded and the pair has drifted, so a stale instruction ` +
              `would ship silently. Update the pair in spec/targets.ts to match the new wording.`,
            kind: 'hard',
          }]
        : [];

    if (!changed && errors.length === 0) return p;

    return updatePluginFrame(p, (draft) => {
      if (changed) draft.frames = rewrittenFrames as typeof draft.frames;
      if (errors.length > 0) draft.errors = [...draft.errors, ...errors] as typeof draft.errors;
    });
  };
}

