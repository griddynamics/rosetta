// DATA-CFG-0002/0003 — canonical names for all built-in IDE targets.
//
// A target name is the BARE IDE IDENTITY (`claude`, `cursor-standalone`, ...), NOT an output
// folder name. It is the closed, load-time identity four independent modules key off:
//   - this module's TARGET_FAMILIES derivation,
//   - vfs/directives.ts KNOWN_DIRECTIVES (built at module load; an unknown token throws inside
//     buildVfs and kills every target at once),
//   - spec/profiles.ts modelOverrides outer-key validation,
//   - spec/targets.ts, which builds one PluginSpec per (set × variant × target).
//
// The plugin SET (rosetta, core, qe, ...) and the variant suffix live on `PluginSpec.destination`
// instead — `<set>-<ide>[<variantSuffix>]`. Keeping identity and output folder as separate fields
// is what lets six sets share the same seven IDE identities without any of the four modules above
// needing to know sets exist.
export const TARGET_NAMES = {
  CLAUDE: 'claude', CURSOR: 'cursor', COPILOT: 'copilot', CODEX: 'codex',
  CURSOR_STANDALONE: 'cursor-standalone', COPILOT_STANDALONE: 'copilot-standalone',
  ANTIGRAVITY: 'antigravity',
} as const;

/**
 * The same seven names as a list, plus the type and guard derived from it. Role-keyed is the single
 * literal home: `Object.values` recovers the list from the roles, but no expression recovers a role
 * from a name string, so deriving in this direction is what keeps the two shapes from drifting.
 */
export const TARGET_NAME_LIST = Object.values(TARGET_NAMES);

export type TargetName = (typeof TARGET_NAMES)[keyof typeof TARGET_NAMES];

export function isTargetName(value: string): value is TargetName {
  return (TARGET_NAME_LIST as readonly string[]).includes(value);
}

/**
 * IDE-family keys, DERIVED from the target names rather than listed again: a family is a target
 * name with any `-standalone` suffix removed, so `copilot` and `copilot-standalone` both belong to
 * family `copilot`, while `claude` is alone in family `claude`. Adding a target therefore joins or
 * creates its family with no second list to maintain.
 *
 * There is deliberately NO prefix-stripping step here. The previous implementation stripped a
 * literal `^core-`, which only worked while every target name began with the name of the one plugin
 * set that existed. Target names are now bare IDE ids, so the family is the id minus `-standalone`
 * and nothing else.
 *
 * FR-ARCH-0023: `target-cursor-only` stays exact and must NOT pull in `cursor-standalone`;
 * `ide-cursor-only` expands to every target of that IDE. The two live in separate token namespaces
 * (`target-` vs `ide-`), so a family key and a target name can never collide.
 */
export const TARGET_FAMILIES: Readonly<Record<string, readonly TargetName[]>> = (() => {
  const families: Record<string, TargetName[]> = {};
  for (const name of TARGET_NAME_LIST) {
    const family = name.replace(/-standalone$/, '');
    (families[family] ??= []).push(name);
  }
  return families;
})();

export const TARGET_FAMILY_KEYS = Object.keys(TARGET_FAMILIES);
