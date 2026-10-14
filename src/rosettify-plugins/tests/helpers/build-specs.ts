// Test helper: build the seven IDE specs for a single plugin set.
//
// buildAllSpecs() is gone — spec construction is now per (set x variant), because a set determines
// the instruction folders, the preserved-template family, the hook modules and the manifest.
// Most unit tests only care about one set's worth of specs, so this supplies a realistic default
// set/variant and lets a caller override any part of it.

import { buildSpecsForSet } from '../../src/spec/targets.js';
import type { SpecBuildContext } from '../../src/spec/targets.js';
import type { PluginSetDecl, SetVariant } from '../../src/spec/plugin-sets.js';
import { TARGET_NAME_LIST } from '../../src/spec/target-names.js';
import type { PluginSpec } from '../../src/types.js';

export const DEFAULT_HOOK_MODULES = [
  'dangerous-actions', 'read-once', 'read-once-reset', 'read-once-shared',
  'loose-files', 'md-file-advisory', 'codemap-refresh', 'lint-format-advisory',
];

export const TEST_SET: PluginSetDecl = {
  name: 'core',
  folders: ['core'],
  template: 'template',
  releases: ['r1', 'r2', 'r3'],
  requires: [],
  bootstrap: true,
  hooks: [
    'dangerous-actions', 'read-once', 'loose-files',
    'md-file-advisory', 'codemap-refresh', 'lint-format-advisory',
  ],
  manifest: { name: 'rosetta-core', description: 'Rosetta Core.' },
  variants: [
    {
      profile: null,
      destinationSuffix: '',
      manifestNameSuffix: '',
      manifestDescriptionSuffix: '',
    },
  ],
};

export const TEST_VARIANT: SetVariant = TEST_SET.variants[0];

/** Build one set's specs, with the set/variant/targets overridable per test. */
export function buildTestSpecs(
  ctx: Omit<SpecBuildContext, 'set' | 'variant' | 'targets' | 'hookModules' | 'hookSupportModules'> &
    Partial<Pick<SpecBuildContext,
      'set' | 'variant' | 'targets' | 'hookModules' | 'hookSupportModules'>>,
): PluginSpec[] {
  return buildSpecsForSet({
    set: TEST_SET,
    variant: TEST_VARIANT,
    targets: TARGET_NAME_LIST,
    hookModules: DEFAULT_HOOK_MODULES,
    hookSupportModules: { 'read-once': ['read-once-reset', 'read-once-shared'] },
    ...ctx,
  });
}
