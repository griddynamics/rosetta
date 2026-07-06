// FR-ARCH-0055, FR-ARCH-0005 — copilot bootstrap assembler (case-specific)
// Writes templateContext['bootstrap_hooks'] — ONE shared key (FR-VAR-0070).
// Entries have bash+powershell — plain printf/Write-Output, same pattern as every other IDE.
// (No per-entry session lock — that guarded a Copilot-side bug where a single registered hook
// was invoked twice per real event; GitHub has since fixed it. See FR-HOOK-0006.)
// Plugin-root is agentPlugins-base probe; reference-rewritten for folder renames.

import { updatePluginFrame } from '../frames.js';
import {
  assembleBootstrapPayload,
  buildCopilotBootstrapEntry,
  applyFolderRewrites,
} from '../bootstrap/payload.js';
import { buildCopilotHookPayloadJson } from '../escaping/json-string.js';
import { wrapInPrintf } from '../escaping/shell.js';
import { wrapInPsWriteOutput } from '../escaping/powershell.js';
import { COPILOT_PLUGIN_ROOT_BASH, COPILOT_PLUGIN_ROOT_POWERSHELL } from '../spec/bootstrap-manifest.js';
import type { PluginProcessingFrame } from '../types.js';

/**
 * pluginAssembleCopilotBootstrap: assemble bootstrap payload for Copilot and write to templateContext.
 * Entry shape: {"type":"command","bash":"printf '%s' '<json>'","powershell":"Write-Output '<json>'"}
 * Plugin-root bash and powershell are reference-rewritten for folder renames.
 * Sets templateContext['bootstrap_hooks'] (ONE shared key).
 * FR-ARCH-0055, FR-ARCH-0005, FR-VAR-0070
 */
export function pluginAssembleCopilotBootstrap(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { payload, errors } = assembleBootstrapPayload(
    p,
    (additionalContext) => {
      const jsonPayload = buildCopilotHookPayloadJson(additionalContext);
      const bash = wrapInPrintf(jsonPayload);
      const powershell = wrapInPsWriteOutput(jsonPayload);
      return buildCopilotBootstrapEntry(bash, powershell);
    },
    (folderPairs) => {
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
