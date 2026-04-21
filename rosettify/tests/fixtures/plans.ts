import type { Plan, Phase, Step } from "../../src/commands/plan/core.js";

/**
 * Canonical two-phase, three-step plan for testing.
 * Phase 1: two steps (s1, s2 depends on s1)
 * Phase 2: one step (s3 depends on s1), depends on p1
 */
export function fullPlan(): Plan {
  return {
    name: "Test Plan",
    description: "A canonical test plan",
    status: "open",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    phases: [
      {
        id: "p1",
        name: "Phase 1",
        description: "First phase",
        status: "open",
        depends_on: [],
        steps: [
          {
            id: "s1",
            name: "Step 1",
            prompt: "Do step 1",
            status: "open",
            depends_on: [],
          },
          {
            id: "s2",
            name: "Step 2",
            prompt: "Do step 2",
            status: "open",
            depends_on: ["s1"],
          },
        ],
      },
      {
        id: "p2",
        name: "Phase 2",
        description: "Second phase",
        status: "open",
        depends_on: ["p1"],
        steps: [
          {
            id: "s3",
            name: "Step 3",
            prompt: "Do step 3",
            status: "open",
            depends_on: ["s1"],
          },
        ],
      },
    ],
  };
}

export function minimalPlan(): Plan {
  return {
    name: "Minimal Plan",
    description: "",
    status: "open",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    phases: [],
  };
}

export function singleStepPlan(): Plan {
  return {
    name: "Single Step Plan",
    description: "",
    status: "open",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    phases: [
      {
        id: "p1",
        name: "Phase 1",
        description: "",
        status: "open",
        depends_on: [],
        steps: [
          {
            id: "s1",
            name: "Step 1",
            prompt: "Do it",
            status: "open",
            depends_on: [],
          },
        ],
      },
    ],
  };
}

export function completedPlan(): Plan {
  return {
    name: "Completed Plan",
    description: "",
    status: "complete",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    phases: [
      {
        id: "p1",
        name: "Phase 1",
        description: "",
        status: "complete",
        depends_on: [],
        steps: [
          {
            id: "s1",
            name: "Step 1",
            prompt: "Done",
            status: "complete",
            depends_on: [],
          },
        ],
      },
    ],
  };
}

export function planWithDuplicateIds(): Plan {
  return {
    name: "Duplicate IDs Plan",
    description: "",
    status: "open",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    phases: [
      {
        id: "p1",
        name: "Phase 1",
        description: "",
        status: "open",
        depends_on: [],
        steps: [
          {
            id: "s1",
            name: "Step 1",
            prompt: "Do it",
            status: "open",
            depends_on: [],
          },
          {
            id: "s1",
            name: "Step 1 duplicate",
            prompt: "Duplicate",
            status: "open",
            depends_on: [],
          },
        ],
      },
    ],
  };
}

export function stepFactory(overrides: Partial<Step> = {}): Step {
  return {
    id: "s1",
    name: "Step 1",
    prompt: "Do it",
    status: "open",
    depends_on: [],
    ...overrides,
  };
}

export function phaseFactory(overrides: Partial<Phase> = {}): Phase {
  return {
    id: "p1",
    name: "Phase 1",
    description: "",
    status: "open",
    depends_on: [],
    steps: [],
    ...overrides,
  };
}
