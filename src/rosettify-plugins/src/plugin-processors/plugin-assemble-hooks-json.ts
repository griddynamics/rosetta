// DATA-CFG-0008 — assemble the complete hooks.json document from set data + the target's layout.
//
// Replaces the trailing-comma template idiom (`]{{#if deterministic_hooks}},{{/if}}`) that six
// near-duplicate hooks.json.tmpl files relied on for JSON validity. Serializing with
// JSON.stringify makes malformed output structurally impossible; the remaining templates carry a
// single `{{{hooks_json}}}` placeholder.
//
// No branching on target or set identity: the per-IDE shape comes from spec.hookLayout (a value
// looked up in the HOOK_LAYOUTS table) and the per-set content from spec.hookModules /
// spec.bootstrap. FR-ARCH-0005.

import { updatePluginFrame } from '../frames.js';
import type { PluginProcessingFrame } from '../types.js';
import type { HookBinding, HookLayout } from '../spec/hook-layouts.js';

/** Marker the templates render: `{ "…": {{{hooks_json}}} }` is not used — the whole file is this. */
export const HOOKS_JSON_KEY = 'hooks_json';

/**
 * True when this spec emits a hooks.json at all. A set with no hook modules and no bootstrap
 * ships neither a `hooks/` folder nor a `hooks.json`, so its hooks template frame is dropped
 * rather than rendered to an empty shell.
 */
export function emitsHooksJson(
  layout: HookLayout | null,
  hookModules: string[],
  bootstrap: boolean,
): boolean {
  if (!layout) return false;
  if (hookModules.length > 0) return true;
  // A layout whose bootstrap slot is a literal empty array contributes no content on its own.
  return bootstrap && layout.bootstrap?.payload === 'inject';
}

/**
 * Build the hooks document for one spec.
 * `bootstrapPayload` is the already-assembled payload fragment (the string the bootstrap
 * assemblers used to write into `templateContext.bootstrap_hooks`), or '' when there is none.
 */
export function buildHooksDocument(
  layout: HookLayout,
  hookModules: string[],
  bootstrap: boolean,
  destination: string,
  bootstrapPayload: string,
  deterministicHooks: boolean,
): Record<string, unknown> {
  const events: Record<string, unknown[]> = {};

  const push = (event: string, value: unknown): void => {
    (events[event] ??= []).push(value);
  };

  // Bootstrap slot first: it is always the leading event in every layout that has one, and object
  // key order is insertion order.
  const bs = layout.bootstrap;
  if (bs) {
    if (bs.payload === 'empty') {
      events[bs.event] ??= [];
    } else if (bootstrap) {
      const entries = parsePayloadEntries(bootstrapPayload);
      if (entries.length > 0) {
        if (bs.flat) {
          for (const e of entries) push(bs.event, e);
        } else {
          push(bs.event, { matcher: bs.matcher ?? '', hooks: entries });
        }
      }
    }
  }

  // The advisory/guardrail hook bindings are gated on deterministic_hooks, exactly as the
  // `{{#if deterministic_hooks}}` block in the previous templates gated them. The bootstrap slot
  // above is NOT gated — it rendered outside that block before, and still does.
  const shipped = new Set(deterministicHooks ? hookModules : []);

  for (const binding of layout.bindings) {
    // A set ships exactly the modules its hooks list names; a binding left with none is dropped.
    const modules = binding.modules.filter((m) => shipped.has(m));
    if (modules.length === 0) continue;

    const entries = modules.map((m) => layout.entry(m, destination));

    if (binding.flat) {
      for (const entry of entries) {
        push(binding.event, withMatcher(binding, entry));
      }
    } else {
      push(binding.event, { matcher: binding.matcher ?? '', hooks: entries });
    }
  }

  return layout.envelope(events);
}

/** Flat entries carry their matcher inline (Cursor's shape) rather than in a wrapping group. */
function withMatcher(binding: HookBinding, entry: Record<string, unknown>): Record<string, unknown> {
  return binding.matcher === undefined ? entry : { matcher: binding.matcher, ...entry };
}

/**
 * The bootstrap assemblers produce a payload as a COMMA-JOINED LIST of JSON object literals
 * (`assembleBootstrapPayload` ends with `entryStrings.join(', ')`), because it was destined for a
 * `[{{{bootstrap_hooks}}}]` template slot. Wrapping it in brackets recovers the array so it can be
 * embedded structurally. An unparseable payload is a real defect — the entry builders emit
 * JSON.stringify output — so it throws rather than silently shipping no bootstrap.
 */
function parsePayloadEntries(payload: string): unknown[] {
  const trimmed = payload.trim();
  if (trimmed === '') return [];
  try {
    return JSON.parse(`[${trimmed}]`) as unknown[];
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Assembled bootstrap payload is not valid JSON: ${reason}`);
  }
}

/**
 * pluginAssembleHooksJson: write the rendered hooks document into templateContext.hooks_json, or
 * drop the hooks template frames entirely when this set ships no hooks.
 *
 * Runs after the bootstrap assembler (which supplies the payload) and before
 * pluginRenderTemplates (which substitutes the placeholder).
 */
export function pluginAssembleHooksJson(p: PluginProcessingFrame): PluginProcessingFrame {
  const { spec } = p;
  const layout = spec.hookLayout;

  if (!emitsHooksJson(layout, spec.hookModules, spec.bootstrap)) {
    // Drop every hooks template frame: no hooks.json reaches the output for this set.
    const kept = p.frames.filter((f) => !f.target.endsWith('hooks.json.tmpl'));
    if (kept.length === p.frames.length) return p;
    return updatePluginFrame(p, (draft) => {
      draft.frames = kept as typeof draft.frames;
    });
  }

  const doc = buildHooksDocument(
    layout as HookLayout,
    spec.hookModules,
    spec.bootstrap,
    spec.destination,
    String(p.templateContext.bootstrap_hooks ?? ''),
    p.templateContext.deterministic_hooks === true,
  );

  return updatePluginFrame(p, (draft) => {
    draft.templateContext = {
      ...draft.templateContext,
      [HOOKS_JSON_KEY]: JSON.stringify(doc, null, 2),
    };
  });
}
