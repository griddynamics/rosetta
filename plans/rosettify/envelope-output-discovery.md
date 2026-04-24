# Envelope Output Transformation Discovery Notes

**Date:** 2026-04-22  
**Scope:** Implement FR-ARCH-0014, FR-CLI-0004, FR-MCP-0003, and FR-SHRD-0007 for rosettify frontends  
**Status:** Discovery Complete

---

## 1. Current Behavior: Frontends Currently Expose Full Envelope

### CLI Frontend (`rosettify/src/frontends/cli.ts`)

**Current output mechanism (lines 9–11):**

```typescript
function writeResult(envelope: EnrichedEnvelope<unknown>): void {
  process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
}
```

**What is currently output to stdout:**

```json
{
  "ok": true,
  "result": {
    "plan_file": "plan.json",
    "name": "Test Plan",
    "status": "open"
  },
  "error": null,
  "include_help": false,
  "help": null
}
```

On failure:

```json
{
  "ok": false,
  "result": null,
  "error": "plan_not_found",
  "include_help": false
}
```

With usage error + help:

```json
{
  "ok": false,
  "result": null,
  "error": "unknown_command: badsubcmd | valid: create, next, show_status, update_status, query, upsert",
  "include_help": true,
  "help": {
    "name": "plan",
    "brief": "...",
    "description": "...",
    "input_schema": {...},
    "output_schema": {...},
    "subcommands": [...]
  }
}
```

**Problem:** The full envelope (ok, result, error, include_help, help) is serialized. Consumers must unwrap it.

---

### MCP Frontend (`rosettify/src/frontends/mcp.ts`)

**Current output mechanism (lines 41–52):**

```typescript
const envelope = await dispatch(toolDef, request.params.arguments ?? {});
logger.info({ tool: toolName, ok: envelope.ok }, "mcp tool call");

return {
  content: [
    {
      type: "text" as const,
      text: JSON.stringify(envelope),  // <-- FULL ENVELOPE
    },
  ],
  isError: !envelope.ok,
};
```

**What is currently output via MCP CallToolResult content:**

On success:

```json
{
  "ok": true,
  "result": {...},
  "error": null,
  "include_help": false
}
```

On failure:

```json
{
  "ok": false,
  "result": null,
  "error": "plan_not_found",
  "include_help": false
}
```

**Problem:** Full envelope is JSON-serialized into MCP content text. MCP clients must unwrap.

---

## 2. Required Change: Transform Envelope Before Output

### FR-ARCH-0014 Transformation Rules

**For CLI and MCP frontends:**

1. **Success case (ok=true):**
   - Extract and output **only** the `result` field
   - Do NOT include ok, error, include_help, help

2. **Failure case (ok=false):**
   - Extract and output a sanitized payload containing:
     - The `error` string
     - The `help` field if present (from enrichment)
   - Do NOT include ok, result, include_help
   - No stack traces, internal paths, security-sensitive details

3. **Logging requirement (FR-SHRD-0007):**
   - Before output is written, log the failure via `logger`
   - Log level: ERROR if error starts with "internal_error:", else WARN
   - Include: tool name, error string, safe diagnostic context

---

### Expected Output After Transformation

**CLI success:**

```json
{
  "plan_file": "plan.json",
  "name": "Test Plan",
  "status": "open"
}
```

**CLI failure (runtime error):**

```json
{
  "error": "plan_not_found"
}
```

**CLI failure (usage error with help):**

```json
{
  "error": "unknown_command: badsubcmd | valid: create, next, show_status, update_status, query, upsert",
  "help": {
    "name": "plan",
    "brief": "...",
    "description": "...",
    "input_schema": {...},
    "output_schema": {...},
    "subcommands": [...]
  }
}
```

**MCP success (content text):**

```json
{
  "plan_file": "plan.json",
  "name": "Test Plan",
  "status": "open"
}
```

**MCP failure (content text, isError=true):**

```json
{
  "error": "plan_not_found"
}
```

---

## 3. Affected Files: Source Code

### 3.1 Frontends (Primary Changes)

| File | Current | Required Change | Complexity |
|------|---------|-----------------|------------|
| `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/src/frontends/cli.ts` | `writeResult()` outputs full envelope | Transform envelope: extract result on ok=true, error+help on ok=false. Log failures via logger before output. | **HIGH** – Need new extraction logic, failure logging, error handling |
| `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/src/frontends/mcp.ts` | Lines 41–52 output full envelope as MCP content | Transform envelope: extract result on ok=true, error+help on ok=false. Set isError correctly. Log failures before returning. | **HIGH** – Need extraction logic similar to CLI, integrated with MCP response structure |

### 3.2 Shared/Common (Likely Unchanged)

| File | Purpose | Change Required? |
|------|---------|------------------|
| `rosettify/src/shared/dispatch.ts` | Orchestrates validation, delegate call, enrichment | **No** – Already returns EnrichedEnvelope correctly. Delegates logic to frontends. |
| `rosettify/src/shared/envelope.ts` | Defines `ok()`, `err()`, `usageErr()` helpers | **No** – These are correct as-is. |
| `rosettify/src/shared/logger.ts` | Pino-based file logging | **No** – Used by frontends to log failures. Already correct. |
| `rosettify/src/registry/types.ts` | Type definitions (EnrichedEnvelope, etc.) | **No** – Types are correct. |

### 3.3 Entry Point (Likely Unchanged)

| File | Purpose | Change Required? |
|------|---------|------------------|
| `rosettify/src/bin/rosettify.ts` | Routes to CLI or MCP frontend | **No** – Already dispatches correctly. |

---

## 4. Affected Files: Tests

### 4.1 Tests That Check Envelope Output

#### E2E Tests (Expect Envelope Wrapper Currently)

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/tests/e2e/cli.e2e.test.ts`

**Lines checking envelope structure:**
- Lines 66–68: `asEnvelope()` helper expects `{ok, result, error}` fields
- Lines 75–84: Tests assert `env.ok === true`, `env.result` has expected fields
- Lines 186–199: `plan next` test expects `env.result as { ready, count }`
- Lines 231–240: `show_status` test expects `env.result`
- Lines 265–283: `update_status` test expects `env.ok` and `env.result`
- Lines 290–310: Error tests assert `env.ok === false`, `env.error`

**Impact:** These tests parse the current full-envelope format. After transformation, stdout will be the payload directly — tests must be updated to parse the payload instead of wrapping.

---

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/tests/e2e/mcp.e2e.test.ts`

**Lines checking envelope structure:**
- Lines 106–127: `callTool()` parses MCP content as envelope: `{ok, result, error, include_help}`
- Lines 191–196: `help` test expects `envelope.ok === true`, `envelope.result`
- Lines 198–211: Subcommand test expects envelope structure
- Lines 218–316: Full lifecycle test checks `envelope.ok`, `envelope.result` throughout
- Lines 373–375: Error test expects `envelope.ok === false`, `envelope.error`

**Impact:** Similar to CLI — tests assume envelope wrapper in MCP content. After transformation, content will be the payload directly.

---

#### Unit Tests

**File:** `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/tests/unit/shared/dispatch.test.ts`

**Lines checking envelope structure:**
- Lines 112–159: Tests call `dispatch()` and assert on result envelope (ok, result, error, include_help, help)
- Line 154: Tests assert enriched result includes `help` field when `include_help=true`

**Impact:** These tests verify the dispatch layer (internal contract), not the frontend output. Tests should **NOT** change — they verify dispatch returns the correct envelope, which frontends then transform.

---

### 4.2 Test Coverage Gaps

After transformation, the following will need NEW test coverage:

1. **Envelope extraction for success (both CLI and MCP):**
   - Verify that result is extracted and output as top-level payload
   - Verify ok, error, include_help fields are NOT in output

2. **Envelope extraction for failure without help (both CLI and MCP):**
   - Verify that error is extracted and output as `{error: "..."}`
   - Verify ok, result, include_help fields are NOT in output

3. **Envelope extraction for failure with help (both CLI and MCP):**
   - Verify that error and help are both extracted and output as `{error: "...", help: {...}}`
   - Verify ok, result, include_help fields are NOT in output

4. **Failure logging (FR-SHRD-0007):**
   - Verify that CLI logs failure to file before stdout output
   - Verify that MCP logs failure to file before returning response
   - Verify log level is ERROR for "internal_error", WARN for others

5. **CLI error handling:**
   - Verify top-level Commander parse errors go to stderr (unchanged)

6. **MCP protocol compliance:**
   - Verify isError field is set correctly based on ok
   - Verify MCP protocol is not corrupted by transformation

---

## 5. Test File Updates Required

### 5.1 CLI E2E Tests (`cli.e2e.test.ts`)

**Current pattern (lines 66–68):**

```typescript
function asEnvelope(r: SpawnResult): { ok: boolean; result: unknown; error: string | null } {
  return r.json as { ok: boolean; result: unknown; error: string | null };
}

// Usage: const env = asEnvelope(r); expect(env.ok).toBe(true);
```

**Change Required:**

After transformation, `r.json` will be the payload directly, not the envelope.

- For success: `r.json` is the result object (e.g., `{plan_file, name, status}`)
- For failure: `r.json` is the error payload (e.g., `{error: "plan_not_found"}` or `{error: "...", help: {...}}`)

Tests must:
1. Remove the `asEnvelope()` helper (or rename it)
2. Update assertions to check `r.json` directly as the payload
3. Update error assertions to check `r.json.error` for the error string
4. Update help assertions to check `r.json.help` for help content

**Example update:**

```typescript
// OLD
const env = asEnvelope(r);
expect(env.ok).toBe(true);
const res = env.result as { name: string };
expect(res.name).toBe("CLI Test Plan");

// NEW
const res = r.json as { name: string };
expect(res.name).toBe("CLI Test Plan");
expect((r.json as any).ok).toBeUndefined(); // Verify envelope NOT present
```

---

### 5.2 MCP E2E Tests (`mcp.e2e.test.ts`)

**Current pattern (lines 106–127):**

```typescript
async callTool(...): Promise<{
  content: { type: string; text: string }[];
  isError: boolean;
  envelope: { ok: boolean; result: unknown; error: string | null; include_help: boolean };
}> {
  const resp = await this.send("tools/call", { name, arguments: args });
  // ...
  const envelope = JSON.parse(r.content[0]!.text) as { ok, result, error, include_help };
  return { content: r.content, isError: r.isError, envelope };
}
```

**Change Required:**

After transformation, `r.content[0].text` will be the payload directly, not the envelope.

The test harness's `callTool()` method must be updated to:
1. Parse `r.content[0].text` as the payload
2. Update return type to reflect payload (not envelope)
3. Update assertions throughout tests

**Example update:**

```typescript
// OLD
const { envelope } = await client.callTool("plan", {subcommand: "create", ...});
expect(envelope.ok).toBe(true);
const created = envelope.result as { name: string };
expect(created.name).toBe("MCP E2E Plan");

// NEW
const result = await client.callTool("plan", {subcommand: "create", ...});
const created = result as { name: string };
expect(created.name).toBe("MCP E2E Plan");
expect((result as any).ok).toBeUndefined(); // Verify envelope NOT present
```

---

### 5.3 Dispatch Unit Tests (`dispatch.test.ts`)

**No changes required** — These tests verify the dispatch layer contract (envelope structure), which remains unchanged. The envelope is still returned by dispatch. Frontends consume and transform it.

---

## 6. Implementation Strategy

### Phase 1: CLI Transformation

1. **Create a helper function** to transform EnrichedEnvelope → consumer output:
   - Extract result on ok=true
   - Extract error+help on ok=false

2. **Update `cli.ts` `writeResult()` function:**
   - Call transformation helper
   - Log failure via `logger` before writing output
   - Write transformed payload to stdout

3. **Update CLI E2E tests** to parse transformed payload instead of envelope

### Phase 2: MCP Transformation

1. **Create the same helper function** (or reuse from Phase 1)

2. **Update `mcp.ts` CallToolResult handler:**
   - Call transformation helper
   - Log failure via `logger` before returning response
   - Set `isError` field based on ok flag
   - Return transformed payload as MCP content text

3. **Update MCP E2E tests** to parse transformed payload instead of envelope

### Phase 3: Test Coverage

1. **Add new unit tests** for the transformation helper
2. **Update E2E assertions** in both CLI and MCP test files
3. **Add FR-SHRD-0007 logging validation** tests

---

## 7. Constraints and Risks

### 7.1 MCP Protocol Compliance

**Risk:** Transforming the envelope might break MCP protocol expectations.

**Mitigation:**
- The MCP spec does not mandate envelope structure — it only requires content type and isError flag
- Content can be any JSON — in this case, the transformed payload
- isError must be set based on ok flag (handled in transformation)
- Verify that MCP clients (Claude Code, etc.) can parse the transformed payload

**Verification:** Run existing MCP E2E tests; they validate the full flow.

---

### 7.2 Backward Compatibility

**Risk:** Test harnesses or consumers expecting envelope wrapper will break.

**Mitigation:**
- This is a breaking change by design (FR-ARCH-0014 requirement)
- All E2E tests must be updated
- Internal unit tests (dispatch.test.ts) remain unchanged
- Documentation and examples should be updated (outside this scope)

---

### 7.3 Logging Performance

**Risk:** Logging before every failure output might introduce latency or I/O contention.

**Mitigation:**
- Pino (the logger) is async-safe and optimized
- FR-SHRD-0007 explicitly allows logging to be "best-effort async"
- Failures are typically uncommon, so performance impact is minimal

---

### 7.4 Error Message Sanitization

**Risk:** FR-ARCH-0014 requires "sanitized error payload" — unclear what to sanitize.

**Clarification:** Based on context (FR-SHRD-0007, FR-ARCH-0004):
- Remove stack traces (not in envelope anyway)
- Remove internal implementation paths (e.g., file system paths)
- Remove sensitive input data from error messages
- Preserve the error code and a clear, actionable message
- Include help when include_help=true (already enriched)

**Current state:** Errors in the envelope are already high-level codes or messages; no sanitization needed. If sanitization becomes necessary, it should be done at the run delegate level (outside this scope).

---

## 8. Open Questions

1. **Shared helper function location?**
   - Should `transformEnvelope()` live in `shared/envelope.ts` or be local to each frontend?
   - **Recommendation:** `shared/envelope.ts` since both CLI and MCP use it.

2. **Logging context in FR-SHRD-0007?**
   - Should frontends log the original request parameters (subcommand, plan_file, etc.)?
   - **Recommendation:** Log safe diagnostic context only (tool name, subcommand). Do NOT log sensitive input data.

3. **Help field in error response?**
   - When ok=false and include_help=true, should the response always include help?
   - **Answer per FR-ARCH-0014:** Yes, help field should be in the output when present in the envelope.

4. **CLI error codes in exit status?**
   - Currently all errors exit 1. Should internal_error have a different exit code?
   - **Answer per FR-CLI-0003:** No, all errors are exit 1.

---

## 9. Summary of Changes

| Component | File | Current Behavior | Required Change | Priority |
|-----------|------|------------------|-----------------|----------|
| **CLI Frontend** | `cli.ts` | Outputs full envelope | Transform: extract result on ok=true, error+help on ok=false; log failures | **HIGH** |
| **MCP Frontend** | `mcp.ts` | Serializes full envelope as MCP content | Transform: extract result on ok=true, error+help on ok=false; log failures; set isError | **HIGH** |
| **CLI Tests** | `cli.e2e.test.ts` | Parse envelope from stdout | Parse payload directly; verify envelope NOT present | **HIGH** |
| **MCP Tests** | `mcp.e2e.test.ts` | Parse envelope from MCP content | Parse payload directly; verify envelope NOT present | **HIGH** |
| **Dispatch Tests** | `dispatch.test.ts` | Verify envelope contract | **No change** — tests verify internal contract | **N/A** |
| **Shared (New)** | `envelope.ts` or new file | (N/A) | Add transformation helper function | **MEDIUM** |

---

## 10. Files to Modify (Complete List)

### Source Code (Must Change)

1. `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/src/frontends/cli.ts`
   - Update `writeResult()` to transform envelope
   - Add logging for failures

2. `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/src/frontends/mcp.ts`
   - Update CallToolResult handler to transform envelope
   - Add logging for failures

3. `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/src/shared/envelope.ts` (Optional)
   - Add `transformEnvelope()` helper function (or equivalent)

### Tests (Must Update)

4. `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/tests/e2e/cli.e2e.test.ts`
   - Update all assertions to parse payload instead of envelope
   - Remove or update `asEnvelope()` helper

5. `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/tests/e2e/mcp.e2e.test.ts`
   - Update `callTool()` helper to parse payload
   - Update all assertions throughout test suite

### Tests (No Change)

6. `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/tests/unit/shared/dispatch.test.ts`
   - No changes — verifies internal envelope contract

---

End of Discovery Notes
