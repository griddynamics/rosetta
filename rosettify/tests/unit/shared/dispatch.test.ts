/**
 * Unit tests for the shared dispatch pipeline (FR-ARCH-0004, FR-ARCH-0011).
 */
import { describe, it, expect } from "vitest";
import { validateInput, dispatch } from "../../../src/shared/dispatch.js";
import type { ToolDef, CommandInput, RunEnvelope } from "../../../src/registry/types.js";
import { ok, err } from "../../../src/shared/envelope.js";

// ---------------------------------------------------------------------------
// validateInput
// ---------------------------------------------------------------------------

describe("validateInput", () => {
  it("rejects null input", () => {
    expect(validateInput(null, {})).toBe("input must be an object");
  });

  it("rejects non-object input", () => {
    expect(validateInput("string", {})).toBe("input must be an object");
    expect(validateInput(42, {})).toBe("input must be an object");
  });

  it("accepts empty object when no schema constraints", () => {
    expect(validateInput({}, {})).toBeNull();
  });

  it("rejects missing required field", () => {
    const schema = { required: ["name"], properties: { name: { type: "string" } } };
    expect(validateInput({}, schema)).toBe("missing required field: name");
  });

  it("passes when required fields present", () => {
    const schema = { required: ["name"], properties: { name: { type: "string" } } };
    expect(validateInput({ name: "test" }, schema)).toBeNull();
  });

  it("validates string type", () => {
    const schema = { properties: { x: { type: "string" } } };
    expect(validateInput({ x: 42 }, schema)).toBe("field x must be of type string");
    expect(validateInput({ x: "ok" }, schema)).toBeNull();
  });

  it("validates integer type", () => {
    const schema = { properties: { n: { type: "integer" } } };
    expect(validateInput({ n: 1.5 }, schema)).toBe("field n must be of type integer");
    expect(validateInput({ n: 5 }, schema)).toBeNull();
  });

  it("validates boolean type", () => {
    const schema = { properties: { flag: { type: "boolean" } } };
    expect(validateInput({ flag: "yes" }, schema)).toBe("field flag must be of type boolean");
    expect(validateInput({ flag: true }, schema)).toBeNull();
  });

  it("validates object type", () => {
    const schema = { properties: { obj: { type: "object" } } };
    expect(validateInput({ obj: [1, 2] }, schema)).toBe("field obj must be of type object");
    expect(validateInput({ obj: {} }, schema)).toBeNull();
  });

  it("validates array type", () => {
    const schema = { properties: { arr: { type: "array" } } };
    expect(validateInput({ arr: "not-array" }, schema)).toBe("field arr must be of type array");
    expect(validateInput({ arr: [] }, schema)).toBeNull();
  });

  it("validates enum values", () => {
    const schema = { properties: { color: { type: "string", enum: ["red", "blue"] } } };
    expect(validateInput({ color: "green" }, schema)).toBe("field color must be one of: red, blue");
    expect(validateInput({ color: "red" }, schema)).toBeNull();
  });

  it("validates oneOf (string or object)", () => {
    const schema = {
      properties: {
        data: { oneOf: [{ type: "string" }, { type: "object" }] },
      },
    };
    expect(validateInput({ data: [1, 2] }, schema)).toBe("field data did not match any allowed type");
    expect(validateInput({ data: "json-str" }, schema)).toBeNull();
    expect(validateInput({ data: {} }, schema)).toBeNull();
  });

  it("skips validation for undefined/null values", () => {
    const schema = { properties: { x: { type: "string" } } };
    // undefined means field not present — should skip
    expect(validateInput({ x: undefined }, schema)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------

function makeTool<T>(
  run: (input: CommandInput) => Promise<RunEnvelope<T>>,
  required: string[] = [],
): ToolDef<CommandInput, T> {
  return {
    name: "test",
    brief: "test",
    description: "test",
    inputSchema: { type: "object", properties: {}, required },
    outputSchema: {},
    cli: false,
    mcp: false,
    run,
  };
}

describe("dispatch", () => {
  it("returns validation error for invalid input", async () => {
    const tool = makeTool(async () => ok("result"), ["name"]);
    const result = await dispatch(tool, {});
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing required field");
    expect(result.include_help).toBe(true);
  });

  it("returns run delegate result on success", async () => {
    const tool = makeTool(async () => ok({ data: 42 }));
    const result = await dispatch(tool, {});
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ data: 42 });
  });

  it("returns error when run delegate returns err", async () => {
    const tool = makeTool(async () => err("something_went_wrong"));
    const result = await dispatch(tool, {});
    expect(result.ok).toBe(false);
    expect(result.error).toBe("something_went_wrong");
  });

  it("catches run delegate throw and returns internal_error", async () => {
    const tool = makeTool(async () => {
      throw new Error("boom");
    });
    const result = await dispatch(tool, {});
    expect(result.ok).toBe(false);
    expect(result.error).toContain("internal_error");
    expect(result.error).toContain("boom");
  });

  it("enriches with help when include_help is true", async () => {
    // The plan tool with unknown subcommand triggers include_help
    const { planToolDef } = await import("../../../src/commands/plan/index.js");
    const result = await dispatch(planToolDef, { subcommand: "unknown_xyz" });
    expect(result.ok).toBe(false);
    // Help enrichment may add a help field — result should be enriched envelope
    expect(result.error).toContain("unknown_command");
    // FR-ARCH-0012: help field should be present and have expected shape
    // dispatch calls helpToolDef.run({subcommand: tool.name}) which returns HelpCommandDetail
    const enriched = result as { help?: { name: string; brief: string; description: string } };
    expect(enriched.help).toBeDefined();
    expect(enriched.help).not.toBeNull();
    expect(typeof enriched.help!.name).toBe("string");
    expect(typeof enriched.help!.brief).toBe("string");
  });
});
