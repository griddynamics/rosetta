# Architecture Notes — `specs` command

Design-only. Basis for a HITL design-approval gate + the subsequent tech plan. Grounded in the real code cited by `discovery-notes.md`. Mirrors the `plan` command; resolves the real forks.

Scope: 33 Approved FR-SPECS (0001–0025 minus 0026, 0030, 0040–0043, 0050, 0060–0061, 0070–0071). **FR-SPECS-0026 (semantic search) is Draft → OUT OF SCOPE.**

---

## A) Affected / related code map

**Touched (existing):**
- `src/rosettify/src/registry/index.ts` — add `specsToolDef` import + 3rd map entry (only registry change; `getCliTools`/`getMcpTools` filter automatically).
- `src/rosettify/src/registry/types.ts` — extend the shared `CommandInput` interface additively (same pattern plan used): `specs_file`, `ids?: string[]`, `query?`, `force?: boolean`, `format?`, `additional_paths?: string[]`, `implementation?`, `implementation_notes?`, `actor?`, `sources?: string[]`, `include_removed?`. Reuse existing `data` for JSON batch payloads.
- `src/rosettify/src/frontends/cli.ts` — new `specsCmd` block + 16 subcommand registrations (the only real per-subcommand wiring burden); introduces the first `--force` in the codebase. ~triples file size unless data-driven (Decision 2).
- `src/rosettify/src/frontends/mcp.ts` — **no change** (fully generic dispatch; one `specs` tool).
- `src/rosettify/src/shared/plan-io.ts` → rename to `shared/doc-io.ts`, parameterize doc-type error codes (Decision 1); update plan's 5 import sites (mechanical).
- `src/rosettify/src/shared/constants.ts` — add 6 `SPECS_MAX_*` constants; reuse `PLAN_BACKUP_*`/`PLAN_READ_*` verbatim (identical values per FR-SPECS-0070/0071).
- `src/rosettify/src/commands/plan/errors.ts` — move `ERR_BACKUP_CREATE_FAILED` (+ the corrupted concept) out to shared so the shared→command backwards import is removed.
- `src/rosettify/package.json` — version bump (below). No new runtime dependency (Decision 4).

**New (shared):**
- `shared/errors.ts` — generic `ERR_BACKUP_CREATE_FAILED`.
- `shared/actor.ts` — actor-identity resolver (FR-SPECS-0041); first subprocess spawn in the codebase.
- `shared/time.ts` — `nowUtcZ()` + `formatLocal(iso)` (FR-SPECS-0042).

**New (command):** `src/rosettify/src/commands/specs/**` (tree in §C).

**Untouched / reused as-is:** `shared/dispatch.ts`, `shared/envelope.ts`, `shared/logger.ts`, `shared/version.ts`, `commands/help/**` (adding a registry entry with `helpContent` auto-wires `help specs`), `shared/concurrency.ts` (dead from callers — do not build on it).

---

## B) Three candidate architectures

**B1 — mirror-plan-verbatim.** Copy plan 1:1; duplicate `plan-io.ts`→`specs-io.ts`; hand-write all 16 CLI blocks; no shared generalization.
- Pro: zero behavioral blast radius on plan; one familiar pattern; nothing to retrofit.
- Con: duplicates the MPP-test-verified lock/rename concurrency mechanism → drift risk on a subtle file; ~350 LOC of CLI boilerplate; contradicts FR-SPECS-0070's explicit "via the shared file-I/O module" framing.

**B2 — mirror + generalize shared IO + data-driven CLI (RECOMMENDED).** Mirror plan's per-command module layout; generalize `plan-io.ts`→`doc-io.ts` (error codes parameterized, defaults preserve plan behavior); add `shared/actor.ts`/`time.ts`; data-driven specs-local CLI table; isolate each net-new mechanic (query grammar, rubric, graph, render, migrate parser) in its own small, unit-testable file.
- Pro: DRY; single hand-verified IO mechanism; matches FR-SPECS-0070/0041/0013; net-new risk quarantined into named modules; plan behavior unchanged (only mechanical import-path edits).
- Con: touches 5 plan import sites; one CLI indirection layer to learn.

**B3 — shared spec-core library.** Extract a generic document-CRUD/merge/validate engine; plan + specs become configs of it.
- Pro: maximal reuse.
- Con: forces a rewrite of the working plan command → high regression risk against the "must NOT regress plan" constraint; premature abstraction for two commands; over-engineered.

**Choice: B2.**

---

## C) Chosen solution

### File layout — `src/rosettify/src/commands/specs/`

Each entry: responsibility · FR-SPECS covered · approx LOC.

| File | Responsibility | Covers | ~LOC |
|---|---|---|---|
| `core.ts` | Types (`Spec`, `AcceptanceCriterion`, `SpecsDocument`, `AreaEntry`, `SpecInput`, status/type/impl enums + transition table); id-format regex `^(FR\|NFR\|INT\|DATA)-[A-Z0-9]+-\d{4}$`; validators (`validateUniqueIds`, `validateReferences`→`unknown_dependency`, `depends_on` cycle via reused `core.ts` `detectCycle` pattern, `validateSizeLimits`, `validateIdFormat`, `validateAreaRegistration`, `validateImmutableId`); `GUARDED_FIELDS`+`stripGuarded`; plain `loadSpecs`/`saveSpecs` | 0001,0002,0003,0004,0005,0007,0040 | 460 |
| `index.ts` | `runSpecs` dispatch: no-arg→help, `unknown_command`, central `data` parse, batch normalize (1 item ↔ array), `VALID_SUBCOMMANDS` (16), `switch` delegating to `cmd*`; exports `specsToolDef` | 0030, dispatch | 260 |
| `write.ts` | **Single shared write path** — `applyBatchWrite(file, mutator)` wrapping `atomicWriteWithBackup` (+ first-create bypass like upsert entire_plan); stamps `changed`/`changed_by` on affected specs once; runs FR-SPECS-0005/0007 over post-batch state before write | 0030,0040,0070 | 90 |
| `errors.ts` | Error-code catalog (string consts + message *templates* that never interpolate internal ids) | 0043 support | 60 |
| `output.ts` | Shared builders `buildSpecWriteResult` (add/update), `buildSpecLifecycleResult` (approve/deprecate/restore/reopen) | 0050 | 60 |
| `schemas.ts` | Per-subcommand `{input,output}` + flat named-type dict (`$ref` by type name, every nested/array-items shape named) | 0050,0060 | 300 |
| `help-content.ts` | `specsNotes[]` + `specsHelpContent` (specs_file, concepts, subcommands×16 with tip+real examples, schemas, limits, `query_notation`, notes, next_steps_for_ai) — leakage-clean by construction | 0060,0061,0043 | 320 |
| `aggregate.ts` | Build the single human-readable error string from a collected `{ref,reason}[]` (Decision 6) | 0030,0017,0016 | 40 |
| `query-filter.ts` | `key:value` grammar `parseQuery→Filter\|{error}` + `applyFilter`; shared by query/validate/render | 0012 | 130 |
| `rubric.ts` | Pure phrasing matchers: EARS patterns, measurable-NFR heuristic, modal-verb (shall/should/may), duplicate-statement; reused by validate + approve | 0006,0021 | 150 |
| `add.ts` | Batch append; `stripGuarded`; defaults Draft/NotStarted, `approved_by=""` | 0010 | 90 |
| `get.ts` | By-id batch read, `{found,missing}`, returns Removed | 0011 | 50 |
| `query.ts` | Filtered read via `query-filter`; excludes Removed by default | 0012 | 60 |
| `update.ts` | RFC-7396 merge-patch batch; `stripGuarded`; auto Approved→Modified + clear `approved_by` on statement/acceptance edit; Implemented→ToBeModified | 0013,0040 | 140 |
| `delete.ts` | Soft-delete→Removed, idempotent, `{removed,missing}` | 0014 | 60 |
| `purge.ts` | Hard-remove; requires `--force`→`force_required`; dangling-ref guard→`referenced_by_others`; `{purged,missing}` | 0016 (+FR-ARCH-0015) | 90 |
| `implemented.ts` | Batch impl-enum setter (+`implementation_notes`); never touches `status` | 0015 | 70 |
| `approve.ts` | Runs `validate` logic on targets; refuses batch on any error finding→aggregated `validation_failed`; Draft/Modified→Approved | 0017 | 90 |
| `deprecate.ts` / `restore.ts` / `reopen.ts` | Guarded status transitions, batched, idempotent, transition-table gated | 0018 / 0019 / 0020 | 55 each |
| `validate.ts` | Rubric engine orchestration: structural (core.ts) + phrasing (rubric.ts); `SpecFinding[]` + counts; optional filter scope | 0021 | 150 |
| `graph.ts` | Transitive `depends_on` closure + reverse closure (impact) + direct `related`; whole-doc edge list + **cycle enumeration**; opt-in cross-document resolution + `unresolved` | 0022 | 170 |
| `render.ts` | JSON→markdown/text, group by area, local-time via `shared/time`; string only, no file write | 0023 | 140 |
| `info.ts` | Orientation summary; totals by type/status/impl; `next_ids` (max NNNN per prefix+area +1); local-time | 0024,0004 | 120 |
| `migrate.ts` | Orchestrate `<req>` import → map to schema → `applyBatchWrite`; report (never drop) issues | 0025 | 120 |
| `req-parser.ts` | Tolerant `<req>` tag scanner + attr extractor; dual `implementation` normalization; Given/When/Then splitter (Decision 4) | 0025 | 160 |

No `templates/` subtree, no `list-templates` (no FR-SPECS analog).

### Shared-module changes
- `plan-io.ts`→`doc-io.ts`: signature gains `errors?: {corrupted?: string; notFound?: string}` on `atomicWriteWithBackup`, defaulting to plan's `"plan_file_corrupted"`/`"plan_not_found"`; `readPlanWithRetry`→`readDocWithRetry` (identical body). Corrupted mapping (L203) and not-found (L206) read from the param. Behavior for plan unchanged.
- `shared/errors.ts` (new): generic `ERR_BACKUP_CREATE_FAILED`; removes the shared→`commands/plan/errors.js` backwards import.
- `shared/actor.ts`, `shared/time.ts` (new, see Decision 3).

### Constants to add (`shared/constants.ts`)
`SPECS_MAX_SPECS = 1000`, `SPECS_MAX_DEPENDENCIES_PER_SPEC = 50`, `SPECS_MAX_ACCEPTANCE_PER_SPEC = 50`, `SPECS_MAX_STRING_LENGTH = 20_000`, `SPECS_MAX_NAME_LENGTH = 256`, `SPECS_MAX_BATCH_SIZE = 500`. Reuse `PLAN_BACKUP_RETENTION`/`PLAN_BACKUP_MAX_RETRIES`/`PLAN_READ_RETRY_DELAY_MS`/`PLAN_READ_MAX_RETRIES` as-is (values identical; optional cosmetic rename to `BACKUP_*`/`READ_*` deferred to avoid plan churn).

### Version bump
`3.0.0` → **`3.1.0-b01`** (new feature = minor; `b01` pre-release suffix per user). Bump `package.json`; `VERSION` flows through automatically.

### The 7 decisions

1. **Shared atomic-IO → generalize (B2).** Rename `plan-io.ts`→`doc-io.ts`; parameterize `corrupted`/`notFound` codes (defaults = plan strings → no plan regression); move `ERR_BACKUP_CREATE_FAILED` to `shared/errors.ts`. Specs passes `{corrupted:"specs_file_corrupted", notFound:"specs_not_found"}`. *Pro:* DRY, one hand-verified concurrency mechanism, matches FR-SPECS-0070 wording. *Con:* 5 mechanical plan import edits (zero-risk fallback: leave a `plan-io.ts` re-export shim). Rejected: duplicate `specs-io.ts` (drift risk on subtle lock/rename code).

2. **CLI wiring → small data-driven helper, specs-local.** A `registerSpecsSub(parent, {name, positionals, flags, buildInput})` loop over a 16-row table; the 4-step action (build→dispatch→writeResult→exit) is 100% uniform. Irregular bits (purge `--force`, graph `--additional-paths`, query optional string, render `--format`) expressed as flag declarations. *Pro:* ~120 LOC vs ~350, less copy-paste error surface. *Con:* one indirection vs plan's verbatim style — accepted because it is **specs-local (plan untouched, no retrofit, no regression)**.

3. **Net-new module boundaries.**
   - Query grammar → `commands/specs/query-filter.ts` (specs-specific; shared by query/validate/render — 3 call sites, so its own file not inline).
   - Validate rubric → orchestration in `validate.ts`; pure phrasing matchers in `rubric.ts` (so `approve` reuses them without importing the subcommand); structural checks stay in `core.ts`.
   - Graph walker → `commands/specs/graph.ts` (own closures/cycle-enumeration; reuses `core.ts` `detectCycle` only for the single-doc write guard).
   - Renderer → `commands/specs/render.ts`.
   - `<req>` migrate parser → subcommand in `migrate.ts`, tag scanner split into `req-parser.ts` (separately unit-testable).
   - Actor resolver → **`shared/actor.ts`** (cross-cutting per FR-ARCH-0013, not specs-only; first subprocess spawn).
   - Time helper → **`shared/time.ts`** (used by render + info + write-path stamping).

4. **`<req>` XML parsing → hand-written tolerant scanner, NO dependency.** The real `<req>` bodies are *not* well-formed XML — statements embed ```code fences```, literal `<PREFIX>-<AREA>` angle brackets, and unescaped `&` (see FR-SPECS-0001's own statement). A strict XML parser (e.g. fast-xml-parser) would choke or need pre-sanitization. A tolerant scanner that extracts known top-level `<tag>…</tag>` regions + `<req …>` attributes and treats tag bodies as opaque text is both **more correct** for this semi-structured format and preserves deps-minimalism (commander/mcp-sdk/pino only). *Con:* hand-rolled edge cases — mitigated by opaque-body handling, heavy unit tests, and migrate's report-don't-drop contract.

5. **Guarded fields + lifecycle routing.** One shared write path (`write.ts`), N mutators.
   - `core.ts`: `GUARDED_FIELDS = {status, approved_by, implementation, changed_by}` + `stripGuarded(item)` (flat — specs array has no nested phases/steps).
   - `add`/`update`: call `stripGuarded` on each caller item *before* merge/validate; command sets defaults itself (`status=Draft`, `implementation=NotStarted`, `approved_by=""`). Caller can never set a guarded value — it is dropped, not honored.
   - Lifecycle ops (`approve`/`deprecate`/`restore`/`reopen`/`delete`/`implemented`) build their mutator that sets the specific field(s) with *internal, hardcoded* values (approve→`Approved`+resolved actor; delete→`Removed`; implemented→validated enum value + optional notes). They never pass through the stripped caller-payload path, so there is nothing to bypass.
   - `write.ts` stamps `changed`/`changed_by` (via `shared/actor`+`shared/time`) once for every affected spec — no lifecycle op re-implements timestamp/actor/IO logic.
   - Result: guarded fields are settable *only* by internal mutator code; write logic exists once.

6. **Error aggregation encoding.** Collect `{ref,reason}[]` internally (ref = spec id, or `index N` when no id). At the boundary, `aggregate.ts` emits one string into the envelope's `error: string` (no schema change): `"<code>: <n> item(s) rejected | [<ref>] <reason>; [<ref>] <reason>; …"`. Stable machine prefix (`validation_failed`, `size_limit_exceeded`, …) + human-readable `; `-joined enumeration. Same builder for batch all-or-nothing (0030), approve validation gate (0017), and multi-field failures (0016). AI gets a parseable code and the full list in one response.

7. **FR-SPECS-0043 carve-out — no runtime scanner.** The leakage rule (FR-ARCH-0016) is enforced against **command-authored constants only**, at test time — never as a runtime filter over payloads.
   - Caller ids (`FR-AUTH-0003`, `depends_on` refs, statements) flow through `get`/`query`/`render`/`graph`/error messages **verbatim**; zero redaction.
   - Error messages are built from `errors.ts` *templates* that never interpolate Rosetta ids; they *do* interpolate caller ids (`[FR-AUTH-0003] target_not_found`) — allowed (caller data).
   - A unit test scans a fixed allowlist of authored surfaces — the assembled `specsHelpContent`, static schema `description` strings, and error templates — for `FR-\d`/`NFR-\d`/`CTORNDGAIN-`/internal paths. It explicitly does **not** scan `result` payloads or aggregated error strings.
   - Kept separate by construction: caller ids appear only in dynamic payloads (never scanned); Rosetta ids can appear only in authored constants (scanned).

---

## D) Traceability — FR-SPECS id → file (all 33 Approved covered)

| FR-SPECS | Primary file(s) |
|---|---|
| 0001 Spec unit schema | `core.ts` (types), `schemas.ts` |
| 0002 Document schema | `core.ts`, `write.ts` (create), `doc-io.ts` |
| 0003 Spec types | `core.ts` |
| 0004 Id format + area reg | `core.ts` (regex/validators), `info.ts` (next-id) |
| 0005 Unique/refs/acyclic | `core.ts` (validators, `detectCycle`) |
| 0006 EARS/NFR/GWT content | `rubric.ts`, `validate.ts` |
| 0007 Size limits/constants | `core.ts`, `shared/constants.ts` |
| 0010 add | `add.ts` |
| 0011 get | `get.ts` |
| 0012 query | `query.ts`, `query-filter.ts` |
| 0013 update (+auto-transition) | `update.ts` |
| 0014 delete | `delete.ts` |
| 0015 implemented | `implemented.ts` |
| 0016 purge | `purge.ts` (+FR-ARCH-0015 in `cli.ts`) |
| 0017 approve | `approve.ts` (+`rubric.ts`, `aggregate.ts`) |
| 0018/0019/0020 deprecate/restore/reopen | `deprecate.ts`/`restore.ts`/`reopen.ts` |
| 0021 validate | `validate.ts`, `rubric.ts`, `core.ts` |
| 0022 graph | `graph.ts` |
| 0023 render | `render.ts`, `shared/time.ts`, `query-filter.ts` |
| 0024 info | `info.ts`, `shared/time.ts` |
| 0025 migrate | `migrate.ts`, `req-parser.ts` |
| 0030 batch/all-or-nothing | `index.ts`, `write.ts`, `aggregate.ts` |
| 0040 guarded fields | `core.ts` (`stripGuarded`), `write.ts`, `add.ts`/`update.ts` + lifecycle ops |
| 0041 actor resolver | `shared/actor.ts` |
| 0042 UTC/local time | `shared/time.ts` (used by write/render/info) |
| 0043 leakage carve-out | `help-content.ts`, `errors.ts`, leakage unit test |
| 0050 named result types | `output.ts`, `schemas.ts` |
| 0060 help content | `help-content.ts`, `schemas.ts`, registry entry |
| 0061 help notes | `help-content.ts` (`specsNotes`) |
| 0070 atomic write+backup | `shared/doc-io.ts`, `write.ts` |
| 0071 path + read resilience | `shared/doc-io.ts`, `core.ts` |

**Deferred:** FR-SPECS-0026 (semantic search, Draft) — query grammar in `query-filter.ts` left open to a future `semantic:` term; nothing built now.

---

## E) Risks + mitigations

1. **doc-io generalization regressing plan.** *Mit:* error-code params default to plan's exact strings; behavior-preserving; 5 edits are import-path + call-site only; re-export shim available as zero-touch fallback; run `build && test && typecheck` on plan suite before/after.
2. **Concurrency-mechanism drift (if duplicated).** *Mit:* Decision 1 forbids duplication — single `doc-io.ts`.
3. **Hand-rolled `<req>` parser correctness.** *Mit:* opaque tag bodies; migrate reports (never drops) unparseable/unsplittable items as warnings/`skipped`; unit-test against `SPECS.md` itself (code-fence + angle-bracket + multi-line cases).
4. **Actor `git config` subprocess** (first spawn; could hang/fail). *Mit:* `execFileSync` with explicit short timeout, `git config --local`/`--global` only (no network), every failure caught → fall through chain → `"unknown"`; never fails the write (FR-SPECS-0041).
5. **90% line/branch coverage gate** over large net-new surfaces (query grammar, rubric, graph, migrate). *Mit:* each isolated in its own pure module → directly unit-testable (empty/malformed/edge inputs, cyclic-but-allowed `related`); frontends excluded from coverage → CLI wiring proven via e2e.
6. **e2e rebuild coupling** (`dist/` staleness). *Mit:* document/enforce `npm --prefix src/rosettify run build` before e2e; note in tech plan's validation steps.
7. **FR-SPECS-0043 backwards implementation** (scanning payloads would break the whole command). *Mit:* Decision 7 — no runtime scanner; test targets authored constants only.
8. **CLI data-driven helper hiding a subcommand quirk.** *Mit:* helper is specs-local and thin; irregular subcommands declare their flags explicitly; plan wiring untouched as the reference pattern.
9. **`approve`→`validate` internal composition** (write op calling read-analysis logic). *Mit:* extract shared logic into `validate.ts`/`rubric.ts` pure functions; `approve` imports functions, not the subcommand envelope; findings aggregated via `aggregate.ts`.
10. **Two independent enums** (approval `status` vs `implementation`) conflated. *Mit:* separate enums + transition tables in `core.ts`; `implemented` never touches `status`, lifecycle ops never touch `implementation`.
