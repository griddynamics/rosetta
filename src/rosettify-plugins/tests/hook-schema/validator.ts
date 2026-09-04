// Hook-schema validator — SUPPORT module for tests/hook-schema/*.test.ts, not itself a test file.
//
// Unit-test-level shape assertions over the per-IDE hooks.json registration schema. Deliberately
// separate from:
//   - the generator-pipeline tests (tests/unit/plugin-processors/**), which exercise the render
//     pipeline against real templates and real template contexts;
//   - the output-tree content gate (plans/issue-315-plugin-sets/verify/ac_hooks_content.py), which
//     asserts inter-document relations over a BUILT tree.
// This module never runs the generator and never writes a hooks.json to disk — every function
// here takes a hand-built in-memory object (or a string, for the raw-template token scan) and
// returns a list of violations (empty = valid).
//
// Sources cited per function: docs/hooks/<ide>.md and FR-HOOK-0005
// (docs/requirements/plugin-generator/FR-HOOK.md).

export type Violation = string;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// ─── Claude Code / Codex — shared shape ─────────────────────────────────────
//
// docs/hooks/claude-code.md:87-107 and docs/hooks/codex.md:86-106: both register
//   { "hooks": { "<PascalEvent>": [ { "matcher": "<pattern>", "hooks": [ {"type":"command","command":"..."} ] } ] } }
// — a bare `{ hooks: {...} }` envelope (no `version` key), PascalCase event names, and every
// event GROUPED under a {matcher, hooks:[...]} wrapper. Rosetta's claude/codex hooks.json.tmpl
// templates (plugins/template-{claude,codex}/**/hooks.json.tmpl) emit exactly this shape.
export function validateClaudeOrCodexDocument(doc: unknown): Violation[] {
  const v: Violation[] = [];
  if (!isPlainObject(doc)) return ['document is not an object'];
  if ('version' in doc) v.push('claude/codex documents carry no "version" key (claude-code.md:87, codex.md:86)');
  if (!isPlainObject(doc.hooks)) {
    v.push('missing top-level "hooks" object');
    return v;
  }
  for (const [eventKey, groups] of Object.entries(doc.hooks)) {
    if (eventKey[0] !== eventKey[0].toUpperCase()) {
      v.push(`event key "${eventKey}" is not PascalCase (claude-code.md:94-107, codex.md:90-104)`);
    }
    if (!Array.isArray(groups)) {
      v.push(`event "${eventKey}": value must be an array of matcher groups`);
      continue;
    }
    for (const [i, group] of groups.entries()) {
      if (!isPlainObject(group) || !Array.isArray(group.hooks)) {
        v.push(`event "${eventKey}"[${i}]: must be a {matcher, hooks:[...]} group — grouped, never flat`);
        continue;
      }
      for (const [j, entry] of group.hooks.entries()) {
        if (!isPlainObject(entry) || entry.type !== 'command' || typeof entry.command !== 'string') {
          v.push(`event "${eventKey}"[${i}].hooks[${j}]: must be {type:"command", command:<string>, ...}`);
        }
      }
    }
  }
  return v;
}

// ─── Copilot — ONE plugin serving ALL variants (VS Code, JetBrains, CLI) ────
//
// docs/hooks/copilot.md:16 ("Register PascalCase keys only... VS Code fires ONLY PascalCase...
// Copilot CLI fires BOTH conventions if both are registered => double-fire"), copilot.md:66-87
// (SessionStart input/output, casing conventions for both runtimes), copilot.md:301-315
// (PreCompact — CLI-only, both casings observed, never PascalCase-registered by Rosetta).
// FR-HOOK-0005 governs the entry shape and the merged additionalContext requirement.
//
// A SINGLE Copilot document is read by every variant: VS Code (and JetBrains, same extension
// family) honor PascalCase event keys and the NESTED hookSpecificOutput.additionalContext; the
// CLI honors camelCase event keys and TOP-LEVEL fields (copilot.md:66-87, and the "merged emit"
// rule at copilot.md:124 / FR-HOOK-0005's AC at FR-HOOK.md:112). A validator that only checked one
// casing convention could not tell "safe for one variant, silently dead for the other" apart from
// "correct" — which is exactly the defect this migration restores (§2.5/§2.6). So this function
// validates a Copilot document against BOTH casing conventions simultaneously and flags a
// grouped-vs-flat mismatch for either.
export function validateCopilotDocument(doc: unknown): Violation[] {
  const v: Violation[] = [];
  if (!isPlainObject(doc)) return ['document is not an object'];
  if (doc.version !== 1) v.push('copilot documents carry "version": 1 (versionedHooks envelope; see #315 restored templates)');
  if (!isPlainObject(doc.hooks)) {
    v.push('missing top-level "hooks" object');
    return v;
  }
  // Flat, camelCase-only events: bootstrap (sessionStart) and the compaction guard (preCompact).
  // Rosetta registers ONLY the camelCase form for these two — see the "currently OFF" note below.
  for (const flatCamelEvent of ['sessionStart', 'preCompact']) {
    if (flatCamelEvent in doc.hooks) {
      const arr = doc.hooks[flatCamelEvent];
      if (!Array.isArray(arr)) {
        v.push(`"${flatCamelEvent}" must be a flat array of entries (copilot.md:66-87, :301) — no {matcher,hooks} wrapper`);
      } else {
        for (const [i, entry] of arr.entries()) {
          if (isPlainObject(entry) && entry.type === 'command' && !('bash' in entry) && !('command' in entry)) {
            v.push(`"${flatCamelEvent}"[${i}]: a "command"-typed entry needs either "command" or "bash"+"powershell"`);
          }
        }
      }
    }
  }
  // Grouped, PascalCase events: the tool-guardrail hooks. Both VS Code and the CLI fire PascalCase
  // (copilot.md:16 — "PascalCase-only serves both and avoids the double-fire").
  for (const groupedPascalEvent of ['PreToolUse', 'PostToolUse']) {
    if (groupedPascalEvent in doc.hooks) {
      const groups = doc.hooks[groupedPascalEvent];
      if (!Array.isArray(groups)) {
        v.push(`"${groupedPascalEvent}" must be an array of {matcher, hooks:[...]} groups`);
        continue;
      }
      for (const [i, group] of groups.entries()) {
        if (!isPlainObject(group) || typeof group.matcher !== 'string' || !Array.isArray(group.hooks)) {
          v.push(`"${groupedPascalEvent}"[${i}]: must be {matcher:<string>, hooks:[...]}`);
          continue;
        }
        for (const [j, entry] of group.hooks.entries()) {
          if (!isPlainObject(entry) || entry.type !== 'command' ||
              typeof entry.bash !== 'string' || typeof entry.powershell !== 'string') {
            v.push(
              `"${groupedPascalEvent}"[${i}].hooks[${j}]: Copilot command entries need BOTH ` +
                `"bash" and "powershell" (FR-HOOK-0005.AC, FR-HOOK.md:111) — a single "command" ` +
                `field does not serve both shells`,
            );
          }
        }
      }
    }
  }
  // Reserved-but-OFF shapes: PascalCase SessionStart / PreCompact. Rosetta deliberately does not
  // register these (owner constraint: Copilot delivers bootstrap through auto-loaded RULES, per
  // FR-VAR-0070 Approved — registering PascalCase SessionStart/PreCompact here would
  // double-deliver instructions the rules already carry). If present, they must still be
  // well-formed by the SAME grouped-vs-flat rules the runtime would apply to them: copilot.md's
  // capability matrix (line 16) says PascalCase SessionStart fires in VS Code+CLI exactly like
  // PreToolUse/PostToolUse — i.e. as a flat bootstrap-shaped array (mirroring the camelCase
  // sessionStart shape, since SessionStart carries no tool matcher), NOT a {matcher,hooks} group.
  for (const reservedPascalEvent of ['SessionStart', 'PreCompact']) {
    if (reservedPascalEvent in doc.hooks) {
      const arr = doc.hooks[reservedPascalEvent];
      if (!Array.isArray(arr)) {
        v.push(`"${reservedPascalEvent}" (reserved/OFF shape) must be a flat array — no tool matcher exists for this event`);
      }
    }
  }
  return v;
}

/**
 * FR-HOOK-0005.AC (FR-HOOK.md:112) / copilot.md:66-87's "merged emit" rule: a Copilot
 * additionalContext payload must carry the SAME body at BOTH the top level (honored by the CLI)
 * AND nested under hookSpecificOutput (honored by VS Code) — neither placement alone reaches both
 * runtimes. This validates the parsed JSON PAYLOAD a session-start/plugin-root entry embeds, not
 * the hooks.json registration document itself.
 */
export function validateCopilotMergedContext(payload: unknown): Violation[] {
  const v: Violation[] = [];
  if (!isPlainObject(payload)) return ['payload is not an object'];
  if (typeof payload.additionalContext !== 'string') {
    v.push('missing top-level "additionalContext" (required for Copilot CLI — copilot.md:66-87)');
  }
  const nested = payload.hookSpecificOutput;
  if (!isPlainObject(nested) || typeof nested.additionalContext !== 'string') {
    v.push('missing nested "hookSpecificOutput.additionalContext" (required for VS Code — copilot.md:66-87)');
  } else if (typeof payload.additionalContext === 'string' && nested.additionalContext !== payload.additionalContext) {
    v.push('top-level and nested additionalContext must carry the SAME body (copilot.md "merged emit")');
  }
  if (isPlainObject(nested) && nested.hookEventName !== 'SessionStart') {
    v.push('nested hookSpecificOutput.hookEventName must be "SessionStart"');
  }
  return v;
}

// ─── Cursor — flat, camelCase, no hookSpecificOutput wrapper ────────────────
//
// docs/hooks/cursor.md:105-122 ("hooks.json registration format"): { "version": 1, "hooks": {
// "<camelEvent>": [ {"command":..., "type":"command", "matcher": "..."} ] } } — entries sit
// DIRECTLY in the event array (no {matcher, hooks:[...]} grouping the way Claude/Codex/Copilot's
// PreToolUse/PostToolUse do); a per-entry "matcher" field is inline instead. cursor.md's Practical
// Conclusion 1: "(!) Output is FLAT snake_case — NO hookSpecificOutput wrapper."
export function validateCursorDocument(doc: unknown): Violation[] {
  const v: Violation[] = [];
  if (!isPlainObject(doc)) return ['document is not an object'];
  if (doc.version !== 1) v.push('cursor documents carry "version": 1 (cursor.md:108)');
  if (!isPlainObject(doc.hooks)) {
    v.push('missing top-level "hooks" object');
    return v;
  }
  for (const [eventKey, entries] of Object.entries(doc.hooks)) {
    if (eventKey[0] !== eventKey[0].toLowerCase()) {
      v.push(`event key "${eventKey}" is not camelCase (cursor.md's event names: sessionStart, preToolUse, ...)`);
    }
    if (!Array.isArray(entries)) {
      v.push(`event "${eventKey}": value must be a FLAT array of entries — no {matcher,hooks} wrapper (cursor.md:105-122)`);
      continue;
    }
    for (const [i, entry] of entries.entries()) {
      if (!isPlainObject(entry)) {
        v.push(`event "${eventKey}"[${i}]: must be an object`);
        continue;
      }
      if ('hooks' in entry) {
        v.push(`event "${eventKey}"[${i}]: must NOT be a {matcher, hooks:[...]} GROUPED entry — Cursor entries are FLAT (cursor.md Practical Conclusion 1)`);
        continue;
      }
      if ('hookSpecificOutput' in entry) {
        v.push(`event "${eventKey}"[${i}]: must NOT carry a hookSpecificOutput wrapper — Cursor reads flat top-level fields only (cursor.md Practical Conclusion 1)`);
      }
      if (typeof entry.command !== 'string') {
        v.push(`event "${eventKey}"[${i}]: must carry a "command" string directly (cursor.md:113, "command" is required)`);
      }
    }
  }
  return v;
}

// ─── Antigravity — two registration shapes in ONE document ──────────────────
//
// docs/hooks/antigravity.md:60-68: registration is `{ "<name>": { "enabled": true, ... } }` — an
// arbitrary top-level key wraps the whole declaration. Tool events (PreToolUse/PostToolUse) are
// WRAPPED ({matcher, hooks:[...]} — like Claude/Codex); non-tool events (PreInvocation,
// PostInvocation, Stop) are a FLAT handler list directly under the event key (like Cursor). Both
// shapes appear in ONE Rosetta document. `SessionStart` is invalid for Antigravity at all
// (antigravity.md:44 — "the CLI rewrites a registered SessionStart to null"); Rosetta's
// antigravity template correctly carries no SessionStart/bootstrap key (FR-VAR-0082).
export function validateAntigravityDocument(doc: unknown): Violation[] {
  const v: Violation[] = [];
  if (!isPlainObject(doc)) return ['document is not an object'];
  const keys = Object.keys(doc);
  if (keys.length !== 1) {
    v.push('antigravity documents wrap everything under exactly one arbitrary top-level key (antigravity.md:60-68)');
    return v;
  }
  const wrapper = doc[keys[0]];
  if (!isPlainObject(wrapper) || wrapper.enabled !== true) {
    v.push('the wrapper object must carry "enabled": true (antigravity.md:66)');
    return v;
  }
  if ('SessionStart' in wrapper) {
    v.push('"SessionStart" is not a valid Antigravity event — the CLI rewrites it to null (antigravity.md:44)');
  }
  const WRAPPED_EVENTS = new Set(['PreToolUse', 'PostToolUse']);
  const FLAT_EVENTS = new Set(['PreInvocation', 'PostInvocation', 'Stop']);
  for (const [eventKey, value] of Object.entries(wrapper)) {
    if (eventKey === 'enabled') continue;
    if (WRAPPED_EVENTS.has(eventKey)) {
      if (!Array.isArray(value) || value.some((g) => !isPlainObject(g) || typeof g.matcher !== 'string' || !Array.isArray(g.hooks))) {
        v.push(`"${eventKey}" must be an array of {matcher, hooks:[...]} groups (antigravity.md:61-64, tool events are wrapped)`);
      }
    } else if (FLAT_EVENTS.has(eventKey)) {
      if (!Array.isArray(value) || value.some((e) => !isPlainObject(e) || e.type !== 'command' || typeof e.command !== 'string')) {
        v.push(`"${eventKey}" must be a FLAT array of {type:"command", command:...} entries — no matcher/hooks wrapper (antigravity.md:65-67)`);
      }
    }
    // An unrecognized event key is not flagged here — antigravity.md documents more events than
    // Rosetta currently uses; this validator only asserts the shape RULE (wrapped vs flat), not
    // an exhaustive event allowlist.
  }
  return v;
}

/**
 * T5 (hooks-architecture.md §1.9/§4): raw-text scan of a hooks.json.tmpl's UNRENDERED source for
 * `<module-name>.js` tokens. Deliberately a regex over template TEXT, not a render — at
 * deterministic_hooks=false the rendered document names no modules at all, yet the bundles those
 * modules come from must still ship (plugin-sync-bundles.ts). Longest-alternative-first is not a
 * concern here because token boundaries are anchored by `.js`, but `read-once` vs
 * `read-once-reset` must still tokenize distinctly, which the `[a-z][a-z0-9-]*\.js` pattern does
 * (greedy, anchored at a non-hyphen/alnum boundary via the preceding path separator or quote).
 */
export function scanModuleTokens(templateText: string): Set<string> {
  const tokens = new Set<string>();
  for (const m of templateText.matchAll(/([a-z][a-z0-9-]*)\.js/g)) {
    tokens.add(m[1]);
  }
  return tokens;
}
