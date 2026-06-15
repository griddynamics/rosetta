# Code Audit — File-by-File Review

Auditor: senior architect subagent (rosetta:architect)
Scope: 36 implementation source files + reference material (FR-ARCH.md, FR-VAR.md, FR-HOOK.md, CLEAN-ARCHITECTURE.md, plugin_generator.py baseline)
Date: 2026-06-11

---

## types.ts

**Status:** CLEAN
**Findings:**
No findings. All types are correctly shaped, identity-discriminant fields (`hookEntryShape`, `ModelVocabulary.kind`) are absent, and the `_readContent?: string` optional cache field is properly optional. `PluginSpec.mirrors` and `bundleSource` are correctly optional.

---

## generate.ts

**Status:** HAS-FINDINGS
**Findings:**
- [LOW] Redundant condition on error kind check — line 106: `if (e.kind === 'hard' || e.kind === 'soft') anyError = true` — the union type `'hard' | 'soft'` guarantees both branches are always taken; the condition is dead as written. The comment `NFR-0004/QF-2` explains the intent (soft errors also trigger non-zero exit). No logic error, but the condition should simply be `anyError = true` since `kind` cannot be anything else. Severity: cosmetic.

---

## frames.ts

**Status:** CLEAN
**Findings:**
No findings. The `enableMapSet()` call correctly appears before any `produce()` usage. `createFileFrame`, `createPluginFrame`, `updateFileFrame`, `updatePluginFrame` all have correct single responsibilities.

---

## spec/model-maps.ts

**Status:** HAS-FINDINGS
**Findings:**
- [MEDIUM] `CURSOR_CLAUDE_MAP` is misleadingly named — lines 38–47. The map only covers Claude token normalization for Cursor. GPT and o3/o4 tokens are handled inline in `normalizeCursor` via prefix detection (not via a map lookup), but a maintainer adding a new model might look for a GPT entry in this map or incorrectly add one here. Recognized in MODEL-MAPPING-REVIEW.md as R1 (optional rename). No functional bug.

- [LOW] `CURSOR_VOCABULARY` exports `map: CURSOR_CLAUDE_MAP` and `COPILOT_VOCABULARY` exports `map: COPILOT_CLAUDE_MAP` — lines 154–159. These exported vocabulary objects are not used by any processor for model normalization (the per-vocabulary processors import the `normalize*` functions directly, not the vocabulary objects). The `map` field on these vocabulary objects is structurally vestigial — it was meaningful when a dispatcher used it, but now it is never read. The objects are still passed to `PluginSpec.modelVocabulary` but that field itself is not read by any processor. This is dead data.

- [LOW] `CLAUDE_VOCABULARY.map` is empty `{}` with a comment "not used directly; normalizeClaude() is the function" — line 151. `CODEX_VOCABULARY.map` is also empty `{}` — line 162. This is honest documentation but the `modelVocabulary` field on `PluginSpec` carries these empty objects and is never consumed. The field (and these vocabulary constants) are dead data after the C1 refactor. No functional impact.

- [INFO] The `COPILOT_GPT_MAP` does not include `gpt-4.1` or `gpt-4-turbo` — lines 87–96. These are absent but the fallback is passthrough (the stripped base ID is returned as-is). Flagged in MODEL-MAPPING-REVIEW.md as R2 (optional addition). No functional bug for current instruction content.

---

## file-processors/file-normalize-models.ts

**Status:** CLEAN
**Findings:**
No findings. The four exported helpers (`extractFrontmatterModelField`, `applyModelRewrite`, `removeModelLine`, `rewriteCodexModelFields`) are correctly scoped. The frontmatter regex `/^---\n([\s\S]*?)\n---/` correctly handles empty frontmatter. The `removeModelLine` function also removes `model_reasoning_effort:` when stripping model fields (correct for codex cleanup of any prior two-field rewrite).

---

## file-processors/file-normalize-claude-models.ts

**Status:** CLEAN
**Findings:**
No findings. The scan-all-tokens strategy correctly identifies the first claude-compatible token. The `null` guard before calling `applyModelRewrite` is correctly positioned. The `inherit` fallback for unknown claude tokens is correct.

---

## file-processors/file-normalize-cursor-models.ts

**Status:** HAS-FINDINGS
**Findings:**
- [LOW] Comment at line 24: "normalizeCursor returns non-null for any non-empty input; guard is unreachable but retained for structural symmetry" — this is correct analysis but the unreachable guard creates a misleading code path. The `if (!normalized) return frame;` at line 26 can only be reached if `extractFrontmatterModelField` returned a non-empty string AND `normalizeCursor` somehow returned null; since `normalizeCursor` always returns the first token (non-empty if `first` is non-empty), the guard is dead. This is a cosmetic code smell, not a logic error.

---

## file-processors/file-normalize-copilot-models.ts

**Status:** CLEAN
**Findings:**
No findings. The null guard after `normalizeCopilot` is structurally symmetric with other processors. `normalizeCopilot` always returns non-null for non-empty input, but the guard is harmless.

---

## file-processors/file-normalize-codex-models.ts

**Status:** CLEAN
**Findings:**
No findings. The two-branch logic (no gpt token → strip model line; gpt token → two-field rewrite) is correct. The `frontmatter.model` is correctly NOT updated in either branch (field is being removed or split into two fields, neither of which maps cleanly to the single `model` field). The `updateFileFrame` calls are correctly scoped to content-only changes.

---

## escaping/json-string.ts

**Status:** CLEAN
**Findings:**
No findings. `jsonStringEscape` correctly handles all JSON control characters including `\`, `"`, `\n`, `\r`, `\t`, and remaining control characters via `\uXXXX`. `buildHookPayloadJson` and `buildCursorHookPayloadJson` correctly use the two different payload shapes (`hookSpecificOutput` vs `additional_context`).

---

## escaping/shell.ts

**Status:** HAS-FINDINGS
**Findings:**
- [MEDIUM] `wrapInPrintfDoubleQuoted` is exported (line 26) but is never called anywhere in the source tree — confirmed by `grep -rn "wrapInPrintfDoubleQuoted"` finding no callers. The function was intended for the double-quoted printf used in plugin-root entries, but `CLAUDE_PLUGIN_ROOT_ENTRY.command` already contains the full pre-built printf command (hardcoded in bootstrap-manifest.ts), so this helper is dead code. No functional impact, but the export creates false expectations for callers.

---

## bootstrap/payload.ts

**Status:** HAS-FINDINGS
**Findings:**
- [LOW] Size check uses `buildHookPayloadJson` (hookSpecificOutput format) for ALL IDEs including cursor — line 135. Cursor's actual payload uses `{"additional_context":"..."}` which is shorter. The size measurement for cursor is therefore conservative (overestimates). CLEAN-ARCHITECTURE.md Note explicitly documents this as intentional. Not a bug per spec, but creates asymmetric measurement.

- [INFO] `findIndexBody` silently takes the first candidate when multiple INDEX.md files match (line 193: `indexCandidates[0]`). In practice there is at most one rules INDEX.md and one workflows INDEX.md. If two were produced with the same heading, the second is silently ignored. No error is emitted. Theoretical risk only.

---

## bootstrap/copilot-lock.ts

**Status:** HAS-FINDINGS
**Findings:**
- [INFO] Bash stale-lock cleanup (line 21) uses `"rosetta-bs-*.lock"` which deletes ALL stale Rosetta lock files. PowerShell stale-lock cleanup (line 56) uses `"rosetta-bs-*-${lockIndex}.lock"` with `lockIndex=0`, which only cleans up `-0.lock` files. This asymmetry is intentional parity with the Python generator (confirmed by `plugin_generator.py` line 491 using `*-0.lock` for PowerShell). Not a bug, but the behavioral difference between platforms is not documented in a comment.

---

## plugin-processors/plugin-assemble-claude-bootstrap.ts

**Status:** HAS-FINDINGS
**Findings:**
- [LOW] The `CLAUDE_PLUGIN_ROOT_ENTRY.once` field is never read — line 32 only uses `CLAUDE_PLUGIN_ROOT_ENTRY.command`. The `once: true` property on `CLAUDE_PLUGIN_ROOT_ENTRY` is dead data. The `once` flag is correctly embedded in the JSON by `buildClaudeBootstrapEntry` unconditionally, so the field's presence on the exported constant is misleading (suggests it controls behavior, but it does not).

---

## plugin-processors/plugin-assemble-codex-bootstrap.ts

**Status:** CLEAN
**Findings:**
No findings. The codex assembler correctly uses `buildCodexBootstrapEntry` (which includes `statusMessage` and `timeout`, no `once`). The plugin-root entry correctly uses `CODEX_PLUGIN_ROOT_COMMAND` which probes `$workspace_root/.agents/rules/bootstrap-rosetta-files.md` — consistent with the codex spec's `baseSubfolder: '.agents'` and the rules specEntry target `.agents/rules`.

---

## plugin-processors/plugin-assemble-copilot-bootstrap.ts

**Status:** CLEAN
**Findings:**
No findings. The copilot assembler correctly passes `lockIndex` to `buildCopilotBashEntry` and `buildCopilotPowershellEntry`. The plugin-root entry correctly applies `applyFolderRewrites` to `COPILOT_PLUGIN_ROOT_BASH`/`COPILOT_PLUGIN_ROOT_POWERSHELL`. The `COPILOT_PLUGIN_ROOT_BASH` hardcodes `"core-copilot"` path and `"commands/coding-flow.md"`, but this command string is generated for `core-copilot` only; `core-copilot-standalone` uses a hooks.json.tmpl without `{{{bootstrap_hooks}}}` placeholder, so the assembled payload (including this plugin-root entry) is never injected — the entry is dead for the standalone target.

---

## plugin-processors/plugin-assemble-cursor-bootstrap.ts

**Status:** CLEAN
**Findings:**
No findings. The cursor assembler correctly uses `buildCursorHookPayloadJson` (additional_context format). The plugin-root uses `CURSOR_PLUGIN_ROOT_ENTRY.command` which correctly uses double-quoted printf for `${CURSOR_PROJECT_DIR}` expansion. Comment correctly documents that cursor template has no `{{{bootstrap_hooks}}}` placeholder.

---

## spec/bootstrap-manifest.ts

**Status:** HAS-FINDINGS
**Findings:**
- [LOW] `CLAUDE_PLUGIN_ROOT_ENTRY.once: true` — line 39. This field is never read by any consumer (confirmed: only `.command` is accessed in plugin-assemble-claude-bootstrap.ts). The `once` property is dead data on this constant object, potentially misleading maintainers into thinking it configures the `once` field behavior.

- [INFO] Comment at line 24: `// r2-only; r3 has different set` for `bootstrap-hitl-questioning` — this is an informal statement in the manifest. The VFS absence-skip mechanism handles r3 correctly (file simply absent from VFS → entry skipped at line 115 in payload.ts). No functional issue, but the comment creates an expectation that the manifest itself is release-aware, which it is not.

---

## spec/targets.ts

**Status:** HAS-FINDINGS
**Findings:**
- [MEDIUM] DEAD CODE: `existingByTarget` Map — lines 114–117. A `Map<string, FileProcessingFrame>` is built from `p.frames` and updated with `allFrames`, but it is NEVER used to construct `mergedFrames`. The `mergedFrames` at line 120 is `[...existingTmplFrames, ...allFrames]` which ignores `existingByTarget` entirely. The comment says "deduplicate: if a frame with the same target already exists, the new one wins" — this deduplication is SILENT dead code. The actual merge does NOT deduplicate by target. If two specEntries process the same VFS path to the same target (which shouldn't happen in the current six specs, but is structurally possible), the `allFrames` array would contain duplicates that are NOT resolved. Severity: MEDIUM because the dead code comment describes behavior that the code does not actually implement.

- [LOW] `cursorStandaloneInjectionText` (line 322) uses a leading `\n` comment that says "The leading \n adds the blank line separator after the bullets section. The extra \n in section 3 adds a trailing blank before the end-tag." — this comment references "section 3" but there is no "section 3" in the cursor-standalone injection (which only has section 1: literal text, section 2: index). The comment is stale/incorrect.

- [INFO] `core-cursor-standalone` does not include a `templates` specEntry (cursor-standalone only has rules, workflows, agents, skills, configure). The comment at line 394 end of specEntries doesn't note this explicitly. This is by design (standalone doesn't ship the templates folder) but is not documented.

- [INFO] `buildPipeline` function at line 540: the `pluginsRoot` alias for `pluginsSource` (line 136) is used only for path.join calls in preservedSource, not in `buildPipeline`. This alias has no functional impact.

---

## plugin-processors/plugin-rewrite-references.ts

**Status:** HAS-FINDINGS
**Findings:**
- [LOW] Ghost frame condition — line 72: `if (ghostFrame.target !== vfsPath)`. For standalone targets (e.g., cursor-standalone, copilot-standalone) with `baseSubfolder` set, ALL excluded files get ghost frames pushed because `targetPath` (from `computeTargetPath`) already differs from `vfsPath` before any rename processor runs (the baseSubfolder prefix is part of `targetPath`). This means excluded files in standalone targets always generate ghost frames, even when no rename processor changes the path. The `buildRenamePairs` ghost-frame folder filter then applies: same-folder pairs are emitted, cross-folder pairs are skipped. For cursor-standalone excluded `rules/*.md` files, the `fileRename` processor produces `.cursor/rules/*.mdc` — the ghost frame contributes the `.md → .mdc` rename pair, which is correct. The behavior is functionally correct but the condition logic is harder to reason about than necessary. No bug.

- [LOW] `applyFolderRewrites` is exported as a wrapper for `applyRenamePairs` — line 52–57. The function is also re-exported from `bootstrap/payload.ts` at line 16. This double-export chain (plugin-rewrite-references → payload → copilot assembler) creates an indirect import dependency that is not obvious. Not a bug.

---

## plugin-processors/plugin-generate-indexes.ts

**Status:** CLEAN
**Findings:**
No findings. The `subfolderPrefix` stripping at lines 83–97 correctly handles codex (`.agents/rules/foo.md` → `rules/foo.md`) and standalone targets. The `parseFrontmatter(content)` call inside the filter loop re-parses frontmatter for every qualifying frame; this is a redundant parse (frontmatter was already parsed by `fileRead`) but functionally correct and has no observable impact.

---

## plugin-processors/plugin-process-spec-entries.ts

**Status:** HAS-FINDINGS
**Findings:**
- [HIGH] DEAD CODE — deduplication logic is built but never applied — lines 113–117. The `existingByTarget` Map is populated but `mergedFrames` on line 120 is constructed as `[...existingTmplFrames, ...allFrames]` without using `existingByTarget`. The deduplication comment "if a frame with the same target already exists, the new one wins" is false: no such deduplication occurs. If a frame with the same target path appears in both `p.frames` (existing tmpl frames) and `allFrames` (spec-entry frames), BOTH appear in `mergedFrames`. This can cause `pluginWrite` to write the same file twice. Severity: HIGH — the stated intent (deduplication) is not implemented, and duplicate target frames would be silently written to disk.

  Example scenario: if a standalone spec had a standaloneTemplate `.cursor/hooks.json.tmpl` AND a specEntry also produced a frame targeting `.cursor/hooks.json.tmpl`, both would appear in `mergedFrames` without deduplication. In the current six specs, this scenario does not arise (specEntries and tmpl frames target different paths), so there is no current production bug. The dead code is a latent correctness risk.

- [LOW] `matchVfsGlob` on line 152 uses `micromatch` with `dot: true`. This enables matching dotfiles (e.g., `.agents/**`). The option is required for codex paths but is applied to all targets including non-dotfile targets. No bug.

---

## plugin-processors/plugin-render-templates.ts

**Status:** HAS-FINDINGS
**Findings:**
- [LOW] Error handling on line 66–70 swallows render errors silently for both standalone and main targets: `catch (err) { if (!isStandalone) resultFrames.push(frame); }`. There is no error logged or emitted when a Handlebars render fails. The comment says "Missing template or render error → warn+continue (FR-GEN-0010)" but the `warn` never happens — there is no logger call inside the catch. The FR-GEN-0010 requirement says "warn+continue" but only "continue" is implemented. Severity: LOW — the template renders for known valid templates; a Handlebars parse error would be a content authoring error, not a generator code error.

---

## plugin-processors/plugin-sync-bundles.ts

**Status:** CLEAN
**Findings:**
No findings. The function correctly reads `spec.bundleSource ?? spec.name` for the bundle source directory, correctly uses `spec.hookFolder` from spec data, and correctly handles both r3 (copy bundles) and r2 (remove stale bundles) cases. The `!fs.existsSync(bundleSourceDir)` early return is correct parity behavior (PARITY-15).

---

## plugin-processors/plugin-mirror-files.ts

**Status:** CLEAN
**Findings:**
No findings. The graceful skip on missing source frame is correct. The mirror clone correctly carries the same `sourcePath` as the source frame. Post-render timing is correct (runs after `pluginRenderTemplates` in the pipeline).

---

## plugin-processors/plugin-inject-sections.ts

**Status:** HAS-FINDINGS
**Findings:**
- [MEDIUM] SPEC-CODE CONFLICT — FR-ARCH-0051 acceptance criterion states: "Given: a missing host or anchor When: run Then: it errors naming the host and anchor." But the code at line 50–52 SKIPS gracefully when the anchor is not found: `// Anchor not found — skip gracefully (r3 plugin-files-mode has no PREP STEP 1 section)`. Only missing HOST FRAME produces an error (lines 25–32). Missing ANCHOR silently continues. The inline comment documents the real behavior and rationale (r3 plugin-files-mode lacks PREP STEP 1), so this is an intentional divergence from the spec's "error" criterion. FR-VAR-0072 says "skip injection without error for standalone targets" which partially reconciles this, but the spec language in FR-ARCH-0051 has not been updated to reflect the graceful-skip-on-missing-anchor behavior. Severity: MEDIUM — spec-code inconsistency that could mislead future maintainers about expected behavior.

- [LOW] `buildInjectionText` processes `section.kind === 'plugin-root'` at line 133–135 with a comment "Nothing to inject here — plugin root is handled by bootstrap, not injection." This is a no-op case. If a future specEntry declares `kind: 'plugin-root'` sections, they will silently produce no output. The no-op is currently correct (no spec uses this kind) but the silent failure mode is not ideal.

---

## plugin-processors/plugin-copy.ts

**Status:** HAS-FINDINGS
**Findings:**
- [LOW] `readParentVersion` at line 149 tries four candidate paths for the parent plugin.json and falls back to `'2.0.40'` (GT-7) if none found. The fallback hardcodes a version string. If the preserved plugin.json changes location or structure, this silently uses the stale fallback version without any error or warning. The comment `FR-VAR-0060` and `GT-7` document this, but there is no log/warning emitted when the fallback is used.

- [INFO] `copyDirRecursive` at line 120 copies all non-`.DS_Store` files. It does not skip other platform artifacts (e.g., `Thumbs.db`). Only `.DS_Store` is excluded (FR-COPY-0010). This is consistent with spec, but worth noting.

---

## plugin-processors/plugin-cleanup.ts

**Status:** CLEAN
**Findings:**
No findings. Correct wipe-then-mkdir idiom, dry-run no-op is correct.

---

## plugin-processors/plugin-write.ts

**Status:** CLEAN
**Findings:**
No findings. Comment at line 22 says "FR-ARCH-0004: folders emerge from files; no ensureDirs (D change)" but the code still calls `mkdirSync` per file — this is correct lazy directory creation (directories created just-in-time as files are written), not an up-front "ensureDirs" pass. The comment is accurate in meaning.

---

## serialize/frontmatter.ts

**Status:** CLEAN
**Findings:**
No findings. `parseFrontmatter` correctly handles missing frontmatter (returns full content as body) and malformed frontmatter (catches parse error, returns full content). `rewriteModelLine` correctly scopes the replacement to frontmatter only. `stripFrontmatter` correctly returns the body from gray-matter's `content` field.

---

## file-processors/file-read.ts

**Status:** HAS-FINDINGS
**Findings:**
- [MEDIUM] When `sources.length > 1` for binary files (line 30–34), the code reads the LAST source (highest priority per comment) but does NOT report an error. The requirement FR-ARCH-0034 and the comment "FR-ARCH-0034: binary + >1 SourceFile → error; still process" indicate this SHOULD be an error. The code says it errors ("// Error: binary + >1 source; just use last") but the comment is misleading — no error is actually emitted, no `GenError` is pushed, no exception thrown. The frame is returned with `isBinary: true` and the last source's content. Severity: MEDIUM — FR-ARCH-0034 requires an error on this input; the error is documented in a comment but not implemented.

- [LOW] The comment "For single source: set target_contents to its raw content. For multi-source: set to first source's raw content; fileBundle will concatenate properly" at line 67–70. For single-source text files, `target_contents` is set to `texts[0]`. For multi-source text files, `target_contents` is ALSO set to `texts[0]` at line 71. `fileBundle` will then replace it by concatenating all sources. This is functionally correct but the intermediate `target_contents = texts[0]` for multi-source files is a transient value that is always overwritten by `fileBundle`. Minor.

---

## file-processors/file-apply-overrides.ts

**Status:** CLEAN
**Findings:**
No findings. The two-step filter (target-only → overwrite) is correctly ordered. The `firstSourceChanged` check with `_readContent` correctly handles the case where `fileRead` was not run before this processor (unit tests). The condition `filtered.length === frame.source.length` early-return is a correct optimization.

---

## file-processors/file-bundle.ts

**Status:** HAS-FINDINGS
**Findings:**
- [MEDIUM] Binary + >1 source path at line 22–24: the code falls through with `return frame` without emitting any error. This is inconsistent with FR-ARCH-0034 and FR-ARCH-0042 which require an error when a binary has more than one remaining SourceFile. The same issue exists in `file-read.ts` for binaries. Neither location emits a `GenError` or throws — the error behavior is commented but not implemented.

---

## file-processors/file-codex-agent.ts

**Status:** CLEAN
**Findings:**
No findings. The `normalizeCodex` call correctly handles both cases (no gpt token → `null` → no model fields in TOML; gpt token → model + effort). The body trimming (`body.startsWith('\n') ? body.slice(1) : body`) and trailing newline strip are correct for TOML embedding. The `sandboxMode` mapping (`readonly: true → 'read-only'`, else `'workspace-write'`) is correct.

---

## file-processors/file-rename.ts

**Status:** CLEAN
**Findings:**
No findings. The full-anchored regex (`^${pattern}$`) correctly implements FR-ARCH-0037 exact matching. The identity-return on non-match is correct.

---

## Summary: Consolidated Findings by Severity

### HIGH (1)

| # | File | Lines | Finding |
|---|------|-------|---------|
| H1 | `plugin-processors/plugin-process-spec-entries.ts` | 113–120 | `existingByTarget` Map is built and populated but NEVER used in `mergedFrames` construction. Deduplication comment is false — no deduplication occurs. Duplicate target frames (tmpl + spec) would both be written to disk. Currently no production impact (current specs don't create such duplicates) but a latent correctness risk that silently violates the stated invariant. |

### MEDIUM (5)

| # | File | Lines | Finding |
|---|------|-------|---------|
| M1 | `file-processors/file-read.ts` | 30–34 | Binary + >1 source: comment says "error" but NO error is emitted — no `GenError`, no exception. FR-ARCH-0034 requires an error. |
| M2 | `file-processors/file-bundle.ts` | 22–24 | Binary + >1 source: same missing error as M1. FR-ARCH-0042 requires an error. Both M1 and M2 are the same root issue in two locations. |
| M3 | `spec/targets.ts` | 113–120 | Same dead code as H1 (originates here). MEDIUM additionally because the deduplication comment inside the function creates false documentation. |
| M4 | `plugin-processors/plugin-inject-sections.ts` | 50–52 | Spec-code conflict: FR-ARCH-0051 says "missing anchor → error"; code silently skips. FR-VAR-0072 partially reconciles this but the spec text in FR-ARCH-0051 is not updated. |
| M5 | `spec/model-maps.ts` | 38–47 | `CURSOR_CLAUDE_MAP` misleadingly named — recognized in MODEL-MAPPING-REVIEW.md, labeled R1. |

### LOW (9)

| # | File | Lines | Finding |
|---|------|-------|---------|
| L1 | `escaping/shell.ts` | 26–28 | `wrapInPrintfDoubleQuoted` exported but never called anywhere. Dead export. |
| L2 | `spec/bootstrap-manifest.ts` | 38–40 | `CLAUDE_PLUGIN_ROOT_ENTRY.once: true` field never read by any consumer. Dead data. |
| L3 | `plugin-processors/plugin-assemble-claude-bootstrap.ts` | 32 | Confirms L2: only `.command` is accessed, never `.once`. |
| L4 | `plugin-processors/plugin-render-templates.ts` | 66–70 | Render error silently caught with no log warning; FR-GEN-0010 says "warn+continue" but only "continue" is implemented. |
| L5 | `plugin-processors/plugin-copy.ts` | 149–170 | `readParentVersion` fallback to `'2.0.40'` emits no warning/log when none of the four candidate paths exist. |
| L6 | `spec/targets.ts` | 320 | Comment references "section 3" in `cursorStandaloneInjectionText` but cursor-standalone only has 2 sections in its injection declaration. Stale comment. |
| L7 | `generate.ts` | 106 | Redundant kind check: `if (e.kind === 'hard' \|\| e.kind === 'soft') anyError = true` — the union type guarantees always true; could be `anyError = true` directly. Cosmetic only. |
| L8 | `file-processors/file-normalize-cursor-models.ts` | 24–26 | Unreachable guard `if (!normalized) return frame` is dead code (normalizeCursor always returns non-null for non-empty input). Comment acknowledges this. |
| L9 | `plugin-processors/plugin-rewrite-references.ts` | 52–57 | `applyFolderRewrites` is a thin re-export wrapper for `applyRenamePairs`, itself re-exported from `payload.ts`. Double-indirection makes the import chain non-obvious. |

### INFO (5)

| # | File | Lines | Finding |
|---|------|-------|---------|
| I1 | `spec/model-maps.ts` | 150–163 | `modelVocabulary` field on `PluginSpec` and the vocabulary constant objects (`CLAUDE_VOCABULARY`, `CURSOR_VOCABULARY`, etc.) are not consumed by any processor after C1 refactor. Dead data carried on every spec. |
| I2 | `bootstrap/payload.ts` | 193 | `findIndexBody` silently takes `[0]` if multiple INDEX.md files match; no error/warning if multiple candidates. |
| I3 | `bootstrap/copilot-lock.ts` | 21 vs 56 | Bash stale-lock cleanup uses `*.lock` (all files); PS uses `*-0.lock` (only index 0). Asymmetry is intentional parity with Python generator, but not documented in-code. |
| I4 | `spec/bootstrap-manifest.ts` | 24 | Comment "r2-only; r3 has different set" is informal and creates a perception that the manifest is release-conditional, but the VFS absence-skip mechanism handles this transparently. |
| I5 | `spec/model-maps.ts` | 87–96 | `COPILOT_GPT_MAP` missing `gpt-4.1`, `gpt-4-turbo`. Fallback is passthrough (base ID returned). Recognized in MODEL-MAPPING-REVIEW.md as R2. |

---

## Review Statistics

- **Files reviewed:** 36
- **Files with findings:** 18
- **Files clean:** 18
- **Total findings:** 20
  - HIGH: 1
  - MEDIUM: 5
  - LOW: 9
  - INFO: 5

## Key Correctness Issues

1. **H1/M3 (Dead deduplication)**: `existingByTarget` in `plugin-process-spec-entries.ts` is dead code that does not implement its stated invariant. Low current risk but incorrect semantics.
2. **M1/M2 (Missing error for binary+multi-source)**: FR-ARCH-0034 and FR-ARCH-0042 require errors; none are emitted in `file-read.ts` or `file-bundle.ts`. Comments document the intent but the implementation does not follow through.
3. **M4 (Spec-code conflict on missing anchor)**: FR-ARCH-0051 says error; code skips gracefully. The behavior is correct for current content (r3 compatibility) but the spec text needs reconciling.
4. **L1 (Dead export `wrapInPrintfDoubleQuoted`)**: Should be removed to avoid false expectations.
