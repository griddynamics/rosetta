# Envelope Output Transformation -- Technical Specification

plan_name: rosettify/envelope-output
phase: tech-specs
date: 2026-04-22
status: Draft
parent_specs_ref: plans/rosettify/rosettify-SPECS.md

---

## TLDR

Frontends (CLI, MCP) currently serialize the raw `EnrichedEnvelope` to consumers. This spec defines the output transformation contract: extract `result` on success, extract `error`+`help` on failure, log all failures before output. A shared pure function `extractOutput` in `shared/envelope.ts` performs extraction. A shared `logFailure` function handles FR-SHRD-0007 log-level dispatch. Frontends call both, then serialize. No new dependencies. 5 source files changed, 2 test files updated, 1 new unit test file added.

---

## 1. Scope

**In scope:** FR-ARCH-0014 (output transformation), FR-ARCH-0011 (updated: envelope is internal), FR-CLI-0004 (updated: CLI outputs payload), FR-MCP-0003 (updated: MCP outputs payload), FR-SHRD-0007 (new: failure logging).

**Out of scope:** Dispatch pipeline, help enrichment, run delegates, error sanitization beyond current envelope content, new commands.

**Breaking change:** Consumer-facing output format changes from envelope wrapper to extracted payload. All E2E tests must be updated.

---

## 2. Architecture Decision: Shared Helper

**Decision:** Output transformation lives in `shared/envelope.ts` as two exported pure functions.

**Rationale:**
- FR-ARCH-0013 mandates shared module for cross-cutting concerns. Output transformation is cross-cutting (used by both frontends).
- `envelope.ts` already owns inbound helpers (`ok`, `err`, `usageErr`). Adding outbound extraction is the symmetric dual.
- Pure functions are unit-testable without CLI spawn or MCP harness.
- Inline duplication violates DRY and creates drift risk on a contract-critical path.

**Boundary:** Shared helpers return data objects. Frontends own serialization (JSON.stringify for CLI stdout, JSON.stringify inside MCP content). This boundary remains clean if frontends later diverge in formatting.

---

## 3. TypeScript Interfaces and Signatures

All additions go in existing files. No new source files except one new test file.

### 3.1 Output Payload Types -- `src/registry/types.ts`

```typescript
/** Consumer-facing success payload: the result object itself. */
export type SuccessPayload<T> = T;

/** Consumer-facing failure payload. */
export interface FailurePayload {
  error: string;
  help?: HelpTopLevel | HelpCommandDetail;
}

/** Union returned by extractOutput. */
export type OutputPayload<T> = { ok: true; payload: T } | { ok: false; payload: FailurePayload };
```

Design note: `OutputPayload` is a discriminated union so frontends can branch on `ok` for exit code (CLI) and `isError` (MCP) without re-inspecting the envelope. The `payload` field is what gets serialized to the consumer.

Traces: FR-ARCH-0014, FR-ARCH-0011.

### 3.2 Extraction Function -- `src/shared/envelope.ts`

```typescript
export function extractOutput<T>(envelope: EnrichedEnvelope<T>): OutputPayload<T>;
```

**Contract:**

| Envelope State | Output |
|---|---|
| `ok=true` | `{ ok: true, payload: envelope.result }` |
| `ok=false, help undefined` | `{ ok: false, payload: { error: envelope.error! } }` |
| `ok=false, help present` | `{ ok: false, payload: { error: envelope.error!, help: envelope.help } }` |

The function is pure. It does not log, does not throw, does not perform I/O.

Fields stripped from consumer output: `ok`, `result`, `error` (as top-level envelope field), `include_help`.

Traces: FR-ARCH-0014.

### 3.3 Failure Logging Function -- `src/shared/envelope.ts`

```typescript
export function logFailure(
  log: pino.Logger,
  toolName: string,
  error: string,
  context?: Record<string, unknown>,
): void;
```

**Contract:**

| Error String | Log Level | Log Fields |
|---|---|---|
| Starts with `"internal_error"` | `error` | `{ tool: toolName, error, ...context }` |
| All other values | `warn` | `{ tool: toolName, error, ...context }` |

The `context` parameter is optional. Frontends MAY pass safe diagnostic fields (e.g., `{ subcommand: "create" }`). Frontends SHALL NOT pass sensitive input data (plan content, file paths with user data).

Log message string: `"tool call failed"`.

Traces: FR-SHRD-0007, FR-ARCH-0010.

---

## 4. Frontend Contracts

### 4.1 CLI Frontend -- `src/frontends/cli.ts`

**Current:** `writeResult(envelope)` serializes full envelope to stdout.

**New contract:**

1. Call `extractOutput(envelope)` to get `OutputPayload`.
2. If `!output.ok`: call `logFailure(logger, toolName, envelope.error!, context)`.
3. Serialize `output.payload` as JSON to stdout: `JSON.stringify(output.payload, null, 2)`.
4. Exit code: `output.ok ? 0 : 1`.

**Updated `writeResult` signature:**

```typescript
function writeResult(toolName: string, envelope: EnrichedEnvelope<unknown>): void;
```

The `toolName` parameter is needed for `logFailure`. Each call site already knows the tool name from the `ToolDef` being dispatched.

**stderr error (commander parse failure):** Format changes from envelope shape to simple error payload:

```typescript
// Before:
{ ok: false, error: msg, result: null, include_help: false }
// After:
{ error: msg }
```

This aligns commander error output with the same failure payload shape consumers see from dispatch failures.

Traces: FR-CLI-0004, FR-ARCH-0014, FR-SHRD-0007.

### 4.2 MCP Frontend -- `src/frontends/mcp.ts`

**Current:** Lines 41-52 serialize full envelope as MCP content text.

**New contract:**

1. Call `extractOutput(envelope)` to get `OutputPayload`.
2. If `!output.ok`: call `logFailure(logger, toolName, envelope.error!, context)`.
3. Return MCP CallToolResult:

```typescript
{
  content: [{ type: "text" as const, text: JSON.stringify(output.payload) }],
  isError: !output.ok,
}
```

4. Existing `logger.info` for successful calls remains unchanged.

Traces: FR-MCP-0003, FR-ARCH-0014, FR-SHRD-0007.

### 4.3 MCP Protocol Compliance

The MCP SDK CallToolResult interface requires:
- `content`: array of `{ type: "text", text: string }` (unchanged).
- `isError`: boolean (already set from `!envelope.ok`, unchanged).

The only change is what `text` contains: payload JSON instead of envelope JSON. This is fully MCP-compliant -- the SDK does not mandate content structure beyond `type` and `text`.

---

## 5. Output Format Examples

### 5.1 CLI Success

```json
{
  "plan_file": "plan.json",
  "name": "Test Plan",
  "status": "open"
}
```

No `ok`, `error`, `include_help`, `help` fields.

### 5.2 CLI Failure (runtime error)

```json
{
  "error": "plan_not_found"
}
```

Exit code 1. Log file: WARN entry with tool name.

### 5.3 CLI Failure (usage error with help)

```json
{
  "error": "unknown_command: badsubcmd | valid: create, next, show_status, update_status, query, upsert",
  "help": {
    "name": "plan",
    "brief": "...",
    "description": "...",
    "input_schema": {},
    "output_schema": {},
    "subcommands": []
  }
}
```

Exit code 1. Log file: WARN entry with tool name.

### 5.4 CLI Failure (internal error)

```json
{
  "error": "internal_error: unexpected null reference"
}
```

Exit code 1. Log file: ERROR entry with tool name.

### 5.5 MCP Success (content[0].text)

Same as CLI 5.1. `isError: false`.

### 5.6 MCP Failure (content[0].text)

Same as CLI 5.2/5.3/5.4. `isError: true`.

---

## 6. Error Handling

No new error paths introduced. The transformation is a pure extraction -- it cannot fail. The `logFailure` function is best-effort (pino async-safe). If logging fails (disk full, permissions), it does not block output.

Edge cases:
- `envelope.result` is `null` on success: `extractOutput` returns `{ ok: true, payload: null }`. This is valid JSON.
- `envelope.error` is `null` on failure: Should not happen per FR-ARCH-0011 contract. If it does, `logFailure` receives `null` -- pino serializes it as `null` in the log entry. The consumer receives `{ error: null }`.
- `envelope.help` is `undefined` on failure with `include_help=true`: Help enrichment failed. `extractOutput` omits the `help` field. Consumer receives `{ error: "..." }` without help.

---

## 7. Testing Strategy

### 7.1 New Unit Tests -- `tests/unit/shared/envelope.test.ts`

Test `extractOutput`:

| # | Input Envelope | Expected Output | Traces |
|---|---|---|---|
| 1 | `ok=true, result={a:1}` | `{ ok: true, payload: {a:1} }` | FR-ARCH-0014 |
| 2 | `ok=false, error="plan_not_found", help=undefined` | `{ ok: false, payload: {error:"plan_not_found"} }` | FR-ARCH-0014 |
| 3 | `ok=false, error="unknown_command: x", help={name:"plan",...}` | `{ ok: false, payload: {error:"unknown_command: x", help:{name:"plan",...}} }` | FR-ARCH-0014 |
| 4 | `ok=true, result=null` | `{ ok: true, payload: null }` | edge case |
| 5 | `ok=false, error="internal_error: boom", help=undefined` | `{ ok: false, payload: {error:"internal_error: boom"} }` | FR-ARCH-0014 |

Test `logFailure`:

| # | Error String | Expected Log Level | Traces |
|---|---|---|---|
| 6 | `"plan_not_found"` | `warn` | FR-SHRD-0007 |
| 7 | `"internal_error: boom"` | `error` | FR-SHRD-0007 |
| 8 | `"unknown_command: x"` | `warn` | FR-SHRD-0007 |

Tests mock `pino.Logger` to verify log level and fields.

### 7.2 Updated E2E Tests -- `tests/e2e/cli.e2e.test.ts`

**Remove:** `asEnvelope()` helper.

**Replace pattern:**

```
// OLD: const env = asEnvelope(r); expect(env.ok).toBe(true); env.result as T;
// NEW: const res = r.json as T; expect((r.json as any).ok).toBeUndefined();
```

**Success assertions:** Assert on `r.json` directly as the result type. Add negative assertion: `(r.json as any).ok` is `undefined`.

**Failure assertions:** Assert `(r.json as {error:string}).error` contains expected string. Add negative assertion: `(r.json as any).ok` is `undefined`.

### 7.3 Updated E2E Tests -- `tests/e2e/mcp.e2e.test.ts`

**Update `callTool()` return type:**

```typescript
async callTool(name: string, args: Record<string, unknown>): Promise<{
  content: { type: string; text: string }[];
  isError: boolean;
  payload: unknown;  // was: envelope
}>
```

**Replace pattern:**

```
// OLD: const { envelope } = await client.callTool(...); envelope.ok; envelope.result as T;
// NEW: const { payload, isError } = await client.callTool(...); payload as T; expect(isError).toBe(false);
```

**Success assertions:** Assert on `payload` directly. Verify `(payload as any).ok` is `undefined`.

**Failure assertions:** Assert `(payload as {error:string}).error`. Verify `isError` is `true`.

### 7.4 Unchanged Tests -- `tests/unit/shared/dispatch.test.ts`

No changes. These tests verify the internal dispatch contract (envelope shape), which remains unchanged.

---

## 8. Traceability Matrix

| Requirement | Spec Section | Test Coverage |
|---|---|---|
| FR-ARCH-0014 | 3.2, 4.1, 4.2, 5.x | 7.1 (#1-5), 7.2, 7.3 |
| FR-ARCH-0011 (updated) | 3.2 (envelope is internal) | 7.2 (ok field absent), 7.3 (ok field absent) |
| FR-CLI-0004 (updated) | 4.1 | 7.2 |
| FR-MCP-0003 (updated) | 4.2, 4.3 | 7.3 |
| FR-SHRD-0007 | 3.3 | 7.1 (#6-8) |
| FR-ARCH-0013 | 2 (shared helper decision) | 7.1 (unit-tested shared function) |

---

## 9. Files Affected Summary

| File | Change Type | Description |
|---|---|---|
| `src/registry/types.ts` | Modify | Add `SuccessPayload`, `FailurePayload`, `OutputPayload` types |
| `src/shared/envelope.ts` | Modify | Add `extractOutput()`, `logFailure()` |
| `src/frontends/cli.ts` | Modify | Update `writeResult()` to use `extractOutput` + `logFailure`; update stderr error format |
| `src/frontends/mcp.ts` | Modify | Update CallTool handler to use `extractOutput` + `logFailure` |
| `src/shared/logger.ts` | No change | Already correct |
| `src/shared/dispatch.ts` | No change | Already correct |
| `tests/unit/shared/envelope.test.ts` | New | Unit tests for `extractOutput`, `logFailure` |
| `tests/unit/shared/dispatch.test.ts` | No change | Verifies internal contract |
| `tests/e2e/cli.e2e.test.ts` | Modify | Remove `asEnvelope`, assert on payload directly |
| `tests/e2e/mcp.e2e.test.ts` | Modify | Update `callTool()` return type, assert on payload directly |

---

## 10. Dependencies

No new runtime or dev dependencies. Uses existing:
- `pino` (logger) -- already in shared/logger.ts
- `vitest` (tests) -- already configured
- `@modelcontextprotocol/sdk` (MCP types) -- already in mcp.ts

---

## 11. Assumptions

1. `envelope.error` is always non-null when `ok=false` (per FR-ARCH-0011 contract). Defensive: if null, serialize as `{ error: null }`.
2. `envelope.result` type is always JSON-serializable (per FR-ARCH-0004). No transformation needed.
3. Help enrichment failures are already handled in dispatch.ts (returns envelope without help field). `extractOutput` does not need to handle enrichment failures.
4. Log file write failures are non-blocking (pino destination behavior). No retry logic needed.
