# Model Mapping Review: Multi-Vendor Model List Handling

**Date**: 2026-06-10
**Scope**: Verify correctness of `normalizeClaude`, `normalizeCursor`, `normalizeCopilot`, `normalizeCodex` for multi-vendor model lists (Claude + GPT).
**Files reviewed**:
- `src/plugin-generator/src/spec/model-maps.ts`
- `src/plugin-generator/src/file-processors/file-normalize-{claude,cursor,copilot,codex}-models.ts`
- `plans/plugin-generator/CLEAN-ARCHITECTURE.md` (C1 section)

---

## Overall Verdict

**All 4 processors are CORRECT.** No functional bugs found. Two non-critical improvements identified.

---

## Per-Processor Verdict

| Processor | Verdict | Notes |
|-----------|---------|-------|
| Claude | CORRECT | Scan strategy correctly skips GPT tokens |
| Codex | CORRECT | Scan strategy correctly skips Claude tokens |
| Cursor | CORRECT | First-token strategy is intentional parity behavior |
| Copilot | CORRECT | First-token strategy is intentional parity behavior; both maps present |

---

## Specific Findings

### Q1: Cursor — "claude-sonnet-4-6, gpt-4o"

- `first = "claude-sonnet-4-6"`, prefix `claude-` detected
- `CURSOR_CLAUDE_MAP["claude-sonnet-4-6"]` = `"claude-sonnet-4-6"` (exact hit)
- Output: `model: claude-sonnet-4-6`
- **CORRECT**

### Q2: Cursor — "gpt-4o, claude-sonnet-4-6"

- `first = "gpt-4o"`, prefix `gpt-` detected
- No effort suffix to strip
- Output: `model: gpt-4o`
- **CORRECT** (Cursor uses model IDs directly for GPT, no display-name map needed)

### Q3: Copilot — "claude-sonnet-4-6, gpt-4o"

- `first = "claude-sonnet-4-6"`, prefix `claude-` detected
- `COPILOT_CLAUDE_MAP["claude-sonnet-4-6"]` = `"Claude Sonnet 4.6"`
- Output: `model: Claude Sonnet 4.6`
- **CORRECT**

### Q4: Copilot — "gpt-4o, claude-sonnet-4-6"

- `first = "gpt-4o"`, prefix `gpt-` detected
- `COPILOT_GPT_MAP["gpt-4o"]` = `"GPT-4o"`
- Output: `model: GPT-4o`
- **CORRECT**

### Q5: Claude — "gpt-4o, claude-sonnet-4-6"

- Token scan: `"gpt-4o"` — not `claude-`-prefixed, not containing opus/sonnet/haiku — skip
- `"claude-sonnet-4-6"` — `startsWith('claude-')` = true, contains `sonnet` → `CLAUDE_CODE_MAP.sonnet` = `"claude-sonnet-4-6"`
- Output: `model: claude-sonnet-4-6`
- **CORRECT** — scan strategy correctly finds claude token regardless of position

### Q6: Claude — "gpt-4o" (no Claude token)

- Token scan: no match → returns `null`
- Processor returns frame unchanged (model line preserved as-is)
- **CORRECT** — Claude IDE cannot use GPT models; model line left untouched

### Q7: Codex — "claude-sonnet-4-6, gpt-4o"

- Token scan: `"claude-sonnet-4-6"` — not `gpt-/o3/o4` — skip
- `"gpt-4o"` — matches `gpt-` prefix → no effort suffix → `{ model: "gpt-4o", effort: "medium" }`
- Output: `model: gpt-4o\nmodel_reasoning_effort: medium`
- **CORRECT**

### Q8: Codex — "claude-sonnet-4-6" (no GPT token)

- Token scan: no match → returns `null`
- `removeModelLine()` called → `model:` line stripped from frontmatter
- **CORRECT** — Codex cannot use Claude models; model line removed entirely

### Q9: First-token strategy for Cursor/Copilot — design gap?

**Not a gap.** This is intentional parity with the Python generator. The C1 spec explicitly distinguishes Claude's scan strategy as a special case ("NOT first-overall — CONTRADICTION-1"), confirming that first-token is the correct contract for all other IDEs.

The design assumption: source file authors control priority by token ordering. First position = the intended model for that generation pass. This is a documented design constraint, not a bug.

**One documentation risk**: if source files use inconsistent ordering (sometimes Claude first, sometimes GPT first), output will vary per ordering. This risk belongs in the frontmatter authoring guide, not in the normalizer code.

---

## Map Coverage Issues

### CURSOR_CLAUDE_MAP

- **Coverage**: 8 entries covering canonical Claude variants (claude-opus-4-8, claude-4.8-opus-high, claude-4.6-sonnet, claude-4.5-haiku, and their canonical aliases)
- **GPT coverage**: Not needed. GPT tokens are handled inline via `gpt-` prefix detection with effort-strip passthrough. No map lookup required.
- **Missing entries**: None identified for currently active models
- **Gap**: None functional

### COPILOT_CLAUDE_MAP

- **Coverage**: Same 8 Claude variants → display names ("Claude Opus 4.6", "Claude Sonnet 4.6", "Claude Haiku 4.5")
- **Missing entries**: None identified

### COPILOT_GPT_MAP

- **Coverage**: `gpt-5.5`, `gpt-5.4`, `gpt-5.3`, `gpt-4.5`, `gpt-4o`, `gpt-4`, `o3`, `o4-mini`
- **Missing**: `gpt-4.1`, `gpt-4-turbo`
- **Risk**: LOW. Fallback for unknown GPT tokens is passthrough after effort-strip (base ID returned as-is). Functionally safe — model is preserved, just no display-name transformation. Only affects cosmetic output.

### Cursor GPT handling (no map)

- Cursor uses model IDs directly (not display names), so no map is needed for GPT tokens
- The inline effort-strip passthrough is the complete and correct behavior

---

## Naming Issue: CURSOR_CLAUDE_MAP

`CURSOR_CLAUDE_MAP` is misleadingly named. It handles only Claude model ID normalization for Cursor. GPT tokens are processed inline in `normalizeCursor` via prefix detection, not through this map. A future maintainer adding a new GPT variant might look for a GPT map that does not exist, or might incorrectly add GPT entries to `CURSOR_CLAUDE_MAP`.

**Recommendation**: Rename to `CURSOR_CLAUDE_CANONICAL_MAP`, or add an explanatory comment above the map clarifying its scope.

---

## Recommendations

### R1 — OPTIONAL — Rename `CURSOR_CLAUDE_MAP`

**File**: `src/plugin-generator/src/spec/model-maps.ts`  
**Change**: Rename `CURSOR_CLAUDE_MAP` to `CURSOR_CLAUDE_CANONICAL_MAP` (update constant name and its usage in `normalizeCursor` and `CURSOR_VOCABULARY`)  
**Priority**: Low. Cosmetic/maintainability only. No functional impact.

### R2 — OPTIONAL — Add `gpt-4.1` and `gpt-4-turbo` to `COPILOT_GPT_MAP`

**File**: `src/plugin-generator/src/spec/model-maps.ts`  
**Change**: Add entries:
```typescript
'gpt-4.1': 'GPT-4.1',
'gpt-4-turbo': 'GPT-4 Turbo',
```
**Priority**: Low. Current fallback is safe (passthrough base ID). Only matters if source files use these model IDs and Copilot display name consistency is required.

### R3 — RECOMMENDED — Document token ordering convention

**File**: Frontmatter authoring guide or CONTEXT.md  
**Change**: Add a note that for multi-vendor model lists (used in Cursor/Copilot targets), the first token is selected as the target model. Authors should place the intended model first.  
**Priority**: Medium. Prevents confusion when different source files produce different outputs for the same model set depending on ordering.

---

## Questions to Escalate

None. All behaviors are deterministically traceable from the code and confirmed against the C1 spec. No ambiguity requiring external clarification.

---

## Reasoning Confidence

- Per-processor functional traces: 1.0 (direct code trace, no inference)
- First-token design intent judgment: 0.9 (grounded in spec parity notes; slight uncertainty only because the Python generator was not directly read for this specific scenario)
- Overall: 0.99
