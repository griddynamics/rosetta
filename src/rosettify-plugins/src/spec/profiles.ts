// FR-PROF-0001, FR-PROF-0010, DATA-CFG-0006 — profile descriptor: destination/manifest suffixing
// and per-target model-vocabulary overrides. Mirrors spec/releases.ts in shape and idiom: a
// keyed-lookup module with a throw-on-unknown loader, except here the descriptor comes from a
// per-run JSON file rather than a static in-module record.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { TARGET_NAMES, isTargetName } from '../types.js';
export type { TargetName } from '../types.js';
import type { ModelVocabulary, TargetName } from '../types.js';

/**
 * The seven target identities (DATA-CFG-0003 / `spec.name` values) come from `types.ts`, which is
 * the single source of truth shared with `spec/targets.ts`. They are deliberately NOT imported from
 * `spec/targets.ts`: that module imports `loadProfile()`/`resolveEffectiveVocabulary()` from here to
 * resolve each spec's effective vocabulary and destination suffix, so importing it back would cycle
 * (`profiles.ts` -> `targets.ts` -> `profiles.ts`). `types.ts` imports nothing from `spec/`, so
 * neither direction cycles.
 */

// FR-PROF-0001.AC6, DATA-CFG-0006.AC3 — core-claude's closed inner key-space (mirrors
// CLAUDE_CODE_MAP's family keying in spec/model-maps.ts).
const CLAUDE_INNER_KEYS = ['opus', 'sonnet', 'haiku'] as const;
type ClaudeInnerKey = (typeof CLAUDE_INNER_KEYS)[number];

function isClaudeInnerKey(value: string): value is ClaudeInnerKey {
  return (CLAUDE_INNER_KEYS as readonly string[]).includes(value);
}

// DATA-CFG-0006.AC5 — a standalone target with no block of its own inherits its parent's block.
const STANDALONE_PARENT: Partial<Record<TargetName, TargetName>> = {
  'core-cursor-standalone': 'core-cursor',
  'core-copilot-standalone': 'core-copilot',
};

// The four, and only four, top-level fields a profile descriptor may declare (FR-PROF-0001.AC7,
// DATA-CFG-0006.AC9).
const DESCRIPTOR_FIELDS = [
  'destinationSuffix',
  'pluginNameSuffix',
  'pluginDescriptionSuffix',
  'modelOverrides',
] as const;

// DATA-CFG-0006 — profile descriptor shape.
export interface ProfileDescriptor {
  destinationSuffix: string;
  pluginNameSuffix: string;
  pluginDescriptionSuffix: string;
  /**
   * Outer key = target name (one of the seven TargetName values); inner key-space = that
   * target's own vocabulary keying (closed {opus,sonnet,haiku} set for core-claude, exact source
   * model tokens for core-cursor/core-copilot/core-codex and their standalones). Partial, not
   * Record<TargetName, ...>: a real profile declares blocks only for the targets it overrides
   * (the reference profile in decisions.md declares four of seven) — a total Record would force
   * every descriptor literal, including that reference profile and any test fixture, to name all
   * seven keys, which does not match how profiles are actually authored.
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
 * modelOverrides outer key (V1), a core-antigravity block (V2), a modelOverrides entry that is not
 * itself an object (V6), a non-string inner value within an entry (V6), a core-claude inner key
 * outside {opus,sonnet,haiku} (V3), or a non-string destinationSuffix/pluginNameSuffix/
 * pluginDescriptionSuffix. Does NOT check whether an inner key matches any model token in the
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
          `destinationSuffix, pluginNameSuffix, pluginDescriptionSuffix, modelOverrides.`,
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
          `${TARGET_NAMES.join(', ')}.`,
      );
    }
    if (outerKey === 'core-antigravity') {
      fail(
        `Profile modelOverrides cannot include "core-antigravity": that target has no model ` +
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

    if (outerKey === 'core-claude') {
      for (const innerKey of Object.keys(block)) {
        if (!isClaudeInnerKey(innerKey)) {
          fail(
            `Unknown core-claude model key "${innerKey}" in modelOverrides. Accepted keys are: ` +
              `${CLAUDE_INNER_KEYS.join(', ')}.`,
          );
        }
      }
    }

    modelOverrides[outerKey] = block as Record<string, string>;
  }

  return {
    destinationSuffix: readSuffixField(root, 'destinationSuffix'),
    pluginNameSuffix: readSuffixField(root, 'pluginNameSuffix'),
    pluginDescriptionSuffix: readSuffixField(root, 'pluginDescriptionSuffix'),
    modelOverrides,
  };
}

// Suffix fields corrupt a folder name (destinationSuffix) or a manifest (pluginNameSuffix,
// pluginDescriptionSuffix) if a non-string value (number, object, array) is silently coerced or
// defaulted away instead of rejected. Absent is fine (defaults to ''); present-but-wrong-type fails.
function readSuffixField(root: Record<string, unknown>, field: string): string {
  const value = root[field];
  if (value === undefined) return '';
  if (typeof value !== 'string') {
    fail(`Profile field "${field}" must be a string.`);
  }
  return value;
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
