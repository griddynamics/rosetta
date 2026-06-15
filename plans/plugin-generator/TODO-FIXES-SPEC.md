# TODO-FIXES-SPEC — Plugin Generator Open Issues

Last updated: 2026-06-11

---

## Open items at a glance

| # | ID | Severity | Title |
|---|---|---|---|
| 1 | TODO-1 | HIGH | Stale parity baseline |
| 2 | CODE-H1 | HIGH | Dead deduplication code |
| 3 | TODO-2 | MEDIUM | Windsurf path rewriter over-matches |
| 4 | MODEL-TODO-4 | MEDIUM | Codex effort default diverges from Python (inert) |
| 5 | CODE-M1 | MEDIUM | Binary+multi-source error missing in file-read.ts |
| 6 | CODE-M2 | MEDIUM | Binary+multi-source error missing in file-bundle.ts |
| 7 | CODE-M3 | MEDIUM | Spec says "error on missing anchor", code silently skips |
| 8 | CODE-L1 | LOW | Dead export `wrapInPrintfDoubleQuoted` |
| 9 | CODE-L2 | LOW | Dead `once: true` field on CLAUDE_PLUGIN_ROOT_ENTRY |
| 10 | CODE-L3 | LOW | Render failures silently swallowed |
| 11 | CODE-L4 | LOW | Stale comment references non-existent "section 3" |
| 12 | REQ-GAP-2 | LOW | FR-COPY-0021 parity contract unclear |
| 13 | REQ-GAP-3 | LOW | Codex no-effort behavior unspecified |

---

## TODO-1 — Stale parity baseline

**Severity:** HIGH

**When:** Any time you run the e2e parity test (`tests/e2e/parity.e2e.test.ts`), which compares the TypeScript generator output byte-for-byte against the reference snapshots in `agents/TEMP/old-gen-r2/` and `agents/TEMP/old-gen-r3/`.

**What:** The reference snapshots in those folders were captured before the recent sync. They contain stale model names (old opus-4-6 values), old plugin.json version numbers, and other pre-sync content. The TypeScript generator now produces the correct, up-to-date output — but the snapshots still contain the old content, so the parity test compares against wrong reference data.

**Why:** Without a fresh baseline, the parity e2e test either fails on legitimate correct output (false negatives) or, if the test currently skips byte-diff assertions, gives you no signal at all. You cannot trust parity results until the snapshots are regenerated from current source. This is the gating condition for all future parity validation.

**How:** Run the Python generator (the authoritative reference) fresh against the current source tree to rebuild both snapshots. Then remove the two accepted-bucket artifacts that are intentionally absent from the TypeScript generator output (the `templates/shell-schemas/` authoring-only folders excluded by FR-COPY-0011, and the empty `.cursor/hooks/` dir accepted as Task B).

```bash
S=/Users/isolomatov/Sources/GAIN/rosetta
cd "$S"
venv/bin/python scripts/plugin_generator.py --release r2 --output-dir agents/TEMP/old-gen-r2 --repo-root .
venv/bin/python scripts/plugin_generator.py --release r3 --output-dir agents/TEMP/old-gen-r3 --repo-root .
# Remove accepted-bucket exclusions from baseline:
rm -rf agents/TEMP/old-gen-r2/core-{claude,copilot,cursor}/templates
rm -rf agents/TEMP/old-gen-r2/core-codex/.agents/templates
rm -rf agents/TEMP/old-gen-r3/core-{claude,copilot,cursor}/templates
rm -rf agents/TEMP/old-gen-r3/core-codex/.agents/templates
rm -rf agents/TEMP/old-gen-r2/core-cursor-standalone/.cursor/hooks
```

**AC:** After regeneration, running both generators against current source and diffing produces only the 4 accepted buckets (Bucket A: agent renames; Bucket D: commands→prompts; Decision 3: plugin-files-mode cascade; Task B: cursor hooks dir absent) — no other differences.

---

## CODE-H1 — Dead deduplication code

**Severity:** HIGH (latent correctness risk — no production bug today, but a false invariant in the code)

**When:** Every time `pluginProcessSpecEntries` runs — which is every generator invocation. Also: if someone ever adds two `SpecEntry` items that write to the same output path (e.g., a template entry and a spec entry both targeting the same file).

**What:** Inside `plugin-process-spec-entries.ts` (lines 113–120), a `Map<string, FileProcessingFrame>` called `existingByTarget` is built and populated — but then thrown away. The line that constructs `mergedFrames` ignores the Map entirely and does `[...existingTmplFrames, ...allFrames]`. The comment above it says "deduplicate: if a frame with the same target already exists, the new one wins" — but that deduplication never happens. If two spec entries both produce a frame pointing at the same output path, both frames end up in `mergedFrames` and `pluginWrite` writes the file twice (second write overwrites first, silently).

**Why:** The six current plugin specs don't happen to trigger this scenario, so there is no active production bug. But the code says it guarantees a behavior it does not implement. Any future spec that causes overlap would silently overwrite files without any error or warning. The misleading comment makes the code actively dangerous to maintain.

**How:** Two options — pick one:
- **Implement it:** Replace the `mergedFrames` construction with one that actually uses `existingByTarget` (last writer wins). The Map is already built correctly; just use it.
- **Remove it:** If deduplication is not needed, delete the Map, its population loop, and the misleading comment. Verify by grep that no current spec creates overlapping targets, then remove.

**AC:** Either the deduplication is implemented and tested (two overlapping spec entries → one output frame, second wins), or the dead code and false comment are removed entirely.

---

## TODO-2 — Windsurf path rewriter over-matches

**Severity:** MEDIUM (silent wrong output in documentation files — cosmetic, no functional impact)

**When:** Generating any Cursor standalone or Copilot standalone plugin from source files that contain the Windsurf configure guide (`instructions/r*/core/configure/windsurf.md`). Specifically the line describing Windsurf's "Automation workflows" feature folder.

**What:** Windsurf has two distinct features: "Slash commands" stored in `.windsurf/commands/` and "Automation workflows" stored in `.windsurf/workflows/`. The generator's reference rewriter (`rewritePathToken` in `plugin-rewrite-references.ts`) rewrites Rosetta folder tokens like `workflows/` → `commands/` (for Cursor) and `workflows/` → `prompts/` (for Copilot). Its negative lookbehind `(?<![A-Za-z0-9_-])` allows a preceding `/` as a valid word boundary — so `/workflows/` inside `.windsurf/workflows/` matches the rewrite pattern. Result: the Automation workflows line in the guide gets rewritten from `.windsurf/workflows/` to `.windsurf/commands/` or `.windsurf/prompts/`, which is wrong.

**Why:** The generated configure guides tell users to look in the wrong folder for their Windsurf automation workflows. It's documentation corruption: the Slash commands section is correct, but the Automation workflows section points to a Slash commands path. This bug is invisible in parity diffs because both the Python and TypeScript generators make the same mistake.

**How:** Two options:

*Option A — Tighten the lookbehind (code fix):*
Change the regex in `rewritePathToken` from `(?<![A-Za-z0-9_-])` to `(?<![A-Za-z0-9_\-/])` so a preceding `/` is no longer a valid word boundary. This prevents `.windsurf/workflows/` from matching. Before applying, run parity to confirm no legitimate Rosetta paths (like `skills/workflows/x.md`) regress.

*Option B — Fix the source (content fix):*
Update `instructions/r*/core/configure/windsurf.md` to use a path token that does not collide with any Rosetta folder name (e.g., rename the Automation workflows reference to something unambiguous). No code change needed.

**AC:** After fix, the line `.windsurf/workflows/ - Automation workflows for Cascade` appears unchanged in generated cursor-standalone and copilot-standalone configure guides.

---

## MODEL-TODO-4 — Codex effort default diverges from Python (currently inert)

**Severity:** MEDIUM (harmless today — no source file triggers this path)

**When:** A Codex agent or skill file has a frontmatter `model:` field with a bare GPT model ID and no effort suffix — for example `model: gpt-4o` (no `-high`, `-medium`, or `-low`).

**What:** The TypeScript `normalizeCodex` function treats a missing effort suffix as `effort: 'medium'`, so the generated TOML output includes `model_reasoning_effort = "medium"`. The Python generator returns `None` for missing effort and writes no `model_reasoning_effort` line at all. The generated output differs: TypeScript adds an extra line the Python generator omits.

**Why:** No current instruction source file has a bare GPT model ID without an effort suffix — all existing frontmatter uses explicit suffixes like `gpt-5.4-high`. So this divergence has no effect on any generated plugin today. It matters when someone adds a new source file with a bare GPT ID, or when this path is tested: the TypeScript behavior may be intentionally better (Codex requires an effort level, so defaulting to medium is arguably correct) or may be an unintended deviation. This is unresolved.

**How:** Decide which behavior is correct, then align both generators:
- **If Python is right:** Change TypeScript `normalizeCodex` to return `effort: undefined` for no-suffix tokens, and update `fileNormalizeCodexModels` to skip writing the effort line when effort is undefined.
- **If TypeScript is right:** Update the Python generator to emit `model_reasoning_effort: medium` when effort is absent. Document the rationale.
- Either way: add a requirement in FR-COPY-0022 specifying the expected behavior.

**AC:** Both generators produce identical output for a source file with `model: gpt-4o` (no effort suffix).

---

## CODE-M1 — Binary+multi-source error missing in `file-read.ts`

**Severity:** MEDIUM

**When:** A binary file (image, compiled artifact, etc.) has more than one `SourceFile` entry — meaning the same binary path is contributed by more than one spec entry or override.

**What:** `file-read.ts` (lines 30–34) has a comment "// Error: binary + >1 source; just use last" — but no error is actually emitted. No `GenError` is pushed, no exception thrown. The code silently uses the last source. FR-ARCH-0034 requires an error in this case.

**Why:** The generator has no way to merge binary files, so having two sources for a binary is always a misconfiguration. Silently picking the last one hides the bug from the author. The comment acknowledges it should error but the implementation doesn't follow through.

**How:** Push a `GenError` with `kind: 'soft'` to the frame when `isBinary && sources.length > 1`. The generator should still continue (soft error, not hard stop) but the author should see a warning in output.

**AC:** Running the generator against a spec that contributes the same binary path from two entries produces a soft error in generator output. The binary file is still written (last source used), but the error is visible.

---

## CODE-M2 — Binary+multi-source error missing in `file-bundle.ts`

**Severity:** MEDIUM

**When:** Same scenario as CODE-M1, but caught at the `fileBundle` processor stage rather than `fileRead`.

**What:** `file-bundle.ts` (lines 22–24) has the same silent-fallback pattern as CODE-M1. FR-ARCH-0042 requires an error for binary + >1 source. Code returns `frame` silently without any error.

**Why:** Same as CODE-M1. Two processors in the pipeline both silently swallow the same misconfiguration. At least one of them must emit an error for the author to know something is wrong.

**How:** Same as CODE-M1 — push a `GenError` with `kind: 'soft'`.

**AC:** Same as CODE-M1.

---

## CODE-M3 — Spec says "error on missing anchor", code silently skips

**Severity:** MEDIUM (requirements-only fix — code behavior is correct)

**When:** Running the generator against r3 source where `plugin-files-mode.md` does not have a "PREP STEP 1" section that `plugin-inject-sections.ts` tries to inject into.

**What:** FR-ARCH-0051 says: "Given a missing host or anchor. When run. Then it errors naming the host and anchor." The code in `plugin-inject-sections.ts` (lines 50–52) silently skips when the anchor is not found, with a comment explaining why: r3 compatibility. The code behavior is intentionally correct. The requirement text is wrong — it describes old behavior that was changed for good reason.

**Why:** A future maintainer reading FR-ARCH-0051 will expect an error to be thrown when an anchor is missing, then be confused when the code skips silently. The spec and code disagree, which erodes trust in both.

**How:** Update FR-ARCH-0051 in `docs/REQUIREMENTS/plugin-generator/FR-ARCH.md`. Change the acceptance criterion from "it errors" to "it skips gracefully, logging which anchor was not found." Add the r3 compatibility rationale.

**AC:** FR-ARCH-0051 requirement text matches what the code actually does.

---

## CODE-L1 — Dead export `wrapInPrintfDoubleQuoted`

**Severity:** LOW

**When:** Any developer reads `escaping/shell.ts` and sees an exported function, assumes it is part of the public API, or tries to use it.

**What:** `wrapInPrintfDoubleQuoted` in `src/plugin-generator/src/escaping/shell.ts` (lines 26–28) is exported but has zero callers anywhere in the codebase. The function was originally intended for building plugin-root entries with double-quoted printf (for env var expansion), but those entries are now built as hardcoded strings in `bootstrap-manifest.ts`.

**Why:** An unused export creates false surface area. It suggests the function does something useful that callers rely on, making developers hesitant to remove it even when cleaning up.

**How:** Delete the function, or remove the `export` keyword if you want to keep it as a private utility for future use. Verify with `grep -rn "wrapInPrintfDoubleQuoted" src/plugin-generator/src/` that no caller exists.

**AC:** `grep -rn "wrapInPrintfDoubleQuoted" src/plugin-generator/src/` returns no results.

---

## CODE-L2 — Dead `once: true` field on `CLAUDE_PLUGIN_ROOT_ENTRY`

**Severity:** LOW

**When:** A developer reads `src/plugin-generator/src/spec/bootstrap-manifest.ts` and sees `CLAUDE_PLUGIN_ROOT_ENTRY = { command: '...', once: true }`, then assumes the `once` field controls whether the plugin-root hook runs once per session.

**What:** `CLAUDE_PLUGIN_ROOT_ENTRY.once` is never read by any consumer. The `once: true` flag in the generated hook JSON is hardcoded inside `buildClaudeBootstrapEntry`, not driven by this field. The field on the constant is dead data.

**Why:** It misleads: a developer changing `once: false` here would expect behavior to change — but it won't, because the field is ignored.

**How:** Remove `once: true` from the `CLAUDE_PLUGIN_ROOT_ENTRY` constant definition in `bootstrap-manifest.ts`.

**AC:** `CLAUDE_PLUGIN_ROOT_ENTRY` has only a `command` property.

---

## CODE-L3 — Render failures silently swallowed

**Severity:** LOW

**When:** A `.tmpl` file contains a Handlebars syntax error, references a missing helper, or otherwise fails to render.

**What:** The catch block in `plugin-render-templates.ts` (lines 66–70) catches render errors and continues without logging anything. The comment says "warn+continue (FR-GEN-0010)" but only the "continue" part is implemented — no warning is ever emitted to the author.

**Why:** A broken template silently produces no output (or partial output). The plugin gets generated without the file that the template was supposed to produce, and the author has no idea why. This is particularly bad for hooks templates where a silent failure means the plugin ships without working hooks.

**How:** Add `console.warn` or push a soft `GenError` inside the catch block identifying the template file that failed and the error message.

**AC:** Running the generator with a deliberately broken template file produces a visible warning naming the broken file.

---

## CODE-L4 — Stale "section 3" comment in `targets.ts`

**Severity:** LOW

**When:** A developer reads the `cursorStandaloneInjectionText` block in `src/plugin-generator/src/spec/targets.ts` (around line 320).

**What:** A comment says "The extra `\n` in section 3 adds a trailing blank before the end-tag." Cursor-standalone injection only has 2 sections. There is no section 3. The comment is stale from an earlier version of the injection text.

**Why:** It confuses anyone trying to understand or modify the injection logic.

**How:** Update the comment to accurately describe the actual sections present.

**AC:** The comment correctly describes the injection sections that exist.

---

## REQ-GAP-2 — FR-COPY-0021 parity contract unclear

**Severity:** LOW

**What:** `model-maps.ts` has a comment on line 11 referencing `FR-COPY-0021` as the requirement governing Claude Code full model IDs. If that requirement exists in `docs/REQUIREMENTS/`, verify it specifies that Cursor and Copilot claude-map output values must be kept in sync with the Python generator's authoritative maps (not just that they exist). If it doesn't exist or is insufficient, write it or update it.

**Why:** MODEL-TODO-1 (the opus-4-6 downgrade bug) slipped through because there was no requirement enforcing parity between Python and TypeScript model maps. REQ-GAP-1 added a parity AC to FR-ARCH-0046; this gap ensures the cross-reference is consistent.

**How:** Locate FR-COPY-0021. If it exists: add an acceptance criterion stating that TypeScript output values for known Claude model tokens must match Python `CURSOR_MODEL_MAP` / `COPILOT_MODEL_MAP` authoritative values. If it does not exist: create it or merge the intent into FR-ARCH-0046.

---

## REQ-GAP-3 — Codex no-effort behavior unspecified

**Severity:** LOW

**What:** There is no requirement specifying what the generator should do when a Codex source file has a gpt model token without an effort suffix (e.g., `model: gpt-4o` with no `-high/-medium/-low`). The TypeScript generator defaults to `medium`; the Python generator emits nothing. Neither behavior is documented as the intended contract.

**Why:** Related to MODEL-TODO-4. Without a spec, it's impossible to determine which generator is right. The next person who encounters this divergence will have no authoritative source to consult.

**How:** Add an acceptance criterion to FR-COPY-0022 (or create it if missing) stating the expected output when effort suffix is absent. Choose a behavior and document the rationale.
