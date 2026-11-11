// FR-ARCH-0030/0039 — FileProcessingFrame / PluginProcessingFrame factories (immer)

import { produce, enableMapSet } from 'immer';

// Enable immer MapSet plugin for Set/Map support in produce()
enableMapSet();
import {
  type FileProcessingFrame,
  type PluginProcessingFrame,
  type PluginSpec,
  type Vfs,
  type VirtualFile,
} from './types.js';

/**
 * Create a fresh FileProcessingFrame from a VirtualFile and target path.
 * FR-ARCH-0030
 */
export function createFileFrame(vf: VirtualFile, targetPath: string): FileProcessingFrame {
  return {
    sourcePath: vf.path,
    target: targetPath,
    isBinary: false,
    target_contents: null, // populated by fileRead
    source: [...vf.sourceFiles],
  };
}

/**
 * Create a fresh PluginProcessingFrame.
 * FR-ARCH-0039
 */
export function createPluginFrame(
  spec: PluginSpec,
  vfs: Vfs,
  templateContext: Record<string, unknown>,
): PluginProcessingFrame {
  return {
    spec,
    vfs,
    frames: [],
    templateContext,
    errors: [],
  };
}

/**
 * Update a FileProcessingFrame immutably via immer.
 * FR-ARCH-0031
 */
export function updateFileFrame(
  frame: FileProcessingFrame,
  updater: (draft: FileProcessingFrame) => void,
): FileProcessingFrame {
  return produce(frame, updater);
}

/**
 * Update a PluginProcessingFrame immutably via immer.
 */
export function updatePluginFrame(
  frame: PluginProcessingFrame,
  updater: (draft: PluginProcessingFrame) => void,
): PluginProcessingFrame {
  return produce(frame, updater);
}

/**
 * Base document name of a frame — the basename up to its FIRST dot.
 *
 * Stripping only the last extension is not enough for targets that add a compound suffix:
 * Copilot renames `plugin-files-mode.md` to `plugin-files-mode.instructions.md` and its agents to
 * `*.agent.md`, whose single-extension stems (`plugin-files-mode.instructions`, `x.agent`) match
 * nothing. Cursor's `.mdc` and Claude's `.md` reduce identically either way; the compound rename is
 * the case that decides it. Shared by every processor that has to find a document BY NAME after
 * renames have been applied.
 */
export function baseDocName(frame: { target: string }): string {
  const name = frame.target.split('/').pop() ?? '';
  const dot = name.indexOf('.');
  return dot >= 0 ? name.slice(0, dot) : name;
}
