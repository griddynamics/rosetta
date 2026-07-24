// FR-VAR-0082, FR-ARCH-0055, FR-ARCH-0005 — antigravity bootstrap assembler (case-specific)
// Mirrors the Cursor pattern (FR-VAR-0070): assemble + size-check the bootstrap values
// unconditionally; the template decides injection — here, no injection at all. Antigravity
// delivers bootstrap through the source's authored `trigger: always_on` rule
// (`bootstrap-alwayson.md`/`plugin-files-mode.md`), NOT a session-start hook (FR-VAR-0082), so
// there is no plugin-root entry and no {{{bootstrap_hooks}}} placeholder in the Antigravity
// hooks.json.tmpl to consume this payload. Running assembleBootstrapPayload here still gives
// Antigravity's bootstrap documents the SAME size-check (NFR-0004) as every other target; the
// resulting payload is written to templateContext for architectural uniformity only and is
// discarded (unused by the template).

import { updatePluginFrame } from '../frames.js';
import { assembleBootstrapPayload, buildAntigravityBootstrapEntry } from '../bootstrap/payload.js';
import type { PluginProcessingFrame } from '../types.js';

export function pluginAssembleAntigravityBootstrap(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { payload, errors } = assembleBootstrapPayload(
    p,
    (additionalContext) => buildAntigravityBootstrapEntry(additionalContext),
    () => null, // no plugin-root entry: Antigravity bootstrap never rides this (discarded) payload
  );

  return updatePluginFrame(p, (draft) => {
    draft.templateContext = { ...draft.templateContext, bootstrap_hooks: payload };
    if (errors.length > 0) {
      draft.errors = [...draft.errors, ...errors] as typeof draft.errors;
    }
  });
}
