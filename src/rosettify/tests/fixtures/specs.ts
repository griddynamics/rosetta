import type { AcceptanceCriterion, AreaEntry, Spec, SpecsDocument } from "../../src/commands/specs/core.js";

/** FR-SPECS-0001 — one Given/When/Then acceptance criterion, with sane defaults. */
export function makeAcceptance(overrides: Partial<AcceptanceCriterion> = {}): AcceptanceCriterion {
  return {
    given: "a precondition holds",
    when: "an action occurs",
    then: "an outcome follows",
    ...overrides,
  };
}

/** FR-SPECS-0001 — a full spec unit with every field populated, area CHK (fictional, mirrors help-content.ts). */
export function makeSpec(overrides: Partial<Spec> = {}): Spec {
  return {
    id: "FR-CHK-0001",
    type: "FR",
    level: "System",
    title: "Sample spec",
    statement: "When the cart changes, the system shall recompute the total.",
    rationale: "",
    source: "User",
    priority: "Must",
    status: "Draft",
    approved_by: "",
    changed: "2026-01-01T00:00:00.000Z",
    changed_by: "",
    verification: "Test",
    acceptance: [makeAcceptance()],
    depends_on: [],
    related: [],
    implementation: "NotStarted",
    implementation_notes: "",
    notes: "",
    ...overrides,
  };
}

/** FR-SPECS-0002 — a specs document; empty by default, area CHK pre-registered. */
export function makeDoc(overrides: Partial<SpecsDocument> = {}): SpecsDocument {
  return {
    component: "checkout",
    description: "",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    previous_version: null,
    areas: [{ code: "CHK", name: "CHK" } as AreaEntry],
    specs: [],
    ...overrides,
  };
}

/** A minimal valid add-payload object (no guarded fields, no id collision) — plain object, not a Spec. */
export function makeAddItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "FR-CHK-0001",
    type: "FR",
    title: "Sample spec",
    statement: "When the cart changes, the system shall recompute the total.",
    source: "User",
    priority: "Must",
    verification: "Test",
    acceptance: [makeAcceptance()],
    ...overrides,
  };
}
