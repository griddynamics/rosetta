// FR-ARCH-0055, FR-ARCH-0005 — claude bootstrap assembler (case-specific)
// Writes templateContext['bootstrap_hooks'] — ONE shared key (FR-VAR-0070).
// All entries emit "once":true (hardcoded in buildClaudeBootstrapEntry); plugin-root uses double-quoted printf.

import { updatePluginFrame } from '../frames.js';
import {
  assembleBootstrapPayload,
  buildClaudeBootstrapEntry,
  buildHookPayloadJson,
} from '../bootstrap/payload.js';
import { wrapInPrintf } from '../escaping/shell.js';
import { CLAUDE_PLUGIN_ROOT_ENTRY } from '../spec/bootstrap-manifest.js';
import type { PluginProcessingFrame } from '../types.js';

/**
 * pluginAssembleClaudeBootstrap: assemble bootstrap payload for Claude and write to templateContext.
 * Entry shape: {"type":"command","command":"printf '%s' '<json>'","once":true}
 * Plugin-root: same shape, double-quoted printf for env var expansion.
 * Sets templateContext['bootstrap_hooks'] (ONE shared key).
 * FR-ARCH-0055, FR-ARCH-0005, FR-VAR-0070
 */
export function pluginAssembleClaudeBootstrap(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { payload, errors } = assembleBootstrapPayload(
    p,
    (additionalContext) => {
      const jsonPayload = buildHookPayloadJson(additionalContext);
      const command = wrapInPrintf(jsonPayload);
      return buildClaudeBootstrapEntry(command);
    },
    (_folderPairs) => buildClaudeBootstrapEntry(CLAUDE_PLUGIN_ROOT_ENTRY.command),
  );
  return updatePluginFrame(p, (draft) => {
    draft.templateContext = { ...draft.templateContext, bootstrap_hooks: payload };
    if (errors.length > 0) {
      draft.errors = [...draft.errors, ...errors] as typeof draft.errors;
    }
  });
}
