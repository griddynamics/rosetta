// DATA-CFG-0004, FR-COPY-0020–0022, MODEL.md — model normalization for 4 IDE vocabularies
// Decoded from baseline agents/TEMP/old-gen-r2/<target>/agents/*
//
// FR-ARCH-0059: PluginSpec.modelVocabulary is the SOLE live carrier of the effective map. The 4
// normalize*() functions below take (field, map, exhaustive?) — no module-level map lookups inside
// them. `exhaustive` is a genuine behavior flag (FR-ARCH-0005), not an identity discriminant: every
// function runs the identical single-loop scan regardless of target; `exhaustive` only selects which
// outcome terminates that scan when no candidate token maps. Omitted/false ⇒ byte-identical to the
// pre-refactor built-in behavior (each vocabulary's own no-survivor idiom, preserved below).
// FR-PROF-0011: exhaustive ⇒ a selected candidate absent from `map` is SKIPPED, scan continues to the
// next candidate; scan exhausted with no survivor ⇒ MODEL_DROP (imported from ../types.js — the
// sentinel meaning "remove the model: line"; NOT redeclared here).

import type { ModelVocabulary } from '../types.js';
import { MODEL_DROP } from '../types.js';

function hasKey(map: Record<string, string>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(map, key);
}

const EFFORT_SUFFIXES = ['xhigh', 'high', 'medium', 'low'] as const;

/**
 * Map each base token AND every effort-qualified form of it (`<base>-xhigh|high|medium|low`) to one
 * value. Authors write effort-qualified tokens in `model:` lists; a map that names only the bare form
 * leaves the qualified one unmapped, and Cursor/Copilot then pass it through raw (a `claude-sonnet-5-medium`
 * Cursor model id does not exist). Generating the forms keeps the maps complete by construction.
 */
function effortForms(bases: readonly string[], value: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const base of bases) {
    out[base] = value;
    for (const effort of EFFORT_SUFFIXES) out[`${base}-${effort}`] = value;
  }
  return out;
}

/**
 * Codex variant: the mapped value keeps (or, when `bump` is set, raises by one step) the effort of the
 * source token, because normalizeCodex() effort-splits the value afterwards. A bare key maps to a bare
 * value — no default effort is ever substituted (FR-ARCH-0057).
 */
function codexEffortForms(bases: readonly string[], target: string, bump: boolean): Record<string, string> {
  const raised: Record<string, string> = { low: 'medium', medium: 'high', high: 'xhigh', xhigh: 'xhigh' };
  const out: Record<string, string> = {};
  for (const base of bases) {
    out[base] = target;
    for (const effort of EFFORT_SUFFIXES) out[`${base}-${effort}`] = `${target}-${bump ? raised[effort] : effort}`;
  }
  return out;
}

// ─── Low-level per-token selection+lookup helpers ─────────────────────────────
// Extracted so S7 (plugin-normalize-subagent-model.ts, FR-COPY-0083) reuses the SAME
// compatibility-test / key-derivation / effort-split logic rather than reimplementing it
// (FR-COPY-0083, FR-COPY-0084). Each normalize*() function below is built on these.

/**
 * Claude-compatible test (FR-COPY-0020): starts with "claude-" OR contains opus/sonnet/haiku
 * (case-insensitive substring, not anchored — CONTRADICTION-1).
 */
export function isClaudeCompatibleToken(token: string): boolean {
  const lower = token.toLowerCase();
  return (
    lower.startsWith('claude-') ||
    lower.includes('opus') ||
    lower.includes('sonnet') ||
    lower.includes('haiku')
  );
}

/**
 * Derive the Claude family key (opus/sonnet/haiku) from a claude-compatible token via substring
 * containment. Returns null when the token is claude-prefixed but carries no tier substring.
 */
export function claudeFamilyKey(token: string): 'opus' | 'sonnet' | 'haiku' | null {
  const lower = token.toLowerCase();
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('sonnet')) return 'sonnet';
  if (lower.includes('haiku')) return 'haiku';
  return null;
}

/**
 * Resolve one claude-compatible token against a Claude-vocabulary map: EXACT source token first,
 * then the derived family key. Returns null when neither is present.
 *
 * The exact-token tier exists because family keying alone cannot express a model VERSION: every
 * opus token collapses to the single `opus` key, so a map keyed only by family can name exactly one
 * opus. An exact key lets a specific source token (`claude-5-opus-high`) resolve to a specific model
 * id while every other opus token keeps resolving through `opus`. Exact-first, never family-first —
 * the specific statement must win over the general one.
 *
 * Shared by normalizeClaude and claudeSubagentModelTokenMapper (FR-COPY-0083 requires the two
 * surfaces use the same selection/lookup logic rather than parallel implementations).
 */
export function claudeLookup(token: string, map: Record<string, string>): string | null {
  if (hasKey(map, token)) return map[token];
  const key = claudeFamilyKey(token);
  if (key !== null && hasKey(map, key)) return map[key];
  return null;
}

/** Codex-compatible test (FR-COPY-0022): starts with "gpt-" (case-insensitive). */
export function isCodexToken(token: string): boolean {
  return token.toLowerCase().startsWith('gpt-');
}

/**
 * Split a trailing "-<effort>" (xhigh|high|medium|low) suffix off a model id.
 * `effort` is undefined when the id carries no such suffix. FR-COPY-0022.
 */
export function splitCodexEffort(token: string): CodexModelResult {
  const effortMatch = token.match(/^(.+)-(?:(xhigh|high|medium|low))$/);
  if (effortMatch) {
    return { model: effortMatch[1], effort: effortMatch[2] };
  }
  return { model: token, effort: undefined };
}

// ─── Claude vocabulary (FR-COPY-0020, PARITY-9) ──────────────────────────────
// Scan all comma-split tokens for first claude-compatible one.
// NOT first-overall (CONTRADICTION-1). Family key derived via claudeFamilyKey(); map[key] is the
// lookup — built-in map is keyed by family (opus/sonnet/haiku); a profile block is keyed the same.

// FR-COPY-0021 — Claude Code full model IDs; update here when models change
const CLAUDE_CODE_MAP: Record<string, string> = {
  // Family keys — the default for any opus/sonnet/haiku token that names no exact entry below.
  opus: 'claude-opus-5-5',
  sonnet: 'claude-sonnet-5-5',
  haiku: 'claude-haiku-5-5',
  // Exact source tokens, consulted BEFORE the family keys (claudeLookup). A superseded token resolves
  // FORWARD (FR-ARCH-0057): `claude-opus-5` and its spellings are not pinned to Opus 5, they follow the
  // tier to its current model like every other opus token, so these entries agree with the family key.
  // Their remaining value is version pinning for the CURRENT model: an author who writes
  // `claude-opus-5-5` explicitly keeps getting Opus 5.5 even if the family default (`opus`) later moves
  // to a newer model. Adding an exact key changes nothing for any other token — only a byte-equal
  // source token hits it.
  'claude-5-opus-high': 'claude-opus-5-5',
  'claude-5-opus': 'claude-opus-5-5',
  'claude-opus-5': 'claude-opus-5-5',
  'claude-opus-5-high': 'claude-opus-5-5',
  'claude-opus-5-5': 'claude-opus-5-5',
  'claude-opus-5-5-high': 'claude-opus-5-5',
};

/**
 * normalizeClaude — FR-ARCH-0059: map/exhaustive are the sole model-vocabulary input, sourced from
 * `ctx.spec.modelVocabulary`. Selection strategy UNCHANGED: scans all comma tokens for the first
 * claude-compatible one (not first-overall). Non-exhaustive (exhaustive omitted/false) is
 * byte-identical to pre-refactor behavior: unknown family/no-tier-substring ⇒ 'inherit'; no
 * claude-compatible token at all ⇒ null. Exhaustive (FR-PROF-0011): a claude-compatible candidate
 * whose family key is absent from `map` is SKIPPED, scan continues to the next candidate; scan
 * exhausted with no survivor ⇒ MODEL_DROP.
 */
export function normalizeClaude(
  modelField: string,
  map: Record<string, string>,
  exhaustive?: boolean,
): string | null | typeof MODEL_DROP {
  const tokens = modelField.split(',').map((t) => t.trim());
  let foundClaudeToken = false;
  for (const token of tokens) {
    if (!isClaudeCompatibleToken(token)) continue;
    foundClaudeToken = true;
    const resolved = claudeLookup(token, map);
    if (resolved !== null) {
      return resolved;
    }
    // Key absent (or no tier substring at all): non-exhaustive ⇒ this claude-compatible token is
    // 'inherit'-eligible (a claude token with a tier key absent from a NON-exhaustive built-in map
    // cannot occur — the built-in map is complete). Exhaustive ⇒ skip, continue the scan.
    if (!exhaustive) {
      return 'inherit';
    }
  }
  return exhaustive ? MODEL_DROP : (foundClaudeToken ? 'inherit' : null);
}

// ─── Cursor vocabulary (FR-COPY-0021) ─────────────────────────────────────────
// Selection strategy UNCHANGED: takes the FIRST comma-split token — intentional multi-vendor
// ordering design (FR-ARCH-0046): authors order tokens so the desired Cursor/Copilot model appears
// first; single-vendor runtimes (Claude, Codex) scan past it to their own compatible token.
// Non-exhaustive resolves on the first token every time (map[first] ?? first), so this reproduces
// today's strict-first behavior byte-for-byte. Exhaustive: an unmapped first token is skipped and
// the scan continues to subsequent tokens (FR-PROF-0011).

const CURSOR_CLAUDE_MAP: Record<string, string> = {
  // Every spelling (and effort-qualified form) of a superseded or current Claude token resolves to the
  // current model of its own tier — FORWARD, never pinned (FR-ARCH-0057). Cursor-native spellings
  // (`claude-4.8-opus`, `claude-5-sonnet`) and the dash forms (`claude-opus-4-8`, `claude-opus-5-5`) are both keyed.
  ...effortForms(
    ['claude-4.8-opus', 'claude-opus-4-8', 'claude-4.7-opus', 'claude-opus-4-7', 'claude-opus-4-6',
     'claude-5-opus', 'claude-opus-5', 'claude-opus-5-5'],
    'claude-opus-5-5',
  ),
  ...effortForms(
    ['claude-4.6-sonnet', 'claude-5-sonnet', 'claude-sonnet-4-6', 'claude-sonnet-5', 'claude-sonnet-5-5'],
    'claude-sonnet-5-5',
  ),
  ...effortForms(['claude-4.5-haiku', 'claude-haiku-4-5', 'claude-haiku-5-5'], 'claude-haiku-5-5'),
};

// GPT tiers on Cursor. A source token absent from this map is dropped from `subagent_required_model`
// and passed through raw if it lands first in a `model:` list, so every form the instruction set uses
// (bare and effort-qualified) is keyed. Cursor ids carry no effort, so tiers that differ only by
// effort collapse: gpt-5.6-terra / 5.4 / 5.3 (the former workhorse) and gpt-5.6-luna / 5.4-mini all
// resolve to gpt-6-luna; the old sol tier (5.6-sol, 5.5) resolves to gpt-6.1-sol.
const CURSOR_GPT_MAP: Record<string, string> = {
  ...effortForms(['gpt-6.1-sol', 'gpt-5.6-sol', 'gpt-5.5'], 'gpt-6.1-sol'),
  ...effortForms(
    ['gpt-6-luna', 'gpt-5.6-luna', 'gpt-5.4-mini', 'gpt-5.6-terra', 'gpt-5.4', 'gpt-5.3', 'gpt-5.3-codex'],
    'gpt-6-luna',
  ),
};

// Gemini on Cursor: the Pro tier resolves to gemini-4-argon (the current Pro-tier model) and every other
// Gemini token to gemini-3.8-flash (FR-ARCH-0057). Superseded Pro keys are retained and resolve FORWARD.
// Argon has no effort in its id, so every effort form of each Pro-tier base token is keyed (a token such as
// `gemini-4-argon-high` is authored in `subagent_required_model` lists and is dropped when unmapped).
const CURSOR_GEMINI_MAP: Record<string, string> = {
  ...effortForms(
    ['gemini-4-argon', 'gemini-3.1-pro', 'gemini-3.1-pro-preview', 'gemini-3-pro', 'gemini-3-pro-preview'],
    'gemini-4-argon',
  ),
  ...effortForms(['gemini-3.8-flash', 'gemini-3.7-flash'], 'gemini-3.8-flash'),
  'gemini-3.5-flash': 'gemini-3.8-flash',
  'gemini-3-flash': 'gemini-3.8-flash',
  'gemini-3-flash-preview': 'gemini-3.8-flash',
};

const CURSOR_GROK_MAP: Record<string, string> = {
  ...effortForms(['grok-4.7', 'grok-4.6'], 'grok-4.7'),
  // Older grok tokens upgrade forward, same idiom as GPT above: same cost, better model, so a legacy
  // token resolves forward rather than pinning a superseded version. The instruction set no longer
  // authors grok-4.5; this entry keeps an older or third-party layer resolving correctly.
  'grok-4.5': 'grok-4.7',
};

const CURSOR_COMPOSER_MAP: Record<string, string> = {
  'composer-2.5': 'composer-2.5',
};

/**
 * normalizeCursor — FR-ARCH-0059: map/exhaustive sourced from `ctx.spec.modelVocabulary`. Selection
 * strategy UNCHANGED (first token). Non-exhaustive: `map[first] ?? first` (byte-identical passthrough
 * for an unmapped token). Exhaustive (FR-PROF-0011): unmapped candidate skipped, scan continues;
 * exhausted with no survivor ⇒ MODEL_DROP.
 */
export function normalizeCursor(
  modelField: string,
  map: Record<string, string>,
  exhaustive?: boolean,
): string | null | typeof MODEL_DROP {
  const tokens = modelField.split(',').map((t) => t.trim());
  for (const token of tokens) {
    // Empty leading token (e.g. "" or ", gpt-5.4"): non-exhaustive keeps today's byte-identical
    // "no first token" result (null), never falling through to a later token — the strict-first
    // contract holds even when the first slot is blank. Exhaustive treats a blank token like any
    // other non-survivor: skip it and keep scanning (FR-PROF-0011), so ", gpt-5.4" still resolves.
    if (!token) {
      if (exhaustive) continue;
      return null;
    }
    if (hasKey(map, token)) return map[token];
    if (!exhaustive) return token; // passthrough — always resolves on the first token here
  }
  return exhaustive ? MODEL_DROP : null;
}

// ─── Copilot vocabulary (FR-COPY-0021) ────────────────────────────────────────
// Same selection strategy and exhaustive semantics as Cursor (FR-ARCH-0046). Decoded from baseline
// core-copilot/agents/*.agent.md.

const COPILOT_CLAUDE_MAP: Record<string, string> = {
  ...effortForms(
    ['claude-4.8-opus', 'claude-opus-4-8', 'claude-4.7-opus', 'claude-opus-4-7', 'claude-opus-4-6',
     'claude-5-opus', 'claude-opus-5', 'claude-opus-5-5'],
    'Claude Opus 5.5',
  ),
  ...effortForms(
    ['claude-4.6-sonnet', 'claude-5-sonnet', 'claude-sonnet-4-6', 'claude-sonnet-5', 'claude-sonnet-5-5'],
    'Claude Sonnet 5.5',
  ),
  ...effortForms(['claude-4.5-haiku', 'claude-haiku-4-5', 'claude-haiku-5-5'], 'Claude Haiku 5.5'),
};

// GPT tiers on Copilot — same collapse as the Cursor map above (display names carry no effort).
const COPILOT_GPT_MAP: Record<string, string> = {
  ...effortForms(['gpt-6.1-sol', 'gpt-5.6-sol', 'gpt-5.5'], 'GPT-6.1 Sol'),
  ...effortForms(
    ['gpt-6-luna', 'gpt-5.6-luna', 'gpt-5.4-mini', 'gpt-5.6-terra', 'gpt-5.4', 'gpt-5.3', 'gpt-5.3-codex'],
    'GPT-6 Luna',
  ),
};

// Same Pro-tier split as CURSOR_GEMINI_MAP, as Copilot display names.
const COPILOT_GEMINI_MAP: Record<string, string> = {
  ...effortForms(
    ['gemini-4-argon', 'gemini-3.1-pro', 'gemini-3.1-pro-preview', 'gemini-3-pro', 'gemini-3-pro-preview'],
    'Gemini 4 Argon',
  ),
  ...effortForms(['gemini-3.8-flash', 'gemini-3.7-flash'], 'Gemini 3.8 Flash'),
  // FR-ARCH-0057 key-retention invariant: a superseded token keeps its key and resolves FORWARD to
  // the current model of its own cost tier. CURSOR_GEMINI_MAP has carried gemini-3.5-flash since the
  // forward-upgrade rewrite; Copilot's omission was the only unexplained asymmetry between the two
  // vocabularies (the missing grok-*/composer-* keys are deliberate — see the note above
  // COPILOT_VOCABULARY). Value is `Gemini 3.8 Flash`, NOT the superseded model: pinning it on Copilot
  // while Cursor upgrades it would create a divergence, not close one.
  'gemini-3.5-flash': 'Gemini 3.8 Flash',
  'gemini-3-flash': 'Gemini 3.8 Flash',
  'gemini-3-flash-preview': 'Gemini 3.8 Flash',
};

/**
 * normalizeCopilot — FR-ARCH-0059: map/exhaustive sourced from `ctx.spec.modelVocabulary`. Same
 * selection strategy and exhaustive semantics as normalizeCursor (see above).
 */
export function normalizeCopilot(
  modelField: string,
  map: Record<string, string>,
  exhaustive?: boolean,
): string | null | typeof MODEL_DROP {
  const tokens = modelField.split(',').map((t) => t.trim());
  for (const token of tokens) {
    // See normalizeCursor above: non-exhaustive preserves the byte-identical "blank first token ⇒
    // null" result; exhaustive skips a blank token and keeps scanning (FR-PROF-0011).
    if (!token) {
      if (exhaustive) continue;
      return null;
    }
    if (hasKey(map, token)) return map[token];
    if (!exhaustive) return token; // passthrough — always resolves on the first token here
  }
  return exhaustive ? MODEL_DROP : null;
}

// ─── Codex vocabulary (FR-COPY-0022) ──────────────────────────────────────────
// Selection strategy UNCHANGED: scan all tokens for first gpt-* token. The built-in map carries
// upgrade entries for every superseded GPT family (5.3, 5.3-codex, 5.4, 5.4-mini, 5.5, 5.6-*) so a
// legacy gpt- token resolves forward to its current successor instead of pinning the old model — same
// idiom as the Cursor/Copilot GPT maps above. Each key is paired with a VALUE carrying the matching
// effort suffix (e.g. 'gpt-5.4-medium' → 'gpt-6-luna-high', see CODEX_GPT_MAP) so effort survives the
// upgrade: the chosen value (mapped or as-is) is THEN effort-split into {model, effort} by
// normalizeCodex. A current gpt-6* token is not superseded and carries no entry — it is not "mapped
// to itself"; it simply passes through unmapped like any other unknown token, which is the existing
// pass-through contract. A
// profile block may map a gpt- token to any string; that value is effort-split the same way. No gpt-
// token found ⇒ null (non-exhaustive, today); all gpt- candidates absent under exhaustive ⇒
// MODEL_DROP; an unmapped gpt- token under non-exhaustive still passes through as-is.

export interface CodexModelResult {
  model: string;
  effort: string | undefined;
}

/**
 * normalizeCodex — FR-ARCH-0059: map/exhaustive sourced from `ctx.spec.modelVocabulary`. See header
 * comment above for full selection/lookup/effort-split contract. FR-COPY-0084: called identically
 * from both Codex call sites (file-normalize-codex-models.ts markdown path and file-codex-agent.ts
 * TOML path) so a given token resolves the same at both surfaces.
 */
export function normalizeCodex(
  modelField: string,
  map: Record<string, string>,
  exhaustive?: boolean,
): CodexModelResult | null | typeof MODEL_DROP {
  const tokens = modelField.split(',').map((t) => t.trim());
  for (const token of tokens) {
    if (!isCodexToken(token)) continue;
    if (hasKey(map, token)) {
      return splitCodexEffort(map[token]);
    }
    if (!exhaustive) {
      return splitCodexEffort(token); // unmapped candidate ⇒ pass through as-is (today)
    }
    // exhaustive and candidate absent from map: skip, continue scan
  }
  return exhaustive ? MODEL_DROP : null;
}

// FR-COPY-0022 — Codex built-in upgrade table: every superseded gpt- token resolves forward to the
// current model of its own tier, one entry per effort-qualified form (plus the bare form) so
// normalizeCodex's effort-split recovers the effort. Unlike Cursor/Copilot, Codex carries effort as a
// separate field, so the tiers stay distinguishable by effort:
//   sol family   (gpt-5.6-sol, gpt-5.5)                     -> gpt-6.1-sol, effort kept
//   luna family  (gpt-5.6-luna, gpt-5.4-mini)               -> gpt-6-luna,  effort kept
//   terra family (gpt-5.6-terra, gpt-5.4, gpt-5.3, 5.3-codex) -> gpt-6-luna,  effort raised ONE step
//                (low->medium, medium->high, high->xhigh, xhigh stays xhigh; a bare token stays bare)
// gpt-6.1-sol* and gpt-6-luna* are current and carry no entry — they pass through unmapped, which is
// the existing pass-through contract.
const CODEX_GPT_MAP: Record<string, string> = {
  ...codexEffortForms(['gpt-5.6-sol', 'gpt-5.5'], 'gpt-6.1-sol', false),
  ...codexEffortForms(['gpt-5.6-luna', 'gpt-5.4-mini'], 'gpt-6-luna', false),
  ...codexEffortForms(['gpt-5.6-terra', 'gpt-5.4', 'gpt-5.3', 'gpt-5.3-codex'], 'gpt-6-luna', true),
};

// ─── Vocabulary objects ────────────────────────────────────────────────────────
// FR-ARCH-0059: `modelVocabulary.map` is now the real, live effective map consulted by the
// corresponding normalize*() function for every target — not a placeholder. `exhaustive` omitted
// (=false) on every built-in: profiled runs set `{map: <profile block>, exhaustive: true}` via
// resolveEffectiveVocabulary() (spec/profiles.ts, S2), never mutate these constants.

export const CLAUDE_VOCABULARY: ModelVocabulary = {
  map: CLAUDE_CODE_MAP,
};

// Cursor/Copilot merge their per-vendor maps into one flat map consulted by exact-token lookup.
// Keys are disjoint across the source maps (claude-*/gpt-*/gemini-*/grok-*/composer-* prefixes never
// collide — asserted by the disjointness test in tests/unit/spec/model-maps.test.ts), so merge order
// is immaterial.
//
// The Copilot map carries no Grok or Composer entry. That records only that no Copilot-native
// identifier for those models has been established here — it is NOT a finding that Copilot lacks
// them. Absence of a key means "this generator cannot name that model for this IDE yet", nothing
// more, and a token with no key is dropped from subagent_required_model rather than translated.
export const CURSOR_VOCABULARY: ModelVocabulary = {
  map: {
    ...CURSOR_CLAUDE_MAP,
    ...CURSOR_GPT_MAP,
    ...CURSOR_GEMINI_MAP,
    ...CURSOR_GROK_MAP,
    ...CURSOR_COMPOSER_MAP,
  },
};

export const COPILOT_VOCABULARY: ModelVocabulary = {
  map: { ...COPILOT_CLAUDE_MAP, ...COPILOT_GPT_MAP, ...COPILOT_GEMINI_MAP },
};

export const CODEX_VOCABULARY: ModelVocabulary = {
  map: CODEX_GPT_MAP, // superseded gpt- tokens upgrade forward (CODEX_GPT_MAP); any other token —
  // including current gpt-6* — is unmapped and normalizeCodex() effort-splits it as-is
};

// AG-2, DATA-CFG-0004: Antigravity carries no model vocabulary. Agent/skill frontmatter model
// fields are dropped entirely (FR-COPY-0081), not normalized/mapped, so there is nothing to hold
// here beyond an empty map — Antigravity never calls a normalize*() function.
export const ANTIGRAVITY_VOCABULARY: ModelVocabulary = {
  map: {},
};
