// FR-ARCH-0020–0024 — tilde grammar, directive parsing, target-only/overwrite tokens
// FR-PROF-0030 — profile-scoped filename directive (profile-<name>-only), namespaced apart
// from the target-only token kind.
import { describe, it, expect } from 'vitest';
import { parseDirectives, matchesTarget, matchesProfile } from '../../../src/vfs/directives.js';
import { TARGET_FAMILY_KEYS, TARGET_NAME_LIST } from '../../../src/spec/target-names.js';

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

// FR-ARCH-0023 — a TargetOnlyToken accepts an IDE-family key as well as an exact target name.
// Before this, `rule~copilot-only~.md` was silently dropped from every plugin (the token ended in
// `-only`, so target matching excluded it everywhere including Copilot) and later became a hard
// build failure once the allow-list landed. Neither is what the unit specifies.
describe('TargetOnlyToken family keys (FR-ARCH-0023)', () => {
  const conditionsFor = (token: string) => parseDirectives(`rule~${token}~.md`).conditions;
  const matching = (token: string) =>
    TARGET_NAME_LIST.filter((t) => matchesTarget(conditionsFor(token), t));

  it('copilot-only expands to both Copilot targets and nothing else (AC1)', () => {
    expect(matching('copilot-only')).toEqual(['core-copilot', 'core-copilot-standalone']);
  });

  it('cursor-only expands to both Cursor targets', () => {
    expect(matching('cursor-only')).toEqual(['core-cursor', 'core-cursor-standalone']);
  });

  it.each(['claude-only', 'codex-only', 'antigravity-only'])(
    'a single-target IDE family (%s) expands to exactly one target',
    (token) => {
      expect(matching(token)).toHaveLength(1);
    },
  );

  it('an exact target name stays exact: core-cursor-only does NOT pull in the standalone (AC2)', () => {
    expect(matching('core-cursor-only')).toEqual(['core-cursor']);
  });

  it('core-copilot-standalone-only participates for that exact target only (AC2)', () => {
    expect(matching('core-copilot-standalone-only')).toEqual(['core-copilot-standalone']);
  });

  it('an unmatched target contributes nothing (AC3)', () => {
    expect(matchesTarget(conditionsFor('copilot-only'), 'core-claude')).toBe(false);
  });

  it('a family key composes with overwrite', () => {
    const { conditions } = parseDirectives('rule~copilot-only~overwrite~.md');
    expect(conditions).toEqual(new Set(['copilot-only', 'overwrite']));
    expect(matchesTarget(conditions, 'core-copilot-standalone')).toBe(true);
    expect(matchesTarget(conditions, 'core-codex')).toBe(false);
  });

  it('every family key is accepted by the directive allow-list', () => {
    for (const family of TARGET_FAMILY_KEYS) {
      expect(() => parseDirectives(`rule~${family}-only~.md`)).not.toThrow();
    }
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

  it('rejects a nameless profile-only token, so the shape exemption is not a hole (FR-ARCH-0060)', () => {
    expect(() => parseDirectives('file~profile-only.md')).toThrow('Unknown filename directive "profile-only"');
  });

  it('accepts any profile name without consulting a profile source (FR-ARCH-0060)', () => {
    expect(parseDirectives('file~profile-some-client-only~.md').conditions)
      .toEqual(new Set(['profile-some-client-only']));
  });

  it('an unfenced stem parses identically, so the fence is optional in the grammar', () => {
    const fenced = parseDirectives('coding-flow~profile-lightweight-only~overwrite~.md');
    const unfenced = parseDirectives('coding-flow~profile-lightweight-only~overwrite.md');
    expect([...unfenced.conditions].sort()).toEqual([...fenced.conditions].sort());
    expect(unfenced.cleanName).toBe(fenced.cleanName);
  });
});
