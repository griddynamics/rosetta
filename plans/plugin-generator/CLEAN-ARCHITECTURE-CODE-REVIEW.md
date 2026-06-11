# Code Review: Clean Architecture Implementation (Groups 1–3)

**Reviewed by:** rosetta:reviewer subagent
**Date:** 2026-06-10
**Scope:** Groups 1–3 source changes vs CLEAN-ARCHITECTURE.md + CLEAN-ARCHITECTURE-SPECS.md
**Verdict:** CORRECT-WITH-ISSUES — core architecture is correctly implemented; 3 incomplete cleanup items require attention before tests pass.

---

## Overall Assessment

The primary architectural goals are fully achieved:
- All 5 identity-switch violations (C1–C4) eliminated
- `ModelVocabulary.kind` removed
- `PluginSpec.hookEntryShape` removed
- 4 per-vocabulary file processors created and correctly wired
- 4 per-IDE bootstrap assemblers created and correctly wired
- `buildPipeline` signature updated correctly
- All 3 template files updated to `{{{bootstrap_hooks}}}`
- `plugin-assemble-bootstrap.ts` deleted

The implementation matches the spec content file-by-file with no deviations from the specified logic. However, 3 items were left incomplete: two files outside the changed set that still carry stale content, and the test plan (delete 2 + create 9) was not executed.

---

## Findings

### CRITICAL

None.

### HIGH

#### H1 — Old test files import deleted symbols; test suite will fail

**File:** `src/plugin-generator/tests/unit/file-processors/file-normalize-models.test.ts` line 3
**File:** `src/plugin-generator/tests/unit/plugin-processors/plugin-assemble-bootstrap.test.ts` line 4

`file-normalize-models.test.ts` imports `fileNormalizeModels` from `file-normalize-models.ts`. That function was deleted. The same file constructs `modelVocabulary: { kind, map: {} }` — `kind` no longer exists in `ModelVocabulary`. Both cause TypeScript and runtime import failures.

`plugin-assemble-bootstrap.test.ts` imports from `plugin-assemble-bootstrap.js` which was deleted. This is a module-not-found runtime failure.

**Spec contract:** CLEAN-ARCHITECTURE-SPECS.md §7 "Deleted Tests" and CLEAN-ARCHITECTURE.md "Test Changes — Delete" explicitly require both files to be deleted.

**Impact:** `vitest run` will fail on import. AC-2 (all tests pass) cannot be satisfied.

**Resolution required:** Delete both files.

---

#### H2 — 9 required new test files not created

**Spec contract:** CLEAN-ARCHITECTURE-SPECS.md §7 "New Unit Tests" specifies 9 new test files:
- `file-normalize-shared-helpers.test.ts`
- `file-normalize-claude-models.test.ts`
- `file-normalize-cursor-models.test.ts`
- `file-normalize-copilot-models.test.ts`
- `file-normalize-codex-models.test.ts`
- `plugin-assemble-claude-bootstrap.test.ts`
- `plugin-assemble-codex-bootstrap.test.ts`
- `plugin-assemble-copilot-bootstrap.test.ts`
- `plugin-assemble-cursor-bootstrap.test.ts`

None of these files exist. AC-2 requires `~303+9-2=310 tests / 38 files`. Currently the count is lower and 2 files will fail to compile.

**Impact:** Missing coverage for all new per-vocabulary processors and all 4 per-IDE assemblers. No test verification of the key correctness properties (FR-VAR-0070, FR-ARCH-0005, FR-HOOK-0007, NFR-0004, GT-3.1–3.4).

**Resolution required:** Create all 9 test files per spec.

---

### MEDIUM

#### M1 — `generate.ts` baseTemplateContext still initializes stale per-IDE keys

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/src/plugin-generator/src/generate.ts` lines 56–58

```typescript
bootstrap_hooks_claude: '',
bootstrap_hooks_codex: '',
bootstrap_hooks_copilot: '',
```

These keys were the old per-IDE template context keys. The assemblers now write `bootstrap_hooks` (no suffix). The production plugin templates have been correctly updated to use `{{{bootstrap_hooks}}}`. However, these stale entries remain in the base context initializer.

**Direct impact on correctness:** The production templates no longer reference these keys, so the stale entries have no effect on generated output. However, the 3 test fixture templates (see M2) still reference the old keys — and because `generate.ts` seeds those old keys with empty string, the fixture templates render to empty bootstrap hooks in tests, silently producing incorrect test output without test failure (since no test asserts on the content).

**Spec contract:** CLEAN-ARCHITECTURE-SPECS.md AC-7 requires no `bootstrap_hooks_${...}` dynamic keys. These are static keys, but they name the old per-IDE suffixed pattern and are dead code.

**Resolution recommended:** Remove the 3 stale key initializations. Add `bootstrap_hooks: ''` if a default initializer for the unified key is desired.

---

#### M2 — 3 test fixture templates still use stale `{{{bootstrap_hooks_*}}}` keys

**Files:**
- `tests/fixtures/sample-plugins/core-claude/hooks/hooks.json.tmpl` line 6: `{{{bootstrap_hooks_claude}}}`
- `tests/fixtures/sample-plugins/core-copilot/.github/plugin/hooks.json.tmpl` line 1: `{{{bootstrap_hooks_copilot}}}`
- `tests/fixtures/sample-plugins/core-codex/.codex-plugin/hooks.json.tmpl` line 1: `{{{bootstrap_hooks_codex}}}`

The production plugin templates (in `plugins/`) were correctly updated. The test fixture mirrors of these templates were not updated.

**Correctness impact:** When the sample e2e test (`sample.e2e.test.ts`) or unit generate test (`generate.test.ts`) runs, `generate()` uses these fixtures. The assemblers write `bootstrap_hooks` into `templateContext`. The fixture templates reference `bootstrap_hooks_claude` etc. (still set to `''` in `baseTemplateContext` per M1). So hooks.json renders with empty bootstrap array — which does not reflect real-world behavior.

The e2e test only checks for file existence of `hooks.json`, not content, so no assertion fails. However, the fixtures are an incorrect representation of what the generator actually produces.

**Spec contract:** Spec requires template key rename in 3 `.tmpl` files; the fixture mirrors are not listed but are implied by correctness. The spec's "Unchanged Tests" note does not mention updating fixtures, but leaving them stale creates a gap between test behavior and production behavior.

**Resolution recommended:** Update the 3 fixture templates to use `{{{bootstrap_hooks}}}`.

---

### LOW

#### L1 — `cli.ts` has stale comment referencing deleted identifiers

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/src/plugin-generator/src/cli.ts` lines 45, 47, 51

```
fileRead, fileApplyOverrides, fileBundle, fileNormalizeModels, fileRename, fileCodexAgentFormat
pluginGenerateIndexes, pluginInjectSections, pluginAssembleBootstrap,
Each target is a PluginSpec with specEntries, pluginProcessors, hookEntryShape, etc.
```

- `fileNormalizeModels` is deleted; only the 4 per-vocabulary functions exist
- `pluginAssembleBootstrap` is deleted; 4 per-IDE assemblers exist
- `hookEntryShape` is removed from `PluginSpec`

This is a documentation comment (help text string), not executable code. No runtime error. However, it accurately describes a deleted API surface and misleads future readers and contributors about what processors exist.

**Spec contract:** This file is not in the spec's "Files Changed" list, but the comment references concepts explicitly eliminated by the spec (C4 — `hookEntryShape`, C2b — `pluginAssembleBootstrap`, C1 — `fileNormalizeModels`).

**Resolution recommended:** Update the processor catalog comment to list the 4 per-vocabulary and 4 per-IDE replacements. Remove `hookEntryShape` from the PluginSpec description.

---

#### L2 — `normalizeCursor` never returns null for non-empty model field; null guard in `fileNormalizeCursorModels` is unreachable

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/src/plugin-generator/src/file-processors/file-normalize-cursor-models.ts` line 21–22

```typescript
const normalized = normalizeCursor(modelField);
if (!normalized) return frame;
```

`extractFrontmatterModelField` returns a non-empty trimmed string (or null). When it returns non-null, `modelField` is guaranteed non-empty. `normalizeCursor` returns null only when `first` (the first comma-split token after `.trim()`) is empty. Since `modelField` is non-empty, `first` will be non-empty, making `normalizeCursor` always return a non-null value.

This means the `if (!normalized) return frame` guard is dead code for cursor. It is harmless and defensive, but it creates a logical inconsistency: for cursor, the frame-unchanged path can never be reached for a non-empty model field, while the spec comment says "No model field → unchanged. Binary or null contents → unchanged" (but not "no normalized value → unchanged").

**Spec contract:** The spec (`CLEAN-ARCHITECTURE.md` cursor processor spec) includes the guard identically, so this matches the spec. The engineer flagged this as an anomaly to investigate.

**Impact:** None on correctness. The guard is harmless. The pattern is consistent with how claude and copilot processors are structured (even if those are different — `normalizeClaude` can return null; `normalizeCopilot` can return null only for empty first).

**Resolution:** No change required. The guard matches the spec. Document as intentional defensive code if desired.

---

## Specific Checks — Acceptance Criteria Status

| AC | Criterion | Status |
|----|-----------|--------|
| AC-1 | `tsc --noEmit` reports zero errors | LIKELY FAIL — old test files use deleted identifiers and removed type fields; production src likely compiles clean, but test compilation will fail |
| AC-2 | All tests pass (9 new, 2 deleted, net +7) | FAIL — 2 old test files not deleted; 9 new test files not created |
| AC-3 | `ModelVocabulary` has no `kind`; no `vocabulary.kind` references | PASS |
| AC-4 | `PluginSpec` has no `hookEntryShape`; no references | PASS in src/; stale references remain in cli.ts comment and test fixtures (non-executable) |
| AC-5 | No switch statement in `file-normalize-models.ts` | PASS |
| AC-6 | No switch statement in `bootstrap/payload.ts` | PASS |
| AC-7 | No `` `bootstrap_hooks_${...}` `` dynamic key | PASS in src/ |
| AC-8 | `plugin-assemble-bootstrap.ts` does not exist | PASS |
| AC-9 | `fileNormalizeModels` function does not exist | PASS |
| AC-10 | All 3 `.tmpl` files use `{{{bootstrap_hooks}}}` | PASS — production plugin templates updated |
| AC-11 | Parity check: accepted-bucket diffs only | UNTESTED (no validator run observed) |
| AC-12 | Cursor `hooks.json` = `{"version":1,"hooks":{}}` | UNTESTED |
| AC-13 | `templateContext['bootstrap_hooks']` non-empty for cursor | UNTESTED |

---

## Code Smells

1. **`generate.ts` line 56–58** — stale per-IDE template context keys (`bootstrap_hooks_claude`, `bootstrap_hooks_codex`, `bootstrap_hooks_copilot`) are dead initializations. They set keys that no template or assembler reads any longer.

2. **`cli.ts` lines 45–51** — help text catalog is stale; documents deleted functions (`fileNormalizeModels`, `pluginAssembleBootstrap`) and removed type field (`hookEntryShape`).

3. **`plugin-assemble-claude-bootstrap.ts` / `plugin-assemble-codex-bootstrap.ts`** — the `_jsonPayload` parameter from `EntryBuilderFn` callback signature is named with `_` prefix (indicating intentional non-use), but each assembler then immediately calls `buildHookPayloadJson(additionalContext)` again. This is a double-computation of the same value. The spec explicitly documents this as intentional (note in CLEAN-ARCHITECTURE.md §C2: "buildHookPayloadJson is still called here for the size check"). The pattern is correct per spec but the `_jsonPayload` arg is never reused, which may confuse future readers. No action required given spec rationale.

4. **Test fixture templates** (3 files) use old `bootstrap_hooks_*` keys, causing a silent behavioral divergence between test fixtures and production templates.

---

## Summary

**Verdict:** CORRECT-WITH-ISSUES

The implementation correctly and completely achieves the architectural goals of Task C. All 5 violation sites (C1–C4) are resolved. The per-vocabulary decomposition, callback-driven assembler pattern, type field removals, template key renames, and `buildPipeline` refactor all match the spec exactly.

**Findings count by severity:**
- CRITICAL: 0
- HIGH: 2 (test file lifecycle: 2 old not deleted, 9 new not created)
- MEDIUM: 2 (stale initializations in generate.ts; stale fixture templates)
- LOW: 2 (cli.ts stale comment; unreachable null guard in cursor processor)

**Top 3 most important findings:**
1. **H1** — Two old test files import deleted symbols; `vitest run` will fail on these imports. Must delete `file-normalize-models.test.ts` and `plugin-assemble-bootstrap.test.ts`.
2. **H2** — Nine required new test files are absent; the spec's test plan has not been executed. No coverage for the new processors and assemblers.
3. **M1+M2** — `generate.ts` still initializes stale per-IDE keys; test fixture templates still reference those keys. The combination creates silent empty bootstrap rendering in tests without assertion failure.
