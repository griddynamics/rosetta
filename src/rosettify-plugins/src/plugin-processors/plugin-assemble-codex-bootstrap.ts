// FR-ARCH-0055, FR-ARCH-0005 — codex bootstrap assembler (case-specific)
// Writes templateContext['bootstrap_hooks'] — ONE shared key (FR-VAR-0070).
// Entries have statusMessage+timeout, no once. Plugin-root is workspace-root probe.

import { updatePluginFrame } from '../frames.js';
import {
  assembleBootstrapPayload,
  buildCodexBootstrapEntry,
  buildHookPayloadJson,
} from '../bootstrap/payload.js';
import { wrapInPrintf } from '../escaping/shell.js';
import { CODEX_PLUGIN_ROOT_COMMAND } from '../spec/bootstrap-manifest.js';
import type { PluginProcessingFrame } from '../types.js';

/**
 * pluginAssembleCodexBootstrap: assemble bootstrap payload for Codex and write to templateContext.
 * Entry shape: {"type":"command","command":"printf '%s' '<json>'","statusMessage":"Loading Rosetta bootstrap","timeout":30}
 * Plugin-root: workspace-root traversal probe resolving to $workspace_root/.agents.
 * Sets templateContext['bootstrap_hooks'] (ONE shared key).
 * FR-ARCH-0055, FR-ARCH-0005, FR-VAR-0070
 */
export function pluginAssembleCodexBootstrap(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { payload, errors } = assembleBootstrapPayload(
    p,
    (additionalContext) => {
      const jsonPayload = buildHookPayloadJson(additionalContext);
      const command = wrapInPrintf(jsonPayload);
      return buildCodexBootstrapEntry(command);
    },
    (_folderPairs) => buildCodexBootstrapEntry(CODEX_PLUGIN_ROOT_COMMAND),
  );
  return updatePluginFrame(p, (draft) => {
    draft.templateContext = { ...draft.templateContext, bootstrap_hooks: payload };
    if (errors.length > 0) {
      draft.errors = [...draft.errors, ...errors] as typeof draft.errors;
    }
  });
}
