// FR-ARCH-0048, FR-GEN-0010/0011 — Handlebars render of .tmpl files
// PARITY-7: {{#if}} standalone-block stripping must produce no leftover blank lines for r2

import Handlebars from 'handlebars';
import { updatePluginFrame } from '../frames.js';
import type { FileProcessingFrame, GenError, PluginProcessingFrame } from '../types.js';

/**
 * pluginRenderTemplates: for each .tmpl frame, render via Handlebars → sibling (no .tmpl extension).
 * The .tmpl frame itself is NEVER emitted to output, for any target — main or standalone — it is
 * a source-only artifact; only the rendered sibling (e.g. `hooks.json`) reaches the output tree.
 * Missing template / render error → warn+continue (FR-GEN-0010): the .tmpl frame is still dropped,
 * no sibling is emitted, and a soft error is recorded.
 * Uses {{{raw}}} triple-stache for unescaped bootstrap payloads.
 * FR-ARCH-0048
 */
export function pluginRenderTemplates(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { frames, templateContext } = p;

  // Compile templates and build rendered frames
  const resultFrames: FileProcessingFrame[] = [];
  let changed = false;
  const renderErrors: GenError[] = [];

  for (const frame of frames) {
    if (!frame.target.endsWith('.tmpl')) {
      resultFrames.push(frame);
      continue;
    }

    // .tmpl frame is dropped unconditionally — never pushed to resultFrames.
    changed = true;

    if (frame.isBinary || frame.target_contents === null) {
      // Not renderable — dropped, no sibling emitted.
      continue;
    }

    const templateStr = frame.target_contents as string;
    const outputTarget = frame.target.slice(0, -5); // remove .tmpl

    try {
      const compiled = Handlebars.compile(templateStr, {
        noEscape: false,  // HTML-escape {{}} but not {{{ }}}
        strict: false,
      });

      const rendered = compiled(templateContext);

      // Create rendered frame (sibling without .tmpl) — the only frame emitted for this input.
      const renderedFrame: FileProcessingFrame = {
        sourcePath: frame.sourcePath,
        target: outputTarget,
        isBinary: false,
        target_contents: rendered,
        source: frame.source,
      };

      resultFrames.push(renderedFrame);
    } catch (err) {
      // Missing template or render error → warn+continue (FR-GEN-0010)
      // .tmpl frame already dropped above; no rendered sibling is emitted either.
      const msg = err instanceof Error ? err.message : String(err);
      renderErrors.push({ target: p.spec.name, file: outputTarget, message: `Template render error: ${msg}`, kind: 'soft' });
    }
  }

  if (!changed && renderErrors.length === 0) return p;

  return updatePluginFrame(p, (draft) => {
    draft.frames = resultFrames as typeof draft.frames;
    if (renderErrors.length > 0) {
      draft.errors = [...draft.errors, ...renderErrors] as typeof draft.errors;
    }
  });
}
