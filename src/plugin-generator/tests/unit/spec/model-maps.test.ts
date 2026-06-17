// DATA-CFG-0004 — all four vocabularies + fallbacks
import { describe, it, expect } from 'vitest';
import {
  normalizeClaude,
  normalizeCursor,
  normalizeCopilot,
  normalizeCodex,
} from '../../../src/spec/model-maps.js';

describe('normalizeClaude', () => {
  it('scans for first claude-compatible token (not first overall)', () => {
    // PARITY-9: gpt is first, claude is second — should find claude
    expect(normalizeClaude('gpt-5.5-high, claude-4.8-opus-high')).toBe('claude-opus-4-8');
  });

  it('maps opus token to "claude-opus-4-8"', () => {
    expect(normalizeClaude('claude-4.8-opus-high')).toBe('claude-opus-4-8');
  });

  it('maps sonnet token to "claude-sonnet-4-6"', () => {
    expect(normalizeClaude('claude-4.6-sonnet')).toBe('claude-sonnet-4-6');
  });

  it('maps haiku token to "claude-haiku-4-5"', () => {
    expect(normalizeClaude('claude-4.5-haiku')).toBe('claude-haiku-4-5');
  });

  it('returns "inherit" for claude-* token without opus/sonnet/haiku', () => {
    expect(normalizeClaude('claude-unknown-model')).toBe('inherit');
  });

  it('returns null when no claude-compatible token', () => {
    expect(normalizeClaude('gpt-5.5-high, gemini-3.1')).toBeNull();
  });

  it('handles reviewer case: gpt,gemini,claude-sonnet → claude-sonnet-4-6', () => {
    expect(normalizeClaude('gpt-5.4-medium, gemini-3.1-pro, claude-4.6-sonnet')).toBe('claude-sonnet-4-6');
  });
});

describe('normalizeCursor', () => {
  it('takes first model overall', () => {
    // First is claude → maps to canonical
    expect(normalizeCursor('claude-4.8-opus-high, gpt-5.5-high')).toBe('claude-opus-4-8');
  });

  it('maps gpt effort variant via exhaustive table', () => {
    expect(normalizeCursor('gpt-5.5-high')).toBe('gpt-5.5');
  });

  it('maps gpt-5.4-high via exhaustive table', () => {
    expect(normalizeCursor('gpt-5.4-high, other')).toBe('gpt-5.4');
  });

  it('maps claude-4.6-sonnet to claude-sonnet-4-6', () => {
    expect(normalizeCursor('claude-4.6-sonnet')).toBe('claude-sonnet-4-6');
  });

  it('returns null for empty string', () => {
    expect(normalizeCursor('')).toBeNull();
  });

  it('passthrough unknown token', () => {
    expect(normalizeCursor('some-unknown-model')).toBe('some-unknown-model');
  });
});

describe('normalizeCopilot', () => {
  it('maps claude-4.8-opus-high to display name', () => {
    expect(normalizeCopilot('claude-4.8-opus-high')).toBe('Claude Opus 4.8');
  });

  it('maps gpt-5.5-high to GPT-5.5 via exhaustive table', () => {
    expect(normalizeCopilot('gpt-5.5-high, claude-4.8-opus')).toBe('GPT-5.5');
  });

  it('maps gpt-5.4-high to GPT-5.4 via exhaustive table', () => {
    expect(normalizeCopilot('gpt-5.4-high, other')).toBe('GPT-5.4');
  });

  it('returns null for empty string', () => {
    expect(normalizeCopilot('')).toBeNull();
  });

  it('maps claude-4.5-haiku to Claude Haiku 4.5', () => {
    expect(normalizeCopilot('claude-4.5-haiku')).toBe('Claude Haiku 4.5');
  });
});

describe('normalizeCodex', () => {
  it('finds first gpt-* token and splits effort', () => {
    expect(normalizeCodex('claude-4.8-opus-high, gpt-5.5-high')).toEqual({ model: 'gpt-5.5', effort: 'high' });
  });

  it('handles gpt-first agent (reviewer pattern)', () => {
    expect(normalizeCodex('gpt-5.5-high, gemini')).toEqual({ model: 'gpt-5.5', effort: 'high' });
  });

  it('splits -low effort', () => {
    expect(normalizeCodex('gpt-5.4-low')).toEqual({ model: 'gpt-5.4', effort: 'low' });
  });

  it('returns null when no gpt-* token', () => {
    expect(normalizeCodex('claude-4.8-opus-high, gemini')).toBeNull();
  });

  it('returns effort: undefined for gpt without effort suffix', () => {
    expect(normalizeCodex('gpt-5.5')).toEqual({ model: 'gpt-5.5', effort: undefined });
  });

  it('returns null for empty string', () => {
    expect(normalizeCodex('')).toBeNull();
  });
});
