// FR-ARCH-0020–0024 — tilde grammar, directive parsing, target-only/overwrite tokens
// FR-PROF-0030 — profile-scoped filename directive (profile-<name>-only), namespaced apart
// from the target-only token kind.
import { describe, it, expect } from 'vitest';
import { parseDirectives, matchesTarget, matchesProfile } from '../../../src/vfs/directives.js';

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

  it('accepts a trailing directive fence', () => {
    expect(parseDirectives('file~overwrite~.md').conditions).toEqual(
      new Set(['overwrite']),
    );
  });

  it('returns empty conditions when filename has no tilde', () => {
    const result = parseDirectives('rules-index.md');
    expect(result.conditions.size).toBe(0);
    expect(result.cleanName).toBe('rules-index.md');
  });

  it('clean name does not include directive tokens', () => {
    const result = parseDirectives('policy~overwrite~core-claude-only.md');
    expect(result.cleanName).toBe('policy.md');
    expect(result.conditions.size).toBe(2);
  });

  it('rejects unknown target-only tokens with filename context and allowed directives', () => {
    expect(() => parseDirectives('policy~clade-only.md')).toThrow(
      'Unknown filename directive "clade-only" in "policy~clade-only.md". Allowed directives: overwrite, core-claude-only',
    );
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
    expect(matchesTarget(new Set(['core-cursor-only']), 'core-claude')).toBe(false);
  });

  it('handles combination of overwrite and target-only — target-only still filters', () => {
    // overwrite doesn't override target-only
    expect(matchesTarget(new Set(['overwrite', 'core-claude-only']), 'core-cursor')).toBe(false);
    expect(matchesTarget(new Set(['overwrite', 'core-claude-only']), 'core-claude')).toBe(true);
  });

  // FR-PROF-0030.AC3: a profile-<name>-only token is a distinct, namespaced token kind — not a
  // target selector. Regression test: without the profile- prefix guard, this bare "-only"-suffixed
  // token would have been read by matchesTarget as a target-only selector for the (nonexistent)
  // target "profile-lightweight", dropping the file from every one of the seven targets.
  it('does not misread a profile-<name>-only token as a target selector (regression guard)', () => {
    for (const target of ['core-claude', 'core-cursor', 'core-copilot', 'core-codex', 'core-antigravity', 'core-cursor-standalone', 'core-copilot-standalone']) {
      expect(matchesTarget(new Set(['profile-lightweight-only']), target)).toBe(true);
    }
  });

  it('profile-<name>-only stays inert to matchesTarget even combined with overwrite', () => {
    expect(matchesTarget(new Set(['profile-lightweight-only', 'overwrite']), 'core-codex')).toBe(true);
  });
});

describe('matchesProfile', () => {
  it('returns true when there are no conditions', () => {
    expect(matchesProfile(new Set(), 'lightweight')).toBe(true);
    expect(matchesProfile(new Set(), null)).toBe(true);
  });

  it('includes a profile-<name>-only file only while that exact profile is active (FR-PROF-0030.AC1)', () => {
    expect(matchesProfile(new Set(['profile-lightweight-only']), 'lightweight')).toBe(true);
  });

  it('excludes a profile-<name>-only file when no profile is active (FR-PROF-0040 guard)', () => {
    expect(matchesProfile(new Set(['profile-lightweight-only']), null)).toBe(false);
  });

  it('excludes a profile-<name>-only file when a DIFFERENT profile is active', () => {
    expect(matchesProfile(new Set(['profile-lightweight-only']), 'other-profile')).toBe(false);
  });

  it('unrelated conditions (overwrite, target-only) do not affect the profile check', () => {
    expect(matchesProfile(new Set(['overwrite', 'core-claude-only']), null)).toBe(true);
    expect(matchesProfile(new Set(['overwrite', 'core-claude-only']), 'lightweight')).toBe(true);
  });
});

// FR-PROF-0030.AC5: the closing tilde fence must not contribute a directive. parseDirectives drops
// the trailing empty segment outright, so it yields no condition at all rather than an inert one —
// which is also what lets the closed allow-list run without an empty string tripping it.
describe('the closing tilde fence contributes no directive', () => {
  it('a fenced multi-directive stem yields only the real tokens, and both matchers act correctly', () => {
    const { conditions } = parseDirectives('coding-flow~profile-lightweight-only~overwrite~.md');
    expect(conditions.has('')).toBe(false);
    expect([...conditions].sort()).toEqual(['overwrite', 'profile-lightweight-only']);
    expect(matchesTarget(conditions, 'core-claude')).toBe(true);
    expect(matchesProfile(conditions, 'lightweight')).toBe(true);
    expect(matchesProfile(conditions, null)).toBe(false);
  });

  it('an unfenced stem parses identically, so the fence is optional in the grammar', () => {
    const fenced = parseDirectives('coding-flow~profile-lightweight-only~overwrite~.md');
    const unfenced = parseDirectives('coding-flow~profile-lightweight-only~overwrite.md');
    expect([...unfenced.conditions].sort()).toEqual([...fenced.conditions].sort());
    expect(unfenced.cleanName).toBe(fenced.cleanName);
  });
});
