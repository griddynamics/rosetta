# Implementation Review Findings -- rosettify

plan_name: rosettify
phase: 6 (review-implementation)
date: 2026-04-05
reviewer: Claude (static inspection)

---

## Architecture

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| A1 | No console.log/info/warn anywhere in src/ | **PASS** | Grep confirms zero hits. All logging goes through `shared/logger.ts` (pino). |
| A2 | No process.stdin/process.stdout outside frontends | **PASS** | `process.stdout` only in `frontends/cli.ts` line 10. `process.stderr` only in `frontends/cli.ts` and `bin/rosettify.ts`. No usage in commands/ or shared/. |
| A3 | All relative imports use .js extension | **PASS** | Grep for relative imports without `.js` suffix returned zero matches. |
| A4 | Run delegates are pure (no I/O) | **PASS (with caveat)** | Run delegates themselves contain no direct `console`, `process.stdin/stdout`, or `fetch` calls. They do call `loadPlan`/`savePlan` from `core.ts` which use `fs` -- this is by spec design (section 5.5). File I/O is the intended side effect. |
| A5 | Single typed input object (PlanInput) for plan run delegate | **PASS** | `runPlan` in `index.ts` accepts `PlanInput` (defined in `core.ts` lines 61-70). CLI and MCP both construct this shape. |

---

## Plan Command Behaviors

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| B1 | create: defaults, timestamps, parent dirs, all validations before write | **PASS** | `create.ts`: defaults name to "Unnamed Plan", status to "open", depends_on to []. Timestamps set (line 21). `savePlan` calls `fs.mkdirSync(dir, {recursive:true})`. Validates uniqueIds, dependencies, sizeLimits before savePlan. |
| B2 | next: 4 groups ordering, limit, target_id scoping, invalid_limit | **PASS** | `next.ts`: Groups are in_progress, openReady, blocked, failed (lines 35-38, concatenated line 70). Limit applied via `.slice(0, limit)`. target_id scoping filters phases (line 42). Negative limit returns `err("invalid_limit", true)` (line 21). |
| B3 | update_status: step-only, phase_status_is_derived, invalid_target, missing_new_status | **PASS** | `update-status.ts`: `entire_plan` returns `err("invalid_target")` (line 21). Missing `new_status` returns `err("missing_new_status", true)` (line 23). Phase target returns `err("phase_status_is_derived")` (line 34). Status validated against VALID_STATUSES (line 25). |
| B4 | show_status: entire_plan with StatusTotals+progress_pct, phase detail, step detail | **PASS** | `show-status.ts`: Entire plan computes phase and step StatusTotals with `progress_pct = Math.round(complete/total * 1000) / 10` (line 31-33). Phase returns steps summary. Step returns detail with optional subagent fields. |
| B5 | query: full JSON of plan/phase/step | **PASS** | `query.ts`: Returns full plan object for entire_plan, phase object, or step object. Target not found returns `err("target_not_found")`. |
| B6 | upsert: status field stripping, all 11 behaviors, RFC 7396 | **PASS** | `upsert.ts`: `stripStatusFields` recursively strips `status` from data including nested phases/steps. Single message when stripped (line 64-66). `mergePatch` implements RFC 7396 (null removes keys). `mergeById` handles array merging by id. New items require `kind`. Immutable ID validation present. Post-merge validations run. |
| B7 | No-args plan: returns help content | **PASS** | `index.ts` line 25-28: No subcommand returns `ok(planHelpContent)`. |
| B8 | Unknown subcommand: correct error format with include_help:true | **PASS** | `index.ts` line 31-35: Returns `err("unknown_command: <cmd> | valid: create, next, update_status, show_status, query, upsert", true)`. The `true` parameter sets `include_help: true`. |

---

## Shared Infrastructure

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| C1 | concurrency: read->check updated_at->write, 3 retries, concurrent_write_conflict | **PASS (implementation exists)** | `concurrency.ts`: Implements read->modify->re-read->check updated_at->write pattern. Uses `MAX_CONCURRENCY_RETRIES` (default 3). Returns `err("concurrent_write_conflict")` on exhaustion. |
| C1a | concurrency: actually used by commands | **FAIL** -- Severity: **MEDIUM** | `readModifyWrite` is defined but **never called**. All commands (`create.ts`, `update-status.ts`, `upsert.ts`) call `loadPlan`/`savePlan` directly without the concurrency wrapper. The spec (section 5.4) states: "Writes via optimistic concurrency (FR-SHRD-0006)" for update_status and upsert. For create, the spec notes "no prior updated_at check needed" but still mentions concurrency. This is dead code and a spec deviation. |
| C2 | dispatch: validate->run->enrich pipeline, exception catch->internal_error | **PASS** | `dispatch.ts`: Step 1 validates input (line 74). Step 2 calls `tool.run()` with try/catch returning `internal_error` (lines 81-87). Step 3 enriches with help if `include_help` is true (lines 90-103). Outer catch returns `internal_error` (lines 106-111). |
| C3 | help enrichment: include_help=true triggers help call and merges as .help field | **PASS** | `dispatch.ts` lines 90-103: When `envelope.include_help === true`, calls `helpToolDef.run({subcommand: tool.name})` and merges as `envelope.help`. |

---

## Help Command

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| D1 | No subcommand: top-level listing with tool/version/commands/guidance | **PASS** | `help/index.ts` lines 25-37: Returns `{tool: "rosettify", version, commands: [{name, brief}...], guidance: "use 'help <command>' for details"}`. |
| D2 | Known subcommand: full detail with schemas | **PASS** | `help/index.ts` lines 41-66: Returns `{name, brief, description, input_schema, output_schema, subcommands?}`. Plan subcommand includes subcommands list from help-content. |
| D3 | Unknown subcommand: falls back to top-level, ok:true, never include_help:true | **PASS** | `help/index.ts` lines 69-81: Falls back to top-level listing via `ok()` which sets `include_help: false`. |

---

## CLI Frontend

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| E1 | --mcp flag starts MCP server | **PASS** | Handled in `bin/rosettify.ts` lines 8-22. If `--mcp` with no other args, calls `runMcp()`. `cli.ts` also defensively rejects `--mcp` if it reaches there. |
| E2 | --help converted to help invocation (JSON output) | **PASS** | `cli.ts` lines 188-206: Root `--help` dispatches to help with no subcommand. `plan --help` dispatches to help with `{subcommand: "plan"}`. Output is JSON via `writeResult`. |
| E3 | Exit 0 on success, exit 1 on error | **PASS** | All action handlers: `process.exit(envelope.ok ? 0 : 1)`. Help command always exits 0 (line 184). |
| E4 | stdout is single JSON only | **PASS** | `writeResult` (line 9-11) writes `JSON.stringify(envelope, null, 2) + "\n"` to stdout. No other stdout writes. Note: spec says `JSON.stringify(envelope) + "\n"` (no pretty-print); implementation uses `null, 2` for readability. This is a minor cosmetic deviation. |

---

## MCP Frontend

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| F1 | Low-level Server class with setRequestHandler | **PASS** | `mcp.ts` line 1: imports `Server` from `@modelcontextprotocol/sdk/server/index.js`. Uses `server.setRequestHandler` for both list and call (lines 20, 30). |
| F2 | tools/list from registry getMcpTools() | **PASS** | `mcp.ts` lines 20-27: Handler for `ListToolsRequestSchema` calls `getMcpTools()` and maps to `{name, description, inputSchema}`. |
| F3 | tools/call dispatches through common dispatch | **PASS** | `mcp.ts` line 41: Calls `dispatch(toolDef, request.params.arguments ?? {})`. |
| F4 | Unknown tool -> MCP MethodNotFound | **PASS** | `mcp.ts` lines 34-38: `throw new McpError(ErrorCode.MethodNotFound, ...)`. |

---

## pre_commit.py Integration

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| G1 | Two new Check entries added (typecheck + test) | **PASS** | `scripts/pre_commit.py` lines 188-189: `Check("rosettify typecheck", ...)` and `Check("rosettify tests", ...)` added. Both run npm commands with `--prefix rosettify`. |

---

## Additional Findings

### Finding F1: Concurrency wrapper is dead code (MEDIUM)

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/src/shared/concurrency.ts`

The `readModifyWrite` function is fully implemented but never imported or called by any command. All write operations (`create`, `update_status`, `upsert`) use `loadPlan`/`savePlan` directly. The spec (section 5.4, FR-SHRD-0006) requires optimistic concurrency for `update_status` and `upsert`.

**Recommendation:** Either wire `readModifyWrite` into `update_status` and `upsert`, or document the intentional simplification. For `create`, direct write is acceptable per spec.

### Finding F2: CLI stdout pretty-prints JSON (LOW)

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/src/frontends/cli.ts`, line 10

The spec (section 8.2) says `JSON.stringify(envelope) + "\n"` but the implementation uses `JSON.stringify(envelope, null, 2) + "\n"`. This is functionally equivalent and arguably better for human readability, but deviates from spec.

**Recommendation:** No action needed unless strict spec compliance is required.

### Finding F3: Types co-located in core.ts instead of separate types.ts (LOW)

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/src/commands/plan/core.ts`

The spec directory structure (section 2) shows `core.ts` housing types, and section 3.2 header says "Plan Data Types -- `src/commands/plan/types.ts`". The implementation puts everything in `core.ts`. This is a minor structural deviation; all types are correctly exported and accessible.

**Recommendation:** Acceptable. The co-location in `core.ts` is consistent with what section 5.5 describes.

---

## Summary

| Category | Pass | Fail | Total |
|----------|------|------|-------|
| Architecture | 5 | 0 | 5 |
| Plan commands | 8 | 0 | 8 |
| Shared infra | 3 | 1 | 4 |
| Help command | 3 | 0 | 3 |
| CLI frontend | 4 | 0 | 4 |
| MCP frontend | 4 | 0 | 4 |
| pre_commit.py | 1 | 0 | 1 |
| **Total** | **28** | **1** | **29** |

---

## Overall Verdict: APPROVE WITH FIXES NEEDED

The implementation is well-structured and faithfully follows the spec across all major dimensions. One medium-severity issue requires attention:

1. **MEDIUM -- C1a:** The optimistic concurrency wrapper (`readModifyWrite`) is dead code. Commands bypass it and write directly. This should be wired in for `update_status` and `upsert` per FR-SHRD-0006, or an explicit decision to defer should be documented.

Two low-severity observations are noted for awareness but do not block approval.
