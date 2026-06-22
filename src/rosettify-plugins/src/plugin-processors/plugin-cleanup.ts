// FR-ARCH-0052 — wipe + ensure output directory
// FR-CLI-0050: dry-run → no-op, zero filesystem mutations

import fs from 'fs';
import path from 'path';
import type { PluginProcessingFrame } from '../types.js';

/**
 * pluginCleanup: remove and recreate the output directory for this target.
 * NFR-0003: idempotent via wipe+mkdir.
 * dry-run → skip all filesystem mutations (FR-CLI-0050, FR-ARCH-0045).
 * FR-ARCH-0052
 */
export function pluginCleanup(outputDir: string, dryRun = false) {
  return function pluginCleanupProcessor(
    p: PluginProcessingFrame,
  ): PluginProcessingFrame {
    if (dryRun) return p; // FR-CLI-0050: zero disk writes in dry-run

    const targetDir = path.join(outputDir, p.spec.destination);

    // Wipe
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    return p; // no frame mutations needed
  };
}
