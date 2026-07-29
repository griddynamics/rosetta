# plugin-generator — Requirements Change Log

## 2026-07-28 — `FR-HOOK-0003` Deprecated: bootstrap prefix removed

**Files:** `FR-HOOK.md`, `GLOSSARY.md`, `ASSUMPTIONS.md`, `NFR.md`

**Source:** User-approved fix found by inspecting real generated output. Hooks are now small and `get_context_instructions` is no longer used in this flow, making the fixed lead-in string obsolete.

- `FR-HOOK-0003` marked `Deprecated` (`implementation: Removed`) with a note explaining hooks are now small and the prefix string is removed; the record is kept, not deleted, since `FR-HOOK-0009`'s manifest-order/lead-position semantics survive.
- Removed the `BOOTSTRAP_PREFIX` constant from `src/spec/bootstrap-manifest.ts` and its application in `src/bootstrap/payload.ts`; the lead document's body is now emitted as-is, with only the pre-existing leading-newline strip retained (now driven by loop position rather than the removed `isLead` field).
- Removed the now-orphaned `isLead` field from `BootstrapEntryRef` (`types.ts`) and from all 9 `BOOTSTRAP_MANIFEST_ORDER` entries.
- `GLOSSARY.md`'s "Bootstrap prefix" term and the manifest-order line referencing it updated to reflect removal; `ASSUMPTIONS.md` QF-1 updated to note the prefix is now gone (not just resolved); `NFR.md` NFR-0004's criterion and implementation notes updated — "after the bootstrap prefix" no longer applies to the size-check pipeline.
- Scope: only the prefix string. `get_context_instructions` remains a live MCP tool (`src/rosetta-mcp-server/`) and is untouched, as are all `instructions/` references to it.
- Session-hook entry counts are unaffected (9/5 Claude, 9/5 Copilot, 8/4 Codex) — only the lead entry's content shrinks.

---

## 2026-07-28 — `FR-ARCH-0058`: standalone `pluginReplaceLiterals()` processor replaces reverted `PluginSpec.literalRewritePairs`

**Files:** `FR-ARCH.md`

**Source:** User-approved architecture correction, superseding the same day's earlier `FR-ARCH-0049` addendum below. `plugin-files-mode.md`'s glob-doc bullet for workflows still read `workflows/*.md` in Codex/Antigravity output even though those targets restructure `workflows/**` into `skills/<name>/SKILL.md` (`fileWorkflowToSkill`), because `FR-ARCH-0049` deliberately emits no folder-level pair for a restructuring mapping. The initial fix folded a spec-declared literal-pair lookup into `pluginRewriteReferences()` via a new optional `PluginSpec.literalRewritePairs` field; on review this was the wrong abstraction and was reverted in favor of a separate composed processor.

- New `FR-ARCH-0058` — `pluginReplaceLiterals(pairs)`: a generic `PluginProcessor` factory taking `(from, to)` literal pairs as data and returning a named `pluginReplaceLiteralsProcessor` that performs exact, unconditional substring substitution over non-binary, non-null-content, non-`verbatim` frame contents. Deliberately NO boundary/regex/path-token semantics — it targets prose and glob-documentation strings, not path references, so `pluginRewriteReferences()`'s word-boundary and dot-directory guards (FR-ARCH-0037) would be actively wrong here.
- `FR-ARCH-0049`'s addendum reverted: the spec-declared-literal-pairs sentence removed from its `<statement>`, the corresponding acceptance criterion removed, and the 2026-07-28 `literalRewritePairs` paragraph removed from its `implementationNotes` (replaced with a short pointer to `FR-ARCH-0058` and a note on why the field was reverted). All of `FR-ARCH-0049`'s pure-relocation-vs-restructuring discriminant work is unaffected.
- `types.ts`: removed `PluginSpec.literalRewritePairs?: ReadonlyArray<readonly [string, string]>`. `plugin-rewrite-references.ts`: removed step 3 of `buildRenamePairs` (the literal-pair append/re-sort).
- `spec/targets.ts`: `WORKFLOW_GLOB_TO_SKILLS_FLOW_LITERAL_PAIR` (`['WORKFLOW/COMMAND \`workflows/*.md\`', 'WORKFLOW/COMMAND \`skills/*-flow/SKILL.md\`']`, unchanged) is now supplied to `pluginReplaceLiterals()` and composed into the pipeline via `buildPipeline`'s existing `extraAfterIndexes` parameter — Codex: `[pluginReplaceLiterals([WORKFLOW_GLOB_TO_SKILLS_FLOW_LITERAL_PAIR])]`; Antigravity: the same call appended after `pluginAntigravityReduceFrontmatter, pluginAntigravitySubagentModel`. Runs after `pluginGenerateIndexes()` and before the bootstrap assembler, so hook payloads inherit the substitution. Still keyed on the long literal (including the `WORKFLOW/COMMAND ` prefix), not the bare `workflows/*.md` token, because that bare token also appears unrelated in `skills/rosetta/README.md`, which must stay unchanged.
- Why reverted: (1) `PluginSpec` surface — a data field used by only 2 of 7 specs is a worse fit than a processor composed only where needed (FR-ARCH-0004/0005's "supply specificity as data at composition time" is better served by pipeline composition than by a spec-level field consumed inside a shared processor); (2) wrong semantics — folding the pair into `pluginRewriteReferences()`'s lookup meant it inherited (or had to specially bypass) that processor's complete-boundary-token/dot-directory matching rules, which are correct for path references but not for prose; (3) a global per-target lookup inside one processor is a worse fit than per-spec pipeline composition, which makes "which targets get this correction" visible directly in `spec/targets.ts` rather than as an implicit consequence of which specs happen to populate a field.
- Companion fix (non-requirements, unchanged from the original entry): `instructions/r2/core/rules/plugin-files-mode.md`'s AGENT/WORKFLOW bullets normalized (`, ` → `/`, drop "in") to match r3's existing phrasing, so both releases carry the identical literal that the pair targets.
- Generated output is byte-equivalent to the reverted field-based approach; only the internal composition mechanism changed.

---

## 2026-07-28 — `FR-VAR-0041`: preserved Codex config must not name the omitted workflows index

**Files:** `FR-VAR.md`

**Source:** Defect found while auditing target manifests. Requirement criterion added and the stale pointer corrected.

- `.codex-plugin/plugin.json`'s `interface.defaultPrompt` instructed the agent to "consult rules/INDEX.md and workflows/INDEX.md", but `FR-VAR-0041` removes the Codex workflows index. Preserved config folders are byte-copied by `pluginCopyFiles` and never pass through `pluginRewriteReferences`, so the dangling pointer would ship silently.
- Criterion added requiring the preserved `core-codex` config to name no workflows folder or workflows index.
- Pointer corrected in `src/rosettify-plugins/plugins/core-codex/.codex-plugin/plugin.json` to reference the bundled skills instead.

Audit note: `core-claude`'s `.claude-plugin/plugin.json` `"commands": "./workflows/"` is the only other manifest naming that folder and is correct — Claude exposes workflows as slash commands by manifest pointer without renaming the folder.

---

## 2026-07-28 — `FR-ARCH-0049`: folder-level rewrite restricted to pure folder relocations

**Files:** `FR-ARCH.md`

**Source:** User-directed correction. The requirement was under-specified and mandated behavior that is wrong for restructuring mappings.

- `FR-ARCH-0049` previously required, without qualification, that a bare `workflows/` token be rewritten to the target folder. That is correct only for a pure folder relocation such as `workflows`→`commands`, where the document keeps its basename. It is wrong for a restructuring mapping such as `workflows/<name>.md`→`skills/<name>/SKILL.md`, where a bare folder token carries no document identity: rewriting it yields a path that does not exist and corrupts prose and glob mentions that merely contain the token.
- The statement now emits a folder-level pair only when every in-scope frame from the source folder lands directly in the target folder as a single path segment (extension-only renames such as `.md`→`.mdc` still qualify). Restructuring mappings rewrite exact per-document references only.
- Two acceptance criteria added covering the restructuring case and the prose/glob non-rewrite case; the existing bare-token criterion is now scoped to pure relocations.
- Status moved to `ToBeModified` — `buildRenamePairs` requires the corresponding change.

Observed corruption motivating this: `rules/plugin-files-mode.md` (the bootstrap lead document) rendered `` WORKFLOW/COMMAND `skills/*.md` ``, contradicting its own `` SKILL `skills/*/SKILL.md` `` entry, and `skills/post-mortem/SKILL.md` rendered `(skills/agents/skills/rules)`. Both already present in committed `core-antigravity` output.

---

## 2026-07-28 — Correct `FR-HOOK-0007` r3 session-start entry counts

**Files:** `FR-HOOK.md`

**Source:** User-approved correction of a pre-existing defect surfaced during Phase 8 code review. Requirements only.

- `FR-HOOK-0007` — the r3 acceptance counts were derived on the assumption that r3 loses only the workflows index relative to r2. r3 in fact consolidates the five split `bootstrap-*` rules into a single `bootstrap-alwayson.md`, and `BOOTSTRAP_MANIFEST_ORDER` skips the four absent basenames, so every r3 count was overstated by three. Corrected Claude/Copilot r3 from 8 to 5 and `core-codex` r3 from 7 to 4. The r2 counts (9 and 8) were already correct and are unchanged.

Counts verified empirically by generating both releases for all seven targets from `instructions/`.

---

## 2026-07-27 — Generate `core-codex` workflows as skills

**Files:** `FR-COPY.md`, `FR-VAR.md`, `FR-HOOK.md`, `STRUCTURES.md`, `GLOSSARY.md`, `ASSUMPTIONS.md`, `INDEX.md`

**Source:** User-approved requirements change. Requirements only; implementation and generated plugins are unchanged.

- `FR-COPY-0080` — requires the generator to reuse the existing workflow-to-skill transform for the `core-codex` and `core-antigravity` targets; the configured roots are `.agents/skills/` and `skills/`; emitted phase files have no YAML frontmatter.
- `FR-VAR-0041` — requires the generator to generate the rules index only for the `core-codex` target and omit the workflows index from its output and session-start hooks.
- `FR-VAR-0042` — requires the generator to package `core-codex` workflows as skills, emit no `.agents/workflows/` folder, retain Codex normalization, and isolate `core-antigravity`-only transforms.
- `FR-HOOK-0007` — reduces the generated `core-codex` session-start entry counts by one because the generator emits no workflows index for that target.
- `FR-STRUCT-0010/0030` — updates the generated `core-codex` target tree to the skills-based layout and requires body-only phase files in the `core-codex` and `core-antigravity` outputs.

All six affected requirement units were approved by the user on 2026-07-27.

---

## 2026-07-23 — Add Antigravity target; deprecate Gemini CLI (ticket #138)

**Files:** `MODEL.md`, `FR-VAR.md`, `FR-COPY.md`, `FR-CLI.md`, `SCOPE.md`, `REFERENCES.md`, `GLOSSARY.md`, `STRUCTURES.md`, `ASSUMPTIONS.md`, `INDEX.md`

**Source:** User decisions (D1–D8, Group A–D) grounded in the authoritative antigravity.google documentation. Requirements authoring only; implementation, obsolete-guide rewrite, and joint testing deferred to a coding-flow.

**Added — a single combined `core-antigravity` target** serving all three Antigravity products (Antigravity, Antigravity CLI, Antigravity IDE), which all read `plugin.json`. No separate standalone target (in-repo use = extract the plugin; the extra `plugin.json` is ignored).
- `DATA-CFG-0003` — target inventory six → **seven** (+`core-antigravity`); status Approved → Draft pending re-approval.
- `DATA-CFG-0005` — preserved-file set for `core-antigravity`: `plugin.json`, `hooks.json.tmpl` (both at plugin root); note that `.tmpl` renders to a real output file and never ships as `.tmpl`.
- `FR-VAR-0080/0081/0082/0083` — combined-plugin output; content mapping (`rules`+`templates`→`rules/`; `workflows`+`skills`→`skills/`; `agents`→`agents/`; `configure`→`configure/` verbatim); bootstrap via `trigger: always_on` rule (no session-start hook); hook template (PreInvocation, no bootstrap payload) and exclusion of the advisory PostToolUse hooks `lint-format`/`md-file`/`loose-files` (Antigravity ignores hook output on PostToolUse — not synced to `hooks/dist`, not in `hooks.json.tmpl`). No `mcp_config.json` produced (no Rosetta MCP server for Antigravity).
- `FR-COPY-0080/0081/0082` (Antigravity-only) — workflow→skill transform (phases under `skills/<name>/phases/`; phase references rewritten to `APPLY SKILL FILE \`phases/<file>.md\``); frontmatter reduction to `name`+`description` (drops `model`, `mode`, `readonly`, `baseSchema`); `subagent_required_model`→`inherit`.

**Grounded in owner's verified work:** the Antigravity hooks contract is VERIFIED/COMPLETE (`docs/hooks/antigravity.md`, branch `feat/antigravity-hooks-138`) and confirmed identical across all three products — `SessionStart` is not an event (bootstrap uses an always-on rule), `PostToolUse` output is ignored (advisory hooks excluded). Additional decisions: rule frontmatter (including any authored `trigger:`) is preserved unchanged — the generator never sets activation (the human owns always-on vs not); `configure/` kept verbatim (an Antigravity install can author for other tools); workflows→skills is required because the CLI has no workflows and one combined plugin avoids engineers mis-selecting among separate plugins. Pending owner confirmation: folder-index generation (AG-5) and `mcp_config.json` omission.

**Model handling rationale (user):** Antigravity maps its selectable model tiers (flash_lite/flash/pro) to extremely old models, so an explicit model is worse than none. Rule: the subagent-spawn attribute `subagent_required_model` → `inherit`; all other model references dropped. Antigravity-only; the other six targets are unchanged. No Antigravity model vocabulary is defined.

**Deprecated — Gemini CLI** as a generator target (superseded by Antigravity CLI). Recorded as a note in `SCOPE.md`; no Gemini CLI product reference exists in the requirements or in `src/rosettify-plugins/` code today (only legitimate `gemini-*` model identifiers, retained).

**CLI defaults (FR-CLI-0012):** `--deterministic-hooks` now defaults to `false`, so `npx -y rosettify-plugins@latest` (no flags) generates release `r3` with deterministic hooks off; opt in with `--deterministic-hooks true`. Trade-off: a no-flag run places no runtime hook bundles. Generator package minor version bumped 3.0.0 → 3.1.0. The `configure/antigravity.md` guide was rewritten from the antigravity.google documentation.

---

## 2026-07-13 — Default release r2 → r3 (FR-CLI-0010)

**Files:** `FR-CLI.md`

**Original:** FR-CLI-0010 defaulted the release argument to `r2`.

**Changed:** Default is `r3` — at v3 release r3 becomes the stable release, and the rationale ("the stable release is the default") resolves to r3. Requested by project owner; lands via branch `on-v3-release` (PR #130), merged only at v3 release. Code: `src/rosettify-plugins/src/cli.ts` `--release` default.

---

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
**Files:** `FR-CLI.md`. The tool is a self-contained utility: global `--source` (default `.`) with derived inputs `<source>/instructions`, `<source>/src/rosettify-plugins/plugins`, `<source>/hooks`, output `<source>/plugins`, each independently overridable via `--instructionsSource`/`--pluginsSource`/`--hooksSource`/`--output`. No repository-root argument. Status `Draft`.

### RECONCILIATION-6 — Exclude templates/shell-schemas entirely (FR-COPY-0011)

**Files:** `FR-COPY.md`, `GROUND-TRUTH.md`, `plugin-generator-SPECS.md`

**Context:** Owner instruction 2026-06-05: `templates/shell-schemas/*` (agent-shell.md, skill-shell.md, workflow-shell.md) are authoring-only frontmatter schemas, not needed in any plugin. Exclude them.

**Changes:** FR-COPY-0011 statement/acceptance extended to exclude the whole `templates/shell-schemas/**` folder (exclude now supports folder globs); status → `Draft`. The parity baseline (`agents/TEMP/old-gen-r2|r3`) was regenerated and the 12 shell-schemas files per release removed so the baseline equals the new generator's intended output. New generator code MUST add `templates/shell-schemas/**` to the templates SpecEntry exclude for every target.

## 2026-06-09 — No identity branching / no identity-discriminant flags (owner instruction)

**Context:** Owner instruction: the engine must have NO branching in any processor on IDE/target identity (Claude/Cursor/Copilot/Codex), AND no branching on an identity-discriminant flag — a flag whose value set enumerates IDE/target/case identities (`hookEntryShape`, `ModelVocabulary.kind`); such a flag is identity relabeled ("you cannot use flags after Copilot/Cursor either"). The prescribed mechanism is composition: small single-purpose processors (P0); per-case behavior as a separate case-specific processor placed only in the needing spec's pipeline, selected by composition not a branch (P1); shared logic in low-level reusable functions composed by those processors (P2); path-specific behavior scoped by `SpecEntry` source globs (P3). This refines FR-ARCH-0004/NFR-0006, which the existing code satisfied only in letter by switching on identity-discriminant enums. Evidence (code sites for the follow-up fix, open task #8): `src/rosettify-plugins/src/bootstrap/payload.ts` `switch(shape)`; `file-processors/file-normalize-models.ts` `switch(vocabulary.kind)`; `plugin-processors/plugin-assemble-bootstrap.ts` `bootstrap_hooks_${shape}`; `types.ts` `hookEntryShape` and `ModelVocabulary.kind` enums.

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

## 2026-07-13 — Per-run deterministic-hooks override (new FR-CLI-0012)

**Files:** `FR-CLI.md`, `FR-HOOK.md`, `MODEL.md`, `GLOSSARY.md`, `INDEX.md`

**Change:** New FR-CLI-0012: an optional CLI argument overrides the release descriptor's `deterministic_hooks` template variable per run (e.g. r3 without deterministic hooks), replacing the value before rendering and hook-bundle sync. FR-HOOK-0020 rekeyed from "the selected release enables" to "the effective deterministic-hooks value" (+1 override criterion, depends +FR-CLI-0012). DATA-CFG-0001 notes and GLOSSARY updated with the effective-value concept; single-source-of-configuration intact (override replaces the descriptor value at resolution time).

**Status:** FR-CLI-0012 and FR-HOOK-0020 `Approved` by owner 2026-07-13. Implemented same day (cli.ts, generate.ts, types.ts + generate.test.ts override matrix; 447 tests pass).

## 2026-07-01 — Copilot dedup workaround retired; NFR-0004 measures raw content

### RECONCILIATION-12 — FR-HOOK-0006 retired

**Files:** `FR-HOOK.md`, `FR-VAR.md`, `ASSUMPTIONS.md`

**Change:** Copilot's duplicate-invocation bug (root of `FR-HOOK-0006`) is fixed upstream; the per-entry lock workaround is removed from code. `FR-HOOK-0006` deleted — fully redundant with `FR-HOOK-0005`'s own entry-shape criteria. `FR-VAR.md` references redirected to `FR-HOOK-0005`. `ASSUMPTIONS.md` QF-3 marked resolved.

**Status:** No remaining `FR-HOOK-0006` references in the requirements tree.

### RECONCILIATION-13 — NFR-0004 measures original content, not wrapped payload

**Files:** `NFR.md`

**Change:** The 10,000-char check measured the JSON-wrapped/escaped payload (a Claude-shaped proxy), giving Copilot's merged-emit entries a false pass. Now measures the raw content directly — IDE-shape-independent.

**Status:** `Draft` (implementation changed; pending re-approval).
