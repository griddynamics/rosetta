# Envelope Output Transformation -- Execution Plan

plan_name: rosettify/envelope-output
phase: plan
date: 2026-04-22
status: Draft
specs_ref: plans/rosettify/envelope-output-SPECS.md

---

## Overview

Five sequential phases. Each step references the specs document for WHAT; this plan defines HOW, WHERE, and verification. Steps are ordered by dependency. Each step targets one file. Estimated total: 8 steps across 5 phases.

---

## Phase 1: Types and Shared Helpers

**Goal:** Add output payload types and extraction/logging functions. After this phase, `tsc --noEmit` passes and new functions are importable.

**Depends on:** nothing

### P1-S01: Add output payload types to registry/types.ts

**File:** `rosettify/src/registry/types.ts`

**What:** Add three type exports at the end of the file (after `HelpCommandDetail`):
- `SuccessPayload<T>` -- type alias for `T`
- `FailurePayload` -- interface with `error: string` and optional `help`
- `OutputPayload<T>` -- discriminated union `{ ok: true; payload: T } | { ok: false; payload: FailurePayload }`

**How:** Append the types after line 80. Import nothing new -- `HelpTopLevel` and `HelpCommandDetail` are already in the file.

**Verify:** `npx tsc --noEmit` passes. Types are importable from `../registry/types.js`.

**Traces:** SPECS 3.1, FR-ARCH-0014.

### P1-S02: Add extractOutput and logFailure to shared/envelope.ts

**File:** `rosettify/src/shared/envelope.ts`

**What:**
1. Add import for `EnrichedEnvelope`, `OutputPayload`, `FailurePayload` from `../registry/types.js`.
2. Add import for `logger` from `./logger.js`.
3. Add `extractOutput<T>(envelope: EnrichedEnvelope<T>): OutputPayload<T>` function per SPECS 3.2 contract table.
4. Add `logFailure(log, toolName, error, context?)` function per SPECS 3.3 contract table.

**How:**
- `extractOutput`: if `envelope.ok`, return `{ ok: true, payload: envelope.result as T }`. Else build `FailurePayload` with `error` and conditionally `help`, return `{ ok: false, payload }`.
- `logFailure`: check `error.startsWith("internal_error")` to pick `log.error` vs `log.warn`. Log fields: `{ tool: toolName, error, ...context }`, message: `"tool call failed"`.

**Verify:** `npx tsc --noEmit` passes. Functions are importable.

**Traces:** SPECS 3.2, SPECS 3.3, FR-ARCH-0014, FR-SHRD-0007.

---

## Phase 2: Frontend Updates

**Goal:** CLI and MCP frontends use the new helpers. After this phase, output format changes from envelope to payload.

**Depends on:** Phase 1

### P2-S01: Update CLI frontend

**File:** `rosettify/src/frontends/cli.ts`

**What:**
1. Add imports: `extractOutput`, `logFailure` from `../shared/envelope.js`, `logger` from `../shared/logger.js`.
2. Change `writeResult` signature to `writeResult(toolName: string, envelope: EnrichedEnvelope<unknown>): void`.
3. Inside `writeResult`:
   - Call `extractOutput(envelope)` to get `output`.
   - If `!output.ok`: call `logFailure(logger, toolName, envelope.error ?? "unknown")`.
   - `process.stdout.write(JSON.stringify(output.payload, null, 2) + "\n")`.
4. Update every `writeResult(envelope)` call site to `writeResult(toolDef.name, envelope)` where `toolDef` is `planToolDef` or `helpToolDef` -- the tool name is already available at each call site.
5. Update the commander catch block (lines 218-231): change stderr output from envelope shape `{ ok, error, result, include_help }` to simple `{ error: msg }`.

**How:** There are 11 call sites for `writeResult` in cli.ts (lines 57, 76, 95, 112, 129, 158, 167, 174, 178, 189, 197, 211). Each already has the ToolDef in scope -- pass `planToolDef.name` or `helpToolDef.name`.

**Verify:** `npx tsc --noEmit` passes. Manual: `node dist/bin/rosettify.js plan create /tmp/test.json '{"name":"test"}'` outputs `{"plan_file":..., "name":"test", "status":"open"}` without `ok` field.

**Traces:** SPECS 4.1, FR-CLI-0004, FR-SHRD-0007.

### P2-S02: Update MCP frontend

**File:** `rosettify/src/frontends/mcp.ts`

**What:**
1. Add import: `extractOutput`, `logFailure` from `../shared/envelope.js`.
2. In the CallTool handler (lines 41-52):
   - After `dispatch`, call `const output = extractOutput(envelope)`.
   - If `!output.ok`: call `logFailure(logger, toolName, envelope.error ?? "unknown")`.
   - Replace `JSON.stringify(envelope)` with `JSON.stringify(output.payload)`.
   - Keep `isError: !envelope.ok` (or equivalently `!output.ok`).
3. Keep the existing `logger.info` line for successful calls.

**Verify:** `npx tsc --noEmit` passes. MCP E2E test (after update in Phase 3) confirms payload shape.

**Traces:** SPECS 4.2, FR-MCP-0003, FR-SHRD-0007.

---

## Phase 3: Test Updates

**Goal:** All existing tests pass with the new output format. New unit tests added for shared helpers.

**Depends on:** Phase 2

### P3-S01: Add unit tests for extractOutput and logFailure

**File:** `rosettify/tests/unit/shared/envelope.test.ts` (NEW)

**What:** Create new test file with two describe blocks per SPECS 7.1:

`describe("extractOutput")`:
- Test 1: success envelope -> `{ ok: true, payload: result }`
- Test 2: failure without help -> `{ ok: false, payload: { error } }`
- Test 3: failure with help -> `{ ok: false, payload: { error, help } }`
- Test 4: success with null result -> `{ ok: true, payload: null }`
- Test 5: internal_error failure -> `{ ok: false, payload: { error: "internal_error: boom" } }`

`describe("logFailure")`:
- Test 6: non-internal error -> logger.warn called
- Test 7: internal_error -> logger.error called
- Test 8: context fields passed through

For logFailure tests: create a mock logger object with `warn` and `error` as `vi.fn()`. Verify correct method called with expected fields.

**Verify:** `npx vitest run tests/unit/shared/envelope.test.ts` -- all pass.

**Traces:** SPECS 7.1, FR-ARCH-0014, FR-SHRD-0007.

### P3-S02: Update CLI E2E tests

**File:** `rosettify/tests/e2e/cli.e2e.test.ts`

**What:**
1. Remove the `asEnvelope` helper function (lines 66-68).
2. Update all success assertions to use `r.json` directly as the result type instead of `env.result`. For each test:
   - Remove: `const env = asEnvelope(r); expect(env.ok).toBe(true);`
   - Replace: `const res = r.json as { ... };` and assert on `res` fields.
   - Add: `expect((r.json as any).ok).toBeUndefined();` to verify no envelope leakage.
3. Update all failure assertions:
   - Remove: `const env = asEnvelope(r); expect(env.ok).toBe(false);`
   - Replace: `const payload = r.json as { error: string }; expect(payload.error).toContain("...");`
   - Add: `expect((r.json as any).ok).toBeUndefined();`
4. Specific tests to update (all in the file):
   - "help" tests (lines 75-106): `r.json` is the help result directly
   - "plan no args" test (line 114-138): `r.json` is the plan help content directly
   - "plan create" test (lines 146-158): `r.json` is `{ name, status, plan_file }`
   - "plan next" test (lines 188-207): `r.json` is `{ ready, count }` or `{ error }`
   - "plan show_status" test (lines 230-240): `r.json` is `{ name, status }`
   - "plan update_status" tests (lines 265-283): `r.json` is `{ id, status, plan_status }` or error
   - Error cases (lines 290-310): `r.json` is `{ error: "..." }` with `ok` absent

**How:** Systematic find-replace of the `asEnvelope`+`env.ok`+`env.result` pattern. Build before running: `npm run build --prefix rosettify`.

**Verify:** `npm run build --prefix rosettify && npx vitest run tests/e2e/cli.e2e.test.ts` -- all pass.

**Traces:** SPECS 7.2, FR-CLI-0004.

### P3-S03: Update MCP E2E tests

**File:** `rosettify/tests/e2e/mcp.e2e.test.ts`

**What:**
1. Update `callTool()` method (lines 106-128):
   - Change return type: replace `envelope` field with `payload: unknown`.
   - Parse `r.content[0].text` as `payload` (not as envelope).
   - Return `{ content, isError, payload }` instead of `{ content, isError, envelope }`.
   - For JSON-RPC errors (resp.error), return `{ content: [], isError: true, payload: { error: resp.error.message } }`.
2. Update all test assertions:
   - Replace `envelope.ok` checks with `isError` checks.
   - Replace `envelope.result as T` with `payload as T`.
   - Replace `envelope.error` with `(payload as { error: string }).error`.
3. Specific tests to update:
   - "help" tests (lines 190-211): `payload` is the help result directly
   - "plan lifecycle" test (lines 218-316): all `envelope.ok`/`envelope.result` replaced with `isError`/`payload`
   - "plan next with target_id" tests (lines 322-375): same pattern
   - Error cases (lines 382-437): `payload` is `{ error: "..." }`
4. Add negative assertions: `expect((payload as any).ok).toBeUndefined()` on representative tests (at least one success and one failure).

**How:** Systematic replacement. The `callTool` return type change propagates naturally -- TypeScript will flag any missed references.

**Verify:** `npm run build --prefix rosettify && npx vitest run tests/e2e/mcp.e2e.test.ts` -- all pass.

**Traces:** SPECS 7.3, FR-MCP-0003.

---

## Phase 4: Build and Full Test Suite

**Goal:** Full build and all tests pass. No regressions.

**Depends on:** Phase 3

### P4-S01: Full build and test run

**What:**
1. `npm run build --prefix rosettify` -- clean build succeeds.
2. `npx vitest run` (from rosettify/) -- all unit and E2E tests pass.
3. Verify dispatch.test.ts is unchanged and passes (internal contract unaffected).

**Verify:**
- Build exit code 0.
- All test suites pass.
- No TypeScript errors.
- No console warnings.

**Traces:** All requirements (regression gate).

---

## Phase 5: Verification Checklist

**Goal:** Confirm all requirements are met.

**Depends on:** Phase 4

### P5-S01: Manual and automated verification

| Check | Method | Expected |
|---|---|---|
| CLI success output has no `ok` field | E2E test + manual | `(r.json as any).ok === undefined` |
| CLI failure output has `error` field | E2E test | `payload.error` contains error string |
| CLI failure with help has `help` field | E2E test (unknown subcommand) | `payload.help` is defined |
| CLI failure logged at WARN | Unit test + log file inspection | Log file contains WARN entry |
| CLI internal_error logged at ERROR | Unit test | Logger.error called |
| MCP success content has no `ok` field | E2E test | `(payload as any).ok === undefined` |
| MCP failure isError=true | E2E test | `isError === true` |
| MCP failure content has `error` field | E2E test | Payload contains error |
| MCP failure logged | Unit test + log file | Log entry present |
| dispatch.test.ts unchanged and passing | Test run | All pass, no modifications |
| No new dependencies in package.json | Inspection | Unchanged |
| TypeScript strict mode passes | Build | Exit code 0 |

---

## Dependency Graph

```
P1-S01 (types)
  |
  v
P1-S02 (shared helpers) --> depends on P1-S01
  |
  +--> P2-S01 (CLI) --> depends on P1-S02
  |
  +--> P2-S02 (MCP) --> depends on P1-S02
         |
         v
       P3-S01 (unit tests) --> depends on P1-S02
       P3-S02 (CLI E2E)   --> depends on P2-S01
       P3-S03 (MCP E2E)   --> depends on P2-S02
         |
         v
       P4-S01 (full test)  --> depends on P3-S01, P3-S02, P3-S03
         |
         v
       P5-S01 (verify)     --> depends on P4-S01
```

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| E2E test updates miss an assertion | Tests pass but do not verify new contract | Medium | Add negative assertions (`ok` field absent) on every test |
| MCP client compatibility | External MCP clients may have cached envelope parsing | Low | This is internal tooling; no external clients in production |
| Log file not writable in test env | logFailure tests fail on CI | Low | Unit tests mock the logger; E2E tests set ROSETTIFY_LOG to tmpdir |
| Commander error format change breaks scripts | Consumers parsing stderr envelope shape | Low | stderr is for diagnostics only; aligning with payload format is net positive |

---

## Assumptions

1. `npm run build` compiles all source files before E2E tests run (existing CI setup).
2. Vitest config already includes both `tests/unit/` and `tests/e2e/` directories.
3. No external consumers depend on the current envelope output format (internal tool).
