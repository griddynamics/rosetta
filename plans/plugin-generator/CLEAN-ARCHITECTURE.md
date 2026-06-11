# plugin-generator — Clean Architecture Implementation Guide

## Current State

`tsc` clean. 303 tests pass / 31 files. Two identity-switch violations remain in Task C scope. All other completed work (dead field removals, parity buckets, FR-CLI/FR-VAR/FR-ARCH compliance) is stable.

Key file locations (all paths relative to repo root):

- `src/plugin-generator/src/types.ts` — domain types; identity-discriminant fields `ModelVocabulary.kind` and `PluginSpec.hookEntryShape` still present
- `src/plugin-generator/src/file-processors/file-normalize-models.ts` — switch dispatcher to be decomposed
- `src/plugin-generator/src/plugin-processors/plugin-assemble-bootstrap.ts` — per-IDE key interpolation violation
- `src/plugin-generator/src/bootstrap/payload.ts` — IDE switch functions to be replaced by callbacks
- `src/plugin-generator/src/spec/model-maps.ts` — vocabulary constants with `kind` field
- `src/plugin-generator/src/spec/targets.ts` — all 6 specs; helper function signatures using `typeof fileNormalizeModels`; `hookEntryShape` on every spec
- `src/plugin-generator/src/spec/bootstrap-manifest.ts` — CLAUDE/CODEX/COPILOT constants; cursor constants missing
- `src/plugin-generator/src/escaping/json-string.ts` — cursor payload builder missing
- `src/plugin-generator/src/frames.ts` — `updateFileFrame`, `updatePluginFrame` (no changes needed)
- Template files with wrong per-IDE placeholder keys:
  - `src/plugin-generator/plugins/core-claude/hooks/hooks.json.tmpl` line 6
  - `src/plugin-generator/plugins/core-codex/.codex-plugin/hooks.json.tmpl` line 6
  - `src/plugin-generator/plugins/core-copilot/.github/plugin/hooks.json.tmpl` line 4

---

## Parity Baseline

Baseline at `agents/TEMP/old-gen-r2/` and `agents/TEMP/old-gen-r3/` (Python v2.0.42).

Accepted diff buckets (locked, owner decisions):
- **Bucket A**: `agents/X.md` → `agents/X.agent.md` (~6 r2, ~6 r3). New-gen correct per FR-ARCH-0049; old-gen BUG.
- **Bucket D**: old-gen double-applied `commands/` → `prompts/` rename (~6 r2, ~5 r3). Old-gen BUG; new-gen correct.
- **Decision 3**: `plugin-files-mode.md` content changed after baseline creation. Cascades to 6x plugin-files-mode + 5x hooks.json. Do NOT regenerate baseline.
- **Task B**: `core-cursor-standalone/.cursor/hooks` empty dir absent. Accepted.

After Task C, cursor `hooks.json` still renders to `{"version":1,"hooks":{}}` (37 bytes) because cursor template has no `{{{bootstrap_hooks}}}` placeholder. The generator assembles a full cursor bootstrap payload but the template does not inject it. Parity bytes: unchanged.

Entry counts (r2/r3): claude 9/8, codex 9/8, copilot 9/8, cursor generates full payload (not injected). Count = present bootstrap-manifest documents + 1 plugin-root entry.

Parity check recipe:
```bash
cd src/plugin-generator
S=/Users/isolomatov/Sources/GAIN/rosetta
rm -rf /tmp/g2 /tmp/g3
npx tsx src/cli.ts --release r2 --domain core --source "$S" --output /tmp/g2
diff -rq /tmp/g2 "$S/agents/TEMP/old-gen-r2"
npx tsx src/cli.ts --release r3 --domain core --source "$S" --output /tmp/g3
diff -rq /tmp/g3 "$S/agents/TEMP/old-gen-r3"
```

---

## Violation Sites

| ID | File | Line | Violation |
|----|------|------|-----------|
| C1 | `src/plugin-generator/src/file-processors/file-normalize-models.ts` | 41 | `switch (vocabulary.kind)` on `'claude'/'cursor'/'copilot'/'codex'` — FR-ARCH-0005 P1 |
| C2a | `src/plugin-generator/src/bootstrap/payload.ts` | 188 | `switch (shape)` in `buildEntryForIde`; `default: return null` drops cursor entries — FR-ARCH-0005 P1 + FR-HOOK-0007 wrong |
| C2b | `src/plugin-generator/src/plugin-processors/plugin-assemble-bootstrap.ts` | 19 | `` `bootstrap_hooks_${shape}` `` interpolation — FR-ARCH-0005 P1; must be `'bootstrap_hooks'` (one key) |
| C3 | `src/plugin-generator/src/types.ts` | 80 | `ModelVocabulary.kind: 'claude' | 'cursor' | 'copilot' | 'codex'` — identity-discriminant field, remove |
| C4 | `src/plugin-generator/src/types.ts` | 93 | `PluginSpec.hookEntryShape: 'claude' | 'copilot' | 'codex' | 'cursor'` — identity-discriminant field, remove |

---

## C1 — Model Normalization Refactor

### Changes to `src/plugin-generator/src/file-processors/file-normalize-models.ts`

Export the four previously-private helpers and the pre-dispatch logic as a shared utility function. Delete the `fileNormalizeModels` switch dispatcher (Step 8 of implementation — after per-vocabulary processors are wired into `targets.ts`).

**Full file content after all C1 changes (Step 8 — final state):**

```typescript
// FR-ARCH-0046, FR-COPY-0020–0022 — shared helpers for per-vocabulary model normalization
// fileNormalizeModels dispatcher DELETED (FR-ARCH-0005); replaced by 4 per-vocabulary processors.

import { updateFileFrame } from '../frames.js';
import { rewriteModelLine } from '../serialize/frontmatter.js';
import type { FileProcessingFrame } from '../types.js';

/**
 * Extract the model field value from a file's frontmatter.
 * Returns null if: no frontmatter, no model line, or not a YAML-frontmatter file.
 * Shared by all 4 per-vocabulary model-normalization processors.
 * FR-ARCH-0046
 */
export function extractFrontmatterModelField(content: string): string | null {
  if (!content.trimStart().startsWith('---')) return null;
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const modelLineMatch = fmMatch[1].match(/^model:\s*(.+)$/m);
  if (!modelLineMatch) return null;
  return modelLineMatch[1].trim();
}

/**
 * Apply a normalized model value to a frame: rewrite the model: line in content
 * and update source[0].frontmatter.model.
 * Returns input frame unchanged when content would not change.
 * FR-ARCH-0046
 */
export function applyModelRewrite(frame: FileProcessingFrame, normalizedModel: string): FileProcessingFrame {
  const content = frame.target_contents as string;
  const newContent = rewriteModelLine(content, normalizedModel);
  if (newContent === content) return frame;
  return updateFileFrame(frame, (draft) => {
    draft.target_contents = newContent;
    if (draft.source[0]?.frontmatter) {
      draft.source[0].frontmatter!.model = normalizedModel;
    }
  });
}

/**
 * Remove the model: line (and model_reasoning_effort: if present) from frontmatter.
 * Used for codex when model field has no gpt-* token.
 * FR-ARCH-0046
 */
export function removeModelLine(content: string): string {
  const fmMatch = content.match(/^(---\n)([\s\S]*?)(\n---)([\s\S]*)$/);
  if (!fmMatch) return content;
  const [, openDelim, yamlBody, closeDelim, rest] = fmMatch;
  const newYaml = yamlBody
    .replace(/^model:\s*.+\n?/m, '')
    .replace(/^model_reasoning_effort:\s*.+\n?/m, '');
  if (newYaml === yamlBody) return content;
  return openDelim + newYaml + closeDelim + rest;
}

/**
 * Rewrite frontmatter model field into two YAML fields for codex.
 * Replaces "model: <old>" with "model: <gptModel>\nmodel_reasoning_effort: <effort>".
 * frontmatter.model is NOT updated (two-field replacement, not a single-value rewrite).
 * FR-ARCH-0046
 */
export function rewriteCodexModelFields(content: string, gptModel: string, effort: string): string {
  const fmMatch = content.match(/^(---\n)([\s\S]*?)(\n---)([\s\S]*)$/);
  if (!fmMatch) return content;
  const [, openDelim, yamlBody, closeDelim, rest] = fmMatch;
  const newYaml = yamlBody.replace(
    /^(model:\s*)(.+)$/m,
    `$1${gptModel}\nmodel_reasoning_effort: ${effort}`,
  );
  if (newYaml === yamlBody) return content;
  return openDelim + newYaml + closeDelim + rest;
}
```

### New file: `src/plugin-generator/src/file-processors/file-normalize-claude-models.ts`

```typescript
// FR-ARCH-0046, FR-COPY-0021 — claude model-normalization case-specific processor
// Scans for first claude-compatible token (NOT first overall — PARITY-9).

import { normalizeClaude } from '../spec/model-maps.js';
import { extractFrontmatterModelField, applyModelRewrite } from './file-normalize-models.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * fileNormalizeClaudeModels: rewrite frontmatter model: to Claude short-name vocabulary.
 * Scans all comma-split tokens for first claude-compatible one.
 * No model field → unchanged. Binary or null contents → unchanged.
 * FR-ARCH-0046, FR-ARCH-0005
 */
export function fileNormalizeClaudeModels(
  frame: FileProcessingFrame,
  _ctx: TargetContext,
): FileProcessingFrame {
  if (frame.isBinary || frame.target_contents === null) return frame;
  const modelField = extractFrontmatterModelField(frame.target_contents as string);
  if (!modelField) return frame;
  const normalized = normalizeClaude(modelField);
  if (!normalized) return frame;
  return applyModelRewrite(frame, normalized);
}
```

### New file: `src/plugin-generator/src/file-processors/file-normalize-cursor-models.ts`

```typescript
// FR-ARCH-0046, FR-COPY-0021 — cursor model-normalization case-specific processor
// First token via CURSOR_CLAUDE_MAP (or passthrough for unknown).

import { normalizeCursor } from '../spec/model-maps.js';
import { extractFrontmatterModelField, applyModelRewrite } from './file-normalize-models.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * fileNormalizeCursorModels: rewrite frontmatter model: to Cursor model vocabulary.
 * Maps first comma-split token via CURSOR_CLAUDE_MAP; strips -effort suffix on gpt tokens.
 * No model field → unchanged. Binary or null contents → unchanged.
 * FR-ARCH-0046, FR-ARCH-0005
 */
export function fileNormalizeCursorModels(
  frame: FileProcessingFrame,
  _ctx: TargetContext,
): FileProcessingFrame {
  if (frame.isBinary || frame.target_contents === null) return frame;
  const modelField = extractFrontmatterModelField(frame.target_contents as string);
  if (!modelField) return frame;
  const normalized = normalizeCursor(modelField);
  if (!normalized) return frame;
  return applyModelRewrite(frame, normalized);
}
```

### New file: `src/plugin-generator/src/file-processors/file-normalize-copilot-models.ts`

```typescript
// FR-ARCH-0046, FR-COPY-0021 — copilot model-normalization case-specific processor
// First token mapped to display name via COPILOT_CLAUDE_MAP / COPILOT_GPT_MAP.

import { normalizeCopilot } from '../spec/model-maps.js';
import { extractFrontmatterModelField, applyModelRewrite } from './file-normalize-models.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * fileNormalizeCopilotModels: rewrite frontmatter model: to Copilot display-name vocabulary.
 * Maps first comma-split token to display name (e.g. "Claude Opus 4.6").
 * No model field → unchanged. Binary or null contents → unchanged.
 * FR-ARCH-0046, FR-ARCH-0005
 */
export function fileNormalizeCopilotModels(
  frame: FileProcessingFrame,
  _ctx: TargetContext,
): FileProcessingFrame {
  if (frame.isBinary || frame.target_contents === null) return frame;
  const modelField = extractFrontmatterModelField(frame.target_contents as string);
  if (!modelField) return frame;
  const normalized = normalizeCopilot(modelField);
  if (!normalized) return frame;
  return applyModelRewrite(frame, normalized);
}
```

### New file: `src/plugin-generator/src/file-processors/file-normalize-codex-models.ts`

```typescript
// FR-ARCH-0046, FR-COPY-0022 — codex model-normalization case-specific processor
// Unique behavior: no gpt token → strip model line; gpt token → two-field rewrite.
// frontmatter.model NOT updated in either branch (field removed or split into two lines).

import { normalizeCodex } from '../spec/model-maps.js';
import {
  extractFrontmatterModelField,
  removeModelLine,
  rewriteCodexModelFields,
} from './file-normalize-models.js';
import { updateFileFrame } from '../frames.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * fileNormalizeCodexModels: rewrite frontmatter model: for codex markdown files.
 * If no gpt-* token found: strip the model: line entirely.
 * If gpt-* token found: replace "model: <old>" with "model: <gpt>\nmodel_reasoning_effort: <effort>".
 * frontmatter.model is NOT updated (field removed or becomes two fields).
 * Binary or null contents → unchanged. No model field → unchanged.
 * FR-ARCH-0046, FR-ARCH-0005
 */
export function fileNormalizeCodexModels(
  frame: FileProcessingFrame,
  _ctx: TargetContext,
): FileProcessingFrame {
  if (frame.isBinary || frame.target_contents === null) return frame;
  const content = frame.target_contents as string;
  const modelField = extractFrontmatterModelField(content);
  if (!modelField) return frame;
  const codexModel = normalizeCodex(modelField);
  if (!codexModel) {
    // No gpt token found → strip the model: line from frontmatter
    const newContent = removeModelLine(content);
    if (newContent === content) return frame;
    return updateFileFrame(frame, (draft) => {
      draft.target_contents = newContent;
      // frontmatter.model NOT updated — field being removed, not rewritten
    });
  }
  // gpt token found → two-field replacement
  const newContent = rewriteCodexModelFields(content, codexModel.model, codexModel.effort);
  if (newContent === content) return frame;
  return updateFileFrame(frame, (draft) => {
    draft.target_contents = newContent;
    // frontmatter.model NOT updated — two-field replacement, not a single value
  });
}
```

---

## C2 — Bootstrap Assembler Refactor

### Changes to `src/plugin-generator/src/types.ts`

**Before (lines 79–82):**
```typescript
// DATA-CFG-0004
export interface ModelVocabulary {
  kind: 'claude' | 'cursor' | 'copilot' | 'codex';
  map: Record<string, string>; // logical key → IDE-specific value
}
```

**After:**
```typescript
// DATA-CFG-0004
export interface ModelVocabulary {
  map: Record<string, string>; // logical key → IDE-specific value
}
```

**Before (line 93 in `PluginSpec`):**
```typescript
  hookEntryShape: 'claude' | 'copilot' | 'codex' | 'cursor';
```

**After:** Delete this line entirely. `hookEntryShape` is removed from `PluginSpec`.

### Changes to `src/plugin-generator/src/spec/model-maps.ts`

Remove `kind` from all 4 vocabulary constant objects.

**Before:**
```typescript
export const CLAUDE_VOCABULARY: ModelVocabulary = {
  kind: 'claude',
  map: {}, // not used directly; normalizeClaude() is the function
};

export const CURSOR_VOCABULARY: ModelVocabulary = {
  kind: 'cursor',
  map: CURSOR_CLAUDE_MAP,
};

export const COPILOT_VOCABULARY: ModelVocabulary = {
  kind: 'copilot',
  map: COPILOT_CLAUDE_MAP,
};

export const CODEX_VOCABULARY: ModelVocabulary = {
  kind: 'codex',
  map: {}, // not a simple map; normalizeCodex() handles the logic
};
```

**After:**
```typescript
export const CLAUDE_VOCABULARY: ModelVocabulary = {
  map: {}, // not used directly; normalizeClaude() is the function
};

export const CURSOR_VOCABULARY: ModelVocabulary = {
  map: CURSOR_CLAUDE_MAP,
};

export const COPILOT_VOCABULARY: ModelVocabulary = {
  map: COPILOT_CLAUDE_MAP,
};

export const CODEX_VOCABULARY: ModelVocabulary = {
  map: {}, // not a simple map; normalizeCodex() handles the logic
};
```

### Changes to `src/plugin-generator/src/escaping/json-string.ts`

Append the following export to the existing file (after `buildHookPayloadJson`):

```typescript
/**
 * Build the compact JSON payload object for a cursor hook entry.
 * Cursor uses {"additional_context":"<body>"} — NOT {"hookSpecificOutput":...}.
 * GT-3 cursor entry shape.
 */
export function buildCursorHookPayloadJson(body: string): string {
  const escaped = jsonStringEscape(body);
  return `{"additional_context":"${escaped}"}`;
}
```

### Changes to `src/plugin-generator/src/spec/bootstrap-manifest.ts`

Append the following export to the existing file (after `COPILOT_PLUGIN_ROOT_POWERSHELL`):

```typescript
/**
 * The cursor plugin-root entry command.
 * Uses double-quoted printf for env var expansion; additional_context shape (NOT hookSpecificOutput).
 * GT-3.4 cursor variant.
 */
export const CURSOR_PLUGIN_ROOT_ENTRY = {
  command: `printf '{"additional_context":"Rosetta Plugin Path: %s"}' "\${CURSOR_PROJECT_DIR}"`,
};
```

### Changes to `src/plugin-generator/src/bootstrap/payload.ts`

**Full file content after all C2 changes:**

```typescript
// FR-HOOK-0001-0009, NFR-0004 — bootstrap payload assembly
// GT-2, GT-3 — per-IDE entry shapes, prefix on lead, absent→skip
// FR-ARCH-0005: switch functions removed; IDE-specific behavior supplied via callbacks.

import { buildHookPayloadJson } from '../escaping/json-string.js';
import { wrapInPrintf } from '../escaping/shell.js';
import { buildCopilotBashEntry, buildCopilotPowershellEntry } from './copilot-lock.js';
import {
  BOOTSTRAP_PREFIX,
  BOOTSTRAP_MANIFEST_ORDER,
} from '../spec/bootstrap-manifest.js';
import { stripFrontmatter } from '../serialize/frontmatter.js';
import { applyFolderRewrites, buildRenamePairs } from '../plugin-processors/plugin-rewrite-references.js';
import type { FileProcessingFrame, GenError, PluginProcessingFrame } from '../types.js';

export { buildHookPayloadJson, wrapInPrintf, buildCopilotBashEntry, buildCopilotPowershellEntry, applyFolderRewrites };

const MAX_ENTRY_CHARS = 10000; // NFR-0004

/**
 * Build a claude hook entry JSON object (compact, with spaces after : and ,).
 * GT-3.1: {"type": "command", "command": "...", "once": true}
 */
export function buildClaudeBootstrapEntry(command: string): string {
  return `{"type": "command", "command": ${JSON.stringify(command)}, "once": true}`;
}

/**
 * Build a codex hook entry JSON object.
 * GT-3.2: {"type": "command", "command": "...", "statusMessage": "Loading Rosetta bootstrap", "timeout": 30}
 */
export function buildCodexBootstrapEntry(command: string): string {
  return `{"type": "command", "command": ${JSON.stringify(command)}, "statusMessage": "Loading Rosetta bootstrap", "timeout": 30}`;
}

/**
 * Build a copilot hook entry JSON object.
 * GT-3.3: {"type": "command", "bash": "...", "powershell": "..."}
 */
export function buildCopilotBootstrapEntry(bash: string, powershell: string): string {
  return `{"type": "command", "bash": ${JSON.stringify(bash)}, "powershell": ${JSON.stringify(powershell)}}`;
}

/**
 * Build a cursor hook entry JSON object.
 * GT-3 cursor: {"type": "command", "command": "..."} — no once, no statusMessage, no bash/powershell.
 */
export function buildCursorBootstrapEntry(command: string): string {
  return `{"type": "command", "command": ${JSON.stringify(command)}}`;
}

/**
 * Callback type for building one per-document bootstrap entry.
 * additionalContext: the rewritten body string (prefix-prepended for lead, folder-rewritten).
 * jsonPayload: the already-built inner JSON payload string (IDE-specific format).
 * lockIndex: 0-based index of this entry in the payload (for per-entry guards like copilot lock).
 * Returns the entry JSON object string, or null to skip this entry.
 * FR-ARCH-0005: IDE-specific entry shape supplied by caller, not derived here.
 */
export type EntryBuilderFn = (
  additionalContext: string,
  jsonPayload: string,
  lockIndex: number,
) => string | null;

/**
 * Callback type for building the plugin-root path entry (always the final entry).
 * lockIndex: total number of doc entries emitted before this (= final doc entry index for copilot).
 * folderPairs: rename pairs for reference-rewriting the plugin-root command string.
 * Returns the entry JSON object string, or null to omit the plugin-root entry.
 * FR-HOOK-0007
 */
export type RootEntryBuilderFn = (
  lockIndex: number,
  folderPairs: Array<[string, string]>,
) => string | null;

/**
 * Assemble the bootstrap payload string for a target.
 * Returns the string to inject as {{{bootstrap_hooks}}} plus any soft errors.
 * IDE-specific behavior (entry shape, payload format) is supplied via callbacks.
 * FR-ARCH-0005, FR-HOOK-0001-0009, NFR-0004
 */
export function assembleBootstrapPayload(
  p: PluginProcessingFrame,
  buildEntry: EntryBuilderFn,
  buildRootEntry: RootEntryBuilderFn,
): { payload: string; errors: GenError[] } {
  const { spec, frames } = p;
  const errors: GenError[] = [];
  const folderPairs = buildRenamePairs(frames, spec);

  const entryStrings: string[] = [];
  let lockIndex = 0;

  // Process manifest entries (FR-HOOK-0001: absent→skip, NFR-0006: content-agnostic)
  for (const ref of BOOTSTRAP_MANIFEST_ORDER) {
    // Skip index entries unless includeIndexEntries is set (FR-HOOK-0004)
    if (ref.basename.startsWith('__') && !spec.includeIndexEntries) continue;

    // Find the document in frames
    let body: string | null = null;
    let isIndex = false;

    if (ref.basename === '__rules_index__') {
      body = findIndexBody(frames, spec, 'rules');
      isIndex = true;
    } else if (ref.basename === '__workflows_index__') {
      body = findIndexBody(frames, spec, 'workflows');
      isIndex = true;
    } else {
      body = findDocBody(frames, ref.basename);
    }

    if (body === null) {
      // Absent → skip (FR-HOOK-0001)
      continue;
    }

    // Apply prefix to lead document (FR-HOOK-0003)
    let additionalContext: string;
    if (ref.isLead) {
      const cleanBody = body.startsWith('\n') ? body.slice(1) : body;
      additionalContext = BOOTSTRAP_PREFIX + cleanBody;
    } else {
      additionalContext = body;
    }

    // Apply folder rewrites to payload (FR-HOOK-0008) — only for doc bodies, not INDEX bodies.
    const rewrittenContext = isIndex
      ? additionalContext
      : applyFolderRewrites(additionalContext, folderPairs);

    // Size check on the JSON payload (NFR-0004)
    const jsonPayload = buildHookPayloadJson(rewrittenContext);
    if (jsonPayload.length > MAX_ENTRY_CHARS) {
      errors.push({
        target: spec.name,
        file: ref.basename,
        message: `Bootstrap entry exceeds ${MAX_ENTRY_CHARS} chars (${jsonPayload.length})`,
        kind: 'soft',
      });
    }

    // Build IDE-specific entry via callback
    const entryStr = buildEntry(rewrittenContext, jsonPayload, lockIndex);

    if (entryStr !== null) {
      entryStrings.push(entryStr);
      lockIndex++;
    }
  }

  // Append plugin-root entry (GT-3.4, FR-HOOK-0007) — always last, separate
  const pluginRootEntry = buildRootEntry(lockIndex, folderPairs);
  if (pluginRootEntry !== null) {
    entryStrings.push(pluginRootEntry);
  }

  const payload = entryStrings.join(', ');
  return { payload, errors };
}

function findDocBody(frames: FileProcessingFrame[], basename: string): string | null {
  const matchingFrame = frames.find((f) => {
    const name = f.target.split('/').pop() ?? '';
    const stem = name.replace(/\.[^.]+$/, '');
    return stem === basename && f.target_contents !== null && !f.isBinary;
  });

  if (!matchingFrame || matchingFrame.target_contents === null) return null;

  const content = matchingFrame.target_contents as string;
  return stripFrontmatter(content);
}

function findIndexBody(
  frames: FileProcessingFrame[],
  spec: PluginProcessingFrame['spec'],
  kind: 'rules' | 'workflows',
): string | null {
  const indexCandidates = frames.filter((f) => {
    const fname = f.target.split('/').pop();
    if (fname !== 'INDEX.md') return false;
    if (f.target_contents === null || f.isBinary) return false;

    const content = f.target_contents as string;
    if (kind === 'rules') return content.startsWith('# Rosetta Rules Index');
    return content.startsWith('# Rosetta Workflows Index');
  });

  if (indexCandidates.length === 0) return null;
  return indexCandidates[0].target_contents as string;
}
```

Note: `buildHookPayloadJson` is still called here for the size check (NFR-0004). The cursor assembler calls `buildCursorHookPayloadJson` from `escaping/json-string.ts` instead of `buildHookPayloadJson` — the size check in `assembleBootstrapPayload` uses `buildHookPayloadJson` as the size-check payload. For cursor, the size measurement is against the hookSpecificOutput format (consistent with how other IDEs are measured) even though cursor uses a different payload format. This matches the existing NFR-0004 measurement approach.

### Delete `src/plugin-generator/src/plugin-processors/plugin-assemble-bootstrap.ts`

This file is replaced by 4 per-IDE assemblers. Delete it entirely.

### New file: `src/plugin-generator/src/plugin-processors/plugin-assemble-claude-bootstrap.ts`

```typescript
// FR-ARCH-0055, FR-ARCH-0005 — claude bootstrap assembler (case-specific)
// Writes templateContext['bootstrap_hooks'] — ONE shared key (FR-VAR-0070).
// All entries use once:true; plugin-root uses double-quoted printf.

import { updatePluginFrame } from '../frames.js';
import {
  assembleBootstrapPayload,
  buildClaudeBootstrapEntry,
  buildHookPayloadJson,
} from '../bootstrap/payload.js';
import { wrapInPrintf } from '../escaping/shell.js';
import { CLAUDE_PLUGIN_ROOT_ENTRY } from '../spec/bootstrap-manifest.js';
import type { PluginProcessingFrame } from '../types.js';

/**
 * pluginAssembleClaudeBootstrap: assemble bootstrap payload for Claude and write to templateContext.
 * Entry shape: {"type":"command","command":"printf '%s' '<json>'","once":true}
 * Plugin-root: same shape, double-quoted printf for env var expansion.
 * Sets templateContext['bootstrap_hooks'] (ONE shared key).
 * FR-ARCH-0055, FR-ARCH-0005, FR-VAR-0070
 */
export function pluginAssembleClaudeBootstrap(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { payload, errors } = assembleBootstrapPayload(
    p,
    (additionalContext, _jsonPayload, _lockIndex) => {
      const jsonPayload = buildHookPayloadJson(additionalContext);
      const command = wrapInPrintf(jsonPayload);
      return buildClaudeBootstrapEntry(command);
    },
    (_lockIndex, _folderPairs) => buildClaudeBootstrapEntry(CLAUDE_PLUGIN_ROOT_ENTRY.command),
  );
  return updatePluginFrame(p, (draft) => {
    draft.templateContext = { ...draft.templateContext, bootstrap_hooks: payload };
    if (errors.length > 0) {
      draft.errors = [...draft.errors, ...errors] as typeof draft.errors;
    }
  });
}
```

### New file: `src/plugin-generator/src/plugin-processors/plugin-assemble-codex-bootstrap.ts`

```typescript
// FR-ARCH-0055, FR-ARCH-0005 — codex bootstrap assembler (case-specific)
// Writes templateContext['bootstrap_hooks'] — ONE shared key (FR-VAR-0070).
// Entries have statusMessage+timeout, no once. Plugin-root is workspace-root probe.

import { updatePluginFrame } from '../frames.js';
import {
  assembleBootstrapPayload,
  buildCodexBootstrapEntry,
  buildHookPayloadJson,
} from '../bootstrap/payload.js';
import { wrapInPrintf } from '../escaping/shell.js';
import { CODEX_PLUGIN_ROOT_COMMAND } from '../spec/bootstrap-manifest.js';
import type { PluginProcessingFrame } from '../types.js';

/**
 * pluginAssembleCodexBootstrap: assemble bootstrap payload for Codex and write to templateContext.
 * Entry shape: {"type":"command","command":"printf '%s' '<json>'","statusMessage":"Loading Rosetta bootstrap","timeout":30}
 * Plugin-root: workspace-root traversal probe resolving to $workspace_root/.agents.
 * Sets templateContext['bootstrap_hooks'] (ONE shared key).
 * FR-ARCH-0055, FR-ARCH-0005, FR-VAR-0070
 */
export function pluginAssembleCodexBootstrap(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { payload, errors } = assembleBootstrapPayload(
    p,
    (additionalContext, _jsonPayload, _lockIndex) => {
      const jsonPayload = buildHookPayloadJson(additionalContext);
      const command = wrapInPrintf(jsonPayload);
      return buildCodexBootstrapEntry(command);
    },
    (_lockIndex, _folderPairs) => buildCodexBootstrapEntry(CODEX_PLUGIN_ROOT_COMMAND),
  );
  return updatePluginFrame(p, (draft) => {
    draft.templateContext = { ...draft.templateContext, bootstrap_hooks: payload };
    if (errors.length > 0) {
      draft.errors = [...draft.errors, ...errors] as typeof draft.errors;
    }
  });
}
```

### New file: `src/plugin-generator/src/plugin-processors/plugin-assemble-copilot-bootstrap.ts`

```typescript
// FR-ARCH-0055, FR-ARCH-0005 — copilot bootstrap assembler (case-specific)
// Writes templateContext['bootstrap_hooks'] — ONE shared key (FR-VAR-0070).
// Entries have bash+powershell with per-entry session lock (0-based index).
// Plugin-root is agentPlugins-base probe; reference-rewritten for folder renames.

import { updatePluginFrame } from '../frames.js';
import {
  assembleBootstrapPayload,
  buildCopilotBootstrapEntry,
  buildHookPayloadJson,
  buildCopilotBashEntry,
  buildCopilotPowershellEntry,
  applyFolderRewrites,
} from '../bootstrap/payload.js';
import { COPILOT_PLUGIN_ROOT_BASH, COPILOT_PLUGIN_ROOT_POWERSHELL } from '../spec/bootstrap-manifest.js';
import type { PluginProcessingFrame } from '../types.js';

/**
 * pluginAssembleCopilotBootstrap: assemble bootstrap payload for Copilot and write to templateContext.
 * Entry shape: {"type":"command","bash":"<lock+printf>","powershell":"<lock+Write-Output>"}
 * Lock key uses 0-based entry index (-0.lock, -1.lock, …).
 * Entry 0 bash includes stale-lock cleanup; entries 1+ do not.
 * Plugin-root lock index = number of doc entries (final index).
 * Plugin-root bash and powershell are reference-rewritten for folder renames.
 * Sets templateContext['bootstrap_hooks'] (ONE shared key).
 * FR-ARCH-0055, FR-ARCH-0005, FR-VAR-0070
 */
export function pluginAssembleCopilotBootstrap(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { payload, errors } = assembleBootstrapPayload(
    p,
    (additionalContext, _jsonPayload, lockIndex) => {
      const jsonPayload = buildHookPayloadJson(additionalContext);
      const bash = buildCopilotBashEntry(lockIndex, jsonPayload);
      const powershell = buildCopilotPowershellEntry(lockIndex, jsonPayload);
      return buildCopilotBootstrapEntry(bash, powershell);
    },
    (lockIndex, folderPairs) => {
      const bash = applyFolderRewrites(COPILOT_PLUGIN_ROOT_BASH, folderPairs);
      const powershell = applyFolderRewrites(COPILOT_PLUGIN_ROOT_POWERSHELL, folderPairs);
      return buildCopilotBootstrapEntry(bash, powershell);
    },
  );
  return updatePluginFrame(p, (draft) => {
    draft.templateContext = { ...draft.templateContext, bootstrap_hooks: payload };
    if (errors.length > 0) {
      draft.errors = [...draft.errors, ...errors] as typeof draft.errors;
    }
  });
}
```

### New file: `src/plugin-generator/src/plugin-processors/plugin-assemble-cursor-bootstrap.ts`

```typescript
// FR-ARCH-0055, FR-ARCH-0005 — cursor bootstrap assembler (case-specific)
// ALL IDEs including cursor ALWAYS generate FULL bootstrap (FR-VAR-0070, Owner Rule 1).
// Cursor uses {"additional_context":"<body>"} payload — NOT {"hookSpecificOutput":...}.
// Cursor template has no {{{bootstrap_hooks}}} placeholder — payload generated but not injected.
// Writes templateContext['bootstrap_hooks'] — ONE shared key (FR-VAR-0070).

import { updatePluginFrame } from '../frames.js';
import {
  assembleBootstrapPayload,
  buildCursorBootstrapEntry,
} from '../bootstrap/payload.js';
import { buildCursorHookPayloadJson } from '../escaping/json-string.js';
import { wrapInPrintf } from '../escaping/shell.js';
import { CURSOR_PLUGIN_ROOT_ENTRY } from '../spec/bootstrap-manifest.js';
import type { PluginProcessingFrame } from '../types.js';

/**
 * pluginAssembleCursorBootstrap: assemble bootstrap payload for Cursor and write to templateContext.
 * Entry shape: {"type":"command","command":"printf '%s' '{\"additional_context\":\"...\"}'"} — no once, no statusMessage, no bash/powershell.
 * Plugin-root uses double-quoted printf for ${CURSOR_PROJECT_DIR} env var expansion.
 * Sets templateContext['bootstrap_hooks'] (ONE shared key); payload is NON-EMPTY.
 * Cursor hooks.json output is {"version":1,"hooks":{}} (37 bytes) — template has no placeholder.
 * FR-ARCH-0055, FR-ARCH-0005, FR-VAR-0070, Owner Rule 1
 */
export function pluginAssembleCursorBootstrap(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { payload, errors } = assembleBootstrapPayload(
    p,
    (additionalContext, _jsonPayload, _lockIndex) => {
      // Cursor uses additional_context format, NOT hookSpecificOutput
      const jsonPayload = buildCursorHookPayloadJson(additionalContext);
      const command = wrapInPrintf(jsonPayload);
      return buildCursorBootstrapEntry(command);
    },
    (_lockIndex, _folderPairs) => buildCursorBootstrapEntry(CURSOR_PLUGIN_ROOT_ENTRY.command),
  );
  // Generator ALWAYS generates full cursor bootstrap. Template decides injection.
  return updatePluginFrame(p, (draft) => {
    draft.templateContext = { ...draft.templateContext, bootstrap_hooks: payload };
    if (errors.length > 0) {
      draft.errors = [...draft.errors, ...errors] as typeof draft.errors;
    }
  });
}
```

---

## Template File Changes

Three `.tmpl` files must be updated. The cursor template has no bootstrap placeholder and requires NO change.

### `src/plugin-generator/plugins/core-claude/hooks/hooks.json.tmpl` line 6

**Before:**
```
{{{bootstrap_hooks_claude}}}
```

**After:**
```
{{{bootstrap_hooks}}}
```

### `src/plugin-generator/plugins/core-codex/.codex-plugin/hooks.json.tmpl` line 6

**Before:**
```
{{{bootstrap_hooks_codex}}}
```

**After:**
```
{{{bootstrap_hooks}}}
```

### `src/plugin-generator/plugins/core-copilot/.github/plugin/hooks.json.tmpl` line 4

**Before:**
```
{{{bootstrap_hooks_copilot}}}
```

**After:**
```
{{{bootstrap_hooks}}}
```

---

## Additional Required Changes

### `src/plugin-generator/src/spec/targets.ts`

**1. Update imports** — replace `fileNormalizeModels` import with 4 per-vocabulary imports, replace `pluginAssembleBootstrap` with 4 per-IDE imports:

```typescript
// REMOVE:
import { fileNormalizeModels } from '../file-processors/file-normalize-models.js';
import { pluginAssembleBootstrap } from '../plugin-processors/plugin-assemble-bootstrap.js';

// ADD:
import { fileNormalizeClaudeModels } from '../file-processors/file-normalize-claude-models.js';
import { fileNormalizeCursorModels } from '../file-processors/file-normalize-cursor-models.js';
import { fileNormalizeCopilotModels } from '../file-processors/file-normalize-copilot-models.js';
import { fileNormalizeCodexModels } from '../file-processors/file-normalize-codex-models.js';
import { pluginAssembleClaudeBootstrap } from '../plugin-processors/plugin-assemble-claude-bootstrap.js';
import { pluginAssembleCursorBootstrap } from '../plugin-processors/plugin-assemble-cursor-bootstrap.js';
import { pluginAssembleCopilotBootstrap } from '../plugin-processors/plugin-assemble-copilot-bootstrap.js';
import { pluginAssembleCodexBootstrap } from '../plugin-processors/plugin-assemble-codex-bootstrap.js';
import type { FileProcessor } from '../types.js';
```

**2. Update helper function signatures** — change `typeof fileNormalizeModels` to `FileProcessor`:

```typescript
// BEFORE:
function makeRulesEntry(normalizeModels: typeof fileNormalizeModels): SpecEntry {

// AFTER:
function makeRulesEntry(normalizeModels: FileProcessor): SpecEntry {
```

```typescript
// BEFORE:
function makeWorkflowsEntry(
  normalizeModels: typeof fileNormalizeModels,
  targetFolder = 'workflows',
  renameExt?: [string, string],
): SpecEntry {

// AFTER:
function makeWorkflowsEntry(
  normalizeModels: FileProcessor,
  targetFolder = 'workflows',
  renameExt?: [string, string],
): SpecEntry {
```

```typescript
// BEFORE:
function makeAgentsEntry(
  normalizeModels: typeof fileNormalizeModels,
  targetFolder = 'agents',
  renameExt?: [string, string],
): SpecEntry {

// AFTER:
function makeAgentsEntry(
  normalizeModels: FileProcessor,
  targetFolder = 'agents',
  renameExt?: [string, string],
): SpecEntry {
```

```typescript
// BEFORE:
function makeSkillsEntry(normalizeModels: typeof fileNormalizeModels, targetFolder = 'skills'): SpecEntry {

// AFTER:
function makeSkillsEntry(normalizeModels: FileProcessor, targetFolder = 'skills'): SpecEntry {
```

```typescript
// BEFORE:
function makeTemplatesEntry(targetFolder = 'templates', normalizeModels?: typeof fileNormalizeModels, extraExcludes: string[] = []): SpecEntry {

// AFTER:
function makeTemplatesEntry(targetFolder = 'templates', normalizeModels?: FileProcessor, extraExcludes: string[] = []): SpecEntry {
```

**3. Update `buildPipeline`** — replace `isStandalone: boolean` with `bootstrapAssembler: PluginProcessor`; add `PluginProcessor` to the import from `types.ts`:

```typescript
// BEFORE:
function buildPipeline(
  hooksSource: string,
  outputDir: string,
  release: ReleaseDescriptor,
  isStandalone: boolean,
  dryRun: boolean,
) {
  const pipeline = [
    pluginCleanup(outputDir, dryRun),
    pluginCopy(outputDir, dryRun),
    pluginProcessSpecEntries(release),
    pluginRewriteReferences,
    pluginGenerateIndexes,
    pluginInjectSections,
    pluginAssembleBootstrap,
    pluginRenderTemplates,
    pluginMirrorFiles,
    pluginSyncBundles(hooksSource, outputDir, release.deterministicHooks, dryRun),
    pluginWrite(outputDir, dryRun),
  ];
  return pipeline;
}
```

```typescript
// AFTER:
function buildPipeline(
  hooksSource: string,
  outputDir: string,
  release: ReleaseDescriptor,
  dryRun: boolean,
  bootstrapAssembler: PluginProcessor,
) {
  const pipeline = [
    pluginCleanup(outputDir, dryRun),
    pluginCopy(outputDir, dryRun),
    pluginProcessSpecEntries(release),
    pluginRewriteReferences,
    pluginGenerateIndexes,
    pluginInjectSections,
    bootstrapAssembler,
    pluginRenderTemplates,
    pluginMirrorFiles,
    pluginSyncBundles(hooksSource, outputDir, release.deterministicHooks, dryRun),
    pluginWrite(outputDir, dryRun),
  ];
  return pipeline;
}
```

**4. Update all 6 spec definitions** in `buildAllSpecs`:

Remove `hookEntryShape` from all 6 specs.

Replace `fileNormalizeModels` with per-vocabulary processor in all spec entries:
- `core-claude`: use `fileNormalizeClaudeModels` everywhere `fileNormalizeModels` appears
- `core-cursor`: use `fileNormalizeCursorModels` everywhere
- `core-copilot`: use `fileNormalizeCopilotModels` everywhere
- `core-codex`: use `fileNormalizeCodexModels` everywhere (the codex rules/workflows/skills entries that use `fileNormalizeModels`; NOTE: codex agents entry uses `fileCodexAgentFormat` not model normalization — do not add `fileNormalizeCodexModels` to the agents entry)
- `core-cursor-standalone`: use `fileNormalizeCursorModels` everywhere
- `core-copilot-standalone`: use `fileNormalizeCopilotModels` everywhere

Update `buildPipeline` call sites — remove `isStandalone` positional param, add the assembler as the last argument. The new `buildPipeline` signature has `dryRun` before `bootstrapAssembler`:

```typescript
// core-claude:
pluginProcessors: buildPipeline(hooksSource, outputDir, release, dryRun, pluginAssembleClaudeBootstrap),

// core-cursor:
pluginProcessors: buildPipeline(hooksSource, outputDir, release, dryRun, pluginAssembleCursorBootstrap),

// core-copilot:
pluginProcessors: buildPipeline(hooksSource, outputDir, release, dryRun, pluginAssembleCopilotBootstrap),

// core-codex:
pluginProcessors: buildPipeline(hooksSource, outputDir, release, dryRun, pluginAssembleCodexBootstrap),

// core-cursor-standalone:
pluginProcessors: buildPipeline(hooksSource, outputDir, release, dryRun, pluginAssembleCursorBootstrap),

// core-copilot-standalone:
pluginProcessors: buildPipeline(hooksSource, outputDir, release, dryRun, pluginAssembleCopilotBootstrap),
```

**5. Add `templates/shell-schemas/**` exclusion** (FR-COPY-0011) — already present in `TEMPLATES_EXCLUDES` constant at line 36 of the current file. Verify `TEMPLATES_EXCLUDES = ['templates/shell-schemas/**']` is used in all templates `SpecEntry`s including the codex one at line 303. The codex `templates` entry currently reads:

```typescript
{
  source: 'templates/**',
  target: '.agents/templates',
  exclude: TEMPLATES_EXCLUDES,
  processors: [...BASE_PROCESSORS],
},
```

This is already correct. No change needed here if `TEMPLATES_EXCLUDES` is already applied.

**6. Remove `import type { ReleaseDescriptor }` duplicate** — verify `ReleaseDescriptor` and `PluginProcessor` are both imported from `../types.js`. Current file already imports `ReleaseDescriptor` on line 31 as a type import separate from the main types import. Consolidate if tsc requires it.

---

## Files Changed

**Modified:**
- `src/plugin-generator/src/types.ts` — remove `kind` from `ModelVocabulary`; remove `hookEntryShape` from `PluginSpec`
- `src/plugin-generator/src/spec/model-maps.ts` — remove `kind` from 4 vocabulary constants
- `src/plugin-generator/src/file-processors/file-normalize-models.ts` — export 4 helpers; delete `fileNormalizeModels` switch dispatcher
- `src/plugin-generator/src/bootstrap/payload.ts` — refactor with `EntryBuilderFn`/`RootEntryBuilderFn` callbacks; remove switch functions; rename and export 4 entry builders; add `buildCursorBootstrapEntry`
- `src/plugin-generator/src/escaping/json-string.ts` — add `buildCursorHookPayloadJson`
- `src/plugin-generator/src/spec/bootstrap-manifest.ts` — add `CURSOR_PLUGIN_ROOT_ENTRY`
- `src/plugin-generator/src/spec/targets.ts` — update imports; update 5 helper function signatures; update `buildPipeline` signature; wire per-vocabulary processors and per-IDE assemblers into all 6 specs; remove `hookEntryShape` from all 6 specs
- `src/plugin-generator/plugins/core-claude/hooks/hooks.json.tmpl` — line 6: `{{{bootstrap_hooks_claude}}}` → `{{{bootstrap_hooks}}}`
- `src/plugin-generator/plugins/core-codex/.codex-plugin/hooks.json.tmpl` — line 6: `{{{bootstrap_hooks_codex}}}` → `{{{bootstrap_hooks}}}`
- `src/plugin-generator/plugins/core-copilot/.github/plugin/hooks.json.tmpl` — line 4: `{{{bootstrap_hooks_copilot}}}` → `{{{bootstrap_hooks}}}`

**New files:**
- `src/plugin-generator/src/file-processors/file-normalize-claude-models.ts`
- `src/plugin-generator/src/file-processors/file-normalize-cursor-models.ts`
- `src/plugin-generator/src/file-processors/file-normalize-copilot-models.ts`
- `src/plugin-generator/src/file-processors/file-normalize-codex-models.ts`
- `src/plugin-generator/src/plugin-processors/plugin-assemble-claude-bootstrap.ts`
- `src/plugin-generator/src/plugin-processors/plugin-assemble-cursor-bootstrap.ts`
- `src/plugin-generator/src/plugin-processors/plugin-assemble-copilot-bootstrap.ts`
- `src/plugin-generator/src/plugin-processors/plugin-assemble-codex-bootstrap.ts`

**Deleted:**
- `src/plugin-generator/src/plugin-processors/plugin-assemble-bootstrap.ts`

---

## Test Changes

### Delete

- `src/plugin-generator/tests/unit/file-processors/file-normalize-models.test.ts` — `fileNormalizeModels` deleted; replace with per-vocabulary tests below
- `src/plugin-generator/tests/unit/plugin-processors/plugin-assemble-bootstrap.test.ts` — `pluginAssembleBootstrap` deleted; replace with per-IDE tests below

### Create: `src/plugin-generator/tests/unit/file-processors/file-normalize-shared-helpers.test.ts`

Tests for the exported helpers in `file-normalize-models.ts`:

- `extractFrontmatterModelField`: content with model field → returns value string; content with no frontmatter → null; content with frontmatter but no model line → null; content with leading blank lines before `---` → null (trimStart check); multi-value model line `claude-opus-4-6, gpt-4` → returns full string `claude-opus-4-6, gpt-4`
- `applyModelRewrite`: frame with content and model field → returns new frame with rewritten content and `source[0].frontmatter.model` updated to normalized value; when rewritten content equals original content (normalizer returns same value) → returns same frame instance; binary frame → not exercised by this helper (guard is in per-vocabulary processors)
- `removeModelLine`: content with `model: claude-opus-4-6` → returned content has no `model:` line; content without model line → returned content unchanged
- `rewriteCodexModelFields`: content with `model: claude-sonnet-4-6` → `model: gpt-5.5\nmodel_reasoning_effort: high`; content without model line → unchanged

### Create: `src/plugin-generator/tests/unit/file-processors/file-normalize-claude-models.test.ts`

```typescript
// Key assertions:
expect(result).toBe(frame); // binary → unchanged (same instance)
expect(result).toBe(frame); // null contents → unchanged
expect(result).toBe(frame); // no frontmatter → unchanged
expect(result).toBe(frame); // no model field → unchanged
expect(result).toBe(frame); // no claude-compatible token → unchanged (normalizeClaude returns null)

// gpt-4o first, claude-sonnet-4-6 second:
// normalizeClaude scans ALL tokens; first claude-compatible is claude-sonnet-4-6 → 'sonnet'
expect(result.target_contents).toContain('model: sonnet');
expect((result.source[0]!.frontmatter as any).model).toBe('sonnet');

// claude-opus-4-6 → 'opus'; claude-haiku-4-5 → 'haiku'; 'inherit' fallback
```

### Create: `src/plugin-generator/tests/unit/file-processors/file-normalize-cursor-models.test.ts`

```typescript
// Key assertions:
expect(result).toBe(frame); // binary → unchanged
expect(result).toBe(frame); // null → unchanged
expect(result).toBe(frame); // no model field → unchanged

// first token 'claude-opus-4-6' → CURSOR_CLAUDE_MAP lookup → 'claude-opus-4-6'
expect(result.target_contents).toContain('model: claude-opus-4-6');
expect((result.source[0]!.frontmatter as any).model).toBe('claude-opus-4-6');

// gpt-4o-high → strip -high suffix → 'gpt-4o'
expect(result.target_contents).toContain('model: gpt-4o');

// unknown token not in map → passthrough unchanged
```

### Create: `src/plugin-generator/tests/unit/file-processors/file-normalize-copilot-models.test.ts`

```typescript
// Key assertions:
expect(result).toBe(frame); // binary → unchanged
expect(result).toBe(frame); // null → unchanged
expect(result).toBe(frame); // no model field → unchanged

// 'claude-opus-4-6' → 'Claude Opus 4.6'
expect(result.target_contents).toContain('model: Claude Opus 4.6');
expect((result.source[0]!.frontmatter as any).model).toBe('Claude Opus 4.6');

// 'gpt-4o' → 'GPT-4o'
// unknown token → passthrough unchanged
```

### Create: `src/plugin-generator/tests/unit/file-processors/file-normalize-codex-models.test.ts`

```typescript
// Key assertions:
expect(result).toBe(frame); // binary → unchanged
expect(result).toBe(frame); // null → unchanged
expect(result).toBe(frame); // no model field → unchanged

// No gpt token: model line stripped
const contentWithClaude = '---\nmodel: claude-opus-4-6\ntags: []\n---\nbody';
// → result.target_contents has no 'model:' line
expect(result.target_contents).not.toContain('model:');
// frontmatter.model NOT updated:
expect((result.source[0]!.frontmatter as any).model).toBe('claude-opus-4-6'); // unchanged

// gpt token with effort: two-field rewrite
const contentWithGpt = '---\nmodel: gpt-5.5-high\ntags: []\n---\nbody';
// → result.target_contents contains 'model: gpt-5.5\nmodel_reasoning_effort: high'
expect(result.target_contents).toContain('model: gpt-5.5\nmodel_reasoning_effort: high');
// frontmatter.model NOT updated:
expect((result.source[0]!.frontmatter as any).model).toBe('gpt-5.5-high'); // unchanged

// gpt token without effort: default effort 'medium'
// → 'model: gpt-4o\nmodel_reasoning_effort: medium'
```

### Create: `src/plugin-generator/tests/unit/plugin-processors/plugin-assemble-claude-bootstrap.test.ts`

```typescript
// Key assertions:
// Sets templateContext['bootstrap_hooks'] — ONE key, no per-IDE suffix:
expect(result.templateContext['bootstrap_hooks']).toBeDefined();
expect(result.templateContext['bootstrap_hooks_claude']).toBeUndefined();

// Entry shape: {"type":"command","command":"printf '%s' '...'","once":true}
expect(result.templateContext['bootstrap_hooks']).toContain('"once": true');
expect(result.templateContext['bootstrap_hooks']).toContain('"type": "command"');
expect(result.templateContext['bootstrap_hooks']).not.toContain('"additional_context"');
expect(result.templateContext['bootstrap_hooks']).toContain('"hookSpecificOutput"');

// Plugin-root entry last; joined by ', '
const payload = result.templateContext['bootstrap_hooks'] as string;
const entries = payload.split(', ');
// Last entry is the plugin-root
expect(entries[entries.length - 1]).toContain('CLAUDE_PLUGIN_ROOT');

// NFR-0004: entry > 10000 chars → soft error pushed to frame.errors
// (construct a frame with a bootstrap doc body > 10000 chars)
expect(result.errors).toHaveLength(1);
expect(result.errors[0].kind).toBe('soft');
```

### Create: `src/plugin-generator/tests/unit/plugin-processors/plugin-assemble-codex-bootstrap.test.ts`

```typescript
// Key assertions:
expect(result.templateContext['bootstrap_hooks']).toBeDefined();
expect(result.templateContext['bootstrap_hooks_codex']).toBeUndefined();

// Entry shape: statusMessage + timeout, NO once
expect(result.templateContext['bootstrap_hooks']).toContain('"statusMessage": "Loading Rosetta bootstrap"');
expect(result.templateContext['bootstrap_hooks']).toContain('"timeout": 30');
expect(result.templateContext['bootstrap_hooks']).not.toContain('"once"');

// Plugin-root: workspace-root probe with .agents path
const payload = result.templateContext['bootstrap_hooks'] as string;
expect(payload).toContain('.agents/rules/bootstrap-rosetta-files.md');
expect(payload).toContain('$workspace_root/.agents');
```

### Create: `src/plugin-generator/tests/unit/plugin-processors/plugin-assemble-copilot-bootstrap.test.ts`

```typescript
// Key assertions:
expect(result.templateContext['bootstrap_hooks']).toBeDefined();
expect(result.templateContext['bootstrap_hooks_copilot']).toBeUndefined();

// Entry shape: bash + powershell
expect(result.templateContext['bootstrap_hooks']).toContain('"bash"');
expect(result.templateContext['bootstrap_hooks']).toContain('"powershell"');
expect(result.templateContext['bootstrap_hooks']).not.toContain('"once"');

// Entry 0 bash has stale-lock cleanup (-0.lock)
const payload = result.templateContext['bootstrap_hooks'] as string;
const entry0Match = payload.match(/\{.*?"bash":"([^"]*(?:\\.[^"]*)*)".*?\}/);
expect(entry0Match![1]).toContain('-0.lock');
expect(entry0Match![1]).toContain('rosetta-bs-*.lock'); // stale-lock cleanup

// Entry 1 bash does NOT have stale-lock cleanup, but has -1.lock
// Plugin-root lock index = number of doc entries; bash reference-rewritten for folder renames
```

### Create: `src/plugin-generator/tests/unit/plugin-processors/plugin-assemble-cursor-bootstrap.test.ts`

```typescript
// Key assertions:
// bootstrap_hooks is NON-EMPTY (cursor always generates full bootstrap — Owner Rule 1):
expect(result.templateContext['bootstrap_hooks']).toBeDefined();
expect(result.templateContext['bootstrap_hooks']).not.toBe('');
expect(result.templateContext['bootstrap_hooks_cursor']).toBeUndefined();

// Cursor entry shape uses additional_context, NOT hookSpecificOutput:
expect(result.templateContext['bootstrap_hooks']).toContain('"additional_context"');
expect(result.templateContext['bootstrap_hooks']).not.toContain('"hookSpecificOutput"');

// No once, no statusMessage, no bash/powershell fields:
expect(result.templateContext['bootstrap_hooks']).not.toContain('"once"');
expect(result.templateContext['bootstrap_hooks']).not.toContain('"statusMessage"');
expect(result.templateContext['bootstrap_hooks']).not.toContain('"bash"');
expect(result.templateContext['bootstrap_hooks']).not.toContain('"powershell"');

// Entry shape: {"type":"command","command":"..."}
expect(result.templateContext['bootstrap_hooks']).toContain('"type": "command"');

// Plugin-root uses ${CURSOR_PROJECT_DIR}
expect(result.templateContext['bootstrap_hooks']).toContain('CURSOR_PROJECT_DIR');
```

### Existing tests that pass without modification

- `tests/unit/model-maps.test.ts` — normalizer functions unchanged; vocabulary constants lose `kind` field but tests do not access it
- `tests/unit/escaping/*.test.ts` — escaping logic unchanged
- `tests/e2e/sample.e2e.test.ts`
- `tests/e2e/parity.e2e.test.ts`

### Test for `model-maps.test.ts` helper fix (if makeCtx used there)

If any test file uses a `makeCtx` helper that constructs a `TargetContext` with `spec.modelVocabulary.kind`, that helper must be updated to drop the `kind` field. Specifically `tests/unit/file-processors/file-normalize-models.test.ts` contains `makeCtx` at multiple lines. This file is DELETED (see above), so no update is needed there. If `kind` appears in any remaining test fixture, remove it.

---

## Parity Verification

After all changes:

1. `npx tsc --noEmit` — must report zero errors
2. `npx vitest run` — all tests pass (new tests added, deleted tests removed)
3. Parity check:

```bash
cd src/plugin-generator
S=/Users/isolomatov/Sources/GAIN/rosetta
rm -rf /tmp/g2 /tmp/g3
npx tsx src/cli.ts --release r2 --domain core --source "$S" --output /tmp/g2
diff -rq /tmp/g2 "$S/agents/TEMP/old-gen-r2"
npx tsx src/cli.ts --release r3 --domain core --source "$S" --output /tmp/g3
diff -rq /tmp/g3 "$S/agents/TEMP/old-gen-r3"
```

Expected diff output: only the 4 accepted buckets (A, D, Decision 3, Task B). No new diffs.

**Cursor parity note:** After Task C, cursor `hooks.json` output is still `{"version":1,"hooks":{}}` (37 bytes) because the cursor hook template has no `{{{bootstrap_hooks}}}` placeholder. The generator now produces a full cursor bootstrap payload in `templateContext['bootstrap_hooks']` but the template does not inject it. Baseline bytes: unchanged.

**Template key change parity note:** The 3 `.tmpl` file changes (`_claude` → no suffix, `_codex` → no suffix, `_copilot` → no suffix) are required for claude/codex/copilot hooks.json to receive the payload. If the key rename is done but the `assembleBootstrapPayload` refactor is not done in the same atomic step, tsc will catch mismatches. Steps 5+6 of implementation must be done together before running tsc.
