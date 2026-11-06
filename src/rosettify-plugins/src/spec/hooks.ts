// Relocated from the deleted spec/hook-layouts.ts (hooks-architecture.md §1.7, §3 step 5) —
// DATA-CFG-0008's HOOK_LAYOUTS table and the layout/entry/envelope types it held are retired; the
// document shape they described now lives entirely in the 7 literal hooks.json.tmpl templates.
// This sentinel survives because two other modules still need it and importing it from either one
// would create a cycle: spec/targets.ts imports plugin-processors/plugin-copy.ts (to compose the
// per-target pipeline), so plugin-copy.ts cannot import from spec/targets.ts, and this file has no
// dependents that could import IT from spec/targets.ts either. A standalone module breaks the tie.

/**
 * Pseudo-folder token for ManifestConditionalField.requires meaning "this spec emits a
 * hooks.json", as opposed to a real instruction folder matched against the VFS. Consumed by
 * `manifestConditionalFields` (spec/targets.ts) and `buildManifestOverlay`
 * (plugin-processors/plugin-copy.ts).
 */
export const HOOKS_PSEUDO_FOLDER = '@hooks';
