# plugin-generator — Requirements Change Log

## 2026-08-19 — `FR-COPY-0083` corrected: `subagent_required_model` tokens are emitted WHOLE

**Files:** `FR-COPY.md`

**Source:** Owner correction. `subagent_required_model` is instruction/guidance prose, not a keyword, format, or machine-parsed contract — so a Codex reasoning-effort qualifier is authored content, not a separable field.

- `FR-COPY-0083` statement: the earlier rule emitting a surviving Codex token as its BASE model id with the reasoning-effort suffix removed is REVERSED. A surviving token is emitted whole (`gpt-5.5-high` emits as `gpt-5.5-high`). The original rule rested on the false premise that only a bare model id is valid on this surface; that is true of a parsed config field, not of guidance text, and stripping destroyed guidance the instruction author deliberately wrote.
- The frontmatter `model:` path is UNCHANGED and remains correct: Codex genuinely splits a token into `model` + `model_reasoning_effort` there, because that field IS a parsed configuration contract. Two surfaces, two rules.
- Added `FR-COPY-0083.AC7` covering whole-token emission (`gpt-5.5-high, gpt-5.4-low` normalizes to itself under the built-in map).
- Consequence for de-duplication: two Codex tokens differing only by effort are now DISTINCT and no longer collapse, so de-dup coverage was rebuilt around two override keys mapping to the same value.
- `implementationNotes` on `FR-COPY-0083` updated; no status or implementation value changed.

---

## 2026-08-19 — plugin-generator profiles: user approval of the requirement set (26 units → `Approved`); published-vs-local caveat reverted; `FR-ARCH-0022` notes

**Files:** `FR-PROF.md`, `MODEL.md`, `FR-CLI.md`, `FR-COPY.md`, `FR-ARCH.md`, `NFR.md`

**Source:** explicit user approval, verbatim "Requirements are approved by me", plus two corrections the user directed on the maintainer docs and the TODO backlog.

- User approval recorded on the 26 units this change left `Draft`: `status` Draft→`Approved`, `approved_by`→`User`, `changed`→`2026-08-19` for `FR-PROF-0001`/`0010`/`0011`/`0020`/`0021`/`0030`/`0040`, `DATA-CFG-0003`/`0004`/`0005`/`0006`, `FR-CLI-0001`/`0020`/`0032`/`0033`/`0060`, `FR-COPY-0020`/`0021`/`0022`/`0083`/`0084`, `FR-ARCH-0057`/`0059`, `NFR-0001`/`0002`/`0003`. Every `implementation` value is UNCHANGED — approval (`status`) and code state (`implementation`) are independent fields. Seven pre-existing `Draft` units untouched by the profiles change are deliberately left `Draft` (not covered by this approval): `FR-CLI-0021`, `FR-COPY-0011`, `FR-HOOK-0005`, `FR-VAR-0070`/`0030`/`0031`, `NFR-0004`.
- Reverted the published-vs-local `@latest` regeneration caveat: removed the "Version caveat" blockquote from the Plugins section of `docs/ARCHITECTURE.md` and the matching `agents/MEMORY.md` rule ("Verify Which Artifact A 'Regenerate' Step Actually Exercises"), both added in the 2026-08-18 flip entry. User's reason: the note documents a transient pre-publish state that self-invalidates on merge — once the PR merges, the generator and the note publish together and the note is immediately stale/wrong. Intentional reversal, not a softening. The durable profile documentation in both files is kept intact.
- `FR-ARCH-0022` (OrderToken semantics): added `implementationNotes` recording the true state; `status`/`implementation` unchanged (`Approved`/`NotStarted`). Notes state that `SourceFile.order` is populated as the layer array index and read by nothing, no filename order token is parsed/consumed/tested, and current ordering comes from the layer order plus the stable lexicographic filename sort — exactly this requirement's own documented "plain filename order when absent" fallback — so present output is correct for every current input.
- `docs/TODO.md`: removed two entries — the "`OrderToken` directive kind is specified but inert" note (redundant; `FR-ARCH-0022`'s own `Approved`/`NotStarted` fields already track "approved but not built") and the "`--dry-run` under-reports writes by the per-target manifests" note (obsolete; being fixed in source). The three remaining plugin-generator TODOs (oversized-file splits, ambiguous `FR-ARCH-*` prefix, requirement ids in emitted log messages) are unchanged.

---

## 2026-08-18 — plugin-generator profiles: implemented and verified — `implementation` flips + two `FR-COPY-0083` amendments

**Files:** `FR-PROF.md`, `MODEL.md`, `FR-CLI.md`, `FR-COPY.md`, `FR-ARCH.md`, `NFR.md`

**Source:** implementation of the profiles capability via the coding workflow (autonomous mode) followed by an orchestrator audit. Records the factual code-state flips and two amendments settled during implementation; requirement `status` is untouched throughout and stays `Draft` pending user approval.

- `implementation` set to `Implemented`, with concise file-level `implementationNotes`, for the 24 units now backed by verified code: `FR-PROF-0001`/`0010`/`0011`/`0020`/`0021`/`0030`/`0040`, `DATA-CFG-0003`/`0004`/`0006`, `FR-CLI-0001`/`0020`/`0032`/`0033`/`0060`, `FR-COPY-0020`/`0021`/`0022`/`0083`/`0084`, `FR-ARCH-0059`, `NFR-0001`/`0002`/`0003`. `status` and `approved_by` are UNCHANGED on every unit — `implementation` (code state) and `status` (user approval) are independent fields; these units remain `Draft`. `FR-ARCH-0020`/`FR-ARCH-0021` keep `status="Approved"` and their `implementation` unchanged (no behavior change).
- `FR-COPY-0083` amended during implementation on two points the original text left underspecified: (1) per ruling R1 as CORRECTED by the owner on 2026-08-19, a surviving token is emitted WHOLE with its reasoning-effort qualifier retained (`gpt-5.5-high` → `gpt-5.5-high`) — the attribute is instruction guidance read by the executing agent, not a machine-parsed configuration field, so the qualifier is authored content and stripping it would destroy guidance; the frontmatter `model:` split into model + reasoning-effort is unaffected because that field IS a parsed contract; (2) per ruling R4, where a per-target override block is in force that block is the whole allowed vocabulary, so a token absent from it is DROPPED from the list — Codex `gpt-` tokens included — closing a G5 leak (a disallowed model appearing anywhere in a shipped plugin). Without a block, the target's built-in behavior applies. R4 was a spec-gap closure; R1's strip rule was a wrong premise, now reversed — see the 2026-08-19 entry.
- Verification: `tsc` clean; 655 tests green; a no-profile dry run produces 2229 paths / vfsSize 320, identical to the pre-feature baseline; all seven `core-*-light` outputs produced under `--profile lightweight`. The always-on `subagent_required_model` normalization changed 114 committed plugin files / 510 lines, with `core-antigravity` unaffected.
- Maintainer docs updated alongside these flips (outside this change log): `docs/ARCHITECTURE.md` (profile CLI options, the profile concept, filename-directive grammar incl. `profile-<name>-only`, always-on subagent-model normalization, and a published-vs-local `@latest` regeneration caveat), `agents/IMPLEMENTATION.md` (Plugin Generator workstream entry), `agents/MEMORY.md` (preventive rules).

---

## 2026-08-18 — plugin-generator profiles: new `FR-PROF-*` capability, `--profile`/`--profileSource` (`FR-CLI-0032`/`FR-CLI-0033`), profile descriptor `DATA-CFG-0006`, `ProfileOnlyToken` (`FR-PROF-0030`), effective-map-as-parameter refactor (`FR-ARCH-0059`), always-on `subagent_required_model` filtering (`FR-COPY-0083`)

**Files:** `MODEL.md`, `FR-CLI.md`, `FR-PROF.md`, `FR-COPY.md`, `FR-ARCH.md`, `NFR.md`, `GLOSSARY.md`, `SCOPE.md`, `ASSUMPTIONS.md`, `INDEX.md`, `TRACE.md`, `docs/TODO.md`

**Source:** user-driven, authored via the requirements-authoring workflow with a five-round questioning gate, then an independent adversarial review pass whose findings were applied.

- New file `FR-PROF.md` — the profile capability, all units `Draft`/`NotStarted`: `FR-PROF-0001` (Profile resolution and fail-fast validation — sole owner of the abort-on-bad-descriptor outcome; aborts non-zero before any output on a missing or unparseable file, an unknown outer key, a `core-antigravity` block, a `core-claude` inner key outside {opus, sonnet, haiku}, or an unrecognized top-level descriptor field); `FR-PROF-0010` (Effective model map resolution per target — a profile's per-target block replaces that target's built-in map entirely; a standalone inherits its parent's block; a dead inner entry is ignored silently); `FR-PROF-0011` (Exhaustive candidate skipping under the effective map — a selected candidate absent from the effective map is skipped and the scan continues; under an ACTIVE override block, no survivor → drop the `model:` line; governs the PROFILED path ONLY, deferring the unprofiled path to `FR-COPY-0020/0021/0022` by id); `FR-PROF-0020` (Destination suffixing on `spec.destination` only, never `spec.name`); `FR-PROF-0021` (Global manifest name and description suffixing); `FR-PROF-0030` (`ProfileOnlyToken` filename directive — `profile-<name>-only`, kind distinct from a target-only token); `FR-PROF-0040` (No-profile run unaffected by the profile mechanism — the regression guard).
- New file `TRACE.md` — goal-to-requirement-to-criteria traceability matrix.
- `MODEL.md`: new `DATA-CFG-0006` (`Draft`/`NotStarted`) — Profile descriptor: exactly four fields `destinationSuffix`, `pluginNameSuffix`, `pluginDescriptionSuffix`, and two-level `modelOverrides` (outer key = target `name`, inner key-space per target); a `core-antigravity` block is invalid. Amended `DATA-CFG-0003` Target inventory (`Draft`/`ToBeModified` — an active profile suffixes a target's `destination`, never `name`) and `DATA-CFG-0004` Model vocabularies (`Draft`/`ToBeModified` — resolves an effective vocabulary; a profile block replaces the built-in map). `DATA-CFG-0005` Preserved-file source location (`Draft`; `implementation` stays `Implemented` because the change is descriptive-to-match-reality) — expresses the effective preserved-file source root.
- `FR-CLI.md`: new `FR-CLI-0032` Profile selection by name (name only; a path-like value — path separator or `.json` extension — is rejected before any output; defers the descriptor abort to `FR-PROF-0001` by id, with NO `depends` edge added, deliberately, to avoid a cycle) and `FR-CLI-0033` Profile source root override (default `<source>/src/rosettify-plugins/profiles`), both `Draft`/`NotStarted`. Amended `FR-CLI-0001` Command-line invocation (`ToBeModified` — synopsis gains the two options), `FR-CLI-0020` Source resolution (`ToBeModified` — derives `profileSource`), `FR-CLI-0060` Comprehensive help (`NotStarted` — documents the profile mechanism).
- `FR-COPY.md`: new `FR-COPY-0083` subagent_required_model list normalization (always-on) and `FR-COPY-0084` Codex model normalization applied at both call sites (`fileNormalizeCodexModels` markdown + `fileCodexAgentFormat` agents-TOML), both `Draft`/`NotStarted`. `FR-COPY-0083` is a PRE-EXISTING GAP fix, NOT a profile feature: it filters each list through per-IDE selection + the effective map → survivors in SOURCE order, de-duplicated keeping the FIRST occurrence → re-emitted as a comma list; none survive → `inherit`. It applies with or without a profile and deliberately CHANGES the content of already-shipped plugins (attribute values only); structural parity (`NFR-0001`, path sets) is unaffected. Amended `FR-COPY-0020`/`FR-COPY-0021`/`FR-COPY-0022` (`ToBeModified`) — per-IDE normalization consults the effective vocabulary, selection strategy unchanged; each states its own unprofiled no-survivor behavior and defers the profiled path to `FR-PROF-0011` by id.
- `FR-ARCH.md`: new `FR-ARCH-0059` Effective model map threaded as a processor parameter (`Draft`/`NotStarted`) — refactor the normalization functions IN PLACE to take the effective map as a parameter; `PluginSpec.modelVocabulary` becomes the sole live carrier; no parallel code path. (This is NOT `ProfileOnlyToken`, which is `FR-PROF-0030`.) Amended `FR-ARCH-0020` Directive-bearing filenames and `FR-ARCH-0021` Directive grammar and validation — profile/target token EXAMPLES added AND the statement grammar reconciled from a stale dot-fenced, comma-separated notation to the tilde-separated, tilde-fenced form `name~token[~token...]~.ext` that the implementation, the one real fixture, and the user's stated intent all use. Both deliberately REMAIN `status="Approved"` with `approved_by="User"` and `implementation` unchanged: this aligns stale text with shipped behavior rather than changing a requirement — not a missed status reset. Amended `FR-ARCH-0057` Model vocabulary scope/upgrade/Codex-effort rule (`ToBeModified`) — the "GPT 5.3+" allow-list is scoped to the built-in maps only, so a profile block may name ids the built-in maps exclude.
- `NFR.md`: `NFR-0001` Per-target structural parity (`Approved`→`Draft`, `approved_by` cleared, `changed`→`2026-08-18`, `implementation` `ToBeModified`) — parity oracle now spans every profile-and-target combination, over PATHS only, including `destination` suffixing and `ProfileOnlyToken` resolution. `NFR-0002` Deterministic, reproducible output (`Draft`/`NotStarted`) — profile counted as an input dimension. `NFR-0003` Idempotent re-generation (`Draft`/`NotStarted`) — seeding via the effective preserved-file source; `depends` += `FR-CLI-0060`.
- `GLOSSARY.md`: added `Profile`, `ProfileOnlyToken`, `Effective model vocabulary`, `Effective preserved-file source`; amended `DirectiveToken` (kinds += `ProfileOnlyToken`), `ModelVocabulary` (profile block may replace the built-in map), `Preserved-file source` (references the effective root), `Plugin variant / Target` (`destination` suffixed, `name` fixed).
- `SCOPE.md`: In Scope gains profile selection/descriptor, profile effects (effective vocabulary, `destination` + manifest suffixing, profile directive token), and always-on `subagent_required_model` filtering (with or without a profile); Non-Goals gains schema migration, profile-driven target selection, changing `--pluginsSource` semantics, profile influence over release/hook posture, and changing Antigravity's model handling.
- `ASSUMPTIONS.md`: new `AC-15`–`AC-21` (profile assumptions: `--profileSource` default, filtered survivor SOURCE order + first-occurrence de-dup, dead inner entry ignored silently, standalone-inherits-parent block, inert closing-fence token, AC-6 extension to profile-scoped substitution, profile affects only its own build); `AC-9` records that the comma-separator notation was a documentation artifact never implemented.
- `INDEX.md`: added `FR-PROF.md` and `TRACE.md` header lines.
- All new and amended units are `Draft` pending user approval, EXCEPT `FR-ARCH-0020`/`FR-ARCH-0021`, which stay `Approved` (documentation-alignment only, no behavior change).
- Tracked follow-ups (logged in `docs/TODO.md`): split `FR-ARCH.md` (898 lines) and `FR-COPY.md` (418 lines), both over the 300-line refactor threshold; `OrderToken` is specified in `FR-ARCH-0020/0021`/`GLOSSARY.md` but inert (nothing consumes an order token); the `FR-ARCH-*` id prefix is ambiguous across the rosettify and plugin-generator components.

---

## 2026-07-28 — `FR-HOOK-0003` Deprecated: bootstrap prefix removed

**Files:** `FR-HOOK.md`, `GLOSSARY.md`, `ASSUMPTIONS.md`, `NFR.md`

**Source:** User-approved fix found by inspecting real generated output. Hooks are now small and `get_context_instructions` is no longer used in this flow, making the fixed lead-in string obsolete.

- `FR-HOOK-0003` marked `Deprecated` (`implementation: Removed`) with a note explaining hooks are now small and the prefix string is removed; the record is kept, not deleted, since `FR-HOOK-0009`'s manifest-order/lead-position semantics survive.
- Removed the `BOOTSTRAP_PREFIX` constant from `src/spec/bootstrap-manifest.ts` and its application in `src/bootstrap/payload.ts`; every document's body is now emitted as-is. The leading-newline strip is retained but applies UNIFORMLY to all entries rather than only the former lead — all bodies come from `stripFrontmatter` and all carried a leading newline, so stripping just the first was arbitrary.
- `FR-HOOK-0009` updated: its statement and rationale had promised an explicit, non-positional lead designation, which existed only to place the prefix. With the prefix gone the `isLead` flag was removed rather than left as a field no behavior reads; the requirement now states that no entry carries a lead designation and that manifest order governs payload sequence and determinism only. Its acceptance criterion about the lead carrying the prefix was replaced, and the record moved to `Implemented` with file/test evidence.
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
