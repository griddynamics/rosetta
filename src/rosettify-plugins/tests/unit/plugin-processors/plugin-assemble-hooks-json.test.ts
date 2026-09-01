// DATA-CFG-0008 — hooks.json assembled from set data + the target's layout.
// The construct this replaces (a hand-maintained `]{{#if deterministic_hooks}},{{/if}}`
// trailing-comma idiom repeated across six templates) could emit malformed JSON with no error, so
// the central property under test is: EVERY combination produces parseable JSON.
import { describe, it, expect } from 'vitest';
import {
  buildHooksDocument,
  emitsHooksJson,
  pluginAssembleHooksJson,
} from '../../../src/plugin-processors/plugin-assemble-hooks-json.js';
import { HOOK_LAYOUTS } from '../../../src/spec/hook-layouts.js';
import type { PluginProcessingFrame, PluginSpec } from '../../../src/types.js';

const LAYOUT_IDS = Object.keys(HOOK_LAYOUTS);
const FULL_MODULES = [
  'dangerous-actions', 'read-once', 'read-once-reset', 'read-once-shared',
  'loose-files', 'md-file-advisory', 'codemap-refresh', 'lint-format-advisory',
];
// One realistic bootstrap payload: a comma-joined list of JSON objects, the shape
// assembleBootstrapPayload produces for a `[{{{bootstrap_hooks}}}]` slot.
const PAYLOAD = '{"type": "command", "command": "echo a", "once": true}, {"type": "command", "command": "echo b"}';

function doc(layoutId: string, opts: {
  modules?: string[]; bootstrap?: boolean; payload?: string; deterministic?: boolean;
} = {}) {
  return buildHooksDocument(
    HOOK_LAYOUTS[layoutId],
    opts.modules ?? FULL_MODULES,
    opts.bootstrap ?? true,
    'rosetta-copilot-light',
    opts.payload ?? PAYLOAD,
    opts.deterministic ?? true,
  );
}

describe('buildHooksDocument — output is always valid JSON', () => {
  const combos = LAYOUT_IDS.flatMap((id) =>
    [true, false].flatMap((deterministic) =>
      [true, false].flatMap((bootstrap) =>
        [FULL_MODULES, []].map((modules) => ({ id, deterministic, bootstrap, modules })),
      ),
    ),
  );

  it.each(combos)(
    '$id (deterministic=$deterministic, bootstrap=$bootstrap, modules=$modules.length) round-trips',
    ({ id, deterministic, bootstrap, modules }) => {
      const built = doc(id, { deterministic, bootstrap, modules });
      const serialized = JSON.stringify(built, null, 2);
      expect(() => JSON.parse(serialized)).not.toThrow();
      expect(JSON.parse(serialized)).toEqual(built);
    },
  );
});

describe('buildHooksDocument — deterministic_hooks gates the advisory bindings', () => {
  it('emits the guardrail events when on', () => {
    const built = doc('claude') as { hooks: Record<string, unknown[]> };
    expect(built.hooks.PreToolUse).toBeDefined();
    expect(built.hooks.PostToolUse).toBeDefined();
  });

  it('emits NO guardrail events when off, but keeps the bootstrap slot', () => {
    const built = doc('claude', { deterministic: false }) as { hooks: Record<string, unknown[]> };
    expect(built.hooks.PreToolUse).toBeUndefined();
    expect(built.hooks.PostToolUse).toBeUndefined();
    expect(built.hooks.SessionStart).toHaveLength(1);
  });
});

describe('buildHooksDocument — a set ships exactly the modules it declares', () => {
  it('drops bindings whose modules the set does not ship', () => {
    const built = doc('claude', { modules: ['dangerous-actions'] }) as {
      hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>>;
    };
    const commands = JSON.stringify(built);
    expect(commands).toContain('dangerous-actions.js');
    expect(commands).not.toContain('read-once.js');
    expect(commands).not.toContain('loose-files.js');
    // PostCompact bound only read-once-reset, which is not shipped → the event is gone entirely.
    expect(built.hooks.PostCompact).toBeUndefined();
  });
});

describe('the three preserved asymmetries', () => {
  it('Cursor takes no bootstrap payload, in either form', () => {
    for (const id of ['cursor', 'cursor-standalone']) {
      expect(HOOK_LAYOUTS[id].bootstrap).toBeNull();
      const built = doc(id) as { hooks: Record<string, unknown> };
      expect(built.hooks.SessionStart).toBeUndefined();
      expect(built.hooks.sessionStart).toBeUndefined();
    }
  });

  it("Copilot's standalone form emits a literal empty sessionStart, even with a payload", () => {
    const built = doc('copilot-standalone') as { hooks: Record<string, unknown[]> };
    expect(built.hooks.sessionStart).toEqual([]);
    // ...while the plugin form DOES carry the payload.
    const plugin = doc('copilot') as { hooks: Record<string, unknown[]> };
    expect(plugin.hooks.sessionStart).toHaveLength(2);
  });

  it('Antigravity has no bootstrap slot and keeps its enabled/PreInvocation envelope', () => {
    expect(HOOK_LAYOUTS.antigravity.bootstrap).toBeNull();
    const built = doc('antigravity') as {
      rosetta: { enabled: boolean; PreInvocation: unknown[]; PreToolUse?: unknown[] };
    };
    expect(built.rosetta.enabled).toBe(true);
    expect(built.rosetta.PreInvocation).toEqual([]);
    expect(built.rosetta.PreToolUse).toBeDefined();
    expect(JSON.stringify(built)).not.toContain('echo a');
  });
});

describe('Copilot probes are set-aware', () => {
  it('embeds the spec destination, so a variant probes its own folder', () => {
    const built = JSON.stringify(doc('copilot'));
    expect(built).toContain('plugins/rosetta-copilot-light');
    expect(built).not.toContain('plugins/core-copilot"');
  });
});

describe('emitsHooksJson', () => {
  it('is false for a set with no modules and no bootstrap', () => {
    expect(emitsHooksJson(HOOK_LAYOUTS.claude, [], false)).toBe(false);
  });

  it('is true when the set ships modules, or when it only registers a bootstrap', () => {
    expect(emitsHooksJson(HOOK_LAYOUTS.claude, ['read-once'], false)).toBe(true);
    expect(emitsHooksJson(HOOK_LAYOUTS.claude, [], true)).toBe(true);
  });

  it("is false for a layout whose bootstrap slot is a literal empty array and ships nothing", () => {
    expect(emitsHooksJson(HOOK_LAYOUTS['copilot-standalone'], [], true)).toBe(false);
  });

  it('is false when there is no layout at all', () => {
    expect(emitsHooksJson(null, ['read-once'], true)).toBe(false);
  });
});

describe('pluginAssembleHooksJson', () => {
  function frame(spec: Partial<PluginSpec>, targets: string[]): PluginProcessingFrame {
    return {
      spec: spec as PluginSpec,
      vfs: [] as never,
      frames: targets.map((t) => ({
        sourcePath: t, target: t, isBinary: false, target_contents: '{{{hooks_json}}}', source: [],
      })),
      templateContext: { bootstrap_hooks: PAYLOAD, deterministic_hooks: true },
      errors: [],
    };
  }

  it('writes the rendered document into templateContext.hooks_json', () => {
    const p = frame({
      destination: 'rosetta-claude', set: 'rosetta', hookModules: FULL_MODULES,
      hookLayout: HOOK_LAYOUTS.claude, bootstrap: true,
    }, ['hooks/hooks.json.tmpl']);

    const result = pluginAssembleHooksJson(p);
    expect(() => JSON.parse(String(result.templateContext.hooks_json))).not.toThrow();
    expect(result.frames).toHaveLength(1);
  });

  it('drops every hooks template frame for a set that ships no hooks', () => {
    const p = frame({
      destination: 'search-claude', set: 'search', hookModules: [],
      hookLayout: HOOK_LAYOUTS.claude, bootstrap: false,
    }, ['hooks/hooks.json.tmpl', 'rules/policy.md']);

    const result = pluginAssembleHooksJson(p);
    expect(result.frames.map((f) => f.target)).toEqual(['rules/policy.md']);
  });

  it('throws rather than silently shipping an unparseable bootstrap payload', () => {
    const p = frame({
      destination: 'rosetta-claude', set: 'rosetta', hookModules: FULL_MODULES,
      hookLayout: HOOK_LAYOUTS.claude, bootstrap: true,
    }, ['hooks/hooks.json.tmpl']);
    p.templateContext.bootstrap_hooks = '{not json';

    expect(() => pluginAssembleHooksJson(p)).toThrow(/not valid JSON/);
  });
});
