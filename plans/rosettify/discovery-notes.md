# Discovery Notes — rosettify Implementation

plan_name: rosettify
phase: 1 (discovery)
date: 2026-04-05

---

## 1. pre_commit.py Integration Approach

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/scripts/pre_commit.py`

The pre_commit.py follows a simple `Check(name, runner)` dataclass pattern. All checks run sequentially; first non-zero exit aborts the commit. Two checks currently registered: `plugin sync` and `type validation`.

**Exact integration:** Add two new Check entries after the existing ones (or interleaved as appropriate):

```python
ROSETTIFY_DIR = REPO_ROOT / "rosettify"

def run_rosettify_typecheck() -> int:
    """Run tsc --noEmit in rosettify/."""
    npm_path = shutil.which("npm")
    if npm_path:
        return run_command([npm_path, "--prefix", str(ROSETTIFY_DIR), "run", "typecheck"])
    npx_path = shutil.which("npx")
    if npx_path:
        return run_command([npx_path, "--prefix", str(ROSETTIFY_DIR), "tsc", "--noEmit"])
    print("ERROR: No npm/npx found. Install Node.js to validate rosettify types.", file=sys.stderr)
    return 1


def run_rosettify_tests() -> int:
    """Run vitest in rosettify/."""
    npm_path = shutil.which("npm")
    if npm_path:
        return run_command([npm_path, "--prefix", str(ROSETTIFY_DIR), "run", "test"])
    print("ERROR: No npm found. Install Node.js to run rosettify tests.", file=sys.stderr)
    return 1
```

Then extend the `checks` list in `main()`:

```python
checks = [
    Check(name="plugin sync", runner=sync_generated_plugins),
    Check(name="type validation", runner=run_type_validation),
    Check(name="rosettify typecheck", runner=run_rosettify_typecheck),
    Check(name="rosettify tests", runner=run_rosettify_tests),
]
```

**Key constraint:** `run_command` uses `cwd=REPO_ROOT`. The `--prefix` npm flag runs the script inside `rosettify/` without a `cd`. Alternatively, pass `cwd=ROSETTIFY_DIR` to a subprocess directly — but `run_command` is hardcoded to REPO_ROOT. It is safer to define a second helper `run_command_in(cwd, command)` or use `--prefix`. The `--prefix` approach keeps the existing helper intact.

**Gotcha:** `validate-types.sh` only runs mypy (Python type checking). There is no existing Node.js type check mechanism. The rosettify typecheck is purely additive and must not break the Python path.

---

## 2. Test Patterns from plan_manager.test.js

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/instructions/r2/core/skills/plan-manager/assets/plan_manager.test.js`

The test file uses Node's built-in `node:test` + `node:assert/strict`. The new rosettify tests will use **vitest** (TypeScript, ESM), but the structural patterns are directly portable.

### Key patterns to follow:

**a. CLI spawn testing (E2E harness pattern):**
```js
function run(...args) {
  return spawnSync('node', [HELPER, ...args], { encoding: 'utf8', timeout: 8000 });
}
function parse(result) { return JSON.parse(result.stdout); }
```
Port to vitest E2E harness: use `spawnSync` or `execSync` from `node:child_process`, or write a typed wrapper that spawns the built binary.

**b. Isolated temp dirs per describe block:**
```js
let dir;
before(() => { dir = mkTmpDir(); });   // fs.mkdtempSync
after(() => { fs.rmSync(dir, { recursive: true, force: true }); });
```
In vitest: use `beforeAll`/`afterAll` with `mkdtempSync` from `node:fs`. Each describe group gets its own temp dir.

**c. Full plan fixture:**
The `fullPlan()` factory function produces a canonical two-phase, three-step plan. Port as a TypeScript function in a `test/fixtures.ts` file returning a typed plan object.

**d. Response shape contracts tested directly:**
Every test calls `JSON.parse(result.stdout)` and asserts specific fields (`ok`, `error`, `status`, `ready`, `count`, `plan_status`, `progress_pct`, `phase_summary`). The vitest unit tests should call run delegates directly and assert the same fields on the returned TypeScript objects.

**e. Error code coverage (from test file + PLAN.md FR-PLAN-0021):**
All these error codes need tests:
- `plan_not_found`, `target_not_found`, `invalid_target`, `invalid_status`, `missing_new_status`
- `missing_id`, `phase_not_found`, `phase_status_is_derived`, `missing_phase_id`
- `missing_kind`, `invalid_kind`, `immutable_id`, `duplicate_id`
- `unknown_dependency`, `dependency_cycle`, `size_limit_exceeded`
- `invalid_data`, `missing_data`, `invalid_limit`, `concurrent_write_conflict`
- `unknown_command` (with `include_help: true`)

**f. Test organization (12 describe blocks in JS):**
1. mergePatch logic
2. mergeById logic
3. computeStatus / propagateStatuses
4. cmdCreate
5. cmdNext
6. cmdUpdateStatus
7. cmdShowStatus
8. cmdQuery
9. cmdUpsert
10. help command
11. no-args behavior
12. unknown command

Port this same structure to vitest. Add new blocks for:
- common output envelope (FR-ARCH-0011)
- help enrichment (FR-ARCH-0012)
- tool registry
- CLI argument parsing
- MCP tool registration
- Python-ported validations (dependency_cycle, duplicate_id, size_limit_exceeded, etc.)

**g. Important behavioral divergences from JS (new in rosettify):**
- `update_status` on a phase ID now returns `phase_status_is_derived` (JS allowed it)
- `update_status` on `entire_plan` returns `invalid_target`
- `next` surfaces blocked and failed steps (JS did not)
- `upsert` silently strips status fields; returns a `message` field if any were stripped

---

## 3. rosettify/ Directory

**Does not exist yet.** The directory `rosettify/` at repo root is absent — it must be created from scratch as part of implementation.

---

## 4. rosetta-cli/ Structure as Reference Pattern

**File tree (source files only, excluding dist/ and __pycache__):**

```
rosetta-cli/
  pyproject.toml          # package metadata + deps + build system
  MANIFEST.in             # sdist inclusion rules
  README.md
  env.template
  ims_cli.py              # legacy thin wrapper (entry point alias)
  rosetta_cli/
    __init__.py
    __main__.py           # entry point for `python -m rosetta_cli`
    cli.py                # top-level CLI definition (click/argparse equivalent)
    ims_auth.py
    ims_config.py
    ims_publisher.py
    ims_utils.py
    ragflow_client.py
    typing_utils.py
    commands/
      __init__.py
      base_command.py     # abstract base
      cleanup_command.py
      list_command.py
      parse_command.py
      publish_command.py
      verify_command.py
    services/
      __init__.py
      auth_service.py
      dataset_service.py
      document_data.py
      document_service.py
  tests/
    test_cli.py
    test_command_auth_order.py
    test_document_data.py
    test_ims_config_validate.py
    test_packaged_runtime_assumptions.py
    test_publish_domain_scoped_orphan_cleanup.py
    test_ragflow_client_upload_exception_handling.py
```

**Key conventions observed:**
- Package metadata: `pyproject.toml` (for Python). For rosettify: `package.json`.
- Entry point: `__main__.py` (Python). For rosettify: `src/bin/rosettify.ts` compiled to `dist/bin/rosettify.js`.
- Commands in their own submodules: `commands/` directory. Port as `src/commands/` in rosettify.
- Services layer for business logic: `services/`. Port as part of run delegates in rosettify.
- Tests adjacent to source: `tests/` directory. Port as `tests/` in rosettify (vitest).

---

## 5. Python Validation Logic to Port (plan_manager.py)

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/ims-mcp-server/ims_mcp/tools/plan_manager.py`

All constant values confirmed from `/Users/isolomatov/Sources/GAIN/rosetta/ims-mcp-server/ims_mcp/constants.py`:

```
VALID_PLAN_STATUSES = {"open", "in_progress", "complete", "blocked", "failed"}
PLAN_MAX_PHASES = 100
PLAN_MAX_STEPS_PER_PHASE = 100
PLAN_MAX_DEPENDENCIES_PER_ITEM = 50
PLAN_MAX_STRING_LENGTH = 20_000
PLAN_MAX_NAME_LENGTH = 256
```

**Functions to port to TypeScript:**

| Python function | TypeScript equivalent | Notes |
|---|---|---|
| `_merge_patch` | `mergePatch` | RFC 7396, null removes keys |
| `_merge_by_id` | `mergeById` | Returns merged list or error string |
| `_compute_status_from_children` | `computeStatusFromChildren` | Priority: complete > failed > blocked > in_progress > open |
| `_propagate_statuses` | `propagateStatuses` | Mutates plan in place |
| `_find_phase` | `findPhase` | |
| `_find_step` | `findStep` | Returns [phase, step] tuple |
| `_build_step_status_map` | `buildStepStatusMap` | |
| `_build_phase_status_map` | `buildPhaseStatusMap` | |
| `_deps_satisfied` | `depsSatisfied` | |
| `_validate_plan_name` | `validatePlanName` | Max 256 chars |
| `_validate_non_negative_limit` | `validateNonNegativeLimit` | |
| `_validate_immutable_id` | `validateImmutableId` | |
| `_validate_unique_ids` | `validateUniqueIds` | Across phases AND steps |
| `_detect_cycle` | `detectCycle` | DFS, separate phase graph and step graph |
| `_validate_dependencies` | `validateDependencies` | Checks unknown_dependency + dependency_cycle |
| `_validate_size_limits` | `validateSizeLimits` | Walks entire object tree |
| `_finalize_updated_plan` | `finalizeUpdatedPlan` | size → duplicate → deps → propagate |
| `cmd_upsert` | `runUpsert` | Complex: entire_plan vs specific ID |

**New validations in rosettify not in JS (ported from Python):**
- Unique IDs across entire plan (`duplicate_id`)
- Dependency validation: unknown refs (`unknown_dependency`) + cycle detection (`dependency_cycle`)
- Size limits enforcement (`size_limit_exceeded`)
- Immutable ID check (`immutable_id`)
- Phase-only status constraint (`phase_status_is_derived`) — new, not in Python either
- Status field stripping in upsert with `message` field in result

---

## 6. Notable Constraints and Gotchas

**a. ESM-only:** The package is `"type": "module"`. All imports must use `.js` extension in TypeScript source (NodeNext resolution). `require()` is forbidden.

**b. stdin/stdout discipline (FR-ARCH-0008):** This is absolute. No `console.log`, `console.info`, `console.warn` anywhere outside the CLI frontend. Not even in tests. Pino must write to a file only. In MCP mode stdout is the protocol transport — any stray write corrupts it.

**c. Common output envelope (FR-ARCH-0011):** Every run delegate returns `{ok, result, error, include_help}`. This is not what the JS plan_manager returns (it writes directly to stdout). The TypeScript run delegates must return the envelope, not write to stdout.

**d. Subcommand as parameter pattern:** In MCP, `plan` is ONE tool. The `subcommand` field in input schema carries the sub-operation. CLI parses `rosettify plan create ...` and builds `{subcommand: "create", ...}` before calling the run delegate.

**e. update_status step-only constraint:** The JS implementation allows setting phase status directly. The new rosettify DOES NOT — any update_status targeting a phase ID returns `phase_status_is_derived`. Tests must cover this.

**f. upsert status stripping:** When upsert patch data contains status fields on any step or phase, they must be silently removed before merge, and ONE `message` field added to the result (not per-field, a single message regardless of how many were stripped).

**g. next command expansion:** The JS version only returns `in_progress` (resume) and `open` (ready) steps. The new rosettify ALSO surfaces `blocked` and `failed` steps with `previously_blocked` and `previously_failed` flags. This is a deliberate divergence for AI session recovery.

**h. Optimistic concurrency (FR-SHRD-0006):** Every file write must check `updated_at` before persisting. Read → modify → check-updated_at-unchanged → write. If changed, retry up to 3 times. After 3 retries: `{error: "concurrent_write_conflict"}`. The JS implementation does not do this.

**i. Pino logging to file only:** The log file path must be configurable (env var). Default can be `rosettify.log` in the working directory or a temp path. The key requirement: no writes to stdout or stderr from pino.

**j. TypeScript 6 + NodeNext:** `tsc` with `"module": "NodeNext"` requires explicit `.js` extensions on all relative imports in source. This is a common gotcha.

**k. `--mcp` flag mutual exclusion:** `rosettify --mcp plan create` must fail with an error. Commander 14 can enforce this with `.addOption()` + conflict checking.

**l. No gain.json or package.json at repo root:** The repo is not an npm workspace. Each package (rosettify, rosetta-cli, ims-mcp-server) is fully self-contained. rosettify/ will be its own standalone npm package.

---

## 7. Recommended File Structure for rosettify/

```
rosettify/
  package.json                    # ESM, type: module, bin, scripts, deps
  package-lock.json               # committed to SCM (NFR-STAB-0001)
  tsconfig.json                   # strict, NodeNext, ES2024+
  tsconfig.build.json             # extends tsconfig.json, excludes tests
  vitest.config.ts                # vitest config, environment: node
  LICENSE                         # Apache 2.0
  README.md
  src/
    bin/
      rosettify.ts                # CLI entry point (bin field in package.json)
    registry/
      index.ts                    # static tool registry
      types.ts                    # ToolDef, RunEnvelope, etc.
    frontends/
      cli.ts                      # Commander 14 CLI frontend
      mcp.ts                      # MCP stdio frontend (@modelcontextprotocol/sdk)
    commands/
      plan/
        index.ts                  # plan run delegate + tool registration
        create.ts                 # cmdCreate logic
        next.ts                   # cmdNext logic
        update-status.ts          # cmdUpdateStatus logic
        show-status.ts            # cmdShowStatus logic
        query.ts                  # cmdQuery logic
        upsert.ts                 # cmdUpsert logic
        help.ts                   # plan help content
        types.ts                  # Plan, Phase, Step TypeScript interfaces
        validate.ts               # all validation helpers ported from Python
        merge.ts                  # mergePatch, mergeById
        status.ts                 # computeStatus, propagateStatuses
      help/
        index.ts                  # help run delegate + tool registration
    shared/
      dispatch.ts                 # common dispatch: validate → run → enrich
      envelope.ts                 # ok/error envelope types and helpers
      concurrency.ts              # optimistic read-modify-write (FR-SHRD-0006)
      logger.ts                   # pino to file only
      constants.ts                # PLAN_MAX_PHASES, etc.
  tests/
    unit/
      plan/
        create.test.ts
        next.test.ts
        update-status.test.ts
        show-status.test.ts
        query.test.ts
        upsert.test.ts
        merge.test.ts
        status.test.ts
        validate.test.ts
      help/
        help.test.ts
      shared/
        dispatch.test.ts
        concurrency.test.ts
        envelope.test.ts
      registry/
        registry.test.ts
    e2e/
      cli.e2e.test.ts             # NFR-INT-0004: spawn rosettify as subprocess
      mcp.e2e.test.ts             # NFR-INT-0003: spawn rosettify --mcp as subprocess
    fixtures/
      plans.ts                    # fullPlan() and other plan fixtures
  dist/                           # build output (gitignored)
```

**package.json scripts:**
```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "prepublishOnly": "npm run build"
  }
}
```

**pre_commit.py integration:** runs `npm --prefix rosettify/ run typecheck` then `npm --prefix rosettify/ run test`.

---

## 8. Key Files Referenced

- `/Users/isolomatov/Sources/GAIN/rosetta/scripts/pre_commit.py` — integration target
- `/Users/isolomatov/Sources/GAIN/rosetta/validate-types.sh` — Python type validation only (no Node.js checks)
- `/Users/isolomatov/Sources/GAIN/rosetta/instructions/r2/core/skills/plan-manager/assets/plan_manager.test.js` — test pattern reference
- `/Users/isolomatov/Sources/GAIN/rosetta/ims-mcp-server/ims_mcp/tools/plan_manager.py` — Python validations to port
- `/Users/isolomatov/Sources/GAIN/rosetta/ims-mcp-server/ims_mcp/constants.py` — authoritative constant values
- `/Users/isolomatov/Sources/GAIN/rosetta/docs/requirements/rosettify/ARCH.md` — architecture requirements
- `/Users/isolomatov/Sources/GAIN/rosetta/docs/requirements/rosettify/CLI.md` — CLI frontend requirements
- `/Users/isolomatov/Sources/GAIN/rosetta/docs/requirements/rosettify/MCP.md` — MCP frontend requirements
- `/Users/isolomatov/Sources/GAIN/rosetta/docs/requirements/rosettify/PKG.md` — packaging requirements
- `/Users/isolomatov/Sources/GAIN/rosetta/docs/requirements/rosettify/NFR.md` — non-functional requirements
- `/Users/isolomatov/Sources/GAIN/rosetta/docs/requirements/rosettify/SHARED.md` — shared common functionality requirements
- `/Users/isolomatov/Sources/GAIN/rosetta/docs/requirements/rosettify/HELP.md` — help command requirements
- `/Users/isolomatov/Sources/GAIN/rosetta/docs/requirements/rosettify/PLAN.md` — plan command requirements (most complex)
- `/Users/isolomatov/Sources/GAIN/rosetta/rosetta-cli/` — sibling Python package as structural reference
