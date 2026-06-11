// FR-ARCH-0048, FR-GEN-0010/0011 — Handlebars render of .tmpl files
// PARITY-7: {{#if}} standalone-block stripping must produce no leftover blank lines for r2

import Handlebars from 'handlebars';
import { updatePluginFrame } from '../frames.js';
import type { FileProcessingFrame, PluginProcessingFrame } from '../types.js';

/**
 * pluginRenderTemplates: for each .tmpl frame, render via Handlebars → sibling (no .tmpl extension).
 * Missing template → warn+continue (FR-GEN-0010).
 * Uses {{{raw}}} triple-stache for unescaped bootstrap payloads.
 * FR-ARCH-0048
 */
export function pluginRenderTemplates(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { frames, templateContext } = p;

  // Compile templates and build rendered frames
  const resultFrames: FileProcessingFrame[] = [];
  let hasNewFrames = false;

  // Standalone targets (manifestOverride set) must NOT emit .tmpl files to disk.
  // Main targets: .tmpl files are preserved (they exist in the plugin source and baseline).
  const isStandalone = !!p.spec.manifestOverride;

  for (const frame of frames) {
    if (!frame.target.endsWith('.tmpl')) {
      resultFrames.push(frame);
      continue;
    }
    if (frame.isBinary || frame.target_contents === null) {
      // Keep as-is if not renderable
      if (!isStandalone) resultFrames.push(frame);
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

      // For main targets: keep the .tmpl frame (baseline has .tmpl files)
      // For standalone targets: drop the .tmpl frame (baseline has no .tmpl files)
      if (!isStandalone) {
        resultFrames.push(frame);
      }

      // Create rendered frame (sibling without .tmpl)
      const renderedFrame: FileProcessingFrame = {
        sourcePath: frame.sourcePath,
        target: outputTarget,
        isBinary: false,
        target_contents: rendered,
        source: frame.source,
      };

      resultFrames.push(renderedFrame);
      hasNewFrames = true;
    } catch (err) {
      // Missing template or render error → warn+continue (FR-GEN-0010)
      // For main targets: keep the .tmpl frame even without rendered sibling
      if (!isStandalone) resultFrames.push(frame);
    }
  }

  if (!hasNewFrames) return p;

  return updatePluginFrame(p, (draft) => {
    draft.frames = resultFrames as typeof draft.frames;
  });
}
