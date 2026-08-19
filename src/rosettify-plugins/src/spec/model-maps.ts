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
  opus: 'claude-opus-4-8',
  sonnet: 'claude-sonnet-5',
  haiku: 'claude-haiku-4-5',
  // Exact source tokens, consulted BEFORE the family keys (claudeLookup). Needed wherever a source
  // token names a model version the family key does not resolve to: `opus` maps to Opus 4.8, so an
  // author asking for Opus 5 has no other way to say it. Adding an exact key changes nothing for any
  // other token — only a byte-equal source token hits it.
  'claude-5-opus-high': 'claude-opus-5',
  'claude-5-opus': 'claude-opus-5',
  'claude-opus-5': 'claude-opus-5',
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
  'claude-4.8-opus-high': 'claude-opus-4-8',
  'claude-4.8-opus': 'claude-opus-4-8',
  'claude-opus-4-8': 'claude-opus-4-8',
  'claude-4.7-opus-high': 'claude-opus-4-8',
  'claude-4.7-opus': 'claude-opus-4-8',
  'claude-opus-4-7': 'claude-opus-4-8',
  'claude-4.6-sonnet': 'claude-sonnet-5',
  'claude-5-sonnet': 'claude-sonnet-5',
  'claude-4.5-haiku': 'claude-haiku-4-5',
  'claude-opus-4-6': 'claude-opus-4-8',
  'claude-sonnet-4-6': 'claude-sonnet-5',
  'claude-sonnet-5': 'claude-sonnet-5',
  'claude-haiku-4-5': 'claude-haiku-4-5',
  'claude-5-opus-high': 'claude-opus-5',
  'claude-5-opus': 'claude-opus-5',
  'claude-opus-5': 'claude-opus-5',
};

const CURSOR_GPT_MAP: Record<string, string> = {
  // GPT-5.6 — effort-qualified forms only. The BARE forms (`gpt-5.6-sol`/`-terra`/`-luna`) are
  // deliberately absent: they appear ~105 times across the base instruction set, so mapping them
  // would rewrite the standard plugins too. That wider vocabulary gap is tracked in docs/TODO.md.
  'gpt-5.6-sol-xhigh':    'gpt-5.6-sol',
  'gpt-5.6-sol-high':     'gpt-5.6-sol',
  'gpt-5.6-sol-medium':   'gpt-5.6-sol',
  'gpt-5.6-sol-low':      'gpt-5.6-sol',
  'gpt-5.6-terra-xhigh':  'gpt-5.6-terra',
  'gpt-5.6-terra-high':   'gpt-5.6-terra',
  'gpt-5.6-terra-medium': 'gpt-5.6-terra',
  'gpt-5.6-terra-low':    'gpt-5.6-terra',
  'gpt-5.6-luna-xhigh':   'gpt-5.6-luna',
  'gpt-5.6-luna-high':    'gpt-5.6-luna',
  'gpt-5.6-luna-medium':  'gpt-5.6-luna',
  'gpt-5.6-luna-low':     'gpt-5.6-luna',
  // GPT-5.5
  'gpt-5.5-high':         'gpt-5.5',
  'gpt-5.5-medium':       'gpt-5.5',
  'gpt-5.5-low':          'gpt-5.5',
  'gpt-5.5':              'gpt-5.5',
  // GPT-5.4
  'gpt-5.4-high':         'gpt-5.4',
  'gpt-5.4-medium':       'gpt-5.4',
  'gpt-5.4-low':          'gpt-5.4',
  'gpt-5.4':              'gpt-5.4',
  // GPT-5.3 → upgrade to 5.4
  'gpt-5.3-high':         'gpt-5.4',
  'gpt-5.3-medium':       'gpt-5.4',
  'gpt-5.3-low':          'gpt-5.4',
  'gpt-5.3':              'gpt-5.4',
  // GPT-5.3-Codex → upgrade to 5.4
  'gpt-5.3-codex-high':   'gpt-5.4',
  'gpt-5.3-codex-medium': 'gpt-5.4',
  'gpt-5.3-codex-low':    'gpt-5.4',
  'gpt-5.3-codex':        'gpt-5.4',
};

const CURSOR_GEMINI_MAP: Record<string, string> = {
  'gemini-3.7-flash-high': 'gemini-3.7-flash',
  'gemini-3.7-flash-medium': 'gemini-3.7-flash',
  'gemini-3.7-flash-low': 'gemini-3.7-flash',
  'gemini-3.7-flash': 'gemini-3.7-flash',
  'gemini-3.5-flash': 'gemini-3.5-flash',
  'gemini-3-flash': 'gemini-3.5-flash',
  'gemini-3.1-pro-preview': 'gemini-3.1-pro',
  'gemini-3.1-pro': 'gemini-3.1-pro',
};

const CURSOR_GROK_MAP: Record<string, string> = {
  'grok-4.6-high': 'grok-4.6',
  'grok-4.6-medium': 'grok-4.6',
  'grok-4.6-low': 'grok-4.6',
  'grok-4.6': 'grok-4.6',
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
  'claude-4.8-opus-high': 'Claude Opus 4.8',
  'claude-4.8-opus': 'Claude Opus 4.8',
  'claude-opus-4-8': 'Claude Opus 4.8',
  'claude-4.7-opus-high': 'Claude Opus 4.8',
  'claude-4.7-opus': 'Claude Opus 4.8',
  'claude-opus-4-7': 'Claude Opus 4.8',
  'claude-4.6-sonnet': 'Claude Sonnet 5',
  'claude-5-sonnet': 'Claude Sonnet 5',
  'claude-4.5-haiku': 'Claude Haiku 4.5',
  'claude-opus-4-6': 'Claude Opus 4.8',
  'claude-sonnet-4-6': 'Claude Sonnet 5',
  'claude-sonnet-5': 'Claude Sonnet 5',
  'claude-haiku-4-5': 'Claude Haiku 4.5',
  'claude-5-opus-high': 'Claude Opus 5',
  'claude-5-opus': 'Claude Opus 5',
  'claude-opus-5': 'Claude Opus 5',
};

const COPILOT_GPT_MAP: Record<string, string> = {
  // GPT-5.6 — effort-qualified forms only, for the same reason as the Cursor map above.
  'gpt-5.6-sol-xhigh':    'GPT-5.6 Sol',
  'gpt-5.6-sol-high':     'GPT-5.6 Sol',
  'gpt-5.6-sol-medium':   'GPT-5.6 Sol',
  'gpt-5.6-sol-low':      'GPT-5.6 Sol',
  'gpt-5.6-terra-xhigh':  'GPT-5.6 Terra',
  'gpt-5.6-terra-high':   'GPT-5.6 Terra',
  'gpt-5.6-terra-medium': 'GPT-5.6 Terra',
  'gpt-5.6-terra-low':    'GPT-5.6 Terra',
  'gpt-5.6-luna-xhigh':   'GPT-5.6 Luna',
  'gpt-5.6-luna-high':    'GPT-5.6 Luna',
  'gpt-5.6-luna-medium':  'GPT-5.6 Luna',
  'gpt-5.6-luna-low':     'GPT-5.6 Luna',
  // GPT-5.5
  'gpt-5.5-high':         'GPT-5.5',
  'gpt-5.5-medium':       'GPT-5.5',
  'gpt-5.5-low':          'GPT-5.5',
  'gpt-5.5':              'GPT-5.5',
  // GPT-5.4
  'gpt-5.4-high':         'GPT-5.4',
  'gpt-5.4-medium':       'GPT-5.4',
  'gpt-5.4-low':          'GPT-5.4',
  'gpt-5.4':              'GPT-5.4',
  // GPT-5.3 → upgrade to 5.4
  'gpt-5.3-high':         'GPT-5.4',
  'gpt-5.3-medium':       'GPT-5.4',
  'gpt-5.3-low':          'GPT-5.4',
  'gpt-5.3':              'GPT-5.4',
  // GPT-5.3-Codex → upgrade to 5.4
  'gpt-5.3-codex-high':   'GPT-5.4',
  'gpt-5.3-codex-medium': 'GPT-5.4',
  'gpt-5.3-codex-low':    'GPT-5.4',
  'gpt-5.3-codex':        'GPT-5.4',
};

const COPILOT_GEMINI_MAP: Record<string, string> = {
  'gemini-3.7-flash-high': 'Gemini 3.7 Flash',
  'gemini-3.7-flash-medium': 'Gemini 3.7 Flash',
  'gemini-3.7-flash-low': 'Gemini 3.7 Flash',
  'gemini-3.7-flash': 'Gemini 3.7 Flash',
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro (Preview)',
  'gemini-3.1-pro': 'Gemini 3.1 Pro (Preview)',
  'gemini-3-flash': 'Gemini 3.5 Flash',
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
// Selection strategy UNCHANGED: scan all tokens for first gpt-* token. Built-in map is `{}`
// (identity/pass-through) so non-exhaustive resolution is always "token as-is" — byte-identical to
// the pre-refactor pure effort-split. A profile block may map a gpt- token to any string (including
// one carrying its own effort suffix, e.g. "gpt-5.4-medium"); the chosen value (mapped or as-is) is
// THEN effort-split into {model, effort}. No gpt- token found ⇒ null (non-exhaustive, today) ; all
// gpt- candidates absent under exhaustive ⇒ MODEL_DROP.

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
      return splitCodexEffort(token); // built-in map {} ⇒ always as-is (today)
    }
    // exhaustive and candidate absent from map: skip, continue scan
  }
  return exhaustive ? MODEL_DROP : null;
}

// ─── Vocabulary objects ────────────────────────────────────────────────────────
// FR-ARCH-0059: `modelVocabulary.map` is now the real, live effective map consulted by the
// corresponding normalize*() function for every target — not a placeholder. `exhaustive` omitted
// (=false) on every built-in: profiled runs set `{map: <profile block>, exhaustive: true}` via
// resolveEffectiveVocabulary() (spec/profiles.ts, S2), never mutate these constants.

export const CLAUDE_VOCABULARY: ModelVocabulary = {
  map: CLAUDE_CODE_MAP,
};

// Cursor/Copilot merge their per-vendor maps into one flat map consulted by exact-token lookup.
// Keys are disjoint across the source maps (claude-*/gpt-*/gemini-*/grok-* prefixes never collide —
// verified: Cursor 56 total keys, 56 unique across CURSOR_CLAUDE_MAP ∪ CURSOR_GPT_MAP ∪
// CURSOR_GEMINI_MAP ∪ CURSOR_GROK_MAP; Copilot 51 total, 51 unique — Copilot carries no Grok or
// Composer vocabulary), so merge order is immaterial.
export const CURSOR_VOCABULARY: ModelVocabulary = {
  map: { ...CURSOR_CLAUDE_MAP, ...CURSOR_GPT_MAP, ...CURSOR_GEMINI_MAP, ...CURSOR_GROK_MAP },
};

export const COPILOT_VOCABULARY: ModelVocabulary = {
  map: { ...COPILOT_CLAUDE_MAP, ...COPILOT_GPT_MAP, ...COPILOT_GEMINI_MAP },
};

export const CODEX_VOCABULARY: ModelVocabulary = {
  map: {}, // identity/pass-through — normalizeCodex() effort-splits the token as-is when unmapped
};

// AG-2, DATA-CFG-0004: Antigravity carries no model vocabulary. Agent/skill frontmatter model
// fields are dropped entirely (FR-COPY-0081), not normalized/mapped, so there is nothing to hold
// here beyond an empty map — Antigravity never calls a normalize*() function.
export const ANTIGRAVITY_VOCABULARY: ModelVocabulary = {
  map: {},
};
