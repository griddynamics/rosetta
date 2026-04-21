# Validation Findings — rosettify (Phase 7: validate-implementation)

Date: 2026-04-05
Validator: Full Validator subagent (claude-sonnet-4-6)
Working directory: /Users/isolomatov/Sources/GAIN/rosetta/rosettify

---

## Summary

| Step | Description | Result |
|------|-------------|--------|
| 1 | Build (npm run build) | PASS |
| 2 | Typecheck (npm run typecheck) | PASS |
| 3 | help command | PASS |
| 4 | help plan subcommand | PASS |
| 5 | plan create | PASS |
| 6 | plan next | PASS |
| 7 | plan update_status | PASS |
| 8 | plan show_status | PASS |
| 9 | Error: plan_not_found | PASS |
| 10 | Error: invalid_status (format deviation) | PARTIAL — functional, wrong error key |
| 11 | Error: unknown subcommand (JSON envelope missing) | FAIL |
| 12 | MCP mode startup | PASS |
| 13 | IO discipline (no console.log, stdout discipline) | PASS |
| 14 | Cleanup | PASS |

Overall verdict: **CONDITIONAL PASS** — 2 deviations from spec, both in error handling paths. Core functionality is fully working. Issues documented below with recommended fixes.

---

## Step-by-step Results

### Step 1: Build

```
npm run build
```

Output: clean exit, no errors.
Result: PASS

### Step 2: Typecheck

```
npm run typecheck
```

Output: clean exit, no errors.
Result: PASS

### Step 3: help command

```
node dist/bin/rosettify.js help
```

Output (abbreviated):
```json
{
  "ok": true,
  "result": {
    "tool": "rosettify",
    "version": "0.1.0",
    "commands": [ ... ],
    "guidance": "use 'help <command>' for details"
  },
  "error": null,
  "include_help": false
}
```

Valid JSON envelope with ok:true. No extra output.
Result: PASS

### Step 4: help plan subcommand

```
node dist/bin/rosettify.js help plan
```

Output: JSON envelope with full plan help including subcommands, input_schema, output_schema.
Result: PASS

### Step 5: plan create

```
node dist/bin/rosettify.js plan create /tmp/rosettify-test/plan.json '{"name":"Test","phases":[...]}'
```

Output:
```json
{
  "ok": true,
  "result": {
    "plan_file": "/tmp/rosettify-test/plan.json",
    "name": "Test",
    "status": "open"
  },
  "error": null,
  "include_help": false
}
```

Matches spec exactly.
Result: PASS

### Step 6: plan next

```
node dist/bin/rosettify.js plan next /tmp/rosettify-test/plan.json
```

Output:
```json
{
  "ok": true,
  "result": {
    "ready": [{"id":"s1","name":"Step 1","prompt":"Do step 1","status":"open","depends_on":[],"phase_id":"p1","phase_name":"Phase 1"}],
    "count": 1,
    "plan_status": "open"
  },
  "error": null,
  "include_help": false
}
```

Result: PASS

### Step 7: plan update_status

```
node dist/bin/rosettify.js plan update_status /tmp/rosettify-test/plan.json s1 complete
```

Output:
```json
{
  "ok": true,
  "result": {
    "id": "s1",
    "status": "complete",
    "plan_status": "complete"
  },
  "error": null,
  "include_help": false
}
```

Result: PASS

### Step 8: plan show_status

```
node dist/bin/rosettify.js plan show_status /tmp/rosettify-test/plan.json
```

Output:
```json
{
  "ok": true,
  "result": {
    "name": "Test",
    "status": "complete",
    "phases": {"open":0,"in_progress":0,"complete":1,"blocked":0,"failed":0,"total":1,"progress_pct":100},
    "steps":  {"open":0,"in_progress":0,"complete":1,"blocked":0,"failed":0,"total":1,"progress_pct":100},
    "phase_summary": [{"id":"p1","name":"Phase 1","status":"complete","steps":[...]}]
  },
  "error": null,
  "include_help": false
}
```

All required fields present.
Result: PASS

### Step 9: Error handling — plan_not_found

```
node dist/bin/rosettify.js plan next /tmp/nonexistent/plan.json
```

Output:
```json
{
  "ok": false,
  "result": null,
  "error": "plan_not_found",
  "include_help": false
}
```
Exit code: 1
Result: PASS

### Step 10: Error handling — invalid_status

```
node dist/bin/rosettify.js plan update_status /tmp/rosettify-test/plan.json s1 done
```

Expected: `{ok:false, error:"invalid_status: done"}`

Actual:
```json
{
  "ok": false,
  "result": null,
  "error": "field new_status must be one of: open, in_progress, complete, blocked, failed",
  "include_help": true
}
```
Exit code: 1

Root cause: The dispatch layer validates the `new_status` field against the JSON Schema enum BEFORE the command runs. The schema enum for `new_status` in the tool's input_schema catches `"done"` at the dispatch validation layer, producing a schema validation message. The `update-status.ts` command itself does have `return err("invalid_status: done")` but it is never reached because schema validation fires first.

Severity: LOW. The error is functional (ok:false, exit 1, descriptive message, help included). The exact error key differs from spec.

Result: PARTIAL (functional but wrong error key format)

### Step 11: Error handling — unknown subcommand with help enrichment

```
node dist/bin/rosettify.js plan explode /tmp/rosettify-test/plan.json
```

Expected: `{ok:false, error:"unknown_command: ...", help:{...}}` on stdout, exit 1

Actual (stderr):
```
error: too many arguments for 'plan'. Expected 0 arguments but got 2.
```
Exit code: 1

Root cause: commander.js interprets `explode` as an unrecognized first argument to the `plan` parent command (since no subcommand named `explode` exists). Commander fires its own error handler before reaching the try/catch in `cli.ts`. The `.exitOverride()` is not set on the program, so commander calls `process.exit(1)` directly with its raw text error output.

Same issue for top-level unknown commands:
```
node dist/bin/rosettify.js unknown_top
```
Produces: `error: unknown command 'unknown_top'` (stderr, no JSON).

Severity: MEDIUM. The JSON envelope contract is broken for unknown subcommands. AI callers parsing JSON stdout will get no output. The error goes to stderr as raw text. Help enrichment does not happen.

Result: FAIL

### Step 12: MCP mode startup

```
perl -e 'alarm 2; exec @ARGV' node dist/bin/rosettify.js --mcp
```

Exit: 142 (SIGALRM — process was running cleanly until killed by alarm).

Note: `timeout` command is not available on this macOS without GNU coreutils. Used perl alarm workaround. Process started and ran without crash.

Result: PASS (timeout exit is expected and acceptable)

### Step 13: IO discipline

```
grep -r "console\." src/
```
Result: No matches. CLEAN.

```
grep -r "process\.stdout\." src/ | grep -v "frontends/"
```
Result: No matches outside frontends/. CLEAN.

Logger (src/shared/logger.ts) writes to file only (pino destination). No stderr/stdout pollution from logging.

Result: PASS

### Step 14: Cleanup

```
rm -rf /tmp/rosettify-test
```

Result: PASS

---

## Issues Found

### ISSUE-1 (MEDIUM): Unknown subcommand does not produce JSON envelope

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/src/frontends/cli.ts`

**Symptom:** `plan explode <args>` and `unknown_top_cmd` produce raw commander text errors on stderr, not JSON envelopes on stdout.

**Root cause:** commander.js calls its own error handler before the try/catch in `runCli()`. The program does not call `.exitOverride()` which would convert commander errors to thrown exceptions catchable by the try/catch.

**Fix:** Add `.exitOverride()` to both `program` and `planCmd`, then wrap `program.parseAsync()` catch to intercept `CommanderError` and emit a JSON envelope with `unknown_command` error code and help enrichment.

```typescript
// Example fix in runCli():
program.exitOverride();
planCmd.exitOverride();

try {
  await program.parseAsync(["node", "rosettify", ...args]);
} catch (e) {
  if (e instanceof CommanderError) {
    const envelope = {
      ok: false,
      result: null,
      error: `unknown_command: ${e.message}`,
      include_help: true,
      help: { ... }  // enrich with help
    };
    process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
    process.exit(1);
  }
  // existing handling...
}
```

### ISSUE-2 (LOW): invalid_status error key differs from spec

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/src/shared/dispatch.ts` (line 59-61)

**Symptom:** `update_status ... s1 done` returns `"field new_status must be one of: ..."` instead of `"invalid_status: done"`.

**Root cause:** The dispatch layer's schema validation fires before the command handler. The `new_status` field is in the input_schema enum. The command's own `invalid_status:` error code is unreachable via CLI for invalid values.

**Options:**
1. Accept current behavior (schema validation message is descriptive and correct).
2. Remove `new_status` from input_schema enum (move validation inside the command handler so it can return the expected `invalid_status:` code).
3. Update the spec to match current behavior.

Option 1 or 3 requires no code change. Option 2 produces the exact error code from spec.

---

## Verdict

**CONDITIONAL PASS**

Core functionality is complete and correct:
- Build and typecheck are clean
- All happy-path plan operations work correctly (create, next, update_status, show_status)
- plan_not_found error handling is correct
- MCP mode starts without crash
- IO discipline is clean (no console.log, no stdout pollution)

Issues:
- ISSUE-1 (MEDIUM): Unknown subcommand bypasses JSON envelope contract — fix recommended before shipping
- ISSUE-2 (LOW): invalid_status error key differs from spec — acceptable as-is or fix if strict contract compliance required
