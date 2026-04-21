# rosettify -- Technical Specification

plan_name: rosettify
phase: 2 (tech-specs)
date: 2026-04-05
status: Draft

---

## 1. Scope

This specification defines WHAT will be built for the rosettify npm package. It covers directory structure, TypeScript interfaces and types, tool registry shape, run delegate contracts, shared module contracts, CLI and MCP frontend wiring, and package configuration. All requirement IDs trace back to docs/requirements/rosettify/.

Batch 1 commands in scope: `plan`, `help`.
Future commands (install, uninstall, upgrade, generate, handle) are out of scope.

---

## 2. Directory Structure

```
rosettify/
  package.json
  package-lock.json               # committed (NFR-STAB-0001)
  tsconfig.json
  tsconfig.build.json
  vitest.config.ts
  LICENSE                          # Apache 2.0 (NFR-SEC-0002)
  README.md
  .gitignore                       # dist/, node_modules/, *.log
  src/
    bin/
      rosettify.ts                 # CLI entry point, shebang, bin target
    registry/
      index.ts                     # static registry: Map<string, ToolDef>
      types.ts                     # ToolDef, RunDelegate, RunEnvelope
    frontends/
      cli.ts                       # commander 14 wiring
      mcp.ts                       # @modelcontextprotocol/sdk Server wiring
    commands/
      plan/
        index.ts                   # plan run delegate + tool def export; dispatches to subcommand files
        core.ts                    # shared plan logic: types (Plan/Phase/Step/PlanInput), merge (RFC 7396),
                                   # status (computeStatus, propagateStatuses), validate (dup IDs, cycles, limits),
                                   # file I/O (loadPlan, savePlan) — all subcommand files import only from here
        create.ts                  # create subcommand
        next.ts                    # next subcommand
        update-status.ts           # update_status subcommand
        show-status.ts             # show_status subcommand
        query.ts                   # query subcommand
        upsert.ts                  # upsert subcommand
        help-content.ts            # plan help content (FR-PLAN-0016/0017/0018)
      help/
        index.ts                   # help run delegate + tool def export
    shared/
      dispatch.ts                  # validate -> run -> enrich pipeline
      envelope.ts                  # ok/error helpers
      concurrency.ts               # optimistic read-modify-write
      logger.ts                    # pino file-only
      constants.ts                 # size limits, status enum
  tests/
    unit/
      plan/
        create.test.ts
        next.test.ts
        update-status.test.ts
        show-status.test.ts
        query.test.ts
        upsert.test.ts
        core.test.ts               # merge, status, validate, file I/O from core.ts
      help/
        help.test.ts
      shared/
        dispatch.test.ts
        concurrency.test.ts
        envelope.test.ts
      registry/
        registry.test.ts
    e2e/
      cli.e2e.test.ts              # NFR-INT-0004
      mcp.e2e.test.ts              # NFR-INT-0003
    fixtures/
      plans.ts                     # fullPlan(), minimal plans, edge cases
  dist/                            # gitignored build output
```

Traces: FR-ARCH-0003, FR-PKG-0004, NFR-INT-0002, NFR-INT-0003, NFR-INT-0004.

---

## 3. TypeScript Interfaces and Types

All types live in the files indicated. Every type is exported. All imports use `.js` extensions on relative paths (NodeNext).

### 3.1 Registry Types -- `src/registry/types.ts`

```typescript
// --- Run Envelope (FR-ARCH-0011) ---

export interface RunEnvelope<T = unknown> {
  ok: boolean;
  result: T | null;
  error: string | null;
  include_help: boolean;
}

// --- Enriched Envelope (FR-ARCH-0012) ---
// After help enrichment, the envelope may carry a help field.

export interface EnrichedEnvelope<T = unknown> extends RunEnvelope<T> {
  help?: HelpTopLevel | HelpCommandDetail;
}

// --- Command Input Base (FR-ARCH-0004, FR-ARCH-0006) ---
// All run delegate inputs must extend this interface.
// Defines the full vocabulary of input fields for commands in this batch.

export interface CommandInput {
  /** Routing parameter: identifies which subcommand to execute (FR-ARCH-0006). */
  subcommand?: string;
  /** Path to the plan JSON file (FR-PLAN-0010 through FR-PLAN-0015). */
  plan_file?: string;
  /** JSON payload: plan/phase/step data (FR-PLAN-0010, FR-PLAN-0015). */
  data?: string | Record<string, unknown>;
  /** Target identifier: step-id, phase-id, or "entire_plan" (FR-PLAN-0011 through FR-PLAN-0015). */
  target_id?: string;
  /** New status value for update_status (FR-PLAN-0012). */
  new_status?: string;
  /** Maximum items to return (FR-PLAN-0011). */
  limit?: number;
  /** Item kind for new items: "phase" | "step" (FR-PLAN-0015). */
  kind?: string;
  /** Parent phase ID for new steps (FR-PLAN-0015). */
  phase_id?: string;
}

// --- Run Delegate (FR-ARCH-0004) ---

export type RunDelegate<TInput extends CommandInput = CommandInput, TResult = unknown> = (
  input: TInput,
) => Promise<RunEnvelope<TResult>>;

// --- Tool Definition (FR-ARCH-0001) ---

export interface ToolDef<TInput extends CommandInput = CommandInput, TResult = unknown> {
  name: string;
  brief: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema object
  outputSchema: Record<string, unknown>; // JSON Schema object
  cli: boolean; // FR-ARCH-0005
  mcp: boolean; // FR-ARCH-0005
  run: RunDelegate<TInput, TResult>; // FR-ARCH-0004
}

// --- Help output shapes (FR-HELP-0001, FR-HELP-0002) ---

export interface HelpCommandEntry {
  name: string;
  brief: string;
}

export interface HelpTopLevel {
  tool: string;
  version: string;
  commands: HelpCommandEntry[];
  guidance: string;
}

export interface HelpCommandDetail {
  name: string;
  brief: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  subcommands?: HelpCommandEntry[];
}
```

### 3.2 Plan Data Types -- `src/commands/plan/types.ts`

```typescript
// --- Status Enum (FR-PLAN-0002) ---

export const VALID_STATUSES = [
  "open",
  "in_progress",
  "complete",
  "blocked",
  "failed",
] as const;

export type Status = (typeof VALID_STATUSES)[number];

// --- Step (FR-PLAN-0001, FR-PLAN-0017) ---

export interface Step {
  id: string;
  name: string;
  prompt: string;
  status: Status;
  depends_on: string[];
  subagent?: string;
  role?: string;
  model?: string;
}

// --- Phase (FR-PLAN-0001, FR-PLAN-0017) ---

export interface Phase {
  id: string;
  name: string;
  description: string;
  status: Status;
  depends_on: string[];
  subagent?: string;
  role?: string;
  model?: string;
  steps: Step[];
}

// --- Plan (FR-PLAN-0001, FR-PLAN-0017) ---

export interface Plan {
  name: string;
  description: string;
  status: Status;
  created_at: string;   // ISO 8601
  updated_at: string;   // ISO 8601
  phases: Phase[];
}

// --- Plan Command Input ---
// The unified input for the plan run delegate.
// CLI and MCP both construct this same shape (FR-ARCH-0006).

export interface PlanInput {
  subcommand?: string;
  plan_file?: string;
  data?: string | Record<string, unknown>;
  target_id?: string;
  new_status?: string;
  limit?: number;
  kind?: string;
  phase_id?: string;
}

// --- Subcommand Result Types ---

export interface CreateResult {
  plan_file: string;
  name: string;
  status: Status;
}

export interface NextStep {
  id: string;
  name: string;
  prompt: string;
  status: Status;
  depends_on: string[];
  phase_id: string;
  phase_name: string;
  resume?: boolean;
  previously_blocked?: boolean;
  previously_failed?: boolean;
  subagent?: string;
  role?: string;
  model?: string;
}

export interface NextResult {
  ready: NextStep[];
  count: number;
  plan_status: Status;
}

export interface UpdateStatusResult {
  id: string;
  status: Status;
  plan_status: Status;
}

export interface StatusTotals {
  open: number;
  in_progress: number;
  complete: number;
  blocked: number;
  failed: number;
  total: number;
  progress_pct: number;
}

export interface PhaseSummaryEntry {
  id: string;
  name: string;
  status: Status;
  steps: Array<{ id: string; name: string; status: Status }>;
}

export interface ShowStatusPlanResult {
  name: string;
  status: Status;
  phases: StatusTotals;
  steps: StatusTotals;
  phase_summary: PhaseSummaryEntry[];
}

export interface ShowStatusPhaseResult {
  id: string;
  name: string;
  status: Status;
  steps: Array<{ id: string; name: string; status: Status }>;
}

export interface ShowStatusStepResult {
  id: string;
  name: string;
  status: Status;
  depends_on: string[];
  subagent?: string;
  role?: string;
  model?: string;
}

export interface UpsertResult {
  id: string;
  plan_status: Status;
  message?: string;
}
```

### 3.3 Shared Constants -- `src/shared/constants.ts`

```typescript
// FR-PLAN-0005 — authoritative values from ims_mcp/constants.py

export const PLAN_MAX_PHASES = 100;
export const PLAN_MAX_STEPS_PER_PHASE = 100;
export const PLAN_MAX_DEPENDENCIES_PER_ITEM = 50;
export const PLAN_MAX_STRING_LENGTH = 20_000;
export const PLAN_MAX_NAME_LENGTH = 256;

export const MAX_CONCURRENCY_RETRIES = 3;  // FR-SHRD-0006
```

### 3.4 Envelope Helpers -- `src/shared/envelope.ts`

```typescript
import type { RunEnvelope } from "../registry/types.js";

export function ok<T>(result: T): RunEnvelope<T> {
  return { ok: true, result, error: null, include_help: false };
}

export function err(error: string, includeHelp = false): RunEnvelope<never> {
  return { ok: false, result: null, error, include_help: includeHelp };
}

export function usageErr(error: string): RunEnvelope<never> {
  return { ok: false, result: null, error, include_help: true };
}
```

### 3.5 Logger -- `src/shared/logger.ts`

```typescript
import pino from "pino";

// FR-ARCH-0010, FR-SHRD-0005
// Writes to file only. Never stdout, never stderr.
// ROSETTIFY_LOG env var overrides default path.
// ROSETTIFY_LOG_LEVEL env var sets level (default: "info").

const logFile =
  process.env["ROSETTIFY_LOG"] ?? "rosettify.log";

const logLevel =
  process.env["ROSETTIFY_LOG_LEVEL"] ?? "info";

export const logger: pino.Logger = pino(
  { level: logLevel },
  pino.destination({ dest: logFile, sync: false }),
);
```

---

## 4. Tool Registry -- `src/registry/index.ts`

Shape: a `Map<string, ToolDef>` populated at module load by importing from each command module.

```typescript
import type { ToolDef } from "./types.js";
import { planToolDef } from "../commands/plan/index.js";
import { helpToolDef } from "../commands/help/index.js";

export const registry: ReadonlyMap<string, ToolDef> = new Map<string, ToolDef>([
  [planToolDef.name, planToolDef],
  [helpToolDef.name, helpToolDef],
]);

export function getToolDef(name: string): ToolDef | undefined {
  return registry.get(name);
}

export function getCliTools(): ToolDef[] {
  return [...registry.values()].filter((t) => t.cli);
}

export function getMcpTools(): ToolDef[] {
  return [...registry.values()].filter((t) => t.mcp);
}
```

Both frontends query this registry. CLI iterates `getCliTools()` for commander setup. MCP iterates `getMcpTools()` for `setRequestHandler("tools/list", ...)`.

Traces: FR-ARCH-0001, FR-ARCH-0005, FR-ARCH-0006.

---

## 5. Plan Command Run Delegate -- `src/commands/plan/index.ts`

### 5.1 Tool Definition

```typescript
export const planToolDef: ToolDef<PlanInput, unknown> = {
  name: "plan",
  brief: "Manage execution plans (create, query, update, upsert)",
  description: "...",  // full description including subcommands
  inputSchema: { /* JSON Schema with subcommand enum, plan_file, data, etc. */ },
  outputSchema: { /* JSON Schema for common envelope */ },
  cli: true,
  mcp: true,
  run: runPlan,
};
```

### 5.2 Input Schema (JSON Schema)

```json
{
  "type": "object",
  "properties": {
    "subcommand": {
      "type": "string",
      "enum": ["create", "next", "update_status", "show_status", "query", "upsert"]
    },
    "plan_file": { "type": "string", "description": "Path to the plan JSON file" },
    "data": {
      "oneOf": [
        { "type": "string", "description": "JSON string of plan/phase/step data" },
        { "type": "object", "description": "Plan/phase/step data object" }
      ]
    },
    "target_id": { "type": "string", "description": "Phase or step ID, or 'entire_plan'" },
    "new_status": { "type": "string", "enum": ["open", "in_progress", "complete", "blocked", "failed"] },
    "limit": { "type": "integer", "minimum": 0, "description": "Max items to return (next)" },
    "kind": { "type": "string", "enum": ["phase", "step"], "description": "Type for new upsert target" },
    "phase_id": { "type": "string", "description": "Parent phase for new step (upsert)" }
  },
  "required": []
}
```

Note: `subcommand` is not marked required at schema level. Absence triggers help content return (FR-PLAN-0022).

### 5.3 Run Delegate Contract

```typescript
async function runPlan(input: PlanInput): Promise<RunEnvelope<unknown>>
```

Dispatch logic:
1. No subcommand -> return plan help content (FR-PLAN-0022).
2. Unknown subcommand -> `err("unknown_command: <cmd> | valid: create, next, update_status, show_status, query, upsert", true)` (FR-PLAN-0023).
3. Known subcommand -> dispatch to the corresponding function.

Each subcommand function signature:

| Function | File | Signature | Result Type |
|---|---|---|---|
| `cmdCreate` | `create.ts` | `(planFile: string, data: Record<string, unknown>) => Promise<RunEnvelope<CreateResult>>` | CreateResult |
| `cmdNext` | `next.ts` | `(planFile: string, targetId?: string, limit?: number) => Promise<RunEnvelope<NextResult>>` | NextResult |
| `cmdUpdateStatus` | `update-status.ts` | `(planFile: string, targetId: string, newStatus: string) => Promise<RunEnvelope<UpdateStatusResult>>` | UpdateStatusResult |
| `cmdShowStatus` | `show-status.ts` | `(planFile: string, targetId?: string) => Promise<RunEnvelope<ShowStatusPlanResult \| ShowStatusPhaseResult \| ShowStatusStepResult>>` | varies |
| `cmdQuery` | `query.ts` | `(planFile: string, targetId?: string) => Promise<RunEnvelope<Plan \| Phase \| Step>>` | varies |
| `cmdUpsert` | `upsert.ts` | `(planFile: string, targetId: string \| undefined, data: Record<string, unknown>, kind?: string, phaseId?: string) => Promise<RunEnvelope<UpsertResult>>` | UpsertResult |

Traces: FR-PLAN-0010 through FR-PLAN-0015, FR-PLAN-0021, FR-PLAN-0022, FR-PLAN-0023.

### 5.4 Subcommand Behaviors

**create** (FR-PLAN-0010):
- Requires: `plan_file`, `data`.
- Defaults: `name` -> "Unnamed Plan", `status` -> "open" for all, `depends_on` -> [], timestamps set.
- Validations before write: validateUniqueIds, validateDependencies (includes cycle detection), validateSizeLimits.
- Creates parent directories via `fs.mkdir(dir, {recursive: true})`.
- Writes via optimistic concurrency (FR-SHRD-0006) -- on create, no prior updated_at check needed (new file).
- Returns: `ok({plan_file, name, status})`.

**next** (FR-PLAN-0011):
- Requires: `plan_file`.
- Optional: `target_id` (scope to phase), `limit` (default 10).
- Negative limit -> `err("invalid_limit")`.
- Missing file -> `err("plan_not_found")`.
- Unknown target_id -> `err("target_not_found")`.
- Groups: (1) in_progress steps with `resume: true`, (2) open steps with deps satisfied, (3) blocked steps with `previously_blocked: true`, (4) failed steps with `previously_failed: true`.
- Phase dependency check: steps in a phase whose phase depends_on are not all complete are excluded from group 2.
- Returns: `ok({ready, count, plan_status})`.

**update_status** (FR-PLAN-0012):
- Requires: `plan_file`, `target_id`, `new_status`.
- `target_id` == "entire_plan" -> `err("invalid_target")`.
- Missing new_status -> `err("missing_new_status")`.
- Invalid status value -> `err("invalid_status: <value>")`.
- target_id matches a phase ID -> `err("phase_status_is_derived")`.
- target_id not found -> `err("target_not_found")`.
- Missing file -> `err("plan_not_found")`.
- On success: set step status, propagateStatuses, write via concurrency.
- Returns: `ok({id, status, plan_status})`.

**show_status** (FR-PLAN-0013):
- Requires: `plan_file`.
- Optional: `target_id` (default: entire_plan).
- Entire plan: compute totals for phases and steps, build phase_summary.
- `progress_pct = Math.round(complete / total * 1000) / 10`.
- Phase target: return phase with steps summary.
- Step target: return step detail with depends_on and optional subagent fields.
- Missing file -> `err("plan_not_found")`.
- Unknown target -> `err("target_not_found")`.

**query** (FR-PLAN-0014):
- Requires: `plan_file`.
- Optional: `target_id` (default: entire_plan -> full plan JSON).
- Unknown target -> `err("target_not_found")`.
- Missing file -> `err("plan_not_found")`.

**upsert** (FR-PLAN-0015):
- Requires: `plan_file`, `data`.
- Optional: `target_id` (default: "entire_plan"), `kind`, `phase_id`.
- Behaviors per discovery notes section 5, bullet points (1)-(11).
- Status fields in patch data are silently stripped. If any were stripped, result includes `message: "status fields ignored -- use update_status to update status one-by-one after each task completion"`.
- Merge follows RFC 7396 (null removes keys, nested objects merged, scalars replaced).
- Post-merge validations: validateUniqueIds, validateDependencies, validateSizeLimits.
- Post-merge: propagateStatuses, set updated_at.
- Write via optimistic concurrency.
- Returns: `ok({id, plan_status, message?})`.

### 5.5 Plan Core -- `src/commands/plan/core.ts`

All subcommand files (`create.ts`, `next.ts`, `update-status.ts`, `show-status.ts`, `query.ts`, `upsert.ts`) import exclusively from `./core.js`. No cross-subcommand imports.

**Types** (same as section 3.2 — co-located here for subcommand convenience):
`Plan`, `Phase`, `Step`, `Status`, `VALID_STATUSES`, `PlanInput`, all result types.

**Validation functions** — ported from `plan_manager.py` and `validation.py`. Each returns `string | null` (null = valid, string = error code).

| Function | Error Code | Description |
|---|---|---|
| `validatePlanName(name)` | `size_limit_exceeded` | name non-empty, non-whitespace, length <= 256 |
| `validateNonNegativeLimit(limit)` | `invalid_limit` | limit >= 0 |
| `validateImmutableId(patchId, targetId)` | `immutable_id` | patchId must equal targetId or be absent |
| `validateUniqueIds(plan)` | `duplicate_id` | all phase+step IDs unique across plan |
| `detectCycle(graph)` | `dependency_cycle` | DFS on adjacency map, separate phase and step graphs |
| `validateDependencies(plan)` | `unknown_dependency` or `dependency_cycle` | all depends_on refs exist + no cycles |
| `validateSizeLimits(plan)` | `size_limit_exceeded` | walks entire object tree against constants |

**Merge functions** — ported from `plan_manager.js`:

| Function | Description |
|---|---|
| `mergePatch(target, patch)` | RFC 7396 merge patch. null removes keys. Returns new object. |
| `mergeById(existingArray, patchArray)` | Merge arrays by `id` field. Existing patched, new appended. Missing id -> error "missing_id". |

**Status functions** — ported from `plan_manager.js`:

| Function | Description |
|---|---|
| `computeStatusFromChildren(statuses: Status[])` | Priority: all complete->complete, any failed->failed, any blocked->blocked, any in_progress or mix->in_progress, else->open. Empty->open. |
| `propagateStatuses(plan: Plan)` | Mutates plan in place. Each phase status = computeStatusFromChildren(step statuses). Plan status = computeStatusFromChildren(phase statuses). |
| `findPhase(plan, id)` | Returns Phase or undefined. |
| `findStep(plan, id)` | Returns `{phase: Phase, step: Step}` or undefined. |
| `buildStepStatusMap(plan)` | Returns Map<stepId, Status>. |
| `buildPhaseStatusMap(plan)` | Returns Map<phaseId, Status>. |
| `depsSatisfied(item, statusMap)` | Returns boolean: all depends_on entries have status "complete" in the map. |

**File I/O functions** (also in `core.ts`):

| Function | Description |
|---|---|
| `loadPlan(file: string): Plan \| null` | Reads and JSON-parses the plan file. Returns null if file does not exist. |
| `savePlan(file: string, plan: Plan): void` | Creates parent dirs if needed. Sets `updated_at = new Date().toISOString()`. Writes `JSON.stringify(plan, null, 2)`. |

All subcommand files perform all plan mutations through `core.ts` only. The optimistic concurrency wrapper (FR-SHRD-0006) in `src/shared/concurrency.ts` wraps `loadPlan`/`savePlan` pairs.

---

## 6. Help Command Run Delegate -- `src/commands/help/index.ts`

### 6.1 Tool Definition

```typescript
export const helpToolDef: ToolDef<HelpInput, HelpTopLevel | HelpCommandDetail> = {
  name: "help",
  brief: "Show available commands and detailed usage information",
  description: "...",
  inputSchema: {
    type: "object",
    properties: {
      subcommand: { type: "string", description: "Command name to get details for" },
    },
    required: [],
  },
  outputSchema: { /* ... */ },
  cli: true,
  mcp: true,
  run: runHelp,
};

export interface HelpInput {
  subcommand?: string;
}
```

### 6.2 Run Delegate Contract

```typescript
async function runHelp(input: HelpInput): Promise<RunEnvelope<HelpTopLevel | HelpCommandDetail>>
```

- No subcommand (FR-HELP-0001): return `ok({tool: "rosettify", version, commands: [{name, brief}...], guidance: "use 'help <command>' for details"})`.
- Known subcommand (FR-HELP-0002): return `ok({name, brief, description, input_schema, output_schema, subcommands?})`.
- Unknown subcommand (FR-HELP-0002): fall back to top-level listing, `ok: true`, `include_help: false`.
- Help delegate never returns `include_help: true`.

---

## 7. Shared Module Contracts

### 7.1 Dispatch -- `src/shared/dispatch.ts`

```typescript
import type { ToolDef, RunEnvelope, EnrichedEnvelope } from "../registry/types.js";

export async function dispatch<TInput, TResult>(
  tool: ToolDef<TInput, TResult>,
  input: unknown,
): Promise<EnrichedEnvelope<TResult>>
```

Pipeline (FR-SHRD-0002):
1. Validate `input` against `tool.inputSchema` (FR-SHRD-0001). On failure: return `usageErr(details)`.
2. Call `tool.run(input as TInput)`. Run delegate returns `RunEnvelope`.
3. If `envelope.include_help === true`, call the help run delegate with `{subcommand: tool.name}` and merge result as `envelope.help` (FR-SHRD-0003, FR-ARCH-0012).
4. Catch unexpected exceptions: return `err("internal_error: <message>")` (FR-SHRD-0004).
5. Return the final `EnrichedEnvelope`.

Input validation approach: lightweight structural check against the JSON Schema (check required fields, basic type checks). No external JSON Schema validator library -- keep deps minimal (NFR-STAB-0002). Implement a small `validateInput(input: unknown, schema: Record<string, unknown>): string | null` in dispatch.ts.

### 7.2 Concurrency -- `src/shared/concurrency.ts`

```typescript
export interface ConcurrencyOps<T> {
  read: (filePath: string) => Promise<T & { updated_at: string }>;
  modify: (current: T) => Promise<T>;
  write: (filePath: string, data: T & { updated_at: string }) => Promise<void>;
}

export async function readModifyWrite<T>(
  filePath: string,
  ops: ConcurrencyOps<T>,
  maxRetries?: number,  // default: MAX_CONCURRENCY_RETRIES (3)
): Promise<RunEnvelope<T>>
```

Algorithm (FR-SHRD-0006):
1. Read file, capture `updated_at`.
2. Apply `ops.modify(current)`.
3. Re-read file, check `updated_at` matches captured value.
4. If match: set new `updated_at` to `new Date().toISOString()`, write, return ok.
5. If mismatch: retry from step 1, up to maxRetries.
6. After maxRetries exhausted: return `err("concurrent_write_conflict")`.

For new file creation (create subcommand): skip the re-read check. Write directly. No concurrency concern on new files.

### 7.3 Logger -- `src/shared/logger.ts`

Contract as shown in section 3.5. Singleton export. All internal modules import `logger` from here. No other logging mechanism permitted.

---

## 8. CLI Frontend -- `src/frontends/cli.ts`

### 8.1 Commander Setup

```typescript
import { Command } from "commander";
import { registry, getCliTools } from "../registry/index.js";
import { dispatch } from "../shared/dispatch.js";
```

Structure:
- Create root `Command("rosettify")` with version from package.json.
- Add `--mcp` option (FR-CLI-0002). If `--mcp` is set and any command arguments present, write error to stderr and exit 1.
- For each `getCliTools()` entry, add a commander subcommand.
- Plan subcommand: `program.command("plan").argument("[subcommand]").argument("[params...]")`. Parse params: if subcommand has a positional JSON arg, parse it. Build `PlanInput` and call `dispatch(planToolDef, input)`.
- Help subcommand: `program.command("help").argument("[subcommand]")`. Build `HelpInput` and call `dispatch(helpToolDef, input)`.
- `--help` flag interception (FR-HELP-0003): override commander's default help. `rosettify --help` -> dispatch to help with no subcommand. `rosettify plan --help` -> dispatch to help with `{subcommand: "plan"}`.

### 8.2 Output and Exit Codes

- On dispatch result: `process.stdout.write(JSON.stringify(envelope) + "\n")` (FR-CLI-0004).
- Exit 0 if `envelope.ok === true` or the command is help (FR-CLI-0003).
- Exit 1 if `envelope.ok === false`.
- Unexpected errors caught at top level: write JSON error to stderr, exit 1.

### 8.3 Input Parsing (FR-CLI-0005)

List parameters accept comma-separated and space-separated formats. The CLI frontend normalizes both to arrays before passing to the run delegate.

Traces: FR-CLI-0001 through FR-CLI-0005.

---

## 9. MCP Frontend -- `src/frontends/mcp.ts`

### 9.1 Server Setup

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getMcpTools } from "../registry/index.js";
import { dispatch } from "../shared/dispatch.js";
```

Structure:
- Create `Server` with `{name: "rosettify", version}` and `{capabilities: {tools: {}}}`.
- Register `tools/list` handler: iterate `getMcpTools()`, return `{tools: [{name, description, inputSchema}]}`.
- Register `tools/call` handler: look up tool by `request.params.name` in registry. If not found, throw `McpError(ErrorCode.MethodNotFound)`. Otherwise, call `dispatch(toolDef, request.params.arguments)`. Format the `EnrichedEnvelope` as MCP content: `[{type: "text", text: JSON.stringify(envelope)}]`. Set `isError` to `!envelope.ok`.
- Connect via `StdioServerTransport` (FR-MCP-0001).

Traces: FR-MCP-0001 through FR-MCP-0004.

---

## 10. Entry Point -- `src/bin/rosettify.ts`

```typescript
#!/usr/bin/env node

import { runCli } from "../frontends/cli.js";
import { runMcp } from "../frontends/mcp.js";

const args = process.argv.slice(2);

if (args.includes("--mcp")) {
  // Remove --mcp from args, verify no command args remain
  const filtered = args.filter((a) => a !== "--mcp");
  if (filtered.length > 0) {
    process.stderr.write(
      JSON.stringify({ ok: false, error: "--mcp is mutually exclusive with commands", result: null, include_help: false }) + "\n"
    );
    process.exit(1);
  }
  await runMcp();
} else {
  await runCli(args);
}
```

---

## 11. Package Configuration

### 11.1 package.json (FR-PKG-0001, FR-PKG-0002, NFR-STAB-0001, NFR-STAB-0002)

```json
{
  "name": "rosettify",
  "version": "0.1.0",
  "description": "Unified tool runner for Rosetta with dual CLI/MCP frontend",
  "license": "Apache-2.0",
  "type": "module",
  "bin": {
    "rosettify": "./dist/bin/rosettify.js"
  },
  "main": "./dist/registry/index.js",
  "exports": {
    ".": "./dist/registry/index.js",
    "./types": "./dist/registry/types.js"
  },
  "files": ["dist", "LICENSE", "README.md"],
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "commander": "^14.0.3",
    "@modelcontextprotocol/sdk": "^1.29.0",
    "pino": "^10.3.1"
  },
  "devDependencies": {
    "typescript": "^6.0.0",
    "vitest": "^4.1.2"
  }
}
```

### 11.2 tsconfig.json (FR-PKG-0003)

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 11.3 tsconfig.build.json

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "tests", "**/*.test.ts"]
}
```

### 11.4 vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.e2e.test.ts"],
    globals: false,
  },
});
```

### 11.5 .gitignore

```
node_modules/
dist/
*.log
.DS_Store
```

---

## 12. Error Code Catalog (FR-PLAN-0021)

Complete catalog of all error codes returned by run delegates. All returned via the common envelope (`ok: false`).

| Error Code | Trigger | include_help |
|---|---|---|
| `plan_not_found` | plan_file does not exist (read ops) | false |
| `target_not_found` | target_id not found in plan | false |
| `invalid_target` | update_status on "entire_plan" | false |
| `invalid_status: <value>` | status value not in enum | false |
| `missing_new_status` | update_status without new_status param | true |
| `missing_id` | phase in upsert array without id field | false |
| `phase_not_found` | phase_id for new step does not exist | false |
| `phase_status_is_derived` | update_status targeting a phase | false |
| `missing_phase_id` | new step upsert without phase_id | true |
| `missing_kind` | new item upsert without kind | true |
| `invalid_kind` | kind not "phase" or "step" | true |
| `immutable_id` | patch data id differs from target_id | false |
| `duplicate_id` | non-unique IDs after mutation | false |
| `unknown_dependency` | depends_on references non-existent ID | false |
| `dependency_cycle` | circular dependency detected | false |
| `size_limit_exceeded` | constants violated | false |
| `invalid_data` | malformed data payload | true |
| `missing_data` | data parameter absent | true |
| `invalid_limit` | negative limit in next | true |
| `concurrent_write_conflict` | optimistic retry exhausted | false |
| `unknown_command: <cmd> \| valid: ...` | unrecognized subcommand | true |
| `internal_error: <message>` | uncaught exception in delegate | false |

---

## 13. Test Strategy Overview

Detailed test plans per file are in rosettify-PLAN.md. High-level structure:

- **Unit tests** (`tests/unit/`): call run delegates and shared functions directly. No subprocess, no I/O. Use temp dirs per describe block. Cover all error codes, all subcommand result shapes, merge/status/validate logic.
- **E2E CLI tests** (`tests/e2e/cli.e2e.test.ts`): spawn `node dist/bin/rosettify.js` as subprocess. Verify JSON stdout, exit codes, help output (NFR-INT-0004).
- **E2E MCP tests** (`tests/e2e/mcp.e2e.test.ts`): spawn `node dist/bin/rosettify.js --mcp` as subprocess. Connect as MCP client over stdio. Verify ListTools, CallTool, error handling (NFR-INT-0003).
- **Fixtures** (`tests/fixtures/plans.ts`): `fullPlan()` factory returning a typed two-phase, three-step plan. Additional fixtures for edge cases.

---

## 14. Reference Source Files

The following files in this repository are reference implementations to reuse during implementation. Requirements are newer and request more than what the reference code implements. The reference code is for **reference and reuse**, not wholesale copy-paste.

| File | Description |
|---|---|
| `ims-mcp-server/ims_mcp/tools/plan_manager.py` | Original Python implementation |
| `ims-mcp-server/ims_mcp/tools/validation.py` | Common verifications (validation helpers) |
| `instructions/r2/core/skills/plan-manager/assets/plan_manager.js` | Rewrite of original with improvements |
| `instructions/r2/core/skills/plan-manager/assets/plan_manager.test.js` | Rewrite tests |

---

## 15. Requirements Traceability Matrix

| Requirement | Spec Section |
|---|---|
| FR-ARCH-0001 | 4 (Registry) |
| FR-ARCH-0002 | 4, 7.1, 8, 9 |
| FR-ARCH-0003 | 2 (Directory structure) |
| FR-ARCH-0004 | 3.1 (RunDelegate), 5.3 |
| FR-ARCH-0005 | 3.1 (ToolDef), 4 |
| FR-ARCH-0006 | 5.2, 5.3 |
| FR-ARCH-0007 | 3.2 (result types with next_steps) |
| FR-ARCH-0008 | 3.5, 8, 9, 10 |
| FR-ARCH-0009 | 8.2 |
| FR-ARCH-0010 | 3.5 |
| FR-ARCH-0011 | 3.1 (RunEnvelope), 3.4 |
| FR-ARCH-0012 | 3.1 (EnrichedEnvelope), 7.1 |
| FR-ARCH-0013 | 7 (Shared Module) |
| FR-PLAN-0001 | 3.2 (Plan/Phase/Step) |
| FR-PLAN-0002 | 3.2 (Status, VALID_STATUSES) |
| FR-PLAN-0003 | 5.7 (computeStatusFromChildren) |
| FR-PLAN-0004 | 5.7 (depsSatisfied), 5.5 (validateDependencies) |
| FR-PLAN-0005 | 3.3 (constants), 5.5 (validateSizeLimits) |
| FR-PLAN-0010 | 5.4 (create) |
| FR-PLAN-0011 | 5.4 (next) |
| FR-PLAN-0012 | 5.4 (update_status) |
| FR-PLAN-0013 | 5.4 (show_status) |
| FR-PLAN-0014 | 5.4 (query) |
| FR-PLAN-0015 | 5.4 (upsert) |
| FR-PLAN-0016 | 5.1, 6 |
| FR-PLAN-0017 | 3.2 |
| FR-PLAN-0018 | 5.1 (inputSchema), 6 |
| FR-PLAN-0020 | 5.4 (create, upsert) |
| FR-PLAN-0021 | 12 (Error Catalog) |
| FR-PLAN-0022 | 5.3 |
| FR-PLAN-0023 | 5.3 |
| FR-PLAN-0025 | 7.2 |
| FR-HELP-0001 | 6.2 |
| FR-HELP-0002 | 6.2 |
| FR-HELP-0003 | 8.1 |
| FR-CLI-0001 | 8.1 |
| FR-CLI-0002 | 8.1, 10 |
| FR-CLI-0003 | 8.2 |
| FR-CLI-0004 | 8.2 |
| FR-CLI-0005 | 8.3 |
| FR-MCP-0001 | 9.1 |
| FR-MCP-0002 | 9.1 |
| FR-MCP-0003 | 9.1 |
| FR-MCP-0004 | 5.2 (subcommand in schema) |
| FR-PKG-0001 | 11.1 |
| FR-PKG-0002 | 11.1 (bin field) |
| FR-PKG-0003 | 11.2 |
| FR-PKG-0004 | 2 |
| FR-SHRD-0001 | 7.1 |
| FR-SHRD-0002 | 7.1 |
| FR-SHRD-0003 | 7.1 |
| FR-SHRD-0004 | 7.1 |
| FR-SHRD-0005 | 3.5 |
| FR-SHRD-0006 | 7.2 |
| NFR-STAB-0001 | 11.1 |
| NFR-STAB-0002 | 11.1 |
| NFR-REL-0001 | 7.1 (dispatch catch), 8.2 |
| NFR-REL-0002 | 5.4 (create, upsert) |
| NFR-SEC-0001 | (no network code) |
| NFR-SEC-0002 | 11.1 (license) |
| NFR-SEC-0003 | 11.1 (deps) |
| NFR-PORT-0001 | (path module usage throughout) |
| NFR-PERF-0001 | (minimal deps, direct imports) |
| NFR-INT-0001 | PLAN Phase 7 |
| NFR-INT-0002 | 13 |
| NFR-INT-0003 | 13 |
| NFR-INT-0004 | 13 |
