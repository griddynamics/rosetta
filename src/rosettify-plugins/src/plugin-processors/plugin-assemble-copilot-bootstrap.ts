// FR-ARCH-0055, FR-ARCH-0005 — copilot bootstrap assembler (case-specific)
// Writes templateContext['bootstrap_hooks'] — ONE shared key (FR-VAR-0070).
// Entries have bash+powershell with per-entry session lock (0-based index).
// Plugin-root is agentPlugins-base probe; reference-rewritten for folder renames.

import { updatePluginFrame } from '../frames.js';
import {
  assembleBootstrapPayload,
  buildCopilotBootstrapEntry,
  buildHookPayloadJson,
  buildCopilotBashEntry,
  buildCopilotPowershellEntry,
  applyFolderRewrites,
} from '../bootstrap/payload.js';
import { COPILOT_PLUGIN_ROOT_BASH, COPILOT_PLUGIN_ROOT_POWERSHELL } from '../spec/bootstrap-manifest.js';
import type { PluginProcessingFrame } from '../types.js';

/**
 * pluginAssembleCopilotBootstrap: assemble bootstrap payload for Copilot and write to templateContext.
 * Entry shape: {"type":"command","bash":"<lock+printf>","powershell":"<lock+Write-Output>"}
 * Lock key uses 0-based entry index (-0.lock, -1.lock, …).
 * Entry 0 bash includes stale-lock cleanup; entries 1+ do not.
 * Plugin-root lock index = number of doc entries (final index).
 * Plugin-root bash and powershell are reference-rewritten for folder renames.
 * Sets templateContext['bootstrap_hooks'] (ONE shared key).
 * FR-ARCH-0055, FR-ARCH-0005, FR-VAR-0070
 */
export function pluginAssembleCopilotBootstrap(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { payload, errors } = assembleBootstrapPayload(
    p,
    (additionalContext, _jsonPayload, lockIndex) => {
      const jsonPayload = buildHookPayloadJson(additionalContext);
      const bash = buildCopilotBashEntry(lockIndex, jsonPayload);
      const powershell = buildCopilotPowershellEntry(lockIndex, jsonPayload);
      return buildCopilotBootstrapEntry(bash, powershell);
    },
    (lockIndex, folderPairs) => {
      const bash = applyFolderRewrites(COPILOT_PLUGIN_ROOT_BASH, folderPairs);
      const powershell = applyFolderRewrites(COPILOT_PLUGIN_ROOT_POWERSHELL, folderPairs);
      return buildCopilotBootstrapEntry(bash, powershell);
    },
  );
  return updatePluginFrame(p, (draft) => {
    draft.templateContext = { ...draft.templateContext, bootstrap_hooks: payload };
    if (errors.length > 0) {
      draft.errors = [...draft.errors, ...errors] as typeof draft.errors;
    }
  });
}
