// FR-ARCH-0052 — wipe + ensure output directory
// FR-CLI-0050: dry-run → no-op, zero filesystem mutations
// FR-CLI-0036: suppressed (unpublished plugin) → no-op as well

import fs from 'fs';
import path from 'path';
import type { PluginProcessingFrame, WriteMode } from '../types.js';

/**
 * pluginCleanup: remove and recreate the output directory for this target.
 * NFR-0003: idempotent via wipe+mkdir.
 * dry-run and suppressed → skip all filesystem mutations (FR-CLI-0050, FR-ARCH-0045, FR-CLI-0036).
 * FR-ARCH-0052
 */
export function pluginCleanup(outputDir: string, mode: WriteMode = 'write') {
  return function pluginCleanupProcessor(
    p: PluginProcessingFrame,
  ): PluginProcessingFrame {
    if (mode !== 'write') return p; // FR-CLI-0050/0036: zero disk writes in dry-run and suppressed

    const targetDir = path.join(outputDir, p.spec.destination);

    // Wipe
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    return p; // no frame mutations needed
  };
}
