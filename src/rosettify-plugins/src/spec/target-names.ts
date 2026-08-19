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
