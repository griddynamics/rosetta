import type { AcceptanceCriterion, AreaEntry, Spec, SpecsDocument } from "../../src/commands/specs/core.js";

/**
 * FR-SPECS-0001 — one EARS acceptance criterion, with sane defaults. Defaults to the `event`
 * pattern, so it carries `when` and no other condition word (EARS_CONDITION_WORD). The default id
 * matches makeSpec's default spec id; makeSpec re-derives it whenever the spec id is overridden.
 */
export function makeAcceptance(overrides: Partial<AcceptanceCriterion> = {}): AcceptanceCriterion {
  return {
    id: "FR-CHK-0001.AC1",
    ears: "event",
    when: "an action occurs",
    system: "the checkout service",
    shall: "produce an outcome",
    ...overrides,
  };
}

/**
 * FR-SPECS-0001 — a full spec unit with every field populated, area CHK (fictional, mirrors
 * help-content.ts). The defaults are deliberately validate-clean: the criterion id is derived from
 * the spec's own id so `<spec-id>.AC<n>` holds under an id override, and both `subsystem` and
 * `component` are named so no location gap is reported at any level.
 */
export function makeSpec(overrides: Partial<Spec> = {}): Spec {
  const id = overrides.id ?? "FR-CHK-0001";
  return {
    id,
    type: "FR",
    level: "System",
    subsystem: "checkout",
    component: "cart",
    title: "Sample spec",
    statement: "When the cart changes, the system shall recompute the total.",
    rationale: "",
    evidence: [],
    source: "User",
    priority: "Must",
    status: "Draft",
    approved_by: "",
    changed: "2026-01-01T00:00:00.000Z",
    changed_by: "",
    verification: "Test",
    acceptance: [makeAcceptance({ id: `${id}.AC1` })],
    depends_on: [],
    related: [],
    implementation: "NotStarted",
    implementation_notes: "",
    notes: "",
    ...overrides,
  };
}

/** FR-SPECS-0002 — a specs document; empty by default, area CHK pre-registered. The nine reserved
 * quality-characteristic codes are deliberately absent so ensureReservedAreas stays observable. */
export function makeDoc(overrides: Partial<SpecsDocument> = {}): SpecsDocument {
  return {
    system: "checkout",
    description: "",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    previous_version: null,
    purged_ids: [],
    areas: [{ code: "CHK", name: "CHK" } as AreaEntry],
    specs: [],
    ...overrides,
  };
}

/**
 * A minimal valid add-payload object (no guarded fields, no id collision) — plain object, not a
 * Spec. The criterion carries no id: the command assigns `<spec-id>.AC<n>` (FR-SPECS-0001 AC3),
 * so the payload stays correct under any id override.
 */
export function makeAddItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "FR-CHK-0001",
    type: "FR",
    title: "Sample spec",
    statement: "When the cart changes, the system shall recompute the total.",
    source: "User",
    priority: "Must",
    verification: "Test",
    acceptance: [{ ears: "event", when: "an action occurs", system: "the checkout service", shall: "produce an outcome" }],
    ...overrides,
  };
}
