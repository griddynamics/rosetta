// DATA-CFG-0004, FR-COPY-0020–0022, MODEL.md — model normalization for 4 IDE vocabularies
// Decoded from baseline agents/TEMP/old-gen-r2/<target>/agents/*

import type { ModelVocabulary } from '../types.js';

// ─── Claude vocabulary (FR-COPY-0020, PARITY-9) ──────────────────────────────
// Scan all comma-split tokens for first claude-compatible one.
// NOT first-overall (CONTRADICTION-1). claude-compatible: starts with "claude-" OR contains opus/sonnet/haiku.
// Map: contains "opus" → CLAUDE_CODE_MAP.opus, "sonnet" → CLAUDE_CODE_MAP.sonnet, "haiku" → CLAUDE_CODE_MAP.haiku, else → "inherit".

// FR-COPY-0021 — Claude Code full model IDs; update here when models change
const CLAUDE_CODE_MAP: Record<string, string> = {
  opus: 'claude-opus-4-8',
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5',
};

export function normalizeClaude(modelField: string): string | null {
  const tokens = modelField.split(',').map((t) => t.trim());
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower.startsWith('claude-') || lower.includes('opus') || lower.includes('sonnet') || lower.includes('haiku')) {
      if (lower.includes('opus')) return CLAUDE_CODE_MAP.opus;
      if (lower.includes('sonnet')) return CLAUDE_CODE_MAP.sonnet;
      if (lower.includes('haiku')) return CLAUDE_CODE_MAP.haiku;
      return 'inherit';
    }
  }
  return null; // no claude-compatible token found
}

// ─── Cursor vocabulary (FR-COPY-0021) ─────────────────────────────────────────
// Uses FIRST comma-split token (not scanned) — intentional multi-vendor ordering design (FR-ARCH-0046):
// authors order tokens so the desired Cursor/Copilot model appears first; single-vendor runtimes
// (Claude, Codex) scan past it to their own compatible token.
// Claude tokens mapped via CURSOR_CLAUDE_MAP; gpt tokens stripped of -effort suffix inline.

const CURSOR_CLAUDE_MAP: Record<string, string> = {
  'claude-4.8-opus-high': 'claude-opus-4-6',
  'claude-4.8-opus': 'claude-opus-4-6',
  'claude-opus-4-8': 'claude-opus-4-6',
  'claude-4.6-sonnet': 'claude-sonnet-4-6',
  'claude-4.5-haiku': 'claude-haiku-4-5',
  'claude-opus-4-6': 'claude-opus-4-6',
  'claude-sonnet-4-6': 'claude-sonnet-4-6',
  'claude-haiku-4-5': 'claude-haiku-4-5',
};

export function normalizeCursor(modelField: string): string | null {
  const first = modelField.split(',')[0].trim();
  if (!first) return null;

  const lower = first.toLowerCase();

  // Claude token
  if (lower.startsWith('claude-')) {
    if (CURSOR_CLAUDE_MAP[first]) return CURSOR_CLAUDE_MAP[first];
    // Fallback: strip effort suffix (e.g. -high, -medium, -low) and try again
    const stripped = first.replace(/-(?:high|medium|low)$/, '');
    if (CURSOR_CLAUDE_MAP[stripped]) return CURSOR_CLAUDE_MAP[stripped];
    return first; // passthrough unknown claude tokens
  }

  // GPT token: strip trailing -<effort>
  if (lower.startsWith('gpt-')) {
    return first.replace(/-(?:high|medium|low)$/, '');
  }

  return first; // passthrough other tokens
}

// ─── Copilot vocabulary (FR-COPY-0021) ────────────────────────────────────────
// Uses FIRST comma-split token — same intentional multi-vendor ordering design as Cursor (FR-ARCH-0046).
// Map via COPILOT_CLAUDE_MAP / COPILOT_GPT_MAP. Decoded from baseline core-copilot/agents/*.agent.md.

const COPILOT_CLAUDE_MAP: Record<string, string> = {
  'claude-4.8-opus-high': 'Claude Opus 4.6',
  'claude-4.8-opus': 'Claude Opus 4.6',
  'claude-opus-4-8': 'Claude Opus 4.6',
  'claude-4.6-sonnet': 'Claude Sonnet 4.6',
  'claude-4.5-haiku': 'Claude Haiku 4.5',
  'claude-opus-4-6': 'Claude Opus 4.6',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-haiku-4-5': 'Claude Haiku 4.5',
};

const COPILOT_GPT_MAP: Record<string, string> = {
  'gpt-5.5': 'GPT-5.5',
  'gpt-5.4': 'GPT-5.4',
  'gpt-5.3': 'GPT-5.3',
  'gpt-4.5': 'GPT-4.5',
  'gpt-4o': 'GPT-4o',
  'gpt-4': 'GPT-4',
  'o3': 'o3',
  'o4-mini': 'o4-mini',
};

export function normalizeCopilot(modelField: string): string | null {
  const first = modelField.split(',')[0].trim();
  if (!first) return null;

  const lower = first.toLowerCase();

  // Claude token
  if (lower.startsWith('claude-')) {
    if (COPILOT_CLAUDE_MAP[first]) return COPILOT_CLAUDE_MAP[first];
    const stripped = first.replace(/-(?:high|medium|low)$/, '');
    if (COPILOT_CLAUDE_MAP[stripped]) return COPILOT_CLAUDE_MAP[stripped];
    return first;
  }

  // GPT token: strip effort suffix → look up in display map
  if (lower.startsWith('gpt-') || lower.startsWith('o3') || lower.startsWith('o4')) {
    const base = first.replace(/-(?:high|medium|low)$/, '');
    if (COPILOT_GPT_MAP[base]) return COPILOT_GPT_MAP[base];
    return base;
  }

  return first;
}

// ─── Codex vocabulary (FR-COPY-0022) ──────────────────────────────────────────
// Scan all tokens for first gpt-* token.
// Split trailing -<effort> → model + model_reasoning_effort.
// If none found → no model fields in TOML.

export interface CodexModelResult {
  model: string;
  effort: string;
}

export function normalizeCodex(modelField: string): CodexModelResult | null {
  const tokens = modelField.split(',').map((t) => t.trim());
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower.startsWith('gpt-') || lower.startsWith('o3') || lower.startsWith('o4')) {
      // Split effort suffix
      const effortMatch = token.match(/^(.+)-(?:(high|medium|low))$/);
      if (effortMatch) {
        return { model: effortMatch[1], effort: effortMatch[2] };
      }
      return { model: token, effort: 'medium' }; // default effort
    }
  }
  return null; // no gpt token
}

// ─── Vocabulary objects ────────────────────────────────────────────────────────

export const CLAUDE_VOCABULARY: ModelVocabulary = {
  map: {}, // not used directly; normalizeClaude() is the function
};

export const CURSOR_VOCABULARY: ModelVocabulary = {
  map: CURSOR_CLAUDE_MAP,
};

export const COPILOT_VOCABULARY: ModelVocabulary = {
  map: COPILOT_CLAUDE_MAP,
};

export const CODEX_VOCABULARY: ModelVocabulary = {
  map: {}, // not a simple map; normalizeCodex() handles the logic
};
