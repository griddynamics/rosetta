# plugin-generator — Requirements Change Log

## 2026-09-01 — #315 implementation landed: 78 units re-statused against the shipped code

**Files:** `FR-SET.md`, `FR-GEN.md`, `FR-HOOK.md`, `FR-ARCH.md`, `FR-COPY.md`, `FR-VAR.md`, `FR-PROF.md`, `FR-CLI.md`, `MODEL.md`, `NFR.md`, `REFERENCES.md`, `STRUCTURES.md`, `GLOSSARY.md`, `ASSUMPTIONS.md`

**Source:** verification pass over the landed #315 implementation on `feat/315-plugin-sets`. This entry records status only — it does not restate the 2026-09-01 authoring entry above, which stands. Every claim below was checked against the tree by symbol grep, by running the generator, or by running the test suites; no `implementation` value was flipped on the strength of the plan alone.

**Outcome across the 72 units tagged `ticketId="315"`** (81 counting the nine that carry `138, 315` and are shared with that ticket): 45 `ToBeModified` + 33 `NotStarted` -> **71 `Implemented`, 10 `ToBeModified`, 0 `NotStarted`**. Every unit flipped to `Implemented` carries `<implementationNotes>` naming artifacts by symbol, never by line range. This change adds 12 new units: the eight `FR-SET-*`, plus `DATA-CFG-0007`, `DATA-CFG-0008`, `FR-CLI-0034` and `FR-ARCH-0025`.

- **Implemented (54).** All eight `FR-SET-*` except `FR-SET-0050`; `FR-GEN-0010`; `FR-HOOK-0001/0007/0020`; `FR-ARCH-0001/0023/0025/0049/0057/0058/0060`; all three `FR-STRUCT-*`; `FR-SEED-0001/0002` and `FR-COPY-0020/0021/0022/0080/0081/0082/0083/0084`; `DATA-CFG-0002/0003/0005/0006`; `FR-PROF-0001/0010/0020/0030/0040`; `FR-CLI-0001/0032/0040/0041`; `FR-VAR-0010/0020/0041/0042/0080/0081`; `NFR-0001`; `INT-IDE-0001/0002/0003`. Key evidence: the new `plugins.json` catalog with `loadPluginCatalog`/`selectSets`/`allDeclaredDestinations`/`resolveHookModules`/`defaultConfigPath` and closed field allow-lists raising `PluginCatalogError` at pre-flight; `buildSpecsForSet`/`TARGET_BUILDERS` replacing `buildAllSpecs`; `HOOK_LAYOUTS` making per-IDE hook shape data; `buildHooksDocument` serializing via `JSON.stringify`; 49 folders from one invocation, exit 0; suites 919/919, 1441/1441, 432/432, e2e 132/132.
- **`FR-HOOK-0007` counts corrected.** The recorded fixed payload counts (Claude and Copilot 9/5, Codex 8/4) were stale; the real counts are **7 for r2 and 3 for r3** on both Claude and Codex, the two index entries having left the payload. Asserted in `tests/e2e/bootstrap-session-start.e2e.test.ts`.
- **Still `ToBeModified` (20), each for a named, verified reason** — the spec requires something the code does not do, so marking them Implemented would be false: `FR-SET-0050` (`requires` is not derived into the manifest description — the wording in `plugins.json` is hand-authored); `FR-GEN-0011` and `FR-VAR-0083` (templates no longer iterate a hook list — every `hooks.json.tmpl` is the single line `{{{hooks_json}}}`); `FR-HOOK-0004` and `FR-HOOK-0009` (`includeIndexEntries` was NOT removed, only pinned `false`, and `BOOTSTRAP_MANIFEST_ORDER` still lists the two `__*_index__` entries); `FR-HOOK-0022` (undeclared stale bundles are never swept from a hook folder); `FR-ARCH-0020`/`0021` (the `~1a~` order-token grammar does not exist and duplicate tokens are silently de-duplicated rather than rejected); `FR-CLI-0030`/`0031` (no missing-folder check, and an empty selection always exits non-zero); `FR-CLI-0034` (a relative `--config` is not resolved against `<source>`); `FR-CLI-0060` (help never enumerates the descriptor fields); `FR-CLI-0042` (all progress goes to stderr, nothing to stdout); `FR-PROF-0021` (marketplace names DO carry a `rosetta-` prefix); `FR-COPY-0011` (three rules are excluded, not the two named); `DATA-CFG-0007` (`id` vs shipped `name`; `template`/`releases`/`bootstrap` are required, not defaulted); `FR-VAR-0030` (the copilot `hooks/hooks.json` is not the standalone form); `FR-VAR-0072`/`0050`/`0051` (see below).
- **Behavioural gap found during verification.** The standalone plugin-root injection never fires against the real `r3` tree: `pluginInjectSections` skips when its `# PREP STEP 1:` anchor is absent, and `instructions/r3/core/rules/plugin-files-mode.md` has no such anchor. Only `tests/fixtures/sample-instructions/r3/core/rules/plugin-files-mode.md` contains it, so the unit tests pass while the shipped standalone plugins carry no injected plugin-root text. Recorded on `FR-VAR-0072`, `FR-VAR-0050` and `FR-VAR-0051`.
- **`FR-GEN-0001..0004` stay `NotStarted` (dormant).** `pluginGenerateIndexes` is retained and still composed in the pipeline with a unit test, but no set declares an index, so no `INDEX.md` reaches any output. Capability retained is not capability implemented.
- **`--domain` meaning change recorded.** The one behaviour an existing caller can feel: `--domain` silently changed from an instruction-layer selector to a filter over declared sets, with no default. Captured in `FR-CLI-0030`/`0031`.
- **Org-overlay layering retired in the text.** Per the owner's confirmation that org became a set and org layering is gone, the org-overlay framing was corrected — not merely annotated — in `GLOSSARY.md` ("Domain / instruction folder" and the "Layer merge" definition), `ASSUMPTIONS.md` (AC-23's justification, OQ-3's "`--domain` overlays"), `FR-CLI-0030`'s notes, `FR-ARCH-0002`'s rationale and one `FR-COPY-0011` criterion. Folder layering WITHIN a set is unaffected and still governs the combo `rosetta` set's five folders.
- **Second pass — text corrected to the shipped design, then re-judged.** `DATA-CFG-0007` was rewritten to the real catalog contract: the identity field is `name` not `id`, `hooks` entries are bare module names (the event and matcher being per-IDE `HOOK_LAYOUTS` data), the variant suffixes are `manifestNameSuffix`/`manifestDescriptionSuffix`, only `requires` and `hooks` default while `template`/`releases`/`bootstrap`/`manifest` are required, and a set `name` is unique across the whole document rather than per release. Its reference JSON was rewritten and **verified to round-trip through `loadPluginCatalog`**, with all nine negative criteria confirmed by live rejection — including that the previous `id` spelling is rejected as an unrecognized field, which is what made the old example unusable. The same `id`->`name` correction was applied in `GLOSSARY.md`, `FR-SET-0010`, `FR-SET-0040`, `FR-SET-0050`, `FR-CLI-0060` and ten `<set-id>` placeholders across `FR-PROF.md`, `FR-ARCH.md`, `MODEL.md`, `STRUCTURES.md` and `GLOSSARY.md`. Separately, the superseded "template iterates the hook list" design was rewritten to the assembler design in `FR-GEN-0011`, `FR-VAR-0083` and `FR-SET-0070`'s rationale. `DATA-CFG-0007`, `FR-GEN-0011` and `FR-VAR-0083` are `Implemented` against the corrected text; `FR-PROF-0021` is `Implemented` after the marketplace-name defect was fixed at source (`rosetta-claude` now yields `rosetta`, `rosetta-claude-light` yields `rosetta-light`, `qe-claude` yields `qe`, identical across all five IDE families).
- **The empty `hooks.json` question, resolved by amending the spec rather than the code.** `FR-GEN-0010` and `FR-SET-0070` were briefly withdrawn to `ToBeModified` after a clean `--release r3` build showed 12 folders shipping a `hooks.json` carrying neither a bootstrap block nor any hook entry — `core-` and `rosetta-` variants of `cursor`, `cursor-standalone`, `copilot-standalone` and `antigravity`, i.e. every target whose `HOOK_LAYOUTS` bootstrap slot is `null` or `empty`. This is PRE-EXISTING behaviour that #315 preserves, not a defect it introduced: the pre-change golden tree under `agents/TEMP/315-golden/` ships the same 12 files (37/60/68 bytes), the current tree the equivalent set, the byte deltas arising only because the assembler emits compact JSON where the template carried whitespace. Suppressing the file is deferred because an IDE manifest points at it — Cursor's `plugin.json` declares `"hooks": "./hooks/hooks.json"` — so removal needs per-IDE proof that a dangling reference does not break plugin load. Both units were therefore amended to describe reality: the guarantee is narrowed to a set declaring an empty hook list with `bootstrap: false` (verified — all four add-on sets ship zero `hooks.json` and zero `hooks/` directories across all seven targets), the deterministic-hooks-suppression clause is recorded in `<notes>` as deferred pre-existing behaviour, and `FR-GEN-0010`'s statement and AC4 were additionally corrected from the pre-assembler claim that the render context carries the set's bootstrap flag and ordered hook list — it carries exactly `release`, `deterministic_hooks`, `bootstrap_hooks` and `hooks_json`. Both are `Implemented` against the corrected text.
- **Single-ownership pass (2026-09-02).** An independent review found six duplicated rules and one live contradiction; all are resolved by making exactly one unit own each rule and having the others cite it WITHOUT restating it. The contradiction: `FR-VAR-0070` keyed bootstrap delivery to a `{{{bootstrap_hooks}}}` placeholder in the preserved hook template, but all seven templates are now the single line `{{{hooks_json}}}` and none carries it, so the unit read as asserting that no target delivers bootstrap via hooks. The real decision is `emitsHooksJson` — the set's bootstrap flag conjoined with the target's `HOOK_LAYOUTS` slot being `inject` — and `FR-VAR-0070` now states that, owning the rule alone; `FR-HOOK-0004` drops its restatement. Ownership also re-cut for: config-file resolution (`FR-CLI-0034` owns it, `FR-SET-0001` omits it and drops two criteria — they had drifted to opposite implementation statuses over that one sentence); hook-entry placement (`DATA-CFG-0008` owns event, matcher and envelope, `FR-HOOK-0005` keeps only the entry object's form and escaping); output-folder naming (`FR-SET-0040` owns it, `FR-PROF-0020` keeps only the profile-exclusion rule); document well-formedness (`DATA-CFG-0007` owns it, `FR-SET-0010` keeps only the two environment checks a real run can make); one-invocation build (`FR-SET-0060` owns it, `FR-SET-0030` omits it, and `FR-SET-0060` in turn drops its restatements of `FR-CLI-0040`, `FR-CLI-0041` and `FR-SET-0010`).
- **Dependency direction normalized.** `DATA-CFG-0008` now depends only on `DATA-CFG-0003` and `DATA-CFG-0007`, matching the corpus convention that DATA units depend only on DATA units; the FR side gained the edges instead (`FR-HOOK-0005`, `FR-SET-0070`, `FR-GEN-0011`, `FR-VAR-0070`). The dependency graph is a DAG: 158 nodes, 290 edges, zero cycles, zero dangling references — `FR-HOOK-0021`'s dangling `AC-3` and `FR-COPY-0081`'s empty `<depends>` were both removed.
- **Staleness swept.** `FR-VAR-0071`'s rationale ("one template form cannot serve both") was false once both forms became the identical single line — corrected to locate the per-form difference in the assembled document. Also corrected: `FR-HOOK-0005`'s serialization criterion, `FR-HOOK-0007`'s cursor criterion and `FR-ARCH-0055`'s notes, all three of which still keyed behaviour to the dead `{{{bootstrap_hooks}}}` placeholder. `FR-HOOK-0005` was `Draft` while `Implemented` and already carried an approver; it is now `Approved`.
- **Anchor-based injection replaced by a declared extraction root (2026-09-02).** The generator retired `pluginInjectSections` — module, test, `InjectionDecl`, `InjectionSection` and `PluginSpec.injections` are all deleted — after verification showed the mechanism had NEVER fired: it located its insertion point by matching a `# PREP STEP 1:` anchor, that anchor is absent from `instructions/r3/core/rules/plugin-files-mode.md`, and a missing anchor was a silent skip, so no shipped standalone ever carried the text while unit tests passed against a fixture that did contain it. `FR-ARCH-0051` is rewritten around the replacement `pluginEmitDistributionRoot()`: a FACTORY taking its root and workflow folder at composition time and placed only in the two standalone pipelines, rather than a `PluginSpec` field five of seven specs would leave unset — a field read by a processor that no-ops for most of them is identity branching wearing a data costume (FR-ARCH-0005). It appends at a deterministic structural position with no string matching, matches its host by base name taken to the FIRST dot so Copilot's `plugin-files-mode.instructions.md` still resolves, and derives the workflow extension from the frames actually emitted so `*.prompt.md` cannot drift. `FR-VAR-0072` is recast as the OUTCOME — a standalone distribution declares its extraction root — with `FR-VAR-0050` and `FR-VAR-0051` citing it and restating nothing. Verified on a real `--release r3` build: `.cursor/rules/plugin-files-mode.mdc` and `.github/instructions/plugin-files-mode.instructions.md` now carry the declaration, with workflow clauses `commands/*.md` and `prompts/*.prompt.md`.
- **Why not rewrite the paths.** The rejected alternative is recorded on `FR-VAR-0072`: `agents/` is ambiguous, naming both plugin content that moves under the extraction root (`agents/architect.md`) and target-repo workspace files that must stay at the repository root (`agents/IMPLEMENTATION.md`, `agents/user-instructions/`, the `*-flow-state.md` files). A folder-level rewrite pair cannot separate them and would corrupt the workspace files — the hazard `FR-ARCH-0049` documents. One declared root moves resolution into the agent's reading of the document and leaves every emitted path untouched.
- **Scope of the declaration corrected against a real build.** An initial draft of both units claimed the declaration is unconditional. It is not, and the real contract is better: a set shipping a rules folder that produced no host document is a HARD error, while an add-on set shipping no rules folder has no host and is skipped legitimately — 8 of 14 standalone folders (`advanced`, `qe`, `search`, `modernization` and their forms) correctly carry no declaration and rely on the set they `require` being extracted alongside. Both units now state that discrimination rather than an absolute.
- **Stale `pluginInjectSections` references swept** from `GLOSSARY.md`, `NFR-0006`, `STRUCTURES.md`, `DATA-CFG-0002` (statement, notes and implementation notes — `injections` is gone from the descriptor, `indexes` remains), `FR-ARCH-0046`, `FR-ARCH-0054`, and `ASSUMPTIONS.md` AC-7 and AC-13. Dated changelog entries were left as written: a changelog records what was true when it was written.
- **Whole-unit single-ownership pass (2026-09-02).** A second review found the previous pass had corrected `<statement>` text while leaving the superseded rule standing in titles, rationales, criteria and implementation notes. Titles and rationales are read as normative in practice, so ownership is now diffed across the WHOLE unit. The refuted claim that bootstrap delivery is decided by the preserved templates/rules was removed from `FR-VAR-0070`'s title and rationale, `FR-VAR-0082`'s rationale, `DATA-CFG-0002`'s statement and `FR-HOOK-0004`'s title and notes; one instance survives deliberately, in `FR-VAR-0070`'s statement, because preventing DOUBLE delivery genuinely does remain a template/rule concern.
- **Duplicated `shall` clauses removed.** `FR-GEN-0010` no longer restates `FR-SET-0070`'s two hook-footprint rules (empty-hook-list-no-file, and suppression-does-not-remove-the-file), losing two criteria and a duplicated `<notes>`; the profiled model-drop rule, previously stated four times, is now owned normatively by `FR-PROF-0011` with `FR-COPY-0020/0021/0022` citing and omitting; `DATA-CFG-0003` cites `FR-SET-0040` rather than restating its `spec.name` prohibition; `FR-HOOK-0009` no longer restates `FR-HOOK-0004`'s retained-flag rule; and `FR-ARCH-0021` cites `FR-ARCH-0020`'s directive grammar instead of repeating it.
- **Self-contradictions resolved.** `FR-ARCH-0051` discriminated two host-absence cases and then closed with an unqualified hard-error clause left over from the `pluginInjectSections` version — removed; it also claimed the workflow path is both configured and derived, when only the EXTENSION is derived; and its "never located by matching an anchor string" was literally false, now reworded to the guarantee that actually holds, that the insertion point always exists with an end-of-document fallback so the emission cannot be skipped. `FR-SET-0030` opened by delegating "every variant is built" to `FR-SET-0060` and closed by claiming it.
- **`FR-SET-0070` narrowed.** Its "sole determinant of the set's hook footprint" was false. The set's declaration is the sole determinant of which modules the set REQUESTS; which of those a target binds, and whether a bootstrap block is emitted at all, is the target's layout (`DATA-CFG-0008`). A set's footprint is not uniform across its targets — `claude` receives a bootstrap block, `cursor` does not.
- **Status rule made enforceable.** A unit this delta rewrote wholesale is in-delta: `FR-ARCH-0051` and `FR-VAR-0070` are tagged `315` and Approved under the delta's blanket approval, which also resolves `FR-VAR-0050`/`0051` depending on a Draft unit. `FR-HOOK-0005` was only cross-referenced, its Draft predates the delta, and it stays Draft. Revision narration was removed from every implementation note and from `FR-HOOK-0005`'s notes: a specification states what is true, and this log carries what changed.
- **`FR-CLI-0012` untouched**, as it was not part of this delta. No `<status>` or `<approved_by>` value was changed anywhere: approval is independent of implementation, so `FR-COPY-0011` and `FR-VAR-0030` remain `Draft`.

## 2026-09-01 — plugin sets: `instructions/r3/core` splits into five folders; one call builds 6 sets x 7 IDE targets (#315)

**Files:** `FR-SET.md` (new), `MODEL.md`, `FR-CLI.md`, `FR-PROF.md`, `FR-GEN.md`, `FR-HOOK.md`, `FR-VAR.md`, `FR-ARCH.md`, `FR-COPY.md`, `NFR.md`, `SCOPE.md`, `STRUCTURES.md`, `GLOSSARY.md`, `REFERENCES.md`, `ASSUMPTIONS.md`, `TRACE.md`, `INDEX.md`

**Source:** GitHub issue griddynamics/rosetta#315 and its 2026-08-26 design clarification, plus the owner decisions of 2026-09-01 that supersede it where they differ (preserved folders collapse to five `template-<ide>`; marketplace names carry no prefix; FR-PROF-0020/0021 restated rather than deprecated; FR-GEN index units kept Approved and marked dormant). Every unit below is `approved_by="isolomatov-gd"`, `ticketId` carrying `315`.

- `FR-SET.md` **new file**, area `SET`, eight units, all Approved / NotStarted: `FR-SET-0001` plugin-set configuration resolution (`plugins.json`, default `<source>/src/rosettify-plugins/plugins.json`, `--config` override); `FR-SET-0010` fail-fast validation (missing/unparseable file, duplicate set id, missing folder, missing template folder for an IDE being built, duplicate variant suffix, unknown `requires`, unknown field); `FR-SET-0020` set-to-folder layering in declared order, reusing FR-ARCH-0042/0024; `FR-SET-0030` per-set variants, each naming a profile and carrying the three suffixes; `FR-SET-0040` destination `<set-id>-<ide-target>` + variant suffix, `spec.name` left bare; `FR-SET-0050` `requires` is metadata only; `FR-SET-0060` one invocation builds every (set variant × IDE target) pair; `FR-SET-0070` per-set bootstrap flag and hook list as the sole determinant of a plugin's hook footprint.
- `MODEL.md` `DATA-CFG-0003`: "exactly seven base targets `core-*`" -> one plugin per (set variant × IDE target) pair, target identities renamed to the bare IDE names, output-folder count DERIVED from the configuration rather than fixed; both criteria rewritten and two added; the per-target preserved-config note became per-IDE. `Implemented` -> `ToBeModified`.
- `MODEL.md` `DATA-CFG-0005`: preserved-file source `<preservedFilesSource>/<target>/` -> `<preservedFilesSource>/<template>-<ide>/` in the statement, all three criteria (plus a fourth) and the notes enumeration; templates are shared across sets, so the source holds five folders (`template-claude|cursor|copilot|codex|antigravity`) and grows only per IDE or per template. `Implemented` -> `ToBeModified`.
- `MODEL.md` `DATA-CFG-0006`: profile descriptor "exactly four fields" -> exactly one, `modelOverrides`; `destinationSuffix`, `pluginNameSuffix`, `pluginDescriptionSuffix` become INVALID top-level fields; AC1/AC2 rewritten, AC9 restated, AC10 replaced by an empty-descriptor-`{}`-is-valid criterion, AC11 removed; outer keys and the key-space table moved to bare IDE identities; the reference JSON reduced. `Implemented` -> `ToBeModified`.
- `MODEL.md` `DATA-CFG-0002`: index and injection-index declarations dropped from the descriptor field list, the set's bootstrap flag and hook list added; "the seven variants" criterion made count-free; notes record that `pluginGenerateIndexes` stays available but is composed by no spec, and that the `configure` and `templates` `SpecEntry`s are gone.
- `MODEL.md` `DATA-CFG-0007` **new**: plugin-set descriptor — `id`, `folders`, `variants`, `template`, `manifest`, `requires`, `releases`, `bootstrap`, `hooks`, with defaults, a closed field set, and a reference configuration. `releases` is what keeps r2 on its legacy single-set path: a set declared for `r2` alone, id `core`, folder `core`, two variants, reproducing the `core-<ide>` and `core-<ide>-light` folder names r2 ships today. Set-id uniqueness is therefore per release, not per document.
- `FR-CLI.md` `FR-CLI-0034` **new**: `--config <path>`, resolved against `<source>` exactly as `--pluginsSource`/`--profileSource` are; a new `## Plugin-set configuration` section.
- `FR-CLI.md` `FR-CLI-0030` REDEFINED: "domain-selected instruction source" -> "domain folder filter over plugin sets". It no longer resolves the instruction source; it selects which declared sets build, and a named folder that does not exist under the release still aborts. `FR-CLI-0031` REDEFINED: "multi-domain layer bundling" -> filter matching semantics (all of a set's folders must be named; argument order immaterial; unused values ignored) plus the empty-selection outcome (no output, exit zero). Layering itself moved to `FR-SET-0020`.
- `FR-CLI.md` `FR-CLI-0032` restated: `--profile` no longer decides whether a profile is active — variants do — and now overrides the profile of every variant while leaving variant suffixes untouched; a fifth criterion added. `FR-CLI-0040`/`0041`/`0042` extended from per-target to per-(set variant × IDE target) pair. `FR-CLI-0001` argument list and `FR-CLI-0060` help text now name `--config`, the plugin-set descriptor fields and the four namespaced directive tokens, and drop the three profile suffix fields.
- `FR-PROF.md` `FR-PROF-0020` and `FR-PROF-0021` RESTATED, keeping their IDs and inverting their rules: destination naming derives from the set and its variant and a profile contributes nothing to it; manifest `name`/`description` derive from the set's declared manifest fields plus the variant suffixes and a profile shall not modify either. A descriptor declaring any of the three suffixes is now invalid. Neither unit is deprecated — both remain the owner of their boundary.
- `FR-PROF.md` `FR-PROF-0001` allow-list narrowed from four fields to one and its outer-key check moved to the bare IDE identities; an empty-descriptor criterion added. `FR-PROF-0010` "each of the seven targets" -> "each IDE target". `FR-PROF-0030` distinctness now spans the `target-`/`ide-`/`set-`/`profile-` namespaces. `FR-PROF-0040` reframed from "a run invoked without a profile" — no longer a mode — to "a variant that names no profile", with all four criteria rewritten. The file's header prose no longer defines a target as one of seven `core-*` values.
- `FR-GEN.md` `FR-GEN-0001..0004` kept `Approved`/`NotStarted` and marked DORMANT in `<notes>`: the index capability is retained in full but no set declares an index, so no `INDEX.md` reaches any output. Deliberately NOT `status="Removed"`. `FR-GEN-0010`/`0011` gain the set's bootstrap flag and ordered hook list in the render context, the no-hooks-at-all outcome, and iteration over the hook list instead of literals.
- `FR-HOOK.md` `FR-HOOK-0004` restated: it owned index-entry inclusion in the payload and now forbids it outright; `includeIndexEntries` is dropped from the descriptor, mirroring how `includeBootstrapRules` was retired. `FR-HOOK-0009` drops "followed by the index documents" from the manifest order. `FR-HOOK-0007`: the fixed payload entry counts (Claude/Copilot 9 and 5, Codex 8 and 4) are replaced by a derived count, and the now-vacuous Codex-differential rationale is replaced by a cross-target-equality criterion. `FR-HOOK-0001` bootstrap assembly becomes per-set and yields nothing where the set's bootstrap flag is unset. `FR-HOOK-0020` places exactly the bundles the set's declared hook list names plus their support modules; `PluginSpec.bundleSource` goes. `FR-HOOK-0022` gains removal of a bundle absent from the declared list.
- `FR-VAR.md` `FR-VAR-0083` restated as an instance of a set's declared hook list rather than a target-specific rule, which also satisfies `FR-ARCH-0005` (no identity branching); a criterion now asserts no target-named exclusion rule exists. Index-dormancy swept through `FR-VAR-0010`, `0020`, `0030`, `0041`, `0072`, `0080`; `FR-VAR-0072` no longer injects an index section into a standalone's auto-loaded file. Every `## <IDE> (\`core-<ide>\`)` heading and every in-criteria identity moved to the bare IDE name.
- `FR-ARCH.md` `FR-ARCH-0025` **new**: `SetOnlyToken` (`set-<id>-only`), validated by shape only so VFS parsing never consults the plugin-set configuration, filtered in the same step as target and profile before overwrite truncation. `FR-ARCH-0023` split its overloaded `<target>-only`/`<family>-only` token into namespaced `target-<id>-only` and `ide-<family>-only`. `FR-ARCH-0020`/`0021` retokened in statement and criteria; `FR-ARCH-0060` recognized-token clause now admits four namespaces and rejects a bare `<name>-only`. `FR-ARCH-0049` keeps its statement — it OBSERVES renames from frames rather than recomputing them, so set layering flows through unchanged — and gains two criteria: the verbatim treatment of the harness IDE guides, and the set-layered pure-relocation-versus-restructuring discriminant.
- `FR-COPY.md` `FR-SEED-0001`/`FR-SEED-0002` carry the preserved-file relocation to `<template>-<ide>` and state that several sets seed from one template folder and that a standalone has none of its own. `FR-COPY-0020/0021/0022/0080/0081/0082/0083/0084` retokened to the bare IDE identities; "the other six targets" and the four-of-seven leak enumeration made count-free.
- `NFR-0001` restated from per-profile-and-target to per-(set variant × IDE target) parity, with a new criterion asserting that the union of the five split sets' file sets equals the combo set's lightweight file set, and `INDEX.md` added to the forbidden-output list. `Implemented` -> `ToBeModified`.
- `SCOPE.md` purpose, in-scope, out-of-scope, entry point, constraints and goals rewritten around plugin sets; marketplace JSON, `requires` enforcement and configuration authorship added as explicit non-goals. `STRUCTURES.md` reframed the seven `## core-<x>` sections as IDE-target templates parameterized by set, stripped every `+ INDEX.md [G]` annotation and index-injection line, and updated hook-bundle provenance; `FR-STRUCT-0010`/`0020` dropped their hardcoded target enumerations.
- `GLOSSARY.md` added `PluginSet`, `SetVariant`, `requires`, `Preserved-file template`, `Plugin`, `TargetOnlyToken`, `IdeOnlyToken`, `SetOnlyToken`; amended `PluginTarget`, `PluginSpec`, `Domain`, `Profile`, `Instruction source`, `Bootstrap files`, `Bootstrap file manifest`, `Transform spec`, `Preserved-file source`, `pluginCopy`, `Deterministic hooks`, `FilenameDirective`, `DirectiveToken`, `ProfileOnlyToken`; marked `Folder index` dormant.
- `REFERENCES.md` repointed the preamble and all eight guide rows from `instructions/r3/core/configure/` to `instructions/r3/core/skills/harness/references/configure/` — the old folder is deleted on disk. `INT-IDE-0002`'s "for each supported IDE target" reworded; `INT-IDE-0003` now distinguishes adding an IDE (needs a guide) from adding a set (does not), with a criterion for it.
- `ASSUMPTIONS.md` amended `AC-3a`, `AC-4`, `AC-9`, `AC-15`, `AC-18`, `AC-19`, `AC-20`, `AC-21`, `CX-1/2/3`, `AG-1`, `AG-3`, `AG-4`, `AG-5`, `AG-6`, `AG-7`, `AG-8`; added `AC-22` (set-token shape-only validation), `AC-23` (folders are disjoint, layering is mechanism not merge), `AC-24` (`requires` is unenforceable), `AG-9` (one Antigravity target, many sets), `OQ-7` (is `set-<id>-only` used by anything today). `OQ-6` RESOLVED: bundling order is the set's declared `folders` array, and `r3`'s folders are disjoint so the question is moot.
- `TRACE.md` retitled goal-neutrally; goals `G6`-`G14` added (`G13` bare IDE ids + namespaced directives, `G14` `configure/`/`templates/` retired and the guides kept verbatim); the matrix grew to 115 rows and `## Coverage` was regenerated in full from it: 14 goals, 81 distinct units, 115 goal-to-unit links, no orphan on either side. `FR-CLI-0010` is deliberately absent — its fix is pre-existing and has no #315 goal.

**Pre-existing defects fixed in the same pass, not caused by #315:**

- `FR-CLI-0010` contradicted itself: the statement said the release default is `r3` while its first criterion said `r2`. `src/rosettify-plugins/src/cli.ts` declares `.option('--release <r>', …, 'r3')`, and `FR-CLI-0012` independently states a no-argument invocation uses `r3`, so the criterion was wrong. Criterion 1 now says `r3`; criterion 2 was repointed at `r2` to keep the non-default case covered. `GLOSSARY.md` "Release … Default `r2`" corrected to `r3`.
- `FR-ARCH-0021`'s fifth criterion asserted that "`claude-only` matches no target", contradicting `FR-ARCH-0023` as amended 2026-08-19 (an IDE-family key IS a valid token). `CHANGES.md` records the same contradiction being fixed in `FR-ARCH-0060` on 2026-08-19; `FR-ARCH-0021` was missed then. Fixed here as part of the retokening.
- The root `docs/requirements/INDEX.md` described the generator as producing "six IDE plugin distributions" (seven since ticket #138) and listed no entry for `FR-PROF.md` or `TRACE.md`. Corrected and both entries added.

**Cross-cutting metadata:** every unit this change touches carries `315` in `ticketId` (78 units), `changed="2026-09-01"`, and `approved_by="isolomatov-gd"` — except the two units that were already `Draft` (`FR-COPY-0011`, `FR-VAR-0030`), which keep an empty approver because approval is independent of this change. No touched unit is left claiming `implementation="Implemented"` while its text is ahead of the code: 45 flipped to `ToBeModified`, 33 stay `NotStarted`. The `depends` graph was checked for cycles as well as liveness; this change introduces none and incidentally removes the pre-existing `DATA-CFG-0005 <-> DATA-CFG-0006` cycle. Four pre-existing cycles remain, untouched and out of scope: `FR-VAR-0070 <-> FR-HOOK-0004`, `FR-COPY-0081 <-> FR-VAR-0081`, `FR-VAR-0080 <-> FR-VAR-0081`, `FR-VAR-0082 <-> FR-VAR-0083`. `FR-HOOK-0021` still declares `<depends>AC-3</depends>`, an ASSUMPTIONS entry rather than a `<req>` id — also pre-existing and left alone.

---

## 2026-08-19 — `FR-ARCH-0023` implemented: TargetOnlyToken family keys

**Files:** `FR-ARCH.md`

**Source:** reviewer finding — `rule~copilot-only~.md` never worked. Before the directive allow-list it was silently dropped from every plugin, Copilot included, because the token ends in `-only` and target matching compared it against exact names only; after the allow-list it became a hard build failure. `FR-ARCH-0023` had specified family keys as an Approved Must since 2026-06-04 and was never implemented.

- `FR-ARCH-0023` `implementation` NotStarted -> Implemented, with notes naming the artifacts. All three of its criteria are now covered by tests: `copilot-only` reaches `core-copilot` and `core-copilot-standalone` only; `core-copilot-standalone-only` reaches that exact target only; an unmatched target contributes nothing. Families are DERIVED from the target names by stripping the `core-` prefix and any `-standalone` suffix, so adding a target joins or creates its family with no second list to maintain.
- `FR-ARCH-0060` statement: its recognized-token clause admitted only `<target>-only` for the seven exact names, which contradicted `FR-ARCH-0023`'s Approved Must and codified the unimplemented gap as correct. It now admits an IDE-family key too, and a criterion covers `rule~copilot-only~.md` being accepted. This corrects an error introduced when that unit was authored.

---

## 2026-08-19 — `FR-ARCH-0060` added; the closing tilde fence contributes no token (merge with main)

**Files:** `FR-ARCH.md`, `FR-PROF.md`, `ASSUMPTIONS.md`, `GLOSSARY.md`

**Source:** merging origin/main, which shipped throw-on-unknown-filename-directive with no requirement unit, and which drops the trailing empty segment before validating. Both changes approved by the owner.

- `FR-ARCH-0060` (new, Approved, Implemented): the generator rejects a filename carrying an unrecognized directive token, aborting with a message naming the token, the filename and the accepted set. Recognized: `overwrite`; a target-only token for each of the seven target names; and the profile-only shape `profile-<name>-only` with a non-empty name. A profile-only name is deliberately not resolved against existing profiles — filename parsing must not depend on the profile source directory, and an unprofiled build of a repository carrying profile-scoped files must still succeed. Rationale records why silence was worse: a mistyped `core-clade-only` still ends in `-only`, so target matching excluded the document from all seven plugins with no diagnostic.
- The closing tilde fence now contributes no token rather than an inert empty one, since the parser drops the trailing empty segment — which is also what lets the allow-list run without an empty string tripping it. Reworded in `FR-ARCH-0020` and `FR-ARCH-0021` (statements and criteria), `FR-PROF-0030` (notes and AC5), `GLOSSARY.md`, and `ASSUMPTIONS.md` AC-9 and AC-19. AC-19 had anticipated exactly this and now records that the predicted risk materialized and was handled.
- `status`/`approved_by`/`implementation` unchanged on every pre-existing unit.

---

## 2026-08-19 — owner review pass: evidence convention, gemini effort, and two conflicts resolved

**Files:** `FR-ARCH.md`, `FR-COPY.md`, `FR-PROF.md`, `FR-VAR.md`

**Source:** owner reviewed the post-#187 reconciliation unit by unit and directed each change below.

- `FR-ARCH-0057` statement: the upgrade rule generalized to a version-independent invariant — a built-in map retains a key for every authored model token, superseded ones included, and each resolves to the current model of that token's own cost tier. Keys are never removed as a model ages; only values move forward. Added a criterion asserting every GPT 5.3/5.4/5.4-mini/5.5 effort variant is present as a key and resolves to its tier successor.
- `FR-ARCH-0057` statement: gemini reasoning-effort assignment on authored tokens defined — Pro takes `-high`, a superseded Flash token takes `-low`, every other Gemini token takes `-medium`. The maps resolve all of these to the IDE-native Gemini id, which carries no effort suffix. Cross-referenced from `FR-ARCH-0046` implementationNotes.
- `FR-COPY-0022` criteria: an unmapped Codex `gpt-` token on the unprofiled path passes through and is effort-split rather than emitting no model fields; no model fields are emitted only when the list holds no `gpt-*` token at all. The sibling skip-and-continue criterion is scoped to the profiled path. Pre-existing defect, independent of #187.
- `FR-VAR-0010` statement and criterion: both accepted Claude forms are permitted — a family short name and a full model ID — and neither is mandated; which form a value takes is governed by the effective `ModelVocabulary` (`FR-COPY-0021`). Resolves the contradiction with `FR-COPY-0021`.
- Evidence convention: `<evidence>` cites source code only. Every `discovery-notes.md` citation removed from `FR-ARCH-0059`, `FR-COPY-0083` and `FR-COPY-0084` — a plan artifact is not evidence — and `FR-COPY-0084`'s note now names the two real Codex call sites. `FR-ARCH-0059`'s `<notes>` deleted: its whole content cited a baseline the unit itself removed.
- Evidence convention: every `<evidence>` line range in `FR-PROF-0001/0010/0011/0020/0030` replaced by the named artifact at that location, since ranges drift on every edit and names do not. Two false parentheticals corrected: `PluginSpec.modelVocabulary` is no longer "read nowhere", and `FR-PROF-0001`'s V3 rationale is re-grounded on total coverage — a block replaces the vocabulary in full, so family keys are what keep every claude token resolvable — rather than on a full-id key "never matching".
- `status`/`approved_by`/`implementation` unchanged on every unit.

---

## 2026-08-19 — model tokens realigned to the upgraded built-in maps (GitHub #187)

**Files:** `FR-COPY.md`, `FR-ARCH.md`

**Source:** repo-wide model upgrade #187 — every built-in map moved forward (opus → `claude-opus-5`; gpt 5.3/5.4/5.3-codex → `gpt-5.6-terra`; gpt 5.5 → `gpt-5.6-sol`; gpt 5.4-mini → `gpt-5.6-luna`; every gemini → `gemini-3.7-flash`; grok 4.5 → `grok-4.6`), and the Codex map gained upgrade entries so a legacy `gpt-` token resolves forward with its effort preserved. Requirement text asserting a pre-upgrade OUTPUT value was corrected; INPUT citations, hypothetical profile blocks and hypothetical effective maps were left as-is.

- `FR-COPY-0020` criteria: Cursor outputs corrected — `claude-4.8-opus-high` → `claude-opus-5`; `gpt-5.4-medium` → `gpt-5.6-terra`.
- `FR-COPY-0021` statement/rationale/criteria/notes: the built-in opus family value and the accepted-full-id list now name `claude-opus-5`; the stale exact-vs-family illustration (family key "would yield claude-opus-4-8") rewritten — the two tiers now agree, and the exact tier's stated value is version-pinning when the family default later moves.
- `FR-COPY-0022` criteria: Codex outputs corrected — `gpt-5.3-codex-high` → model `gpt-5.6-terra` effort `high`; bare `gpt-5.4` → `gpt-5.6-terra`.
- `FR-COPY-0083` statement/criteria: whole-emit example and list outputs corrected — `gpt-5.5-high` emits whole as `gpt-5.6-sol-high`; AC2 → `claude-opus-5, claude-sonnet-5`; AC3 → `gpt-5.6-terra`; AC7 → `gpt-5.6-sol-high, gpt-5.6-terra-low`.
- `FR-ARCH-0057` statement/rationale/criteria/implementationNotes: upgrade rules restated to the 5.6-era and `claude-opus-5` targets, and the rule generalized to a version-independent invariant — a built-in map retains a key for every authored model token, superseded ones included, and each resolves to the current model of that token's own cost tier. The earlier wording enumerated `gpt-5.4` and `gpt-5.5` as not-upgraded, which held only while they were the current generation; naming versions pinned the rule to that moment. Keys are never removed as a model ages, only their values move forward. Added a criterion asserting every GPT 5.3/5.4/5.4-mini/5.5 effort variant is present as a key and resolves to its tier successor. "GPT 5.3 and above" scope unchanged.
- `FR-ARCH-0046` implementationNotes: map-summary arrows corrected to the upgraded targets.
- `status`/`approved_by`/`implementation` unchanged on every unit.

---

## 2026-08-19 — `FR-COPY-0021` amended: the Claude vocabulary resolves in two tiers

**Files:** `FR-COPY.md`, `MODEL.md`

**Source:** user request — a build profile must be able to select Opus 5 while the standard build keeps Opus 4.8.

- `FR-COPY-0021` statement: a claude-compatible token is now resolved against the effective vocabulary in two tiers, exact source token before `opus`/`sonnet`/`haiku` family key. A map keyed by family alone can name exactly one model per family and so cannot express a model version. Selection strategy, `inherit` fallback and skip-and-continue behavior are unchanged; no pre-existing token resolves differently, since none matches an exact key.
- The exact tier belongs to the built-in vocabulary only. `DATA-CFG-0006.AC3` restates why a profile's `core-claude` block stays family-keyed: a block replaces the vocabulary in full, and family keys are what guarantee every claude token remains covered.
- Added criteria for the exact tier to `FR-COPY-0021` and `DATA-CFG-0004`; amended `DATA-CFG-0004`'s statement, which described built-in vocabularies as keyed by logical model key only.
- `FR-COPY-0083` statement: the `subagent_required_model` surface names the same two-tier lookup rather than the family key alone, so a token resolves identically on both model surfaces. `status`/`approved_by`/`implementation` unchanged throughout.
- Reordered `DATA-CFG-0006`'s criteria so `AC9` precedes `AC10`/`AC11`.

---

## 2026-08-19 — `DATA-CFG-0006` amended: every profile descriptor field is optional

**Files:** `MODEL.md`

**Source:** the shipped `lightweight` reference profile declares suffix fields only — a `modelOverrides` block is exhaustive per target and would downgrade every agent, skill and workflow uniformly, so a lighter build cannot use one.

- `DATA-CFG-0006` statement: the four field names remain the complete set a descriptor may carry, but each is now stated optional — an absent suffix defaults to the empty string, an absent `modelOverrides` means no overrides and every target keeps its built-in vocabulary.
- Added `DATA-CFG-0006.AC10` (suffix-only descriptor accepted, built-in vocabularies retained non-exhaustively) and `AC11` (absent suffix reads as empty string). `status`/`approved_by`/`implementation` unchanged.

---

## 2026-08-19 — `FR-COPY-0022` amended: `-xhigh` recognized as a Codex reasoning-effort suffix

**Files:** `FR-COPY.md`

**Source:** user request — a profile's `engineer` subagent needs `gpt-5.6-luna-xhigh` to split correctly.

- `FR-COPY-0022` statement: the reasoning-effort suffix list gains `-xhigh` alongside `-high`/`-medium`/`-low`. Additive only; `-high`/`-medium`/`-low`/no-suffix behavior is unchanged.
- Added a criteria proving the split (`gpt-5.6-luna-xhigh` → model `gpt-5.6-luna`, effort `xhigh`). `status`/`approved_by`/`implementation` unchanged.

---

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

### RECONCILIATION-14 — hook-configuration content has no oracle

**Files:** `NFR.md`, `INDEX.md`, `TRACE.md`

**Change:** `NFR-0001` compares output file PATHS only and says so deliberately; the equivalence
check compounded it by listing `hooks.json` among its permitted-difference classes. Between them,
a hook-configuration document that changed SHAPE while keeping its path was invisible to every
gate — which is how `<set>-copilot/hooks/hooks.json` went from the 60-byte standalone form to a
byte-identical copy of the 24443-byte plugin form during #315 with all gates green. Added
`NFR-0012` (hook-configuration content parity) as the content-shape complement to `NFR-0001`: it
asserts the RELATIONSHIPS between the documents a target emits — declared path set, required
identity (codex mirror pair, copilot alternate-name copy), required distinctness (copilot's two
forms; cursor's two forms where the deterministic-hooks value makes them distinguishable), form
markers, and JSON validity — plus a recorded content digest per document. Relationships rather
than frozen bytes, so the gate stays valid as the bootstrap payload legitimately moves with the
instruction source. `NFR-0001` notes and the `INDEX.md` summary now name where content is covered;
`TRACE.md` traces `NFR-0012` to G7 alongside `NFR-0001`.

**Status:** `Draft` (the capability was owner-approved — `follow.md` OWNER'S ASKS item 12 — but
this unit's text is new and awaits review). Implemented as
`plans/issue-315-plugin-sets/verify/ac_hooks_content.py`, validated in both directions: ALL PASS
(28 assertions) against the pre-#315 golden snapshot, 12 failures against the tree carrying the
regression.

### RECONCILIATION-15 — hook document structure returns to literal per-IDE templates

**Files:** `MODEL.md`, `FR-GEN.md`, `FR-VAR.md`, `FR-HOOK.md`, `FR-SET.md`, `FR-ARCH.md`,
`GLOSSARY.md`, `REFERENCES.md`, `NFR.md`, `ASSUMPTIONS.md`, `STRUCTURES.md`, `TRACE.md`,
`docs/ARCHITECTURE.md`

**Source:** `plans/issue-315-plugin-sets/hooks-architecture.md` (design, owner-settled D23/D25),
`plans/issue-315-plugin-sets/remediation-spec.md` §6/§7.

**Change:** `DATA-CFG-0008` held hook document shape as a table keyed on bare IDE target identity —
seven entries, fixed as the whole inventory by its own AC1 — while the generator emits NINE distinct
documents, Copilot and Cursor each owning both a plugin form and a standalone form. A structure that
cannot address the document it describes can only produce one document per target, so the two forms
collapsed: `<set>-copilot/hooks/hooks.json` went from the 60-byte standalone form to a byte-identical
copy of the 24443-byte plugin form, and `<set>-cursor/hooks.json` took plugin-form addressing where
standalone-form addressing was required.

- **`DATA-CFG-0008`** deprecated under the `FR-HOOK-0003` precedent — record kept, reason in
  `implementationNotes`, `implementation: ToBeRemoved` until the code deletion lands.
- **`FR-GEN-0011`** rewritten from assemble-then-serialize to render-then-validate. Its old text
  ("exactly one raw-injection placeholder and no control flow ... no literal hook entry") mandated the
  one-liner templates that made the collapse possible. Each emitted document now comes from its own
  literal template, its path in the preserved tree being its identity; post-render `JSON.parse` is a
  HARD error, strictly stronger than the old justification because it also catches a malformed raw
  bootstrap injection, which serializing a built object cannot see.
- **`FR-GEN-0010`** loses the assembled-value clause; render context becomes release variables, the
  bootstrap payload and the spec's output folder name. **`FR-ARCH-0048`** gains both.
- **`FR-VAR-0071`** rationale asserted the defect as design; rewritten, plus a criterion asserting the
  two forms differ in content. **`FR-VAR-0030`** AC4 is correct and currently failing — left untouched
  by design, so it is not closed by editing the criterion. **`FR-VAR-0030`/`0031`** now name the
  mechanism that exists (declarative post-render mirror pair) rather than `SpecEntry`/`fileRename()`.
- **`FR-HOOK-0007`** probe guard moves from `commands/coding-flow.md`, absent from every `core`-based
  Copilot plugin after the set split and therefore a permanent no-op there, to
  `.github/plugin/plugin.json`. New criterion generalizes the rule.
- **`FR-SET-0070`** AC1/AC2 named per-set hook subsets no declared set has ever carried; restated over
  the two configurations `plugins.json` declares.
- **`FR-VAR-0070`** restates the delivery conjunction against the template placeholder rather than the
  table slot, and its new `<notes>` record three by-design consequences so they are not re-raised as
  defects: Copilot's camelCase `sessionStart` and `preCompact` registration, and Cursor's absent
  placeholder. In each case the same bootstrap bodies arrive through auto-loaded rules/instructions, and
  registering the second key would double-deliver.
- Collateral: `DATA-CFG-0002`, `DATA-CFG-0005`, `DATA-CFG-0007`, `FR-ARCH-0039`, `FR-HOOK-0005`,
  `FR-VAR-0020`, `FR-VAR-0082`, `FR-VAR-0083`, `INT-IDE-0002`, `NFR-0007`, `GLOSSARY` PluginProcessor
  term, `STRUCTURES.md`, `ASSUMPTIONS.md` OQ-4 (which claimed hook JSON was covered by the paths-only
  parity rule; it is not, and now points at `NFR-0012`), and `docs/ARCHITECTURE.md`, whose preserved-file
  paragraph called Copilot's `hooks/hooks.json.tmpl` the plugin form, contradicting its own hook-forms
  table nine paragraphs later.

`STRUCTURES.md` needed almost nothing: it was never updated by the refactor and already described this
architecture, which is independent corroboration from the committed structure spec rather than from the
git baseline.

**Status:** `Approved` → `Draft` on `FR-GEN-0011`, `FR-GEN-0010`, `FR-VAR-0071`, `FR-HOOK-0007`,
`FR-SET-0070` and `FR-ARCH-0048` — each changed an obligation or a criterion. `FR-VAR-0070`,
`DATA-CFG-0002`, `DATA-CFG-0005`, `DATA-CFG-0007`, `FR-ARCH-0039`, `FR-HOOK-0005`, `FR-VAR-0020`,
`FR-VAR-0082`, `FR-VAR-0083`, `NFR-0007` and `INT-IDE-0002` keep `Approved`: only the mechanism a
reference names moved, no obligation changed, which follows the same rule the `advanced`→`workflows`
pass used for restatements. `FR-VAR-0030`/`0031` were already `Draft`. `NFR-0012` is unchanged and
stays `Draft`; promoting it to `Approved` is recommended but is the owner's call, not this pass's.

**Implementation status** tracks the tree, not the plan. `DATA-CFG-0008` is `Removed` (hook-layouts.ts,
plugin-assemble-hooks-json.ts and PluginSpec.hookLayout are all deleted); `FR-GEN-0011`, `FR-VAR-0071`
and `FR-VAR-0031` are `Implemented`. `FR-VAR-0030` stays `ToBeModified` although the template that
caused its AC4 failure is fixed, because its criteria assert properties of generated OUTPUT and the
tree has not been rebuilt against `ac_hooks_content.py`. `FR-HOOK-0007` stays `ToBeModified`: the
corrected probe guard is a criterion change the generator has not yet followed (migration step 8).

### RECONCILIATION-16 — FR-HOOK-0022 closed as already-implemented; FR-SET-0050 enforces rather than composes

**Files:** `FR-HOOK.md`, `FR-SET.md`

**Source:** `plans/issue-315-plugin-sets/remediation-spec.md` §6, §7.

**Change:** `FR-HOOK-0022`'s `ToBeModified` note described the pre-fix state and contradicted both the
code and a passing test file. `sweepUndeclaredBundles` is called unconditionally by `pluginSyncBundles`,
outside the deterministic-hooks copy branch, so AC2 holds on both branches. Notes rewritten to cite the
helper and the four named sweep tests, and to record that `pluginCleanup` wipes the destination folder
first — so in the CLI pipeline the sweep is defence-in-depth for direct library callers, and cross-run
survival of a hand-added file is not a property of that pipeline. No code change; flipped to
`Implemented`, status stays `Approved`.

`FR-SET-0050`'s duty moves from composing the manifest description to enforcing an authored one:
`readSets` refuses a catalog whose `manifest.description` omits a set its `requires` list names. Added
AC5 for the abort. Generated prose reads worse than the authored wording and would give one fact two
sources, so the invariant is enforced at the moment of the edit rather than satisfied by derivation.

**Status:** `FR-SET-0050` `Approved` → `Draft` (refusing to load a catalog is a new obligation).
`FR-HOOK-0022` stays `Approved`.

### RECONCILIATION-17 — close FR-VAR-0030 and FR-HOOK-0007 against the rebuilt tree

**Files:** `FR-VAR.md`, `FR-HOOK.md`

**Change:** Both units held `ToBeModified` because their criteria assert generated output and the tree
had not been rebuilt. It has been. `FR-VAR-0030`: all four criteria hold — three `hooks.json` at the
declared paths, root and `.github/plugin` byte-identical, and `hooks/hooks.json` the standalone form
with an empty session-start array, matching the pre-`#315` snapshot. `FR-HOOK-0007`: all nine hold,
including the guard on `.github/plugin/plugin.json`, which the copilot spec emits for every set.
Both → `implementation="Implemented"`; `status` stays `Draft`, approval being independent.

**Status:** `FR-VAR-0030` and `FR-HOOK-0007` `ToBeModified` → `Implemented`, both `Draft`.

### RECONCILIATION-18 — requirement records carry no change narrative

**Files:** `FR-VAR.md`, `FR-HOOK.md`, `MODEL.md`, `STRUCTURES.md`, `FR-PROF.md`

**Change:** Records are target-state; this file is the only change log. Removed progress and correction
narrative from five units — dated "CLOSED"/"UPDATE" entries, "CORRECTION: the earlier note …",
"at the time this record was written", and a paragraph explaining that a prior draft's claim had since
been fixed. `FR-VAR-0030` and `FR-HOOK-0007` implementation notes were rewritten to the concise
files-affected form. Retirement reasons on `Deprecated` units are retained: those state why the unit is
gone, which is the record's current content, not its history.

**Status:** No status or criteria changed.

### RECONCILIATION-19 — close FR-CLI-0030 and FR-CLI-0031

**Files:** `FR-CLI.md`

**Change:** Both criteria now hold. `--domain` with an unresolvable token aborts with exit 1, naming the
folder and the absolute path searched, and writes no output; a legitimate empty match exits zero, which
the missing-folder abort does not. Verified by running the CLI, not by inspection.

**Status:** `FR-CLI-0030` and `FR-CLI-0031` `ToBeModified` → `Implemented`; both stay `Approved`.

### RECONCILIATION-20 — close NFR-0007 and FR-CLI-0021

**Files:** `NFR.md`, `FR-CLI.md`

**Change:** Both statements already described the current code; only the tags lagged. `NFR-0007`'s
statement lists the per-vocabulary model-normalization processors, and its criterion holds:
filesystem mechanics, escaping, model maps and orchestration live in separate units. `FR-CLI-0021`'s
criteria both hold — `cli.ts` resolves `outputDir` to the `--output` value when given and
`<source>/plugins` otherwise. Its `ToBeModified` tag dated from RECONCILIATION-9, when the `--source`
model was written into the spec ahead of the code; the code has since adopted it.

**Status:** `NFR-0007` and `FR-CLI-0021` `ToBeModified` → `Implemented`. `FR-CLI-0021` stays `Draft`,
`NFR-0007` stays `Approved`.

### RECONCILIATION-21 — close FR-COPY-0033

**Files:** `FR-COPY.md`

**Change:** The statement already read "the target's model-normalization processor", the per-vocabulary
wording; the note describing drift against a single `fileNormalizeModels` was stale, that dispatcher
having been deleted under `FR-ARCH-0005`. The unit defines how a copy is expressed rather than
asserting any target currently needs one, and both halves hold: duplication is available only as an
additional `SpecEntry`, and no pre-copy pass exists.

**Status:** `FR-COPY-0033` `ToBeModified` → `Implemented`; stays `Approved`.
