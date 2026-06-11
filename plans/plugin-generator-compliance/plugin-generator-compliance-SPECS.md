# Plugin Generator Compliance Fixes — Technical Specifications

## Table of Contents

1. [TLDR & Overview](#tldr--overview)
2. [Requirements Traceability](#requirements-traceability)
3. [Architecture & Design](#architecture--design)
4. [Component Specifications](#component-specifications)
5. [API Contracts](#api-contracts)
6. [Testing Strategy](#testing-strategy)
7. [Non-Goals](#non-goals)
8. [Assumptions & Constraints](#assumptions--constraints)
9. [Technical Summary](#technical-summary)

---

## TLDR & Overview

**Scope:** Two compliance fixes for FR-ARCH-0005 and DATA-CFG-0002 violations in the TS plugin generator.

**Task #8 (IDE-name switches):** Eliminate three identity-branching sites by refactoring to composition architecture:
- Bootstrap payload assembly: replace `switch (hookEntryShape)` with per-IDE entry builder functions composed at spec declaration
- Model normalization: replace `switch (vocabulary.kind)` with per-vocabulary file processors composed into spec entries
- Bootstrap template keys: eliminate shape-derived keys, use per-IDE assemblers or fixed convention

**Task #17 (createHookFolderInR2):** Delete unbacked bespoke flag and conditional:
- Remove `createHookFolderInR2` field from types, specs, processor
- Accept absent empty r2 `.cursor/hooks/` as old-gen artifact removal

**Deliverable:** FR-ARCH-0005 compliance (composition over identity branching), DATA-CFG-0002 compliance (no bespoke per-target flags), zero parity regression except accepted old-gen artifact removal.

---

## Requirements Traceability

| Requirement | Priority | Status | Addressed By |
|-------------|----------|--------|--------------|
| **FR-ARCH-0005** | Must | Approved | Task #8: Eliminate all identity branching via composition patterns P0-P3 |
| **FR-ARCH-0004** | Must | Approved | Task #8: Universal processors (no IDE/target names), Task #17: Remove bespoke flag |
| **FR-ARCH-0002** | Must | Approved | Task #8: Per-case behavior selected by composed FileProcessors in SpecEntry |
| **DATA-CFG-0002** | Must | Approved | Task #17: Remove identity-discriminant flag from PluginSpec |
| **NFR-0001** | Must | Approved | Both: Preserve byte-for-byte parity except accepted Task #17 diff |
| **NFR-0006** | Must | Approved | Task #8: No release/content branching in engine |
| **NFR-0007** | Should | Approved | Task #8: SRP — per-vocabulary processors + shared helpers |

### Requirement Details

**FR-ARCH-0005:** No processor shall branch on IDE/target identity or identity-discriminant flags (`hookEntryShape`, `ModelVocabulary.kind`). Per-case variation by composition:
- **P0:** Each processor performs one small unit of work
- **P1:** Case-specific behavior → separate case-specific processor placed only in specs that need it
- **P2:** Shared logic → low-level reusable functions composed by case-specific processors
- **P3:** Path-specific behavior → SpecEntry source glob + processors

**FR-ARCH-0004:** Processors are universal and reusable. No specific target, IDE, release, folder, or filename encoded. Identity-discriminant flag = identity relabeled, prohibited.

**DATA-CFG-0002:** PluginSpec descriptor holds data, not identity-discriminant flags. Behavior differences expressed by processor composition.

**NFR-0001:** Byte-for-byte parity with old generator. Task #17 creates one accepted diff (absent empty r2 `.cursor/hooks/`).

---

## Architecture & Design

### Task #8: Composition Architecture

#### Current Violations

Three sites branch on identity or identity-discriminant flags:

1. **`bootstrap/payload.ts` (lines 188-226):** `switch (spec.hookEntryShape)` with cases `'claude'/'codex'/'copilot'` (default null = cursor)
   - Builds IDE-specific hook entry JSON formats
   - Applies IDE-specific shell escaping (printf wrapping, bash/powershell dual entries)
   - Helper functions already exist: `buildClaudeEntry()`, `buildCodexEntry()`, `buildCopilotEntry()`

2. **`file-processors/file-normalize-models.ts` (lines 41-106):** `switch (vocabulary.kind)` with cases `'claude'/'cursor'/'copilot'/'codex'`
   - Rewrites frontmatter `model:` field per IDE-specific vocabulary
   - Each case has genuinely different algorithm (token-scan / first-token+map / two-line split)
   - Normalizers already exist: `normalizeClaude()`, `normalizeCursor()`, `normalizeCopilot()`, `normalizeCodex()`

3. **`plugin-processors/plugin-assemble-bootstrap.ts` (line 19):** `` `bootstrap_hooks_${shape}` `` string interpolation
   - Derives template context key from `hookEntryShape`
   - Templates reference per-IDE keys: `{{{bootstrap_hooks_claude}}}`, `{{{bootstrap_hooks_codex}}}`, etc.

#### Target Architecture (P1 + P2 Composition)

**Model Normalization:** Per-vocabulary `FileProcessor` composed into each spec's SpecEntry pipelines
```
fileNormalizeClaudeModels(ctx) → calls normalizeClaude() helper
fileNormalizeCursorModels(ctx) → calls normalizeCursor() helper
fileNormalizeCopilotModels(ctx) → calls normalizeCopilot() helper
fileNormalizeCodexModels(ctx) → calls normalizeCodex() helper
```

**Bootstrap Assembly:** Per-IDE `PluginProcessor` composed into each spec's pluginProcessors pipeline
```
pluginAssembleClaudeBootstrap → calls buildClaudeEntry() helper, writes bootstrap_hooks_claude
pluginAssembleCursorBootstrap → size-check only, no template key (cursor skips delivery)
pluginAssembleCodexBootstrap → calls buildCodexEntry() helper, writes bootstrap_hooks_codex
pluginAssembleCopilotBootstrap → calls buildCopilotBashEntry/PsEntry, writes bootstrap_hooks_copilot
```

**Key Decisions:**

1. **Per-vocabulary file processors:** Each vocabulary gets its own small processor that composes the existing normalizer helper (P2)
2. **Per-IDE bootstrap assemblers:** Each IDE gets its own plugin processor that composes existing entry builder helpers (P2)
3. **Keep per-IDE template keys:** `bootstrap_hooks_claude`, etc. remain unchanged (no template modifications needed)
4. **Remove enums:** Delete `hookEntryShape` and `ModelVocabulary.kind` from types; vocabulary selection implicit in which processor is composed

---

### Task #17: Flag Deletion

#### Current Implementation

**Type:** `types.ts:124`
```typescript
createHookFolderInR2?: boolean;
```

**Spec declarations:** 5× `true`, 1× `false` (core-codex)

**Consumer:** `plugin-sync-bundles.ts:86-88` — creates empty folder in r2

#### Value Proposition

**ZERO functional value:**
- Only unique artifact: empty r2 `core-cursor-standalone/.cursor/hooks/`
- Other 4 `true` targets: folders populated by `hooks.json` (flag redundant)
- Cursor IDE: empty = absent (no hooks found either way)
- No FR requirement backs it
- Origin: baseline-overfit artifact, not requirements-driven

#### Target State

**Remove entirely:**
- Delete field from `types.ts`
- Delete 6 spec declarations from `spec/targets.ts`
- Delete conditional from `plugin-sync-bundles.ts`
- r2: removes stale `.js` if folder exists (no mkdir)
- r3: unchanged (creates folder before bundle copy)

**Parity impact:** One accepted diff (absent empty r2 `.cursor/hooks/`)

---

## Component Specifications

### Task #8: New File Processors

**Pattern:** Each processor guards on null/binary, applies normalizer via shared helper, returns same frame if unchanged

`file-normalize-claude-models.ts`:
```typescript
export function fileNormalizeClaudeModels(ctx: ProcessorContext): FileProcessingFrame {
  if (!ctx.frame.target_contents || ctx.frame.isBinary) return ctx.frame;
  return updateFrontmatterField(ctx.frame, 'model', normalizeClaude);
}
```

`file-normalize-cursor-models.ts`: Same pattern, uses `normalizeCursor`
`file-normalize-copilot-models.ts`: Same pattern, uses `normalizeCopilot`
`file-normalize-codex-models.ts`: Two-field pattern, uses `normalizeCodex` returning `{model, effort}`

### Task #8: New Plugin Processors

**Pattern:** Read bootstrap frames from manifest, call entry builder helper, assemble payload, size-check (NFR-0004), write to templateContext

`plugin-assemble-claude-bootstrap.ts`:
```typescript
export function pluginAssembleClaudeBootstrap(ctx: PluginProcessorContext): PluginProcessingFrame {
  const frames = getBootstrapFrames(ctx.frames, ctx.spec.bootstrapManifest);
  const entries = frames.map(f => buildClaudeEntry(f.target_contents, PREFIX));
  const { payload, violations } = assemblePayload(entries);
  reportViolations(violations);
  return { ...ctx, templateContext: { ...ctx.templateContext, bootstrap_hooks_claude: payload } };
}
```

`plugin-assemble-cursor-bootstrap.ts`: Size-check only, no templateContext write (cursor skips delivery)
`plugin-assemble-codex-bootstrap.ts`: Uses `buildCodexEntry`, writes `bootstrap_hooks_codex`
`plugin-assemble-copilot-bootstrap.ts`: Uses dual builders, writes `bootstrap_hooks_copilot`

### Task #8: Shared P2 Helpers (New)

`frontmatter-helpers.ts`:
```typescript
function updateFrontmatterField(
  frame: FileProcessingFrame,
  field: string,
  normalizerFn: (value: string) => string | null
): FileProcessingFrame;
```

`bootstrap/assembly-helpers.ts`:
```typescript
function assembleBootstrapPayload(
  entries: string[],
  prefix: string
): { payload: string; violations: BootstrapSizeViolation[] };
```

### Task #8: Type Changes

**`types.ts` (REMOVE):**
- Line 94: `hookEntryShape?: 'claude' | 'codex' | 'copilot' | null;`
- Line 80: `kind: 'claude' | 'cursor' | 'copilot' | 'codex';` from `ModelVocabulary`

**`types.ts` (KEEP):**
- `ModelVocabulary.map` field (genuine data, not discriminant)

### Task #8: Spec Composition Changes

**For each of 6 specs in `spec/targets.ts`:**

1. **Delete fields:**
   - `hookEntryShape: 'claude' | ...`
   - `modelVocabulary.kind` (keep `map`)

2. **Add per-vocabulary processor to SpecEntry pipelines:**
```typescript
processors: [
  fileRead,
  fileApplyOverrides,
  fileBundle,
  fileNormalizeClaudeModels,  // ← case-specific, per spec
  fileRename(/* ... */),
]
```

3. **Replace bootstrap assembler in pluginProcessors:**
```typescript
pluginProcessors: [
  /* ... */
  pluginAssembleClaudeBootstrap,  // ← replaces pluginAssembleBootstrap
  pluginRenderTemplates,
  /* ... */
]
```

**Mappings:**
- core-claude → `fileNormalizeClaudeModels` + `pluginAssembleClaudeBootstrap`
- core-cursor → `fileNormalizeCursorModels` + `pluginAssembleCursorBootstrap`
- core-copilot → `fileNormalizeCopilotModels` + `pluginAssembleCopilotBootstrap`
- core-codex → `fileNormalizeCodexModels` + `pluginAssembleCodexBootstrap`
- core-cursor-standalone → same as core-cursor
- core-copilot-standalone → same as core-copilot

### Task #8: Deletions

- `file-processors/file-normalize-models.ts` (entire file)
- `plugin-processors/plugin-assemble-bootstrap.ts` (entire file)
- `bootstrap/payload.ts` functions: `buildEntryForIde()`, `buildPluginRootEntry()` (keep helpers)

### Task #17: Deletions

- `types.ts:124` — delete `createHookFolderInR2?: boolean;`
- `spec/targets.ts` — delete 6 field declarations
- `plugin-sync-bundles.ts:86-88` — delete conditional block

---

## API Contracts

### FileProcessor Signature (unchanged)
```typescript
type FileProcessor = (ctx: ProcessorContext) => FileProcessingFrame;
```

### PluginProcessor Signature (unchanged)
```typescript
type PluginProcessor = (ctx: PluginProcessorContext) => PluginProcessingFrame;
```

### New Shared Helpers

**Frontmatter:**
```typescript
function updateFrontmatterField(
  frame: FileProcessingFrame,
  field: string,
  normalizerFn: (value: string) => string | null
): FileProcessingFrame;
```

**Bootstrap Assembly:**
```typescript
function assembleBootstrapPayload(
  entries: string[],
  prefix: string
): { payload: string; violations: BootstrapSizeViolation[] };

interface BootstrapSizeViolation {
  target: string;
  file: string;
  size: number;
}
```

### Existing Helpers (Reused, Unchanged)

**Model normalizers (`spec/model-maps.ts`):**
```typescript
function normalizeClaude(modelField: string): string | null;
function normalizeCursor(modelField: string): string | null;
function normalizeCopilot(modelField: string): string | null;
function normalizeCodex(modelField: string): CodexModelResult | null;
```

**Bootstrap entry builders (`bootstrap/payload.ts`):**
```typescript
function buildClaudeEntry(content: string, prefix: string): string;
function buildCodexEntry(content: string, prefix: string): string;
function buildCopilotBashEntry(content: string, prefix: string): string;
function buildCopilotPowershellEntry(content: string, prefix: string): string;
```

---

## Testing Strategy

### Task #8: Unit Tests (New)

**Per-vocabulary model normalization tests (4 files):**
- `tests/unit/file-processors/file-normalize-claude-models.test.ts`
  - Input: `model: opus-4.6, sonnet-4.5` → Expected: `model: opus`
  - Input: no model field → Expected: unchanged frame (same instance)
  - Input: binary frame → Expected: unchanged
  
- `tests/unit/file-processors/file-normalize-cursor-models.test.ts`
  - Input: `model: claude-opus-latest` → Expected: `model: claude-opus`
  - Input: `model: claude-sonnet-4-5-medium` → Expected: `model: claude-sonnet-4-5` (strip effort)

- `tests/unit/file-processors/file-normalize-copilot-models.test.ts`
  - Input: `model: opus` → Expected: `model: Claude Opus 4.6`

- `tests/unit/file-processors/file-normalize-codex-models.test.ts`
  - Input: `model: gpt-4.6-medium` → Expected: `model: gpt-4.6`, `model_reasoning_effort: medium`

**Per-IDE bootstrap assembly tests (4 files):**
- `tests/unit/plugin-processors/plugin-assemble-claude-bootstrap.test.ts`
  - Verify `templateContext['bootstrap_hooks_claude']` contains JSON array
  - Verify printf escaping applied
  - Verify entry shape: `{"type": "command", "command": "...", "once": true}`

- `tests/unit/plugin-processors/plugin-assemble-cursor-bootstrap.test.ts`
  - Verify NO `bootstrap_hooks_cursor` key in templateContext
  - Verify size-check still runs

- `tests/unit/plugin-processors/plugin-assemble-codex-bootstrap.test.ts`
  - Verify `bootstrap_hooks_codex` key
  - Verify no printf wrapping

- `tests/unit/plugin-processors/plugin-assemble-copilot-bootstrap.test.ts`
  - Verify `bootstrap_hooks_copilot` key
  - Verify dual-shell format (bash + windows_command)

**Updated tests:**
- `tests/unit/bootstrap/payload.test.ts` — remove deleted function tests, keep helper tests
- `tests/e2e/parity.test.ts` — verify r2=12, r3=22 unchanged, byte-for-byte bootstrap payloads

**Deleted tests:**
- `tests/unit/file-processors/file-normalize-models.test.ts`
- `tests/unit/plugin-processors/plugin-assemble-bootstrap.test.ts`

### Task #17: Unit Tests (Updated)

- `tests/unit/plugin-processors/plugin-sync-bundles.test.ts`
  - Remove `createHookFolderInR2` test cases
  - Verify r2: no mkdir, removes stale `.js` if folder exists
  - Verify r3: creates folder before copy

- `tests/e2e/parity.test.ts`
  - Verify r2=13 (one new diff: absent `.cursor/hooks/`)
  - Verify r3=22 unchanged
  - Document accepted diff: `Only in old-gen-r2/core-cursor-standalone/.cursor: hooks`

### Test Data Examples

**Model normalization:**
```typescript
// Claude: scan for first claude token
{ input: 'opus-4.6, sonnet-4.5', expected: 'opus' }
{ input: 'gpt-4', expected: null }

// Cursor: first token + map + strip effort
{ input: 'claude-opus-latest', expected: 'claude-opus' }
{ input: 'claude-sonnet-4-5-medium', expected: 'claude-sonnet-4-5' }

// Copilot: display map
{ input: 'opus', expected: 'Claude Opus 4.6' }

// Codex: two-field split
{ input: 'gpt-4.6-medium', expected: { model: 'gpt-4.6', effort: 'medium' } }
{ input: 'gpt-4.6', expected: { model: 'gpt-4.6', effort: null } }
```

**Bootstrap entry shapes:**
```json
// Claude
{"type": "command", "command": "printf '%s' 'npx tsx /path/to/script.ts'", "once": true}

// Codex (no printf)
{"type": "command", "command": "npx tsx /path/to/script.ts", "once": true}

// Copilot (dual-shell)
{"command": "printf '%s' 'npx tsx /path/to/script.ts'", "windows_command": "powershell -Command \"npx tsx /path/to/script.ts\""}
```

---

## Non-Goals

**Task #8:**
- Template file changes (placeholders exist, no modifications)
- Changing existing helper functions (reuse as-is)
- Optimizing normalization algorithms (preserve exact behavior)
- Changing VFS/frame structure

**Task #17:**
- Regenerating parity baseline (accept new diff)
- Changing r3 folder creation (already correct)
- Auditing other bespoke flags (out of scope)

---

## Assumptions & Constraints

### Assumptions

1. Existing helpers (`normalizeClaude()`, `buildClaudeEntry()`, etc.) produce correct output
2. Template placeholders (`{{{bootstrap_hooks_claude}}}`) are stable
3. Test coverage baseline: 304 tests pass; new tests increase count
4. All 6 specs need identical refactoring pattern

### Constraints

1. **Requirements FROZEN:** No changes without owner approval
2. **Parity preservation (NFR-0001):**
   - Task #8: maintain r2=12, r3=22 diff counts
   - Task #17: accept r2=13 (one new diff)
3. **Zero-tolerance quality:**
   - All tests must pass
   - `npx tsc --noEmit` clean
   - Exit codes: r2 exit 1 (1 violation), r3 exit 1 (5 violations)
4. **No autonomous decisions:** STOP and ASK on ambiguity
5. **Model normalization correctness:** Genuinely different algorithms per vocabulary

### Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Bootstrap payload parity break | Reuse existing escaping helpers; byte-for-byte tests |
| Model normalization regression | Extensive unit tests; baseline comparison |
| Composition pattern incorrect | Follow `fileCodexAgentFormat` pattern; reviewer gate |
| Template placeholders break | Keep per-IDE keys; no template changes |
| Empty folder dependency (Task #17) | Verify no path existence checks |

---

## Technical Summary

### Files Affected

**Task #8 (19 files total):**

**New (9):**
- `src/plugin-generator/src/file-processors/file-normalize-{claude,cursor,copilot,codex}-models.ts` (4)
- `src/plugin-generator/src/plugin-processors/plugin-assemble-{claude,cursor,codex,copilot}-bootstrap.ts` (4)
- `src/plugin-generator/src/file-processors/frontmatter-helpers.ts` (1)

**Modified (3):**
- `src/plugin-generator/src/types.ts`
- `src/plugin-generator/src/spec/targets.ts`
- `src/plugin-generator/src/bootstrap/payload.ts`

**Deleted (2):**
- `src/plugin-generator/src/file-processors/file-normalize-models.ts`
- `src/plugin-generator/src/plugin-processors/plugin-assemble-bootstrap.ts`

**Tests (10):**
- New: 8 unit test files
- Updated: 2 files (`payload.test.ts`, `parity.test.ts`)
- Deleted: 2 files

**Task #17 (5 files total):**

**Modified (3):**
- `src/plugin-generator/src/types.ts`
- `src/plugin-generator/src/spec/targets.ts`
- `src/plugin-generator/src/plugin-processors/plugin-sync-bundles.ts`

**Tests (2):**
- Updated: `plugin-sync-bundles.test.ts`, `parity.test.ts`

### Complexity

| Task | LOC Added | LOC Deleted | LOC Modified | Risk |
|------|-----------|-------------|--------------|------|
| Task #8 | ~600 | ~250 | ~150 | MEDIUM |
| Task #17 | 0 | ~10 | ~5 | LOW |

### Dependencies

**Task #8:** Existing helpers in `model-maps.ts`, `bootstrap/payload.ts`, `escaping/`, template files
**Task #17:** None

**No inter-task dependencies** — can be implemented in parallel or sequentially.

---

