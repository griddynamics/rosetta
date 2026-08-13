# Discovery Notes — Specs Template Update (17 in-scope requirements)

Scope: `docs/requirements/rosettify/SPECS.md` in-scope ids FR-SPECS-0001, 0002, 0004, 0006, 0007,
0008, 0010, 0012, 0021, 0022, 0023, 0024, 0025, 0050, 0060, 0061, 0071 against
`src/rosettify/src/commands/specs/` + its dependencies in `shared/` and `registry/`.
Read-only discovery; no source/test/requirement files were modified.

Canon for the new template: `instructions/r3/core/skills/requirements-authoring/assets/ra-requirement-unit.md`
(EARS lives on criteria; `statement` is a governing rule, not an EARS sentence; `evidence`,
`subsystem`, `component` are unit fields). The cached plugin skill copy is stale and was not used.

---

## 1. Per-requirement → file change map

Each row: requirement id, files to change, exported symbols affected, what's wrong today (with
evidence). "No code change" rows are explicit per the checklist.

### FR-SPECS-0001 — Spec Unit Schema

Files: `core.ts`, `schemas.ts`, `add.ts`, `errors.ts`.

- `core.ts:58-62` — `AcceptanceCriterion { given; when; then }`. Must become
  `{ id, ears, when?, while?, where?, if?, system, shall }`. `core.ts:64-87` — `Spec` has no
  `subsystem`, `component`, or `evidence` fields. `core.ts:128-150` — `KNOWN_SPEC_FIELDS` must gain
  `subsystem`, `component`, `evidence`. `core.ts:67` — `level: string` with no validator (no
  `validateLevel`/enum check exists anywhere in `core.ts`).
- `schemas.ts:17-25` — `acceptanceCriterionSchema` still describes `given/when/then`.
  `schemas.ts:28-54` — `specSchema` has no `subsystem`/`component`/`evidence` properties.
- `add.ts:66-88` (`prepareItem`) builds the `Spec` object; needs new logic to: assign
  `<spec-id>.AC<n>` to a criterion that omits `id`, reject a criterion missing `system`/`shall`
  (`missing_required_field`), reject a duplicate criterion id within one unit
  (`duplicate_criterion_id`, new), reject an `ears` value outside the five patterns
  (`invalid_ears`, new). None of this exists today — `prepareItem` copies
  `stripped["acceptance"]` through unchanged (`add.ts:82`).
- `errors.ts` — add `ERR_DUPLICATE_CRITERION_ID = "duplicate_criterion_id"` and
  `ERR_INVALID_EARS = "invalid_ears"` plus their `TEMPLATES` entries (errors.ts:82-113 has neither).

### FR-SPECS-0002 — Specs Document Schema

Files: `core.ts`, `output.ts`, `info.ts`, `render.ts`, `schemas.ts`, `help-content.ts`, `index.ts`.

- **Correction to SPECS.md**: FR-SPECS-0002's own `implementation` tag reads `Implemented` (not
  `ToBeModified`) with `implementationNotes` = `core.ts, write.ts, shared/doc-io.ts`
  (`docs/requirements/rosettify/SPECS.md:118-119`). This is stale: the requirement's own statement
  now reads `system: str # required, non-empty` (`SPECS.md:92`), but the code still uses
  `component`: `core.ts:95` (`SpecsDocument.component`), `core.ts:373` (`newDocument`), and every
  reader/writer of it — `output.ts:16,56`, `output.ts:204` (`SpecInfoResult.component`),
  `info.ts:67`, `render.ts:60,82`. `write.ts` and `shared/doc-io.ts` are generic over `Doc` and do
  **not** reference `.component` anywhere (verified — no match), so those two files in the cited
  `implementationNotes` are wrong; `schemas.ts:84,270`, `help-content.ts:44,49`, and
  `index.ts:214-215` are missing from the note entirely. Recommend re-flagging FR-SPECS-0002 as
  `ToBeModified` with a corrected file list.
- `core.ts:94-102` (`SpecsDocument.component` → `system`), `core.ts:370-381` (`newDocument`
  parameter/field rename), plus seeding the nine reserved NFR area codes into `areas` (shared work
  with FR-SPECS-0004, see below — `newDocument()` is the natural seeding point since it is the only
  place a fresh document is created).
- `output.ts:16` (`SpecDocumentSummary.component`→`system`), `output.ts:56` (`buildSpecWriteResult`
  body), `output.ts:204` (`SpecInfoResult.component`→`system`).
- `info.ts:67` (`doc.component`→`doc.system`).
- `render.ts:60,82` (`doc.component`→`doc.system` in `renderMarkdown`/`renderText` headers).
- `schemas.ts:84` (`specDocumentSummarySchema.component`), `schemas.ts:270`
  (`specInfoResultSchema.component`).
- `help-content.ts:44,49-50` — "manages a component's requirements", "one JSON document per
  component" (`specs_file.convention`).
- `index.ts:214-215` — `specsToolDef.description`: "Manages a component's requirements as spec
  units stored in one JSON document per component."

### FR-SPECS-0004 — Identifier Format and Area Registration

Files: `core.ts`, `add.ts`, `update.ts`, `errors.ts`, `info.ts` (none), `migrate.ts`.

- **Correction to SPECS.md's own implementationNotes** (`SPECS.md:166`): lists
  `core.ts, info.ts, add.ts, migrate.ts` as stale. `info.ts` is not actually implicated by this
  requirement's content (it only reports counts/next-ids, not area vocabulary) — the note should
  drop `info.ts`. Conversely the note is missing `update.ts`: AC8
  (`SPECS.md:163` — "an update would set type to NFR on a spec whose id begins FR ... reject with
  `id_type_mismatch`") is an update-time check, and `update.ts` currently validates only
  `source`/`priority`/`verification` on the merged spec (`update.ts:107-121`), never `type` and
  never the id-vs-type consistency AC8 requires. The note is also missing `errors.ts` (two new
  codes needed).
- `core.ts` — new function (name TBD, see Open Questions) enforcing: for `type === "NFR"`, `area`
  must be one of `PERF, SEC, REL, USE, MAIN, PORT, COMP, FUNC, SAFE` (`invalid_nfr_area`, new); a
  constant list of the nine codes + their quality-characteristic names, used both by this validator
  and by `newDocument()`'s pre-registration (FR-SPECS-0002) and by help content (FR-SPECS-0060).
  `core.ts:196-201` (`validateAreaRegistration`) currently checks registration only, not vocabulary.
- `add.ts` — call the new NFR-area validator (currently absent; `add.ts:49-64` runs
  type/source/priority/verification/id-format checks but no area-vocabulary check).
- `update.ts` — new `id_type_mismatch` check: when a patch changes `type` (or leaves the merged
  spec with a `type` inconsistent with `parseId(existing.id).prefix`), reject with
  `id_type_mismatch`. Today `update.ts` has no `validateType` call at all (`update.ts:104-121` only
  checks source/priority/verification) — a patch setting `type` to any value, valid or invalid, is
  currently unchecked. `migrate.ts` — call `autoRegisterAreas` still fires
  (`migrate.ts:116`, unchanged), but newly-imported NFR ids should also pass the vocabulary check;
  current code has no such call.
- `errors.ts` — add `ERR_INVALID_NFR_AREA = "invalid_nfr_area"` and
  `ERR_ID_TYPE_MISMATCH = "id_type_mismatch"` + `TEMPLATES` entries.

### FR-SPECS-0006 — Statement and Acceptance Content Rules

Files: `rubric.ts`, `validate.ts`.

- `rubric.ts:14-29` (`checkEars`) tests the **statement** against EARS regexes — this rule is
  superseded; EARS moves to criteria (D5 in the flow-state). This function must be removed (or
  repurposed to check a criterion's condition word against its declared `ears`, which is a
  different check with different inputs).
- `rubric.ts:92-98` (`checkAcceptanceComplete`) checks `c.given/c.when/c.then` all non-empty — must
  become: every criterion carries a non-empty `system` and `shall`.
- `rubric.ts` — new functions needed: criterion EARS conformance (condition word matches declared
  `ears`, at most one condition word present — currently nothing checks this at all); location
  completeness (a unit at `level=Subsystem` needs `subsystem` non-empty at error severity, `level=
  Component` needs both at error severity, `level=System` with neither named is a warning per
  `SPECS.md:218-220`, AC10-12) — no such function exists in `rubric.ts` or `core.ts` today.
- `validate.ts:139-141` — the block `if (spec.type === "FR" && !checkEars(spec.statement...))`
  must be deleted (statement is no longer EARS-checked). `validate.ts:130-132` calls
  `checkAcceptanceComplete` — behavior changes once that function's contract changes (see above).
  `validate.ts` needs new per-criterion error findings (condition-word mismatch, more-than-one
  condition word) and the location-completeness findings, none of which exist today.

### FR-SPECS-0007 — Size Limits and Constants

Files: `shared/constants.ts`, `core.ts`, `validate.ts`, `help-content.ts`.

- `shared/constants.ts:20` — `SPECS_MAX_SPECS = 1000` must become `10000` (FR-SPECS-0007 statement
  + D13). `shared/constants.ts` has no `SPECS_MAX_EVIDENCE_PER_SPEC` constant — must be added
  (max 50, same as dependencies/acceptance).
- `core.ts:308-329` (`checkStringLimits`) — `isNameLike` list is
  `["id","title","name","code"]` (`core.ts:311`); FR-SPECS-0007's statement explicitly requires a
  criterion's `system` field to fall under the **name** cap ("`id` and `system` under the name
  cap") — `"system"` is missing from `isNameLike`, so today a 257-character criterion `system`
  value would incorrectly pass (it falls through to the 20000-char string cap instead of the
  256-char name cap). This is a real, evidence-backed gap, not a hypothetical.
  `core.ts:338-346` (`validateSizeLimits`) has no per-spec `evidence.length` check.
- `validate.ts:53-66` (`sizeLimitIssue`) — same gap: no evidence-length check.
- `help-content.ts:332-339` (`limits`) — no `max_evidence_per_spec` key.

### FR-SPECS-0008 — Field Authoring Guidance (new, `NotStarted`)

Files: `output.ts`, `help-content.ts`, `schemas.ts`.

- `output.ts` — new named type `SpecFieldGuide = { field, type, required, default, guidance }`.
  Nothing like it exists (verified — no `FieldGuide`/`field_guide` symbol anywhere in `output.ts`).
- `help-content.ts` — new `field_guide` top-level section (array of `SpecFieldGuide`, one entry per
  spec-unit field and per criterion field). `specsHelpContent` (`help-content.ts:40-367`) has no
  `field_guide` key today (confirmed against the full file).
- `schemas.ts` — every field description in `specSchema`/`acceptanceCriterionSchema` must carry the
  same guidance text as its `field_guide` entry (AC3). Today most fields have no `description` at
  all (`schemas.ts:34-53` — only `id`, `status`, `approved_by`, `changed`, `changed_by`,
  `depends_on`, `related`, `implementation` carry descriptions; `title`, `statement`, `rationale`,
  `level`, `source`, `priority`, `verification`, `acceptance` do not).

### FR-SPECS-0010 — add subcommand

No new file beyond what FR-SPECS-0004 and FR-SPECS-0001 already touch (`add.ts`). The
`implementationNotes` (`SPECS.md:299`, `add.ts, core.ts, write.ts, output.ts`) is otherwise
accurate for the unchanged parts of `add`'s own logic. One drift worth flagging: FR-SPECS-0010's
own error catalog (`SPECS.md:285`) already lists `invalid_nfr_area` as one of add's errors, but
`add.ts` cannot produce it today because the validator FR-SPECS-0004 requires doesn't exist yet —
this is not a *new* requirement on `add.ts` beyond wiring in FR-SPECS-0004's validator once it
exists.

### FR-SPECS-0012 — query subcommand

Files: `query-filter.ts`, `help-content.ts`. (`query.ts` needs no change — it is a thin wrapper
around `parseQuery`/`applyFilter` and does not enumerate filter keys itself.)

- `query-filter.ts:29-42` (`FILTER_KEYS`) is missing `level`, `subsystem`, `component`, `ears`,
  `evidence` (5 new keys required by `SPECS.md:333`). `query-filter.ts:245-272`
  (`matchFieldValue`) has no `case` for any of these five — `ears` needs to scan
  `spec.acceptance` for a criterion whose `ears` equals the value; `evidence` needs
  `present`/`absent` semantics against `spec.evidence.length`; `level`/`subsystem`/`component` are
  straightforward exact-match cases mirroring `type`/`status`.
- `help-content.ts:344` (`query_notation.keys`) lists only the 11 existing keys — needs the 5
  additions.

### FR-SPECS-0021 — validate subcommand

Files: `validate.ts`, `rubric.ts`.

- `validate.ts:75-160` (`runValidation`) is missing: criterion id format/uniqueness-within-unit
  checks (no code anywhere checks `<spec-id>.AC<n>` shape or per-unit duplicates — `duplicate_id`
  at `core.ts:268-277` only checks spec-level ids, not criterion ids); criterion EARS conformance
  as an error finding; location-completeness findings (error/warning per level, FR-SPECS-0006);
  evidence-provenance warning (`source==="Sources"` and `evidence` empty → warning, "missing
  evidence" per `SPECS.md:541`) — no such check exists; NFR area vocabulary as part of the
  `area_registration` finding (today `validateAreaRegistration` at `core.ts:196-201` is
  registration-only, matching the write-time gap under FR-SPECS-0004).
- `validate.ts:139-141` must lose the statement-EARS warning (superseded, see FR-SPECS-0006).
- `rubric.ts` supplies the pure matcher functions `runValidation` calls — same file list as
  FR-SPECS-0006 above (this is one coherent change, split across two requirement ids).

### FR-SPECS-0022 — graph subcommand

**No code change needed.** `graph.ts` operates purely over `depends_on`/`related` string arrays
(`graph.ts:26-38`, `buildGraph`) and the id string space; nothing in its statement, result shape
(`SPECS.md:565` — `SpecGraphResult`), or acceptance criteria touches `system`/`subsystem`/
`component`/`evidence`/criteria/EARS. Verified by reading `graph.ts` end to end — no reference to
any of the changed fields.

### FR-SPECS-0023 — render subcommand

Files: `render.ts`, `output.ts`, `schemas.ts`, `index.ts`, `frontends/cli.ts`, `help-content.ts`.

- `render.ts:106-109` (`renderSpecs`) only dispatches `markdown`/`text`; needs a third `xml` branch
  reproducing the canonical unit markup (attribute ordering, `subsystem`/`component` as attributes
  after `level` when non-empty, `depends_on`→`depends` attribute, `related` attribute, `changed` as
  a calendar date, self-closing criterion elements, `evidence` element omitted when empty).
  `render.ts:123-124` (`cmdRender`) format-guard `fmt !== "markdown" && fmt !== "text"` must admit
  `"xml"`. `render.ts:59-101` (`renderMarkdown`/`renderText`) display Given/When/Then
  (`render.ts:71,93`) and never show `level`/`subsystem`/`component`/`evidence` — statement
  requires "level with its subsystem and component ... evidence" and criterion order "pattern,
  condition, responder, outcome" (`SPECS.md:594,608`).
- `output.ts:126-129` (`SpecRenderResult.format: "markdown" | "text"`) needs `| "xml"`.
- `schemas.ts:411` (`renderInputSchema.format` enum `["markdown","text"]`) and the render result
  schema need the same addition.
- `index.ts:248-251` — `specsToolDef.inputSchema.format.description` reads "Render output format:
  markdown | text" — will misdescribe the capability once `xml` ships.
- `frontends/cli.ts:369` — the `--format <fmt>` flag description string is literally
  `"markdown (default) or text"` — same drift, caller-visible via `rosettify specs render --help`.
- `help-content.ts:286` (`render` subcommand's `args["--format"]` text) and the FR-SPECS-0061
  notes array (currently missing a "render also emits markup" note — see FR-SPECS-0061 below).

### FR-SPECS-0024 — info subcommand

**Correction to SPECS.md**: marked `Implemented`/unchanged in the flow-state outline, but its own
result-type line (`SPECS.md:618`) already reads `SpecInfoResult = { system, description, ... }` —
the code still returns `component` (`output.ts:204`, `info.ts:67`). This is the same drift as
FR-SPECS-0002, inherited rather than independently caused. File touches: `info.ts:67`,
`output.ts:204` — both already counted under FR-SPECS-0002's file list above; no additional files
beyond that rename are needed for FR-SPECS-0024 itself.

### FR-SPECS-0025 — migrate subcommand

Files: `migrate.ts`, `req-parser.ts`.

- `req-parser.ts` is built entirely around the **superseded element-based** shape: `KNOWN_TAGS`
  (`req-parser.ts:43-47`) treats `source`, `ticketId`, `priority`, `status`, `approved_by`,
  `changed`, `verification`, `depends`, `related`, `implementation`, `implementationNotes` as
  **child elements**, and `extractKnownTags` (`req-parser.ts:97-105`) parses them as such. The new
  canonical shape (per `ra-requirement-unit.md`) carries all of those as **attributes** on `<req>`,
  plus new attributes `subsystem`, `component`, and a new `<evidence>` element. `splitGwt`
  (`req-parser.ts:170-202`) and `extractAcceptance` (`req-parser.ts:272-300`) parse
  Given:/When:/Then: prose out of a `<criteria>` text body; the canonical shape instead has
  self-closing `<criteria id=... ears=... when|while|where|if=... system=... shall=.../>` elements
  with no prose to split. This is a full rewrite of the attribute/tag extraction and criterion
  parsing, not an incremental patch. `normalizeImplementation`'s legacy-bracket handling
  (`req-parser.ts:219-239`) is explicitly for the *old* shape and per FR-SPECS-0025's "canonical
  shape only, skip anything else" rule should no longer be reached (or should immediately count as
  a skip reason) — worth a design decision, see Open Questions.
- `migrate.ts:34-58` (`toFullSpec`) needs `subsystem`/`component`/`evidence` defaulting;
  `migrate.ts` overall depends on `req-parser.ts`'s new output shape.

### FR-SPECS-0050 — Named Result Types

Files: `output.ts`, `schemas.ts`.

No independent file touches beyond what FR-SPECS-0002 (rename) and FR-SPECS-0008
(`SpecFieldGuide`) already require in these same two files. This requirement is the
cross-cutting consistency rule ("no anonymous shape at any depth," "one shared write/lifecycle
result") — verified the existing types already satisfy it structurally (`output.ts:1-230`); the
only concrete deltas are the two named above.

### FR-SPECS-0060 — Specs Help Content

Files: `help-content.ts`, `schemas.ts` (field descriptions, shared with FR-SPECS-0008).

- `help-content.ts:54-84` (`concepts`) has no `terms` section defining `system`/`subsystem`/
  `component`/`area`/`level`/criterion-responder (AC7 requires one) — no `terms` key exists at all
  in `specsHelpContent` today. `concepts.spec_unit` (`help-content.ts:55-58`) still reads
  "acceptance (Given/When/Then criteria)" and lists no `subsystem`/`component`/`evidence` fields.
  No mention anywhere of the five criterion patterns + their condition words (AC3) or the nine
  quality-characteristic codes (AC4).
- `help-content.ts:40-367` overall: no `field_guide` key (FR-SPECS-0008, same finding as above).

### FR-SPECS-0061 — Specs Help Notes Content

Files: `help-content.ts`.

- `specsNotes` (`help-content.ts:25-38`) currently has 12 entries; FR-SPECS-0061's statement lists
  substantially more required topics (statement-is-not-one-trigger, criterion naming exactly one
  pattern/responder/outcome, criterion sub-id auto-assignment, evidence expectation, "render
  returns markup as well as markdown", the nine reserved NFR codes needing no registration) — none
  of the current 12 notes cover these. `help-content.test.ts:32-45` currently pins "exactly 12
  notes" against 12 named topics — that test's own expected count/topics will need to grow in
  lockstep (see §4 Test Blast Radius).

### FR-SPECS-0071 — Document Path and Read Resilience

**No code change needed.** Statement (`SPECS.md:928`) is entirely about path supply, parent-dir
creation, and the missing-file/backup retry mechanics — none of the changed fields (`system`,
`subsystem`, `component`, `evidence`, criteria) appear anywhere in its text, and `doc-io.ts`
(the shared implementation) is generic over `Doc` and never reads a document's field names.
Verified by reading `shared/doc-io.ts` end to end — confirmed for FR-SPECS-0002 above.

---

## 2. Inverse map — per file under `commands/specs/`, every requirement touching it

| File | Requirements | Change needed? |
|---|---|---|
| `add.ts` | FR-SPECS-0001 (criterion assembly/id-assignment/dup/ears checks), FR-SPECS-0004 (wire NFR-area validator) | Yes |
| `aggregate.ts` | — | No — generic string builder, no field references |
| `approve.ts` | FR-SPECS-0021 (benefits transitively via `runValidation`) | No file edit — behavior changes automatically once `validate.ts` changes |
| `core.ts` | FR-SPECS-0001, 0002, 0004, 0006 (level enum only), 0007 | Yes — foundation types/validators |
| `delete.ts` | — | No |
| `deprecate.ts` | — | No |
| `errors.ts` | FR-SPECS-0001 (`invalid_ears`, `duplicate_criterion_id`), FR-SPECS-0004 (`invalid_nfr_area`, `id_type_mismatch`) | Yes — new codes + templates |
| `get.ts` | — | No — returns `Spec` verbatim, gains fields automatically via `core.ts` |
| `graph.ts` | FR-SPECS-0022 (in scope) | No — see §1 |
| `help-content.ts` | FR-SPECS-0002, 0004 (terms), 0006, 0007 (limits), 0008, 0012 (query_notation), 0023 (format note), 0060, 0061 | Yes — largest single-file surface |
| `implemented.ts` | — | No |
| `index.ts` | FR-SPECS-0002 (description text), FR-SPECS-0023 (format schema description) | Yes — small text-only |
| `info.ts` | FR-SPECS-0002, 0024 | Yes — rename only |
| `migrate.ts` | FR-SPECS-0002 (doc creation), FR-SPECS-0025 | Yes |
| `output.ts` | FR-SPECS-0002, 0008, 0023, 0050 | Yes |
| `purge.ts` | — | No |
| `query-filter.ts` | FR-SPECS-0012 | Yes — 5 new filter keys |
| `query.ts` | FR-SPECS-0012 (inherits) | No — thin wrapper |
| `render.ts` | FR-SPECS-0002, 0023 | Yes |
| `reopen.ts` | — | No |
| `req-parser.ts` | FR-SPECS-0025 | Yes — full rewrite of tag/criterion parsing |
| `restore.ts` | — | No |
| `rubric.ts` | FR-SPECS-0006, 0021 | Yes |
| `schemas.ts` | FR-SPECS-0001, 0002, 0006 (level enum), 0008, 0023 (format enum), 0050 | Yes |
| `update.ts` | FR-SPECS-0004 (`id_type_mismatch`) | Yes |
| `validate.ts` | FR-SPECS-0004 (NFR area in findings), 0006, 0021 | Yes |
| `write.ts` | — | No — generic over `SpecsDocument`, no field references (verified) |

27 files total; 15 need changes, 12 need none. Every in-scope requirement id appears above with at
least one file, or is explicitly marked "no code change needed" (FR-SPECS-0022, FR-SPECS-0071) with
its reason.

---

## 3. Partitioning proposal

**Phase 0 — Foundation (serialize; one owner or tightly-coordinated pair, not independent
parallel agents):** `core.ts`, `errors.ts`, `output.ts`, `schemas.ts`, `shared/constants.ts`.

Reason this cannot be split into independent parallel lanes: every other file in the command
imports types from `core.ts` (`Spec`, `AcceptanceCriterion`, `SpecsDocument`) and/or `output.ts`
(`SpecRenderResult`, `SpecInfoResult`, the new `SpecFieldGuide`), and `schemas.ts` imports the enum
constants from `core.ts`. Two agents editing `core.ts` and `output.ts` concurrently would each be
guessing at the other's in-flight field names (e.g. whether `evidence` is `string[]` in `core.ts`
matches what `output.ts`/`schemas.ts` expect) — this is the one true shared-type lock in the
command. Land this phase completely (and get it type-checking) before anything else starts.

**Phase 1 — four independent lanes, each depends only on Phase 0's output, no file overlap between
lanes:**

- Lane A: `add.ts`, `update.ts` — FR-SPECS-0001 (criterion assembly), FR-SPECS-0004 (wiring).
- Lane B: `query-filter.ts`, `validate.ts`, `rubric.ts` — FR-SPECS-0006, 0012, 0021. (`query.ts`
  needs no edit but sits conceptually with this lane.)
- Lane C: `render.ts`, `migrate.ts`, `req-parser.ts` — FR-SPECS-0023, 0025.
- Lane D: `info.ts` — FR-SPECS-0002/0024 rename (small; could be folded into Phase 0 instead if a
  single owner prefers, since it is a one-line change per file).

Lanes A–C share no files with each other and can run as three concurrent subagents once Phase 0
has landed. Lane C has a soft (type-only) coupling to Phase 0's `output.ts` change (the `"xml"`
literal added to `SpecRenderResult.format`) — this must exist before Lane C starts, which Phase 0
already guarantees by construction.

**Phase 2 — serialize after Phase 1:** `help-content.ts`. Reason: FR-SPECS-0060/0061's content
describes the query keys (Lane B), the render format (Lane C), and the NFR terms/codes
(Phase 0/Lane A) accurately only once those land — writing it earlier risks describing a capability
that doesn't exist yet or missing one that does. `help-content.ts` also imports `specsSchemasDict`
from `schemas.ts` (Phase 0) directly.

**Phase 3 — anytime after Phase 2, low-risk, single small diff each:** `index.ts` (description
text, format schema description), `frontends/cli.ts` (`--format` flag description string). These
two files are outside `commands/specs/` proper (`index.ts` is inside it but is a thin
text-only touch; `frontends/cli.ts` is the external-coupling file below) and are pure caller-facing
text — no logic risk, but should land after Lane C so the text is accurate.

**No-change files** (do not assign to any agent): `aggregate.ts`, `approve.ts`, `delete.ts`,
`deprecate.ts`, `get.ts`, `graph.ts`, `implemented.ts`, `purge.ts`, `query.ts`, `reopen.ts`,
`restore.ts`, `write.ts`.

---

## 4. Test blast radius

Test root: `src/rosettify/tests/unit/specs/` (27 files, 450 `it()` cases) +
`tests/e2e/specs.e2e.test.ts` (25 cases) + `tests/e2e/mcp.e2e.test.ts` (2 specs-related cases) =
**~477 test cases in the direct blast radius**, though most will only need a **type-level** fix
(the shared fixture change below), not a logic rewrite.

**Root cause of the wide radius**: `tests/fixtures/specs.ts` (66 lines) is the single shared
fixture — `makeAcceptance()` (line 4-11) returns the old `{given, when, then}` shape,
`makeSpec()` (line 14-37) builds a `Spec` via that fixture and has no `subsystem`/`component`/
`evidence`, and `makeDoc()` (line 40-51) uses `component: "checkout"`. **22 of 27 unit test files**
import this fixture (`grep -rl "fixtures/specs" unit/specs/*.ts` → 22 hits) — once `Spec`,
`AcceptanceCriterion`, and `SpecsDocument` change shape in `core.ts`, every one of those 22 files
fails to **compile** (TypeScript, not just fails assertions) until the fixture is updated, even in
files whose own test logic never mentions `given`/`when`/`then`/`component` directly. This is a
single-file fix with document-wide leverage — update `tests/fixtures/specs.ts` first, then observe
which of the 22 files still fail on logic (not just types).

Files NOT depending on the fixture (5): `errors.test.ts` (2 cases, trivial — `describeError`
fallback only), `help-content.test.ts` (6 cases), `leakage.test.ts` (7 cases), `req-parser.test.ts`
(40 cases), `schemas.test.ts` (3 cases).

Per-file blast quantification (assertion counts are `it()` counts, from
`grep -c '\bit(' unit/specs/*.ts`):

| File | it() count | What breaks and why |
|---|---|---|
| `core.test.ts` | 72 | Biggest file. Uses `makeSpec`/`makeDoc` throughout (`component` field, 6 occurrences); `SPECS_MAX_SPECS` tests at lines 379-380,422 assert against the current `1000` cap — must be rewritten for `10000`; needs new `describe` blocks for `validateLevel`, NFR-area vocabulary, `id_type_mismatch`, `checkStringLimits`'s `system` name-cap fix, evidence size-limit. |
| `req-parser.test.ts` | 40 | Entirely about the superseded element/tag parsing and `splitGwt` — needs a near-total rewrite once `req-parser.ts` moves to attribute-based parsing. Does not use the shared fixture (self-contained `<req>` markup strings), so it fails on logic, not types. |
| `query-filter.test.ts` | 42 | Additive — needs new `describe` blocks for the 5 new filter keys; existing 42 cases for the 11 current keys should keep passing unchanged structurally (uses `makeSpec`, so needs the fixture update first to compile). |
| `add.test.ts` | 30 | Uses `makeAddItem`/`makeSpec` — compiles again once fixture updates; needs new cases for criterion id auto-assignment, `duplicate_criterion_id`, `invalid_ears`, `invalid_nfr_area`. |
| `graph.test.ts` | 28 | Uses fixture for compile only — FR-SPECS-0022 needs no logic change, so once the fixture compiles these should pass unchanged. |
| `update.test.ts` | 23 | Uses fixture; the `given`/`when` hit at line ~1 area is from a code comment reference, not literal criterion construction — needs new case for `id_type_mismatch`. |
| `rubric.test.ts` | 23 | Directly tests `checkEars` against **statements** (`rubric.test.ts:82` and 1 other `given` hit) — these tests test the function being removed/repurposed; needs a rewrite, not a patch. |
| `index.test.ts` | 24 | Uses fixture for compile; dispatch-level tests, low logic risk once types compile. |
| `write-aggregate.test.ts` | 14 | Uses fixture for compile only. |
| `validate.test.ts` | 18 | Directly asserts the old EARS-on-statement warning and given/when/then acceptance-completeness behavior (`validate.test.ts:156` uses a 1000-specs example string, coincidental, not the cap) — needs rewrite for the new criterion/location/evidence checks. |
| `render.test.ts` | 18 | Uses fixture; needs new cases for `format=xml`, criterion-order display, `invalid_format` still rejecting non-xml/markdown/text values. |
| `migrate.test.ts` | 15 | Uses fixture (1 `given` hit) and drives the old element-tag markup — needs rewrite in lockstep with `req-parser.ts`. |
| `implemented.test.ts` | 12 | Uses fixture for compile only — FR-SPECS-0015 untouched. |
| `approve.test.ts` | 11 | Uses fixture for compile only — behavior change is transitive via `validate.ts`; may need 1-2 new cases if approve should now also block on new error-severity findings (already automatic once `runValidation` changes). |
| `query.test.ts` | 10 | Uses fixture (1 `given` hit) for compile only. |
| `info.test.ts` | 9 | Uses fixture; needs `component`→`system` key rename in assertions. |
| `purge.test.ts` | 9 | Uses fixture for compile only. |
| `get.test.ts` | 8 | Uses fixture for compile only. |
| `delete.test.ts` | 8 | Uses fixture for compile only. |
| `output.test.ts` | 7 | Uses fixture; needs `component`→`system` assertions updated, plus new `SpecFieldGuide`-shape coverage if this file is where that lands. |
| `leakage.test.ts` | 7 | Self-contained scans of `specsHelpContent`/`specsSchemasDict`/`TEMPLATES` strings — needs no rewrite, but should be re-run once `field_guide`/`terms` sections exist to confirm they too stay leakage-clean. |
| `help-content.test.ts` | 6 | Pins "exactly 12 notes" (`help-content.test.ts:111-112`) and the top-level key list (missing `terms`, `field_guide`) — both assertions must grow. |
| `deprecate.test.ts` | 5 | Uses fixture for compile only. |
| `schemas.test.ts` | 3 | Pins the FR-SPECS-0050 required-type list (`schemas.test.ts:27-49`) — must gain `SpecFieldGuide`. |
| `restore.test.ts` | 3 | Uses fixture for compile only. |
| `reopen.test.ts` | 3 | Uses fixture for compile only. |
| `errors.test.ts` | 2 | Unaffected; could optionally gain cases for the 4 new error codes. |
| `tests/e2e/specs.e2e.test.ts` | 25 | Not yet read in detail beyond confirming it uses the fixture-independent literal `{given, when, then}` shape at least twice (via grep evidence in the file header search) — needs the same criterion-shape rewrite as the unit fixture. |
| `tests/e2e/mcp.e2e.test.ts` | 2 of ~N total (specs-specific) | Lines 682-696 and 708-712 build an `add` payload with `acceptance: [{given, when, then}]` (line 695) — must move to the new criterion shape or the round-trip test will send a payload the new `add.ts` rejects. |

Total unit-test compile exposure: **22/27 files** (≈410 of 450 `it()` cases) will not compile
until `tests/fixtures/specs.ts` is updated; of those, the files in the table above with an explicit
"needs rewrite" note (`core.test.ts`, `req-parser.test.ts`, `rubric.test.ts`, `validate.test.ts`,
`migrate.test.ts`, `render.test.ts`, `add.test.ts`, `query-filter.test.ts`, `update.test.ts`,
`info.test.ts`, `help-content.test.ts`, `schemas.test.ts`, `output.test.ts` — 13 files, ~296
`it()` cases) need actual logic changes beyond the fixture; the remaining 9 fixture-dependent
files (~114 cases: `graph`, `write-aggregate`, `index`, `implemented`, `approve`, `query`, `purge`,
`get`, `delete`, `deprecate`, `restore`, `reopen` — 12 files, recount below) should pass once they
compile, since their own subcommands are unaffected.

(Note on arithmetic: 22 fixture-dependent + 5 fixture-independent = 27; of the 22, 8 need logic
rewrites beyond the fixture per the table — `core`, `add`, `query-filter`, `update`, `validate`,
`render`, `migrate`, `info`, `output` — that is 9, plus the 5 fixture-independent files
`help-content`, `schemas` need rewrites too (2 more) and `req-parser`, `rubric` (2 more) — 4 of the
5 fixture-independent files need rewrites, only `errors.test.ts` and `leakage.test.ts` are
low/no-risk. Treat the exact per-file bucket counts above as the source of truth; this paragraph is
a sanity cross-check, not a new number.)

---

## 5. External coupling — load-bearing contracts outside `commands/specs/`

**Tool registry** (`src/rosettify/src/registry/types.ts`, `registry/index.ts`) — `ToolDef` requires
`inputSchema`/`outputSchema` (JSON Schema objects) and an optional `helpContent`
(`registry/types.ts:89-103`). `specsToolDef` (`commands/specs/index.ts:211-294`) satisfies this
generically; none of the 17 requirements change the `ToolDef` shape itself, only the *content* of
`inputSchema.properties.format` (line 248-251, needs "xml" added to its description) and
`description` (lines 214-215, "component"→"system"). No change needed in `registry/*.ts` — the
contract is generic and unaffected.

**Shared help system, FR-HELP-0002** (`src/rosettify/src/commands/help/index.ts`,
`registry/types.ts:123-135` `HelpCommandDetail`) — `runHelp` (`help/index.ts:18-71`) spreads
`tool.helpContent` verbatim into the response and overlays `name`/`brief`/`description` from the
`ToolDef`. `HelpCommandDetail`'s only hard contract is `{name, brief, description, schemas?,
subcommands?, notes?}` plus an index signature for extensions (`registry/types.ts:127-134`) — the
new `field_guide` and `terms` sections (FR-SPECS-0008/0060) pass through this index signature with
**no change needed to `help/index.ts` or `registry/types.ts`**. The coupling is one-directional and
safe: `specsHelpContent`'s shape is free to grow: `help/index.ts` never enumerates its keys.

**Shared doc-io / atomic write** (`src/rosettify/src/shared/doc-io.ts`) — `readDocWithRetry<Doc>`
and `atomicWriteWithBackup<Doc, T>` (`doc-io.ts:104,156`) are generic over `Doc extends {
previous_version?; updated_at }` — verified no reference to `.component`, `.system`, or any
specs-specific field anywhere in the file. Shared with the `plan` command (file header,
`doc-io.ts:1-4`, states this explicitly). **No change needed** — the specs schema can rename/add
fields freely without touching this file, confirmed by direct reading, not inference.

**Output envelope** (`src/rosettify/src/shared/envelope.ts`, `registry/types.ts:1-15`
`RunEnvelope`/`EnrichedEnvelope`) — `{ok, result, error, include_help}` is generic over `result: T`;
none of the 17 requirements touch the envelope shape itself, only what `T` resolves to per
subcommand (`SpecRenderResult` gaining `"xml"`, `SpecInfoResult` renaming a key, etc.), which the
envelope doesn't inspect. **No change needed.**

**CLI frontend** (`src/rosettify/src/frontends/cli.ts`) — the specs subcommand table
(`cli.ts:281-386`, `SPECS_SUB_ROWS`) passes `format`/`query`/`ids`/`data` straight through to
`SpecInput` with no per-value validation or transformation (confirmed generic — `buildInput`
closures just assign fields). The **one** literal coupling point is the hardcoded flag description
string at `cli.ts:369`: `flags: [{ flag: "--format <fmt>", desc: "markdown (default) or text" }]`
— this will under-describe the command once `xml` ships (FR-SPECS-0023) and should be updated in
Phase 3 above. No other CLI-frontend change needed — the `query` positional for `query`/`validate`/
`render` rows is a raw string, so new filter keys (FR-SPECS-0012) need zero frontend change.

**MCP frontend** (`src/rosettify/src/frontends/mcp.ts`) — 65 lines, generic over
`getMcpTools()`/`getToolDef()` (confirmed via grep — zero `specs`-specific string in the file).
**No change needed.**

---

## 6. Anomalies, inconsistencies, and corrections to SPECS.md's own notes

1. **FR-SPECS-0002 and FR-SPECS-0024 are marked `Implemented`/left in the flow-state's "Unchanged"
   bucket, but their own statement text already uses `system` where the code uses `component`.**
   This is the single highest-value correction in this discovery: both units need to move from
   "no code change" to "needs the rename" in any implementation plan, even though neither carries
   `implementation="ToBeModified"` in `SPECS.md` today. Evidence: `SPECS.md:92` (`system: str`),
   `SPECS.md:618` (`SpecInfoResult = { system, ... }`) vs. `core.ts:95`, `output.ts:16,204`,
   `info.ts:67`, `render.ts:60,82` all reading `.component`.
2. **FR-SPECS-0004's `implementationNotes` (`SPECS.md:166`) lists `info.ts` but not `update.ts` or
   `errors.ts`.** `info.ts` is not implicated by this requirement (it never validates area
   vocabulary or id/type consistency); `update.ts` is implicated by AC8 (`id_type_mismatch`) but
   omitted; `errors.ts` needs the two new error codes and is omitted. Recommend correcting the note
   to `core.ts, add.ts, update.ts, errors.ts, migrate.ts` (dropping `info.ts`).
3. **`docs/requirements/rosettify/SPECS.md`'s "unchanged" bucket in
   `agents/TEMP/specs-template-update/requirements-authoring-flow-state.md:73`
   (`0002, 0010, 0022, 0024, ... 0071`) does not match the `changed="2026-08-10"` timestamp these
   same units carry** — every one of them was re-saved on the same date as the units the flow-state
   calls "Modified" (`0001, 0004, 0006, ...` also all carry `changed="2026-08-10"`). The
   `changed` timestamp is therefore not a reliable signal of which units' *text* actually differs
   from before this flow; only a direct content diff (which this discovery performed for the
   field-rename cases above) is reliable. Flagged as an open question below rather than resolved,
   since I cannot see the pre-flow version of `SPECS.md` to confirm which of these were touched
   only cosmetically (e.g., re-approval) versus textually.
4. **`core.ts`'s `checkStringLimits` `isNameLike` list omits `"system"`**, so a criterion's
   `system` field is currently checked against the 20000-char string cap instead of the 256-char
   name cap FR-SPECS-0007 requires — a latent under-enforcement bug that predates this template
   change but becomes directly relevant once the `system` field exists on criteria and FR-SPECS-0007
   is implemented. Not something to silently "fix" outside the requirement's scope — flagged here so
   the implementer treats it as an explicit AC3 requirement, not a bonus fix.
5. **`update.ts` has no `validateType` call at all** (only source/priority/verification are checked
   on the merged spec) — a pre-existing gap (a patch could set `type` to a nonsense string today
   with no rejection) that FR-SPECS-0004's AC8 (`id_type_mismatch`) will necessarily touch when
   implemented, since detecting a type/id mismatch requires knowing the merged type is valid in the
   first place.

---

## 7. Open questions (could not be determined from the code or requirements text alone)

- **Q1** — Where should new criterion-level validators (id auto-assignment, duplicate-id check,
  `system`/`shall` presence, `invalid_ears`) live: `core.ts` (matching the existing pattern where
  all validators live there) or `add.ts` (where the only current caller is)? The existing code
  puts reusable validators in `core.ts` and item-assembly in `add.ts`/`update.ts`, so `core.ts` is
  the more consistent choice, but this is a design decision, not an observed fact.
- **Q2** — Should the nine reserved NFR area codes be retrofitted onto a pre-existing document the
  first time it is next written (i.e., injected during `readDocWithRetry`/`loadSpecs`), or only
  seeded by `newDocument()` for brand-new documents? FR-SPECS-0004's statement ("those nine codes
  SHALL be present in every document's area registry ... without the caller registering them")
  reads as applying to *every* document, not just new ones, but no code path currently touches an
  existing document's `areas` array except `autoRegisterAreas` (which only adds areas it
  encounters in ids being written, not proactively). This needs a decision before implementation.
- **Q3** — For `req-parser.ts`'s legacy bracket-form `implementation` handling
  (`normalizeImplementation`, `req-parser.ts:219-239`): once migrate reads the canonical
  attribute-based shape only, should encountering the legacy bracket form inside an
  otherwise-canonical `<req>` count as "not canonical" (skip with reason) or should
  `normalizeImplementation`'s tolerance be kept as a defensive fallback? FR-SPECS-0025's statement
  says "read the canonical unit shape only ... a unit that is not in the canonical shape ... SHALL
  be skipped," which suggests removing the legacy-tolerance code entirely, but this is not
  explicitly stated for the `implementation` attribute specifically.
- **Q4** — Exact function name/location split for the new `rubric.ts` checks (criterion EARS
  conformance, location completeness) — no requirement text names a function, only the check's
  behavior. Recommend mirroring the existing naming convention (`checkEars` repurposed or
  `checkCriterionEars`, `checkLocationCompleteness`) but this is a naming choice for whoever
  implements it, not a fact I can verify.
- **Q5** — Per anomaly #3 above: which of FR-SPECS-0002/0010/0022/0024/0071's *text* actually
  changed in this session versus being re-saved with a fresh `changed` timestamp for unrelated
  reasons (e.g., a batch save by tooling)? I could not access a pre-change diff of `SPECS.md` to
  confirm. My file-level recommendations above are based purely on comparing today's text to
  today's code, which is sufficient to know what code must change, but not sufficient to know
  whether the requirement's *drafting* changed in this pass or was already like this before.
- **Q6 — resolved during discovery**: a full-file grep of `tests/e2e/specs.e2e.test.ts` for
  `component`/`given:`/`acceptance:` found only the two criterion-shape occurrences already listed
  in §4 (lines 70 and 235), and zero `component` references. So the e2e file's blast radius is
  confined to those two `acceptance` payload literals needing the new criterion shape — the
  remaining ~23 cases are not shape-dependent. No open question remains here.
