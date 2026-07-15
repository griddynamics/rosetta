// FR-ARCH-0055, FR-ARCH-0005 — cursor bootstrap assembler (case-specific)
// ALL IDEs including cursor ALWAYS generate FULL bootstrap (FR-VAR-0070, Owner Rule 1).
// Cursor uses {"additional_context":"<body>"} payload — NOT {"hookSpecificOutput":...}.
// Cursor template has no {{{bootstrap_hooks}}} placeholder — payload generated but not injected.
// Writes templateContext['bootstrap_hooks'] — ONE shared key (FR-VAR-0070).

import { updatePluginFrame } from '../frames.js';
import {
  assembleBootstrapPayload,
  buildCursorBootstrapEntry,
} from '../bootstrap/payload.js';
import { buildCursorHookPayloadJson } from '../escaping/json-string.js';
import { wrapInPrintf } from '../escaping/shell.js';
import { CURSOR_PLUGIN_ROOT_ENTRY } from '../spec/bootstrap-manifest.js';
import type { PluginProcessingFrame } from '../types.js';

/**
 * pluginAssembleCursorBootstrap: assemble bootstrap payload for Cursor and write to templateContext.
 * Entry shape: {"type":"command","command":"printf '%s' '{\"additional_context\":\"...\"}'"} — no once, no statusMessage, no bash/powershell.
 * Plugin-root uses double-quoted printf for ${CURSOR_PROJECT_DIR} env var expansion.
 * Sets templateContext['bootstrap_hooks'] (ONE shared key); payload is NON-EMPTY.
 * Cursor hooks.json output is {"version":1,"hooks":{}} (37 bytes) — template has no placeholder.
 * FR-ARCH-0055, FR-ARCH-0005, FR-VAR-0070, Owner Rule 1
 */
export function pluginAssembleCursorBootstrap(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { payload, errors } = assembleBootstrapPayload(
    p,
    (additionalContext) => {
      // Cursor uses additional_context format, NOT hookSpecificOutput
      const jsonPayload = buildCursorHookPayloadJson(additionalContext);
      const command = wrapInPrintf(jsonPayload);
      return buildCursorBootstrapEntry(command);
    },
    (_folderPairs) => buildCursorBootstrapEntry(CURSOR_PLUGIN_ROOT_ENTRY.command),
  );
  // Generator ALWAYS generates full cursor bootstrap. Template decides injection.
  return updatePluginFrame(p, (draft) => {
    draft.templateContext = { ...draft.templateContext, bootstrap_hooks: payload };
    if (errors.length > 0) {
      draft.errors = [...draft.errors, ...errors] as typeof draft.errors;
    }
  });
}
