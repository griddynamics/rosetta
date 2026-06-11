# plugin-generator — Requirements Change Log

## 2026-06-04 — Baseline reconciliation (three contradictions)

**Context:** Implementation planning for the TypeScript/npx re-implementation revealed three contradictions between the reverse-engineered requirements and the actual generator baseline output (`agents/TEMP/old-gen-r2/`, `agents/TEMP/old-gen-r3/`). Per project owner's instruction, requirements are corrected to match baseline; status set to Draft pending owner review.

---

### RECONCILIATION-1 — Claude model normalization algorithm (FR-COPY-0020, FR-COPY-0021)

**Files:** `FR-COPY.md`

**Original:** FR-COPY-0020 stated "selecting the first model from a comma-separated list" as universal across all IDEs. FR-COPY-0021 stated Claude "infers from substrings" without clarifying the scan strategy.

**Baseline reality:** Claude does NOT take the first model overall. It scans the comma-separated list for the first token containing a claude-compatible substring (`opus`, `sonnet`, or `haiku`) and maps it to the Claude short name, skipping any leading non-claude tokens (e.g. `gpt-*`, `gemini-*`). Falls back to `inherit` if no claude-compatible token is found. Cursor and Copilot do take the first model overall (confirmed — behavior unchanged). Codex scans for first `gpt-*` token (unchanged).

**Baseline evidence (r3):**
- `reviewer`: source `model: gpt-5.4-medium, gemini-3.1-pro-preview, claude-4.6-sonnet` → claude output `model: sonnet` (skips gpt- and gemini-, picks first claude-* = `claude-4.6-sonnet`, substring `sonnet`)
- `validator`: source `model: gpt-5.4-medium, gemini-3.1-pro-preview, claude-4.6-sonnet` → claude output `model: sonnet`
- `architect`: source `model: claude-4.8-opus-high, gpt-5.5-high, gemini-3.1-pro-high` → claude output `model: opus` (first token is claude-*, contains `opus`)
- Cursor `reviewer`: `model: gpt-5.4` (first-model-overall → `gpt-5.4-medium` → CURSOR_MODEL_MAP → `gpt-5.4`)
- Copilot `reviewer`: `model: GPT-5.4` (first-model-overall → COPILOT_MODEL_MAP)

**Changes:** FR-COPY-0020 statement updated to describe per-IDE selection strategy with cross-reference to FR-COPY-0021/0022. FR-COPY-0021 statement rewritten to describe the scan-for-first-claude algorithm with substring matching and `inherit` fallback; acceptance criteria expanded with concrete examples from the baseline. Both units set to status `Draft`.

---

### RECONCILIATION-2 — core-copilot hooks.json count and locations (FR-VAR-0030, STRUCTURES.md)

**Files:** `FR-VAR.md`, `STRUCTURES.md`, `ASSUMPTIONS.md`

**Original:** FR-VAR-0030 described runtime config at the plugin root as "a `SpecEntry`/`fileRename()` target." STRUCTURES.md showed only two hooks-related entries (`hooks.json` root and `hooks/hooks.json + hooks/*.js`) and omitted `.github/plugin/hooks.json` from the generated-file listing. No requirement described three distinct hooks.json files.

**Baseline reality:** `core-copilot` contains exactly three `hooks.json` files at distinct paths:
1. `.github/plugin/hooks.json` — plugin-form hooks, rendered from `.github/plugin/hooks.json.tmpl`
2. `hooks.json` (plugin root) — alternate-name copy of `.github/plugin/hooks.json`; byte-identical
3. `hooks/hooks.json` — standalone-form hooks, rendered from `hooks/hooks.json.tmpl`; distinct content (`"sessionStart": []`)

**Changes:** FR-VAR-0030 statement updated to enumerate all three files with their provenance and byte-identity constraint. New FR-VAR-0031 added to capture the alternate-name copy mechanism. STRUCTURES.md core-copilot section rewritten to show all three files with provenance annotations. AC-14 added to ASSUMPTIONS.md. FR-STRUCT-0010 depends updated to include FR-VAR-0031.

---

### RECONCILIATION-3 — Root copilot hooks.json is a copy, not a rename (FR-VAR-0030 area → FR-VAR-0031)

**Files:** `FR-VAR.md`

**Original:** FR-VAR-0030 implied the root `hooks.json` was produced by a `SpecEntry`/`fileRename()` operation, which would eliminate the source path from the output and result in only one file.

**Baseline reality:** Both `hooks.json` (root) and `.github/plugin/hooks.json` are present simultaneously with byte-identical content (r2 MD5: `b53bc4cfbc0c19eb6ceebd4717211b6c` for both). This is an alternate-name duplication (FR-COPY-0033 pattern), not a rename. A `fileRename()` would remove one of them.

**Changes:** FR-VAR-0031 (new unit) explicitly requires the alternate-name copy mechanism (`SpecEntry`, not `fileRename()`), the coexistence of both files, and their byte-identity. FR-VAR-0030 depends updated to include FR-COPY-0033 and FR-VAR-0031.

---

## 2026-06-04 — Orchestrator ground-truth pass (bootstrap payload, decoded from baseline)

**Context:** The orchestrator personally read all requirements + the tech specs/plan and byte-decoded the baseline bootstrap structures to pin parity ground truth before implementation (engineer-error prevention). Findings captured in the authoritative `plans/plugin-generator/GROUND-TRUTH.md` and reconciled into requirements below. A SPEC error (plugin-root "folded into lead", undercounted entries) was found and corrected in `plugin-generator-SPECS.md`; the *requirement* (FR-HOOK-0007) was already correct in intent and is now enriched with exact bytes.

### RECONCILIATION-4 — Plugin-root entry is a separate appended entry; exact counts (FR-HOOK-0007)

**Files:** `FR-HOOK.md`

**Baseline reality:** The plugin-root path entry is a distinct, final entry appended to each session-hook target's bootstrap payload — NOT folded into the lead document. Payload entry count = (present manifest docs) + 1. Confirmed: claude/codex/copilot emit **9 entries for r2, 8 for r3**. Exact per-IDE plugin-root command strings decoded (claude `${CLAUDE_PLUGIN_ROOT}`; codex workspace-root probe → `.agents`; copilot agentPlugins-base probe via `commands/coding-flow.md` → `$root`). Cursor emits no bootstrap payload at all (no template placeholder).

**Changes:** FR-HOOK-0007 statement + acceptance enriched with the separate-entry rule, the 9/8 counts, the exact claude/codex/copilot strings, and the cursor-no-payload fact; status → `Draft`.

### RECONCILIATION-5 — Exact per-IDE bootstrap entry field shapes (FR-HOOK-0005)

**Files:** `FR-HOOK.md`

**Baseline reality:** claude entries carry `"once": true` under `SessionStart[0]` (`matcher:"startup"`); codex entries carry `statusMessage:"Loading Rosetta bootstrap"`+`timeout:30` (no `once`, `matcher:"startup|resume"`); copilot entries carry `bash`+`powershell` under lowercase `sessionStart` (`version:1`, no matcher) with a per-entry 0-based lock index. Entries are joined by `, ` and injected raw into the preserved template's `{{{bootstrap_hooks_<ide>}}}` placeholder; the wrapper (matcher, advisory blocks, version) is template-literal.

**Changes:** FR-HOOK-0005 acceptance enriched with the exact per-IDE entry shapes, matchers, and join separator; status → `Draft`.

## 2026-06-05 — Architecture & CLI target-state correction (owner review)

Owner review of the implementation surfaced overfitting and bolt-on options that violate the data-driven, primitive-only architecture. Requirements corrected to the clean target state (forward-looking; not narrating the implementation).

### RECONCILIATION-7 — Processors are universal and reusable (new FR-ARCH-0004)
**Files:** `FR-ARCH.md`, `MODEL.md`. New FR-ARCH-0004: every processor is a generic, reusable unit; no processor names/branches on a concrete target, release, folder, or filename; copying is a generic `pluginCopyFiles`/`pluginMirrorFiles(from,to)`, directory creation is a generic `createFolder(path)`, reference rewriting derives renames from the frames (FR-ARCH-0049). DATA-CFG-0002 reinforced: descriptor holds no bespoke per-target/per-release flag; `mirrors` is allowed as data for the generic mirror processor. (Implications: code fields `extensionRewrites`, `cascadedFolderRewrites`, `ensureDirs`, `bootstrapStrategy`, and the `createHookFolderInR2` flag are all bespoke flags forbidden by DATA-CFG-0002/FR-ARCH-0004 and are being removed/refactored.) Status `Draft`.

### RECONCILIATION-8 — Bootstrap delivery is a property of preserved templates/rules, not a generator strategy (FR-VAR-0070)
**Files:** `FR-VAR.md`. The generator assembles bootstrap values uniformly for every target and size-checks all (NFR-0004); whether bootstrap reaches the agent via hooks vs auto-loaded rules/instructions is decided by the target's preserved templates/rules (placeholder present or not), not by a generator delivery-strategy field. Cursor (both forms) delivers via native `alwaysApply` rules; its hook templates carry no bootstrap placeholder. Status `Draft`.

### RECONCILIATION-9 — `--source` model replaces repo-root (FR-CLI-0001/0020/0021/0030)
**Files:** `FR-CLI.md`. The tool is a self-contained utility: global `--source` (default `.`) with derived inputs `<source>/instructions`, `<source>/src/plugin-generator/plugins`, `<source>/hooks`, output `<source>/plugins`, each independently overridable via `--instructionsSource`/`--pluginsSource`/`--hooksSource`/`--output`. No repository-root argument. Status `Draft`.

### RECONCILIATION-6 — Exclude templates/shell-schemas entirely (FR-COPY-0011)

**Files:** `FR-COPY.md`, `GROUND-TRUTH.md`, `plugin-generator-SPECS.md`

**Context:** Owner instruction 2026-06-05: `templates/shell-schemas/*` (agent-shell.md, skill-shell.md, workflow-shell.md) are authoring-only frontmatter schemas, not needed in any plugin. Exclude them.

**Changes:** FR-COPY-0011 statement/acceptance extended to exclude the whole `templates/shell-schemas/**` folder (exclude now supports folder globs); status → `Draft`. The parity baseline (`agents/TEMP/old-gen-r2|r3`) was regenerated and the 12 shell-schemas files per release removed so the baseline equals the new generator's intended output. New generator code MUST add `templates/shell-schemas/**` to the templates SpecEntry exclude for every target.

## 2026-06-09 — No identity branching / no identity-discriminant flags (owner instruction)

**Context:** Owner instruction: the engine must have NO branching in any processor on IDE/target identity (Claude/Cursor/Copilot/Codex), AND no branching on an identity-discriminant flag — a flag whose value set enumerates IDE/target/case identities (`hookEntryShape`, `ModelVocabulary.kind`); such a flag is identity relabeled ("you cannot use flags after Copilot/Cursor either"). The prescribed mechanism is composition: small single-purpose processors (P0); per-case behavior as a separate case-specific processor placed only in the needing spec's pipeline, selected by composition not a branch (P1); shared logic in low-level reusable functions composed by those processors (P2); path-specific behavior scoped by `SpecEntry` source globs (P3). This refines FR-ARCH-0004/NFR-0006, which the existing code satisfied only in letter by switching on identity-discriminant enums. Evidence (code sites for the follow-up fix, open task #8): `src/plugin-generator/src/bootstrap/payload.ts` `switch(shape)`; `file-processors/file-normalize-models.ts` `switch(vocabulary.kind)`; `plugin-processors/plugin-assemble-bootstrap.ts` `bootstrap_hooks_${shape}`; `types.ts` `hookEntryShape` and `ModelVocabulary.kind` enums.

### RECONCILIATION-10 — No identity branching; per-case variation by composition (new FR-ARCH-0005)

**Files:** `FR-ARCH.md`, `FR-HOOK.md`, `MODEL.md`, `NFR.md`, `FR-COPY.md`, `GLOSSARY.md`, `INDEX.md`

**Changes:**
- **New `FR-ARCH-0005`** — the rule: no processor branches on IDE/target identity or on an identity-discriminant flag; variation is expressed by composition (P0–P3, stated explicitly). Outcome-tested by inspection. Status `Approved`.
- **`FR-ARCH-0004`** tightened — "supply as data" explicitly excludes identity-discriminant flags; cross-references FR-ARCH-0005; +1 acceptance criterion. Status `Approved`.
- **`FR-ARCH-0002`** realigned — per-case file behavior is selected by which `FileProcessor`s a spec composes, not an identity-discriminant field; +1 criterion. Status `Approved`.
- **`FR-ARCH-0046`** reframed — model normalization is per-vocabulary case-specific `FileProcessor`s sharing low-level helpers, no `vocabulary.kind` switch; title updated. Status `Approved`.
- **`FR-HOOK-0005`** realigned — per-IDE hook entry shape produced by a case-specific entry builder composed per spec, no `hookEntryShape` switch; +1 criterion. Status `Approved`.
- **`DATA-CFG-0002`** realigned — descriptor holds no identity-discriminant flag; +1 criterion. Status `Approved`.
- **`NFR-0007`** realigned — catalog lists per-vocabulary model-normalization processors instead of a single `fileNormalizeModels`. Status `Approved`.
- **`FR-COPY-0020`, `FR-COPY-0021`, `FR-COPY-0033`** — references to the singular `fileNormalizeModels()` replaced by the per-vocabulary model-normalization processors (removes the contradiction created by the FR-ARCH-0046 reframe). These units stay `Draft` (their independent RECONCILIATION-1 model-algorithm review is still pending owner approval).
- **`FR-ARCH-0055`** — `depends` extended with `FR-HOOK-0005` (no wording change; remains the identity-agnostic orchestrator that composes a per-case entry builder).
- **`GLOSSARY.md`** — `ModelVocabulary` clarified as pure data; new terms **Case-specific processor**, **Identity-discriminant flag (forbidden)**, **Genuine behavior flag (permitted)**.
- **`INDEX.md`** — FR-ARCH-0005 added to the "New / target-state design" list.
- **`<implementation>`** for every unit above set to `ToBeModified` (existing TS code violates the new rule; the fix is open task #8).

**Validation:** Reviewer subagent ran the rubric — no circular dependencies; FR-ARCH-0055 vs FR-HOOK-0005 confirmed compatible; no hallucinations (all five code sites confirmed present). One Must finding (stale `fileNormalizeModels()` in FR-COPY/NFR-0007) fixed; one Nit (define "genuine behavior flag") fixed.

## 2026-06-09 — Retire dead `includeBootstrapRules`; bootstrap-rule delivery is template-driven

### RECONCILIATION-11 — FR-HOOK-0004 amended (bootstrap-rule inclusion is not a flag)

**Files:** `FR-HOOK.md`

**Context:** Origin trace of the code's `includeBootstrapRules` field (`types.ts:92`): set in 6 specs but **never read** (dead). Its concept came from FR-HOOK-0004, but the bootstrap-rule-inclusion half was superseded by FR-VAR-0070 / RECONCILIATION-8 (bootstrap delivery is decided by the preserved templates, not a generator field). The index-inclusion half (`includeIndexEntries`) remains live and used.

**Changes:** FR-HOOK-0004 retitled "Index-entry inclusion flag (bootstrap-rule delivery is template-driven)"; statement now gates only index entries (`includeIndexEntries`) and states bootstrap-rule delivery follows the preserved templates (FR-VAR-0070) with no bootstrap-rule inclusion flag in the descriptor; acceptance updated (index-disabled → no index entries; bootstrap-rule delivery per templates; descriptor carries no `includeBootstrapRules`); `depends` → FR-VAR-0070; `implementation` → `ToBeModified` (remove the dead `includeBootstrapRules` field from `types.ts` + 6 specs). Status `Approved`.

**Sibling code decisions (not requirement changes — logged in `plans/plugin-generator/report.md` + `SESSION-CONTEXT.md`):** `createHookFolderInR2` → **delete** (no requirement ever created it; baseline-overfit / wrong-prompt artifact). `deterministicHooks` branch → **RESOLVED compliant** (genuine behavior flag from release config, DATA-CFG-0001 / FR-HOOK-0020; the branch holds no release name, so NFR-0006 ✓ and FR-ARCH-0005 permits it).

## 2026-06-10 — Claude Code model output format: short names → full model IDs

**Context:** Owner instruction: Claude Code model normalization must output full model IDs (`claude-sonnet-4-6`, `claude-haiku-4-5`, `claude-opus-4-8`) instead of the previous short names (`sonnet`, `haiku`, `opus`). Scope: Claude Code only. Cursor and Copilot model mappings unchanged.

### UPDATE-1 — FR-COPY-0021: Claude model normalization output format

**Files:** `FR-COPY.md`, `MODEL.md`, `docs/ARCHITECTURE.md`

**Change:** FR-COPY-0021 statement updated: "map that entry to the corresponding Claude short name (`opus`, `sonnet`, or `haiku`)" → "map that entry to the corresponding Claude full model ID (`claude-opus-4-8`, `claude-sonnet-4-6`, or `claude-haiku-4-5`)". Rationale, all acceptance criteria result assertions, implementation notes, and notes updated accordingly.

DATA-CFG-0004 acceptance criteria updated: `Claude→'sonnet'` → `Claude→'claude-sonnet-4-6'`.

ARCHITECTURE.md plugin section updated: "Claude Code uses short names (`sonnet`, `opus`, `haiku`)" → "Claude Code uses full model IDs (`claude-sonnet-4-6`, `claude-opus-4-8`, `claude-haiku-4-5`)".

**Status:** FR-COPY-0021 stays `Draft` (pending implementation). DATA-CFG-0004 remains `Approved` (acceptance criteria updated in place).
