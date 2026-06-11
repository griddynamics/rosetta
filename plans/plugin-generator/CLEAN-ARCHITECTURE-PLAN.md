# plugin-generator — Clean Architecture Implementation Plan (Task C)
<!-- Companion to CLEAN-ARCHITECTURE-SPECS.md -->
<!-- DO NOT duplicate spec content — cross-reference by section ID -->

## Intent

Implement the Task C identity-switch elimination described in `CLEAN-ARCHITECTURE.md` and specified in `CLEAN-ARCHITECTURE-SPECS.md`. Eliminate violations C1, C2a, C2b, C3, C4. Maintain tsc-clean state between every group. Parity must hold for r2 and r3 after all changes.

All paths relative to `src/plugin-generator/` unless stated otherwise.

---

## EARS Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-ARCH-0005-C1 | WHEN `fileNormalizeModels` is called, the system SHALL NOT switch on `vocabulary.kind`; vocabulary-specific behavior SHALL be provided by per-vocabulary processor modules. |
| FR-ARCH-0005-C2a | WHEN `assembleBootstrapPayload` is called, the system SHALL NOT switch on `hookEntryShape`; IDE-specific entry building SHALL be injected as `EntryBuilderFn` and `RootEntryBuilderFn` callbacks. |
| FR-ARCH-0005-C2b | WHEN a bootstrap assembler writes to `templateContext`, the system SHALL use the fixed key `bootstrap_hooks`; dynamic key construction from `hookEntryShape` SHALL NOT occur. |
| FR-ARCH-0005-C3 | WHEN `ModelVocabulary` is defined, the system SHALL NOT include a `kind` discriminant field. |
| FR-ARCH-0005-C4 | WHEN `PluginSpec` is defined, the system SHALL NOT include a `hookEntryShape` discriminant field. |
| FR-HOOK-0007-CURSOR | WHEN cursor bootstrap is assembled, the system SHALL emit a plugin-root entry using `CURSOR_PLUGIN_ROOT_ENTRY` (not `default: null`). |
| FR-VAR-0070 | WHEN any per-IDE bootstrap assembler writes its payload, the system SHALL write to `templateContext['bootstrap_hooks']` (no suffix). |

---

## Dependency Graph

```
Group 1 (type fields)        → Group 2 (new files) → Group 3 (atomic wire + delete)
types.ts (C3, C4)                4 per-vocabulary       targets.ts imports updated
model-maps.ts (remove kind)      file processors        targets.ts buildPipeline updated
                                 payload.ts refactor    plugin-assemble-bootstrap.ts DELETED
                                 4 per-IDE assemblers   fileNormalizeModels dispatcher DELETED
                                 json-string.ts +       3 tmpl keys renamed
                                 bootstrap-manifest.ts +
                              → Group 4 (tests)
                                 9 new test files
                                 2 deleted test files
```

**Critical ordering constraints:**
- C3: `types.ts` field removal MUST precede `model-maps.ts` constant update (model-maps imports ModelVocabulary).
- C4: `types.ts` field removal; all 6 `hookEntryShape` references in `targets.ts` removed atomically.
- Template key rename + targets.ts wiring MUST happen in the same pass (Group 3). tsc will fail between these states.
- `plugin-assemble-bootstrap.ts` delete MUST happen only after `targets.ts` no longer imports it.
- `fileNormalizeModels` dispatcher delete MUST happen only after `targets.ts` imports per-vocabulary processors.
- Per-IDE assemblers (Group 2) MUST exist before `targets.ts` imports them (Group 3).
- `buildCursorHookPayloadJson` and `CURSOR_PLUGIN_ROOT_ENTRY` MUST exist before `plugin-assemble-cursor-bootstrap.ts` is created.

---

## Implementation Groups

### GROUP 1 — Type Field Removal (C3, C4)
Goal: Remove identity-discriminant fields. tsc-clean after this group.

#### Step 1.1 — Remove `ModelVocabulary.kind` from `types.ts`
- **File:** `src/types.ts` lines 79–82
- **Change:** Delete `kind: 'claude' | 'cursor' | 'copilot' | 'codex';` from `ModelVocabulary` interface.
- **AC:** `ModelVocabulary` has only `map: Record<string, string>`. tsc sees no usage of `vocabulary.kind` anywhere.
- **EARS:** FR-ARCH-0005-C3
- **Watch-for:** tsc will immediately complain about `model-maps.ts` constants that still set `kind`. Fix in Step 1.2.

#### Step 1.2 — Remove `kind` from 4 constants in `model-maps.ts`
- **File:** `src/spec/model-maps.ts`
- **Change:** Remove `kind: 'claude'`, `kind: 'cursor'`, `kind: 'copilot'`, `kind: 'codex'` from `CLAUDE_VOCABULARY`, `CURSOR_VOCABULARY`, `COPILOT_VOCABULARY`, `CODEX_VOCABULARY` constants. See CLEAN-ARCHITECTURE.md §C2 / model-maps.ts diff.
- **AC:** All 4 constants compile without `kind`. tsc clean.
- **EARS:** FR-ARCH-0005-C3

#### Step 1.3 — Remove `PluginSpec.hookEntryShape` from `types.ts`
- **File:** `src/types.ts` line 93
- **Change:** Delete `hookEntryShape: 'claude' | 'copilot' | 'codex' | 'cursor';` from `PluginSpec` interface.
- **AC:** `PluginSpec` interface compiles without `hookEntryShape`. Note: `targets.ts` will immediately have 6 tsc errors (still sets `hookEntryShape` on each spec). These are resolved atomically in Group 3 Step 3.2.
- **EARS:** FR-ARCH-0005-C4
- **Watch-for:** Do not run tsc between Step 1.3 and Group 3 Step 3.2 — known broken state.

**GROUP 1 tsc checkpoint:** Run `npx tsc --noEmit` from `src/plugin-generator/`. Expected: errors in `targets.ts` (6 `hookEntryShape` references), `plugin-assemble-bootstrap.ts` (reads `p.spec.hookEntryShape` at line 17 to build the dynamic context key), and `bootstrap/payload.ts` (reads `spec.hookEntryShape` at lines 107 and 122 in `buildEntryForIde` and `buildPluginRootEntry`). These are resolved in Groups 2 and 3. If errors appear anywhere else — STOP and report.

---

### GROUP 2 — New Files (C1 helpers, C1 processors, C2 refactor, cursor additions)
Goal: Create all new files. No deletions yet. tsc may remain broken from Group 1.

#### Step 2.1 — Export shared helpers from `file-normalize-models.ts`
- **File:** `src/file-processors/file-normalize-models.ts`
- **Change:** Add `export` keyword to `removeModelLine` and `rewriteCodexModelFields` (currently private). Extract frontmatter-extraction and apply-rewrite logic into new exported functions `extractFrontmatterModelField` and `applyModelRewrite`. Full target state defined in CLEAN-ARCHITECTURE.md §C1 / file-normalize-models.ts final state.
- **Note:** Keep `fileNormalizeModels` function in place for now — it is still imported by `targets.ts`. It will be deleted in Group 3.
- **AC:** `extractFrontmatterModelField`, `applyModelRewrite`, `removeModelLine`, `rewriteCodexModelFields` are exported. Existing `fileNormalizeModels` still present and compiling.
- **EARS:** FR-ARCH-0046

#### Step 2.2 — Create `file-normalize-claude-models.ts`
- **File:** `src/file-processors/file-normalize-claude-models.ts` (new)
- **Content:** Per CLEAN-ARCHITECTURE.md §C1 / file-normalize-claude-models.ts. Imports `normalizeClaude`, `extractFrontmatterModelField`, `applyModelRewrite`.
- **AC:** Compiles. `fileNormalizeClaudeModels` exported. Binary/null/no-frontmatter/no-model-field/no-claude-token → returns same frame instance. Claude token → rewrites content and `source[0].frontmatter.model`.

#### Step 2.3 — Create `file-normalize-cursor-models.ts`
- **File:** `src/file-processors/file-normalize-cursor-models.ts` (new)
- **Content:** Per CLEAN-ARCHITECTURE.md §C1 / file-normalize-cursor-models.ts. Imports `normalizeCursor`.
- **AC:** Compiles. Binary/null/no-model-field → same instance. Cursor token → rewrites content and frontmatter.model.

#### Step 2.4 — Create `file-normalize-copilot-models.ts`
- **File:** `src/file-processors/file-normalize-copilot-models.ts` (new)
- **Content:** Per CLEAN-ARCHITECTURE.md §C1 / file-normalize-copilot-models.ts. Imports `normalizeCopilot`.
- **AC:** Compiles. Binary/null/no-model-field → same instance. Copilot token → display name rewrite.

#### Step 2.5 — Create `file-normalize-codex-models.ts`
- **File:** `src/file-processors/file-normalize-codex-models.ts` (new)
- **Content:** Per CLEAN-ARCHITECTURE.md §C1 / file-normalize-codex-models.ts. Imports `normalizeCodex`, `extractFrontmatterModelField`, `removeModelLine`, `rewriteCodexModelFields`, `updateFileFrame`.
- **AC:** Compiles. No gpt token → strip model line, frontmatter.model NOT updated. gpt token → two-field rewrite, frontmatter.model NOT updated.

#### Step 2.6 — Add `buildCursorHookPayloadJson` to `json-string.ts`
- **File:** `src/escaping/json-string.ts`
- **Change:** Append export after `buildHookPayloadJson`. Content per CLEAN-ARCHITECTURE.md §C2 / json-string.ts.
- **Format:** `{"additional_context":"<escaped>"}` — NOT `{"hookSpecificOutput":...}`.
- **AC:** Compiles. Function exported.

#### Step 2.7 — Add `CURSOR_PLUGIN_ROOT_ENTRY` to `bootstrap-manifest.ts`
- **File:** `src/spec/bootstrap-manifest.ts`
- **Change:** Append export after `COPILOT_PLUGIN_ROOT_POWERSHELL`. Content per CLEAN-ARCHITECTURE.md §C2 / bootstrap-manifest.ts.
- **Command format:** `printf '{"additional_context":"Rosetta Plugin Path: %s"}' "${CURSOR_PROJECT_DIR}"` — double-quoted for env var expansion.
- **AC:** Compiles. `CURSOR_PLUGIN_ROOT_ENTRY` exported.

#### Step 2.8 — Refactor `bootstrap/payload.ts`
- **File:** `src/bootstrap/payload.ts`
- **Change:** Full replacement per CLEAN-ARCHITECTURE.md §C2 / payload.ts final state.
  - Delete `buildEntryForIde` and `buildPluginRootEntry` switch functions.
  - Delete private `buildClaudeEntry`, `buildCodexEntry`, `buildCopilotEntry`.
  - Add exported `buildClaudeBootstrapEntry`, `buildCodexBootstrapEntry`, `buildCopilotBootstrapEntry`, `buildCursorBootstrapEntry`.
  - Add exported `EntryBuilderFn`, `RootEntryBuilderFn` types.
  - Change `assembleBootstrapPayload` signature to accept callbacks.
  - Remove CLAUDE_PLUGIN_ROOT_ENTRY, CODEX_PLUGIN_ROOT_COMMAND, COPILOT_PLUGIN_ROOT_BASH, COPILOT_PLUGIN_ROOT_POWERSHELL from imports (no longer used inside payload.ts).
  - Keep `buildHookPayloadJson` re-export (used by per-IDE assemblers).
- **Watch-for:** `plugin-assemble-bootstrap.ts` still calls the OLD `assembleBootstrapPayload(p)` signature (no callbacks). This will cause a tsc error. It is resolved in Group 3 when `plugin-assemble-bootstrap.ts` is deleted.
- **AC:** New signature compiles. 4 entry builders exported. Callback types exported. Switch functions removed.

#### Step 2.9 — Create `plugin-assemble-claude-bootstrap.ts`
- **File:** `src/plugin-processors/plugin-assemble-claude-bootstrap.ts` (new)
- **Content:** Per CLEAN-ARCHITECTURE.md §C2 / plugin-assemble-claude-bootstrap.ts.
- **Key:** Writes `templateContext['bootstrap_hooks']` (no suffix).
- **Entry shape:** `{"type": "command", "command": "printf '%s' '<json>'", "once": true}`.
- **AC:** Compiles. `pluginAssembleClaudeBootstrap` exported.

#### Step 2.10 — Create `plugin-assemble-codex-bootstrap.ts`
- **File:** `src/plugin-processors/plugin-assemble-codex-bootstrap.ts` (new)
- **Content:** Per CLEAN-ARCHITECTURE.md §C2 / plugin-assemble-codex-bootstrap.ts.
- **Key:** Writes `templateContext['bootstrap_hooks']`.
- **Entry shape:** `statusMessage` + `timeout: 30`, no `once`.
- **AC:** Compiles. `pluginAssembleCodexBootstrap` exported.

#### Step 2.11 — Create `plugin-assemble-copilot-bootstrap.ts`
- **File:** `src/plugin-processors/plugin-assemble-copilot-bootstrap.ts` (new)
- **Content:** Per CLEAN-ARCHITECTURE.md §C2 / plugin-assemble-copilot-bootstrap.ts.
- **Key:** Writes `templateContext['bootstrap_hooks']`.
- **Entry 0 bash:** stale-lock cleanup + `-0.lock`.
- **Entry N bash (N>0):** `-N.lock`, no stale-lock cleanup.
- **Plugin-root:** bash and powershell folder-rewritten.
- **AC:** Compiles. `pluginAssembleCopilotBootstrap` exported.

#### Step 2.12 — Create `plugin-assemble-cursor-bootstrap.ts`
- **File:** `src/plugin-processors/plugin-assemble-cursor-bootstrap.ts` (new)
- **Content:** Per CLEAN-ARCHITECTURE.md §C2 / plugin-assemble-cursor-bootstrap.ts.
- **Key:** Writes `templateContext['bootstrap_hooks']` (non-empty, Owner Rule 1).
- **Entry shape:** `{"type": "command", "command": "..."}` — no `once`, no `statusMessage`, no `bash/powershell`.
- **Payload format:** `buildCursorHookPayloadJson` → `{"additional_context":"..."}`.
- **Plugin-root:** `CURSOR_PLUGIN_ROOT_ENTRY.command` wrapped in `buildCursorBootstrapEntry`.
- **AC:** Compiles. `pluginAssembleCursorBootstrap` exported.

**GROUP 2 tsc checkpoint:** Run `npx tsc --noEmit`. Expected errors: `targets.ts` (6 `hookEntryShape`, old `fileNormalizeModels` still wired, old `pluginAssembleBootstrap` still imported) and `plugin-assemble-bootstrap.ts` (old `assembleBootstrapPayload` signature mismatch). All resolved in Group 3. If errors appear in any newly created file — STOP and fix before proceeding.

---

### GROUP 3 — Atomic Wire + Delete (must complete fully before tsc checkpoint)
Goal: Update `targets.ts`, rename template keys, delete stale files. Must be done as a unit — do not run tsc between steps 3.1 and 3.5.

#### Step 3.1 — Rename 3 template placeholder keys
- **Files:**
  - `plugins/core-claude/hooks/hooks.json.tmpl` line 6: `{{{bootstrap_hooks_claude}}}` → `{{{bootstrap_hooks}}}`
  - `plugins/core-codex/.codex-plugin/hooks.json.tmpl` line 6: `{{{bootstrap_hooks_codex}}}` → `{{{bootstrap_hooks}}}`
  - `plugins/core-copilot/.github/plugin/hooks.json.tmpl` line 4: `{{{bootstrap_hooks_copilot}}}` → `{{{bootstrap_hooks}}}`
- **AC:** Each file has `{{{bootstrap_hooks}}}` at the correct line. No per-IDE suffix remains. Cursor template unchanged.
- **EARS:** FR-VAR-0070

#### Step 3.2 — Update `targets.ts` imports
- **File:** `src/spec/targets.ts`
- **Changes:**
  1. Remove: `import { fileNormalizeModels } from '../file-processors/file-normalize-models.js'`
  2. Remove: `import { pluginAssembleBootstrap } from '../plugin-processors/plugin-assemble-bootstrap.js'`
  3. Add: 4 per-vocabulary file processor imports (see CLEAN-ARCHITECTURE.md §targets.ts step 1).
  4. Add: 4 per-IDE bootstrap assembler imports (see CLEAN-ARCHITECTURE.md §targets.ts step 1).
  5. Add: `import type { FileProcessor } from '../types.js'` (or verify `FileProcessor` is already in the types import).
  6. Add: `PluginProcessor` to the types import from `../types.js`.
- **AC:** No remaining import of `fileNormalizeModels` or `pluginAssembleBootstrap`. All 8 new imports resolve.

#### Step 3.3 — Update `targets.ts` helper function signatures
- **File:** `src/spec/targets.ts`
- **Changes:** In `makeRulesEntry`, `makeWorkflowsEntry`, `makeAgentsEntry`, `makeSkillsEntry`, `makeTemplatesEntry`: change `normalizeModels: typeof fileNormalizeModels` → `normalizeModels: FileProcessor`. See CLEAN-ARCHITECTURE.md §targets.ts step 2 for all 5 signatures.
- **AC:** No `typeof fileNormalizeModels` usage remains in `targets.ts`.

#### Step 3.4 — Update `targets.ts` `buildPipeline` signature and body
- **File:** `src/spec/targets.ts` lines 541–564
- **Changes:**
  1. Remove `isStandalone: boolean` parameter (was position 4).
  2. Add `bootstrapAssembler: PluginProcessor` parameter at position 5 (after `dryRun`).
  3. Replace `pluginAssembleBootstrap` in pipeline array with `bootstrapAssembler`.
- **Watch-for:** `dryRun` is now position 4; `bootstrapAssembler` is position 5. All 6 call sites must be updated simultaneously in Step 3.5 to match new signature.
- **AC:** `buildPipeline` body has no reference to `pluginAssembleBootstrap` or `isStandalone`.

#### Step 3.5 — Update 6 spec definitions in `buildAllSpecs`
- **File:** `src/spec/targets.ts` — all 6 spec object literals
- **Changes per spec:**
  1. Remove `hookEntryShape: '...'` line.
  2. Replace all `fileNormalizeModels` calls with per-vocabulary processor:
     - `core-claude`: `fileNormalizeClaudeModels`
     - `core-cursor`: `fileNormalizeCursorModels` (including inline rules entry)
     - `core-copilot`: `fileNormalizeCopilotModels` (including inline agents entry and standalone entries)
     - `core-codex`: `fileNormalizeCodexModels` for rules, workflows, skills entries only; agents entry keeps `fileCodexAgentFormat` (no model normalization)
     - `core-cursor-standalone`: `fileNormalizeCursorModels`
     - `core-copilot-standalone`: `fileNormalizeCopilotModels`
  3. Update `buildPipeline` call: remove `isStandalone` bool, add per-IDE assembler as last arg:
     - `core-claude`: `buildPipeline(hooksSource, outputDir, release, dryRun, pluginAssembleClaudeBootstrap)`
     - `core-cursor`: `buildPipeline(hooksSource, outputDir, release, dryRun, pluginAssembleCursorBootstrap)`
     - `core-copilot`: `buildPipeline(hooksSource, outputDir, release, dryRun, pluginAssembleCopilotBootstrap)`
     - `core-codex`: `buildPipeline(hooksSource, outputDir, release, dryRun, pluginAssembleCodexBootstrap)`
     - `core-cursor-standalone`: `buildPipeline(hooksSource, outputDir, release, dryRun, pluginAssembleCursorBootstrap)`
     - `core-copilot-standalone`: `buildPipeline(hooksSource, outputDir, release, dryRun, pluginAssembleCopilotBootstrap)`
- **AC:** Zero `hookEntryShape` references in `targets.ts`. Zero `fileNormalizeModels` references. Zero `isStandalone` arguments. 6 specs each have correct per-vocabulary processor and per-IDE assembler.
- **EARS:** FR-ARCH-0005-C1, FR-ARCH-0005-C2b, FR-ARCH-0005-C4, FR-VAR-0070

#### Step 3.6 — Delete `plugin-assemble-bootstrap.ts`
- **File:** `src/plugin-processors/plugin-assemble-bootstrap.ts`
- **Action:** Delete file entirely.
- **Prerequisite:** Step 3.2 must be complete (targets.ts no longer imports it).
- **AC:** File does not exist. No compilation error. `grep -r pluginAssembleBootstrap src/` returns no results.

#### Step 3.7 — Delete `fileNormalizeModels` dispatcher from `file-normalize-models.ts`
- **File:** `src/file-processors/file-normalize-models.ts`
- **Action:** Remove the `fileNormalizeModels` function and its 4 normalizer imports (`normalizeClaude`, `normalizeCursor`, `normalizeCopilot`, `normalizeCodex`). Keep the `rewriteModelLine` import — `applyModelRewrite` calls it and the authoritative final state in CLEAN-ARCHITECTURE.md §C1 retains this import. Keep the `updateFileFrame` import (used by `applyModelRewrite`). Keep the 4 exported helper functions.
- **Prerequisite:** Step 3.2 must be complete (targets.ts no longer imports `fileNormalizeModels`).
- **AC:** `fileNormalizeModels` function does not exist. File exports only: `extractFrontmatterModelField`, `applyModelRewrite`, `removeModelLine`, `rewriteCodexModelFields`. No `switch` statement remains.
- **EARS:** FR-ARCH-0005-C1

**GROUP 3 tsc checkpoint:** Run `npx tsc --noEmit`. Expected: ZERO errors. If any error — identify which step missed a change and fix before proceeding.

---

### GROUP 4 — Tests
Goal: Delete 2 old test files, create 9 new test files. Run vitest.

#### Step 4.1 — Delete old test files
- `tests/unit/file-processors/file-normalize-models.test.ts` — delete.
- `tests/unit/plugin-processors/plugin-assemble-bootstrap.test.ts` — delete.
- **AC:** Files do not exist. `npx vitest run` no longer references them.

#### Step 4.2 — Create `file-normalize-shared-helpers.test.ts`
- **File:** `tests/unit/file-processors/file-normalize-shared-helpers.test.ts`
- **Tests:** Per CLEAN-ARCHITECTURE-SPECS.md §7 / shared helpers test cases.
- **AC:** All assertions pass. Zero TypeScript errors.

#### Step 4.3 — Create `file-normalize-claude-models.test.ts`
- **File:** `tests/unit/file-processors/file-normalize-claude-models.test.ts`
- **Tests:** Per CLEAN-ARCHITECTURE-SPECS.md §7 / claude processor test cases. Verify PARITY-9: multi-token input with gpt-4o first, claude-sonnet-4-6 second → picks `claude-sonnet-4-6` (first claude-compatible, not first overall).
- **AC:** All assertions pass.

#### Step 4.4 — Create `file-normalize-cursor-models.test.ts`
- **File:** `tests/unit/file-processors/file-normalize-cursor-models.test.ts`
- **Tests:** Per CLEAN-ARCHITECTURE-SPECS.md §7 / cursor processor test cases.
- **AC:** All assertions pass.

#### Step 4.5 — Create `file-normalize-copilot-models.test.ts`
- **File:** `tests/unit/file-processors/file-normalize-copilot-models.test.ts`
- **Tests:** Per CLEAN-ARCHITECTURE-SPECS.md §7 / copilot processor test cases.
- **AC:** All assertions pass.

#### Step 4.6 — Create `file-normalize-codex-models.test.ts`
- **File:** `tests/unit/file-processors/file-normalize-codex-models.test.ts`
- **Tests:** Per CLEAN-ARCHITECTURE-SPECS.md §7 / codex processor test cases. Verify `source[0].frontmatter.model` NOT updated for both branches (strip and two-field rewrite).
- **AC:** All assertions pass.

#### Step 4.7 — Create `plugin-assemble-claude-bootstrap.test.ts`
- **File:** `tests/unit/plugin-processors/plugin-assemble-claude-bootstrap.test.ts`
- **Tests:** Per CLEAN-ARCHITECTURE-SPECS.md §7 / claude assembler test cases.
- **AC:** `bootstrap_hooks` set; `bootstrap_hooks_claude` undefined; `"once": true` present; `"hookSpecificOutput"` present; NFR-0004 soft error emitted for oversized entry.

#### Step 4.8 — Create `plugin-assemble-codex-bootstrap.test.ts`
- **File:** `tests/unit/plugin-processors/plugin-assemble-codex-bootstrap.test.ts`
- **Tests:** Per CLEAN-ARCHITECTURE-SPECS.md §7 / codex assembler test cases.
- **AC:** `bootstrap_hooks` set; `bootstrap_hooks_codex` undefined; `"statusMessage"` and `"timeout": 30` present; no `"once"`.

#### Step 4.9 — Create `plugin-assemble-copilot-bootstrap.test.ts`
- **File:** `tests/unit/plugin-processors/plugin-assemble-copilot-bootstrap.test.ts`
- **Tests:** Per CLEAN-ARCHITECTURE-SPECS.md §7 / copilot assembler test cases.
- **AC:** `bootstrap_hooks` set; entry 0 bash has stale-lock cleanup; lock indices correct.

#### Step 4.10 — Create `plugin-assemble-cursor-bootstrap.test.ts`
- **File:** `tests/unit/plugin-processors/plugin-assemble-cursor-bootstrap.test.ts`
- **Tests:** Per CLEAN-ARCHITECTURE-SPECS.md §7 / cursor assembler test cases.
- **AC:** `bootstrap_hooks` defined and non-empty; `"additional_context"` present; `"hookSpecificOutput"` absent; no `"once"`, no `"bash"`, no `"powershell"`; `CURSOR_PROJECT_DIR` in plugin-root.

**GROUP 4 vitest checkpoint:** `npx vitest run` from `src/plugin-generator/`. Expected: all tests pass. Net change: +9 new, -2 deleted. If any existing test breaks — STOP, identify root cause (likely a test fixture using `modelVocabulary.kind` or `hookEntryShape`), fix and re-run.

---

### GROUP 5 — Parity Verification
Goal: Confirm end-to-end output is byte-identical to baselines (accepted buckets only).

#### Step 5.1 — Run parity check (r2 and r3)
```bash
cd /Users/isolomatov/Sources/GAIN/rosetta/src/plugin-generator
S=/Users/isolomatov/Sources/GAIN/rosetta
rm -rf /tmp/g2 /tmp/g3
npx tsx src/cli.ts --release r2 --domain core --source "$S" --output /tmp/g2
diff -rq /tmp/g2 "$S/agents/TEMP/old-gen-r2"
npx tsx src/cli.ts --release r3 --domain core --source "$S" --output /tmp/g3
diff -rq /tmp/g3 "$S/agents/TEMP/old-gen-r3"
```
- **AC-r2:** diff output contains ONLY accepted-bucket lines (Bucket A: `*.agent.md`, Bucket D: `commands/` vs `prompts/`, Decision 3: `plugin-files-mode` cascades, Task B: `.cursor/hooks` empty dir).
- **AC-r3:** same.
- **AC-cursor:** `core-cursor/hooks/hooks.json` and `core-cursor-standalone/.cursor/hooks.json` both output `{"version":1,"hooks":{}}` (37 bytes).
- If any NEW diff line appears — STOP and report. Do not adjust baselines.

---

## Subagent Dispatch Plan

This task is sized for a single engineer subagent (one worktree, sequential groups). No parallel dispatch needed — groups have hard sequential dependencies.

| Group | Agent Role | Isolation |
|-------|-----------|-----------|
| 1–3 | rosetta:engineer | worktree (all source changes) |
| 4 | rosetta:engineer | same worktree (test changes) |
| 5 | rosetta:validator | same worktree (parity verification) |

The engineer subagent MUST:
1. Work in the worktree created by the orchestrator.
2. Complete each group fully before running the tsc checkpoint.
3. Not run tsc between Group 3 Steps 3.1–3.7 (known broken state).
4. Not commit, push, or merge.
5. Use CLEAN-ARCHITECTURE.md as the authoritative content source for exact file content.
6. Use this PLAN for ordering/sequencing.
7. Use SPECS for contracts and acceptance criteria.

---

## HITL Gates

| Gate | Trigger | Decision Required |
|------|---------|-------------------|
| GATE-1 (pre-execution) | Before Group 1 starts | User approves specs + plan. Confirm: no commit, no push, local-only. |
| GATE-2 (post-Group 3 tsc) | After GROUP 3 tsc checkpoint | tsc must be zero errors. If non-zero: pause, report errors, await fix decision. |
| GATE-3 (post-Group 4 vitest) | After GROUP 4 vitest checkpoint | All tests pass. If failures: pause, report, await fix decision. |
| GATE-4 (post-Group 5 parity) | After parity check | Zero new diffs. If new diffs: pause, report exact diff lines, await owner decision. |

---

## Risk Register

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R1 | `targets.ts` inline spec entries use `fileNormalizeModels` not via helper functions — missed during Step 3.5 | Medium | tsc error | Read targets.ts in full before Step 3.5; grep for all `fileNormalizeModels` occurrences |
| R2 | `buildPipeline` positional arg change breaks call sites | Medium | tsc error | Step 3.4 and 3.5 done together; verify all 6 call sites |
| R3 | `rewriteModelLine` import needed in `file-normalize-models.ts` after refactor | Low | tsc error | `applyModelRewrite` calls `rewriteModelLine`; keep the import |
| R4 | Test fixtures use `vocabulary.kind` or `hookEntryShape` | Low | vitest failure | grep tests for `.kind` and `hookEntryShape` before running vitest |
| R5 | New diff in parity from cursor bootstrap change | Low | parity failure | cursor template has no placeholder — payload not injected — baseline unchanged |
| R6 | `BOOTSTRAP_MANIFEST_ORDER` import removed from `payload.ts` when moving to callback pattern | Low | tsc error | `assembleBootstrapPayload` still iterates `BOOTSTRAP_MANIFEST_ORDER` internally |

---

## Acceptance Criteria Summary

All 13 ACs from CLEAN-ARCHITECTURE-SPECS.md §9 must pass:

| ID | Criterion |
|----|-----------|
| AC-1 | `npx tsc --noEmit` zero errors |
| AC-2 | `npx vitest run` all tests pass (net +7 test files) |
| AC-3 | `ModelVocabulary` has no `kind` field |
| AC-4 | `PluginSpec` has no `hookEntryShape` field |
| AC-5 | No `switch` in `file-normalize-models.ts` |
| AC-6 | No `switch` in `bootstrap/payload.ts` |
| AC-7 | No `` `bootstrap_hooks_${...}` `` dynamic key |
| AC-8 | `plugin-assemble-bootstrap.ts` does not exist |
| AC-9 | `fileNormalizeModels` function does not exist |
| AC-10 | All 3 `.tmpl` files use `{{{bootstrap_hooks}}}` |
| AC-11 | Parity r2/r3: only accepted-bucket diffs |
| AC-12 | Cursor `hooks.json` = `{"version":1,"hooks":{}}` (37 bytes) |
| AC-13 | `templateContext['bootstrap_hooks']` non-empty for cursor targets |
