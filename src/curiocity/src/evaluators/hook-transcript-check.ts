import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { z } from 'zod';
import { ConfigError } from '../shared/errors';
import type { EvalContext, EvalResult, Evaluator } from './types';

/**
 * `hook-transcript-check` (§11): prove a Claude Code PLUGIN's OWN hooks fired during
 * the run — as opposed to Curiocity's always-present capture hooks (which fire on
 * every trial and would make a bare "did the event fire" check meaningless).
 *
 * Expected events are derived from the plugin's generated `hooks/hooks.json` (still
 * version-agnostic: no hardcoded event list). Each declared event is checked in ONE of
 * two modes, decided from its own manifest commands — NOT from a fixed event→mode table:
 *
 * 1. **hook_summary mode**: the event's commands include a `.js` script (or otherwise
 *    have no `additionalContext` JSON shape). Claude Code records these as `system`
 *    entries: `{"type":"system","subtype":"<event>_hook_summary","hookInfos":[{"command",...}]}`.
 *    The event PASSES when its `_hook_summary` subtype fired AND (unless
 *    `requireCommands:false`) a fired command matches one of the plugin's own `.js`
 *    signatures — Curiocity's own capture-hook commands never match a plugin signature.
 *
 * 2. **context_injection mode**: the event's commands emit `additionalContext` (a
 *    printf-style JSON payload) and declare no `.js` script. EMPIRICALLY CONFIRMED (real
 *    transcript, see git history for the validation run): such hooks do NOT produce a
 *    `_hook_summary` system entry at all — Claude Code injects their output directly into
 *    the transcript as `type:"attachment"` content instead. `SessionStart` in the live
 *    plugin manifest is exactly this shape today. Detection: extract distinctive
 *    identifier-like tokens from the declared `additionalContext` text and look for them
 *    anywhere in the raw transcript FILE TEXT (not parsed) — attachment entries carry the
 *    injected content verbatim, so a plain substring match is robust to any JSON
 *    re-escaping between the manifest and the transcript.
 *
 * Only `Stop` → `stop_hook_summary` is empirically confirmed for hook_summary mode; other
 * `.js`-bearing events (`PreToolUse`/`PostToolUse`/`PostCompact`) are assumed to follow the
 * same pattern pending further confirmation.
 */
export const hookTranscriptCheckParamsSchema = z.object({
  /** Path to the plugin's `hooks/hooks.json`; relative paths resolve against `ctx.caseDir`. */
  pluginManifest: z.string().min(1),
  /** Declared events that fire only conditionally (e.g. compaction) — not required to fire. */
  ignoreEvents: z.array(z.string()).default(['PostCompact']),
  /** Require the plugin's OWN command to have run for the event, not just the event firing. */
  requireCommands: z.boolean().default(true),
});

/**
 * PascalCase hook event name → the `system` transcript's `subtype` for its summary.
 * Only used for events resolved to hook_summary mode (see module doc). Single choke
 * point for this mapping: ONLY `Stop` → `stop_hook_summary` is empirically confirmed
 * (verified real transcript). The others follow the same snake_case + `_hook_summary`
 * pattern but remain ASSUMED — fix here if a real run shows otherwise.
 */
export function eventToSubtype(event: string): string {
  const snake = event.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  return `${snake}_hook_summary`;
}

interface HooksManifest {
  hooks?: Record<
    string,
    Array<{
      matcher?: string;
      hooks?: Array<{ type?: string; command?: string }>;
    }>
  >;
}

const JS_COMMAND_RE = /[A-Za-z0-9_.-]+\.js(?![A-Za-z0-9])/g;

/** Extract this event's plugin "signatures" from its declared commands: `.js` script
 *  basenames, or the `hookSpecificOutput` token for printf-style hooks with no `.js`.
 *  The `.js` regex uses a negative lookahead so it does NOT fire on the `.js` prefix
 *  inside `.json` (e.g. `foo.json` must NOT yield a phantom `foo.js` signature).
 *  `hookSpecificOutput` is chosen over the broader `additionalContext`: it is present
 *  in the plugin's printf bootstrap yet absent from Curiocity's `cat >` capture hook. */
export function signaturesForCommands(commands: string[]): string[] {
  const sigs = new Set<string>();
  for (const cmd of commands) {
    const jsMatches = cmd.match(JS_COMMAND_RE);
    if (jsMatches && jsMatches.length > 0) {
      for (const m of jsMatches) sigs.add(m);
    } else if (cmd.includes('hookSpecificOutput')) {
      sigs.add('hookSpecificOutput');
    }
  }
  return [...sigs];
}

/** Structural/JSON-protocol vocabulary that sits right next to `additionalContext` in
 *  EVERY printf-style hook payload — these must never count as a "distinctive" plugin
 *  token, or context-injection detection would spuriously match ANY context-injecting
 *  hook (including Curiocity's own), defeating the point of fingerprinting THIS plugin's
 *  own content. */
const STRUCTURAL_TOKEN_DENYLIST = new Set([
  'hookSpecificOutput',
  'hookEventName',
  'additionalContext',
  'SessionStart',
  'PreToolUse',
  'PostToolUse',
  'PostCompact',
  'UserPromptSubmit',
  'SubagentStop',
  'Notification',
]);

/** Identifier-like tokens (at least 8 chars) worth treating as a distinctive fingerprint. */
const TOKEN_RE = /[A-Za-z][A-Za-z0-9_]{7,}/g;

const PRINTF_PAYLOAD_RE = /printf\s+'%s'\s+(['"])([\s\S]*)\1\s*$/;

/** Best-effort extraction of the `additionalContext` STRING VALUE from a printf-style
 *  hook command's JSON payload. Tries a strict `JSON.parse` of the printf argument first
 *  (works whenever the content has no embedded shell-quoting idioms); falls back to
 *  treating everything after the `additionalContext` key as the "value area" when strict
 *  parsing fails (e.g. a bash `'\''` embedded-apostrophe idiom breaks JSON's escape
 *  grammar) — the token regex below only cares about identifier-shaped substrings, so
 *  trailing JSON punctuation picked up by the permissive fallback is harmless. */
function extractAdditionalContextValue(cmd: string): string | undefined {
  const m = cmd.match(PRINTF_PAYLOAD_RE);
  if (m) {
    try {
      const parsed = JSON.parse(m[2]) as {
        hookSpecificOutput?: { additionalContext?: unknown };
      };
      const val = parsed.hookSpecificOutput?.additionalContext;
      if (typeof val === 'string') return val;
    } catch {
      // Shell-quoting artifacts defeated strict parsing — fall through below.
    }
  }
  const keyIdx = cmd.indexOf('additionalContext');
  if (keyIdx === -1) return undefined;
  return cmd.slice(keyIdx + 'additionalContext'.length);
}

/** Collect up to 5 distinctive identifier-like tokens (preferring underscore-bearing
 *  ones, then longest) from the plugin's declared `additionalContext` payload(s) for an
 *  event — the fingerprint used by context-injection-mode detection (see module doc). */
export function additionalContextSignatures(commands: string[]): string[] {
  const found = new Set<string>();
  for (const cmd of commands) {
    const value = extractAdditionalContextValue(cmd);
    if (value === undefined) continue;
    for (const tok of value.match(TOKEN_RE) ?? []) {
      if (!STRUCTURAL_TOKEN_DENYLIST.has(tok)) found.add(tok);
    }
  }
  return [...found]
    .sort((a, b) => {
      const aUnderscore = a.includes('_') ? 1 : 0;
      const bUnderscore = b.includes('_') ? 1 : 0;
      if (aUnderscore !== bUnderscore) return bUnderscore - aUnderscore;
      return b.length - a.length;
    })
    .slice(0, 5);
}

type EventMode = 'hook_summary' | 'context_injection' | 'context_injection_indeterminate';

interface EventPlan {
  mode: EventMode;
  /** hook_summary mode: plugin command signatures to match against fired hookInfos[].command. */
  signatures: string[];
  /** context_injection mode: distinctive additionalContext tokens to find in the raw transcript text. */
  contextTokens: string[];
}

/** Decide detection mode for ONE declared event from its own manifest commands — no
 *  hardcoded event→mode table (stays version-agnostic across plugin releases):
 *  - Any `.js` command → hook_summary mode (a real subprocess; Claude Code reports it
 *    via a `_hook_summary` system entry).
 *  - No `.js`, but the command emits `additionalContext` (printf-style JSON payload) →
 *    context_injection mode: fingerprint via extracted tokens, or `indeterminate` when no
 *    token could be extracted (never false-fail on our OWN extraction limitation).
 *  - Otherwise (arbitrary command, no `.js`, no `additionalContext`) → hook_summary mode
 *    with an empty signature set (the pre-existing "fired-only" fallback: we can't
 *    fingerprint the command, but a real subprocess still reports a `_hook_summary`). */
function planEvent(commands: string[]): EventPlan {
  const hasJs = commands.some((cmd) => {
    JS_COMMAND_RE.lastIndex = 0;
    return JS_COMMAND_RE.test(cmd);
  });
  if (hasJs) {
    return { mode: 'hook_summary', signatures: signaturesForCommands(commands), contextTokens: [] };
  }
  const looksLikeContextInjection = commands.some((cmd) => cmd.includes('additionalContext'));
  if (looksLikeContextInjection) {
    const contextTokens = additionalContextSignatures(commands);
    return contextTokens.length > 0
      ? { mode: 'context_injection', signatures: [], contextTokens }
      : { mode: 'context_injection_indeterminate', signatures: [], contextTokens: [] };
  }
  return { mode: 'hook_summary', signatures: signaturesForCommands(commands), contextTokens: [] };
}

/** Build `event -> EventPlan` from the parsed manifest. */
function declaredEventsFromManifest(manifest: HooksManifest): Map<string, EventPlan> {
  const declared = new Map<string, EventPlan>();
  for (const [event, groups] of Object.entries(manifest.hooks ?? {})) {
    const commands: string[] = [];
    for (const group of groups ?? []) {
      for (const hook of group.hooks ?? []) {
        if (typeof hook.command === 'string') commands.push(hook.command);
      }
    }
    declared.set(event, planEvent(commands));
  }
  return declared;
}

interface HookSummaryLine {
  type?: string;
  subtype?: string;
  hookInfos?: Array<{ command?: string }>;
}

/** Parse the raw transcript JSONL, collecting `subtype -> fired commands[]` for every
 *  `*_hook_summary` system entry. Blank/unparseable lines are ignored. Also reports
 *  `systemLines` (count of `type==='system'` entries) so the caller's loud guard can
 *  distinguish "no system lines at all" from "system lines but none matched the summary
 *  shape" (the latter signals the assumed hook-capture format has drifted). */
function firedBySubtypeFromTranscript(raw: string): {
  fired: Map<string, string[]>;
  systemLines: number;
} {
  const fired = new Map<string, string[]>();
  let systemLines = 0;
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    let parsed: HookSummaryLine;
    try {
      parsed = JSON.parse(trimmed) as HookSummaryLine;
    } catch {
      continue;
    }
    if (parsed.type !== 'system') continue;
    systemLines++;
    if (typeof parsed.subtype !== 'string' || !parsed.subtype.endsWith('_hook_summary')) continue;
    const commands = (parsed.hookInfos ?? [])
      .map((h) => h.command)
      .filter((c): c is string => typeof c === 'string');
    const existing = fired.get(parsed.subtype) ?? [];
    fired.set(parsed.subtype, [...existing, ...commands]);
  }
  return { fired, systemLines };
}

const zeroMetrics = (): EvalResult['metrics'] => [
  { name: 'hook_events_declared', value: 0 },
  { name: 'hook_events_checked', value: 0 },
  { name: 'hook_events_fired', value: 0 },
  { name: 'hook_events_plugin_matched', value: 0 },
];

export const hookTranscriptCheck: Evaluator = {
  id: 'hook-transcript-check',
  paramsSchema: hookTranscriptCheckParamsSchema,

  async evaluate(ctx: EvalContext, params: unknown): Promise<EvalResult> {
    const p = hookTranscriptCheckParamsSchema.parse(params);

    const manifestPath =
      isAbsolute(p.pluginManifest) || ctx.caseDir === undefined
        ? p.pluginManifest
        : resolve(ctx.caseDir, p.pluginManifest);

    let manifest: HooksManifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as HooksManifest;
    } catch (err) {
      throw new ConfigError(
        `hook-transcript-check: could not read/parse plugin manifest "${manifestPath}": ${(err as Error).message}`,
      );
    }

    const declaredEvents = declaredEventsFromManifest(manifest);

    if (ctx.rawTranscriptPath === undefined || !existsSync(ctx.rawTranscriptPath)) {
      return {
        pass: false,
        gate: false,
        details: 'no raw transcript available',
        metrics: zeroMetrics(),
      };
    }

    const raw = readFileSync(ctx.rawTranscriptPath, 'utf8');
    const { fired: firedBySubtype, systemLines } = firedBySubtypeFromTranscript(raw);

    const checkedEvents = [...declaredEvents.keys()].filter((e) => !p.ignoreEvents.includes(e));

    // LOUD GUARD: if we have hook_summary-MODE events to check but recognized ZERO
    // `*_hook_summary` entries, the transcript's hook-capture shape almost certainly
    // differs from the one we assume — fail LOUDLY rather than silently reporting every
    // event as "did not fire" (which would look like a real product bug). This must NOT
    // fire when every checked event resolved to context_injection mode: those legitimately
    // produce no `_hook_summary` entry at all (confirmed empirically for `SessionStart` —
    // its output is injected as `attachment` content instead), so zero summaries is the
    // NORMAL, expected shape for them, not a format drift.
    const hookSummaryModeCheckedEvents = checkedEvents.filter(
      (e) => declaredEvents.get(e)?.mode === 'hook_summary',
    );
    if (hookSummaryModeCheckedEvents.length > 0 && firedBySubtype.size === 0) {
      return {
        pass: false,
        gate: false,
        details:
          `no *_hook_summary entries recognized in transcript (saw ${systemLines} system-type ` +
          `line(s)) — hook-capture format may differ from the assumed shape; expected events: ` +
          `[${checkedEvents.join(', ')}]`,
        metrics: [
          { name: 'hook_events_declared', value: declaredEvents.size },
          { name: 'hook_events_checked', value: checkedEvents.length },
          { name: 'hook_events_fired', value: 0 },
          { name: 'hook_events_plugin_matched', value: 0 },
        ],
      };
    }

    let firedCount = 0;
    let matchedCount = 0;
    const lines: string[] = [];
    let pass = true;

    for (const event of checkedEvents) {
      const plan = declaredEvents.get(event) ?? { mode: 'hook_summary' as const, signatures: [], contextTokens: [] };

      if (plan.mode === 'context_injection_indeterminate') {
        // We know this hook injects `additionalContext` but couldn't extract a token to
        // fingerprint it (and it produces no `_hook_summary` to fall back on) — this is a
        // limitation of OUR extraction, not evidence the hook didn't fire, so never fail it.
        lines.push(`${event}: indeterminate (context-injecting hook, no extractable plugin token — not failed)`);
        continue;
      }

      if (plan.mode === 'context_injection') {
        const matchedToken = plan.contextTokens.find((tok) => raw.includes(tok));
        const fired = matchedToken !== undefined;
        if (fired) {
          firedCount++;
          matchedCount++;
          lines.push(`${event}: fired+matched (context-injection token "${matchedToken}")`);
        } else {
          pass = false;
          lines.push(`${event}: did not fire (no plugin context-injection token found in transcript)`);
        }
        continue;
      }

      // hook_summary mode (existing behavior, unchanged).
      const signatures = plan.signatures;
      const subtype = eventToSubtype(event);
      const firedCommands = firedBySubtype.get(subtype);
      const fired = firedCommands !== undefined;
      // When an event declares NO extractable signature (arbitrary hook command shape —
      // no `.js`, no recognizable token), we cannot verify WHICH command ran, so we fall
      // back to "fired-only": firing alone counts as matched. Otherwise a legitimately
      // fired hook we simply can't fingerprint would silently fail under requireCommands.
      const hasSignatures = signatures.length > 0;
      const pluginMatched = fired
        ? hasSignatures
          ? firedCommands.some((cmd) => signatures.some((sig) => cmd.includes(sig)))
          : true
        : false;

      if (fired) firedCount++;
      if (pluginMatched) matchedCount++;

      const eventPasses = fired && (p.requireCommands ? pluginMatched : true);
      if (!eventPasses) pass = false;

      if (!fired) {
        lines.push(`${event}: did not fire`);
      } else if (!hasSignatures) {
        lines.push(`${event}: fired (no extractable plugin signature to verify command)`);
      } else if (p.requireCommands && !pluginMatched) {
        lines.push(`${event}: FIRED but no plugin command matched`);
      } else {
        lines.push(`${event}: fired+matched`);
      }
    }

    return {
      pass,
      gate: false,
      details: lines.join('; ') || 'no events to check',
      metrics: [
        { name: 'hook_events_declared', value: declaredEvents.size },
        { name: 'hook_events_checked', value: checkedEvents.length },
        { name: 'hook_events_fired', value: firedCount },
        { name: 'hook_events_plugin_matched', value: matchedCount },
      ],
    };
  },
};
