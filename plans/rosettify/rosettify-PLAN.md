# rosettify -- Execution Plan

plan_name: rosettify
phase: 2 (plan)
date: 2026-04-05
status: Draft
specs_ref: plans/rosettify/rosettify-SPECS.md

---

## Overview

Seven sequential phases. Each phase has numbered steps with IDs, dependencies, and acceptance criteria. Steps within a phase are ordered. Cross-phase dependencies reference the phase ID. All spec section references point to rosettify-SPECS.md.

---

## Phase 1: Project Scaffolding

**Goal:** Create the rosettify/ directory with all config files and empty module structure. After this phase, `npm install` and `tsc --noEmit` succeed on the empty project.

**Depends on:** nothing

### P1-S01: Create directory structure

Create all directories listed in SPECS section 2. No source files yet, only directories.

```
rosettify/src/bin/
rosettify/src/registry/
rosettify/src/frontends/
rosettify/src/commands/plan/
rosettify/src/commands/help/
rosettify/src/shared/
rosettify/tests/unit/plan/
rosettify/tests/unit/help/
rosettify/tests/unit/shared/
rosettify/tests/unit/registry/
rosettify/tests/e2e/
rosettify/tests/fixtures/
```

**Acceptance:** All directories exist.

### P1-S02: Write package.json

Contents per SPECS section 11.1. Exact versions, exact fields.

**Acceptance:** `cat rosettify/package.json | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))"` exits 0. Fields match spec.

### P1-S03: Write tsconfig.json and tsconfig.build.json

Contents per SPECS sections 11.2 and 11.3.

**Acceptance:** Files exist and are valid JSON.

### P1-S04: Write vitest.config.ts

Contents per SPECS section 11.4.

**Acceptance:** File exists.

### P1-S05: Write .gitignore

Contents per SPECS section 11.5.

**Acceptance:** File exists.

### P1-S06: Write LICENSE

Apache 2.0 full text.

**Acceptance:** File exists with Apache 2.0 header.

### P1-S07: Write README.md

Minimal README with package name, one-line description, license badge.

**Acceptance:** File exists.

### P1-S08: Run npm install

Execute `npm install` in rosettify/. Commit package-lock.json.

**Depends on:** P1-S02
**Acceptance:** `node_modules/` populated. `package-lock.json` exists. Exit 0.

### P1-S09: Create stub source files

Create all `.ts` files listed in SPECS section 2 under `src/` with minimal content (single export or empty). Purpose: allow tsc to resolve all imports.

Stubs needed:
- `src/bin/rosettify.ts` -- shebang + placeholder
- `src/registry/types.ts` -- empty interfaces
- `src/registry/index.ts` -- empty registry map
- `src/frontends/cli.ts` -- export async function runCli
- `src/frontends/mcp.ts` -- export async function runMcp
- `src/commands/plan/index.ts` -- export planToolDef stub
- `src/commands/plan/create.ts` -- export cmdCreate stub
- `src/commands/plan/next.ts` -- export cmdNext stub
- `src/commands/plan/update-status.ts` -- export cmdUpdateStatus stub
- `src/commands/plan/show-status.ts` -- export cmdShowStatus stub
- `src/commands/plan/query.ts` -- export cmdQuery stub
- `src/commands/plan/upsert.ts` -- export cmdUpsert stub
- `src/commands/plan/core.ts` -- export stubs for types, merge, status, validate, file I/O
- `src/commands/plan/help-content.ts` -- export planHelpContent stub
- `src/commands/help/index.ts` -- export helpToolDef stub
- `src/shared/dispatch.ts` -- export dispatch stub
- `src/shared/envelope.ts` -- export ok/err stubs
- `src/shared/concurrency.ts` -- export readModifyWrite stub
- `src/shared/logger.ts` -- pino logger instance
- `src/shared/constants.ts` -- all constants

**Depends on:** P1-S03, P1-S08
**Acceptance:** `npm run typecheck` exits 0 (tsc --noEmit passes).

### P1-S10: Verify phase 1 complete

Run `npm run typecheck` and `npm run test` (vitest with no test files should pass or be configured to allow empty). Verify clean state.

**Depends on:** P1-S09
**Acceptance:** Both commands exit 0. `npm run build` produces files in dist/.

---

## Phase 2: Shared Infrastructure

**Goal:** Implement all shared modules (types, envelope, registry, logger, concurrency, constants, dispatch). After this phase, the dispatch pipeline works end-to-end with a mock tool.

**Depends on:** Phase 1

### P2-S01: Implement registry types

Write complete `src/registry/types.ts` per SPECS section 3.1. All interfaces and types.

**Acceptance:** `npm run typecheck` passes. Types match spec exactly.

### P2-S02: Implement plan data types

Write complete `src/commands/plan/types.ts` per SPECS section 3.2. All interfaces.

**Acceptance:** `npm run typecheck` passes.

### P2-S03: Implement shared constants

Write complete `src/shared/constants.ts` per SPECS section 3.3.

**Acceptance:** Constants match values from ims_mcp/constants.py.

### P2-S04: Implement envelope helpers

Write complete `src/shared/envelope.ts` per SPECS section 3.4.

**Acceptance:** `npm run typecheck` passes.

### P2-S05: Implement logger

Write complete `src/shared/logger.ts` per SPECS section 3.5. Pino to file only.

**Acceptance:** `npm run typecheck` passes. No stdout/stderr writes from logger.

### P2-S06: Implement concurrency module

Write complete `src/shared/concurrency.ts` per SPECS section 7.2. The readModifyWrite function with retry logic.

**Depends on:** P2-S04
**Acceptance:** `npm run typecheck` passes.

### P2-S07: Implement dispatch module

Write complete `src/shared/dispatch.ts` per SPECS section 7.1. Input validation, delegate call, help enrichment, exception catch. Include the lightweight `validateInput` function.

**Depends on:** P2-S01, P2-S04
**Acceptance:** `npm run typecheck` passes.

### P2-S08: Implement registry index

Write complete `src/registry/index.ts` per SPECS section 4. Map, getToolDef, getCliTools, getMcpTools. Import from command modules (still stubs at this point).

**Depends on:** P2-S01
**Acceptance:** `npm run typecheck` passes.

### P2-S09: Write unit tests for envelope

`tests/unit/shared/envelope.test.ts`: test ok(), err(), usageErr() return correct shapes.

**Depends on:** P2-S04
**Acceptance:** `npm run test` passes with envelope tests.

### P2-S10: Write unit tests for concurrency

`tests/unit/shared/concurrency.test.ts`: test readModifyWrite with mock ops (success, retry, conflict after max retries).

**Depends on:** P2-S06
**Acceptance:** `npm run test` passes with concurrency tests.

### P2-S11: Write unit tests for dispatch

`tests/unit/shared/dispatch.test.ts`: test dispatch pipeline (valid input, invalid input -> usageErr, delegate exception -> internal_error, include_help enrichment).

**Depends on:** P2-S07
**Acceptance:** `npm run test` passes with dispatch tests.

### P2-S12: Write unit tests for registry

`tests/unit/registry/registry.test.ts`: test getToolDef, getCliTools, getMcpTools, filtering by cli/mcp flags.

**Depends on:** P2-S08
**Acceptance:** `npm run test` passes with registry tests.

### P2-S13: Verify phase 2 complete

All tests green. `npm run typecheck` passes. `npm run test` passes.

**Depends on:** P2-S09, P2-S10, P2-S11, P2-S12
**Acceptance:** All shared infrastructure tests pass. Zero type errors.

---

## Phase 3: Plan Command

**Goal:** Implement all 6 plan subcommands plus help content. After this phase, the plan run delegate is fully functional and all unit tests pass.

**Depends on:** Phase 2

### P3-S01: Implement plan core module

Write `src/commands/plan/core.ts` per SPECS section 5.5. This single file contains all shared plan logic imported by every subcommand file:
- All types (Plan, Phase, Step, Status, PlanInput, all result types) — SPECS section 3.2
- Merge functions: mergePatch (RFC 7396), mergeById
- Status functions: computeStatusFromChildren, propagateStatuses, findPhase, findStep, buildStepStatusMap, buildPhaseStatusMap, depsSatisfied
- Validation functions: validatePlanName (non-empty, non-whitespace, ≤256 chars), validateNonNegativeLimit, validateImmutableId, validateUniqueIds, detectCycle, validateDependencies, validateSizeLimits
- File I/O: loadPlan, savePlan

Reference: `plan_manager.js` (merge + status), `plan_manager.py` + `validation.py` (validation suite), `plan_manager.py` (file I/O pattern).

**Acceptance:** `npm run typecheck` passes. All exports compile without errors.

### P3-S04: Write test fixtures

Write `tests/fixtures/plans.ts` with fullPlan() factory (two-phase, three-step canonical plan), minimal plan, edge case plans.

**Acceptance:** Fixture exports compile.

### P3-S05: Write core tests

`tests/unit/plan/core.test.ts`: covers all exports of `core.ts`:
- mergePatch (null removes, nested merge, scalar replace), mergeById (match, append, missing_id error)
- computeStatusFromChildren (all 6 priority cases + empty), propagateStatuses, findPhase, findStep, depsSatisfied
- All validators: duplicate_id, dependency_cycle (DFS), unknown_dependency, size_limit_exceeded (phases, steps, deps, strings, names), immutable_id, validatePlanName (empty/whitespace/too-long), validateNonNegativeLimit
- loadPlan (missing file returns null), savePlan (creates parent dirs, sets updated_at)

**Depends on:** P3-S01, P3-S04
**Acceptance:** Tests pass. All validator error codes covered.

### P3-S06: Implement cmdCreate

Write `src/commands/plan/create.ts` per SPECS section 5.4 (create). Imports only from `./core.js` + shared modules.

**Depends on:** P3-S01
**Acceptance:** `npm run typecheck` passes.

### P3-S09: Implement cmdNext

Write `src/commands/plan/next.ts` per SPECS section 5.4 (next). Four groups: in_progress, open-with-deps-satisfied, blocked, failed. Phase dep check.

**Depends on:** P3-S01
**Acceptance:** `npm run typecheck` passes.

### P3-S10: Implement cmdUpdateStatus

Write `src/commands/plan/update-status.ts` per SPECS section 5.4 (update_status). Step-only constraint. phase_status_is_derived, invalid_target on entire_plan.

**Depends on:** P3-S01
**Acceptance:** `npm run typecheck` passes.

### P3-S11: Implement cmdShowStatus

Write `src/commands/plan/show-status.ts` per SPECS section 5.4 (show_status). Three target modes (plan, phase, step). progress_pct calculation.

**Depends on:** P3-S01
**Acceptance:** `npm run typecheck` passes.

### P3-S12: Implement cmdQuery

Write `src/commands/plan/query.ts` per SPECS section 5.4 (query).

**Depends on:** P3-S01
**Acceptance:** `npm run typecheck` passes.

### P3-S13: Implement cmdUpsert

Write `src/commands/plan/upsert.ts` per SPECS section 5.4 (upsert). RFC 7396 merge, status stripping, all error paths (11 behaviors listed in spec).

**Depends on:** P3-S01
**Acceptance:** `npm run typecheck` passes.

### P3-S14: Implement plan help content

Write `src/commands/plan/help-content.ts` per SPECS section 5.5 and FR-PLAN-0016/0017/0018. Structured help object with schema, subcommands, constants, examples, authoring guidance.

**Acceptance:** `npm run typecheck` passes.

### P3-S15: Implement plan run delegate and tool def

Write `src/commands/plan/index.ts` per SPECS section 5.1 and 5.3. Dispatch to subcommand functions. No-args -> help. Unknown -> error with include_help.

**Depends on:** P3-S06, P3-S07, P3-S08, P3-S09, P3-S10, P3-S11, P3-S12, P3-S13
**Acceptance:** `npm run typecheck` passes.

### P3-S16: Write cmdCreate tests

`tests/unit/plan/create.test.ts`: success (defaults, timestamps, parent dirs), validation errors (duplicate_id, dependency_cycle, size_limit_exceeded), plan_not_found N/A for create.

**Depends on:** P3-S06, P3-S04
**Acceptance:** Tests pass.

### P3-S17: Write cmdNext tests

`tests/unit/plan/next.test.ts`: four groups ordering, limit, target_id scoping, invalid_limit, plan_not_found, target_not_found, phase dep blocking.

**Depends on:** P3-S09, P3-S04
**Acceptance:** Tests pass.

### P3-S18: Write cmdUpdateStatus tests

`tests/unit/plan/update-status.test.ts`: success + propagation, phase_status_is_derived, invalid_target (entire_plan), target_not_found, invalid_status, missing_new_status, plan_not_found.

**Depends on:** P3-S10, P3-S04
**Acceptance:** Tests pass. All error codes from FR-PLAN-0012 covered.

### P3-S19: Write cmdShowStatus tests

`tests/unit/plan/show-status.test.ts`: entire plan totals + progress_pct, phase view, step view, target_not_found, plan_not_found. progress_pct = round(complete/total * 1000) / 10.

**Depends on:** P3-S11, P3-S04
**Acceptance:** Tests pass.

### P3-S20: Write cmdQuery tests

`tests/unit/plan/query.test.ts`: entire plan, phase, step, target_not_found, plan_not_found.

**Depends on:** P3-S12, P3-S04
**Acceptance:** Tests pass.

### P3-S21: Write cmdUpsert tests

`tests/unit/plan/upsert.test.ts`: all 11 behavior cases from SPECS 5.4 (upsert). Status stripping + message field. RFC 7396 merge. All error codes: missing_id, phase_not_found, missing_kind, invalid_kind, immutable_id, invalid_data, missing_data, missing_phase_id, duplicate_id, unknown_dependency, dependency_cycle, size_limit_exceeded.

**Depends on:** P3-S13, P3-S04
**Acceptance:** Tests pass. This is the most test-dense step.

### P3-S22: Write plan no-args and unknown subcommand tests

Test plan run delegate with no subcommand (returns help), unknown subcommand (returns error with include_help=true, valid commands list).

**Depends on:** P3-S15
**Acceptance:** Tests pass. FR-PLAN-0022, FR-PLAN-0023 covered.

### P3-S23: Verify phase 3 complete

All plan unit tests pass. `npm run typecheck` passes. `npm run test` passes.

**Depends on:** P3-S16 through P3-S22
**Acceptance:** All plan-related tests green. Zero type errors.

---

## Phase 4: Help Command

**Goal:** Implement the help run delegate. After this phase, help works standalone and as enrichment target.

**Depends on:** Phase 2

### P4-S01: Implement help run delegate

Write `src/commands/help/index.ts` per SPECS section 6. Top-level listing (no subcommand), command detail (known subcommand), fallback to top-level (unknown subcommand). Never returns include_help=true.

**Acceptance:** `npm run typecheck` passes.

### P4-S02: Write help tests

`tests/unit/help/help.test.ts`: top-level listing (tool, version, commands array, guidance), command detail (plan -> input_schema, output_schema, subcommands), unknown command fallback, include_help always false.

**Depends on:** P4-S01
**Acceptance:** Tests pass. FR-HELP-0001, FR-HELP-0002 covered.

### P4-S03: Verify phase 4 complete

Help tests pass. `npm run typecheck` and `npm run test` pass.

**Depends on:** P4-S02
**Acceptance:** All help tests green.

---

## Phase 5: CLI Frontend

**Goal:** Implement the commander-based CLI. After this phase, `node dist/bin/rosettify.js plan create '...'` works end-to-end.

**Depends on:** Phase 3, Phase 4

### P5-S01: Implement CLI frontend

Write `src/frontends/cli.ts` per SPECS section 8. Commander 14 setup, subcommand routing, --help interception, JSON output, exit codes.

Key behaviors:
- `rosettify plan create '<json>'` -> build PlanInput -> dispatch -> JSON stdout.
- `rosettify help` -> dispatch help.
- `rosettify --help` -> dispatch help (no subcommand).
- `rosettify plan --help` -> dispatch help (subcommand: plan).
- `rosettify --mcp plan create` -> handled in entry point, not here.

**Acceptance:** `npm run typecheck` passes.

### P5-S02: Implement entry point

Write `src/bin/rosettify.ts` per SPECS section 10. Shebang, --mcp detection, mutual exclusion check, delegation to runCli or runMcp.

**Acceptance:** `npm run typecheck` passes.

### P5-S03: Build and test CLI manually

Run `npm run build`. Execute `node dist/bin/rosettify.js help` and verify JSON output. Execute a plan create and verify file creation.

**Depends on:** P5-S01, P5-S02
**Acceptance:** Manual smoke test passes. JSON on stdout, exit 0 on help, exit 1 on error.

### P5-S04: Write E2E CLI tests

Write `tests/e2e/cli.e2e.test.ts` per SPECS section 13 and NFR-INT-0004. Spawn subprocess, verify stdout JSON, exit codes, help, --help, plan subcommands, error scenarios.

**Depends on:** P5-S03
**Acceptance:** E2E CLI tests pass.

### P5-S05: Verify phase 5 complete

All CLI tests pass. `npm run typecheck` and `npm run test` pass (including E2E).

**Depends on:** P5-S04
**Acceptance:** CLI frontend fully functional with E2E coverage.

---

## Phase 6: MCP Frontend

**Goal:** Implement the MCP stdio server. After this phase, `rosettify --mcp` works as a local MCP server.

**Depends on:** Phase 3, Phase 4

### P6-S01: Implement MCP frontend

Write `src/frontends/mcp.ts` per SPECS section 9. Server class, StdioServerTransport, tools/list handler, tools/call handler, dispatch integration, isError flag.

**Acceptance:** `npm run typecheck` passes.

### P6-S02: Build and test MCP manually

Run `npm run build`. Start `node dist/bin/rosettify.js --mcp` and send a ListTools request via piped stdin. Verify JSON-RPC response.

**Depends on:** P6-S01
**Acceptance:** Manual smoke test passes.

### P6-S03: Write E2E MCP tests

Write `tests/e2e/mcp.e2e.test.ts` per SPECS section 13 and NFR-INT-0003. Spawn subprocess with --mcp, connect as MCP client, verify ListTools, CallTool for plan and help, error scenarios.

**Depends on:** P6-S02
**Acceptance:** E2E MCP tests pass.

### P6-S04: Verify phase 6 complete

All MCP tests pass. `npm run typecheck` and `npm run test` pass (including MCP E2E).

**Depends on:** P6-S03
**Acceptance:** MCP frontend fully functional with E2E coverage.

---

## Phase 7: Integration

**Goal:** Integrate with pre_commit.py and verify the full build. After this phase, the implementation is complete and all pre-commit checks pass.

**Depends on:** Phase 5, Phase 6

### P7-S01: Update pre_commit.py

Modify `scripts/pre_commit.py` per discovery notes section 1. Add `run_rosettify_typecheck()` and `run_rosettify_tests()` functions. Add two Check entries to the checks list.

**Acceptance:** `python scripts/pre_commit.py` runs rosettify typecheck and test checks. Both pass.

### P7-S02: Add dist/ to .gitignore at repo root

Ensure the repo-root .gitignore (if any) ignores `rosettify/dist/` and `rosettify/node_modules/`.

**Acceptance:** `git status` does not show dist/ or node_modules/ as untracked.

### P7-S03: Full build verification

Run the complete sequence:
1. `cd rosettify && npm ci`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. `node dist/bin/rosettify.js help`
6. `node dist/bin/rosettify.js plan create '{"name":"verify"}' --plan_file /tmp/verify-plan.json`
7. `node dist/bin/rosettify.js plan show_status --plan_file /tmp/verify-plan.json`

**Depends on:** P7-S01
**Acceptance:** All 7 steps succeed. stdout is valid JSON. Exit codes are correct.

### P7-S04: Run pre-commit hook end-to-end

Execute `python scripts/pre_commit.py` from repo root with the rosettify changes staged. Verify all checks pass (including the two new rosettify checks).

**Depends on:** P7-S03
**Acceptance:** pre_commit.py exits 0. All checks pass.

### P7-S05: Verify no console.log/console.info anywhere

Grep the entire rosettify/src/ tree for console.log, console.info, console.warn. Zero matches. Verify pino is the only logging mechanism.

**Acceptance:** Zero matches for console.log/info/warn in src/.

### P7-S06: Verify all .js extensions on relative imports

Grep rosettify/src/ for `from "\.` and verify every relative import ends with `.js`.

**Acceptance:** Zero relative imports without .js extension.

### P7-S07: Final validation

Run `npm run typecheck`, `npm run test`, `npm run build` one final time from a clean state (`rm -rf dist && npm run build`). Verify everything is green.

**Depends on:** P7-S03, P7-S04, P7-S05, P7-S06
**Acceptance:** All commands exit 0. The rosettify package is complete.

---

## Dependency Summary

```
Phase 1 (Scaffolding)
  |
  v
Phase 2 (Shared Infrastructure)
  |
  +---> Phase 3 (Plan Command) ---+
  |                                |
  +---> Phase 4 (Help Command) ---+
                                   |
                                   v
                    Phase 5 (CLI Frontend) ---+
                                              |
                    Phase 6 (MCP Frontend) ---+
                                              |
                                              v
                               Phase 7 (Integration)
```

Phases 3 and 4 can be developed in parallel.
Phases 5 and 6 can be developed in parallel (both depend on 3+4 completion).
Phase 7 is the final integration gate.

---

## Acceptance Criteria Summary

| Phase | Key Acceptance |
|---|---|
| 1 | `npm run typecheck` passes on empty stubs. `npm run build` produces dist/. |
| 2 | Shared module unit tests pass. Dispatch pipeline works with mock tool. |
| 3 | All 6 plan subcommand unit tests pass. All error codes from FR-PLAN-0021 tested. |
| 4 | Help unit tests pass. FR-HELP-0001, FR-HELP-0002 covered. |
| 5 | E2E CLI tests pass. JSON stdout, correct exit codes. |
| 6 | E2E MCP tests pass. ListTools, CallTool over stdio. |
| 7 | pre_commit.py passes. Zero console.log. All .js extensions. Full build green. |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| TypeScript 6 breaking changes from TS 5 | Pin ^6.0.0, test early in P1-S08. |
| commander 14 API changes | Check commander 14 changelog in P5-S01. |
| @modelcontextprotocol/sdk 1.29 import paths | Verify exact import paths in P6-S01 against SDK docs. |
| pino 10 file destination API | Verify pino.destination() API in P2-S05. |
| vitest 4 ESM/TS config | Verify vitest 4 ESM support in P1-S04. |
| Optimistic concurrency correctness | Dedicated unit tests in P2-S10 with simulated conflicts. |
| E2E tests flaky on CI | Use generous timeouts, deterministic temp dirs. |
