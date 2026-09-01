// DATA-CFG-0008 — per-target hooks.json layout, as DATA.
//
// Each of the seven targets writes a hooks.json with a different envelope, event vocabulary,
// matcher set and entry shape. That variation used to live as ~600 lines of near-duplicate JSON
// across six hooks.json.tmpl files, where the only thing keeping the output parseable was the
// hand-maintained `]{{#if deterministic_hooks}},{{/if}}` trailing-comma idiom — a construct that
// produces malformed JSON with no error whenever it is copied slightly wrong.
//
// Here the variation is a lookup table and the assembly is one shared processor
// (pluginAssembleHooksJson) that serializes with JSON.stringify, so the output cannot be
// syntactically invalid by construction. Selecting a layout by target id is a Record lookup on
// data, not identity branching in control flow (FR-ARCH-0005): no consumer of this module contains
// a `switch (spec.name)`.
//
// A set ships exactly the hook modules its `hooks` list names (plus support modules). Bindings
// naming a module the set does not ship are filtered out, and a binding left with no modules is
// dropped — which is how a set with an empty hook list emits no hook events at all.

/**
 * Pseudo-folder token for ManifestConditionalField.requires meaning "this spec emits a hooks.json",
 * as opposed to a real instruction folder matched against the VFS. Lives here rather than in
 * spec/targets.ts so plugin-copy can read it without a targets.ts <-> plugin-copy import cycle.
 */
export const HOOKS_PSEUDO_FOLDER = '@hooks';

/** One event → matcher → module-list binding within a layout. */
export interface HookBinding {
  /** Event name as it appears as a key in the emitted hooks object. */
  event: string;
  /** Matcher for the entry group. Omitted where the layout's event takes no matcher. */
  matcher?: string;
  /** Hook module basenames bound here, in emission order. */
  modules: string[];
  /**
   * When true, entries sit DIRECTLY in the event array rather than inside a
   * `{ matcher, hooks: [...] }` group. Copilot's preCompact is flat while its PreToolUse is
   * grouped, so this is per-binding rather than per-layout.
   */
  flat?: boolean;
}

/** Where a layout injects the assembled bootstrap payload, or null when it takes none. */
export interface BootstrapBinding {
  event: string;
  matcher?: string;
  flat?: boolean;
  /**
   * `inject` — write the assembled bootstrap payload here (when the set declares bootstrap).
   * `empty`  — always write a literal empty array here and never a payload. This is Copilot's
   *            standalone form, whose template carried a literal `"sessionStart": []`: the event
   *            key must be present and must stay empty.
   */
  payload: 'inject' | 'empty';
}

export interface HookLayout {
  /**
   * Build one entry object for a hook module. `destination` is the spec's OUTPUT FOLDER NAME
   * (set + variant suffix), which Copilot's probes embed literally — see COPILOT_PLUGIN_PATH below.
   */
  entry(module: string, destination: string): Record<string, unknown>;
  bindings: HookBinding[];
  /**
   * Where the bootstrap payload goes. `null` for the three targets that take no bootstrap hook:
   * both Cursor forms (whose two templates were placeholder-free) and Antigravity (FR-VAR-0082 —
   * its bootstrap rides the source's always-on rule, not a session-start hook).
   */
  bootstrap: BootstrapBinding | null;
  /** Wrap the assembled events map in the target's file envelope. */
  envelope(events: Record<string, unknown>): Record<string, unknown>;
}

// ─── Shared entry shapes ────────────────────────────────────────────────────

const command = (cmd: string) => ({ type: 'command', command: cmd });

/**
 * Copilot cannot report its own plugin path, so its hook commands probe a FIXED install location.
 * That path is deliberately hardcoded rather than derived at runtime (confirmed product behavior:
 * hooks fire in either standalone or plugin mode, only one per case). It is, however, made
 * SET-AWARE here: the literal is the spec's `destination`, so `qe-copilot` probes its own folder
 * and `core-copilot-light` probes `core-copilot-light` rather than — as it did before — the
 * unrelated `core-copilot`.
 */
export const COPILOT_PLUGIN_PATH = (destination: string) =>
  `github.com/griddynamics/rosetta/plugins/${destination}`;

export function copilotProbeBash(destination: string, script: string, run: string): string {
  return (
    `for base in "$HOME/.vscode/agent-plugins" "$HOME/.local/share/Code/agentPlugins"; ` +
    `do root="$base/${COPILOT_PLUGIN_PATH(destination)}"; ` +
    `if [ -f "$root/${script}" ]; then ${run}; break; fi; done`
  );
}

export function copilotProbePowershell(destination: string, script: string, run: string): string {
  const winPath = COPILOT_PLUGIN_PATH(destination).replace(/\//g, '\\');
  return (
    `$root = "$env:LOCALAPPDATA\\Code\\agentPlugins\\${winPath}"; ` +
    `if (Test-Path "$root\\${script.replace(/\//g, '\\')}") { ${run} }`
  );
}

const copilotPluginEntry = (module: string, destination: string) => ({
  type: 'command',
  bash: copilotProbeBash(destination, `hooks/${module}.js`, `node "$root/hooks/${module}.js"`),
  powershell: copilotProbePowershell(
    destination, `hooks/${module}.js`, `node "$root\\hooks\\${module}.js"`,
  ),
});

// ─── Matcher vocabularies ───────────────────────────────────────────────────
// Named so the same conceptual binding is visibly the same across targets even though each IDE
// spells its tool names differently.

const CLAUDE_BINDINGS: HookBinding[] = [
  { event: 'PostCompact', matcher: '', modules: ['read-once-reset'] },
  { event: 'PreToolUse', matcher: 'Bash|mcp__.*', modules: ['dangerous-actions'] },
  { event: 'PreToolUse', matcher: 'Read|Bash', modules: ['read-once'] },
  { event: 'PostToolUse', matcher: 'Write', modules: ['loose-files', 'md-file-advisory'] },
  { event: 'PostToolUse', matcher: 'Edit|Write|MultiEdit', modules: ['codemap-refresh'] },
  { event: 'PostToolUse', matcher: 'Write|Edit|MultiEdit', modules: ['lint-format-advisory'] },
];

const CODEX_BINDINGS: HookBinding[] = [
  { event: 'PostCompact', matcher: '', modules: ['read-once-reset'] },
  { event: 'PreToolUse', matcher: 'Bash|mcp__.*', modules: ['dangerous-actions'] },
  { event: 'PreToolUse', matcher: 'Bash|shell', modules: ['read-once'] },
  {
    event: 'PostToolUse',
    matcher: 'Write|apply_patch|functions.apply_patch',
    modules: ['loose-files', 'md-file-advisory'],
  },
  {
    event: 'PostToolUse',
    matcher: 'Write|Edit|apply_patch|functions.apply_patch',
    modules: ['codemap-refresh'],
  },
  {
    event: 'PostToolUse',
    matcher: 'Write|Edit|apply_patch|functions.apply_patch',
    modules: ['lint-format-advisory'],
  },
];

const COPILOT_BINDINGS: HookBinding[] = [
  { event: 'preCompact', modules: ['read-once-reset'], flat: true },
  { event: 'PreToolUse', matcher: 'Bash|mcp__.*', modules: ['dangerous-actions'] },
  { event: 'PreToolUse', matcher: 'view|Read|bash|powershell', modules: ['read-once'] },
  {
    event: 'PostToolUse',
    matcher: 'Write|create_file',
    modules: ['loose-files', 'md-file-advisory'],
  },
  {
    event: 'PostToolUse',
    matcher: 'Write|Edit|create_file|replace_string_in_file|multi_replace_string_in_file',
    modules: ['codemap-refresh'],
  },
  {
    event: 'PostToolUse',
    matcher: 'Write|Edit|create_file|replace_string_in_file|multi_replace_string_in_file',
    modules: ['lint-format-advisory'],
  },
];

/** Cursor's entries are FLAT throughout — `{command}` or `{matcher, command}`, never grouped. */
const cursorBindings = (): HookBinding[] => [
  { event: 'beforeReadFile', modules: ['read-once'], flat: true },
  { event: 'beforeTabFileRead', modules: ['read-once'], flat: true },
  { event: 'preCompact', modules: ['read-once-reset'], flat: true },
  { event: 'preToolUse', matcher: 'Bash|Shell|mcp__.*', modules: ['dangerous-actions'], flat: true },
  { event: 'preToolUse', matcher: 'Read|Bash|Shell', modules: ['read-once'], flat: true },
  { event: 'postToolUse', matcher: 'Write', modules: ['loose-files'], flat: true },
  { event: 'postToolUse', matcher: 'Write|Edit', modules: ['md-file-advisory'], flat: true },
  { event: 'postToolUse', matcher: 'Write|Edit', modules: ['codemap-refresh'], flat: true },
  { event: 'postToolUse', matcher: 'Write|Edit', modules: ['lint-format-advisory'], flat: true },
];

const cursorEntry = (hookDir: string) => (module: string) => ({
  command: `node ${hookDir}/${module}.js`,
});

// ─── The table ──────────────────────────────────────────────────────────────

const plainHooks = (events: Record<string, unknown>) => ({ hooks: events });
const versionedHooks = (events: Record<string, unknown>) => ({ version: 1, hooks: events });

export const HOOK_LAYOUTS: Readonly<Record<string, HookLayout>> = {
  claude: {
    entry: (module) => command(`node "\${CLAUDE_PLUGIN_ROOT}/hooks/${module}.js"`),
    bindings: CLAUDE_BINDINGS,
    bootstrap: { event: 'SessionStart', matcher: 'startup', payload: 'inject' },
    envelope: plainHooks,
  },

  codex: {
    entry: (module) => command(`node .codex/hooks/${module}.js`),
    bindings: CODEX_BINDINGS,
    bootstrap: { event: 'SessionStart', matcher: 'startup|resume', payload: 'inject' },
    envelope: plainHooks,
  },

  copilot: {
    entry: copilotPluginEntry,
    bindings: COPILOT_BINDINGS,
    // Copilot's sessionStart is flat: the payload entries sit directly in the array.
    bootstrap: { event: 'sessionStart', flat: true, payload: 'inject' },
    envelope: versionedHooks,
  },

  'copilot-standalone': {
    entry: (module) => command(`node ".github/hooks/${module}.js"`),
    bindings: COPILOT_BINDINGS,
    // ASYMMETRY (preserved): the standalone form registers NO bootstrap payload, but still emits a
    // literal empty `"sessionStart": []` — hence payload 'empty' rather than 'inject'.
    bootstrap: { event: 'sessionStart', flat: true, payload: 'empty' },
    envelope: versionedHooks,
  },

  cursor: {
    entry: cursorEntry('hooks'),
    bindings: cursorBindings(),
    bootstrap: null, // ASYMMETRY (preserved): Cursor's template carried no bootstrap placeholder.
    envelope: versionedHooks,
  },

  'cursor-standalone': {
    entry: cursorEntry('.cursor/hooks'),
    bindings: cursorBindings(),
    bootstrap: null, // ASYMMETRY (preserved): the second placeholder-free Cursor template.
    envelope: versionedHooks,
  },

  antigravity: {
    entry: (module) => ({ ...command(`node hooks/${module}.js`), timeout: 30 }),
    // Antigravity binds only the two guardrail modules; it has no post-edit advisory events.
    bindings: [
      { event: 'PreToolUse', matcher: 'run_command|mcp__.*', modules: ['dangerous-actions'] },
      { event: 'PreToolUse', matcher: 'view_file|run_command', modules: ['read-once'] },
    ],
    // ASYMMETRY (preserved): no bootstrap placeholder at all (FR-VAR-0082).
    bootstrap: null,
    envelope: (events) => ({ rosetta: { enabled: true, PreInvocation: [], ...events } }),
  },
};
