# Clean Architecture Alignment Report

**Date:** 2026-06-10  
**Scope:** FR-ARCH-0005 identity-switch elimination (Task C), callback injection pattern, per-vocabulary processors, per-IDE assemblers  
**Based on:** `git diff HEAD` against `CLEAN-ARCHITECTURE.md` spec

---

## Overall Verdict: PARTIALLY ALIGNED

**2 smells found. 0 deviations from intent. 1 architectural question.**

The primary goal (FR-ARCH-0005) is fully achieved — no identity switches on `ModelVocabulary.kind` or `PluginSpec.hookEntryShape` remain in the processing pipeline. The callback injection pattern is clean and consistent across all 4 assemblers. Two artifacts that were not listed in the spec's "Files Changed" section contain stale references that must be cleaned up.

---

## Per-File Category Verdicts

### 1. `file-normalize-models.ts` — ALIGNED

Final state: exactly 4 exported helpers (`extractFrontmatterModelField`, `applyModelRewrite`, `removeModelLine`, `rewriteCodexModelFields`). The `fileNormalizeModels` switch dispatcher is deleted. No switch. No IDE identity logic. The comment on line 2 explicitly documents the deletion. Matches spec Step 8 final state exactly.

### 2. `file-normalize-{claude,cursor,copilot,codex}-models.ts` — ALIGNED

All 4 files are structurally symmetric:
- Same guard pattern: `if (frame.isBinary || frame.target_contents === null) return frame`
- Same extraction: `extractFrontmatterModelField`
- Same early return on null normalized value
- `applyModelRewrite` called for claude/cursor/copilot; codex legitimately diverges (two-branch: strip line or two-field rewrite — no `applyModelRewrite` needed because frontmatter.model is intentionally NOT updated)

No cross-vocabulary logic. No switch. Per-vocabulary specialization confined to one normalizer call per file. Structurally symmetric where the domain permits.

### 3. `bootstrap/payload.ts` — ALIGNED

`buildEntryForIde` switch deleted. `buildPluginRootEntry` switch deleted. `assembleBootstrapPayload` now accepts `EntryBuilderFn` and `RootEntryBuilderFn` callbacks. Four entry builder functions exported (`buildClaudeBootstrapEntry`, `buildCodexBootstrapEntry`, `buildCopilotBootstrapEntry`, `buildCursorBootstrapEntry`). No switch on IDE identity. No `hookEntryShape` reference. Size check (NFR-0004) preserved and moved above the callback invocation. Matches spec full-file content exactly.

### 4. `plugin-assemble-{claude,codex,copilot,cursor}-bootstrap.ts` — ALIGNED

All 4 assemblers write `templateContext['bootstrap_hooks']` — one fixed key, no per-IDE suffix. Each passes IDE-specific entry builder callbacks to `assembleBootstrapPayload`. No switch. No `hookEntryShape`. Consistent structure: `assembleBootstrapPayload(p, entryBuilder, rootEntryBuilder)` → `updatePluginFrame`. The cursor assembler correctly uses `buildCursorHookPayloadJson` (not `buildHookPayloadJson`) for its entry payload. `plugin-assemble-bootstrap.ts` (old monolithic file) is deleted.

### 5. `targets.ts` — ALIGNED

Zero `hookEntryShape` references. Zero `fileNormalizeModels` references. `buildPipeline` signature changed from `isStandalone: boolean` to `bootstrapAssembler: PluginProcessor` — purely functional, no identity routing. All 6 spec definitions wired with correct per-vocabulary processors and per-IDE assemblers. `typeof fileNormalizeModels` replaced by `FileProcessor` in all 5 helper function signatures. Old `pluginAssembleBootstrap` import gone. Both `ReleaseDescriptor` and `PluginProcessor` consolidated into one type import line. Clean.

### 6. `types.ts` — ALIGNED

`ModelVocabulary.kind: 'claude' | 'cursor' | 'copilot' | 'codex'` removed. `PluginSpec.hookEntryShape: 'claude' | 'copilot' | 'codex' | 'cursor'` removed. No traces remain in the interface definitions.

---

## Smells and Deviations

### SMELL 1 — Critical: Stale `bootstrap_hooks_*` seed keys in `generate.ts`

**File:** `src/plugin-generator/src/generate.ts`, lines 56–58  
**Evidence:**
```typescript
const baseTemplateContext: Record<string, unknown> = {
  release: releaseName,
  deterministic_hooks: release.deterministicHooks,
  bootstrap_hooks_claude: '',     // STALE — never read by any template after refactor
  bootstrap_hooks_codex: '',      // STALE
  bootstrap_hooks_copilot: '',    // STALE
};
```

After the refactor, all three templates use `{{{bootstrap_hooks}}}` (one shared key). No template reads `bootstrap_hooks_claude`, `bootstrap_hooks_codex`, or `bootstrap_hooks_copilot`. These three seed values are dead initialization code that contradicts FR-VAR-0070 "one shared key" principle. They are not in the spec's "Files Changed" list — this is a missed cleanup.

**Impact:** No runtime failure (assemblers correctly set `bootstrap_hooks`). Risk: misleads future maintainers into thinking the per-IDE keys are still meaningful; if a template author accidentally uses `{{{bootstrap_hooks_claude}}}` they would get an empty string and silent wrong output.

**Fix:** Replace the three stale keys with `bootstrap_hooks: ''` as the seed value, matching the new FR-VAR-0070 contract. The `generate.ts` file also needs to be added to the spec's "Files Changed" list.

---

### SMELL 2 — Minor: Stale processor catalog and spec model description in `cli.ts`

**File:** `src/plugin-generator/src/cli.ts`, lines 45 and 51  
**Evidence:**
```
line 45:  fileRead, fileApplyOverrides, fileBundle, fileNormalizeModels, fileRename, fileCodexAgentFormat
line 51:  Each target is a PluginSpec with specEntries, pluginProcessors, hookEntryShape, etc.
```

- `fileNormalizeModels` was deleted and replaced by 4 per-vocabulary processors. It should not appear in the help text processor catalog.
- `hookEntryShape` was removed from `PluginSpec`. Listing it in the help text spec model description is incorrect.
- `pluginAssembleBootstrap` (also in line 47) was deleted and replaced by 4 per-IDE assemblers.

**Impact:** No runtime failure. Surfaces incorrect information to users via `--help` output or internal developer documentation. Was explicitly flagged as a known item to investigate.

**Fix:** Update the comment block at lines 44–52 of `cli.ts` to reflect the current processor catalog (4 per-vocabulary normalizers, 4 per-IDE assemblers) and remove `hookEntryShape` from the spec model description.

---

## Accumulated Questions for Architect Decision

**Q1 — generate.ts stale seed keys (Smell 1 above):**
Should `baseTemplateContext` in `generate.ts` be updated to seed `bootstrap_hooks: ''` instead of the three per-IDE keys, as part of this Task C cleanup? Or is there a reason to retain them (e.g., backward compatibility with external consumers that read the templateContext directly)?

**Q2 — cursor size-check measurement mismatch:**
`assembleBootstrapPayload` uses `buildHookPayloadJson` (hookSpecificOutput format) for the NFR-0004 size check on all IDEs including cursor, even though the cursor assembler uses `buildCursorHookPayloadJson` (additional_context format) for the actual payload. The spec explicitly acknowledges this: "the size measurement is against the hookSpecificOutput format (consistent with how other IDEs are measured) even though cursor uses a different payload format." Is this intentional and accepted as the permanent design, or should the size check eventually use the actual per-IDE payload format (which would require passing the built payload size back through the callback)?

**Q3 — `normalizeCursor` passthrough behavior:**
`normalizeCursor` never returns null for non-empty input (it passes unknown tokens through unchanged). This means `fileNormalizeCursorModels` will call `applyModelRewrite` for every file that has a model field. The `if (newContent === content) return frame` guard in `applyModelRewrite` is the safety net — if the model value is already in cursor format (e.g., already normalized on a previous run), the frame is returned unchanged. Is this the intended behavior (passthrough-always, de-duplicate via no-op guard), or should `normalizeCursor` return null for already-normalized values to skip the frame update step entirely?

---

## Top 3 Most Important Architectural Findings

**Finding 1 (Must Fix): `generate.ts` stale seed keys contradict FR-VAR-0070.**  
The `baseTemplateContext` in `generate.ts` still seeds three per-IDE keys that no template reads. This is the only place in the codebase where the old per-IDE key contract still lives. It must be updated to seed `bootstrap_hooks: ''` to complete the FR-VAR-0070 "one shared key" contract. Without this fix, the spec's stated intent is not fully implemented — a future developer could add `{{{bootstrap_hooks_claude}}}` back to a template and get silent empty-string output.

**Finding 2 (Must Fix): `cli.ts` help text references deleted symbols.**  
The help text embedded in `cli.ts` references `fileNormalizeModels`, `pluginAssembleBootstrap`, and `hookEntryShape` — all deleted by this refactor. This is user-facing text (shown via CLI `--help` or error output). It was explicitly flagged as a known investigation item and confirmed as a stale artifact.

**Finding 3 (Architecture Confirmed Clean): The callback injection pattern is fully realized.**  
The primary goal of FR-ARCH-0005 is completely achieved. Zero switches on IDE identity remain in any processing code path. The `assembleBootstrapPayload` function is genuinely IDE-agnostic — it knows nothing about claude/cursor/copilot/codex. All IDE-specific behavior is provided by caller-supplied closures. The 4 per-vocabulary processors and 4 per-IDE assemblers are correctly isolated, structurally symmetric where appropriate, and each contains only its own vocabulary/format logic.

---

## Recommended Fixes

| Priority | File | Change |
|----------|------|--------|
| P1 (complete the refactor) | `src/plugin-generator/src/generate.ts` | Replace `bootstrap_hooks_claude: ''`, `bootstrap_hooks_codex: ''`, `bootstrap_hooks_copilot: ''` with `bootstrap_hooks: ''` in `baseTemplateContext` |
| P2 (help text correctness) | `src/plugin-generator/src/cli.ts` | Update processor catalog comment: replace `fileNormalizeModels` with the 4 per-vocabulary names; replace `pluginAssembleBootstrap` with the 4 per-IDE names; remove `hookEntryShape` from spec model description |
