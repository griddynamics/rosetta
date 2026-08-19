# Execution plan — plugin-generator build profiles

Read first: `plugin-generator-profiles-SPECS.md` (WHAT) · `architecture-notes.md` (WHY, decisions
A–E) · `agents/TEMP/plugin-generator-profiles/{implementation-scope,decisions,discovery-notes}.md`.
Authority = `docs/requirements/plugin-generator/`. This file owns HOW only — contracts/signatures
live in SPECS, not restated here.

Governing rules (one line each):
- Refactor `normalize*` in place; `modelVocabulary` sole carrier; no parallel path — FR-ARCH-0059.
- No processor branches on target/IDE identity; per-case by composition — FR-ARCH-0005.
- Selection strategy unchanged; profile swaps only the post-selection map — SPECS §3.
- `spec.name` never suffixed; only `spec.destination` + manifest fields — FR-PROF-0020/0021.
- No-profile run structurally identical to today except subagent-list filtering — FR-PROF-0040.
- Baseline suite is ALREADY RED (8 parity fails from the trap fixture) — S8 fixes it; do NOT
  misattribute those 8 to your own work.
- Oracle restates directive semantics INDEPENDENTLY — never import `parseDirectives`/generator code.

Where outcomes recorded: this file's Status table + PR description. Blockers → orchestrator (§Open).

## File-ownership map (collision prevention)

Each step OWNS a disjoint fileset unless noted. Parallel steps never share a file.

| Step | Owned files |
|---|---|
| S1 | `src/types.ts` |
| S2 | `src/spec/profiles.ts` (NEW) |
| S3 | `src/spec/model-maps.ts` |
| S4 | `src/file-processors/file-normalize-{claude,cursor,copilot,codex}-models.ts` |
| S5 | `src/file-processors/file-codex-agent.ts` |
| S6 | `src/vfs/directives.ts`, `src/file-processors/file-apply-overrides.ts` |
| S7 | `src/plugin-processors/plugin-normalize-subagent-model.ts` (NEW) |
| S8 | `tests/e2e/parity-derive-structure.ts` |
| S9 | `src/plugin-processors/plugin-copy.ts` |
| S10 | `src/plugin-processors/plugin-process-spec-entries.ts` |
| S11 | `src/cli.ts` |
| S12 | `src/generate.ts` |
| S13 | `src/spec/targets.ts` (INTEGRATION HUB — serialized) |
| S14 | `src/rosettify-plugins/profiles/lightweight.json` (NEW) |
| S15a–e | test files (see Test plan) |

## Steps (dependency-ordered; ~3–5 min coding each)

**S1 — type carriers.** `ModelVocabulary.exhaustive?: boolean`; `MODEL_DROP` sentinel (export from
types or model-maps — pick model-maps to keep types dep-free); `TargetContext.activeProfile: string|null`;
`GenerateOptions.profile?: string`; `ResolvedSources.profileSource: string`.
Reqs: FR-ARCH-0059, FR-PROF-0030, FR-CLI-0032/0033. Accept: `npm run typecheck` compiles the new
fields; no behavior change. Depends: —. PARALLEL: none (root). CRITICAL PATH.

**S2 — profiles module.** NEW `spec/profiles.ts`: `ProfileDescriptor`, `ProfileValidationError`,
`loadProfile(profileSource,name)` (V-exist/V-parse/V1/V2/V3/V7), `resolveEffectiveVocabulary(...)`
(V4 inherit, V5 silent-ignore) per SPECS §4/§4.2. Mirror `releases.ts` shape.
Reqs: FR-PROF-0001, DATA-CFG-0006. Accept: unit test S15b green in isolation (stub maps). Depends: S1.
PARALLEL with S3, S6, S8, S9, S11.

**S3 — model-maps refactor.** Populate `CLAUDE_/CURSOR_/COPILOT_/CODEX_VOCABULARY.map` (SPECS §3);
refactor the 4 `normalize*` to `(field, map, exhaustive?)` with the single-loop semantics + `MODEL_DROP`;
extract the per-token selection+lookup low-level helper reused by S7. Keep built-in output byte-stable
for `exhaustive:false`.
Reqs: FR-ARCH-0059, FR-COPY-0020/0021/0022, FR-ARCH-0057. Accept: S15a normalize unit tests green
(exhaustive + non-exhaustive + family-key + merged-map). Depends: S1. PARALLEL with S2, S6, S8, S9, S11.
CRITICAL PATH.

**S4 — normalize processors.** Stop ignoring `ctx`; pass `ctx.spec.modelVocabulary.map`+`.exhaustive`;
interpret `MODEL_DROP` via `removeModelLine`.
Reqs: FR-ARCH-0059.AC1/AC2, FR-PROF-0011. Accept: processor unit tests green; drop-line case emits no
`model:`. Depends: S3. PARALLEL with S5.

**S5 — codex 2nd call site.** `file-codex-agent.ts` calls `normalizeCodex(field, ctx.spec.
modelVocabulary.map, exhaustive)` (`:31`).
Reqs: FR-COPY-0084. Accept: same token resolves identically at both Codex sites (S15a cross-site test).
Depends: S3. PARALLEL with S4.

**S6 — directive matchers.** `matchesTarget` ignores `profile-`-prefixed `-only` tokens; add
`matchesProfile(conditions, activeProfile)`; `fileApplyOverrides` applies both filters in one step
before overwrite truncation, reading `ctx.activeProfile`.
Reqs: FR-PROF-0030. Accept: S15c directive tests green; overwrite+inactive-profile file excluded.
Depends: S1. PARALLEL with S2, S3, S8, S9, S11.

**S7 — subagent-list processor.** NEW `plugin-normalize-subagent-model.ts`: factory +
claude/cursor/copilot/codex token mappers reusing S3 helper; codex mapper strips effort (GAP-1);
de-dup keep-first; empty→`inherit`.
Reqs: FR-COPY-0083, FR-COPY-0084.AC3. Accept: S15d green on real fixtures A–E + synthetic dedup.
Depends: S3. PARALLEL with S4, S5, S9.

**S8 — parity oracle (directive-aware).** Make `deriveExpectedPaths` strip directive segment, exclude
by `<target>-only`/`profile-<name>-only`, collapse stripped stem onto base doc; optional
`activeProfile`+`destinationSuffix` params. INDEPENDENT restatement — no generator import.
Reqs: NFR-0001. Accept: `vitest run tests/e2e/parity.e2e.test.ts` = 11/11 green WITH the trap fixture
present. Depends: — (test-only). PARALLEL with all src steps. CRITICAL PATH (unblocks green suite).

**S9 — manifest suffix in copy.** `pluginCopy(outputDir, dryRun, manifestSuffix?)`; rewrite
`plugin.json` name/description on copy; standalone appends to override name. Null ⇒ byte-identical.
Reqs: FR-PROF-0021. Accept: S15e green; no-profile plugin.json unchanged. Depends: S1 (uses
ProfileDescriptor fields via caller). PARALLEL with S2, S3, S6, S7, S11.

**S10 — thread activeProfile to ctx.** `pluginProcessSpecEntries(release, activeProfile)` sets
`TargetContext.activeProfile` (`:40-44`).
Reqs: FR-PROF-0030. Accept: typecheck; directive eval receives profile. Depends: S1, S6.

**S11 — CLI flags.** `--profile <name>` (reject `/`,`\`,`.json` via `InvalidArgumentError`),
`--profileSource <dir>` (default `<source>/src/rosettify-plugins/profiles`); extend help
(FR-CLI-0060); populate `ResolvedSources.profileSource` + `GenerateOptions.profile`.
Reqs: FR-CLI-0032/0033. Accept: S15f CLI tests; path-like value exits ≠0 with usage. Depends: S1.
PARALLEL with S2, S3, S6, S7, S9.

**S12 — generate() pre-flight.** After release validation, before `buildVfs`: if `profile` set,
`loadProfile(...)` (abort non-zero on throw, no output); pass descriptor to `buildAllSpecs`; pass
`activeProfile` through.
Reqs: FR-PROF-0001, FR-CLI-0032.AC4. Accept: negative descriptors abort before any write (S15b/e2e).
Depends: S1, S2, S11.

**S13 — targets.ts integration hub (SERIALIZED).** `SpecBuildContext += profile`; per spec:
`destination = name + destinationSuffix`; `modelVocabulary = resolveEffectiveVocabulary(...)`; compose
`pluginNormalizeSubagentRequiredModel(<per-IDE mapper>)` into `extraAfterIndexes` for the 6
non-Antigravity targets; pass `manifestSuffix` into `pluginCopy`; thread `activeProfile` into
`buildPipeline`→`pluginProcessSpecEntries`. Antigravity pipeline unchanged.
Reqs: FR-PROF-0010/0020, FR-COPY-0083, FR-ARCH-0059. Accept: full build (no profile) structurally
identical (G-B); `--profile lightweight` produces `core-*-light` (G-C). Depends: S2,S3,S4,S5,S7,S9,S10.
CRITICAL PATH. MUST be serialized — sole writer of `targets.ts` and the only place all wiring converges.

**S14 — reference profile.** NEW `profiles/lightweight.json` per SPECS §4 reference (destinationSuffix
`-light`, name `-light`, desc ` (lightweight)`, sample `modelOverrides`). Reqs: FR-PROF-0001.AC1.
Accept: `loadProfile` accepts it. Depends: — (data). PARALLEL with all.

**S15 — tests** (see Test plan). Depends: S13 for integration/e2e; unit sub-steps depend on their
target step and may land alongside it.

## Critical path

S1 → S3 → S4 → S13 → S15(e2e). Parallel tributaries fold into S13: {S2}, {S5}, {S6→S10}, {S7}, {S9},
{S11→S12}. S8 is a parallel critical strand (independent fileset) that must complete for a green suite.
S14 is free. Minimum serial length is the five-node hub chain; everything else fans out under it.

## Parallel-safe fan-out (after S1)

Wave 1 (post-S1, disjoint files): S2, S3, S6, S8, S9, S11, S14.
Wave 2: S4, S5, S7 (need S3); S10 (needs S6); S12 (needs S2,S11).
Wave 3: S13 (hub, alone). Wave 4: S15 integration/e2e.
Unlisted pairs are sequential only through shared deps; parallelism is valid solely because owned
filesets are disjoint (see ownership map). Only S13 must run ALONE.

## Test plan (vitest; existing ~410 pass locally, 564/8 in full run — 8 baseline-red fixed by S8)

| Test file | Maps to | Cases |
|---|---|---|
| S15a `tests/unit/spec/model-maps.test.ts` | FR-COPY-0020/21/22.AC*, FR-ARCH-0059, FR-PROF-0011 | exhaustive skip+drop; non-exhaustive byte-parity; Claude family-key (`claude-haiku-4-5`→haiku); merged cursor/copilot maps; codex both-site parity; `MODEL_DROP` |
| S15b `tests/unit/spec/profiles.test.ts` (NEW) | FR-PROF-0001.AC2–7, DATA-CFG-0006.AC5–9 | V-exist/V-parse/V1/V2/V3/V7 aborts; V4 standalone inherit; V5 dead-entry silent; resolveEffectiveVocabulary |
| S15c `tests/unit/vfs/directives.test.ts` (extend) | FR-PROF-0030.AC1–5 | matchesProfile active/inactive; matchesTarget ignores `profile-`; empty trailing token inert; existing 72-77 stay green |
| S15c' `tests/unit/file-processors/file-apply-overrides.test.ts` | FR-PROF-0030.AC4 | overwrite+inactive-profile excluded before truncation |
| S15d `tests/unit/plugin-processors/plugin-normalize-subagent-model.test.ts` (NEW) | FR-COPY-0083.AC1–6 | real A–E fixtures per SPECS §10; SYNTHETIC dedup `gpt-5.4, claude-opus-4-8, gpt-5.4`→`gpt-5.4`; no-survivor→`inherit`; profile-block path; effort-strip |
| S15e `tests/unit/plugin-processors/plugin-copy.test.ts` | FR-PROF-0021.AC1–3 | main+standalone suffix; null=unchanged |
| S15f `tests/unit/cli` | FR-CLI-0032.AC3, FR-CLI-0033.AC1–3 | path-like reject; profileSource default/override |
| S15g `tests/e2e/parity.e2e.test.ts` (+ S8 oracle) | NFR-0001 | 7 base targets green WITH trap fixture; profile-combo path set for `--profile lightweight` |
| S15h `tests/e2e` profiled run (NEW) | FR-PROF-0020/0030/0040, G-C | `core-*-light` alongside originals; originals untouched; light `coding-flow` body wins in light only; no-profile excludes trap fixture |

Negative cases V1–V5 are S15b + a generate-level e2e asserting non-zero exit AND empty output dir.
Whole suite MUST end green.

## Verification gates (final, from implementation-scope §Verification)

- **G-A** `npm run typecheck` clean + `npm run test` green in `src/rosettify-plugins`.
- **G-B** Default run (no profile): output path SET unchanged vs HEAD (2229 paths, vfsSize 320);
  confirm the ONLY content delta is `subagent_required_model` filtering.
- **G-C** `--profile lightweight`: `core-*-light` folders alongside originals; originals untouched;
  light `coding-flow` body wins in light plugins only.
- **G-D** Negatives (bad outer key, `core-antigravity` block, bad claude inner key, missing file,
  unparseable JSON, path-like `--profile`) all abort non-zero with NO output written.
- **G-E** `venv/bin/python scripts/pre_commit.py` at repo root (regenerates plugins + runs checks).

## Open items for orchestrator

- FR-COPY-0083 amendment (GAP-1 Codex effort strip) — decided; needs unit text update.
- FR-ARCH-0005 ruling on the `exhaustive` behavior flag — judged conforming; confirm (architecture-
  notes §Infeasible #3).
- De-dup evidence is a synthetic fixture by necessity (GAP-2) — accepted in S15d.
