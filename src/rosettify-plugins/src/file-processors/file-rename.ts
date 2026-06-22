// FR-ARCH-0043 — full-anchored regex rename on plugin-relative path; path-only; never touches content

import { updateFileFrame } from '../frames.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * fileRename: apply full-anchored regex to plugin-relative target path.
 * Only changes the path, never the content.
 * Non-match → unchanged frame.
 * FR-ARCH-0043
 */
export function fileRename(
  pattern: string,
  replacement: string,
): (frame: FileProcessingFrame, ctx: TargetContext) => FileProcessingFrame {
  const regex = new RegExp(`^${pattern}$`);

  return (frame: FileProcessingFrame, ctx: TargetContext): FileProcessingFrame => {
    const newTarget = frame.target.replace(regex, replacement);
    if (newTarget === frame.target) return frame;

    return updateFileFrame(frame, (draft) => {
      draft.target = newTarget;
    });
  };
}
