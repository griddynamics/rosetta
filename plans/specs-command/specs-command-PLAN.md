<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Execution Plan — `specs` command (HOW / sequenced WBS)

Companion: `specs-command-SPECS.md` (WHAT). Structure/decisions: `architecture-notes.md`. This doc owns sequencing, parallelization, checkpoints, traceability, risk/rollback. Contracts are NOT restated (reference SPECS §).

Roles: engineer subagents. Each stage = a delegable unit; steps ≈20 min. Checkpoints are **build + typecheck only** (unit/e2e tests are a later coding-flow phase). Validation commands (from discovery §1):
```
npm --prefix src/rosettify run build       # tsc -p tsconfig.build.json → dist/
npm --prefix src/rosettify run typecheck   # tsc --noEmit
```
Test targets (`npm --prefix src/rosettify run test`) referenced only where a regression gate is called out; full test authoring deferred.

## TLDR
S1 shared IO generalize (+plan regression gate) → S2 actor/time/constants → S3 core+errors+output → S4 write+aggregate → S5 pure modules (parallel) → S6 subcommands (parallel batches) → S7 schemas+help → S8 index+registry+CommandInput → S9 CLI table+frontends+--force → S10 version+docs → S11 build/typecheck green. Strict deps S1→S2→S3→S4; S5 parallel to S3/S4; S6 needs S3/S4/S5; S7 needs S6; S8 needs S6/S7; S9 needs S8.

---

## EARS functional requirements (execution-level, derived from FR-SPECS contract)
- E1: When shared IO is generalized, the plan command's behavior SHALL remain unchanged (regression gate S1). // 0070
- E2: When any spec write executes, the system SHALL apply the batch in memory, run integrity over post-batch state, and write exactly once only if valid. // 0030,0005
- E3: Where a caller supplies a guarded field on add/update, the system SHALL drop it. // 0040
- E4: When any write completes, the system SHALL stamp changed(UTC) and changed_by(resolved actor). // 0041,0042
- E5: If a batch item is invalid, the system SHALL write nothing and return one aggregated error string naming every failure. // 0030
- E6: When the leakage test scans authored surfaces, it SHALL find no Rosetta id/ticket/path. // 0043
- E7: When `help specs` is queried, the registry SHALL return the full help payload. // 0060

---

## Stage breakdown

### S1 — Shared IO generalization + detectCycle extraction + plan import edits (PREREQUISITE, serial)
- **Goal**: (a) `plan-io.ts`→`shared/doc-io.ts` with parameterized error codes; new `shared/errors.ts`; remove shared→command back-import; update plan's 5 import sites. (b) Extract `detectCycle` into new `shared/graph.ts`; `plan/core.ts` re-exports it (zero-touch for plan call sites). All behavior-preserving.
- **Files**:
  - `shared/doc-io.ts` (renamed from plan-io.ts), `shared/errors.ts` (new), `shared/graph.ts` (new — detectCycle lifted verbatim from plan/core.ts).
  - `commands/plan/errors.ts` (re-export ERR_BACKUP_CREATE_FAILED from shared).
  - `commands/plan/core.ts` (remove detectCycle body → `export { detectCycle } from "../../shared/graph.js"`).
  - `commands/plan/{next,query,upsert,update-status,show-status}.ts` (import path `plan-io.js`→`doc-io.js`).
  - `tests/unit/shared/plan-io.test.ts` → **rename to `tests/unit/shared/doc-io.test.ts`** and fix its import (`../../../src/shared/plan-io.js` → `../../../src/shared/doc-io.js`). Clean rename, NO permanent shim. SPECS §6.1/§6.2/§6.5.
- **Prereq**: none.
- **FR covered**: 0070, 0071 (foundation), 0005 (shared detectCycle primitive).
- **Parallel?**: No — everything downstream imports doc-io + shared/graph.
- **Done-check**: build + typecheck green; **plan regression gate** `npm --prefix src/rosettify run test` green (plan suite + renamed doc-io.test.ts pass). If any plan site breaks unexpectedly during the doc-io rename, a temporary `plan-io.ts` re-export shim is the fallback (Risk R1) — but the clean rename (incl. the test) is the target; the shim is not the delivered state.

### S2 — Actor + time + constants (serial after S1 start; independent of S1 internals)
- **Goal**: `shared/actor.ts` (resolveActor chain, execFileSync git with timeout, never throws), `shared/time.ts` (nowUtcZ/formatLocal), add 6 `SPECS_MAX_*` to `shared/constants.ts`.
- **Files**: `shared/actor.ts`, `shared/time.ts`, `shared/constants.ts`. SPECS §6.3/§6.4/§3.
- **Prereq**: none (can start with S1).
- **FR**: 0041, 0042, 0007.
- **Parallel?**: Yes — independent of doc-io; can run concurrently with S1.
- **Done-check**: build + typecheck green.

### S3 — core.ts + errors.ts + output.ts (serial after S2)
- **Goal**: all types/enums (SPECS §3/§4), validators + stripGuarded + parseId + loadSpecs/saveSpecs/newDocument (SPECS §5); `errors.ts` code consts + templates (SPECS §13); `output.ts` builders.
- **Files**: `commands/specs/core.ts`, `commands/specs/errors.ts`, `commands/specs/output.ts`.
- **Prereq**: S2 (constants), S1 (`shared/graph.ts` — import `detectCycle` from there, do NOT copy).
- **FR**: 0001,0002,0003,0004,0005,0007,0040,0050(types),0043(templates).
- **Parallel?**: core.ts internal — one engineer; errors.ts + output.ts can be a parallel sibling (no overlap) once type names are fixed by SPECS §4.
- **Done-check**: build + typecheck green (types compile; validators pure).

### S4 — write.ts + aggregate.ts (serial after S3)
- **Goal**: `applyBatchWrite` single write path (SPECS §7) using doc-io + actor + time + core integrity; `aggregate.ts` error-string builder (SPECS §13).
- **Files**: `commands/specs/write.ts`, `commands/specs/aggregate.ts`.
- **Prereq**: S1 (doc-io), S2 (actor/time), S3 (core, errors).
- **FR**: 0030, 0040, 0070.
- **Parallel?**: aggregate.ts parallel to write.ts (no overlap).
- **Done-check**: build + typecheck green.

### S5 — Net-new pure modules (PARALLEL fan-out, after S3)
- **Goal**: isolated unit-testable modules. Each file independent — no cross-imports except on core types.
- **Files (each a parallel task, no overlap)**:
  - `query-filter.ts` — parseQuery/applyFilter + grammar (SPECS §11.1) // 0012
  - `rubric.ts` — EARS/NFR/modal/duplicate/acceptance matchers (SPECS §11.2) // 0006,0021
  - `graph.ts` — closures/reverse/cycles/edges/unresolved + `cmdGraph` wrapper (SPECS §11.3, §10) // 0022
  - `req-parser.ts` — scanner/attrs/GWT/impl-normalize/mapToSpec (SPECS §11.4) // 0025
  - `render.ts` — renderSpecs + `cmdRender` wrapper (SPECS §11.5, §10) // 0023,0042
- **Prereq**: S3 (core types). Independent of S4.
- **Parallel?**: Yes — 5 concurrent tasks, distinct files.
- **Done-check**: build + typecheck green per file.

### S6 — Subcommand files (PARALLEL batches, after S4 + S5)
Group into batches with **no file overlap**; each cmd file imports write/core/output/pure-modules but not sibling cmd files (except approve→validate logic, kept as a batch boundary).
- **Batch 6A (CRUD writes)**: `add.ts`(0010), `update.ts`(0013), `implemented.ts`(0015). Prereq S4.
- **Batch 6B (reads)**: `get.ts`(0011), `query.ts`(0012, uses query-filter), `info.ts`(0024, uses time/parseId). `graph.ts` (pure helpers + `cmdGraph`) and `render.ts` (pure helpers + `cmdRender`) are completed ENTIRELY in S5 — 6B does not touch them, it only consumes their exports where needed. Prereq S5.
- **Batch 6C (lifecycle)**: `delete.ts`(0014), `deprecate.ts`(0018), `restore.ts`(0019), `reopen.ts`(0020), `purge.ts`(0016). Prereq S4.
- **Batch 6D (validate+approve)**: `validate.ts`(0021, uses rubric+core+query-filter) THEN `approve.ts`(0017, imports validate logic + aggregate). Serial within batch (approve depends on validate functions); parallel to 6A/6B/6C.
- **Batch 6E (migrate)**: `migrate.ts`(0025, uses req-parser + write allowCreate). Prereq S4+S5(req-parser).
- **FR**: 0010–0025 (minus 0026).
- **Parallel?**: 6A,6B,6C,6D,6E run concurrently; within 6D approve after validate.
- **Done-check**: build + typecheck green after each batch merges.

### S7 — schemas.ts + help-content.ts (after S6)
- **Goal**: per-subcommand `{input,output}` consts (co-located in each cmd file per plan pattern) aggregated in `schemas.ts`; flat named-type dict keyed by exported TS type name, `$ref` by name (SPECS §4). `help-content.ts`: `specsNotes[]` + `specsHelpContent` (SPECS §15), leakage-clean.
- **Files**: `commands/specs/schemas.ts`, `commands/specs/help-content.ts` (+ small per-cmd schema exports added during S6 or here).
- **Prereq**: S6 (subcommand result types + schema exports exist).
- **FR**: 0050, 0060, 0061, 0043.
- **Parallel?**: schemas.ts and help-content.ts can be split but help imports the dict — sequence schemas→help.
- **Done-check**: build + typecheck green.

### S8 — index.ts dispatch + registry + CommandInput (after S6/S7)
- **Goal**: `runSpecs` (no-arg help, unknown_command, central data parse, batch normalize, 16-way switch, per-case required-arg checks); export `specsToolDef` (inputSchema enumerates all fields; helpContent=specsHelpContent). Registry 3rd entry. `CommandInput` additive extension (SPECS §9).
- **Files**: `commands/specs/index.ts`, `registry/index.ts`, `registry/types.ts`.
- **Prereq**: S6 (cmd*), S7 (help/schemas).
- **FR**: 0030 (normalize/dispatch), 0060 (toolDef.helpContent → help specs auto-wires).
- **Parallel?**: No — integration point.
- **Done-check**: build + typecheck green; `getCliTools`/`getMcpTools` include specs.

### S9 — CLI data-driven table + frontends wiring + --force (after S8)
- **Goal**: `registerSpecsSub` helper + 16-row table + `specsCmd` root block (help/no-arg/unknown fallthrough) (SPECS §14); first `--force` in codebase. mcp.ts unchanged (verify only).
- **Files**: `frontends/cli.ts`. (`frontends/mcp.ts` — no change.)
- **Prereq**: S8 (specsToolDef, CommandInput fields).
- **FR**: FR-CLI-0001, FR-ARCH-0015 (--force), 0012/0022/0023 flags.
- **Parallel?**: No.
- **Done-check**: build + typecheck green. (CLI proven via e2e in later phase — coverage excludes frontends.)

### S10 — Version bump + docs (after S9)
- **Goal**: `package.json` `3.0.0`→`3.1.0-b01` (VERSION flows automatically). Docs updates (these docs DO exist — affirmative, not conditional):
  - `docs/ARCHITECTURE.md` (## Rosettify): add a "Specs management" entry mirroring the existing plan bullet — description + the 16 subcommand names (add, get, query, update, delete, purge, implemented, approve, deprecate, restore, reopen, validate, graph, render, info, migrate).
  - `agents/IMPLEMENTATION.md`: add a changelog bullet — doc-io generalization (plan-io→shared/doc-io, detectCycle→shared/graph) + new specs command.
  - `docs/CONTEXT.md`: no rosettify change needed — quick confirm only.
  - FR-SPECS `<implementation>` fields → Implemented with concise notes during coding-flow acceptance (requirements-use process step 6).
- **Files**: `src/rosettify/package.json`, `docs/ARCHITECTURE.md`, `agents/IMPLEMENTATION.md`, `docs/REQUIREMENTS/rosettify/SPECS.md` (impl-status upkeep).
- **Prereq**: S9.
- **FR**: version (architecture-notes §C); traceability upkeep.
- **Parallel?**: docs parallel to version.
- **Done-check**: build green (version reads).

### S11 — Full build + typecheck green (final gate)
- **Goal**: whole-package build + typecheck clean; confirm plan suite still green (regression). Rebuild dist for downstream e2e phase.
- **Files**: none (validation).
- **Prereq**: S10.
- **Done-check**:
```
npm --prefix src/rosettify run build && npm --prefix src/rosettify run typecheck
npm --prefix src/rosettify run test   # plan regression must stay green
```
- **e2e coupling note**: e2e spawns built `dist/bin/rosettify.js`; ALWAYS `npm --prefix src/rosettify run build` before any e2e run (discovery §1, Risk R6). This gate rebuilds dist so the later validation phase starts from fresh output.

---

## Dependency graph (stages)
```
S1 ─┐                 ┌─ S5 (∥×5) ─┐
    ├─→ S3 ─→ S4 ─────┤            ├─→ S6 (∥ 6A/6B/6C/6D/6E) ─→ S7 ─→ S8 ─→ S9 ─→ S10 ─→ S11
S2 ─┘                 └────────────┘
```
S1 & S2 concurrent. S5 concurrent with S3→S4 tail (needs only S3 core types). S6 needs S4+S5.

---

## Traceability matrix — FR-SPECS → stage → file(s) → verification

| FR-SPECS | Stage | File(s) | Verification |
|---|---|---|---|
| 0001 spec schema | S3 | core.ts, schemas.ts(S7) | types compile; add stores defaults; unknown field→invalid_spec_field |
| 0002 doc schema | S3,S4 | core.ts(newDocument/saveSpecs), write.ts, doc-io.ts(S1) | first-create makes file+dirs; corrupted→specs_file_corrupted |
| 0003 types | S3 | core.ts | invalid type→invalid_type |
| 0004 id+area | S3,S6 | core.ts(ID_RE/parseId/validateAreaRegistration/autoRegisterAreas), add.ts, migrate.ts, info.ts | missing_id/invalid_id_format/immutable_id; add+migrate auto-register new AREA (default name=code) so first add to areas:[] succeeds; unknown_area only if neither doc nor call registers; info next_ids |
| 0005 unique/refs/acyclic | S1,S3 | shared/graph.ts(detectCycle), core.ts validators | duplicate_id/unknown_dependency/dependency_cycle; related may cycle; Removed valid target; detectCycle shared (no command→command import) |
| 0006 content rules | S5 | rubric.ts | EARS pass/fail; NFR measurable; acceptance completeness |
| 0007 limits | S2,S3 | constants.ts, core.ts | 1001 specs/257 title/501 batch → size_limit_exceeded |
| 0010 add | S6/6A | add.ts, write.ts | Draft/NotStarted defaults; guarded ignored; batch append; create-on-missing |
| 0011 get | S6/6B | get.ts | found(incl Removed)+missing; no error on missing |
| 0012 query | S5,S6/6B | query-filter.ts, query.ts | AND/OR/NOT/quoted/free; include_removed; invalid_filter/invalid_query |
| 0013 update | S6/6A | update.ts | RFC7396; guarded drop; Approved→Modified; Implemented→ToBeModified; immutable_id/target_not_found |
| 0014 delete | S6/6C | delete.ts, write.ts | soft Removed; idempotent; missing[] |
| 0015 implemented | S6/6A | implemented.ts | impl enum set; status untouched; invalid_implementation/missing_implementation |
| 0016 purge | S6/6C,S9 | purge.ts, cli.ts(--force) | force_required; referenced_by_others; missing[] |
| 0017 approve | S6/6D | approve.ts, validate.ts(runValidation), aggregate.ts | approve resolves ids→Spec[] then calls shared runValidation (bypasses query grammar); error findings ⇒ validation_failed aggregation; invalid_transition |
| 0018/0019/0020 | S6/6C | deprecate/restore/reopen.ts | transition table; invalid_transition; idempotency |
| 0021 validate | S5,S6/6D | validate.ts(runValidation), rubric.ts, core.ts | cmdValidate = query-filter select → runValidation(doc,targets); structural=error, phrasing=warning; ok=(error_count==0); EARS ordered-matching |
| 0022 graph | S5 | graph.ts | dependencies/dependents; cycles enumerated; cross-doc; unresolved |
| 0023 render | S5 | render.ts, time.ts | markdown/text; group by area; local time; no file write; invalid_format |
| 0024 info | S6/6B | info.ts, time.ts | totals + next_ids; local time |
| 0025 migrate | S5,S6/6E | req-parser.ts, migrate.ts | split+legacy impl; GWT split/verbatim+warning; source_not_found/migrate_parse_error; report-don't-drop |
| 0030 batch | S4,S8 | index.ts(normalize), write.ts, aggregate.ts | all-or-nothing; single-obj=batch1; 501→size_limit_exceeded pre-processing |
| 0040 guarded | S3,S4,S6 | core.ts(stripGuarded), write.ts, add/update+lifecycle | caller values dropped; settable only by lifecycle |
| 0041 actor | S2 | shared/actor.ts | ROSETTA_ACTOR→git→OS→"unknown"; never fails write |
| 0042 time | S2 | shared/time.ts | stored UTC Z; render/info local; get/query UTC verbatim |
| 0043 leakage | S3,S7 | errors.ts, help-content.ts, leakage test | authored surfaces clean; caller ids verbatim |
| 0050 result types | S3,S7 | output.ts, core.ts types, schemas.ts | shared SpecWriteResult/SpecLifecycleResult; every nested shape named |
| 0060 help | S7,S8 | help-content.ts, schemas.ts, registry | help specs returns full payload |
| 0061 notes | S7 | help-content.ts(specsNotes) | all 12 behaviors; standalone, clean |
| 0070 atomic write | S1,S4 | doc-io.ts, write.ts | bakNNN; previous_version; lock serializes; backup_create_failed |
| 0071 path+read | S1,S3 | doc-io.ts, core.ts | dirs created; retry-on-backup; specs_not_found/specs_file_corrupted |
| **0026 semantic** | — | — | **DEFERRED (Draft, out of scope)** — query-filter leaves `semantic:` unclaimed |

All 33 Approved covered. 0026 deferred.

---

## Risk / rollback
- **R1 doc-io regresses plan** (highest): error-code params default to plan strings → behavior-preserving; S1 edits are import-path only; **run plan test suite before AND after S1**; fallback = leave `plan-io.ts` re-export shim (zero-touch). (architecture-notes §E.1)
- **R2 concurrency drift**: forbidden — single doc-io, no duplicate specs-io. (§E.2)
- **R3 req-parser correctness**: opaque bodies; migrate reports-don't-drop; unit-test against SPECS.md itself (code-fence/angle-bracket/multiline). (§E.3)
- **R4 actor git subprocess hang**: execFileSync explicit timeout (~500ms), local-only, catch-all → "unknown"; never fails write. (§E.4)
- **R5 coverage gate 90%**: net-new isolated in pure modules → directly unit-testable; frontends excluded (e2e). (§E.5)
- **R6 e2e dist staleness**: enforce `npm --prefix src/rosettify run build` before e2e (S11 rebuilds). (§E.6)
- **R7 leakage backwards impl**: no runtime scanner; test authored constants only, never payloads/aggregated strings. (§E.7)
- **R8 CLI helper hides quirk**: helper specs-local + thin; irregular flags declared explicitly; plan wiring untouched as reference. (§E.8)

## HITL gates
- G1 (pre-execution): confirm this plan + SPECS before S1. (already gated by design approval)
- G2 (post-S1): plan regression green — STOP and report if any plan test fails.
- G3 (post-S11): final coverage/acceptance review; update FR-SPECS implementation status.

## Open questions — all RESOLVED (no blockers remain)
1. RESOLVED — `graph` target = `ids[0]` (batch-of-one), identical CLI↔MCP; no dedicated field. (SPECS §14/§17)
2. RESOLVED — `docs/ARCHITECTURE.md` + `agents/IMPLEMENTATION.md` DO exist and get affirmative S10 updates; `docs/CONTEXT.md` needs no rosettify change (confirm only).
3. RESOLVED (deferred) — cosmetic `PLAN_BACKUP_*`/`PLAN_READ_*`→`BACKUP_*`/`READ_*` rename deferred to avoid plan churn; no change this effort.

</CRITICAL>
