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
