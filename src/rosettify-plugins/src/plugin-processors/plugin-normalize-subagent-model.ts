// FR-COPY-0083 — subagent_required_model list normalization (always-on, 6 non-Antigravity targets)
// Generic PluginProcessor factory, mirroring pluginReplaceLiterals (FR-ARCH-0058) and
// pluginAntigravitySubagentModel (FR-COPY-0082): the per-IDE tokenMapper is data supplied at
// composition time (spec/targets.ts), and the returned processor is composed only into the six
// non-Antigravity specs' pipelines — never selected by an identity branch inside a shared
// processor (FR-ARCH-0005). Antigravity keeps its own unconditional rewrite to `inherit`
// (pluginAntigravitySubagentModel) and is never composed with this factory.
//
// Reuses the low-level selection/lookup helpers from spec/model-maps.ts (claudeFamilyKey,
// isCodexToken) rather than reimplementing them, per FR-COPY-0083's explicit "not a
// reimplementation" requirement and FR-COPY-0084 (a Codex token must resolve identically to the
// frontmatter call sites).

import { updatePluginFrame } from '../frames.js';
import { claudeFamilyKey, isCodexToken } from '../spec/model-maps.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginProcessor } from '../types.js';

/** Boundary-safe: anchored on the literal attribute name and its surrounding quotes; `[^"]*`
 *  cannot cross the closing quote, so the match can never swallow adjacent markup or bleed into
 *  a neighboring attribute (FR-ARCH-0037). Matches pluginAntigravitySubagentModel's pattern. */
const SUBAGENT_MODEL_RE = /subagent_required_model="([^"]*)"/g;

function hasKey(map: Record<string, string>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/**
 * Per-IDE token mapper contract consumed by `pluginNormalizeSubagentRequiredModel`.
 * Returns the token's IDE-native value when it survives that target's selection rule, or `null`
 * to drop the token from the list. `map` is always the target's EFFECTIVE map
 * (`spec.modelVocabulary.map` — built-in, or a profile's override block when active).
 */
export type SubagentModelTokenMapper = (
  token: string,
  map: Record<string, string>,
  exhaustive?: boolean,
) => string | null;

/**
 * Claude: keeps only tokens of the opus/sonnet/haiku family (FR-COPY-0083), reusing the same
 * family-key derivation as normalizeClaude. A family match whose key is absent from the effective
 * map (only possible under a partial profile override block) is dropped — mirrors normalizeClaude's
 * exhaustive skip-and-continue, since there is nothing valid to map the survivor to.
 */
export const claudeSubagentModelTokenMapper: SubagentModelTokenMapper = (token, map) => {
  const key = claudeFamilyKey(token);
  if (key === null || !hasKey(map, key)) return null;
  return map[key];
};

/**
 * Cursor/Copilot: keeps only tokens present in the effective map (FR-COPY-0083) — the selection
 * rule and the lookup are the same test, exact-token membership, so surviving a token always
 * yields its mapped value. Shared implementation: Cursor and Copilot differ only in which map
 * `spec.modelVocabulary` carries, never in this function's logic (FR-ARCH-0005).
 */
export const cursorSubagentModelTokenMapper: SubagentModelTokenMapper = (token, map) => {
  if (!hasKey(map, token)) return null;
  return map[token];
};

export const copilotSubagentModelTokenMapper: SubagentModelTokenMapper = cursorSubagentModelTokenMapper;

/**
 * Codex: keeps every `gpt-`-prefixed token (FR-COPY-0083) regardless of map presence — mapped
 * through the effective map when present, else passed through as-is (mirrors normalizeCodex's
 * non-exhaustive fallback). Unlike the frontmatter `model:` field, this attribute is free-form
 * instruction prose read by an AI agent, not a machine-parsed config contract — there is no
 * second slot for a separate reasoning-effort value the way frontmatter splits into `model:` +
 * `model_reasoning_effort:`. A trailing `-high`/`-medium`/`-low` qualifier here is meaningful
 * content the instruction author deliberately wrote to tell the agent which reasoning effort to
 * use, so the survivor is emitted WHOLE, effort suffix intact — never split or stripped.
 */
export const codexSubagentModelTokenMapper: SubagentModelTokenMapper = (token, map, exhaustive) => {
  if (!isCodexToken(token)) return null;
  // FR-PROF-0011: under an exhaustive per-target block the block IS the whole allowed vocabulary,
  // so a token absent from it does not exist and must be dropped — otherwise a model the profile
  // never permitted would still be named in this attribute. Without a block (the built-in Codex
  // vocabulary is an empty identity map) an unmapped gpt- token passes through as written, which is
  // normalizeCodex's non-exhaustive behavior and what FR-COPY-0083 means by "Codex keeps gpt-* tokens".
  if (!hasKey(map, token)) {
    if (exhaustive) return null;
    return token;
  }
  return map[token];
};

/**
 * pluginNormalizeSubagentRequiredModel: factory returning a PluginProcessor that rewrites every
 * `subagent_required_model="<comma-separated tokens>"` occurrence in generated content.
 *
 * Per attribute value: split on `,` (trim) → apply `tokenMapper(token, spec.modelVocabulary.map)`
 * to every token, in source order → drop tokens the mapper returns `null` for → de-duplicate
 * mapped survivors keeping the FIRST occurrence → re-join with `", "`. Zero survivors ⇒ `inherit`
 * (also the sane result for an input value that is already `"inherit"`: no token maps, so the
 * attribute stays `inherit`). Idempotent.
 *
 * Skipped frames: binary, null-content, and `verbatim`, matching pluginAntigravitySubagentModel /
 * pluginReplaceLiterals. Composed via `extraAfterIndexes` for the six non-Antigravity specs
 * (spec/targets.ts, S13) — same pipeline slot as the Antigravity sibling, so assembled bootstrap
 * hook payloads (read from `frames` bodies) inherit the filtering.
 *
 * FR-COPY-0083, FR-COPY-0084.AC3, FR-ARCH-0005
 */
export function pluginNormalizeSubagentRequiredModel(
  tokenMapper: SubagentModelTokenMapper,
): PluginProcessor {
  return function pluginNormalizeSubagentRequiredModelProcessor(
    p: PluginProcessingFrame,
  ): PluginProcessingFrame {
    const { spec, frames } = p;
    const { map, exhaustive } = spec.modelVocabulary;
    let changed = false;

    const rewrittenFrames = frames.map((frame) => {
      if (frame.isBinary || frame.target_contents === null || frame.verbatim) return frame;

      const original = frame.target_contents as string;
      const content = original.replace(SUBAGENT_MODEL_RE, (_match, list: string) => {
        const tokens = list
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);

        const seen = new Set<string>();
        const survivors: string[] = [];
        for (const token of tokens) {
          const mapped = tokenMapper(token, map, exhaustive);
          if (mapped === null || seen.has(mapped)) continue;
          seen.add(mapped);
          survivors.push(mapped);
        }

        const value = survivors.length > 0 ? survivors.join(', ') : 'inherit';
        return `subagent_required_model="${value}"`;
      });

      if (content === original) return frame;
      changed = true;
      return { ...frame, target_contents: content } as FileProcessingFrame;
    });

    if (!changed) return p;

    return updatePluginFrame(p, (draft) => {
      draft.frames = rewrittenFrames as typeof draft.frames;
    });
  };
}
