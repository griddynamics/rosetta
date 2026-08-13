<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Execution Plan — Specs Template Update

Size: **LARGE**. Companion specs: `SPECS-TEMPLATE-UPDATE-SPECS.md` (owns **WHAT**: every shape, signature, order, severity). This file owns **HOW**: sequence, ownership, done-criteria. Contracts are **not** restated here — a step that needs a shape reads the specs section it cites.

Root: `/Users/isolomatov/Sources/GAIN/rosetta`. Working dir for all commands: `/Users/isolomatov/Sources/GAIN/rosetta/src/rosettify`.

**35 steps** · 6 phases · 3 concurrent lanes in phase 1 · every produce step followed by a fresh-eyes check.
**21 in-scope requirement ids.** ⚠ 9 of them are currently `Draft` — see §8.

---

## 0. READ THIS FIRST — five warnings every engineer must carry

Paste these into every engineer prompt. They are the five things that go wrong.

> **W1 — Requirement ids in code comments ONLY.** Put them in the file-header `// Implements FR-SPECS-XXXX (…)` line and per-function JSDoc `/** FR-SPECS-XXXX — … */`, following the existing convention (`rubric.ts:1,23`; `errors.ts:8-67`). **Never** in a help string, note, schema `description`, error template, finding `message`, or any other emitted value. FR-SPECS-0043 and FR-ARCH-0016 forbid it and only `tests/unit/specs/leakage.test.ts` would catch a leak.

> **W2 — The warning-tier checks stay simple text heuristics.** `checkMeasurableNfr`, `checkModalVerbs`, `findDuplicateStatements` and the new evidence/NFR-area checks are deliberately dumb token matches, reported as the omission each detects and **never** as a judgment of quality or provenance. **Nobody makes `checkMeasurableNfr` smarter.** This was an explicit user ruling. FR-SPECS-0021.AC13 is the regression test: a numeric token with no genuine threshold must produce **no** finding.

> **W3 — Error reporting aggregates; it never fails fast.** Every new per-item check pushes a `RejectRef` onto the existing `rejects` array and lets `aggregate()` (`aggregate.ts:17-20`) build the one human-readable string (FR-SPECS-0030). Never `return err(...)` from inside a per-item check. Do **not** refactor the pre-existing early-return loop at `add.ts:129-132` — it is recorded as out of scope (specs §14 G1).

> **W4 — Canon is the repository, not the plugin cache.** `~/.claude/plugins/cache/rosetta/rosetta/3.1.6/skills/` still carries the **OLD** Given/When/Then requirement template because plugins have not been regenerated. Canon: `instructions/r3/core/skills/requirements-authoring/assets/ra-requirement-unit.md` and that skill's `SKILL.md`. Under the new model EARS lives on each **criterion** as attributes; the `statement` is a governing rule and explicitly **not** an EARS sentence. If a skill you load says otherwise it is stale — do not design back to the old model and do not report the new model as a defect.

> **W5 — `invalid_nfr_area` does not exist.** It was deleted from the requirements. The nine ISO quality-characteristic codes are **pre-registered and recommended, never mandatory**. Any registered area is legal on any type. An NFR whose area is outside the nine is **accepted** on write and reported by `validate` as a **warning**. Rationale to preserve: the instructions layer prescribes, the tool layer permits. **Do not "fix" the authoring skill's id grammar** — it is deliberately firm at its own level. FR-SPECS-0004 and FR-SPECS-0006 now agree on this; no precedence rule is needed.

---

## 1. THE BUILD/TEST BOUNDARY — do not escalate this

**`npm run typecheck` stays GREEN through the entire implementation phase with zero test-file edits.
`npm run test` WILL FAIL between the implementation phase and the test phase. That is expected. It is NOT a blocker. Do not stop, do not escalate, do not "fix" it by editing tests during implementation.**

Evidence:

| Fact | Source |
|---|---|
| `"typecheck": "tsc --noEmit"` — **no `-p`**, so it resolves `tsconfig.json` | `package.json` scripts |
| `"include": ["src/**/*.ts"]`, `"exclude": ["node_modules","dist","tests"]` | `tsconfig.json:18-19` |
| `"build": "tsc -p tsconfig.build.json"`, which excludes `tests` and `**/*.test.ts` | `package.json`, `tsconfig.build.json:3` |
| `vitest.config.ts` declares **no** `typecheck` block ⇒ vitest transpiles without type checking | `vitest.config.ts:1-23` |
| Baseline `npm run typecheck` on the untouched tree: clean | verified |

Why `npm run test` fails: `pretest` runs `npm run build`, which succeeds (src only); vitest then executes with the old-shape fixtures, so `c.given` and `doc.component` are `undefined` at **runtime** and assertions fail. `tests/fixtures/specs.ts` is **task #1 of the test phase** and unblocks 22 of 27 unit files at once.

**Implementation-phase gate = `npm run typecheck` && `npm run build`. Nothing else.**

---

## 2. Plan-level EARS requirements

Product behaviour is already specified as EARS criteria in `docs/requirements/rosettify/SPECS.md` — restating it here would violate DRY. These EARS statements govern the **execution process** only.

- **PR1** (ubiquitous) The implementation phase shall leave `npm run typecheck` and `npm run build` passing at every phase boundary.
- **PR2** (unwanted) If a phase-0 file is edited by more than one agent concurrently, the orchestrator shall serialize them, because phase 0 owns the entire shared type surface.
- **PR3** (event) When a produce step completes, a check step owned by a different agent shall verify it against the cited specs section before the next dependent step starts.
- **PR4** (unwanted) If an engineer finds a requirement ambiguous, the engineer shall stop and report to the orchestrator rather than choose — every known ambiguity is already decided in specs §13.
- **PR5** (state) While lanes A, B and C run concurrently, no lane shall edit a file outside its declared fileset.
- **PR6** (event) When an emitted string is authored or edited, the author shall re-run the leakage test before declaring the step done.

---

## 3. Phase / lane overview

| Phase | Steps | Concurrency | Shared-type risk |
|---|---|---|---|
| P0 Foundation | 1-11 | **serialized, ONE engineer** | owns every shared type — must not be split |
| P1 Lanes A / B / C | 12-25 | **3 concurrent engineers** | none: disjoint filesets, all types frozen by P0 |
| P1 close | 26 | — | — |
| P2 Help content | 27-30 | serialized, one engineer | none |
| P3 Caller-facing text | 31-32 | serialized, one engineer | none |
| P4 Implementation gate | 33-34 | — | — |
| P5 Docs | 35 | — | — |

**Why P0 cannot be parallelized:** every other file imports `Spec` / `AcceptanceCriterion` / `SpecsDocument` from `core.ts` and/or the result types from `output.ts`, and `schemas.ts` imports enum constants from `core.ts`. Two agents editing these concurrently would each be guessing at the other's in-flight field names. **Land P0 completely and get it type-checking before anything else starts.**

**Two type-freeze obligations on P0, both load-bearing:**
1. `EARS_CONDITION_WORD` is declared in `core.ts` (step 3) and only *re-exported* by lane C's `markup-grammar.ts` (step 20). Declaring it in lane C would make lane B depend on lane C.
2. `SpecsDocument.purged_ids` is declared in `core.ts` (step 3) and its uniqueness semantics land in step 5 — both **before** lane A's `purge.ts` work (step 14). Without this, the registry would be a cross-lane dependency between P0 and lane A mid-flight.

**Concurrency after the registry work: UNCHANGED.** Lane filesets remain disjoint — Lane A `{add.ts, update.ts, purge.ts}`, Lane B `{rubric.ts, validate.ts, query-filter.ts}`, Lane C `{markup-grammar.ts, render.ts, req-parser.ts, migrate.ts}`. Ten filenames, zero duplicates. `purge.ts` was previously on the unchanged list and is touched by nobody else, so it slots into Lane A without forcing any new serialization. `write.ts` stays unedited — the registry is enforced through its existing call to `validateUniqueIds` (`write.ts:74`), which is P0 work.

Test work (fixtures + 27 test files + 2 new test files + e2e) belongs to the **later test phase**, outside this plan's 35 steps, per §1.

---

## 4. WBS

Fields per step: **files** (exact, dispatchable) · **req** (requirement ids served) · **agent** + model class · **pred** (predecessors) · **MoSCoW** · **AC** (done-criteria) · **watch**.

All engineer steps: `rosetta:engineer`. All check steps: `rosetta:reviewer`. Model class **opus** where the change is semantic or wide; **sonnet** where it is mechanical or text-only.

### Phase 0 — Foundation (serialized, one engineer end-to-end)

---

**S1 · Size limits and constants** — Must
files `src/shared/constants.ts` · req FR-SPECS-0007 · agent engineer/**sonnet** · pred —
AC `SPECS_MAX_SPECS === 10000`; new `SPECS_MAX_EVIDENCE_PER_SPEC = 50`; no other cap altered; **no `purged_ids` cap** (specs §13 D9); typecheck green.
watch `constants.ts` is shared with the `plan` command — touch only the `SPECS_*` names.

**S2 · Error codes and templates** — Must
files `src/commands/specs/errors.ts` · req FR-SPECS-0001, 0009, 0023 · agent engineer/**sonnet** · pred S1
AC four new consts + `TEMPLATES` entries per specs §10.1: `ERR_INVALID_EARS`, `ERR_DUPLICATE_CRITERION_ID`, `ERR_ID_TYPE_MISMATCH`, `ERR_INVALID_LEVEL`; `ERR_INVALID_FORMAT`'s JSDoc at `errors.ts:62` mentions `xml`; **no `invalid_nfr_area`**; every template is generic prose with no id/path/module name (W1).
watch W5. `duplicate_id` and `invalid_type` are existing codes with widened triggers — no new consts for them.

**S3 · Core types, enums and shared maps** — Must
files `src/commands/specs/core.ts` (types/enums region, `core.ts:31-150`) · req FR-SPECS-0001, 0002, 0004 · agent engineer/**opus** · pred S2
AC `EARS_PATTERNS`/`EarsEnum`, `LEVELS`/`LevelEnum`, `EARS_CONDITION_WORD`, `RESERVED_NFR_AREAS` (nine codes, exact names per specs §4.1) exported; `AcceptanceCriterion` reshaped per specs §4.2; `Spec` gains `subsystem`/`component`/`evidence` and `level: LevelEnum` per §4.3; `SpecsDocument.component` → `system` **and gains `purged_ids: string[]`** per §4.4; `KNOWN_SPEC_FIELDS` gains the three new spec-field names; `newDocument(system?)` renamed.
watch `if` and `while` are legal TS **property** names — do not rename them (specs §4.2). `purged_ids` is a **document** field, not a spec field — it does **not** go in `KNOWN_SPEC_FIELDS`. W4.

**S4 · Core write-path validators** — Must
files `src/commands/specs/core.ts` (validators region, `core.ts:167-346`) · req FR-SPECS-0001, 0004, 0007, 0009 · agent engineer/**opus** · pred S3
AC every signature in specs §5.1 exists and returns `errorCode | null` or the stated pure value: `validateEars`, `validateLevel`, `validateCriteria`, `assignCriterionIds`, `validateIdTypeConsistency`, `ensureReservedAreas`; `validateAreaRegistration` is reserved-aware; `checkStringLimits`'s `isNameLike` gains `"system"`; `validateSizeLimits` checks `evidence.length` and does **not** cap `purged_ids`.
watch `ensureReservedAreas` must be idempotent and must **never** be reachable from a read path (FR-SPECS-0021.AC9 — validate mutates nothing). `assignCriterionIds` never renumbers a supplied id.

**S5 · 🆕 Purged-id registry semantics** — Must
files `src/commands/specs/core.ts` (`validateUniqueIds` at `:269`, `loadSpecs` at `:353-360`, `newDocument` at `:369-381`) · req FR-SPECS-0002, 0005, 0009, 0016 · agent engineer/**opus** · pred S4
AC `validateUniqueIds` seeds its seen-set from `doc.purged_ids ?? []` before walking `doc.specs`, so a live id colliding with a **live or purged** id returns `duplicate_id` (specs §5.1); `newDocument()` seeds `purged_ids: []` **and** calls `ensureReservedAreas`; `loadSpecs` back-fills a missing `purged_ids` to `[]` alongside the existing `previous_version` back-fill.
watch this one step makes FR-SPECS-0016's "add reusing a purged id ⇒ `duplicate_id`" work for **every** write subcommand, because `write.ts:74` already routes add/update/migrate through `validateUniqueIds`. **`write.ts` needs no edit — do not touch it.** `commands/plan/core.ts:327` has a separate, unrelated `validateUniqueIds`; leave it alone.

**S6 · Named result types** — Must
files `src/commands/specs/output.ts` · req FR-SPECS-0050, 0002, 0024, 0023, 0025, 0008 · agent engineer/**sonnet** · pred S5
AC `SpecFieldGuide` added per specs §4.5; `SpecDocumentSummary.component`→`system` (`output.ts:16`, body at `:56`); `SpecInfoResult.component`→`system` (`:204`); `SpecRenderResult.format` widens to the three-value union, left **inline** (specs §4.6); `buildSpecWriteResult` reads `doc.system`.
watch do not name the `format` union — specs §4.6 states the rule and why. `SpecPurgeResult` shape is **unchanged**.

**S7 · `SpecSkipped` semantics correction** — Must
files `src/commands/specs/output.ts` (`output.ts:216-223`) · req FR-SPECS-0025 · agent engineer/**sonnet** · pred S6
AC the shape stays exactly `{ source, reason }` — **no third field**; the JSDoc no longer claims whole-file-only exclusion and instead documents per-unit skip entries sharing a `source`, per specs §4.6.
watch split out deliberately so the false comment cannot survive the behaviour change in step 23.

**S8 · Field-guidance data module** — Must
files `src/commands/specs/field-guide.ts` **(new)** · req FR-SPECS-0008 · agent engineer/**opus** · pred S6
AC `SPEC_FIELD_GUIDE: readonly SpecFieldGuide[]` with one entry per spec-unit field and per criterion field, in schema order; every entry carries `field`, `type`, `required`, `default`, `guidance`; guidance content per `SPECS.md:290`; module imports only the type from `output.ts` (leaf).
watch **W1 plus AC6**: guidance may not name a markup notation, file format, requirement id, ticket id, or internal path — so no "JSON", no "XML", no "markdown", no path. Guidance is directive instruction to the caller and states what the value must *contain*, not what the field is named. `purged_ids` is a document field, not a spec field — **no guide entry**.

**S9 · Schema dictionary** — Must
files `src/commands/specs/schemas.ts` · req FR-SPECS-0001, 0008, 0050, 0023, 0002, 0024 · agent engineer/**opus** · pred S8
AC `acceptanceCriterionSchema` describes the new criterion fields with the `ears` enum; `specSchema` gains `subsystem`/`component`/`evidence` and `level` carries the `LEVELS` enum; **every** `Spec` and `AcceptanceCriterion` property's `description` is looked up from `SPEC_FIELD_GUIDE` by field name (not hand-typed); `specDocumentSummarySchema` (`:84`) and `specInfoResultSchema` (`:270`) use `system`; `renderInputSchema.format` enum (`:411`) gains `"xml"`; `specsSchemasDict` gains `SpecFieldGuide`.
watch AC3 requires schema descriptions and `field_guide` entries to be **the same strings** — achieved by lookup, never by copy. Import direction is `field-guide.ts → schemas.ts`; `help-content.ts` already imports `schemas.ts` (`help-content.ts:22`), so the reverse edge would be a cycle. `SpecsDocument` is not a result type and has no dict entry — `purged_ids` needs no schema work.

**S10 · info rename** — Must
files `src/commands/specs/info.ts` (`info.ts:67`) · req FR-SPECS-0002, 0024 · agent engineer/**sonnet** · pred S6
AC returns `system: doc.system`; no other behaviour change.
watch folded into P0 on purpose — a one-line change that does not justify its own lane.

**S11 · ✅ CHECK + git checkpoint — foundation** — Must
files (review only) all of S1-S10 · req all P0 ids · agent reviewer/**opus** · pred S10
AC `npm run typecheck` **green**; `npm run build` **green**; every signature in specs §4 and §5.1 present with the exact name; `RESERVED_NFR_AREAS` names match `SPECS.md:157` word for word; `SpecsDocument` carries both `system` and `purged_ids`; `validateUniqueIds` reads the registry; **no `invalid_nfr_area` anywhere** (`grep -rn invalid_nfr_area src/` → 0); W1 audit (`grep -nE 'FR-(SPECS|ARCH|HELP)-[0-9]{4}' src/commands/specs/*.ts` — every hit inside a `//` or `/** */` comment); `field-guide.ts` guidance passes the notation deny-list by inspection. Then commit on a feature branch.
watch reviewer must be a **different agent** than the P0 engineer (PR3). Do not run `npm run test` here — see §1.

---

### Phase 1 — Lane A: write paths (concurrent with B and C)

**S12 · add: criterion assembly, new write checks, reserved-area backfill** — Must
files `src/commands/specs/add.ts` · req FR-SPECS-0001, 0004, 0009, 0010 · agent engineer/**opus** · pred S11
AC `prepareItem` gains, per specs §5.3, `validateLevel` and `validateIdTypeConsistency` after the existing enum checks, and `assignCriterionIds` + `validateCriteria` after the `Spec` literal; the literal populates `subsystem`, `component`, `evidence` with their defaults; **`cmdAdd`'s `build` calls `ensureReservedAreas(doc)` before `autoRegisterAreas(doc, newIds)` at `add.ts:128`**; every new check returns a `RejectRef` into `rejects`.
watch **`ensureReservedAreas` here is required by FR-SPECS-0004.AC7** — an existing document is never re-created, so `newDocument()` alone would never backfill the nine codes into it. This mirrors what `migrate.ts` does at step 23. **W3** — no `return err(...)` from a per-item check; a 3-item batch with 2 failures must yield one string naming both. Do **not** touch the loop at `add.ts:129-132` (specs §14 G1). W5 — no NFR-area rejection. No purged-id work here: step 5 covers it through `write.ts:74`.

**S13 · update: type and criterion validation on the merged spec** — Must
files `src/commands/specs/update.ts` · req FR-SPECS-0009, 0013 · agent engineer/**opus** · pred S11
AC after `validateVerification` (`update.ts:117-121`): `validateType(merged.type)`, `validateIdTypeConsistency(existing.id, merged.type)`, `validateLevel(merged.level)`, and `assignCriterionIds`+`validateCriteria` when the patch touched `acceptance` — each pushing onto `rejects`; **the file-header comment at `update.ts:4-11` is corrected** — it currently asserts `invalid_type` is add-only, which this step makes false.
watch `validateType` on this path is **required** by FR-SPECS-0009.AC3 and now named in FR-SPECS-0013's catalog (`SPECS.md:387`), not a bonus: `update.ts:104-121` validates no `type` today. Leave the guarded-field and Modified/ToBeModified logic (`update.ts:92-132`) alone, and do **not** add `evidence` to the normative-edit condition — an evidence edit is explicitly not normative (`SPECS.md:68`).

**S14 · 🆕 purge: record the purged-id registry** — Must
files `src/commands/specs/purge.ts` · req FR-SPECS-0009, 0016 · agent engineer/**sonnet** · pred S11
AC inside `cmdPurge`'s `build`, after the `referenced_by_others` gate and **before** the `doc.specs` filter at `purge.ts:52`, append every id in `purgeable` to `doc.purged_ids` with a dedupe union per specs §5.3b; `SpecPurgeResult` and `affected: []` unchanged; the file-header comment (`purge.ts:1-6`) gains the retain-identity behaviour.
watch order matters — record **before** removing, so a failed `referenced_by_others` batch records nothing. The rule to preserve in the comment: purge is a complete erase of **content** and deliberately not of **identity**. No cap on the registry (specs §13 D9). This file was previously on the "unchanged, deliberately" list; it now changes.

**S15 · ✅ CHECK — lane A** — Must
files (review only) `add.ts`, `update.ts`, `purge.ts` · req FR-SPECS-0001, 0004, 0009, 0010, 0013, 0016 · agent reviewer/**sonnet** · pred S14
AC typecheck green; every check aggregates (W3) — verified by reading each new branch; no requirement id in any emitted string (W1); `id_type_mismatch` reachable from **both** add and update; `ensureReservedAreas` present in add's build; purge records before removing and the recorded ids survive a round trip through `write.ts`.

---

### Phase 1 — Lane B: validate surface (concurrent with A and C)

**S16 · rubric predicates** — Must
files `src/commands/specs/rubric.ts` · req FR-SPECS-0006, 0021 · agent engineer/**opus** · pred S11
AC every predicate in specs §5.2 exists with the stated name and signature; `checkEars` is **deleted**; `checkAcceptanceComplete`'s contract becomes non-empty `system`/`shall`; `findLocationGaps` implements the §5.2 truth table exactly; `checkMeasurableNfr`, `checkModalVerbs`, `findDuplicateStatements` bodies are **byte-identical** to today; the file-header comment is rewritten so it no longer claims "phrasing only".
watch **W2** — the three existing heuristics are untouched. `checkEars` is deleted, not renamed, so no stale test can keep passing.

**S17 · validate findings** — Must
files `src/commands/specs/validate.ts` · req FR-SPECS-0004, 0005, 0006, 0021 · agent engineer/**opus** · pred S16
AC every row of specs §7 emitted with the exact `check` string and severity; the `ears_pattern` block (`validate.ts:139-141`) **removed**; `location_completeness` emits error **or** warning per level; `recommended_nfr_area` warning added; `criterion_id_format` and `duplicate_criterion_id` findings added; `level_enum` finding added; `sizeLimitIssue` (`validate.ts:53-66`) gains the evidence branch; the `acceptance_completeness` message no longer says "given/when/then"; `ok === (error_count === 0)`.
watch **FR-SPECS-0021.AC9 — validate must mutate nothing.** Do not call `ensureReservedAreas` or `autoRegisterAreas` here; area registration is checked via the reserved-aware `validateAreaRegistration` only. The `uniqueness` finding reads live ids only — the purged registry is a **write-time** rule, and re-reporting it on every read would flag nothing actionable. `approve.ts` needs no edit — it inherits through `runValidation`.

**S18 · query filter keys** — Must
files `src/commands/specs/query-filter.ts` · req FR-SPECS-0012 · agent engineer/**sonnet** · pred S11
AC `FILTER_KEYS` gains `level`, `subsystem`, `component`, `ears`, `evidence` (16 total); `matchFieldValue` implements each per specs §8; `evidence` accepts only `present`/`absent` and yields `invalid_query` otherwise.
watch unknown **key** ⇒ `invalid_filter`; malformed **value** on a known key ⇒ `invalid_query`. `query.ts` needs no edit.

**S19 · ✅ CHECK — lane B** — Must
files (review only) `rubric.ts`, `validate.ts`, `query-filter.ts` · req FR-SPECS-0004, 0005, 0006, 0012, 0021 · agent reviewer/**opus** · pred S18
AC typecheck green; specs §7 table matched row for row on `check` string and severity; W2 confirmed by diffing the three heuristic bodies; no write or mutation anywhere in `validate.ts`; no requirement id in any `message` (W1).

---

### Phase 1 — Lane C: markup round trip (concurrent with A and B)

**S20 · canonical grammar module** — Must
files `src/commands/specs/markup-grammar.ts` **(new)** · req FR-SPECS-0023, 0025 · agent engineer/**opus** · pred S11
AC every export in specs §5.4 present; attribute order exactly specs §6.1; `EARS_CONDITION_WORD` **re-exported from `core.ts`, not redeclared**; data only — no emit or parse logic; imports nothing beyond `core.ts` types (leaf).
watch specs §6.1 is **decided** — do not re-derive attribute order from FR-SPECS-0023's "ending with the approval group", which is loose phrasing that conflicts with the canonical template. Template order wins because the round trip governs.

**S21 · render: markdown/text + xml emitter** — Must
files `src/commands/specs/render.ts` · req FR-SPECS-0002, 0023 · agent engineer/**opus** · pred S20
AC `doc.component`→`doc.system` (`render.ts:60,82`); markdown and text show `level` with `subsystem`/`component` and `evidence`, and each criterion reads pattern → condition → responder → outcome per specs §6.4; new `xml` branch implements every rule in specs §6.2 including attribute escaping; `renderSpecs`'s `format` param widens; `cmdRender`'s guard (`render.ts:124`) admits `xml` and still rejects anything else with `invalid_format`.
watch `changed` is a **calendar date** in xml only — storage stays ISO8601 UTC. Omit `evidence` element entirely when empty; omit `subsystem`/`component`/`depends`/`related` attributes when empty. `purged_ids` is document-level bookkeeping and is **never rendered**. No file is ever written (AC9).

**S22 · req-parser rewrite** — Must
files `src/commands/specs/req-parser.ts` · req FR-SPECS-0025 · agent engineer/**opus** · pred S21
AC attribute-based extraction via `MARKUP_TO_FIELD`; criteria parsed from self-closing `<criteria …/>` attributes; `KNOWN_TAGS`/`extractKnownTags` reduced to `ELEMENT_FIELDS`; `splitGwt`, prose `extractAcceptance`, and `normalizeImplementation`'s legacy bracket handling (`req-parser.ts:170-202,207-239,272-300`) **removed**; a non-canonical unit yields a skip reason and is never reconstructed by inference; multi-location `<evidence>` splits on `EVIDENCE_SEPARATOR`.
watch this is a **rewrite, not a patch**. Build it against step 21's emitter output. W4 — the old shape is gone, do not preserve tolerance for it.

**S23 · migrate: per-unit skips, new defaults, reserved areas** — Must
files `src/commands/specs/migrate.ts` · req FR-SPECS-0002, 0004, 0025 · agent engineer/**opus** · pred S22
AC `toFullSpec` (`migrate.ts:34-58`) defaults `subsystem`/`component`/`evidence`; skipped **units** are reported as `SpecSkipped` entries per specs §4.6 (shape `{source, reason}`, no third field); `migrated` counts canonical units only; `ensureReservedAreas` runs on the assembled document; an off-vocabulary NFR area imports normally.
watch **W5**. The `SpecSkipped` comment was already corrected in step 7 — this step must leave that comment true.

**S24 · round-trip proof** — Must
files `src/commands/specs/markup-grammar.ts`, `render.ts`, `req-parser.ts` (adjust only if the round trip fails) · req FR-SPECS-0023, 0025 · agent engineer/**opus** · pred S23
AC a spec carrying every optional attribute and every element survives `renderSpecs(doc, specs, "xml")` → parser → deep-equal against the source `Spec`; any divergence is fixed in the grammar module or the two consumers, never by special-casing one side.
watch this is the mechanism that makes the two requirements provable inverses. Write it as a throwaway script under the scratchpad if the test phase has not started; the durable test lands in the test phase.

**S25 · ✅ CHECK — lane C** — Must
files (review only) `markup-grammar.ts`, `render.ts`, `req-parser.ts`, `migrate.ts` · req FR-SPECS-0002, 0004, 0023, 0025 · agent reviewer/**opus** · pred S24
AC typecheck green; emitted attribute order matches specs §6.1 exactly; every specs §6.2 rule observable in the emitter; no legacy GWT or bracket-form path survives (`grep -n 'given\|Given:\|splitGwt\|LEGACY_' src/commands/specs/` → no live code); round trip demonstrated.

---

### Phase 1 close

**S26 · ✅ Integration check + git checkpoint — lanes merged** — Must
files (review only) all lane A/B/C files · req all P1 ids · agent reviewer/**opus** · pred S15, S19, S25
AC `npm run typecheck` green; `npm run build` green; no file was edited by two lanes (ten filenames, zero duplicates); W1 audit re-run across every changed file. Then commit.
watch **do not run `npm run test`** — see §1.

---

### Phase 2 — Help content (serialized, one engineer)

**S27 · terms, concepts, descriptions** — Must
files `src/commands/specs/help-content.ts` · req FR-SPECS-0002, 0004, 0060 · agent engineer/**opus** · pred S26
AC new `terms` section defining `system`, `subsystem`, `component`, `area`, `level`, criterion `system`, plus the several-systems sentence (specs §9, `SPECS.md:865`); `concepts.spec_unit` field list updated and the Given/When/Then mention removed; concepts gain the five patterns with their condition words, criterion sub-ids, evidence, statement-vs-criteria, Draft-means-ready; `concepts.areas` states the nine are pre-registered and **recommended** and that any registered area is accepted; top-level `description` says "system".
watch **W1** and **W5**. No Rosetta-specific examples — the command serves any project. Do not direct the caller to an external template (AC6).

**S28 · field_guide, limits, query keys, path convention** — Must
files `src/commands/specs/help-content.ts` · req FR-SPECS-0007, 0008, 0012, 0023, **0071** · agent engineer/**sonnet** · pred S27
AC `field_guide` section = `SPEC_FIELD_GUIDE` from `field-guide.ts`; `limits` gains `max_evidence_per_spec` and shows `max_specs` 10000, with **no `purged_ids` entry** (there is no such cap); `query_notation.keys` lists all 16; the `render` subcommand's `--format` text reads markdown | text | xml; **`specs_file` gains the documented path form** `docs/REQUIREMENTS/<system>/specs.json` as a recommendation, and its `convention`/`note` say "system" not "component".
watch **FR-SPECS-0071 is a missing string, not a reword** — the path form is absent from the source entirely (`grep -rn REQUIREMENTS src/` → 0 hits). This step is its only owner; if it is skipped, FR-SPECS-0071 is orphaned.

**S29 · notes array** — Must
files `src/commands/specs/help-content.ts` (`specsNotes`, `help-content.ts:25-38`) · req FR-SPECS-0061, 0016 · agent engineer/**sonnet** · pred S28
AC every bullet at `SPECS.md:899-918` is represented; the six new topics per specs §9 added; the stale `migrate` note ("one-time import of legacy markdown spec blocks") **replaced**; the reserved-codes note states they are recommended and that any other registered area is still accepted; **the purge note is amended to say a purged id stays taken forever** and is never given to a different spec.
watch **W1** — every note is standalone directive guidance with no id, path, or module name. `help-content.test.ts:111-112` pins "exactly 12 notes"; that test grows in the test phase, not here.

**S30 · ✅ CHECK + git checkpoint — help content** — Must
files (review only) `help-content.ts` · req FR-SPECS-0004, 0007, 0008, 0012, 0016, 0023, 0060, 0061, 0071 · agent reviewer/**opus** · pred S29
AC typecheck green; `npx vitest run tests/unit/specs/leakage.test.ts` **passes** (it is fixture-independent, so it runs even mid-implementation); every specs §9 row present; the notation deny-list holds over the emitted `field_guide`; path form present; purge note amended. Then commit.
watch this is the one test that can and must be run before the test phase.

---

### Phase 3 — Caller-facing text (serialized)

**S31 · tool definition and CLI flag text** — Must
files `src/commands/specs/index.ts` (`:214-215`, `:250`), `src/frontends/cli.ts` (`:369`) · req FR-SPECS-0002, 0023 · agent engineer/**sonnet** · pred S30
AC `specsToolDef.description` says "system's requirements … one JSON document per system"; the `format` property description reads markdown | text | xml; the CLI `--format` flag desc no longer reads "markdown (default) or text".
watch both files are inside `src/**`, so they are compile-relevant. `frontends/mcp.ts` and `registry/*` need **no** change; the `--force` flag purge uses already exists and needs no CLI work.

**S32 · ✅ CHECK — caller-facing text** — Should
files (review only) `index.ts`, `cli.ts` · req FR-SPECS-0002, 0023 · agent reviewer/**sonnet** · pred S31
AC typecheck green; no stale "component" or "markdown or text" string remains (`grep -rn "per component\|markdown (default) or text" src/`).

---

### Phase 4 — Implementation gate

**S33 · Implementation validation** — Must
files (verification only) whole `src/rosettify/src` tree · req all 21 ids · agent validator/**opus** · pred S32
AC `npm run typecheck` green; `npm run build` green; traceability sweep — every one of the 21 ids maps to at least one landed change per specs §1, and FR-SPECS-0022 is confirmed as a deliberate no-op; W1 audit clean; `grep -rn invalid_nfr_area src/` → 0; `write.ts` diff empty. **Report `npm run test` as expected-red with the §1 reason, not as a failure.**
watch do not begin fixture repair here — that is the test phase, not this plan.

**S34 · 🛑 HITL — implementation review gate** — Must
files (report only) · req all · agent orchestrator → user · pred S33
AC user sees: the 21-id traceability table, the two new modules, the purged-id registry design, the decided resolutions that shaped code (specs §13 D1/D2/D5/D7/D9/D10), the §14 out-of-scope list, and the expected-red `npm run test` with its reason. User approves before the test phase opens.
watch **surface specs §14 G5 first** — 9 of the 21 in-scope units are `status="Draft"` with empty `approved_by`. That is a governance decision only the user can make.

---

### Phase 5 — Documentation

**S35 · Implementation state** — Should
files `agents/IMPLEMENTATION.md`, `agents/TEMP/specs-template-update/coding-flow-state.md` · req — (process) · agent engineer/**sonnet** · pred S34
AC `IMPLEMENTATION.md` records the breaking data-model change, the two new modules, the purged-id registry, and the expected-red test state; the flow-state file's phase table marks phases 4 and 7 complete and its in-scope table lists 21 ids.
watch do not touch `docs/requirements/**` or `instructions/**` — the requirement amendments in specs §14 are a separate flow.

---

## 5. Dispatch table (compressed)

| # | Step | Files | Req ids | Agent / model | Pred | MoSCoW |
|---|---|---|---|---|---|---|
| 1 | constants | `shared/constants.ts` | 0007 | eng/sonnet | — | Must |
| 2 | error codes | `errors.ts` | 0001, 0009, 0023 | eng/sonnet | 1 | Must |
| 3 | core types + maps + `purged_ids` | `core.ts` | 0001, 0002, 0004 | eng/**opus** | 2 | Must |
| 4 | core validators | `core.ts` | 0001, 0004, 0007, 0009 | eng/**opus** | 3 | Must |
| 5 | 🆕 purged-id registry semantics | `core.ts` | 0002, 0005, 0009, 0016 | eng/**opus** | 4 | Must |
| 6 | result types | `output.ts` | 0050, 0002, 0024, 0023, **0025**, 0008 | eng/sonnet | 5 | Must |
| 7 | `SpecSkipped` semantics | `output.ts` | 0025 | eng/sonnet | 6 | Must |
| 8 | guidance data | **`field-guide.ts`** (new) | 0008 | eng/**opus** | 6 | Must |
| 9 | schema dict | `schemas.ts` | 0001, 0008, 0050, 0023, 0002, 0024 | eng/**opus** | 8 | Must |
| 10 | info rename | `info.ts` | 0002, 0024 | eng/sonnet | 6 | Must |
| 11 | ✅ P0 check + commit | — | all P0 | rev/**opus** | 10 | Must |
| 12 | add checks + reserved-area backfill | `add.ts` | 0001, **0004**, 0009, 0010 | eng/**opus** | 11 | Must |
| 13 | update checks + header comment | `update.ts` | 0009, 0013 | eng/**opus** | 11 | Must |
| 14 | 🆕 purge records registry | `purge.ts` | 0009, 0016 | eng/sonnet | 11 | Must |
| 15 | ✅ lane A check | — | 0001, 0004, 0009, 0010, 0013, 0016 | rev/sonnet | 14 | Must |
| 16 | rubric predicates | `rubric.ts` | 0006, 0021 | eng/**opus** | 11 | Must |
| 17 | validate findings | `validate.ts` | 0004, **0005**, 0006, 0021 | eng/**opus** | 16 | Must |
| 18 | filter keys | `query-filter.ts` | 0012 | eng/sonnet | 11 | Must |
| 19 | ✅ lane B check | — | 0004, 0005, 0006, 0012, 0021 | rev/**opus** | 18 | Must |
| 20 | grammar module | **`markup-grammar.ts`** (new) | 0023, 0025 | eng/**opus** | 11 | Must |
| 21 | render + xml | `render.ts` | 0002, 0023 | eng/**opus** | 20 | Must |
| 22 | parser rewrite | `req-parser.ts` | 0025 | eng/**opus** | 21 | Must |
| 23 | migrate | `migrate.ts` | 0002, **0004**, 0025 | eng/**opus** | 22 | Must |
| 24 | round-trip proof | grammar/render/parser | 0023, 0025 | eng/**opus** | 23 | Must |
| 25 | ✅ lane C check | — | 0002, 0004, 0023, 0025 | rev/**opus** | 24 | Must |
| 26 | ✅ P1 integration + commit | — | all P1 | rev/**opus** | 15,19,25 | Must |
| 27 | terms + concepts | `help-content.ts` | 0002, 0004, 0060 | eng/**opus** | 26 | Must |
| 28 | field_guide, limits, keys, **path form** | `help-content.ts` | 0007, 0008, 0012, 0023, **0071** | eng/sonnet | 27 | Must |
| 29 | notes + purge note | `help-content.ts` | 0061, **0016** | eng/sonnet | 28 | Must |
| 30 | ✅ P2 check + leakage + commit | — | 0004,0007,0008,0012,0016,0023,0060,0061,0071 | rev/**opus** | 29 | Must |
| 31 | tool def + CLI text | `index.ts`, `frontends/cli.ts` | 0002, 0023 | eng/sonnet | 30 | Must |
| 32 | ✅ P3 check | — | 0002, 0023 | rev/sonnet | 31 | Should |
| 33 | implementation validation | whole tree | all 21 | val/**opus** | 32 | Must |
| 34 | 🛑 HITL gate | — | all | orch → user | 33 | Must |
| 35 | docs | `agents/IMPLEMENTATION.md`, flow state | — | eng/sonnet | 34 | Should |

**Concurrency windows: `{12,13,14} ∥ {16,17,18} ∥ {20,21,22,23,24}` after step 11.** Everything else is serial. Lane filesets are disjoint — ten filenames, zero duplicates:
A `add.ts · update.ts · purge.ts` | B `rubric.ts · validate.ts · query-filter.ts` | C `markup-grammar.ts · render.ts · req-parser.ts · migrate.ts`.

---

## 6. Risks (ordered by likelihood of biting)

| # | Risk | Mitigation | Owner step |
|---|---|---|---|
| R1 | An engineer escalates the red `npm run test` as a blocker and stops | §1 states the boundary; every check step's AC names `typecheck`+`build` only | 11, 26, 33 |
| R2 | A new write check early-returns instead of aggregating | W3; all four new add-path checks live in `prepareItem`, which aggregates by construction | 12, 13, 15 |
| R3 | `invalid_nfr_area` gets implemented from stale context (it is in `discovery-notes.md` and the earlier design rounds) | W5; steps 11 and 33 both grep for it | 4, 11, 33 |
| R4 | A warning heuristic gets "improved" | W2; step 19's AC diffs the three bodies | 16, 19 |
| R5 | The old GWT model creeps back from the cached plugin skill | W4; `checkEars` and the `given/when/then` field names are **deleted**, so a revert is a compile error | 3, 16, 22 |
| R6 | Guidance text names a notation/format and the existing leakage regexes miss it | specs §11.3 AC6 deny-list; step 30 runs it | 8, 28, 30 |
| R7 | `validate` mutates the document via `ensureReservedAreas` | specs §5.1 forbids it on read paths; step 19 AC checks | 17, 19 |
| R8 | `EARS_CONDITION_WORD` declared in lane C, creating a B↔C dependency | declared in `core.ts` at step 3, only re-exported at step 20 | 3, 20 |
| R9 | xml attribute order re-derived from FR-SPECS-0023's loose phrasing | specs §6.1 marked DECIDED with the reason | 20, 25 |
| R10 | `SpecSkipped` gains a third field | step 7 fixes the comment; specs §4.6 states the two-field directive | 7, 23 |
| R11 | FR-SPECS-0071's path form silently dropped as "just a reword" | step 28 is its sole owner and its AC names the string | 28, 30 |
| R12 | **`ensureReservedAreas` wired only into `newDocument()`**, so an existing document never gets the nine codes and FR-SPECS-0004.AC7 silently fails | step 12's AC names the `add.ts:128` call site explicitly; step 15 verifies it; step 23 does the same for migrate | 12, 15, 23 |
| R13 | **purge records the id after removing the spec**, or a failed `referenced_by_others` batch still pollutes the registry | specs §5.3b fixes the order: record after the gate, before the filter; step 15 verifies | 14, 15 |
| R14 | Someone edits `write.ts` to add a registry check, duplicating step 5 | step 33's AC asserts an empty `write.ts` diff | 5, 33 |
| R15 | A legacy document without `purged_ids` throws on read | step 5's `loadSpecs` back-fill plus `?? []` at every read site | 5, 11 |

---

## 7. Requirement → step coverage (all 21)

0001→3,4,9,12 · 0002→3,5,6,9,10,21,23,27,31 · 0004→4,12,23,27 · **0005→5,17** · 0006→16,17 · 0007→1,4,28 · 0008→8,9,28 · 0009→2,4,5,12,13,14 · 0010→12 · 0012→18,28 · **0013→13** · **0016→5,14,29** · 0021→16,17 · 0022→33 (verified no-op) · 0023→2,6,9,20,21,28,31 · 0024→6,10 · 0025→7,20,22,23,24 · 0050→6,9 · 0060→27,28 · 0061→29 · 0071→28.

---

## 8. Open items carried into the HITL gate

- **🛑 specs §14 G5 — approval state.** 9 of the 21 in-scope units are `status="Draft"` with empty `approved_by`: FR-SPECS-0001, 0002, 0005, 0006, 0009, 0010, 0013, 0016, 0061 (`SPECS.md` lines 19, 111, 182, 208, 226, 320, 392, 459, 896). The amendment rounds cleared their approval and it was not restored. The content is decided; the record is not. **Raise this first at step 34** — implementing against `Draft` units contradicts the project's own spec-before-code posture, and re-approval is an authoring-flow action outside this plan.
- **specs §14 G1** — partial aggregation at `add.ts:129-132`, out of scope by decision.
- **specs §14 G4** — FR-SPECS-0002's `implementationNotes` cites two files that never referenced the renamed field.
- **specs §14 G6** — FR-SPECS-0016's `implementationNotes` cites `aggregate.ts` and `frontends/cli.ts`; neither changes for the registry.
- Plugin regeneration (`venv/bin/python scripts/pre_commit.py`) is still outstanding from the requirements flow and is not part of this plan.

**Closed since the last revision:** G2 (FR-SPECS-0006 vs 0004 on out-of-vocabulary areas — the units now agree) and G3 (`invalid_level` unbacked, add/update catalogs incomplete — both amended).

</CRITICAL>
