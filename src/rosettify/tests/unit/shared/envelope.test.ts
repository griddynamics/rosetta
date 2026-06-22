/**
 * Unit tests for extractOutput and logFailure in shared/envelope.ts
 * (FR-ARCH-0014, FR-SHRD-0007)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractOutput, logFailure } from "../../../src/shared/envelope.js";
import type { EnrichedEnvelope } from "../../../src/registry/types.js";

// ---------------------------------------------------------------------------
// describe("extractOutput")
// ---------------------------------------------------------------------------

describe("extractOutput", () => {
  it("Test 1: ok=true with result object → payload is the result, no envelope leak", () => {
    const envelope: EnrichedEnvelope<{ a: number }> = {
      ok: true,
      result: { a: 1 },
      error: null,
      include_help: false,
    };
    const output = extractOutput(envelope);
    expect(output.ok).toBe(true);
    expect(output.payload).toEqual({ a: 1 });
    // No envelope wrapper fields should leak into payload
    expect((output.payload as any).ok).toBeUndefined();
    expect((output.payload as any).include_help).toBeUndefined();
    expect((output.payload as any).error).toBeUndefined();
  });

  it("Test 2: ok=false, no help → payload is {error: 'plan_not_found'}, no ok/result fields", () => {
    const envelope: EnrichedEnvelope<never> = {
      ok: false,
      result: null,
      error: "plan_not_found",
      include_help: false,
    };
    const output = extractOutput(envelope);
    expect(output.ok).toBe(false);
    expect(output.payload).toEqual({ error: "plan_not_found" });
    // No help field when not present
    expect((output.payload as any).help).toBeUndefined();
    // No envelope leak
    expect((output.payload as any).ok).toBeUndefined();
    expect((output.payload as any).include_help).toBeUndefined();
    expect((output.payload as any).result).toBeUndefined();
  });

  it("Test 3: ok=false, help present → payload is {error, help: {...}}", () => {
    const help = {
      name: "plan",
      brief: "Manage plans",
      description: "Full description",
      input_schema: {},
      output_schema: {},
      subcommands: [],
    };
    const envelope: EnrichedEnvelope<never> = {
      ok: false,
      result: null,
      error: "unknown_command: x",
      include_help: true,
      help,
    };
    const output = extractOutput(envelope);
    expect(output.ok).toBe(false);
    expect((output.payload as any).error).toBe("unknown_command: x");
    expect((output.payload as any).help).toEqual(help);
    // No envelope leak
    expect((output.payload as any).ok).toBeUndefined();
    expect((output.payload as any).include_help).toBeUndefined();
  });

  it("Test 4: ok=true, result=null → payload is null (valid edge case)", () => {
    const envelope: EnrichedEnvelope<null> = {
      ok: true,
      result: null,
      error: null,
      include_help: false,
    };
    const output = extractOutput(envelope);
    expect(output.ok).toBe(true);
    expect(output.payload).toBeNull();
    // Null result is valid — no envelope wrapper
    expect((output.payload as any)?.ok).toBeUndefined();
    expect((output.payload as any)?.include_help).toBeUndefined();
  });

  it("Test 5: ok=false, internal_error → payload is {error: 'internal_error: boom'}", () => {
    const envelope: EnrichedEnvelope<never> = {
      ok: false,
      result: null,
      error: "internal_error: boom",
      include_help: false,
    };
    const output = extractOutput(envelope);
    expect(output.ok).toBe(false);
    expect((output.payload as any).error).toBe("internal_error: boom");
    expect((output.payload as any).help).toBeUndefined();
    // No envelope leak
    expect((output.payload as any).ok).toBeUndefined();
    expect((output.payload as any).include_help).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// describe("logFailure")
// ---------------------------------------------------------------------------

const mockLogger = { warn: vi.fn(), error: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("logFailure", () => {
  it("Test 6: error 'plan_not_found' → warn called, error NOT called; fields include tool name and error", () => {
    logFailure(mockLogger as any, "plan", "plan_not_found");
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).not.toHaveBeenCalled();
    const [fields, msg] = mockLogger.warn.mock.calls[0]!;
    expect(fields).toMatchObject({ tool: "plan", error: "plan_not_found" });
    expect(msg).toBe("tool call failed");
  });

  it("Test 7: error 'internal_error: boom' → error called, warn NOT called", () => {
    logFailure(mockLogger as any, "plan", "internal_error: boom");
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).not.toHaveBeenCalled();
    const [fields, msg] = mockLogger.error.mock.calls[0]!;
    expect(fields).toMatchObject({ tool: "plan", error: "internal_error: boom" });
    expect(msg).toBe("tool call failed");
  });

  it("Test 8: with context → context fields merged into the log call", () => {
    const context = { subcommand: "create", request_id: "abc123" };
    logFailure(mockLogger as any, "plan", "unknown_command: x", context);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).not.toHaveBeenCalled();
    const [fields] = mockLogger.warn.mock.calls[0]!;
    expect(fields).toMatchObject({
      tool: "plan",
      error: "unknown_command: x",
      subcommand: "create",
      request_id: "abc123",
    });
  });
});
