// FR-PROF-0001, FR-PROF-0010, DATA-CFG-0006 — profile descriptor: per-target model-vocabulary
// overrides. Mirrors spec/releases.ts in shape and idiom: a keyed-lookup module with a
// throw-on-unknown loader, except here the descriptor comes from a per-run JSON file rather than a
// static in-module record.
//
// Destination and manifest suffixing USED to live here as destinationSuffix / pluginNameSuffix /
// pluginDescriptionSuffix. Those moved onto the plugin-set VARIANT in plugins.json: a suffix is a
// property of "which flavour of this set am I emitting", not of "which models does this build
// prefer", and the same profile is now activated by variants that suffix differently (the `rosetta`
// set's lightweight variant suffixes `-light`; every other set's lightweight variant suffixes
// nothing). A profile descriptor is therefore allowed to be completely empty — `{}` is valid, and
// the shipped `lightweight` profile is exactly that. Its one remaining job in that state is to make
// `profile-lightweight-only` filename directives resolve.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { TARGET_NAME_LIST, isTargetName } from './target-names.js';
export type { TargetName } from './target-names.js';
import type { ModelVocabulary } from '../types.js';
import type { TargetName } from './target-names.js';

/**
 * The seven target identities (DATA-CFG-0003 / `spec.name` values) come from `spec/target-names.ts`,
 * the single source of truth shared with `spec/targets.ts` and with the FilenameDirective allow-list
 * in `vfs/directives.ts`. They are deliberately NOT imported from `spec/targets.ts`: that module
 * imports `loadProfile()`/`resolveEffectiveVocabulary()` from here to resolve each spec's effective
 * vocabulary and destination suffix, so importing it back would cycle
 * (`profiles.ts` -> `targets.ts` -> `profiles.ts`). `target-names.ts` imports nothing at all, so
 * neither direction cycles.
 */

// FR-PROF-0001.AC6, DATA-CFG-0006.AC3 — claude's closed inner key-space (mirrors
// CLAUDE_CODE_MAP's family keying in spec/model-maps.ts).
const CLAUDE_INNER_KEYS = ['opus', 'sonnet', 'haiku'] as const;
type ClaudeInnerKey = (typeof CLAUDE_INNER_KEYS)[number];

function isClaudeInnerKey(value: string): value is ClaudeInnerKey {
  return (CLAUDE_INNER_KEYS as readonly string[]).includes(value);
}

// DATA-CFG-0006.AC5 — a standalone target with no block of its own inherits its parent's block.
const STANDALONE_PARENT: Partial<Record<TargetName, TargetName>> = {
  'cursor-standalone': 'cursor',
  'copilot-standalone': 'copilot',
};

// The one, and only one, top-level field a profile descriptor may declare (FR-PROF-0001.AC7,
// DATA-CFG-0006.AC9). An empty descriptor `{}` declares none of them and is valid.
const DESCRIPTOR_FIELDS = ['modelOverrides'] as const;

// DATA-CFG-0006 — profile descriptor shape.
export interface ProfileDescriptor {
  /**
   * Outer key = target name (one of the seven TargetName values); inner key-space = that
   * target's own vocabulary keying (closed {opus,sonnet,haiku} set for claude, exact source
   * model tokens for cursor/copilot/codex and their standalones). Partial, not
   * Record<TargetName, ...>: a real profile declares blocks only for the targets it overrides
   * — a total Record would force every descriptor literal, including every test fixture, to name
   * all seven keys, which does not match how profiles are actually authored. The shipped
   * `lightweight` profile declares no block at all.
   */
  modelOverrides: Partial<Record<TargetName, Record<string, string>>>;
}

/**
 * Thrown by loadProfile() for any validation failure (file missing/unparseable, V1/V2/V3/V6, or an
 * unrecognized top-level field). Every message is plain and user-facing, naming the offending
 * value and, where applicable, the accepted set — never a requirement id or an internal module
 * path. Caught at generate() pre-flight (S12), before buildVfs, so a thrown
 * ProfileValidationError guarantees no output is written (FR-PROF-0001).
 */
export class ProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileValidationError';
  }
}

function fail(message: string): never {
  throw new ProfileValidationError(message);
}

/**
 * Resolves `<profileSource>/<name>.json`, parses it, and fully validates its structure before
 * returning. Throws ProfileValidationError on the first violation encountered — file missing,
 * unparseable JSON, a non-object root, an unrecognized top-level field (V7), an unknown
 * modelOverrides outer key (V1), an `antigravity` block (V2), a modelOverrides entry that is not
 * itself an object (V6), a non-string inner value within an entry (V6), or a `claude` inner key
 * outside {opus,sonnet,haiku} (V3). An empty descriptor `{}` declares nothing and is valid — that
 * is the shipped `lightweight` profile. Does NOT check whether an inner key matches any model token in the
 * instruction source (V5) — that is deliberately deferred to resolveEffectiveVocabulary(), and does
 * NOT apply standalone inheritance (V4) — also resolution-time, not load-time (FR-PROF-0010.AC3-5).
 */
export function loadProfile(profileSource: string, name: string): ProfileDescriptor {
  const filePath = path.join(profileSource, `${name}.json`);

  if (!fs.existsSync(filePath)) {
    fail(`Profile file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    fail(`Profile file ${filePath} is not valid JSON: ${reason}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail(`Profile file ${filePath} does not contain a JSON object.`);
  }
  const root = parsed as Record<string, unknown>;

  for (const key of Object.keys(root)) {
    if (!(DESCRIPTOR_FIELDS as readonly string[]).includes(key)) {
      fail(
        `Unrecognized profile field "${key}". A profile descriptor defines exactly: ` +
          `modelOverrides. Destination and manifest suffixes are declared on a plugin-set ` +
          `variant in plugins.json, not on a profile.`,
      );
    }
  }

  // FR-PROF-0001: `modelOverrides` itself must be an object. Without this check a non-object
  // (e.g. a number or an array) yields an empty Object.entries() and the run proceeds with NO
  // overrides at all — silently producing an unprofiled build from a profiled invocation, which
  // is the opposite of fail-fast.
  if (
    root.modelOverrides !== undefined &&
    (typeof root.modelOverrides !== 'object' ||
      root.modelOverrides === null ||
      Array.isArray(root.modelOverrides))
  ) {
    fail('Profile field "modelOverrides" must be an object keyed by target name.');
  }
  const modelOverridesRaw = (root.modelOverrides ?? {}) as Record<string, unknown>;
  const modelOverrides: Partial<Record<TargetName, Record<string, string>>> = {};

  for (const [outerKey, blockRaw] of Object.entries(modelOverridesRaw)) {
    if (!isTargetName(outerKey)) {
      fail(
        `Unknown profile target "${outerKey}" in modelOverrides. Accepted target names are: ` +
          `${TARGET_NAME_LIST.join(', ')}.`,
      );
    }
    if (outerKey === 'antigravity') {
      fail(
        `Profile modelOverrides cannot include "antigravity": that target has no model ` +
          `vocabulary to override.`,
      );
    }

    // A block must actually be an object (null and arrays are rejected here too) before its inner
    // keys/values mean anything — otherwise a string/array/number block would sail through the
    // `as Record<string, string>` cast and misbehave deep inside normalization, defeating
    // FR-PROF-0001's "abort before any output is written".
    if (typeof blockRaw !== 'object' || blockRaw === null || Array.isArray(blockRaw)) {
      fail(
        `Profile modelOverrides entry "${outerKey}" must be an object mapping model names to ` +
          `replacement values.`,
      );
    }
    const block = blockRaw as Record<string, unknown>;

    for (const [innerKey, innerValue] of Object.entries(block)) {
      if (typeof innerValue !== 'string') {
        fail(
          `Profile modelOverrides entry "${outerKey}" has a non-string value for key ` +
            `"${innerKey}". Model override values must be strings.`,
        );
      }
    }

    if (outerKey === 'claude') {
      for (const innerKey of Object.keys(block)) {
        if (!isClaudeInnerKey(innerKey)) {
          fail(
            `Unknown claude model key "${innerKey}" in modelOverrides. Accepted keys are: ` +
              `${CLAUDE_INNER_KEYS.join(', ')}.`,
          );
        }
      }
    }

    modelOverrides[outerKey] = block as Record<string, string>;
  }

  return { modelOverrides };
}

/**
 * Resolves the effective model vocabulary for one target (FR-PROF-0010, DATA-CFG-0006.AC5).
 * `targetName` is a plain string (not TargetName) so callers can pass `spec.name` directly
 * without a cast — targets.ts (S13) types PluginSpec.name as `string`, not a literal union.
 *
 * - No profile, or the profile has no block for this target and (for a standalone) no block for
 *   its parent either: returns the built-in vocabulary unchanged (`exhaustive` omitted/false).
 * - A block applies (declared directly, or inherited from the parent for a standalone with none
 *   of its own — V4): returns that block as the entire effective map with `exhaustive: true`, so
 *   downstream normalize*() calls treat any token absent from it as unmapped rather than falling
 *   back to the built-in map (FR-PROF-0011).
 *
 * V5 (a dead inner entry — a key matching no model token anywhere in the instruction source) is
 * intentionally NOT checked here or anywhere: per SPECS, silence means simply not scanning the
 * instruction source for it. The block is passed through as-is; an unmatched key is simply never
 * looked up by a normalize*() call and has no effect.
 */
export function resolveEffectiveVocabulary(
  targetName: string,
  builtin: ModelVocabulary,
  profile: ProfileDescriptor | null,
): ModelVocabulary {
  if (!profile) {
    return { map: builtin.map, exhaustive: false };
  }

  const overrides = profile.modelOverrides as Record<string, Record<string, string> | undefined>;
  let block = overrides[targetName];

  if (!block) {
    const parent = STANDALONE_PARENT[targetName as TargetName];
    if (parent) {
      block = overrides[parent];
    }
  }

  if (!block) {
    return { map: builtin.map, exhaustive: false };
  }

  return { map: block, exhaustive: true };
}
