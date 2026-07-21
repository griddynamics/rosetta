<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Tech Specs — `specs` command (WHAT / target-state contracts)

Companion: `specs-command-PLAN.md` (HOW). Source of truth for structure/decisions: `architecture-notes.md` (§C file layout, 7 decisions, §D traceability). This doc owns **contracts** — types, signatures, grammars, tables, error catalog, per-module acceptance. It does **not** restate FR text (reference the id) nor sequencing (see PLAN). All refs are code-comment-style `// FR-SPECS-NNNN`.

## TLDR
- New registry tool `specs` mirroring `plan`; one run delegate, CLI+MCP, common envelope. 16 subcommands, 33 Approved FR-SPECS (0026 deferred).
- Storage: one JSON doc per component; flat `specs[]` + `areas[]`. Caller-supplied ids `^(FR|NFR|INT|DATA)-[A-Z0-9]+-\d{4}$`.
- Two independent enums: approval `status` (Draft|Approved|Modified|Deprecated|Removed) + `implementation` (NotStarted|Implemented|Planned|ToBeModified|ToBeRemoved). Guarded fields `{status,approved_by,implementation,changed_by}` settable only by lifecycle ops.
- Batch everywhere (1 item = batch of 1); writes all-or-nothing over post-batch state; failures aggregate into one string.
- Shared IO generalized `plan-io.ts`→`shared/doc-io.ts` (error codes parameterized, plan defaults preserved). New `shared/actor.ts`, `shared/time.ts`, `shared/errors.ts`.
- Net-new pure modules quarantined: `query-filter.ts`, `rubric.ts`, `graph.ts`, `req-parser.ts`, `render.ts`.
- Version `3.0.0`→`3.1.0-b01`.

---

## 1. Scope & NFR/ASR

In-scope FR-SPECS: 0001–0007, 0010–0025, 0030, 0040–0043, 0050, 0060–0061, 0070–0071 (33 Approved). **Out:** 0026 (Draft).

ASR (inherited, not re-derived):
- **Determinism** — no server-side id minting (0004); no silent statement rewrite (0006); guarded fields immutable via content ops (0040).
- **Crash/concurrency safety** — every write via shared lock+rename+backup mechanism (0070); resilient reads (0071). MUST NOT regress plan.
- **No net-new runtime dependency** (Decision 4). commander/mcp-sdk/pino only.
- **Coverage ≥90% lines/branches** (frontends excluded) — net-new logic isolated into pure, unit-testable modules.
- **Leakage** — authored surfaces (help/schema-desc/error-templates) carry no Rosetta ids/tickets/paths; caller payload passes through verbatim (0043).
- **Perf** — single-file read-modify-write bounded by 0007 limits; no network in actor resolution (0041).

---

## 2. Architecture (B2, per architecture-notes §B/§C)

```mermaid
flowchart LR
  CLI["cli.ts<br/>data-driven table (16 rows)"] -->|dispatch| DISP["shared/dispatch.ts"]
  MCP["mcp.ts (unchanged)"] -->|dispatch| DISP
  DISP --> IDX["commands/specs/index.ts<br/>runSpecs + specsToolDef"]
  IDX --> CRUD["add/get/query/update/delete/implemented"]
  IDX --> LIFE["approve/deprecate/restore/reopen/purge"]
  IDX --> ANA["validate/graph/render/info/migrate"]
  CRUD --> WR["write.ts applyBatchWrite"]
  LIFE --> WR
  WR --> DIO["shared/doc-io.ts atomicWriteWithBackup"]
  WR --> ACT["shared/actor.ts"]
  WR --> TIM["shared/time.ts"]
  CRUD --> CORE["core.ts types/enums/validators/stripGuarded"]
  ANA --> CORE
  validate --> RUB["rubric.ts"]
  query --> QF["query-filter.ts"]
  render --> QF
  validate --> QF
  graph --> GR["graph.ts"]
  migrate --> RP["req-parser.ts"]
  IDX --> AGG["aggregate.ts"]
  IDX --> ERR["errors.ts"]
  ANA --> OUT["output.ts / schemas.ts / help-content.ts"]
```
Style (light+dark readable): boxes `#1f6feb` fill / `#ffffff` text; edges `#8b949e`. (Apply if rendered.)

Module responsibilities & FR mapping: verbatim from `architecture-notes.md §C` — not duplicated here.

---

## 3. Core Types & Enums (`commands/specs/core.ts`) // FR-SPECS-0001,0002,0003

```ts
// enums — const tuples + derived unions (mirror plan VALID_STATUSES pattern)
export const SPEC_TYPES = ["FR","NFR","INT","DATA"] as const;                       // FR-SPECS-0003
export type SpecType = (typeof SPEC_TYPES)[number];
export const STATUSES = ["Draft","Approved","Modified","Deprecated","Removed"] as const; // FR-SPECS-0040
export type StatusEnum = (typeof STATUSES)[number];
export const IMPLS = ["NotStarted","Implemented","Planned","ToBeModified","ToBeRemoved"] as const; // FR-SPECS-0015
export type ImplEnum = (typeof IMPLS)[number];
export const MOSCOW = ["Must","Should","Could","Wont"] as const;
export type MoscowEnum = (typeof MOSCOW)[number];
export const SOURCES = ["User","Inferred","Sources","Documentation"] as const;
export type SourceEnum = (typeof SOURCES)[number];
export const VERIFS = ["Test","Analysis","Inspection","Demo"] as const;
export type VerifEnum = (typeof VERIFS)[number];

export interface AcceptanceCriterion { given: string; when: string; then: string; } // FR-SPECS-0001
export interface Spec {                                                              // FR-SPECS-0001
  id: string; type: SpecType; level: string; ticket_id?: string; classification?: string;
  title: string; statement: string; rationale: string;
  source: SourceEnum; priority: MoscowEnum;
  status: StatusEnum; approved_by: string; changed: string; changed_by: string;      // guarded (0040) + stamps (0041/0042)
  verification: VerifEnum; acceptance: AcceptanceCriterion[];
  depends_on: string[]; related: string[];                                           // FR-SPECS-0005
  implementation: ImplEnum; implementation_notes: string; notes: string;
}
export interface AreaEntry { code: string; name: string; }                           // FR-SPECS-0002
export interface SpecsDocument {                                                     // FR-SPECS-0002
  component: string; description: string;
  created_at: string; updated_at: string; previous_version: string | null;          // ISO8601 UTC Z (0042); backup (0070)
  areas: AreaEntry[]; specs: Spec[];
}
export interface SpecInput extends CommandInput {}                                   // FR-ARCH-0004
```

**Constants** (`shared/constants.ts`, Decision per §C): `SPECS_MAX_SPECS=1000`, `SPECS_MAX_DEPENDENCIES_PER_SPEC=50`, `SPECS_MAX_ACCEPTANCE_PER_SPEC=50`, `SPECS_MAX_STRING_LENGTH=20_000`, `SPECS_MAX_NAME_LENGTH=256`, `SPECS_MAX_BATCH_SIZE=500`. Reuse `PLAN_BACKUP_*`/`PLAN_READ_*` verbatim. // FR-SPECS-0007,0070,0071

**Guarded fields**: `export const GUARDED_FIELDS = ["status","approved_by","implementation","changed_by"] as const;` // FR-SPECS-0040

---

## 4. Named Result Types // FR-SPECS-0050 (each exported; every nested/array-items shape is itself named per FR-HELP-0002)

```ts
export interface SpecRef { id: string; status: StatusEnum; }                                  // FR-SPECS-0050
export interface SpecDocumentSummary { component: string; total: number; previous_version: string | null; }
export interface SpecWriteResult { document: SpecDocumentSummary; affected: SpecRef[]; }       // add,update (0010,0013)
export interface SpecLifecycleResult { updated: SpecRef[]; }                                    // approve,deprecate,restore,reopen (0017-0020)
export interface SpecGetResult { found: Spec[]; missing: string[]; }                            // FR-SPECS-0011
export interface SpecQueryResult { specs: Spec[]; count: number; }                              // FR-SPECS-0012
export interface SpecDeleteResult { removed: string[]; missing: string[]; }                     // FR-SPECS-0014
export interface SpecPurgeResult { purged: string[]; missing: string[]; }                       // FR-SPECS-0016
export interface SpecImplementedItem { id: string; implementation: ImplEnum; }
export interface SpecImplementedResult { updated: SpecImplementedItem[]; }                       // FR-SPECS-0015
export type Severity = "error" | "warning" | "info";
export interface SpecFinding { id: string; check: string; severity: Severity; message: string; } // FR-SPECS-0021
export interface SpecValidateResult { ok: boolean; findings: SpecFinding[]; error_count: number; warning_count: number; }
export type EdgeKind = "depends_on" | "related";
export interface SpecEdge { from: string; to: string; kind: EdgeKind; }                          // FR-SPECS-0022
export interface SpecGraphResult { dependencies?: string[]; dependents?: string[]; related?: string[];
  edges?: SpecEdge[]; cycles: SpecEdge[][]; unresolved: string[]; }
export interface SpecRenderResult { format: "markdown" | "text"; content: string; }              // FR-SPECS-0023
export interface SpecAreaInfo { code: string; name: string; count: number; }                     // FR-SPECS-0024
export interface SpecTotals { by_type: Record<string,number>; by_status: Record<string,number>;
  by_implementation: Record<string,number>; total: number; }
export interface SpecNextId { prefix: string; area: string; highest: number; suggested: string; }
export interface SpecInfoResult { component: string; description: string; areas: SpecAreaInfo[];
  totals: SpecTotals; next_ids: SpecNextId[]; created_at: string; updated_at: string; }
export interface SpecSkipped { source: string; reason: string; }
export interface SpecMigrateResult { migrated: number; sources: string[]; warnings: SpecFinding[]; skipped: SpecSkipped[]; } // FR-SPECS-0025
```
Rule: builders in `output.ts` (`buildSpecWriteResult`, `buildSpecLifecycleResult`) are the sole authors of the two shared shapes; each `schemas.ts` dict key equals the exported TS type name; `$ref` by name, no anonymous shape at any depth. // FR-SPECS-0050,0060

---

## 5. core.ts validator/helper contracts // FR-SPECS-0004,0005,0007,0040

```ts
export const ID_RE = /^(FR|NFR|INT|DATA)-[A-Z0-9]+-\d{4}$/;                                      // FR-SPECS-0004
export function parseId(id: string): { prefix: SpecType; area: string; seq: number } | null;     // used by info/validate
export function validateIdFormat(id: string): string | null;          // → "invalid_id_format" | null
export function validateAreaRegistration(spec: Spec, doc: SpecsDocument): string | null; // → "unknown_area" | null (only when neither doc.areas nor this call registers AREA)
export function autoRegisterAreas(doc: SpecsDocument, ids: string[]): void; // FR-SPECS-0004 — add/migrate only: for each id's AREA absent from doc.areas, append {code:AREA, name:AREA}
export function validateImmutableId(patchId: string|undefined, targetId: string): string | null; // reuse plan pattern → "immutable_id"
export function validateType(t: unknown): string | null;              // → "invalid_type" | null
export function validateKnownFields(item: Record<string,unknown>): string | null; // unknown key → "invalid_spec_field"
export function validateRequired(spec: Partial<Spec>): string | null; // missing/empty required → "missing_required_field"
export function validateUniqueIds(doc: SpecsDocument): string | null; // Set over specs[] → "duplicate_id"
export function validateReferences(doc: SpecsDocument): string | null; // every depends_on/related exists (Removed counts) → "unknown_dependency"
export function validateDependsAcyclic(doc: SpecsDocument): string | null; // build Map<id,depends_on[]>, reuse detectCycle; self-dep → "dependency_cycle"
export function validateSizeLimits(doc: SpecsDocument): string | null; // specs≤1000, deps≤50, acceptance≤50, string≤20000, name/title/id≤256 → "size_limit_exceeded"
// detectCycle is NOT defined here — imported from shared/graph.ts (§6.5) to avoid command→command coupling.
import { detectCycle } from "../../shared/graph.js"; // generic DFS, "dependency_cycle" | null
// guarded-field stripping (flat; specs has no nested phases/steps)
export function stripGuarded(item: Record<string,unknown>): Record<string,unknown>; // drops keys in GUARDED_FIELDS  // FR-SPECS-0040
// plain IO used only by first-create bypass
export function loadSpecs(file: string): SpecsDocument | null;
export function saveSpecs(file: string, doc: SpecsDocument): void;    // mkdir -p, updated_at=nowUtcZ(), pretty JSON  // FR-SPECS-0002,0071
export function newDocument(component?: string): SpecsDocument;       // created_at/updated_at=nowUtcZ(), previous_version=null, areas/specs=[]
```
Post-batch integrity order (run once over resulting state, before write): `validateSizeLimits → validateUniqueIds → validateReferences → validateDependsAcyclic`. `related` is **never** run through cycle detection. // FR-SPECS-0005,0030

---

## 6. Shared modules

### 6.1 `shared/doc-io.ts` (generalized from `plan-io.ts`) // FR-SPECS-0070,0071
Behavior-preserving generalization; bodies unchanged except error-code source.
```ts
export interface DocIoErrors { corrupted?: string; notFound?: string; }
export async function readDocWithRetry<Doc extends { previous_version?: string | null }>(filePath: string): Promise<Doc | null>; // ex-readPlanWithRetry, identical body
export async function atomicWriteWithBackup<Doc extends { previous_version?: string | null; updated_at: string }, T>(
  filePath: string,
  mutate: (doc: Doc) => { ok: true; result: T; updated: Doc } | { ok: false; error: string; include_help?: boolean },
  saveDoc: (filePath: string, doc: Doc) => void,
  options?: { maxRetries?: number; retention?: number; errors?: DocIoErrors },
): Promise<RunEnvelope<{ result: T; backupPath: string | null }>>;
```
- Corrupted mapping (was L203 `ERR_PLAN_FILE_CORRUPTED`) → `options?.errors?.corrupted ?? "plan_file_corrupted"`.
- Not-found (was L206 `"plan_not_found"`) → `options?.errors?.notFound ?? "plan_not_found"`.
- Backup-exhausted → `ERR_BACKUP_CREATE_FAILED` from `shared/errors.ts`.
- Plan callers pass no `errors` → identical behavior. Specs passes `{corrupted:"specs_file_corrupted", notFound:"specs_not_found"}`.

### 6.2 `shared/errors.ts` (new) // removes shared→command back-import
```ts
export const ERR_BACKUP_CREATE_FAILED = "backup_create_failed";
```
`plan/errors.ts` re-exports it for existing plan import sites (or plan imports from shared) — no behavior change.

### 6.3 `shared/actor.ts` (new) // FR-SPECS-0041
```ts
export function resolveActor(explicit?: string): string; // ordered chain, first non-empty; never throws, never network
```
Chain: (1) `explicit` param, else `process.env.ROSETTA_ACTOR`; (2) `git config user.email` then `git config user.name` via `execFileSync("git",["config",scope,key],{timeout:500,stdio:[...],encoding:"utf8"})` — try `--local` then `--global`; every failure caught; (3) `process.env.SUDO_USER`, then `os.userInfo().username`, then `process.env.USER ?? process.env.USERNAME`; (4) literal `"unknown"`. Trims; empty → next. MUST NOT return the word `"user"`. MUST NOT fail the write.

### 6.5 `shared/graph.ts` (new) // FR-SPECS-0005 — shared cycle primitive (hygiene, per Decision 1 direction)
```ts
export function detectCycle(graph: Map<string, string[]>): string | null; // generic DFS, "dependency_cycle" | null — body lifted verbatim from plan/core.ts
```
Extracted so both commands import from `shared/` (no command→command import). `plan/core.ts` re-exports `detectCycle` from `shared/graph.js` (zero-touch for plan call sites); `specs/core.ts` imports it directly. `commands/specs/graph.ts` (§11.3, the graph-walker subcommand) is a DIFFERENT file at a different path — no collision.

### 6.4 `shared/time.ts` (new) // FR-SPECS-0042
```ts
export function nowUtcZ(): string;                 // new Date().toISOString() (ends with Z)
export function formatLocal(iso: string): string;  // toLocaleString() in host local tz; passthrough if unparseable
```
Persisted timestamps always `nowUtcZ()`. render/info display via `formatLocal`. get/query return stored UTC verbatim.

---

## 7. write.ts — single write path // FR-SPECS-0030,0040,0070

```ts
export interface BatchBuild<T> {
  // pure in-memory mutator over a working copy; returns affected ids for stamping, or an aggregatable error
  (doc: SpecsDocument): { ok: true; affected: string[]; result: T } | { ok: false; error: string };
}
export async function applyBatchWrite<T>(
  file: string,
  build: BatchBuild<T>,
  opts?: { allowCreate?: boolean; actor?: string },
): Promise<RunEnvelope<{ result: T; previous_version: string | null }>>;
```
Algorithm (once):
1. `actor = resolveActor(opts?.actor)`, `ts = nowUtcZ()` resolved once per call.
2. Define inner `mutateFn(doc)`: run `build(doc)`; on error `{ok:false,error}`; else stamp each `id∈affected` present in `doc.specs` with `changed=ts, changed_by=actor`; run core post-batch integrity chain; on integrity error `{ok:false,error}`; else `{ok:true,result,updated:doc}`.
3. If `opts.allowCreate && !fs.existsSync(file)`: `doc=newDocument()`; run `mutateFn`; on ok `saveSpecs(file,doc)` (previous_version stays null); return `{result, previous_version:null}`. (mirrors plan upsert first-create bypass)
4. Else `atomicWriteWithBackup(file, mutateFn, saveSpecs, {errors:{corrupted:"specs_file_corrupted",notFound:"specs_not_found"}})`; inject returned `backupPath` as `previous_version`.
Guarantee: lifecycle ops never re-implement IO/stamp; guarded fields set only inside `build` by internal mutator code.

---

## 8. index.ts dispatch // FR-SPECS-0030 + dispatch

```ts
const VALID_SUBCOMMANDS = ["add","get","query","update","delete","purge","implemented",
  "approve","deprecate","restore","reopen","validate","graph","render","info","migrate"] as const; // 16
export async function runSpecs(input: SpecInput): Promise<RunEnvelope<unknown>>;
export const specsToolDef: ToolDef<SpecInput, unknown>;
```
runSpecs: destructure all optional fields → no subcommand ⇒ `ok(specsHelpContent)` → unknown ⇒ `err("unknown_command: … | valid: …", true)` → central `data` parse once (string→JSON, fail ⇒ `err("invalid_data …", true)`) → **batch normalize**: single object|array → `T[]`; `>SPECS_MAX_BATCH_SIZE` ⇒ `err(aggregate("size_limit_exceeded",…))` before processing → `switch` per-case minimal required-arg checks (`specs_file` required for all; ids/data per op) → delegate to `cmd*`. Internal exceptions wrapped `internal_error: <msg>`. Errors that are usage-shaped pass `include_help:true`.
Batch normalization helper: `normalizeBatch(x): unknown[]` (undefined→[], object→[x], array→x).

MCP `inputSchema` mirrors plan: `subcommand` as plain string (valid list in description, no enum constraint). Fields enumerated: `specs_file, data, ids, query, force, format, additional_paths, implementation, implementation_notes, actor, sources, include_removed, subcommand`.

---

## 9. CommandInput extension (`registry/types.ts`) — additive // mirrors plan

```ts
// specs command fields (FR-SPECS-*)
specs_file?: string;                 // FR-SPECS-0071
ids?: string[];                      // get/delete/purge/approve/deprecate/restore/reopen  (0011,0014,0016..0020)
query?: string;                      // query/validate/render scope (0012)
force?: boolean;                     // purge (0016, FR-ARCH-0015) — first --force in codebase
format?: string;                     // render markdown|text (0023)
additional_paths?: string[];         // graph cross-doc (0022)
implementation?: string;             // implemented (0015)
implementation_notes?: string;       // implemented (0015)
actor?: string;                      // explicit actor override (0041)
sources?: string[];                  // migrate source md paths (0025)
include_removed?: boolean;           // read scoping (0011/0012)
```
`data` reused for JSON batch payloads (add items / update patches / implemented items). `target_id` NOT reused — specs uses `ids[]`.

---

## 10. Subcommand contracts

Signature convention: `cmd<Name>(specsFile, …args, actor?) → Promise<RunEnvelope<ResultType>>`. Read ops via `readDocWithRetry`; write ops via `applyBatchWrite`.

### CRUD
```ts
// FR-SPECS-0010 — allowCreate=true; per item: require id(→missing_id), stripGuarded, apply defaults
//   (status=Draft, implementation=NotStarted, approved_by="", rationale/notes/…="", depends_on/related=[]),
//   validateKnownFields/validateRequired/validateType/validateIdFormat; append. AREA self-registration:
//   inside build, call autoRegisterAreas(doc, itemIds) BEFORE validateAreaRegistration so an item whose
//   AREA is new to a fresh/existing document is registered (default name = code) rather than rejected
//   unknown_area (FR-SPECS-0004 "unless the same call registers it"). Mirrors migrate (FR-SPECS-0025).
//   update NEVER registers areas (it introduces no new ids); only add + migrate do.
export function cmdAdd(specsFile: string, items: unknown[], actor?: string): Promise<RunEnvelope<SpecWriteResult>>;

// FR-SPECS-0011 — read; returns found (incl. Removed) + missing; never errors on missing id.
export function cmdGet(specsFile: string, ids: string[]): Promise<RunEnvelope<SpecGetResult>>;

// FR-SPECS-0012 — read via query-filter; excludes Removed unless include_removed/status:Removed.
export function cmdQuery(specsFile: string, query?: string, includeRemoved?: boolean): Promise<RunEnvelope<SpecQueryResult>>;

// FR-SPECS-0013 — merge-patch batch; per patch: require existing id(→target_not_found), validateImmutableId,
//   stripGuarded, mergePatch(RFC7396); auto-transition: normative edit (statement|acceptance) on Approved ⇒ status=Modified + approved_by=""; on Implemented ⇒ implementation=ToBeModified.
export function cmdUpdate(specsFile: string, patches: unknown[], actor?: string): Promise<RunEnvelope<SpecWriteResult>>;

// FR-SPECS-0014 — soft-delete: status=Removed, idempotent, missing→list; retains unit.
export function cmdDelete(specsFile: string, ids: string[], actor?: string): Promise<RunEnvelope<SpecDeleteResult>>;

// FR-SPECS-0015 — set implementation enum (+optional notes); never touches status; missing→target_not_found.
export function cmdImplemented(specsFile: string, items: unknown[], actor?: string): Promise<RunEnvelope<SpecImplementedResult>>;
```

### Lifecycle
```ts
// FR-SPECS-0016 — purge; needs force(→force_required); referenced-by-others guard unless referrer also in batch(→referenced_by_others, aggregated string); missing→list. NOT via applyBatchWrite stamp path when it hard-removes — still routes write through applyBatchWrite build (removes units, affected=[] so nothing stamped).
export function cmdPurge(specsFile: string, ids: string[], force: boolean, actor?: string): Promise<RunEnvelope<SpecPurgeResult>>;

// FR-SPECS-0017 — resolve ids→Spec[], run validate.ts runValidation(doc, targets); any error-severity ⇒ refuse whole batch (validation_failed, aggregated);
//   Draft|Modified→Approved (+approved_by=actor); Approved→Approved idempotent; Removed|Deprecated→invalid_transition; missing→target_not_found.
export function cmdApprove(specsFile: string, ids: string[], actor?: string): Promise<RunEnvelope<SpecLifecycleResult>>;

// FR-SPECS-0018 — Draft|Modified|Approved→Deprecated; Deprecated idempotent; Removed→invalid_transition.
export function cmdDeprecate(specsFile: string, ids: string[], actor?: string): Promise<RunEnvelope<SpecLifecycleResult>>;
// FR-SPECS-0019 — Removed→Draft; else invalid_transition.
export function cmdRestore(specsFile: string, ids: string[], actor?: string): Promise<RunEnvelope<SpecLifecycleResult>>;
// FR-SPECS-0020 — Approved→Draft (+approved_by=""); else invalid_transition.
export function cmdReopen(specsFile: string, ids: string[], actor?: string): Promise<RunEnvelope<SpecLifecycleResult>>;
```

### Analysis (read-only)
```ts
// FR-SPECS-0021 — orchestrate structural (core.ts) + phrasing (rubric.ts) checks; optional query scope.
// validate.ts ALSO exports the shared analysis function that approve reuses (no query grammar involved):
//   export function runValidation(doc: SpecsDocument, targets: Spec[]): SpecFinding[];
// cmdValidate selects targets via query-filter then calls runValidation; cmdApprove calls runValidation
// with its explicit id-resolved Spec[] as targets (the query grammar has no `id` key, so approve bypasses it).
export function cmdValidate(specsFile: string, query?: string): Promise<RunEnvelope<SpecValidateResult>>;
// FR-SPECS-0022 — graph.ts closures + cycles + cross-doc.
export function cmdGraph(specsFile: string, targetId?: string, additionalPaths?: string[]): Promise<RunEnvelope<SpecGraphResult>>;
// FR-SPECS-0023 — render.ts; string only, no file write; optional query scope; format default markdown.
export function cmdRender(specsFile: string, query?: string, format?: string): Promise<RunEnvelope<SpecRenderResult>>;
// FR-SPECS-0024 — totals + next_ids + local-time; no full bodies.
export function cmdInfo(specsFile: string): Promise<RunEnvelope<SpecInfoResult>>;
// FR-SPECS-0025 — migrate.ts orchestrates req-parser→map→applyBatchWrite(allowCreate); report-don't-drop.
export function cmdMigrate(sources: string[], specsFile: string, actor?: string): Promise<RunEnvelope<SpecMigrateResult>>;
```

---

## 11. Net-new pure modules

### 11.1 `query-filter.ts` // FR-SPECS-0012
```ts
export type FilterTerm =
  | { kind: "field"; key: FilterKey; values: string[]; negate: boolean; quoted: boolean }
  | { kind: "free"; value: string; negate: boolean };
export interface Filter { terms: FilterTerm[]; includeRemoved: boolean; }
export function parseQuery(q: string | undefined): Filter | { error: string };  // "invalid_filter" | "invalid_query"
export function applyFilter(specs: Spec[], filter: Filter): Spec[];
export const FILTER_KEYS = ["type","area","status","priority","implementation","verification","source",
  "depends_on","related","title","statement"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
```
**Grammar (implementable/testable):**
```
query      := WS? term (WS term)* WS? | ε
term       := ["-"] (field | bare)
field      := key ":" valuelist
key        := IDENT                       ; unknown key (not in FILTER_KEYS ∪ {"include_removed"}) → invalid_filter
valuelist  := value ("," value)*          ; comma = OR within field
value      := quoted | unquoted
quoted     := '"' <any except unescaped "> '"'   ; literal (case-sensitive exact); unterminated quote → invalid_query
unquoted   := <chars except WS, ",">      ; empty value (e.g. "type:") or empty comma slot → invalid_query
bare       := unquoted                    ; free-text, case-insensitive substring over title+statement
```
Colon constraint (FR-SPECS-0012): any unquoted token containing a `:` is parsed as `key:value`. If the text before the first `:` is not a recognized key (FILTER_KEYS ∪ {"include_removed"}) → `invalid_filter`. A free-text term that legitimately contains a colon MUST be quoted (`"http://x"`); an unquoted colon-bearing token is never treated as free text.
Semantics: terms AND-combine; within a field values OR; `-` negates the term; `include_removed:true` pseudo-key sets `Filter.includeRemoved` (any other value → invalid_query); `area` matches `parseId(id).area`; `depends_on:X`/`related:X` match specs whose list contains X; unquoted field value = case-insensitive substring for title/statement, exact for enums/area/ids. Removed excluded unless `includeRemoved` OR a term explicitly matches `status:Removed`. Reserved future term `semantic:` left unclaimed (0026 deferred). Empty query → all (subject to Removed exclusion).

### 11.2 `rubric.ts` (pure phrasing matchers) // FR-SPECS-0006,0021
```ts
export function checkEars(statement: string): boolean;      // matches exactly one of the 5 EARS patterns below
export function checkMeasurableNfr(statement: string): boolean; // number+unit/threshold + condition heuristic
export function checkModalVerbs(statement: string): boolean;    // uses shall/should/may appropriately
export function findDuplicateStatements(specs: Spec[]): Array<{ ids: string[]; statement: string }>;
export function checkAcceptanceComplete(spec: Spec): boolean;   // ≥1 criterion, each given/when/then non-empty
```
EARS patterns (case-insensitive, anchored, `shall` present). **Ordered matching** — test the four keyword-led patterns FIRST; ubiquitous is the fallback only when none of them match, so "When X, Y shall Z" is classified event (not ubiquitous). `checkEars` returns true iff the statement matches exactly one pattern under this order:
1. event `^\s*When\b.+,\s*.+\bshall\b.+$`
2. state `^\s*While\b.+,\s*.+\bshall\b.+$`
3. optional `^\s*Where\b.+,\s*.+\bshall\b.+$`
4. unwanted `^\s*If\b.+,\s*.+\bshall\b.+$`
5. ubiquitous (fallback) `^\s*(?!(When|While|Where|If)\b).+\bshall\b.+$` — the negative lookahead prevents it from swallowing the keyword-led forms
Measurable-NFR heuristic: statement contains a digit-bearing quantity (regex `\d`) with a unit/threshold token (`ms|s|%|MB|rps|requests|within|per|≤|<=|>=|at least|no more than`) AND a measurement condition clause. Advisory (warning) only.

### 11.3 `graph.ts` // FR-SPECS-0022
```ts
export interface ResolvedGraph { specsById: Map<string,Spec>; depends: Map<string,string[]>; related: Map<string,string[]>; }
export function buildGraph(docs: SpecsDocument[]): ResolvedGraph;                 // union of all provided docs
export function closure(map: Map<string,string[]>, start: string): string[];      // transitive fwd closure (excludes start)
export function reverseClosure(map: Map<string,string[]>, start: string): string[]; // impact set
export function enumerateCycles(depends: Map<string,string[]>): SpecEdge[][];      // all depends_on cycles as edge lists
export function edgeList(depends: Map<string,string[]>, related: Map<string,string[]>): SpecEdge[];
export function unresolvedRefs(g: ResolvedGraph): string[];                        // referenced ids absent from union
```
Target mode → `{dependencies, dependents, related, cycles:[], unresolved}`; whole-doc mode → `{edges, cycles, unresolved}`. Missing target id → `target_not_found`. Cross-doc read-only (single-doc writes stay acyclic per 0005).

### 11.4 `req-parser.ts` (tolerant scanner, NO dependency, Decision 4) // FR-SPECS-0025
```ts
export interface RawReq { attrs: Record<string,string>; tags: Record<string,string>; sourceLine: number; }
export function scanReqBlocks(md: string): RawReq[];                 // finds <req …>…</req>, bodies opaque
export function extractAttrs(openTag: string): Record<string,string>;
export function splitGwt(criteria: string): AcceptanceCriterion[] | { verbatim: string }; // Given:/When:/Then: markers
export function normalizeImplementation(tags: Record<string,string>): { implementation: ImplEnum; implementation_notes: string };
  // handles split-tag (<implementation>+<implementationNotes>) AND legacy "[Status: X] [Additional Notes: Y]"
export function mapToSpec(raw: RawReq): { spec: Partial<Spec>; warnings: SpecFinding[] };
```
Tolerant: opaque tag bodies (code fences, literal `<PREFIX>-<AREA>`, unescaped `&` allowed); unsplittable criterion → preserved in `then` + warning; file with zero parseable `<req>` at file level → `migrate_parse_error`; missing source path → `source_not_found`. Report-don't-drop.

### 11.5 `render.ts` // FR-SPECS-0023,0042
```ts
export function renderSpecs(doc: SpecsDocument, specs: Spec[], format: "markdown"|"text"): string;
```
Group by area (via `parseId`); per spec emit id, title, statement, priority, status, acceptance, depends_on, related; timestamps via `formatLocal`. `format` other than markdown|text → `invalid_format` (checked in cmdRender before render). No file write.

---

## 12. Status transition table // FR-SPECS-0013,0017,0018,0019,0020,0014

| Op | From → To | Idempotent | Invalid-from ⇒ `invalid_transition` | Side effect |
|---|---|---|---|---|
| add | (∅) → Draft | — | — | approved_by="", implementation=NotStarted |
| update (normative edit) | Approved → Modified | — | — | approved_by=""; if impl=Implemented ⇒ impl=ToBeModified |
| update (cosmetic / Draft / Modified) | (unchanged) | — | — | none |
| approve | Draft→Approved, Modified→Approved | Approved→Approved | Removed, Deprecated | approved_by=actor; pre-gate validate (error findings ⇒ validation_failed) |
| deprecate | Draft→Deprecated, Modified→Deprecated, Approved→Deprecated | Deprecated→Deprecated | Removed | — |
| restore | Removed→Draft | — | Draft, Approved, Modified, Deprecated | — |
| reopen | Approved→Draft | — | Draft, Modified, Deprecated, Removed | approved_by="" |
| delete | any→Removed | Removed→Removed | — (never invalid) | — |
| purge | unit removed entirely | absent→missing[] | — | force + reference guard |

Footnote (update on non-Approved): a content edit to a Draft, Modified, Deprecated, or Removed spec changes its fields but leaves `status` unaffected — **only** an Approved spec's normative edit (statement/acceptance) triggers the Approved→Modified transition. update never blocks on status.

Implementation enum moves **only** via `implemented` (any→any of IMPLS) or the auto `Implemented→ToBeModified` on normative update. `implemented` never touches `status`; status ops never touch `implementation`. // FR-SPECS-0040

---

## 13. Error catalog & aggregation // FR-SPECS-0043 support, 0030

`errors.ts` — string consts + message **templates that never interpolate Rosetta ids** (may interpolate caller ids). Codes:
```
specs_not_found, specs_file_corrupted, invalid_data, missing_data,
missing_id, duplicate_id, invalid_id_format, unknown_area, invalid_type,
invalid_spec_field, missing_required_field, unknown_dependency, dependency_cycle,
size_limit_exceeded, immutable_id, target_not_found,
invalid_implementation, missing_implementation,
invalid_transition, validation_failed, force_required, referenced_by_others,
invalid_filter, invalid_query, invalid_format,
source_not_found, migrate_parse_error, backup_create_failed (shared)
```
**Aggregated error string** (Decision 6) — `aggregate.ts`:
```ts
export interface RejectRef { ref: string; reason: string; }   // ref = spec id, or `index N` when no id
export function aggregate(code: string, rejects: RejectRef[]): string;
// format: `<code>: <n> item(s) rejected | [<ref>] <reason>; [<ref>] <reason>; …`
```
Same builder for batch all-or-nothing (0030), approve validation gate (validation_failed, 0017), purge multi-field failures (referenced_by_others, 0016). Emitted into envelope `error: string` (no schema change).

---

## 14. CLI data-driven table (`cli.ts`) // FR-CLI-0001, FR-ARCH-0015

```ts
interface SpecsSubRow {
  name: string;                                   // subcommand
  positionals: Array<{ name: string; required: boolean; desc: string }>;
  flags?: Array<{ flag: string; desc: string }>;  // e.g. "--force", "--format <fmt>", "--additional-paths <paths>", "--include-removed"
  buildInput: (specsFile: string, rest: string[], opts: Record<string,unknown>) => SpecInput; // → {subcommand, specs_file, …}
}
function registerSpecsSub(parent: Command, row: SpecsSubRow): void; // uniform action: build→dispatch(specsToolDef)→writeResult→exit
```
Uniform action body identical to plan's 4-step (build input → `dispatch` → `writeResult` → `process.exit(ok?0:1)`). `specsCmd` root block duplicates plan's `--help` / no-subcommand / unknown-subcommand fallthrough. `writeResult` reused as-is.

**16 rows** (positionals `<req>` `[opt]`; JSON args are inline strings parsed centrally):

| name | positionals | flags | buildInput → fields (beyond subcommand, specs_file) |
|---|---|---|---|
| add | `<specs_file> <data>` | — | data |
| get | `<specs_file> <ids...>` | — | ids (variadic) |
| query | `<specs_file> [query]` | `--include-removed` | query, include_removed |
| update | `<specs_file> <data>` | — | data |
| delete | `<specs_file> <ids...>` | — | ids |
| purge | `<specs_file> <ids...>` | `--force` | ids, force |
| implemented | `<specs_file> <data>` | — | data |
| approve | `<specs_file> <ids...>` | — | ids |
| deprecate | `<specs_file> <ids...>` | — | ids |
| restore | `<specs_file> <ids...>` | — | ids |
| reopen | `<specs_file> <ids...>` | — | ids |
| validate | `<specs_file> [query]` | — | query |
| graph | `<specs_file> [target_id]` | `--additional-paths <paths>` | ids:[target_id] (batch-of-one), additional_paths (comma-split) |
| render | `<specs_file> [query]` | `--format <fmt>` | query, format |
| info | `<specs_file>` | — | — |
| migrate | `<specs_file> <sources...>` | — | sources (variadic) |

Note: `graph` target is carried as `ids[0]` (batch-of-one, uniform with every other subcommand — no dedicated `target_id` field); `cmdGraph` reads `ids?.[0]`. Same wiring on CLI and MCP. `data`-bearing rows (add/update/implemented) accept batch object-or-array JSON string; parsed once in index.ts.

---

## 15. help-content.ts // FR-SPECS-0060,0061,0043
`specsHelpContent` shape mirrors `planHelpContent` (HelpCommandDetail + extensions): `name, brief, description, specs_file, concepts (spec unit+fields; areas/area-scoped ids; full status lifecycle + every transition & performing op; depends_on vs related; guarded fields & why add/update strip; validate-then-approve flow), subcommands[16] (each name/brief/usage/args/required[conditional]/description/examples{tip,real}), schemas: specsSchemasDict, limits (0007 constants), query_notation (0012 grammar), notes: specsNotes, next_steps_for_ai`. `specsNotes[]` = the 12 behaviors enumerated in FR-SPECS-0061 verbatim-in-meaning. **Leakage-clean by construction** — no `FR-*`/ticket/path/module-name/rationale in any authored string.

---

## 16. Testing strategy (contracts; test authoring is a later coding-flow phase)
Per-module verification tied to FR acceptance criteria (see PLAN traceability matrix). Coverage targets ≥90% (frontends via e2e only).
- **core**: id-format (valid/`FR-SPECS-8`/8-digit); duplicate_id; unknown_dependency; depends cycle + self-dep; related-cycle allowed; size limits (1001 specs, 257-char title, 501 batch); stripGuarded drops 4 keys. // 0004,0005,0007,0040
- **add area self-registration**: first `add` to a fresh doc (areas:[]) with id `FR-CLI-0001` ⇒ succeeds AND doc.areas gains `{code:"CLI",name:"CLI"}` (NOT unknown_area); add with an already-registered area leaves areas unchanged; `unknown_area` only surfaces where it cannot occur for add (reserved for a future non-registering path). // 0004
- **query-filter**: AND/OR/NOT/quoted/free; area/depends_on/related keys; include_removed; invalid_filter (unknown key); invalid_query (unterminated quote, empty value). // 0012
- **rubric**: each EARS pattern pass + a non-conformant fail; measurable NFR pass/fail; empty acceptance. // 0006,0021
- **graph**: dependencies/dependents; whole-doc cycle enumeration; cross-doc resolve + unresolved. // 0022
- **req-parser**: split-tag ×3; legacy bracketed impl; GWT split vs verbatim+warning; code-fence/angle-bracket/multiline bodies; source_not_found; migrate_parse_error. // 0025
- **write/aggregate**: all-or-nothing (3-item, 2 invalid → nothing written, both named); approve validation_failed aggregation; referenced_by_others. // 0030,0017,0016
- **actor**: ROSETTA_ACTOR → git email → OS user → "unknown"; never throws. // 0041
- **doc-io regression**: plan suite green before+after generalization; specs corrupted→specs_file_corrupted, missing→specs_not_found. // 0070,0071
- **leakage** (Inspection): scan assembled `specsHelpContent`, static schema `description` strings, and error templates ONLY for: the full-id pattern `\b(FR|NFR|INT|DATA)-[A-Z0-9]+-\d{4}\b` (real ids — `FR-\d` alone never matches a real id, do not use it), `CTORNDGAIN-\d+` ticket ids, and internal source-path/module-name substrings. MUST NOT scan `result` payloads or aggregated error strings (caller data passes through verbatim). // 0043
- **e2e** (built dist): each of 16 subcommands one happy path + `help specs`; `--force` gating.

---

## 17. Assumptions & Dependencies
- Assumes `architecture-notes.md` decisions are final (not reopened).
- No new runtime dep; ESM `.js` import extensions throughout.
- `graph` target is `ids[0]` (batch-of-one), same on CLI and MCP; no dedicated target field.
- `related` explicitly excluded from cycle detection.
- FR-SPECS-0026 deferred; `semantic:` term reserved, not implemented.

## 18. Files affected — see `architecture-notes.md §A` (touched/new/untouched). No duplication here.

</CRITICAL>
