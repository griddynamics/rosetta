/**
 * Unit tests for the help command (FR-HELP-0001, FR-HELP-0002).
 */
import { describe, it, expect } from "vitest";
import { helpToolDef } from "../../../src/commands/help/index.js";
import type { HelpTopLevel, HelpCommandDetail } from "../../../src/registry/types.js";

describe("help — top-level listing (no subcommand)", () => {
  it("returns ok:true with tool and version", async () => {
    const result = await helpToolDef.run({});
    expect(result.ok).toBe(true);
    const r = result.result as HelpTopLevel;
    expect(r.tool).toBe("rosettify");
    expect(r.version).toBeDefined();
    expect(Array.isArray(r.commands)).toBe(true);
    expect(r.guidance).toContain("help");
  });

  it("lists plan and help commands", async () => {
    const result = await helpToolDef.run({});
    const r = result.result as HelpTopLevel;
    const names = r.commands.map((c) => c.name);
    expect(names).toContain("plan");
    expect(names).toContain("help");
  });

  it("each command entry has name and brief", async () => {
    const result = await helpToolDef.run({});
    const r = result.result as HelpTopLevel;
    for (const cmd of r.commands) {
      expect(typeof cmd.name).toBe("string");
      expect(typeof cmd.brief).toBe("string");
    }
  });
});

describe("help — command detail (subcommand=plan)", () => {
  it("returns plan detail with subcommands", async () => {
    const result = await helpToolDef.run({ subcommand: "plan" });
    expect(result.ok).toBe(true);
    const r = result.result as HelpCommandDetail;
    expect(r.name).toBe("plan");
    expect(r.brief).toBeDefined();
    expect(r.description).toBeDefined();
    expect(r.input_schema).toBeDefined();
    expect(r.output_schema).toBeDefined();
    expect(Array.isArray(r.subcommands)).toBe(true);
    const subNames = r.subcommands!.map((s) => s.name);
    expect(subNames).toContain("create");
    expect(subNames).toContain("next");
    expect(subNames).toContain("update_status");
    expect(subNames).toContain("show_status");
    expect(subNames).toContain("query");
    expect(subNames).toContain("upsert");
  });
});

describe("help — command detail (subcommand=help)", () => {
  it("returns help command detail", async () => {
    const result = await helpToolDef.run({ subcommand: "help" });
    expect(result.ok).toBe(true);
    const r = result.result as HelpCommandDetail;
    expect(r.name).toBe("help");
  });
});

describe("help — unknown subcommand fallback", () => {
  it("falls back to top-level listing for unknown subcommand", async () => {
    const result = await helpToolDef.run({ subcommand: "nonexistent-cmd" });
    expect(result.ok).toBe(true);
    const r = result.result as HelpTopLevel;
    // Should be top-level listing shape
    expect(r.tool).toBe("rosettify");
    expect(Array.isArray(r.commands)).toBe(true);
  });
});
