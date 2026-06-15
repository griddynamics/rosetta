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
  'claude-4.8-opus-high': 'claude-opus-4-8',
  'claude-4.8-opus': 'claude-opus-4-8',
  'claude-opus-4-8': 'claude-opus-4-8',
  'claude-4.7-opus-high': 'claude-opus-4-8',
  'claude-4.7-opus': 'claude-opus-4-8',
  'claude-opus-4-7': 'claude-opus-4-8',
  'claude-4.6-sonnet': 'claude-sonnet-4-6',
  'claude-4.5-haiku': 'claude-haiku-4-5',
  'claude-opus-4-6': 'claude-opus-4-8',
  'claude-sonnet-4-6': 'claude-sonnet-4-6',
  'claude-haiku-4-5': 'claude-haiku-4-5',
};

const CURSOR_GPT_MAP: Record<string, string> = {
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
  'gemini-3.5-flash': 'gemini-3.5-flash',
  'gemini-3-flash': 'gemini-3.5-flash',
  'gemini-3.1-pro-preview': 'gemini-3.1-pro',
  'gemini-3.1-pro': 'gemini-3.1-pro',
};

export function normalizeCursor(modelField: string): string | null {
  const first = modelField.split(',')[0].trim();
  if (!first) return null;
  return CURSOR_CLAUDE_MAP[first] ?? CURSOR_GPT_MAP[first] ?? CURSOR_GEMINI_MAP[first] ?? first;
}

// ─── Copilot vocabulary (FR-COPY-0021) ────────────────────────────────────────
// Uses FIRST comma-split token — same intentional multi-vendor ordering design as Cursor (FR-ARCH-0046).
// Map via COPILOT_CLAUDE_MAP / COPILOT_GPT_MAP. Decoded from baseline core-copilot/agents/*.agent.md.

const COPILOT_CLAUDE_MAP: Record<string, string> = {
  'claude-4.8-opus-high': 'Claude Opus 4.8',
  'claude-4.8-opus': 'Claude Opus 4.8',
  'claude-opus-4-8': 'Claude Opus 4.8',
  'claude-4.7-opus-high': 'Claude Opus 4.8',
  'claude-4.7-opus': 'Claude Opus 4.8',
  'claude-opus-4-7': 'Claude Opus 4.8',
  'claude-4.6-sonnet': 'Claude Sonnet 4.6',
  'claude-4.5-haiku': 'Claude Haiku 4.5',
  'claude-opus-4-6': 'Claude Opus 4.8',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-haiku-4-5': 'Claude Haiku 4.5',
};

const COPILOT_GPT_MAP: Record<string, string> = {
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
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro (Preview)',
  'gemini-3.1-pro': 'Gemini 3.1 Pro (Preview)',
  'gemini-3-flash': 'Gemini 3.5 Flash',
};

export function normalizeCopilot(modelField: string): string | null {
  const first = modelField.split(',')[0].trim();
  if (!first) return null;
  return COPILOT_CLAUDE_MAP[first] ?? COPILOT_GPT_MAP[first] ?? COPILOT_GEMINI_MAP[first] ?? first;
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
