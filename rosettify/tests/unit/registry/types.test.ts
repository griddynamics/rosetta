/**
 * Structural type constraint tests — verifies PlanInput and HelpInput
 * extend CommandInput correctly (FR-ARCH-0004, FR-ARCH-0006).
 *
 * These are compile-time checks expressed as runtime assertions for safety.
 */
import { describe, it, expect } from "vitest";
import type { CommandInput } from "../../../src/registry/types.js";
import type { PlanInput } from "../../../src/commands/plan/core.js";
import type { HelpInput } from "../../../src/commands/help/index.js";

describe("CommandInput structural constraints", () => {
  it("PlanInput is assignable to CommandInput", () => {
    // If this compiles, PlanInput extends CommandInput.
    const planInput: PlanInput = { subcommand: "next", plan_file: "/tmp/plan.json" };
    const asBase: CommandInput = planInput;
    expect(asBase.subcommand).toBe("next");
    expect(asBase.plan_file).toBe("/tmp/plan.json");
  });

  it("HelpInput is assignable to CommandInput", () => {
    const helpInput: HelpInput = { subcommand: "plan" };
    const asBase: CommandInput = helpInput;
    expect(asBase.subcommand).toBe("plan");
  });

  it("CommandInput fields are all optional", () => {
    const empty: CommandInput = {};
    expect(empty).toBeDefined();
  });

  it("PlanInput exposes all CommandInput fields", () => {
    const input: PlanInput = {
      subcommand: "update_status",
      plan_file: "/tmp/p.json",
      data: '{"name":"x"}',
      target_id: "s1",
      new_status: "complete",
      limit: 5,
      kind: "step",
      phase_id: "p1",
    };
    // All fields accessible via CommandInput type
    const asBase: CommandInput = input;
    expect(asBase.target_id).toBe("s1");
    expect(asBase.new_status).toBe("complete");
    expect(asBase.limit).toBe(5);
    expect(asBase.kind).toBe("step");
    expect(asBase.phase_id).toBe("p1");
  });
});
