# Discovery Notes — `specs` command (mirrors `plan`)

Scope: read-only discovery of `src/rosettify` to produce a file-level implementation blueprint for a new `specs` command that mirrors the existing `plan` command. Requirements source: `docs/REQUIREMENTS/rosettify/SPECS.md` (FR-SPECS-0001…0071), cross-referenced with `ARCH.md` (FR-ARCH-0001…0016) and `HELP.md` (FR-HELP-0002 recursive naming rule).

All paths below are relative to repo root `/Users/isolomatov/Sources/GAIN/rosetta` unless given absolute.

---

## 1. BUILD & TOOLCHAIN

- Package: `src/rosettify/package.json` — name `rosettify`, version `3.0.0`, `"type": "module"` (ESM only), bin `./dist/bin/rosettify.js`, `engines.node >=22.0.0`.
- Scripts (run from `src/rosettify/`):
  - `npm run build` → `tsc -p tsconfig.build.json` (emits to `dist/`)
  - `npm run typecheck` → `tsc --noEmit` (uses `tsconfig.json`, includes tests)
  - `npm run test` → `vitest run`
  - `npm run test:watch` / `npm run test:coverage` (v8 coverage, thresholds `lines: 90, branches: 90` — see `vitest.config.ts`)
  - No separate lint script in this package (no eslint config found under `src/rosettify`).
- TypeScript: devDependency `typescript ^6.0.0`. `tsconfig.json`: `target: ES2024`, `module: NodeNext`, `moduleResolution: NodeNext`, `strict: true`, `esModuleInterop: true`, `declaration/declarationMap/sourceMap: true`, `outDir: ./dist`, `rootDir: ./src`. `tsconfig.build.json` extends it and excludes `node_modules`, `dist`, `tests`, `**/*.test.ts` (test files are NOT type-checked by build, only by `typecheck`/tests config which includes them via base `tsconfig.json`'s `include: ["src/**/*.ts"]` plus vitest's own compilation — tests import compiled types directly).
- Module system: ESM everywhere; every internal import uses explicit `.js` extension (NodeNext resolution), e.g. `import { ok, err } from "../../shared/envelope.js";` — this convention must be followed for all new specs files even though the source is `.ts`.
- Runtime deps: `@modelcontextprotocol/sdk ^1.29.0`, `commander ^14.0.3`, `pino ^10.3.1`. No JSON-schema validator library (dispatch does structural checks itself — see §2/§3). No XML parser dependency currently present — `specs migrate` (FR-SPECS-0025) needs to parse `<req>...</req>` XML blocks out of markdown; there is no existing dependency for this, so either a minimal hand-rolled regex/tag extractor (matching the plan command's "no external validator, keep deps minimal" philosophy, NFR-STAB-0002 referenced in `dispatch.ts`) or a new lightweight XML parser dependency must be decided in architecture.
- Repo-root test/typecheck orchestration: `src/run-tests.sh` and `src/validate-types.sh` iterate over TS packages (`curiocity`, `hooks`, `rosettify`, `rosettify-plugins`, `rosettify-prompts`) via `npm --prefix <dir> run <script>`. Notably `test_ts src/rosettify build` — **the rosettify test target rebuilds (`npm run build`) before running tests**, confirming e2e tests depend on a fresh `dist/`. Root scripts:
  ```
  test_ts src/rosettify          build
  ...
  typecheck_ts src/rosettify          typecheck
  ```
  So the correct standalone command sequence for validating a change to rosettify is:
  ```
  npm --prefix src/rosettify run build
  npm --prefix src/rosettify run test
  npm --prefix src/rosettify run typecheck
  ```
- e2e tests (`tests/e2e/cli.e2e.test.ts`, `tests/e2e/mcp.e2e.test.ts`) spawn the **built** binary: `BIN = path.join(REPO_ROOT, "dist/bin/rosettify.js")`, and `beforeAll` throws if the binary is missing, with the message `Binary not found: ... Run 'npm run build --prefix rosettify' first.` — confirms MEMORY note: e2e uses built dist, must rebuild before running e2e for any specs change to take effect.
- Coverage config excludes `src/bin/**` and `src/frontends/**` from v8 coverage (they're only exercised via e2e subprocess spawns which v8 can't instrument) — this applies identically to any new specs wiring inside `cli.ts`/`mcp.ts`; coverage of that wiring must come from e2e tests, not unit tests.

---

## 2. REGISTRY & FRONTEND WIRING

### ToolDef shape (`src/rosettify/src/registry/types.ts`)

```ts
export interface ToolDef<TInput extends CommandInput = CommandInput, TResult = unknown> {
  name: string;
  brief: string;
  description: string;
  inputSchema: Record<string, unknown>;   // JSON Schema object
  outputSchema: Record<string, unknown>;  // JSON Schema object
  cli: boolean;   // FR-ARCH-0005
  mcp: boolean;   // FR-ARCH-0005
  run: RunDelegate<TInput, TResult>;   // FR-ARCH-0004
  helpContent?: Record<string, unknown>;  // FR-HELP-0002
}
```
`RunDelegate<TInput, TResult> = (input: TInput) => Promise<RunEnvelope<TResult>>`, and `RunEnvelope<T> = { ok, result, error, include_help }`.

`CommandInput` (same file) is the **single shared input vocabulary** for all commands — it already carries plan-specific optional fields (`plan_file`, `target_id`, `new_status`, `kind`, `phase_id`, `"plan-name"`, etc.) alongside the generic `subcommand`, `data`, `limit`. **A new specs command needs its own fields added to this same interface** (e.g. `specs_file`, `query`, `ids: string[]`, `force`, `format`, `additional_paths`, `implementation`, `implementation_notes`, `actor`) since `CommandInput` is the base type every `ToolDef` input extends — there is no separate per-command input-base mechanism; plan just added its fields directly onto the shared interface with FR-comment provenance. Expect the same additive pattern for specs.

### Registration steps (exact code sites)

1. **`src/rosettify/src/registry/index.ts`** — add import and map entry:
   ```ts
   import { planToolDef } from "../commands/plan/index.js";
   import { helpToolDef } from "../commands/help/index.js";
   export const registry: ReadonlyMap<string, ToolDef> = new Map<string, ToolDef>([
     [planToolDef.name, planToolDef as ToolDef],
     [helpToolDef.name, helpToolDef as ToolDef],
   ]);
   ```
   Add `import { specsToolDef } from "../commands/specs/index.js";` and a third map entry `[specsToolDef.name, specsToolDef as ToolDef]`. `getCliTools()`/`getMcpTools()` filter on `.cli`/`.mcp` booleans automatically — no other registry change needed.

2. **`src/rosettify/src/frontends/mcp.ts`** — **fully automatic**. `runMcp()` builds `tools/list` from `getMcpTools()` (maps `name`/`description`/`inputSchema`) and dispatches `tools/call` generically via `getToolDef(name)` + `dispatch(toolDef, request.params.arguments ?? {})`. **No per-subcommand MCP code is needed** — the MCP surface is a single `specs` tool whose `inputSchema` enumerates `subcommand` as a string (with description listing valid subcommands, mirroring `planToolDef.inputSchema.properties.subcommand`), and every specs subcommand comes in through the same `arguments` object keyed by whatever fields `CommandInput` was extended with.

3. **`src/rosettify/src/frontends/cli.ts`** — this is the **only place with real per-subcommand wiring burden**. It is hand-built with `commander`, one `.command(...)` block per plan subcommand. Exact pattern to copy for a simple subcommand (verbatim, `create`):
   ```ts
   const planCmd = program
     .command("plan")
     .description("Manage execution plans")
     .helpOption(false)
     .allowExcessArguments(true)
     .option("--help", "Show plan help");

   planCmd
     .command("create")
     .description("Create a new plan")
     .argument("<plan_file>", "Path to plan file")
     .argument("<data>", "Plan JSON data")
     .action(async (planFile: string, data: string) => {
       const input: PlanInput = { subcommand: "create", plan_file: planFile, data };
       const envelope = await dispatch(planToolDef, input);
       writeResult(planToolDef.name, envelope);
       process.exit(envelope.ok ? 0 : 1);
     });
   ```
   Every subcommand action: (a) builds an `Input` object with `subcommand` plus positional/flag values, (b) calls `dispatch(toolDef, input)`, (c) calls the shared `writeResult(toolName, envelope)` helper (dense JSON stdout via `JSON.stringify(output.payload)`, logs failures), (d) `process.exit(envelope.ok ? 0 : 1)`. This exact 4-step shape must be repeated once per specs subcommand (16 of them per SPECS.md — see §5), each with its own `.argument(...)`/`.option(...)` calls matching that subcommand's positional/flag conventions.
   - **Flags**: `--kind`, `--phase_id`, `--target` are wired via `.option("--kind <kind>", "...")` and read off the commander `opts` object in the action callback, e.g. `upsert`'s `.option("--kind <kind>", ...).option("--phase_id <phase_id>", ...)` then `action(async (planFile, targetId, data, opts: { kind?: string; phase_id?: string }) => {...})`. **`--force`, required by FR-ARCH-0015 for `specs purge`, does not exist anywhere yet in this codebase** (`grep -rn "force" src/rosettify/src` finds zero matches outside a comment) — this is genuinely new: add `.option("--force", "...")` to the `purge` subcommand definition and thread a `force: boolean` field through `CommandInput`.
   - **JSON-string positional args**: passed as an inline literal argument string (never a file path), e.g. `plan create <plan_file> '<json>'` — the commander `.argument("<data>", "Plan JSON data")` captures the raw string, forwarded untouched into `PlanInput.data`; actual `JSON.parse` happens once, centrally, in `commands/plan/index.ts::runPlan` (see §4). Same pattern should carry to specs: CLI positional strings for `add`/`update` item payloads, parsed centrally in `commands/specs/index.ts`.
   - Root plan block also handles: `--help` (dispatches `help` tool with `subcommand: "plan"`), no-subcommand (`dispatch(planToolDef, {})` → returns help content via `runPlan`'s own `if (!subcommand) return ok(planHelpContent)`), and unknown-subcommand fallthrough (`allowExcessArguments(true)` + `planCmd.action(...)` catches stray args and forwards `cmd.args[0]` as `subcommand` so the *tool's own* validation returns the structured `unknown_command` error rather than commander's default). This entire block (lines ~237–255 and ~275–287 of `cli.ts`) must be duplicated for `specsCmd` with its own help/no-args/unknown-subcommand handling.
   - `writeResult` is generic (`toolName: string, envelope: EnrichedEnvelope<unknown>`) — reusable as-is for specs, no changes needed.

### MCP vs CLI split of labor
- MCP: zero specs-specific code beyond the registry entry — fully generic dispatch.
- CLI: one `.command(...)` chain per subcommand (~10–25 lines each × 16 subcommands ≈ 250–400 new lines in `cli.ts`), following the exact 4-step action pattern above.

---

## 3. SHARED MODULES

Enumerated (`src/rosettify/src/shared/*.ts`):

| File | LOC | Plan-specific? | Reuse for specs? |
|---|---|---|---|
| `dispatch.ts` | 112 | No — generic `validateInput` (structural JSON-Schema check) + `dispatch<TInput,TResult>(tool, input)` calling `tool.run`, catching throws, enriching with help. Fully generic over any `ToolDef`. | **Reuse as-is.** No changes needed; specs's `dispatch(specsToolDef, input)` works identically to plan's. |
| `envelope.ts` | 38 | No — `ok`, `err`, `usageErr`, `extractOutput`, `logFailure` are all envelope-shape generic. | **Reuse as-is.** |
| `logger.ts` | 15 | No — pino logger writing to a file only (`ROSETTIFY_LOG`/`ROSETTIFY_LOG_LEVEL` env vars), never stdout/stderr. | **Reuse as-is.** |
| `version.ts` | 10 | No — reads `package.json` version relative to compiled/`src` layout. | **Reuse as-is.** |
| `constants.ts` | 17 | **Yes, plan-typed by name.** Every constant is prefixed `PLAN_*` (`PLAN_MAX_PHASES`, `PLAN_MAX_STEPS_PER_PHASE`, `PLAN_MAX_DEPENDENCIES_PER_ITEM`, `PLAN_MAX_STRING_LENGTH`, `PLAN_MAX_NAME_LENGTH`, `PLAN_BACKUP_RETENTION`, `PLAN_BACKUP_MAX_RETRIES`, `PLAN_READ_RETRY_DELAY_MS`, `PLAN_READ_MAX_RETRIES`) plus one generic `MAX_CONCURRENCY_RETRIES`. FR-SPECS-0007 needs its own distinct numeric set (max 1000 specs/doc, max 50 deps/spec, max 50 acceptance criteria/spec, max 20000 chars/string, max 256 chars/name, max 500 items/batch) which do **not** match plan's numbers. | **Needs new constants, not a rename.** Cleanest: add `SPECS_MAX_SPECS`, `SPECS_MAX_DEPENDENCIES_PER_SPEC`, `SPECS_MAX_ACCEPTANCE_PER_SPEC`, `SPECS_MAX_STRING_LENGTH`, `SPECS_MAX_NAME_LENGTH`, `SPECS_MAX_BATCH_SIZE` alongside the existing `PLAN_*` ones in the same `constants.ts` (it's already the shared cross-command constants file — FR-PLAN-0005 comment at top says "authoritative values from rosetta_mcp/constants.py", so specs' constants belong here too, just newly named). The generic `PLAN_BACKUP_RETENTION`/`PLAN_BACKUP_MAX_RETRIES`/`PLAN_READ_RETRY_DELAY_MS`/`PLAN_READ_MAX_RETRIES` ARE reusable verbatim by name-generic call sites (see `plan-io.ts` below) but are still literally named `PLAN_*` — FR-SPECS-0070/0071 explicitly say specs reuses "the same behavior the plan command uses... via the shared file-I/O module" with the *same* defaults (retention 5, retry 100ms/50 attempts) — so either reuse the `PLAN_*` constants directly (works today, `plan-io.ts` already takes them as defaults, not hardcoded) or rename to generic names (`BACKUP_RETENTION`, `BACKUP_MAX_RETRIES`, `READ_RETRY_DELAY_MS`, `READ_MAX_RETRIES`) if the team wants naming hygiene — functionally either works since the values are identical and shared. |
| `plan-io.ts` | 256 | **Yes — plan-typed via generic constraints, not plan-only logic.** `readPlanWithRetry<Plan extends { previous_version?: string | null }>(filePath)` and `atomicWriteWithBackup<Plan extends { previous_version?: string | null; updated_at: string }, T>(filePath, mutate, savePlan, options?)` are both **already generic over any document type matching those two structural constraints** — nothing plan-specific in the function bodies (lock file `.lock` dir, `.bakNNN` naming, `nextBackupPath`, `pruneBackups` are all filesystem-generic). The **only** plan-coupling is: (a) the file name `plan-io.ts` and its doc comments say "plan file"/"FR-PLAN-0024"; (b) it imports `ERR_PLAN_FILE_CORRUPTED, ERR_BACKUP_CREATE_FAILED` from `../commands/plan/errors.js` — a plan-command import from a shared module, which is backwards (shared should not depend on a specific command). | **Two viable generalizations, pick one in architecture:** (1) **Rename+degeneralize**: rename to `shared/atomic-file-io.ts` (or similar), move the two error constants into `shared/constants.ts` or a new `shared/errors.ts` as generic strings (`ERR_FILE_CORRUPTED`, `ERR_BACKUP_CREATE_FAILED` — literal string values `"plan_file_corrupted"`/`"backup_create_failed"` would need to become parameterizable or the specs command would need its own `specs_file_corrupted`/`backup_create_failed` — note FR-SPECS-0002/0071 explicitly want `specs_file_corrupted`, a **different string** than plan's `plan_file_corrupted`), and pass the corrupted-error string as a parameter instead of importing from plan/errors.js. (2) **Leave `plan-io.ts` untouched, add a thin generic module** e.g. `shared/atomic-doc-io.ts` exporting the same two generic functions parameterized by an injected "corrupted" error string, and have `plan-io.ts` become a thin plan-flavored wrapper around it (or leave plan-io.ts as-is and just don't reuse it — write a near-duplicate `specs-io.ts`). **Recommendation for architecture phase**: option (1) is more DRY and matches FR-SPECS-0070's explicit "via the shared file-I/O module" framing — the requirement text assumes generalization has already happened. The corrupted-file error string difference (`plan_file_corrupted` vs `specs_file_corrupted`) is the one real code change needed in the generalized function signature (accept `corruptedErrorCode: string` as a parameter, or let the caller catch-and-remap the generic error before returning it). |
| `concurrency.ts` | 49 | **Legacy / effectively unused.** `atomicWritePlan` (optimistic-concurrency via `updated_at` compare-and-swap) is only referenced by its own test file (`tests/unit/shared/concurrency.test.ts`) — no command file imports it (`grep` for `from "../../shared/concurrency"` inside `commands/plan/*.ts` returns nothing). All plan write subcommands (`create`, `upsert`, `update-status`) explicitly comment "FR-PLAN-0025 — plan writes go through FR-PLAN-0024 (`atomicWriteWithBackup`), NOT the FR-SHRD-0006 optimistic-concurrency function." | **Do not build on this for specs.** It is dead code from the caller's perspective (kept only for its own unit test / possibly a historical FR-SHRD-0006 that was superseded by FR-PLAN-0024's lock-based approach). Specs write path should use the same `atomicWriteWithBackup`-family mechanism as plan, per FR-SPECS-0070's explicit statement that it wants "the same behavior the plan command uses... FR-PLAN-0024". |

---

## 4. PLAN COMMAND STRUCTURE (the template to mirror)

`src/rosettify/src/commands/plan/` file list (LOC via `wc -l`):

| File | LOC | Responsibility |
|---|---|---|
| `core.ts` | 475 | Types (`Status`, `Step`, `Phase`, `Plan`, `PlanInput`, all named result types), RFC-7396 merge helpers (`mergePatch`, `mergeById`), status-propagation functions (`computeStatusFromChildren`, `propagateStatuses`), lookup helpers (`findPhase`, `findStep`, `buildStepStatusMap`, `buildPhaseStatusMap`, `depsSatisfied`), **all validation functions** (`validatePlanName`, `validateNonNegativeLimit`, `validateImmutableId`, `validateUniqueIds`, `detectCycle`, `validateDependencies`, `validateSizeLimits`), and plain file I/O (`loadPlan`, `savePlan` — used only by the first-create path that bypasses `atomicWriteWithBackup`). |
| `index.ts` | 242 | `runPlan(input)` — the single dispatch function: subcommand allowlist check (`VALID_SUBCOMMANDS`), centralized `data` JSON-string parsing (`JSON.parse` once, on the way in), a `switch (subcommand)` that validates required args per-case and delegates to `cmd*` functions in the sibling files, and the exported `planToolDef: ToolDef<PlanInput, unknown>` object (name/brief/description/inputSchema/outputSchema/cli/mcp/run/helpContent). |
| `create.ts` | 97 | `cmdCreate` — first-create write path (bypasses atomic-write-with-backup; `previous_version: null` always), plus `createInputSchema`/`createOutputSchema`. |
| `upsert.ts` | 206 | `cmdUpsert` — merge-patch write path via `atomicWriteWithBackup`; handles entire_plan / existing-phase / existing-step / new-phase / new-step branches; strips status fields (`stripStatusFields`) before any I/O. |
| `update-status.ts` | 86 | `cmdUpdateStatus` — single guarded-field setter (status), via `atomicWriteWithBackup`. |
| `show-status.ts` | 139 | `cmdShowStatus` — read-only aggregate counts (`computeTotals`), via `readPlanWithRetry`. |
| `query.ts` | 70 | `cmdQuery` — read-only full-JSON-by-id lookup, via `readPlanWithRetry`. |
| `next.ts` | 184 | `cmdNext` — read-only priority-ordered actionable-steps query with `Overall*Count` totals, via `readPlanWithRetry`. |
| `create-with-template.ts` | 70 | `cmdCreateWithTemplate` — renders a template then delegates to `cmdCreate`. |
| `upsert-with-template.ts` | 73 | `cmdUpsertWithTemplate` — renders a template then delegates to `cmdUpsert`. |
| `list-templates.ts` | 29 | `cmdListTemplates` — returns the template catalog. |
| `templates/index.ts` | 45 | `createTemplates`/`upsertTemplates` registries (compiled-in, not file-scanned), `buildTemplateCatalog()`. |
| `templates/render.ts` | 131 | `renderTemplate` (strict bidirectional placeholder substitution) + `parsePhaseSteps` (JSON-array parse helper). |
| `templates/create/for-orchestrator.ts` | 44 | One template's content+placeholders. |
| `templates/upsert/for-subagent.ts` | 48 | One template's content+placeholders. |
| `schemas.ts` | 286 | `planSubcommandSchemas` (per-subcommand `{input, output}` dict, imported from each subcommand file's own exported schema consts) + `planSchemasDict` (flat named-type dictionary keyed by exported TypeScript type name, e.g. `Plan`, `Phase`, `Step`, `PlanWriteResult`, `PlanNextResult`, …, used for help output). |
| `output.ts` | 36 | `buildPlanWriteResult(plan, previousVersion)` — the one shared `PlanWriteResult` builder used by all 4 write subcommands (DRY). |
| `errors.ts` | 22 | `ERR_*` string constants for the newer error codes (`ERR_PLAN_FILE_CORRUPTED`, `ERR_BACKUP_CREATE_FAILED`, `ERR_INVALID_TEMPLATE`, `ERR_MISSING_TEMPLATE_PARAM`, `ERR_UNEXPECTED_TEMPLATE_PARAM`, `ERR_INVALID_PHASE_STEPS`); older/simpler codes (`plan_not_found`, `target_not_found`, `missing_kind`, etc.) stay as inline string literals at their call sites — **no single canonical error-code file covers everything**, only the newer/complex ones got a name. |
| `help-content.ts` | 272 | `planNotes: string[]` (behavioral notes) and `planHelpContent` object (`name`, `brief`, `description`, `plan_file` convention, `concepts`, `subagent_fields`, `subcommands[]` each with `name/brief/usage/args/required/description/examples{tip,real}`, `schemas: planSchemasDict`, `limits`, `templates` (getter calling `buildTemplateCatalog()`), `notes: planNotes`, `plan_authoring_guidance`, `next_steps_for_ai`). |

Total plan command code: **3,418 LOC** across `commands/plan/**`, `shared/*`, `frontends/*` combined (see raw `wc -l` in the exploration — plan-only subset is ~2,750 LOC excluding shared/frontends).

### Dispatch pattern (`index.ts`)
1. Destructure every possible field off `input: PlanInput` up front (all fields optional).
2. `if (!subcommand) return ok(planHelpContent);` — no-args → help (FR-PLAN-0022).
3. `if (!VALID_SUBCOMMANDS.includes(subcommand)) return err("unknown_command: ... | valid: ...", true);` — unknown → structured error with `include_help: true` (FR-PLAN-0023).
4. Parse `data` once centrally (`JSON.parse` with try/catch → `invalid_data` on failure), producing `parsedData`.
5. `switch (subcommand)`: each case does its own minimal required-field checks (`if (!plan_file) return err("missing plan_file", true);`) then calls the matching `cmd*` function and returns its result directly.
6. `export const planToolDef: ToolDef<PlanInput, unknown> = {...}` at the bottom — `inputSchema` enumerates every field the frontends can pass (including the kebab-case template placeholder fields), `helpContent: planHelpContent`.

### Validation function signatures (`core.ts`) — to mirror for specs' own analog
```ts
export function validateUniqueIds(plan: Plan): string | null            // walks phases+steps, Set-based dup check
export function detectCycle(graph: Map<string, string[]>): string | null  // generic DFS with visited/inStack sets — directly reusable for depends_on graphs of any shape
export function validateDependencies(plan: Plan): string | null         // builds phase graph + step graph, calls detectCycle on each, checks unknown_dependency first
export function validateSizeLimits(plan: Plan): string | null
export function validateImmutableId(patchId: string | undefined, targetId: string): string | null
```
`detectCycle` is **already fully generic** (`Map<string, string[]>` in, cycle-or-null out) — specs can call it directly for `depends_on` cycle detection (FR-SPECS-0005) without modification, just building its own `Map<string,string[]>` from the specs graph. `related` must explicitly **not** be run through `detectCycle` (FR-SPECS-0005 requires `related` may cycle).

### Schemas pattern (`schemas.ts`)
- Each subcommand file exports its own `xInputSchema`/`xOutputSchema` consts (plain JSON-Schema literals, `as const`).
- `schemas.ts` imports every one of those and re-exports two things: (1) `planSubcommandSchemas` — `{ [subcommandName]: {input, output} }`, consumed by nothing outside this file directly but structurally mirrors what feeds help; (2) `planSchemasDict: Record<string, unknown>` — **flat dictionary keyed by exported TS type name** (not by subcommand), containing every named shape recursively: full data types (`Plan`, `Phase`, `Step`), shared result types (`PlanWriteResult`, `PlanNextResult`, …), and shared nested/reused shapes (`PlanStatusTotals`, `PlanStepSummary`, `PlanPhaseSummary`, …). `$ref` convention: any nested-object property or array-items shape uses `{ $ref: "<DictKey>" }` where `<DictKey>` is a string key into `planSchemasDict` — e.g. `phaseSchema.properties.steps = { type: "array", items: { $ref: "Step" } }`. This dict becomes `planHelpContent.schemas`. FR-SPECS-0050 explicitly mandates the identical recursive-naming discipline ("every nested object and every array `items` shape SHALL itself be a named type referenced by name — no anonymous shape at any depth").

### Help-content authoring pattern (`help-content.ts`)
- One `notes: string[]` array of standalone behavioral strings (each independently meaningful, no internal jargon/FR-ids — this matches FR-ARCH-0016/FR-SPECS-0043's "no internal traceability leakage" rule, which the plan notes already comply with by construction: they read as pure directive guidance).
- `planHelpContent` object literal with fixed required shape (`name`, `brief`, `description`, `schemas`, `notes` per `HelpCommandDetail`) plus command-specific extensions (`plan_file`, `concepts`, `subagent_fields`, `subcommands`, `limits`, `templates` getter, `plan_authoring_guidance`, `next_steps_for_ai`) — the `HelpCommandDetail` interface has an index signature `[key: string]: unknown` explicitly to allow this.
- Each `subcommands[]` entry: `{ name, brief, usage, args, required, description, examples: { tip, real } }` — `tip` uses bracketed placeholders (`[plan_file]`), `real` is a concrete copy-pasteable invocation. FR-SPECS-0060 requires the exact same dual-example shape for all 16 specs subcommands.

### Error code conventions
- Simple/legacy codes: bare string literals at the call site (`"plan_not_found"`, `"target_not_found"`, `"missing_kind"`, `"invalid_kind"`, `"phase_not_found"`, `"missing_id"`, `"duplicate_id"`, `"unknown_dependency"`, `"dependency_cycle"`, `"size_limit_exceeded"`, `"invalid_limit"`, `"immutable_id"`, `"invalid_status"`, `"concurrent_write_conflict"`).
- Newer/reused codes: named exported consts in `errors.ts` (`ERR_PLAN_FILE_CORRUPTED = "plan_file_corrupted"`, etc.), imported wherever needed including from `shared/plan-io.ts` (the one shared→command import noted in §3).
- Internal exceptions always get wrapped: `catch (e) { const msg = e instanceof Error ? e.message : String(e); return err(\`internal_error: ${msg}\`); }` at the top level of every `cmd*` function.
- `include_help: true` is passed on usage-shaped errors (missing required arg, unknown subcommand, invalid enum value) via `err(msg, true)` / `usageErr(msg)`; `include_help: false` (default) on runtime/domain errors (`plan_not_found`, `duplicate_id`, etc.).

---

## 5. SPECS IMPLEMENTATION BLUEPRINT

Proposed `src/rosettify/src/commands/specs/` layout, mirroring `commands/plan/` 1:1 where the domain allows, with new files where FR-SPECS introduces net-new mechanics:

| File | Mirrors | Covers (FR-SPECS-*) | What differs from plan |
|---|---|---|---|
| `core.ts` | `plan/core.ts` | 0001 (Spec/AcceptanceCriterion types), 0002 (SpecsDocument/AreaEntry types), 0003 (SpecType enum), 0004 (id format regex + area registration), 0005 (validateUniqueIds analog, unknown_dependency check, depends_on cycle via reused `detectCycle`), 0007 (validateSizeLimits analog with new constants) | Two independent reference graphs (`depends_on` acyclic, `related` cyclic-allowed) instead of plan's one phase-graph+step-graph pair; id format is a regex (`<PREFIX>-<AREA>-<NNNN>`) not a caller-free string; status enum has 5 values with an explicit transition table (Draft/Approved/Modified/Deprecated/Removed) vs plan's simpler bottom-up-derived status. |
| `index.ts` | `plan/index.ts` | 0030 (batch/single-item normalization, all-or-nothing validation aggregation), general dispatch | `runSpecs` must normalize "one item or array" into a batch first (plan has no equivalent — plan subcommands are always single-target); the **all-or-nothing multi-item error aggregation** ("a single human-readable error string that enumerates every failing item... by id or index, together with its reason") is net-new — plan's write path fails fast on the first error, specs must collect all failures across a batch before returning. Larger `VALID_SUBCOMMANDS` (16 entries vs plan's 9). |
| `errors.ts` | `plan/errors.ts` | error codes across all subcommands | New codes: `specs_not_found`, `specs_file_corrupted`, `invalid_spec_field`, `missing_required_field`, `invalid_type`, `invalid_id_format`, `unknown_area`, `invalid_implementation`, `missing_implementation`, `invalid_transition`, `validation_failed`, `force_required`, `referenced_by_others`, `invalid_filter`, `invalid_query`, `invalid_format`, `source_not_found`, `migrate_parse_error`, plus reused-by-name `duplicate_id`/`unknown_dependency`/`dependency_cycle`/`size_limit_exceeded`/`target_not_found`/`immutable_id`/`missing_id`/`missing_data`/`invalid_data`. |
| `output.ts` | `plan/output.ts` | 0050 (SpecWriteResult, SpecLifecycleResult builders) | Two shared result builders instead of one (`buildSpecWriteResult` for add/update; `buildSpecLifecycleResult` for approve/deprecate/restore/reopen), since FR-SPECS-0050 defines two shared shapes where plan has one (`PlanWriteResult` covers all 4 plan write ops). |
| `schemas.ts` | `plan/schemas.ts` | 0050, 0060 | Same flat named-type-dict + `$ref` pattern; larger dictionary (`Spec`, `AcceptanceCriterion`, `AreaEntry`, `SpecWriteResult`, `SpecDocumentSummary`, `SpecRef`, `SpecLifecycleResult`, `SpecGetResult`, `SpecQueryResult`, `SpecDeleteResult`, `SpecPurgeResult`, `SpecImplementedResult`, `SpecValidateResult`, `SpecFinding`, `SpecGraphResult`, `SpecEdge`, `SpecRenderResult`, `SpecInfoResult`, `SpecAreaInfo`, `SpecTotals`, `SpecNextId`, `SpecMigrateResult`). |
| `help-content.ts` | `plan/help-content.ts` | 0060, 0061 | Same shape; `query_notation` is a new top-level key not present in plan's help content (FR-SPECS-0060 explicitly lists it alongside `plan_file`-equivalent `specs_file`, `concepts`, `subcommands`, `schemas`, `limits`, `notes`, `next_steps_for_ai`). |
| `add.ts` | `plan/create.ts` (write, first-create bypass logic) + `plan/upsert.ts`'s append semantics | 0010 | Batch-of-N append (plan create is single-plan-creation only, not a batch of N items into an existing doc) — closer in shape to a batch loop wrapping something like plan's per-item append. |
| `get.ts` | `plan/query.ts` (by-id read) | 0011 | **Net new "partial success" shape**: `{ found, missing }` for a batch of ids — plan's `query` is single-target and errors on not-found; specs' `get` never errors on a missing id, only reports it. |
| `query.ts` | `plan/query.ts` (structure) but semantically closer to a new filter engine | 0012 | **Net-new component**: the `key:value` filter-string parser (space=AND, comma=OR-within-field, `-` prefix=NOT, quoted-value=literal match, bare term=free text over title+statement). Plan has no query-string parsing at all — its `query`/`show_status` take a single `target_id`, not a filter grammar. This is the single largest net-new piece of parsing logic in the whole command. |
| `update.ts` | `plan/upsert.ts` (RFC-7396 merge-patch, guarded-field stripping) | 0013 | Directly analogous to `upsert`'s `stripStatusFields`/`mergePatch` pattern, but: (a) batch of N patches, not one; (b) guards 4 fields (`status`,`approved_by`,`implementation`,`changed_by`) not 1 (`status`); (c) **net-new automatic-transition side effect**: editing an Approved spec's `statement`/`acceptance` auto-flips it to Modified + clears `approved_by`; editing an Implemented spec's contract auto-flips `implementation` to ToBeModified. Plan's upsert has no analogous "edit triggers a status side-effect" behavior — this is new business logic, not a mirror of anything in plan. |
| `delete.ts` | none directly (closest: `plan/update-status.ts`'s single-field setter, but batched and idempotent) | 0014 | Soft-delete: batched, idempotent, missing-id → `missing` list (not error) — a shape closer to `get`'s partial-success pattern than to `update-status`'s single-target hard-error pattern. |
| `purge.ts` | none in plan (plan has no destructive/irreversible op) | 0016 | **Fully net-new**: first use of `--force` (FR-ARCH-0015) anywhere in this codebase; first use of a "referenced by others unless also purged in this batch" cross-item integrity check within a single batch. |
| `implemented.ts` | `plan/update-status.ts` (single guarded-field setter, closest analog) | 0015 | Same shape as update-status but batched and with an optional side-field (`implementation_notes`); independent status enum (`NotStarted/Implemented/Planned/ToBeModified/ToBeRemoved`) from the approval-status enum. |
| `approve.ts` | none in plan | 0017 | **Net-new**: runs `validate.ts`'s logic internally as a pre-condition, aggregates blocking findings into one message, refuses the whole batch on any error-severity finding. This is the one subcommand whose implementation directly calls another subcommand's logic as a library function (validate → approve dependency) — worth calling out architecturally as an internal composition, not parallel independence. |
| `deprecate.ts` | `plan/update-status.ts` shape | 0018 | Simple guarded status transition, batched, idempotent. |
| `restore.ts` | `plan/update-status.ts` shape | 0019 | Simple guarded status transition (Removed→Draft), batched. |
| `reopen.ts` | `plan/update-status.ts` shape | 0020 | Simple guarded status transition (Approved→Draft, clears approved_by), batched. |
| `validate.ts` | none in plan (plan has no linter/validator subcommand) | 0021 | **Fully net-new**: a multi-rule validation engine (schema completeness, id format, area registration, uniqueness, reference integrity, depends_on acyclicity — all straightforward reuses of `core.ts` validators — PLUS phrasing rules that are genuinely new parsing/pattern-matching: EARS-pattern regex/pattern matcher for FR statements, "measurable metric+threshold" heuristic for NFR statements, modal-verb (shall/should/may) checker, duplicate-statement detector). This is the second-largest net-new component after the query grammar. |
| `graph.ts` | none in plan (plan has no graph-walk subcommand; `detectCycle` in `core.ts` is the only graph primitive plan has) | 0022 | **Net-new graph walker**: transitive `depends_on` closure (`dependencies`), transitive reverse closure (`dependents`/impact-set), direct `related` links, full edge list + cycle enumeration for whole-document mode, and **cross-document resolution** (accepting additional document paths and resolving refs against them) — plan's `detectCycle` only detects existence-of-cycle, not enumerates every cycle, and has zero cross-file capability. Needs new graph-traversal code (BFS/DFS for closures) built on top of, but well beyond, the reusable `detectCycle`. |
| `render.ts` | none in plan (plan has zero human-readable-string output; all plan output is JSON, matching MEMORY: rosettify itself has no markdown-rendering command yet) | 0023 | **Fully net-new formatter**: JSON→markdown/text string renderer, grouping by area, converting stored UTC timestamps to the caller's local timezone for display (needs a UTC→local formatter, likely `Intl.DateTimeFormat` with no explicit timezone arg to use the host's local zone, or `Date.toString()`/`toLocaleString()` — no existing helper in `shared/*` does this today; must be net-new, possibly worth a small `shared/time.ts` if reused between `render.ts` and `info.ts`). |
| `info.ts` | none in plan (plan has no orientation/summary-by-area subcommand; closest structural analog is `show_status`'s totals-by-status, but info's totals are by type/status/implementation plus per-area counts plus next-free-id suggestions) | 0024 | Reuses local-time conversion (see render.ts) and needs a `SpecNextId` computation: per prefix+area, scan all ids matching `<PREFIX>-<AREA>-NNNN`, track max NNNN, suggest `NNNN+1` zero-padded to 4 digits — a small net-new id-parsing helper (regex extract + max-tracking), structurally similar to `plan-io.ts`'s own `parseBackupIndex`/`nextBackupPath` (max+1, zero-padded) pattern, which can be used as a direct algorithmic template even though it lives in a different file for a different purpose. |
| `migrate.ts` | none in plan | 0025 | **Fully net-new and the largest single risk item**: parses `<req id="..." type="..." ...>...</req>` XML blocks out of source markdown files (matching the `docs/REQUIREMENTS/**/*.md` format this very discovery task read from — see the SPECS.md source itself as a live example of the exact format to parse: `<req id="FR-SPECS-0001" type="FR" level="System" ticketId="..." classification="...">` opening tag with attributes, then child tags `<title>`, `<statement>`, `<rationale>`, `<source>`, `<ticketId>`, `<priority>`, `<status>`, `<approved_by>`, `<changed>`, `<verification>`, `<acceptance><criteria>...</criteria></acceptance>`, `<depends>`, `<implementation>`, `<implementationNotes>`). Must also handle the **legacy bracketed single-tag implementation form** `<implementation>[Status: X] [Additional Notes: Y]</implementation>` as a distinct normalization path, and split a single acceptance-criteria string into given/when/then sub-fields when Given:/When:/Then: markers are present, else preserve verbatim + warn. No XML parsing dependency currently exists in `package.json` — architecture must decide: hand-rolled regex/tag-scanner (consistent with "keep deps minimal" ethos) vs. adding a parser dependency. |
| `list-*` (n/a) | `plan/list-templates.ts` | — | **No direct FR-SPECS analog** — specs has no template-catalog subcommand; skip this file, nothing to mirror. |
| `templates/` (n/a) | `plan/templates/**` | — | **No direct FR-SPECS analog** — specs has no create/upsert-with-template mechanism in the current requirements; skip this subtree entirely. |

### Shared cross-file concerns for specs (net-new, beyond what §3 covers)
- **Actor identity resolver** (FR-SPECS-0041) — fully net-new, no analog anywhere in `plan/` or `shared/`. Needs an ordered fallback chain: explicit param → `ROSETTA_ACTOR` env var → `git config user.email` → `git config user.name` (shelling out to `git`, a new kind of side effect not present anywhere in today's rosettify — plan never shells out to anything) → `SUDO_USER` env → Node's `os.userInfo()` → `USER`/`USERNAME` env → literal `"unknown"`. Best placed as a new `shared/actor.ts` (cross-cutting, not specs-only, per FR-ARCH-0013's "shared common module" principle) since nothing about it is specs-specific, even though only specs currently needs it.
- **UTC-storage/local-display time helper** (FR-SPECS-0042) — needed by both `render.ts` and `info.ts`; worth a tiny shared helper (either in `commands/specs/` if truly specs-only, or `shared/` if judged generically useful) rather than duplicating `Date` formatting twice.
- **query-string filter parser** (FR-SPECS-0012) — needed by `query.ts` AND by `validate.ts` (optional scoping filter) AND by `render.ts` (optional scoping filter). Must be its own module (e.g. `commands/specs/query-parser.ts`) exporting a `parseQuery(str) → Filter | {error}` and an `applyFilter(specs, filter) → Spec[]`, imported by all three call sites — else the grammar gets reimplemented three times, violating the same SRP+DRY discipline the plan command follows throughout.

### Explicit call-out: items with NO analog in plan (net-new architecture, most implementation risk)
1. `query.ts` — key:value filter-string grammar parser (§ FR-SPECS-0012).
2. `validate.ts` — EARS-pattern matcher, measurable-NFR heuristic, modal-verb checker, duplicate-statement detector (§ FR-SPECS-0006, 0021).
3. `graph.ts` — transitive closure walker (dependencies/dependents/impact-set), cycle enumeration (not just detection), cross-document resolution (§ FR-SPECS-0022).
4. `render.ts` — JSON→markdown/text formatter with local-time conversion (§ FR-SPECS-0023).
5. `migrate.ts` — `<req>` XML-in-markdown parser, dual implementation-field normalization, given/when/then splitter (§ FR-SPECS-0025).
6. Actor identity resolver — env/git/OS fallback chain, first process-spawning (`git config`) side effect in the codebase (§ FR-SPECS-0041).
7. `purge.ts` — first `--force` flag implementation anywhere in rosettify, first "would this batch leave a dangling reference" cross-item check (§ FR-SPECS-0016, FR-ARCH-0015).
8. Batch-wide all-or-nothing error aggregation into one human-readable string across many items — plan's write path never needed to aggregate more than one failure at a time since it only ever mutates one target per call (§ FR-SPECS-0030).
9. Approve's "run validate internally, refuse batch on any error-severity finding, all-or-nothing across a batch of approve targets" composition (§ FR-SPECS-0017).

Everything else (add/get/update/delete/implemented/approve/deprecate/restore/reopen at the mechanical level, plus core.ts's type/validation layer, schemas.ts, help-content.ts, index.ts dispatch, errors.ts, output.ts) is a reasonably close structural mirror of the plan command's existing patterns.

---

## 6. RISKS / UNKNOWNS

1. **`plan-io.ts` generalization is a real architecture decision, not a mechanical rename.** The two candidate generalization approaches (parameterize the corrupted-error code vs. duplicate a `specs-io.ts`) have different blast radii: parameterizing touches every plan call site that currently imports `atomicWriteWithBackup`/`readPlanWithRetry` (5 files: `next.ts`, `query.ts`, `upsert.ts`, `update-status.ts`, `show-status.ts`) even though their behavior is unchanged, just to thread through/accept a new parameter — versus a duplicate file which risks drift between two copies of a subtle, hand-verified concurrency mechanism (the code comments describe MPP-test-verified findings about hardlink/rename races — this is not naive code, duplicating it is risky). Architecture phase must pick one and be explicit about the tradeoff.
2. **CLI wiring burden is real and linear**: 16 specs subcommands × a `.command().argument()...action()` block each in `cli.ts`, on top of the 9 plan already has — `cli.ts` will roughly triple in size (currently 301 lines). No shortcut exists today; commander wiring is 100% hand-written per subcommand, there is no declarative/generated bridge from `inputSchema` to commander args.
3. **MCP `inputSchema` for `subcommand` is a flat string enum only in the description text**, not a JSON-Schema `enum` constraint (plan's `subcommand` property has `type: "string", description: "Subcommand: create, next, ..."` — no `enum: [...]` array) — so nothing programmatically prevents an MCP caller from sending an invalid subcommand at the schema level; validity is enforced entirely inside `runPlan`'s `VALID_SUBCOMMANDS.includes(subcommand)` check. This is consistent with plan and should be mirrored, but it does mean specs' 16-way subcommand fan-out gets zero schema-level protection, all runtime.
4. **`dispatch.ts`'s `validateInput` is intentionally shallow** (structural type/required/enum checks only, no deep object validation, no array-item-shape validation, no format/regex validation) — it will NOT catch things like a malformed spec id format or an invalid `type` enum value inside a batch item; all of FR-SPECS-0001/0003/0004's format/enum rules must be enforced by specs' own command-level code (mirroring how plan's `PLAN_MAX_*` limits and id/dependency checks are all hand-rolled in `core.ts`, not delegated to `dispatch.ts`).
5. **Test harness rebuild coupling**: any specs CLI change requires `npm run build` before `tests/e2e/cli.e2e.test.ts`/`mcp.e2e.test.ts` will reflect it (confirmed via the `beforeAll` binary-existence check and via `src/run-tests.sh`'s explicit `test_ts src/rosettify build` step) — a common source of "my e2e test didn't pick up my change" confusion during implementation; must remember to rebuild between edits when iterating on e2e specs tests, not just unit tests (unit tests import `src/**/*.ts` directly via vitest/ts-node-style resolution and do NOT need a rebuild).
6. **Coverage thresholds are enforced at 90% lines/branches** (`vitest.config.ts`) excluding `src/bin/**`/`src/frontends/**` — the large net-new logic surfaces (query parser, validator, graph walker, render formatter, migrate parser) will need correspondingly thorough unit tests or the whole-package coverage gate will fail; these are exactly the areas most likely to have edge cases (empty inputs, malformed grammar, cyclic-but-allowed `related` graphs) that are easy to under-test.
7. **No XML/markdown parsing dependency exists yet** for `migrate.ts` — decide in architecture whether to hand-roll a tag scanner (matching existing "no external validator... keep deps minimal" philosophy quoted in `dispatch.ts`'s NFR-STAB-0002 comment) or add a dependency; hand-rolling a correct-enough XML-subset parser for nested `<acceptance><criteria>...</criteria></acceptance>` blocks with attributes is more failure-prone than it looks (the actual source format, visible in `SPECS.md` itself, mixes self-closing-less tags, multi-line content within tags, and markdown code fences inside `<statement>` bodies — see FR-SPECS-0001's own `<statement>` for a real example: it contains a full ``` code block inline).
8. **Actor resolution's `git config` shell-out is a new process-spawning side effect** in a codebase that has never spawned a subprocess from its own command logic before (only test code spawns the built binary) — needs careful sandboxing/error-handling (git not installed, not in a repo, `git config` hanging) so a write operation never blocks or crashes because identity resolution stalls; FR-SPECS-0041 explicitly requires "SHALL NOT fail the operation" and "SHALL NOT perform network calls" — `git config --local`/`--global` are local-only and fast, but the implementation must set an explicit timeout and catch every failure mode to guarantee this.
9. **`approve`'s internal call into `validate`'s logic** creates a same-command cross-subcommand dependency that plan's subcommands never have (plan's `create-with-template`/`upsert-with-template` call `cmdCreate`/`cmdUpsert` respectively, so there IS precedent for one subcommand wrapping another — but `approve`→`validate` is calling a *read-only analysis* subcommand from inside a *write* subcommand, a new direction of composition worth flagging for architecture review, particularly around how validation findings' error messages get aggregated into the single human-readable `validation_failed` string FR-SPECS-0017 requires).
10. **FR-SPECS-0043's carve-out is easy to implement backwards**: the leakage rule (FR-ARCH-0016) forbids `FR-*`/`NFR-*` tokens in *emitted output*, but specs' entire subject matter is spec ids that legitimately look exactly like `FR-SPECS-0001` — FR-SPECS-0043 clarifies the rule applies only to the command's *own* bookkeeping (help text, error message templates, schema descriptions) and never to caller payload data (spec ids, dependency references, statements) which must pass through untouched/unredacted. A naive implementation of the leakage rule as a blanket output-scanner (if one exists elsewhere in the codebase — not found in this discovery pass, but worth checking during architecture) would break the entire command if applied indiscriminately to `get`/`query` results.
