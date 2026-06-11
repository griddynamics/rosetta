# plugin-generator — Clean Architecture Specs (Task C)
<!-- FR-ARCH-0005 identity-switch elimination -->

## TLDR

Task C eliminates 5 identity-switch violations (C1–C4) in the plugin-generator by:
1. Deleting `ModelVocabulary.kind` and `PluginSpec.hookEntryShape` (identity-discriminant fields).
2. Decomposing the monolithic `fileNormalizeModels` switch into 4 per-vocabulary processors.
3. Replacing `pluginAssembleBootstrap` + switch-in-`assembleBootstrapPayload` with callback-driven `assembleBootstrapPayload(p, buildEntry, buildRootEntry)` + 4 per-IDE assemblers.
4. Adding full cursor bootstrap support (was silently dropped via `default: return null`).
5. Renaming 3 template placeholder keys from `bootstrap_hooks_<ide>` to `bootstrap_hooks`.
Baseline: tsc clean, 303 tests / 31 files. Target: tsc clean, ~303+9-2=310 tests / 31+8-1=38 files. Parity: r2/r3 diff output unchanged (accepted buckets only).

---

## 1. Scope

### In Scope
- All 5 violation sites: C1, C2a, C2b, C3, C4 (see §3).
- 12 modified files, 8 new files, 1 deleted file, 9 new test files, 2 deleted test files.
- Cursor bootstrap support (new entry builder + CURSOR_PLUGIN_ROOT_ENTRY).
- Template key rename in 3 `.tmpl` files.

### Out of Scope
- No changes to parity baselines (`agents/TEMP/old-gen-r2/`, `agents/TEMP/old-gen-r3/`).
- No changes to any e2e tests.
- No changes to non-C1/C2 file processors.
- No changes to `frames.ts`, `copilot-lock.ts`, `plugin-rewrite-references.ts`, `serialize/`, `escaping/shell.ts`.

### Requirement Traceability

| Req ID | Description | Violation Fixed |
|--------|-------------|-----------------|
| FR-ARCH-0005 P1 | No identity-switch on ModelVocabulary.kind or hookEntryShape | C1, C2a, C2b, C3, C4 |
| FR-ARCH-0046 | Per-vocabulary model normalization helpers exported and reusable | C1 |
| FR-ARCH-0055 | Per-IDE bootstrap assemblers — one file per IDE | C2b |
| FR-VAR-0070 | Single `bootstrap_hooks` key in templateContext (no per-IDE suffix) | C2b |
| FR-HOOK-0007 | Plugin-root entry present for all IDEs including cursor | C2a |
| FR-HOOK-0001 | Absent bootstrap doc → skip (absent→skip, not error) | retained |
| FR-HOOK-0003 | Bootstrap prefix applied to lead document only | retained |
| FR-HOOK-0004 | Index entries conditional on `includeIndexEntries` | retained |
| FR-HOOK-0008 | Folder rewrites applied to doc bodies (not index bodies) | retained |
| NFR-0004 | Bootstrap entry > 10000 chars → soft error | retained |
| FR-COPY-0020 | Model normalization: claude vocabulary | C1 refactor |
| FR-COPY-0021 | Model normalization: cursor vocabulary | C1 refactor |
| FR-COPY-0022 | Model normalization: codex vocabulary (strip or two-field rewrite) | C1 refactor |
| GT-3.1–3.4 | Per-IDE entry shapes (claude/codex/copilot/cursor) | C2a/C2b |

---

## 2. Architecture

### Current State (violating)

```
targets.ts
  └─► fileNormalizeModels(frame, ctx)         ← switch(vocabulary.kind) [C1, C3]
  └─► pluginAssembleBootstrap(p)
        └─► assembleBootstrapPayload(p)        ← switch(hookEntryShape) [C2a, C4]
              └─► buildEntryForIde(shape, ...) ← switch(shape), default: null drops cursor
        └─► `bootstrap_hooks_${shape}`         ← dynamic key [C2b, C4]
```

### Target State (clean)

```
targets.ts
  └─► fileNormalizeClaudeModels(frame, ctx)   ← no switch; imports normalizeClaude
  └─► fileNormalizeCursorModels(frame, ctx)   ← no switch; imports normalizeCursor
  └─► fileNormalizeCopilotModels(frame, ctx)  ← no switch; imports normalizeCopilot
  └─► fileNormalizeCodexModels(frame, ctx)    ← no switch; imports normalizeCodex

  └─► pluginAssembleClaudeBootstrap(p)        ← assembleBootstrapPayload(p, λ, λ)
  └─► pluginAssembleCursorBootstrap(p)        ← assembleBootstrapPayload(p, λ, λ)
  └─► pluginAssembleCopilotBootstrap(p)       ← assembleBootstrapPayload(p, λ, λ)
  └─► pluginAssembleCodexBootstrap(p)         ← assembleBootstrapPayload(p, λ, λ)

assembleBootstrapPayload(p, buildEntry, buildRootEntry)
  ← callback-driven; no switch; IDE behavior injected by caller
  └─► templateContext['bootstrap_hooks'] = payload   ← ONE key (FR-VAR-0070)
```

### Sequence (payload assembly, 4+ actors)

```
targets.ts ──buildPipeline(bootstrapAssembler)──► pipeline[6] = bootstrapAssembler
pluginAssemble<IDE>Bootstrap(p) ──► assembleBootstrapPayload(p, buildEntry, buildRootEntry)
  ──► BOOTSTRAP_MANIFEST_ORDER loop
        ──► findDocBody / findIndexBody
        ──► applyFolderRewrites
        ──► buildHookPayloadJson (size check)
        ──► buildEntry(additionalContext, jsonPayload, lockIndex) → string | null
  ──► buildRootEntry(lockIndex, folderPairs) → string | null
  ──► join(', ') → payload
  ──► updatePluginFrame: templateContext['bootstrap_hooks'] = payload
```

---

## 3. Violation Sites and Resolutions

### C1 — `file-normalize-models.ts` line 41
**Violation:** `switch (vocabulary.kind)` dispatches model normalization by identity field.
**Resolution:**
- Export 4 named helpers from the shared module: `extractFrontmatterModelField`, `applyModelRewrite`, `removeModelLine`, `rewriteCodexModelFields`.
- Delete `fileNormalizeModels` function and its imports of all 4 normalizers.
- Create 4 new per-vocabulary processor files (each imports only its own normalizer).
- Wire per-vocabulary processor into each spec in `targets.ts`.

### C2a — `bootstrap/payload.ts` line 188
**Violation:** `switch (shape)` in `buildEntryForIde`; `default: return null` silently drops cursor entries; `switch (shape)` in `buildPluginRootEntry` also drops cursor.
**Resolution:**
- Delete `buildEntryForIde` and `buildPluginRootEntry` switch functions.
- Change signature: `assembleBootstrapPayload(p, buildEntry: EntryBuilderFn, buildRootEntry: RootEntryBuilderFn)`.
- Expose 4 named entry builders as exports: `buildClaudeBootstrapEntry`, `buildCodexBootstrapEntry`, `buildCopilotBootstrapEntry`, `buildCursorBootstrapEntry`.
- Add `buildCursorHookPayloadJson` to `escaping/json-string.ts`.
- Add `CURSOR_PLUGIN_ROOT_ENTRY` to `spec/bootstrap-manifest.ts`.

### C2b — `plugin-assemble-bootstrap.ts` line 19
**Violation:** `` `bootstrap_hooks_${shape}` `` dynamic key derived from identity field.
**Resolution:**
- Delete `plugin-assemble-bootstrap.ts` entirely.
- Create 4 new per-IDE assembler files; each writes `templateContext['bootstrap_hooks']` (fixed key).
- `buildPipeline` in `targets.ts` accepts `bootstrapAssembler: PluginProcessor` and wires it at pipeline position 6.

### C3 — `types.ts` line 80
**Violation:** `ModelVocabulary.kind: 'claude' | 'cursor' | 'copilot' | 'codex'` — identity-discriminant field.
**Resolution:** Delete `kind` from `ModelVocabulary` interface. Remove `kind` from all 4 vocabulary constants in `model-maps.ts`.

### C4 — `types.ts` line 93
**Violation:** `PluginSpec.hookEntryShape: 'claude' | 'copilot' | 'codex' | 'cursor'` — identity-discriminant field.
**Resolution:** Delete `hookEntryShape` from `PluginSpec` interface. Remove `hookEntryShape` from all 6 spec definitions in `targets.ts`.

---

## 4. Interface Contracts

### `assembleBootstrapPayload` (new signature)
```typescript
export type EntryBuilderFn = (additionalContext: string, jsonPayload: string, lockIndex: number) => string | null;
export type RootEntryBuilderFn = (lockIndex: number, folderPairs: Array<[string, string]>) => string | null;
export function assembleBootstrapPayload(
  p: PluginProcessingFrame,
  buildEntry: EntryBuilderFn,
  buildRootEntry: RootEntryBuilderFn,
): { payload: string; errors: GenError[] }
```
- `jsonPayload` in `EntryBuilderFn` is the `buildHookPayloadJson` format (hookSpecificOutput) — used for size check and passed to non-cursor assemblers. Cursor assembler ignores `_jsonPayload` and calls `buildCursorHookPayloadJson(additionalContext)` directly.
- `lockIndex` is 0-based count of entries emitted so far; incremented only when `buildEntry` returns non-null.

### Per-IDE Entry Builders (exported from `bootstrap/payload.ts`)
```typescript
export function buildClaudeBootstrapEntry(command: string): string
// → {"type": "command", "command": "<cmd>", "once": true}

export function buildCodexBootstrapEntry(command: string): string
// → {"type": "command", "command": "<cmd>", "statusMessage": "Loading Rosetta bootstrap", "timeout": 30}

export function buildCopilotBootstrapEntry(bash: string, powershell: string): string
// → {"type": "command", "bash": "<bash>", "powershell": "<ps>"}

export function buildCursorBootstrapEntry(command: string): string
// → {"type": "command", "command": "<cmd>"}  (no once, no statusMessage)
```

### Per-Vocabulary File Processors
All share signature: `(frame: FileProcessingFrame, _ctx: TargetContext) => FileProcessingFrame`

```typescript
// file-normalize-models.ts (shared helpers)
export function extractFrontmatterModelField(content: string): string | null
export function applyModelRewrite(frame: FileProcessingFrame, normalizedModel: string): FileProcessingFrame
export function removeModelLine(content: string): string
export function rewriteCodexModelFields(content: string, gptModel: string, effort: string): string

// Per-vocabulary processors
export function fileNormalizeClaudeModels(frame, _ctx): FileProcessingFrame  // file-normalize-claude-models.ts
export function fileNormalizeCursorModels(frame, _ctx): FileProcessingFrame  // file-normalize-cursor-models.ts
export function fileNormalizeCopilotModels(frame, _ctx): FileProcessingFrame // file-normalize-copilot-models.ts
export function fileNormalizeCodexModels(frame, _ctx): FileProcessingFrame   // file-normalize-codex-models.ts
```

### Per-IDE Bootstrap Assemblers
All share signature: `(p: PluginProcessingFrame) => PluginProcessingFrame`
- Sets `templateContext['bootstrap_hooks']` (one fixed key, FR-VAR-0070).
- Propagates `errors` (soft errors from NFR-0004) to `frame.errors`.

### `buildPipeline` (new signature)
```typescript
function buildPipeline(
  hooksSource: string,
  outputDir: string,
  release: ReleaseDescriptor,
  dryRun: boolean,                    // position 4 (was 5)
  bootstrapAssembler: PluginProcessor // position 5 (replaces isStandalone)
): PluginProcessor[]
```
`isStandalone` (was position 4) is removed — it was unused in the pipeline body.

### Type Changes
```typescript
// types.ts — BEFORE/AFTER
interface ModelVocabulary {
  // REMOVE: kind: 'claude' | 'cursor' | 'copilot' | 'codex';
  map: Record<string, string>;
}

interface PluginSpec {
  // REMOVE: hookEntryShape: 'claude' | 'copilot' | 'codex' | 'cursor';
  // all other fields unchanged
}
```

### New Exports Added
```typescript
// escaping/json-string.ts
export function buildCursorHookPayloadJson(body: string): string
// → {"additional_context":"<escaped>"}

// spec/bootstrap-manifest.ts
export const CURSOR_PLUGIN_ROOT_ENTRY = {
  command: `printf '{"additional_context":"Rosetta Plugin Path: %s"}' "\${CURSOR_PROJECT_DIR}"`,
}
```

---

## 5. Data Flow: Template Key Rename

| Template File | Before | After |
|---|---|---|
| `plugins/core-claude/hooks/hooks.json.tmpl` line 6 | `{{{bootstrap_hooks_claude}}}` | `{{{bootstrap_hooks}}}` |
| `plugins/core-codex/.codex-plugin/hooks.json.tmpl` line 6 | `{{{bootstrap_hooks_codex}}}` | `{{{bootstrap_hooks}}}` |
| `plugins/core-copilot/.github/plugin/hooks.json.tmpl` line 4 | `{{{bootstrap_hooks_copilot}}}` | `{{{bootstrap_hooks}}}` |

Cursor template (`plugins/core-cursor/.cursor/hooks.json`) has no `{{{bootstrap_hooks}}}` placeholder and requires NO change. Cursor payload is assembled but not injected — output remains `{"version":1,"hooks":{}}` (37 bytes). Parity: unchanged.

---

## 6. Files Affected

### Modified (10)
| File | Change |
|------|--------|
| `src/types.ts` | Remove `kind` from `ModelVocabulary`; remove `hookEntryShape` from `PluginSpec` |
| `src/spec/model-maps.ts` | Remove `kind` from 4 vocabulary constants |
| `src/file-processors/file-normalize-models.ts` | Export 4 helpers; delete `fileNormalizeModels` dispatcher and all its normalizer imports |
| `src/bootstrap/payload.ts` | New signature + callback types; expose 4 entry builders as exports; delete switch functions; add `buildCursorBootstrapEntry` |
| `src/escaping/json-string.ts` | Append `buildCursorHookPayloadJson` |
| `src/spec/bootstrap-manifest.ts` | Append `CURSOR_PLUGIN_ROOT_ENTRY` |
| `src/spec/targets.ts` | Update imports; update 5 helper signatures; update `buildPipeline`; wire per-vocabulary processors + per-IDE assemblers; remove `hookEntryShape` from 6 specs |
| `plugins/core-claude/hooks/hooks.json.tmpl` | `{{{bootstrap_hooks_claude}}}` → `{{{bootstrap_hooks}}}` |
| `plugins/core-codex/.codex-plugin/hooks.json.tmpl` | `{{{bootstrap_hooks_codex}}}` → `{{{bootstrap_hooks}}}` |
| `plugins/core-copilot/.github/plugin/hooks.json.tmpl` | `{{{bootstrap_hooks_copilot}}}` → `{{{bootstrap_hooks}}}` |

(All paths relative to `src/plugin-generator/`)

### New (8)
| File |
|------|
| `src/file-processors/file-normalize-claude-models.ts` |
| `src/file-processors/file-normalize-cursor-models.ts` |
| `src/file-processors/file-normalize-copilot-models.ts` |
| `src/file-processors/file-normalize-codex-models.ts` |
| `src/plugin-processors/plugin-assemble-claude-bootstrap.ts` |
| `src/plugin-processors/plugin-assemble-cursor-bootstrap.ts` |
| `src/plugin-processors/plugin-assemble-copilot-bootstrap.ts` |
| `src/plugin-processors/plugin-assemble-codex-bootstrap.ts` |

### Deleted (1)
| File |
|------|
| `src/plugin-processors/plugin-assemble-bootstrap.ts` |

---

## 7. Testing Strategy

### Deleted Tests (2)
- `tests/unit/file-processors/file-normalize-models.test.ts`
- `tests/unit/plugin-processors/plugin-assemble-bootstrap.test.ts`

### New Unit Tests (9)

#### `tests/unit/file-processors/file-normalize-shared-helpers.test.ts`
Tests `extractFrontmatterModelField`, `applyModelRewrite`, `removeModelLine`, `rewriteCodexModelFields`.

Key assertions:
- `extractFrontmatterModelField`: content with model → value string; no frontmatter → null; frontmatter no model → null; leading blank lines before `---` → null; multi-value `claude-opus-4-6, gpt-4` → full string returned.
- `applyModelRewrite`: rewrites content and `source[0].frontmatter.model`; unchanged content → same frame instance returned.
- `removeModelLine`: strips `model:` line; no model line → content unchanged.
- `rewriteCodexModelFields`: `model: claude-sonnet-4-6` → `model: gpt-5.5\nmodel_reasoning_effort: high`; no model line → unchanged.

#### `tests/unit/file-processors/file-normalize-claude-models.test.ts`
- binary frame → same instance; null contents → same instance; no frontmatter → same instance; no model field → same instance; no claude-compatible token → same instance.
- Multi-token `gpt-4o, claude-sonnet-4-6`: scans ALL tokens, returns first claude-compatible → `'sonnet'`.
- `claude-opus-4-6` → `'opus'`; `claude-haiku-4-5` → `'haiku'`; `inherit` fallback.
- Verifies `source[0].frontmatter.model` updated.

#### `tests/unit/file-processors/file-normalize-cursor-models.test.ts`
- binary/null/no-model-field → same instance.
- `claude-opus-4-6` → CURSOR_CLAUDE_MAP lookup → cursor model name; `source[0].frontmatter.model` updated.
- `gpt-4o-high` → strip `-high` suffix → `gpt-4o`.
- Unknown token not in map → passthrough unchanged (normalizeCursor returns null → same instance).

#### `tests/unit/file-processors/file-normalize-copilot-models.test.ts`
- binary/null/no-model-field → same instance.
- `claude-opus-4-6` → `'Claude Opus 4.6'`; `source[0].frontmatter.model` updated.
- `gpt-4o` → `'GPT-4o'`.
- Unknown token → passthrough unchanged.

#### `tests/unit/file-processors/file-normalize-codex-models.test.ts`
- binary/null/no-model-field → same instance.
- No gpt token: `model: claude-opus-4-6` → model line stripped from content; `source[0].frontmatter.model` NOT updated (remains original).
- gpt token with effort: `model: gpt-5.5-high` → `model: gpt-5.5\nmodel_reasoning_effort: high`; `source[0].frontmatter.model` NOT updated.
- gpt token without effort: → `model_reasoning_effort: medium` (default).

#### `tests/unit/plugin-processors/plugin-assemble-claude-bootstrap.test.ts`
- `templateContext['bootstrap_hooks']` set; `templateContext['bootstrap_hooks_claude']` undefined.
- Entry shape contains `"once": true`, `"type": "command"`, `"hookSpecificOutput"`.
- Plugin-root entry is last; entries joined by `', '`.
- Entry > 10000 chars → soft error pushed to `frame.errors`.

#### `tests/unit/plugin-processors/plugin-assemble-codex-bootstrap.test.ts`
- `templateContext['bootstrap_hooks']` set; `bootstrap_hooks_codex` undefined.
- Entry shape contains `"statusMessage": "Loading Rosetta bootstrap"`, `"timeout": 30`; no `"once"`.
- Plugin-root contains `.agents/rules/bootstrap-rosetta-files.md` and `$workspace_root/.agents`.

#### `tests/unit/plugin-processors/plugin-assemble-copilot-bootstrap.test.ts`
- `templateContext['bootstrap_hooks']` set; `bootstrap_hooks_copilot` undefined.
- Entry shape contains `"bash"`, `"powershell"`; no `"once"`.
- Entry 0 bash contains `-0.lock` and `rosetta-bs-*.lock` (stale-lock cleanup).
- Entry 1 bash contains `-1.lock`; no stale-lock cleanup.
- Plugin-root lock index = count of doc entries.

#### `tests/unit/plugin-processors/plugin-assemble-cursor-bootstrap.test.ts`
- `templateContext['bootstrap_hooks']` defined and non-empty (Owner Rule 1: cursor ALWAYS generates full bootstrap).
- `bootstrap_hooks_cursor` undefined.
- Entry shape contains `"additional_context"`; NOT `"hookSpecificOutput"`.
- No `"once"`, no `"statusMessage"`, no `"bash"`, no `"powershell"`.
- Entry shape: `{"type": "command", "command": "..."}`.
- Plugin-root contains `CURSOR_PROJECT_DIR`.

### Unchanged Tests
- `tests/unit/model-maps.test.ts` — normalizer functions unchanged; `kind` field not accessed.
- `tests/unit/escaping/*.test.ts` — escaping logic unchanged.
- `tests/e2e/sample.e2e.test.ts`
- `tests/e2e/parity.e2e.test.ts`

---

## 8. Parity Verification Recipe

```bash
cd src/plugin-generator
S=/Users/isolomatov/Sources/GAIN/rosetta
rm -rf /tmp/g2 /tmp/g3
npx tsx src/cli.ts --release r2 --domain core --source "$S" --output /tmp/g2
diff -rq /tmp/g2 "$S/agents/TEMP/old-gen-r2"
npx tsx src/cli.ts --release r3 --domain core --source "$S" --output /tmp/g3
diff -rq /tmp/g3 "$S/agents/TEMP/old-gen-r3"
```

Expected: only accepted-bucket diffs (A, D, Decision 3, Task B). No new diffs.

Cursor parity: `hooks.json` remains `{"version":1,"hooks":{}}` (37 bytes) — template has no `{{{bootstrap_hooks}}}` placeholder. Payload is assembled in `templateContext['bootstrap_hooks']` but not injected.

---

## 9. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | `npx tsc --noEmit` reports zero errors |
| AC-2 | `npx vitest run` all tests pass (9 new, 2 deleted, net +7) |
| AC-3 | `ModelVocabulary` has no `kind` field; no references to `vocabulary.kind` anywhere |
| AC-4 | `PluginSpec` has no `hookEntryShape` field; no references to `spec.hookEntryShape` anywhere |
| AC-5 | No `switch` statement in `file-normalize-models.ts` |
| AC-6 | No `switch` statement in `bootstrap/payload.ts` |
| AC-7 | No `` `bootstrap_hooks_${...}` `` dynamic key anywhere |
| AC-8 | `plugin-assemble-bootstrap.ts` file does not exist |
| AC-9 | `fileNormalizeModels` function does not exist (only shared helpers remain) |
| AC-10 | All 3 `.tmpl` files use `{{{bootstrap_hooks}}}` (no per-IDE suffix) |
| AC-11 | Parity check produces only accepted-bucket diffs for r2 and r3 |
| AC-12 | Cursor `hooks.json` output = `{"version":1,"hooks":{}}` (37 bytes) |
| AC-13 | `templateContext['bootstrap_hooks']` is non-empty for cursor targets |

---

## 10. Assumptions

| # | Assumption |
|---|------------|
| A1 | `isStandalone` parameter in current `buildPipeline` is confirmed dead code (unused in body — verified by source read). Safe to remove. |
| A2 | Size check in `assembleBootstrapPayload` uses `buildHookPayloadJson` format for ALL IDEs including cursor. Cursor assembler ignores `_jsonPayload` and uses `buildCursorHookPayloadJson` for entry building. This inconsistency is intentional per CLEAN-ARCHITECTURE.md §C2 note. |
| A3 | Cursor template has no `{{{bootstrap_hooks}}}` placeholder. This is correct and no template change is needed. |
| A4 | `core-codex` `agents` entry uses `fileCodexAgentFormat`, not `fileNormalizeCodexModels`. No model normalization is added to the codex agents entry. |
| A5 | `buildRenamePairs` and `applyFolderRewrites` are re-exported from `payload.ts` to maintain backward compat for any callers. |
