/**
 * Unit tests for registry/index.ts utility functions.
 */
import { describe, it, expect } from "vitest";
import { registry, getToolDef, getCliTools, getMcpTools } from "../../../src/registry/index.js";

describe("registry", () => {
  it("contains plan tool", () => {
    expect(registry.has("plan")).toBe(true);
  });

  it("contains help tool", () => {
    expect(registry.has("help")).toBe(true);
  });
});

describe("getToolDef", () => {
  it("returns the plan tool definition", () => {
    const def = getToolDef("plan");
    expect(def).toBeDefined();
    expect(def!.name).toBe("plan");
  });

  it("returns undefined for unknown tool", () => {
    expect(getToolDef("nonexistent-tool-xyz")).toBeUndefined();
  });
});

describe("getCliTools", () => {
  it("returns array of tools with cli:true", () => {
    const tools = getCliTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.cli).toBe(true);
    }
  });
});

describe("getMcpTools", () => {
  it("returns array of tools with mcp:true", () => {
    const tools = getMcpTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.mcp).toBe(true);
    }
  });
});
