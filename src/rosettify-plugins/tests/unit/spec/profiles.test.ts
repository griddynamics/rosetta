// FR-PROF-0001.AC2-AC7, DATA-CFG-0006.AC5-AC11 — profile descriptor loading, fail-fast validation
// (V-exist, V-parse, V1, V2, V3, V7), optional-field defaulting (AC10/AC11), and
// effective-vocabulary resolution (V4 standalone inheritance, V5 silent dead-entry acceptance).
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadProfile,
  resolveEffectiveVocabulary,
  ProfileValidationError,
} from '../../../src/spec/profiles.js';
import type { ProfileDescriptor } from '../../../src/spec/profiles.js';
import type { ModelVocabulary } from '../../../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Real committed reference profile (src/rosettify-plugins/profiles/lightweight.json), used to prove
// loadProfile accepts genuine descriptor content, not just hand-built fixtures.
const REPO_PROFILES_DIR = path.join(__dirname, '..', '..', '..', 'profiles');

/** Isolated, self-cleaning temp profile directory for one test — no shared mutable state. */
function withTempProfileDir(fn: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rosettify-profiles-test-'));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeProfile(dir: string, name: string, content: unknown): void {
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  fs.writeFileSync(path.join(dir, `${name}.json`), text, 'utf8');
}

function captureError(fn: () => void): Error {
  try {
    fn();
  } catch (err) {
    return err as Error;
  }
  throw new Error('expected fn to throw, but it did not');
}

const VALID_DESCRIPTOR = {
  modelOverrides: {
    'claude': { opus: 'claude-sonnet-5', sonnet: 'claude-sonnet-5' },
    'cursor': { 'claude-sonnet-5': 'gpt-5.4', 'claude-opus-4-8': 'gpt-5.4' },
    'copilot': { 'claude-opus-4-8': 'Claude Sonnet 5' },
    'codex': { 'gpt-5.5-high': 'gpt-5.4-medium' },
  },
};

describe('loadProfile — valid descriptor', () => {
  it('loads the real committed lightweight.json reference profile, now an empty descriptor', () => {
    // The suffixes this profile used to carry moved onto the plugin-set VARIANT in plugins.json:
    // the same `lightweight` profile is activated by variants that suffix differently (the
    // `rosetta` set's lightweight variant suffixes `-light`, every other set's suffixes nothing),
    // so a suffix cannot be a property of the profile. What remains is an empty descriptor whose
    // sole job is to make `profile-lightweight-only` filename directives resolve.
    const descriptor = loadProfile(REPO_PROFILES_DIR, 'lightweight');
    expect(descriptor).toEqual({ modelOverrides: {} });
  });

  it('loads a fixture profile from an isolated temp dir, idempotently (same result every call)', () => {
    withTempProfileDir((dir) => {
      writeProfile(dir, 'valid', VALID_DESCRIPTOR);
      const first = loadProfile(dir, 'valid');
      const second = loadProfile(dir, 'valid');
      expect(first).toEqual(VALID_DESCRIPTOR);
      expect(second).toEqual(VALID_DESCRIPTOR);
    });
  });
});

describe('loadProfile — V-exist: missing profile file', () => {
  it('throws ProfileValidationError before any output, naming the resolved file path', () => {
    withTempProfileDir((dir) => {
      const err = captureError(() => loadProfile(dir, 'does-not-exist'));
      expect(err).toBeInstanceOf(ProfileValidationError);
      expect(err.message).toContain(path.join(dir, 'does-not-exist.json'));
    });
  });
});

describe('loadProfile — V-parse: unparseable JSON', () => {
  it('throws ProfileValidationError naming the file, not swallowing the parse error', () => {
    withTempProfileDir((dir) => {
      writeProfile(dir, 'broken', '{ this is not valid json');
      const err = captureError(() => loadProfile(dir, 'broken'));
      expect(err).toBeInstanceOf(ProfileValidationError);
      expect(err.message).toContain(path.join(dir, 'broken.json'));
      expect(err.message).toContain('not valid JSON');
    });
  });
});

describe('loadProfile — V1: modelOverrides outer key not one of the seven target names', () => {
  // 'core-cursor' is the RETIRED spelling: target ids are bare IDE identities now, so the old
  // `core-`-prefixed names must be rejected rather than silently matching nothing.
  it.each(['core-cursor', 'cursr', 'windsurf'])(
    'throws naming the offending key "%s" and listing the seven accepted names',
    (badKey) => {
      withTempProfileDir((dir) => {
        writeProfile(dir, 'bad-outer', {
          modelOverrides: { [badKey]: { opus: 'claude-sonnet-5' } },
        });
        const err = captureError(() => loadProfile(dir, 'bad-outer'));
        expect(err).toBeInstanceOf(ProfileValidationError);
        // Names the offending value.
        expect(err.message).toContain(`"${badKey}"`);
        // Lists the accepted set.
        expect(err.message).toContain('claude');
        expect(err.message).toContain('cursor-standalone');
        expect(err.message).toContain('copilot-standalone');
      });
    },
  );
});

describe('loadProfile — V2: an antigravity block', () => {
  it('throws ProfileValidationError reporting that target has no model vocabulary to override', () => {
    withTempProfileDir((dir) => {
      writeProfile(dir, 'antigravity-block', {
        modelOverrides: { 'antigravity': {} },
      });
      const err = captureError(() => loadProfile(dir, 'antigravity-block'));
      expect(err).toBeInstanceOf(ProfileValidationError);
      expect(err.message).toContain('"antigravity"');
      expect(err.message).toContain('no model vocabulary');
    });
  });
});

describe('loadProfile — V3: a claude inner key outside {opus, sonnet, haiku}', () => {
  it('throws on the trap case "claude-opus-4-8" — looks right, but would silently drop Opus without this check', () => {
    withTempProfileDir((dir) => {
      writeProfile(dir, 'bad-inner', {
        modelOverrides: { 'claude': { 'claude-opus-4-8': 'claude-sonnet-5' } },
      });
      const err = captureError(() => loadProfile(dir, 'bad-inner'));
      expect(err).toBeInstanceOf(ProfileValidationError);
      // Names the offending value.
      expect(err.message).toContain('"claude-opus-4-8"');
      // Lists the accepted closed set.
      expect(err.message).toContain('opus');
      expect(err.message).toContain('sonnet');
      expect(err.message).toContain('haiku');
    });
  });
});

describe('loadProfile — V6: modelOverrides entry must be an object', () => {
  it('throws when a block is a string, naming the offending target key', () => {
    withTempProfileDir((dir) => {
      writeProfile(dir, 'non-object-block', {
        modelOverrides: { 'cursor': 'oops' },
      });
      const err = captureError(() => loadProfile(dir, 'non-object-block'));
      expect(err).toBeInstanceOf(ProfileValidationError);
      expect(err.message).toContain('"cursor"');
      expect(err.message).toContain('object');
    });
  });

  it('throws when a block is an array, naming the offending target key', () => {
    withTempProfileDir((dir) => {
      writeProfile(dir, 'array-block', {
        modelOverrides: { 'cursor': ['a'] },
      });
      const err = captureError(() => loadProfile(dir, 'array-block'));
      expect(err).toBeInstanceOf(ProfileValidationError);
      expect(err.message).toContain('"cursor"');
      expect(err.message).toContain('object');
    });
  });

  it('throws when an inner value is not a string, naming the offending target and inner key', () => {
    withTempProfileDir((dir) => {
      writeProfile(dir, 'non-string-inner-value', {
        modelOverrides: { 'cursor': { 'gpt-5.4': 42 } },
      });
      const err = captureError(() => loadProfile(dir, 'non-string-inner-value'));
      expect(err).toBeInstanceOf(ProfileValidationError);
      expect(err.message).toContain('"cursor"');
      expect(err.message).toContain('"gpt-5.4"');
      expect(err.message).toContain('must be strings');
    });
  });
});

describe('loadProfile — modelOverrides must be an object (FR-PROF-0001)', () => {
  it.each([
    ['a number', 5],
    ['a string', 'oops'],
    ['an array', ['cursor']],
  ])('rejects modelOverrides that is %s', (_label, badValue) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prof-mo-'));
    try {
      fs.writeFileSync(
        path.join(dir, 'bad.json'),
        JSON.stringify({ modelOverrides: badValue }),
      );
      expect(() => loadProfile(dir, 'bad')).toThrow(/modelOverrides/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('loadProfile — the suffix fields moved to the plugin-set variant', () => {
  // Regression guard for the move: a descriptor still carrying one of the three old suffix fields
  // must FAIL rather than silently ignore it, or a profile authored against the old shape would
  // quietly stop suffixing anything.
  it.each(['destinationSuffix', 'pluginNameSuffix', 'pluginDescriptionSuffix'])(
    'rejects the retired field "%s" as unrecognized, pointing at plugins.json',
    (field) => {
      withTempProfileDir((dir) => {
        writeProfile(dir, 'old-shape', { modelOverrides: {}, [field]: '-light' });
        const err = captureError(() => loadProfile(dir, 'old-shape'));
        expect(err).toBeInstanceOf(ProfileValidationError);
        expect(err.message).toContain(`"${field}"`);
        expect(err.message).toContain('plugins.json');
      });
    },
  );
});

describe('loadProfile — every descriptor field is optional (DATA-CFG-0006.AC10/AC11)', () => {
  it('normalizes an absent modelOverrides to an empty map', () => {
    withTempProfileDir((dir) => {
      writeProfile(dir, 'no-overrides', {});
      expect(loadProfile(dir, 'no-overrides').modelOverrides).toEqual({});
    });
  });

  it('accepts a wholly empty descriptor', () => {
    withTempProfileDir((dir) => {
      writeProfile(dir, 'empty', {});
      expect(loadProfile(dir, 'empty')).toEqual({
        modelOverrides: {},
      });
    });
  });

  it('an empty descriptor leaves every target its built-in vocabulary, non-exhaustively', () => {
    withTempProfileDir((dir) => {
      writeProfile(dir, 'empty-desc', {});
      const descriptor = loadProfile(dir, 'empty-desc');
      const builtin: ModelVocabulary = { map: { opus: 'claude-opus-4-8' } };
      const resolved = resolveEffectiveVocabulary('claude', builtin, descriptor);
      expect(resolved.map).toBe(builtin.map);
      expect(resolved.exhaustive).toBe(false);
    });
  });
});

describe('loadProfile — V7: unrecognized top-level descriptor field', () => {
  it('throws ProfileValidationError naming the unrecognized field', () => {
    withTempProfileDir((dir) => {
      writeProfile(dir, 'extra-field', {
        modelOverrides: {},
        extraTopLevelField: 'oops',
      });
      const err = captureError(() => loadProfile(dir, 'extra-field'));
      expect(err).toBeInstanceOf(ProfileValidationError);
      expect(err.message).toContain('"extraTopLevelField"');
    });
  });
});

describe('resolveEffectiveVocabulary — no profile / no block', () => {
  const builtin: ModelVocabulary = {
    map: { opus: 'claude-opus-4-8', sonnet: 'claude-sonnet-5', haiku: 'claude-haiku-4-5' },
  };

  it('with no profile at all, returns the built-in map unchanged with exhaustive falsy', () => {
    const result = resolveEffectiveVocabulary('claude', builtin, null);
    expect(result.map).toBe(builtin.map);
    expect(result.exhaustive).toBeFalsy();
  });

  it('with a profile that declares no block for this target, returns the built-in map unchanged with exhaustive falsy', () => {
    const profile: ProfileDescriptor = {
      modelOverrides: { 'cursor': { 'claude-sonnet-5': 'gpt-5.4' } },
    };
    const result = resolveEffectiveVocabulary('claude', builtin, profile);
    expect(result.map).toBe(builtin.map);
    expect(result.exhaustive).toBeFalsy();
  });
});

describe('resolveEffectiveVocabulary — a block replaces the built-in map, exhaustively', () => {
  const builtin: ModelVocabulary = {
    map: { opus: 'claude-opus-4-8', sonnet: 'claude-sonnet-5', haiku: 'claude-haiku-4-5' },
  };

  it('a declared block is returned as the whole effective map with exhaustive:true', () => {
    const block = { opus: 'claude-sonnet-5' };
    const profile: ProfileDescriptor = {
      modelOverrides: { 'claude': block },
    };
    const result = resolveEffectiveVocabulary('claude', builtin, profile);
    expect(result.map).toBe(block);
    expect(result.exhaustive).toBe(true);
  });
});

describe('resolveEffectiveVocabulary — V4: standalone block inheritance', () => {
  const builtin: ModelVocabulary = { map: { 'claude-sonnet-5': 'claude-sonnet-5' } };

  it('a standalone with no block of its own INHERITS its parent (cursor) block', () => {
    const parentBlock = { 'claude-sonnet-5': 'gpt-5.4' };
    const profile: ProfileDescriptor = {
      modelOverrides: { 'cursor': parentBlock },
    };
    const result = resolveEffectiveVocabulary('cursor-standalone', builtin, profile);
    expect(result.map).toBe(parentBlock);
    expect(result.exhaustive).toBe(true);
  });

  it('an explicit standalone block OVERRIDES the inherited parent block rather than merging with it', () => {
    const parentBlock = { 'claude-sonnet-5': 'gpt-5.4' };
    const standaloneBlock = { 'claude-sonnet-5': 'gpt-5.5' };
    const profile: ProfileDescriptor = {
      modelOverrides: {
        'cursor': parentBlock,
        'cursor-standalone': standaloneBlock,
      },
    };
    const result = resolveEffectiveVocabulary('cursor-standalone', builtin, profile);
    expect(result.map).toBe(standaloneBlock);
    expect(result.exhaustive).toBe(true);
  });

  it('the same inheritance applies to core-copilot-standalone from core-copilot', () => {
    const parentBlock = { 'claude-opus-4-8': 'Claude Sonnet 5' };
    const profile: ProfileDescriptor = {
      modelOverrides: { 'copilot': parentBlock },
    };
    const result = resolveEffectiveVocabulary('copilot-standalone', builtin, profile);
    expect(result.map).toBe(parentBlock);
    expect(result.exhaustive).toBe(true);
  });
});

describe('resolveEffectiveVocabulary — V5: dead inner entry accepted silently', () => {
  const builtin: ModelVocabulary = { map: { opus: 'claude-opus-4-8' } };

  it('a key matching no model token anywhere in the instruction source is passed through as-is — no throw, no warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const block = { opus: 'claude-sonnet-5', 'nonexistent-model-token': 'claude-haiku-4-5' };
      const profile: ProfileDescriptor = {
        modelOverrides: { 'claude': block },
      };

      expect(() => resolveEffectiveVocabulary('claude', builtin, profile)).not.toThrow();
      const result = resolveEffectiveVocabulary('claude', builtin, profile);

      expect(result.map).toEqual(block);
      expect(result.exhaustive).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
