# Smell Evaluation Decisions

Evaluated: 4 accumulated questions.
Date: 2026-06-11
Evaluator: architect subagent (autonomous decision mode)

---

## Q1 — Is `CURSOR_CLAUDE_MAP` naming a smell?

**Decision: NOT A SMELL** (with one minor annotation fix noted)

**Reasoning:**

The constant `CURSOR_CLAUDE_MAP` maps Claude model IDs to Cursor-compatible Claude model names. The name is accurate and precise — it is explicitly a Claude map for Cursor, not a general Cursor model map. GPT tokens for Cursor do not need a lookup table; they are handled inline by stripping the `-effort` suffix and passing through. There is no `CURSOR_GPT_MAP` because there is nothing to map. The asymmetry is correct, not a smell.

However, line 33 of `model-maps.ts` contains a stale comment:

```
// First model token overall (not scanned). Map via CURSOR_MODEL_MAP.
```

`CURSOR_MODEL_MAP` does not exist. The actual constant is `CURSOR_CLAUDE_MAP`. This is a minor documentation smell — a stale reference left over from an older naming. It does not affect runtime behavior but will confuse future readers.

**Fix (minor):** Update the comment on line 33 of `src/spec/model-maps.ts`.

- File: `/Users/isolomatov/Sources/GAIN/rosetta/src/plugin-generator/src/spec/model-maps.ts`
- Line 33
- Old: `// First model token overall (not scanned). Map via CURSOR_MODEL_MAP.`
- New: `// First model token overall (not scanned). Claude tokens mapped via CURSOR_CLAUDE_MAP; gpt tokens stripped of -effort suffix inline.`

Confidence: 0.95

---

## Q2 — Is the undocumented frontmatter ordering convention a smell?

**Decision: NOT A SMELL**

**Reasoning:**

The per-vocabulary ordering rules are documented in `model-maps.ts` at the code level:

- Line 8: `// Scan all comma-split tokens for first claude-compatible one. NOT first-overall (CONTRADICTION-1).`
- Line 33: `// First model token overall (not scanned).`
- Line 121 (Codex block): `// Scan all tokens for first gpt-* token.`

These comments describe the selection strategy for each vocabulary. A maintainer reading the normalizer functions understands the behavior. The implication for frontmatter token ordering (i.e., "put the Copilot/Cursor preferred model first, Claude model anywhere") is derivable from these comments.

The absence of a higher-level summary comment explaining multi-vendor ordering for instruction authors is a user-docs concern, not a code smell. That guidance belongs in the plugin authoring guide or the `MODEL.md` referenced on line 1 of `model-maps.ts`, not in the TypeScript source.

No fix required.

Confidence: 0.88

---

## Q3 — Is the second copilot fixture `hooks/hooks.json.tmpl` a smell?

**Decision: NOT A SMELL**

**Reasoning:**

The file at `tests/fixtures/sample-plugins/core-copilot/hooks/hooks.json.tmpl` contains:

```json
{"version":1,"hooks":{"sessionStart":[]}}
```

This is an empty `sessionStart` array with no template placeholder. This is correct.

The two `hooks.json.tmpl` files serve different purposes:

1. `.github/plugin/hooks.json.tmpl` — plugin bootstrap hooks, managed by the generator. This is where `{{{bootstrap_hooks}}}` belongs (already fixed).
2. `hooks/hooks.json.tmpl` — user-space hooks file. This represents a hooks configuration with no user-defined hooks. An empty `sessionStart` array is the correct default state.

Bootstrap hooks are injected into the `.github/plugin/` path, not the user-space `hooks/` path. The empty array in `hooks/hooks.json.tmpl` is intentional — it models a fixture where no user hooks are configured.

No fix required.

Confidence: 0.92

---

## Q4 — Is the missing `gpt-4.1` and `gpt-4-turbo` from `COPILOT_GPT_MAP` a smell?

**Decision: NOT A SMELL**

**Reasoning:**

The Python generator's `COPILOT_MODEL_MAP` (lines 45–55 of `scripts/plugin_generator.py`) does not contain `gpt-4.1` or `gpt-4-turbo` either. The TypeScript `COPILOT_GPT_MAP` was decoded from the baseline agents (not from the Python map), so both sources agree on scope.

- `gpt-4-turbo`: deprecated model, superseded by `gpt-4o`. No standard Copilot display name. Passthrough of the raw ID is acceptable and safe.
- `gpt-4.1`: not present in the baseline agents this map was decoded from. Adding it speculatively would introduce a display name not grounded in the actual baseline. Passthrough as `gpt-4.1` is functionally correct for Copilot; the display name difference (`gpt-4.1` vs `GPT-4.1`) is cosmetic and within Copilot's tolerance for raw model IDs.

The passthrough behavior (return base ID when not in map) is the documented safe default for unknown models. Missing entries are not a smell when they are not in the source baseline.

No fix required.

Confidence: 0.90

---

## Summary

| Question | Decision | Fix needed? |
|---|---|---|
| Q1 — `CURSOR_CLAUDE_MAP` naming | NOT A SMELL | Minor: fix stale comment on line 33 of `model-maps.ts` |
| Q2 — Undocumented frontmatter ordering | NOT A SMELL | No |
| Q3 — Second copilot fixture template | NOT A SMELL | No |
| Q4 — Missing `gpt-4.1`/`gpt-4-turbo` in `COPILOT_GPT_MAP` | NOT A SMELL | No |

## Before-Tests Status

One minor fix is needed (stale comment on line 33 of `model-maps.ts`). This does not block tests — it is a documentation correction, not a behavioral change. Implementation is otherwise clean.

**Fix target:**
- File: `/Users/isolomatov/Sources/GAIN/rosetta/src/plugin-generator/src/spec/model-maps.ts`
- Line 33 — replace stale `CURSOR_MODEL_MAP` reference with accurate comment.

## Escalations

None. All 4 questions were answerable from code alone.
