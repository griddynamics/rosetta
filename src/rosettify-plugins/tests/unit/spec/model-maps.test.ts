// DATA-CFG-0004, FR-ARCH-0059, FR-COPY-0020/21/22, FR-PROF-0011 — all four vocabularies +
// fallbacks, under the (field, map, exhaustive?) contract. Built-in vocabulary objects are used
// directly wherever a test exercises the byte-identical non-exhaustive built-in behavior; ad hoc
// maps are used to exercise the exhaustive (profiled) skip/MODEL_DROP semantics.
import { describe, it, expect } from 'vitest';
import {
  normalizeClaude,
  normalizeCursor,
  normalizeCopilot,
  normalizeCodex,
  splitCodexEffort,
  claudeLookup,
  CLAUDE_VOCABULARY,
  CURSOR_VOCABULARY,
  COPILOT_VOCABULARY,
  CODEX_VOCABULARY,
} from '../../../src/spec/model-maps.js';
import { MODEL_DROP } from '../../../src/types.js';

// ─── claudeLookup: exact-token tier before the family-key tier (FR-COPY-0083, exact-token fix) ──

describe('claudeLookup', () => {
  it('exact token wins over the family key when a map carries both', () => {
    const map = { opus: 'claude-opus-4-8', 'claude-5-opus-high': 'claude-opus-5' };
    expect(claudeLookup('claude-5-opus-high', map)).toBe('claude-opus-5');
  });

  it('a different opus token with no exact entry of its own still resolves via the family key', () => {
    const map = { opus: 'claude-opus-4-8', 'claude-5-opus-high': 'claude-opus-5' };
    expect(claudeLookup('claude-4.8-opus-high', map)).toBe('claude-opus-4-8');
  });

  it('returns null when neither the exact token nor the family key is present', () => {
    expect(claudeLookup('claude-4.8-opus-high', {})).toBeNull();
  });

  it('a bare family word ("opus") still resolves via the family key', () => {
    expect(claudeLookup('opus', { opus: 'claude-opus-4-8' })).toBe('claude-opus-4-8');
  });
});

describe('normalizeClaude', () => {
  it('scans for first claude-compatible token (not first overall)', () => {
    // PARITY-9: gpt is first, claude is second — should find claude
    expect(normalizeClaude('gpt-5.5-high, claude-4.8-opus-high', CLAUDE_VOCABULARY.map)).toBe('claude-opus-4-8');
  });

  it('maps opus token to "claude-opus-4-8"', () => {
    expect(normalizeClaude('claude-4.8-opus-high', CLAUDE_VOCABULARY.map)).toBe('claude-opus-4-8');
  });

  it('maps sonnet token to "claude-sonnet-5"', () => {
    expect(normalizeClaude('claude-4.6-sonnet', CLAUDE_VOCABULARY.map)).toBe('claude-sonnet-5');
  });

  it('maps haiku token to "claude-haiku-4-5"', () => {
    expect(normalizeClaude('claude-4.5-haiku', CLAUDE_VOCABULARY.map)).toBe('claude-haiku-4-5');
  });

  it('resolves claude-haiku-4-5 via the haiku family key (real fixture token, FR-COPY-0083 fixture E)', () => {
    // Family-key derivation is substring-based (claudeFamilyKey), not a literal-token lookup:
    // this real-world token differs from the legacy 'claude-4.5-haiku' form above but still
    // resolves through the SAME 'haiku' key in CLAUDE_CODE_MAP.
    expect(normalizeClaude('claude-haiku-4-5', CLAUDE_VOCABULARY.map)).toBe('claude-haiku-4-5');
  });

  it('returns "inherit" for claude-* token without opus/sonnet/haiku (non-exhaustive no-survivor idiom, FR-PROF-0040)', () => {
    expect(normalizeClaude('claude-unknown-model', CLAUDE_VOCABULARY.map)).toBe('inherit');
  });

  it('returns null when no claude-compatible token (non-exhaustive no-survivor idiom, FR-PROF-0040)', () => {
    expect(normalizeClaude('gpt-5.5-high, gemini-3.1', CLAUDE_VOCABULARY.map)).toBeNull();
  });

  it('handles reviewer case: gpt,gemini,claude-sonnet → claude-sonnet-5', () => {
    expect(normalizeClaude('gpt-5.4-medium, gemini-3.1-pro, claude-4.6-sonnet', CLAUDE_VOCABULARY.map)).toBe(
      'claude-sonnet-5',
    );
  });
});

// ─── Regression: the exact-token tier must not disturb any pre-existing family-keyed token ──────

describe('normalizeClaude — exact-token tier does not disturb pre-existing built-in tokens', () => {
  it('claude-4.8-opus-high, gpt-5.5-high still resolves to claude-opus-4-8 through the built-in vocabulary', () => {
    expect(normalizeClaude('claude-4.8-opus-high, gpt-5.5-high', CLAUDE_VOCABULARY.map)).toBe('claude-opus-4-8');
  });

  it('skips a leading non-claude token, then resolves the claude-5-opus-high exact-token entry to claude-opus-5', () => {
    expect(normalizeClaude('gpt-5.6-sol-high, claude-5-opus-high, grok-4.6-high', CLAUDE_VOCABULARY.map)).toBe(
      'claude-opus-5',
    );
  });
});

describe('normalizeCursor', () => {
  it('takes first model overall', () => {
    // First is claude → maps to canonical
    expect(normalizeCursor('claude-4.8-opus-high, gpt-5.5-high', CURSOR_VOCABULARY.map)).toBe('claude-opus-4-8');
  });

  it('maps gpt effort variant via exhaustive table', () => {
    expect(normalizeCursor('gpt-5.5-high', CURSOR_VOCABULARY.map)).toBe('gpt-5.5');
  });

  it('maps gpt-5.4-high via exhaustive table', () => {
    expect(normalizeCursor('gpt-5.4-high, other', CURSOR_VOCABULARY.map)).toBe('gpt-5.4');
  });

  it('maps claude-4.6-sonnet to claude-sonnet-5', () => {
    expect(normalizeCursor('claude-4.6-sonnet', CURSOR_VOCABULARY.map)).toBe('claude-sonnet-5');
  });

  it('returns null for empty string', () => {
    expect(normalizeCursor('', CURSOR_VOCABULARY.map)).toBeNull();
  });

  it('passthrough unknown token (non-exhaustive no-survivor idiom, FR-PROF-0040)', () => {
    expect(normalizeCursor('some-unknown-model', CURSOR_VOCABULARY.map)).toBe('some-unknown-model');
  });
});

// ─── Cursor: new vocabulary entries (GPT-5.6 effort-qualified, Gemini 3.7 Flash, Grok 4.6, Opus 5) ──

describe('normalizeCursor — new vocabulary entries', () => {
  it('maps gpt-5.6-sol-high to gpt-5.6-sol', () => {
    expect(normalizeCursor('gpt-5.6-sol-high', CURSOR_VOCABULARY.map)).toBe('gpt-5.6-sol');
  });

  it('maps gemini-3.7-flash-medium to gemini-3.7-flash', () => {
    expect(normalizeCursor('gemini-3.7-flash-medium', CURSOR_VOCABULARY.map)).toBe('gemini-3.7-flash');
  });

  it('maps grok-4.6-medium to grok-4.6', () => {
    expect(normalizeCursor('grok-4.6-medium', CURSOR_VOCABULARY.map)).toBe('grok-4.6');
  });

  it('maps claude-5-opus-high to claude-opus-5', () => {
    expect(normalizeCursor('claude-5-opus-high', CURSOR_VOCABULARY.map)).toBe('claude-opus-5');
  });

  it('the bare gpt-5.6-sol form is deliberately absent from the map — passthrough, not a mapped value', () => {
    // Pins the production comment on CURSOR_GPT_MAP: the bare forms are intentionally omitted
    // (they appear ~105 times across the base instruction set), so a future edit that adds one
    // must be a conscious choice, not an accident.
    expect(Object.prototype.hasOwnProperty.call(CURSOR_VOCABULARY.map, 'gpt-5.6-sol')).toBe(false);
    expect(normalizeCursor('gpt-5.6-sol', CURSOR_VOCABULARY.map)).toBe('gpt-5.6-sol');
  });
});

describe('normalizeCopilot', () => {
  it('maps claude-4.8-opus-high to display name', () => {
    expect(normalizeCopilot('claude-4.8-opus-high', COPILOT_VOCABULARY.map)).toBe('Claude Opus 4.8');
  });

  it('maps gpt-5.5-high to GPT-5.5 via exhaustive table', () => {
    expect(normalizeCopilot('gpt-5.5-high, claude-4.8-opus', COPILOT_VOCABULARY.map)).toBe('GPT-5.5');
  });

  it('maps gpt-5.4-high to GPT-5.4 via exhaustive table', () => {
    expect(normalizeCopilot('gpt-5.4-high, other', COPILOT_VOCABULARY.map)).toBe('GPT-5.4');
  });

  it('returns null for empty string', () => {
    expect(normalizeCopilot('', COPILOT_VOCABULARY.map)).toBeNull();
  });

  it('maps claude-4.5-haiku to Claude Haiku 4.5', () => {
    expect(normalizeCopilot('claude-4.5-haiku', COPILOT_VOCABULARY.map)).toBe('Claude Haiku 4.5');
  });

  it('passthrough unknown token (non-exhaustive no-survivor idiom, FR-PROF-0040)', () => {
    expect(normalizeCopilot('some-unknown-model', COPILOT_VOCABULARY.map)).toBe('some-unknown-model');
  });
});

// ─── Copilot: new vocabulary entries (GPT-5.6 effort-qualified, Gemini 3.7 Flash, Opus 5, no Grok) ──

describe('normalizeCopilot — new vocabulary entries', () => {
  it('maps gpt-5.6-luna-xhigh to GPT-5.6 Luna', () => {
    expect(normalizeCopilot('gpt-5.6-luna-xhigh', COPILOT_VOCABULARY.map)).toBe('GPT-5.6 Luna');
  });

  it('maps gemini-3.7-flash-low to Gemini 3.7 Flash', () => {
    expect(normalizeCopilot('gemini-3.7-flash-low', COPILOT_VOCABULARY.map)).toBe('Gemini 3.7 Flash');
  });

  it('maps claude-5-opus-high to Claude Opus 5', () => {
    expect(normalizeCopilot('claude-5-opus-high', COPILOT_VOCABULARY.map)).toBe('Claude Opus 5');
  });

  it('grok-4.6-medium is not in the Copilot map — Copilot carries no Grok vocabulary', () => {
    expect(Object.prototype.hasOwnProperty.call(COPILOT_VOCABULARY.map, 'grok-4.6-medium')).toBe(false);
  });
});

describe('normalizeCodex', () => {
  it('finds first gpt-* token and splits effort', () => {
    expect(normalizeCodex('claude-4.8-opus-high, gpt-5.5-high', CODEX_VOCABULARY.map)).toEqual({
      model: 'gpt-5.5',
      effort: 'high',
    });
  });

  it('handles gpt-first agent (reviewer pattern)', () => {
    expect(normalizeCodex('gpt-5.5-high, gemini', CODEX_VOCABULARY.map)).toEqual({ model: 'gpt-5.5', effort: 'high' });
  });

  it('splits -low effort', () => {
    expect(normalizeCodex('gpt-5.4-low', CODEX_VOCABULARY.map)).toEqual({ model: 'gpt-5.4', effort: 'low' });
  });

  it('returns null when no gpt-* token (non-exhaustive no-survivor idiom, FR-PROF-0040)', () => {
    expect(normalizeCodex('claude-4.8-opus-high, gemini', CODEX_VOCABULARY.map)).toBeNull();
  });

  it('returns effort: undefined for gpt without effort suffix', () => {
    expect(normalizeCodex('gpt-5.5', CODEX_VOCABULARY.map)).toEqual({ model: 'gpt-5.5', effort: undefined });
  });

  it('returns null for empty string', () => {
    expect(normalizeCodex('', CODEX_VOCABULARY.map)).toBeNull();
  });

  it('splits -xhigh effort via the built-in pass-through map', () => {
    expect(normalizeCodex('gpt-5.6-luna-xhigh', CODEX_VOCABULARY.map)).toEqual({
      model: 'gpt-5.6-luna',
      effort: 'xhigh',
    });
  });
});

describe('splitCodexEffort', () => {
  it('splits a trailing -xhigh suffix', () => {
    expect(splitCodexEffort('gpt-5.6-luna-xhigh')).toEqual({ model: 'gpt-5.6-luna', effort: 'xhigh' });
  });
});

// ─── Regression: "xhigh" appearing mid-name must not be mangled (FR-COPY-0022) ─────────────────

describe('regression: "-xhigh"-like text mid-name is not mistaken for the effort suffix', () => {
  it('a token whose non-effort trailing segment merely contains "xhigh" is left whole, effort undefined', () => {
    // "gpt-5.6-xhigh-preview" ends in "-preview", not "-xhigh" — the effort regex is anchored to
    // the end of the string, so the mid-name "xhigh" substring must not be split off.
    expect(normalizeCodex('gpt-5.6-xhigh-preview', CODEX_VOCABULARY.map)).toEqual({
      model: 'gpt-5.6-xhigh-preview',
      effort: undefined,
    });
  });

  it('gpt-5.4 (no suffix) still yields effort: undefined', () => {
    expect(normalizeCodex('gpt-5.4', CODEX_VOCABULARY.map)).toEqual({ model: 'gpt-5.4', effort: undefined });
  });
});

// ─── Exhaustive mode: skip-then-hit and no-survivor → MODEL_DROP (FR-PROF-0011) ────────────────
// A profile block IS the whole allowed vocabulary under exhaustive: a candidate whose key/token is
// absent is SKIPPED (scan continues to the next candidate), not treated as a fallback survivor.
// Real subagent_required_model fixtures (SPECS §10) supply the tokens below.

describe('exhaustive mode — skip-then-hit (FR-PROF-0011)', () => {
  it('Claude: skips a candidate whose family key is absent from the exhaustive map, then hits the next candidate', () => {
    // Profile block overrides only "sonnet" — no "opus" key present.
    const map = { sonnet: 'claude-sonnet-5' };
    expect(normalizeClaude('claude-4.8-opus-high, claude-5-sonnet', map, true)).toBe('claude-sonnet-5');
  });

  it('Cursor: skips an unmapped first token, then hits a later token', () => {
    const map = { 'gpt-5.4-medium': 'gpt-5.4' };
    expect(normalizeCursor('claude-sonnet-5, gpt-5.4-medium', map, true)).toBe('gpt-5.4');
  });

  it('Copilot: skips an unmapped first token, then hits a later token', () => {
    const map = { 'gpt-5.4-medium': 'GPT-5.4' };
    expect(normalizeCopilot('claude-sonnet-5, gpt-5.4-medium', map, true)).toBe('GPT-5.4');
  });

  it('Codex: skips an unmapped gpt- candidate, then hits a later gpt- candidate', () => {
    const map = { 'gpt-5.6-terra': 'gpt-5.4-medium' };
    expect(normalizeCodex('gpt-5.5-high, gpt-5.6-terra', map, true)).toEqual({ model: 'gpt-5.4', effort: 'medium' });
  });
});

describe('exhaustive mode — no surviving candidate returns MODEL_DROP (FR-PROF-0011)', () => {
  it('Claude: exhausted scan with no matching family key', () => {
    expect(normalizeClaude('claude-4.8-opus-high, claude-5-sonnet', {}, true)).toBe(MODEL_DROP);
  });

  it('Cursor: exhausted scan with no matching token', () => {
    expect(normalizeCursor('claude-sonnet-5, gpt-5.4-medium', {}, true)).toBe(MODEL_DROP);
  });

  it('Copilot: exhausted scan with no matching token', () => {
    expect(normalizeCopilot('claude-sonnet-5, gpt-5.4-medium', {}, true)).toBe(MODEL_DROP);
  });

  it('Codex: exhausted scan with no matching gpt- token', () => {
    expect(normalizeCodex('gpt-5.5-high, gpt-5.6-terra', {}, true)).toBe(MODEL_DROP);
  });

  it('Claude: a claude-compatible-but-no-tier-substring token under exhaustive is skipped, not "inherit"', () => {
    // Non-exhaustive turns this into 'inherit' (tested above); exhaustive treats it the same as
    // any other unresolved candidate — skip, and the scan then exhausts.
    expect(normalizeClaude('claude-unknown-model', {}, true)).toBe(MODEL_DROP);
  });
});

// ─── Merged Cursor/Copilot effective map spans claude+gpt+gemini (Decision A merge) ─────────────
// CURSOR_VOCABULARY.map / COPILOT_VOCABULARY.map are each a single flat merge of three
// per-vendor maps (claude-*/gpt-*/gemini-* keys never collide) — verifies all three vendor
// namespaces resolve through the ONE map object actually wired into spec.modelVocabulary.

// ─── Regression: empty/comma-leading `model:` field must respect `exhaustive` (FR-PROF-0011) ────
// The empty-leading-token guard used to `return null` unconditionally before the scan loop even
// ran, regardless of `exhaustive` — under an active per-target override block that leaked the raw
// `model:` line through instead of dropping it. Fixed by moving the empty-token check inside the
// loop as a `continue`, gated on `exhaustive`, so non-exhaustive stays byte-identical (still
// returns null on a blank first token) while exhaustive skips the blank token and keeps scanning.

describe('regression: empty-leading-token guard respects exhaustive (Cursor/Copilot)', () => {
  it('Cursor: empty field under exhaustive:true yields MODEL_DROP, not null', () => {
    expect(normalizeCursor('', {}, true)).toBe(MODEL_DROP);
  });

  it('Cursor: comma-leading (blank first token) field under exhaustive:true yields MODEL_DROP when nothing survives', () => {
    expect(normalizeCursor(', unknown-model', {}, true)).toBe(MODEL_DROP);
  });

  it('Cursor: comma-leading blank first token under exhaustive:true still resolves the later mapped token', () => {
    const map = { 'gpt-5.4': 'gpt-5.4' };
    expect(normalizeCursor(', gpt-5.4', map, true)).toBe('gpt-5.4');
  });

  it('Cursor: empty field under non-exhaustive (default) still yields null, unchanged', () => {
    expect(normalizeCursor('', CURSOR_VOCABULARY.map)).toBeNull();
  });

  it('Cursor: comma-leading blank first token under non-exhaustive (default) still yields null, unchanged', () => {
    expect(normalizeCursor(', gpt-5.4', CURSOR_VOCABULARY.map)).toBeNull();
  });

  it('Copilot: empty field under exhaustive:true yields MODEL_DROP, not null', () => {
    expect(normalizeCopilot('', {}, true)).toBe(MODEL_DROP);
  });

  it('Copilot: comma-leading blank first token under exhaustive:true still resolves the later mapped token', () => {
    const map = { 'gpt-5.4': 'GPT-5.4' };
    expect(normalizeCopilot(', gpt-5.4', map, true)).toBe('GPT-5.4');
  });

  it('Copilot: empty field under non-exhaustive (default) still yields null, unchanged', () => {
    expect(normalizeCopilot('', COPILOT_VOCABULARY.map)).toBeNull();
  });

  it('Copilot: comma-leading blank first token under non-exhaustive (default) still yields null, unchanged', () => {
    expect(normalizeCopilot(', gpt-5.4', COPILOT_VOCABULARY.map)).toBeNull();
  });
});

describe('merged Cursor/Copilot effective map (claude+gpt+gemini, FR-ARCH-0059)', () => {
  it('CURSOR_VOCABULARY.map resolves a claude key, a gpt key, and a gemini key', () => {
    expect(CURSOR_VOCABULARY.map['claude-sonnet-5']).toBe('claude-sonnet-5');
    expect(CURSOR_VOCABULARY.map['gpt-5.4-medium']).toBe('gpt-5.4');
    expect(CURSOR_VOCABULARY.map['gemini-3.1-pro']).toBe('gemini-3.1-pro');
  });

  it('COPILOT_VOCABULARY.map resolves a claude key, a gpt key, and a gemini key', () => {
    expect(COPILOT_VOCABULARY.map['claude-sonnet-5']).toBe('Claude Sonnet 5');
    expect(COPILOT_VOCABULARY.map['gpt-5.4-medium']).toBe('GPT-5.4');
    expect(COPILOT_VOCABULARY.map['gemini-3-flash']).toBe('Gemini 3.5 Flash');
  });

  it('normalizeCursor resolves a gemini token via the merged map (first-token strategy)', () => {
    expect(normalizeCursor('gemini-3.1-pro-preview, claude-sonnet-5', CURSOR_VOCABULARY.map)).toBe('gemini-3.1-pro');
  });

  it('normalizeCopilot resolves a gemini token via the merged map (first-token strategy)', () => {
    expect(normalizeCopilot('gemini-3.1-pro-preview, claude-sonnet-5', COPILOT_VOCABULARY.map)).toBe(
      'Gemini 3.1 Pro (Preview)',
    );
  });
});

// ─── Key-disjointness guard: merge order cannot matter (FR-ARCH-0059) ───────────────────────────
// Cursor merges 4 per-vendor maps (claude/gpt/gemini/grok = 16+28+8+4 = 56 keys); Copilot merges 3
// (claude/gpt/gemini = 16+28+7 = 51 keys, no grok/composer). If the per-vendor prefixes ever
// collided, the spread merge in CURSOR_VOCABULARY/COPILOT_VOCABULARY would silently drop a key and
// this count would fall below the expected total.

describe('merged vocabulary key disjointness (FR-ARCH-0059)', () => {
  it('CURSOR_VOCABULARY.map has exactly 56 keys — the 4 per-vendor source maps never collide', () => {
    const keys = Object.keys(CURSOR_VOCABULARY.map);
    expect(keys.length).toBe(56);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('COPILOT_VOCABULARY.map has exactly 51 keys — the 3 per-vendor source maps never collide', () => {
    const keys = Object.keys(COPILOT_VOCABULARY.map);
    expect(keys.length).toBe(51);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
