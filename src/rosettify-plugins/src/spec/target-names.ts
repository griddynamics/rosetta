// DATA-CFG-0002/0003 — canonical names for all built-in plugin targets
export const TARGET_NAMES = {
  CLAUDE: 'core-claude', CURSOR: 'core-cursor', COPILOT: 'core-copilot', CODEX: 'core-codex',
  CURSOR_STANDALONE: 'core-cursor-standalone', COPILOT_STANDALONE: 'core-copilot-standalone',
  ANTIGRAVITY: 'core-antigravity',
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
 * IDE-family keys, DERIVED from the target names rather than listed again: a family is a target name
 * with the `core-` prefix and any `-standalone` suffix removed, so `core-copilot` and
 * `core-copilot-standalone` both belong to family `copilot`, while `core-claude` is alone in family
 * `claude`. Adding a target therefore joins or creates its family with no second list to maintain.
 *
 * FR-ARCH-0023: a TargetOnlyToken accepts either a family key, expanding to every target of that
 * IDE, or an exact target name, which stays exact — `core-cursor-only` must NOT pull in
 * `core-cursor-standalone`. Family keys and target names cannot collide: every target name carries
 * the `core-` prefix and no family key does.
 */
export const TARGET_FAMILIES: Readonly<Record<string, readonly TargetName[]>> = (() => {
  const families: Record<string, TargetName[]> = {};
  for (const name of TARGET_NAME_LIST) {
    const family = name.replace(/^core-/, '').replace(/-standalone$/, '');
    (families[family] ??= []).push(name);
  }
  return families;
})();

export const TARGET_FAMILY_KEYS = Object.keys(TARGET_FAMILIES);
