// GT-4, SPECS §8, DATA-CFG-0002 — mirror/copy rendered frames to alternate-name paths
// Used for: codex .codex/hooks.json mirror, copilot root hooks.json copy.
// Data-driven via PluginSpec.mirrors — no per-target name branching. FR-ARCH-0035.

import { updatePluginFrame } from '../frames.js';
import type { FileProcessingFrame, PluginProcessingFrame } from '../types.js';

/**
 * pluginMirrorFiles: after rendering, copy specific frames to alternate-name target paths.
 * Reads mirror pairs from spec.mirrors (declarative data on PluginSpec).
 * For each {from, to}: find frame with target===from, clone it with target=to.
 * If source frame not found: no-op (graceful — mirror is best-effort).
 * DATA-CFG-0002, GT-4
 */
export function pluginMirrorFiles(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { frames, spec } = p;
  const mirrors = spec.mirrors ?? [];
  if (mirrors.length === 0) return p;

  const additionalFrames: FileProcessingFrame[] = [];

  for (const { from, to } of mirrors) {
    const sourceFrame = frames.find((f) => f.target === from);
    if (!sourceFrame) continue; // graceful skip

    const mirrorFrame: FileProcessingFrame = {
      ...sourceFrame,
      sourcePath: sourceFrame.sourcePath,
      target: to,
    };
    additionalFrames.push(mirrorFrame);
  }

  if (additionalFrames.length === 0) return p;

  return updatePluginFrame(p, (draft) => {
    draft.frames = [...draft.frames, ...additionalFrames] as typeof draft.frames;
  });
}
