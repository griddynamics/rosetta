// FR-ARCH-0020–0024 — tilde grammar, directive parsing, target-only/overwrite tokens
import { describe, it, expect } from 'vitest';
import { parseDirectives, matchesTarget } from '../../../src/vfs/directives.js';

describe('parseDirectives', () => {
  it('returns clean name unchanged when no directives', () => {
    const result = parseDirectives('bootstrap-core-policy.md');
    expect(result.cleanName).toBe('bootstrap-core-policy.md');
    expect(result.conditions.size).toBe(0);
  });

  it('strips single directive token from stem, preserves extension', () => {
    const result = parseDirectives('file~overwrite.md');
    expect(result.cleanName).toBe('file.md');
    expect(result.conditions.has('overwrite')).toBe(true);
  });

  it('strips target-only token', () => {
    const result = parseDirectives('rule~core-claude-only.md');
    expect(result.cleanName).toBe('rule.md');
    expect(result.conditions.has('core-claude-only')).toBe(true);
  });

  it('handles multiple directive tokens', () => {
    const result = parseDirectives('file~overwrite~core-claude-only.md');
    expect(result.cleanName).toBe('file.md');
    expect(result.conditions.has('overwrite')).toBe(true);
    expect(result.conditions.has('core-claude-only')).toBe(true);
  });

  it('handles file with no extension', () => {
    const result = parseDirectives('myfile~overwrite');
    expect(result.cleanName).toBe('myfile');
    expect(result.conditions.has('overwrite')).toBe(true);
  });

  it('returns empty conditions when filename has no tilde', () => {
    const result = parseDirectives('rules-index.md');
    expect(result.conditions.size).toBe(0);
    expect(result.cleanName).toBe('rules-index.md');
  });

  it('clean name does not include directive tokens', () => {
    const result = parseDirectives('policy~overwrite~r2-only.md');
    expect(result.cleanName).toBe('policy.md');
    expect(result.conditions.size).toBe(2);
  });
});

describe('matchesTarget', () => {
  it('returns true when no conditions set', () => {
    expect(matchesTarget(new Set(), 'core-claude')).toBe(true);
  });

  it('returns true when target matches X-only condition', () => {
    expect(matchesTarget(new Set(['core-claude-only']), 'core-claude')).toBe(true);
  });

  it('returns false when different target has X-only condition', () => {
    expect(matchesTarget(new Set(['core-cursor-only']), 'core-claude')).toBe(false);
  });

  it('returns true for overwrite condition with any target', () => {
    expect(matchesTarget(new Set(['overwrite']), 'core-claude')).toBe(true);
    expect(matchesTarget(new Set(['overwrite']), 'core-codex')).toBe(true);
  });

  it('returns false when only condition is target-only for different target', () => {
    expect(matchesTarget(new Set(['acme-only']), 'core')).toBe(false);
  });

  it('handles combination of overwrite and target-only — target-only still filters', () => {
    // overwrite doesn't override target-only
    expect(matchesTarget(new Set(['overwrite', 'core-claude-only']), 'core-cursor')).toBe(false);
    expect(matchesTarget(new Set(['overwrite', 'core-claude-only']), 'core-claude')).toBe(true);
  });
});
