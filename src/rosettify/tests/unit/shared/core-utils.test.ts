/**
 * Unit tests for plan/core.ts utility functions:
 * mergePatch, mergeById, computeStatusFromChildren, propagateStatuses,
 * findPhase, findStep, buildStepStatusMap, depsSatisfied,
 * validateUniqueIds, validateDependencies, validateSizeLimits, validatePlanName
 */
import { describe, it, expect } from "vitest";
import {
  mergePatch,
  mergeById,
  computeStatusFromChildren,
  propagateStatuses,
  findPhase,
  findStep,
  buildStepStatusMap,
  buildPhaseStatusMap,
  depsSatisfied,
  validatePlanName,
  validateNonNegativeLimit,
  validateImmutableId,
  validateUniqueIds,
  validateDependencies,
  validateSizeLimits,
  detectCycle,
} from "../../../src/commands/plan/core.js";
import { phaseFactory, stepFactory, fullPlan, minimalPlan, planWithDuplicateIds } from "../../fixtures/plans.js";
import type { Plan, Phase } from "../../../src/commands/plan/core.js";

// ---------------------------------------------------------------------------
// mergePatch
// ---------------------------------------------------------------------------

describe("mergePatch", () => {
  it("merges top-level fields", () => {
    const result = mergePatch({ a: 1, b: 2 }, { b: 3, c: 4 });
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("deletes keys when value is null", () => {
    const result = mergePatch({ a: 1, b: 2 }, { b: null });
    expect(result).not.toHaveProperty("b");
  });

  it("deep merges nested objects", () => {
    const result = mergePatch({ x: { a: 1, b: 2 } }, { x: { b: 99 } });
    expect(result).toEqual({ x: { a: 1, b: 99 } });
  });

  it("returns patch when patch is not an object", () => {
    const result = mergePatch({ a: 1 }, "string" as unknown as Record<string, unknown>);
    expect(result).toBe("string");
  });

  it("initialises target to empty object if not an object", () => {
    const result = mergePatch("not-object" as unknown as Record<string, unknown>, { a: 1 });
    expect(result).toEqual({ a: 1 });
  });
});

// ---------------------------------------------------------------------------
// mergeById
// ---------------------------------------------------------------------------

describe("mergeById", () => {
  it("merges items with matching ids", () => {
    const existing = [{ id: "a", name: "old" }];
    const incoming = [{ id: "a", name: "new" }];
    const result = mergeById(existing, incoming);
    expect(result).toEqual([{ id: "a", name: "new" }]);
  });

  it("appends new items that do not exist", () => {
    const existing = [{ id: "a", name: "A" }];
    const incoming = [{ id: "b", name: "B" }];
    const result = mergeById(existing, incoming);
    expect(Array.isArray(result)).toBe(true);
    expect((result as { id: string }[]).length).toBe(2);
  });

  it("returns error when incoming item has no id", () => {
    const result = mergeById([{ id: "a" }], [{ name: "no-id" }]);
    expect(result).toEqual({ error: "missing_id" });
  });
});

// ---------------------------------------------------------------------------
// computeStatusFromChildren
// ---------------------------------------------------------------------------

describe("computeStatusFromChildren", () => {
  it("returns open when no children", () => {
    expect(computeStatusFromChildren([])).toBe("open");
  });

  it("returns complete when all complete", () => {
    expect(computeStatusFromChildren(["complete", "complete"])).toBe("complete");
  });

  it("returns failed when any failed", () => {
    expect(computeStatusFromChildren(["complete", "failed"])).toBe("failed");
  });

  it("returns blocked when any blocked (no failed)", () => {
    expect(computeStatusFromChildren(["complete", "blocked"])).toBe("blocked");
  });

  it("returns in_progress when mix of open/complete/in_progress", () => {
    expect(computeStatusFromChildren(["open", "complete"])).toBe("in_progress");
    expect(computeStatusFromChildren(["in_progress", "open"])).toBe("in_progress");
  });

  it("returns open when all open", () => {
    expect(computeStatusFromChildren(["open", "open"])).toBe("open");
  });
});

// ---------------------------------------------------------------------------
// propagateStatuses
// ---------------------------------------------------------------------------

describe("propagateStatuses", () => {
  it("sets phase status from steps", () => {
    const plan = fullPlan();
    plan.phases[0]!.steps[0]!.status = "complete";
    plan.phases[0]!.steps[1]!.status = "complete";
    propagateStatuses(plan);
    expect(plan.phases[0]!.status).toBe("complete");
  });

  it("sets plan status from phases", () => {
    const plan = fullPlan();
    plan.phases.forEach((p) => {
      p.steps.forEach((s) => (s.status = "complete"));
    });
    propagateStatuses(plan);
    expect(plan.status).toBe("complete");
  });

  it("propagates failed upwards", () => {
    const plan = fullPlan();
    plan.phases[0]!.steps[0]!.status = "failed";
    propagateStatuses(plan);
    expect(plan.phases[0]!.status).toBe("failed");
    expect(plan.status).toBe("failed");
  });
});

// ---------------------------------------------------------------------------
// findPhase / findStep
// ---------------------------------------------------------------------------

describe("findPhase", () => {
  it("finds existing phase by id", () => {
    const plan = fullPlan();
    const phase = findPhase(plan, "p1");
    expect(phase?.id).toBe("p1");
  });

  it("returns undefined for missing phase", () => {
    expect(findPhase(fullPlan(), "nope")).toBeUndefined();
  });
});

describe("findStep", () => {
  it("finds existing step by id", () => {
    const plan = fullPlan();
    const found = findStep(plan, "s1");
    expect(found?.step.id).toBe("s1");
    expect(found?.phase.id).toBe("p1");
  });

  it("returns undefined for missing step", () => {
    expect(findStep(fullPlan(), "nope")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildStepStatusMap / buildPhaseStatusMap
// ---------------------------------------------------------------------------

describe("buildStepStatusMap", () => {
  it("contains all step ids", () => {
    const plan = fullPlan();
    const map = buildStepStatusMap(plan);
    expect(map.has("s1")).toBe(true);
    expect(map.has("s2")).toBe(true);
    expect(map.has("s3")).toBe(true);
  });

  it("reflects step statuses", () => {
    const plan = fullPlan();
    plan.phases[0]!.steps[0]!.status = "complete";
    const map = buildStepStatusMap(plan);
    expect(map.get("s1")).toBe("complete");
    expect(map.get("s2")).toBe("open");
  });
});

describe("buildPhaseStatusMap", () => {
  it("contains all phase ids", () => {
    const plan = fullPlan();
    const map = buildPhaseStatusMap(plan);
    expect(map.has("p1")).toBe(true);
    expect(map.has("p2")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// depsSatisfied
// ---------------------------------------------------------------------------

describe("depsSatisfied", () => {
  it("returns true when no dependencies", () => {
    const map = new Map<string, "complete" | "open">();
    expect(depsSatisfied({ depends_on: [] }, map)).toBe(true);
  });

  it("returns true when all deps are complete", () => {
    const map = new Map([["s1", "complete" as const]]);
    expect(depsSatisfied({ depends_on: ["s1"] }, map)).toBe(true);
  });

  it("returns false when any dep is not complete", () => {
    const map = new Map([["s1", "open" as const]]);
    expect(depsSatisfied({ depends_on: ["s1"] }, map)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validatePlanName
// ---------------------------------------------------------------------------

describe("validatePlanName", () => {
  it("returns null for valid name", () => {
    expect(validatePlanName("My Plan")).toBeNull();
  });

  it("returns error for empty name", () => {
    expect(validatePlanName("")).toBe("size_limit_exceeded");
    expect(validatePlanName("   ")).toBe("size_limit_exceeded");
  });

  it("returns error for name exceeding 256 chars", () => {
    expect(validatePlanName("x".repeat(257))).toBe("size_limit_exceeded");
  });
});

// ---------------------------------------------------------------------------
// validateNonNegativeLimit
// ---------------------------------------------------------------------------

describe("validateNonNegativeLimit", () => {
  it("returns null for zero", () => {
    expect(validateNonNegativeLimit(0)).toBeNull();
  });

  it("returns null for positive", () => {
    expect(validateNonNegativeLimit(10)).toBeNull();
  });

  it("returns error for negative", () => {
    expect(validateNonNegativeLimit(-1)).toBe("invalid_limit");
  });
});

// ---------------------------------------------------------------------------
// validateImmutableId
// ---------------------------------------------------------------------------

describe("validateImmutableId", () => {
  it("returns null when patchId matches targetId", () => {
    expect(validateImmutableId("p1", "p1")).toBeNull();
  });

  it("returns null when patchId is undefined", () => {
    expect(validateImmutableId(undefined, "p1")).toBeNull();
  });

  it("returns error when patchId differs from targetId", () => {
    expect(validateImmutableId("p2", "p1")).toBe("immutable_id");
  });
});

// ---------------------------------------------------------------------------
// validateUniqueIds
// ---------------------------------------------------------------------------

describe("validateUniqueIds", () => {
  it("returns null for plan with unique ids", () => {
    expect(validateUniqueIds(fullPlan())).toBeNull();
  });

  it("returns duplicate_id for plan with duplicate ids", () => {
    expect(validateUniqueIds(planWithDuplicateIds())).toBe("duplicate_id");
  });

  it("returns null for minimal plan", () => {
    expect(validateUniqueIds(minimalPlan())).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectCycle
// ---------------------------------------------------------------------------

describe("detectCycle", () => {
  it("returns null for acyclic graph", () => {
    const graph = new Map([["a", ["b"]], ["b", ["c"]], ["c", []]]);
    expect(detectCycle(graph)).toBeNull();
  });

  it("returns dependency_cycle for cyclic graph", () => {
    const graph = new Map([["a", ["b"]], ["b", ["a"]]]);
    expect(detectCycle(graph)).toBe("dependency_cycle");
  });

  it("returns null for empty graph", () => {
    expect(detectCycle(new Map())).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateDependencies
// ---------------------------------------------------------------------------

describe("validateDependencies", () => {
  it("returns null for valid plan", () => {
    expect(validateDependencies(fullPlan())).toBeNull();
  });

  it("returns unknown_dependency for non-existent dep", () => {
    const plan = fullPlan();
    plan.phases[0]!.steps[0]!.depends_on = ["nonexistent"];
    expect(validateDependencies(plan)).toBe("unknown_dependency");
  });

  it("returns dependency_cycle for cycle", () => {
    const plan: Plan = {
      name: "Cycle",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      phases: [
        phaseFactory({
          id: "p1",
          depends_on: ["p1"], // self-cycle
          steps: [],
        }),
      ],
    };
    expect(validateDependencies(plan)).toBe("dependency_cycle");
  });
});

// ---------------------------------------------------------------------------
// propagateStatuses — nullish branch coverage
// ---------------------------------------------------------------------------

describe("propagateStatuses — nullish phases/steps", () => {
  it("handles plan with undefined phases gracefully", () => {
    const plan = { ...minimalPlan(), phases: undefined as unknown as [] };
    // Should not throw
    propagateStatuses(plan);
    expect(plan.status).toBe("open"); // no phases, status unchanged
  });

  it("handles phase with undefined steps gracefully", () => {
    const plan = minimalPlan();
    const phase: Phase = { ...phaseFactory({ id: "p1" }), steps: undefined as unknown as [] };
    plan.phases = [phase];
    propagateStatuses(plan);
    // phase with no steps stays at its current status (no assignment)
    expect(plan.status).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// buildStepStatusMap / buildPhaseStatusMap — nullish branch coverage
// ---------------------------------------------------------------------------

describe("buildStepStatusMap — nullish branches", () => {
  it("handles plan with undefined phases", () => {
    const plan = { ...minimalPlan(), phases: undefined as unknown as [] };
    const map = buildStepStatusMap(plan);
    expect(map.size).toBe(0);
  });

  it("handles phase with undefined steps", () => {
    const plan = minimalPlan();
    const phase: Phase = { ...phaseFactory({ id: "p1" }), steps: undefined as unknown as [] };
    plan.phases = [phase];
    const map = buildStepStatusMap(plan);
    expect(map.size).toBe(0);
  });

  it("handles step with undefined status (defaults to open)", () => {
    const plan = minimalPlan();
    const step = { ...stepFactory({ id: "s1" }), status: undefined as unknown as "open" };
    plan.phases = [phaseFactory({ id: "p1", steps: [step] })];
    const map = buildStepStatusMap(plan);
    expect(map.get("s1")).toBe("open");
  });
});

describe("buildPhaseStatusMap — nullish branches", () => {
  it("handles plan with undefined phases", () => {
    const plan = { ...minimalPlan(), phases: undefined as unknown as [] };
    const map = buildPhaseStatusMap(plan);
    expect(map.size).toBe(0);
  });

  it("handles phase with undefined status (defaults to open)", () => {
    const plan = minimalPlan();
    const phase = { ...phaseFactory({ id: "p1" }), status: undefined as unknown as "open" };
    plan.phases = [phase];
    const map = buildPhaseStatusMap(plan);
    expect(map.get("p1")).toBe("open");
  });
});

// ---------------------------------------------------------------------------
// validateUniqueIds — nullish branch coverage
// ---------------------------------------------------------------------------

describe("validateUniqueIds — nullish branches", () => {
  it("handles plan with undefined phases", () => {
    const plan = { ...minimalPlan(), phases: undefined as unknown as [] };
    expect(validateUniqueIds(plan)).toBeNull();
  });

  it("handles phase with undefined steps", () => {
    const plan = minimalPlan();
    const phase: Phase = { ...phaseFactory({ id: "p1" }), steps: undefined as unknown as [] };
    plan.phases = [phase];
    expect(validateUniqueIds(plan)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateDependencies — nullish branch coverage
// ---------------------------------------------------------------------------

describe("validateDependencies — nullish branches", () => {
  it("handles plan with undefined phases", () => {
    const plan = { ...minimalPlan(), phases: undefined as unknown as [] };
    expect(validateDependencies(plan)).toBeNull();
  });

  it("handles phase without id (skips)", () => {
    const plan = minimalPlan();
    const phase = { ...phaseFactory({ id: "p1" }), id: undefined as unknown as string };
    plan.phases = [phase];
    expect(validateDependencies(plan)).toBeNull();
  });

  it("handles step without id (skips)", () => {
    const plan = minimalPlan();
    const step = { ...stepFactory({ id: "s1" }), id: undefined as unknown as string };
    plan.phases = [phaseFactory({ id: "p1", steps: [step] })];
    expect(validateDependencies(plan)).toBeNull();
  });

  it("handles phase with undefined depends_on", () => {
    const plan = minimalPlan();
    const phase = { ...phaseFactory({ id: "p1" }), depends_on: undefined as unknown as [] };
    plan.phases = [phase];
    expect(validateDependencies(plan)).toBeNull();
  });

  it("handles step with undefined depends_on", () => {
    const plan = minimalPlan();
    const step = { ...stepFactory({ id: "s1" }), depends_on: undefined as unknown as [] };
    plan.phases = [phaseFactory({ id: "p1", steps: [step] })];
    expect(validateDependencies(plan)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectCycle — multi-node acyclic path coverage
// ---------------------------------------------------------------------------

describe("detectCycle — visited node not in stack", () => {
  it("handles graph where already-visited node is referenced (no cycle)", () => {
    // Diamond dependency: c depends on b and a, b depends on a
    // When processing c, a is already visited but NOT in stack — no cycle
    const graph = new Map([
      ["a", [] as string[]],
      ["b", ["a"]],
      ["c", ["a", "b"]],
    ]);
    expect(detectCycle(graph)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateSizeLimits — nullish branches
// ---------------------------------------------------------------------------

describe("validateSizeLimits", () => {
  it("returns null for valid plan", () => {
    expect(validateSizeLimits(fullPlan())).toBeNull();
  });

  it("returns size_limit_exceeded for plan name > 256", () => {
    const plan = fullPlan();
    plan.name = "x".repeat(257);
    expect(validateSizeLimits(plan)).toBe("size_limit_exceeded");
  });

  it("returns size_limit_exceeded for string value > 20000", () => {
    const plan = fullPlan();
    plan.phases[0]!.steps[0]!.prompt = "x".repeat(20001);
    expect(validateSizeLimits(plan)).toBe("size_limit_exceeded");
  });

  it("returns size_limit_exceeded for plan with 101 phases (FR-PLAN-0005)", () => {
    const plan = minimalPlan();
    plan.phases = Array.from({ length: 101 }, (_, i) =>
      phaseFactory({ id: `p${i}`, steps: [] }),
    );
    expect(validateSizeLimits(plan)).toBe("size_limit_exceeded");
  });

  it("returns size_limit_exceeded for phase with 101 steps (FR-PLAN-0005)", () => {
    const plan = minimalPlan();
    const steps = Array.from({ length: 101 }, (_, i) =>
      stepFactory({ id: `s${i}` }),
    );
    plan.phases = [phaseFactory({ id: "p1", steps })];
    expect(validateSizeLimits(plan)).toBe("size_limit_exceeded");
  });

  it("returns size_limit_exceeded for phase with 51 dependencies (FR-PLAN-0005)", () => {
    const plan = minimalPlan();
    // Create 51 extra phases and make one depend on them all
    const extraPhases = Array.from({ length: 51 }, (_, i) =>
      phaseFactory({ id: `px${i}`, steps: [] }),
    );
    const dependentPhase = phaseFactory({
      id: "p-dependent",
      depends_on: extraPhases.map((p) => p.id),
      steps: [],
    });
    plan.phases = [...extraPhases, dependentPhase];
    expect(validateSizeLimits(plan)).toBe("size_limit_exceeded");
  });

  it("returns size_limit_exceeded for step with 51 dependencies (FR-PLAN-0005)", () => {
    const plan = minimalPlan();
    const extraSteps = Array.from({ length: 51 }, (_, i) =>
      stepFactory({ id: `sx${i}` }),
    );
    const dependentStep = stepFactory({
      id: "s-dependent",
      depends_on: extraSteps.map((s) => s.id),
    });
    plan.phases = [phaseFactory({ id: "p1", steps: [...extraSteps, dependentStep] })];
    expect(validateSizeLimits(plan)).toBe("size_limit_exceeded");
  });

  it("returns size_limit_exceeded for plan name of 257 characters via validatePlanName (FR-PLAN-0005)", () => {
    const longName = "x".repeat(257);
    expect(validatePlanName(longName)).toBe("size_limit_exceeded");
  });

  it("handles plan with undefined phases (nullish branch)", () => {
    const plan = { ...minimalPlan(), phases: undefined as unknown as [] };
    expect(validateSizeLimits(plan)).toBeNull();
  });

  it("handles phase with undefined steps (nullish branch)", () => {
    const plan = minimalPlan();
    const phase: Phase = { ...phaseFactory({ id: "p1" }), steps: undefined as unknown as [] };
    plan.phases = [phase];
    expect(validateSizeLimits(plan)).toBeNull();
  });

  it("handles phase with undefined depends_on (nullish branch)", () => {
    const plan = minimalPlan();
    const phase: Phase = { ...phaseFactory({ id: "p1" }), depends_on: undefined as unknown as [] };
    plan.phases = [phase];
    expect(validateSizeLimits(plan)).toBeNull();
  });

  it("handles step with undefined depends_on (nullish branch)", () => {
    const plan = minimalPlan();
    const step = { ...stepFactory({ id: "s1" }), depends_on: undefined as unknown as [] };
    plan.phases = [phaseFactory({ id: "p1", steps: [step] })];
    expect(validateSizeLimits(plan)).toBeNull();
  });

  it("returns size_limit_exceeded for key with length > 20000", () => {
    const plan = minimalPlan();
    const step = stepFactory({ id: "s1" });
    // Add a custom key that is too long (exploits checkObj's key length check)
    (step as unknown as Record<string, unknown>)["x".repeat(20001)] = "value";
    plan.phases = [phaseFactory({ id: "p1", steps: [step] })];
    expect(validateSizeLimits(plan)).toBe("size_limit_exceeded");
  });
});
