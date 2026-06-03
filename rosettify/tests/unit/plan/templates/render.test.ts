/**
 * Unit tests for renderTemplate — FR-PLAN-0034.
 * Unit tests for parsePhaseSteps — FR-PLAN-0043.
 * Strict bidirectional matching: 3 failure modes + happy path + literal substitution.
 * parsePhaseSteps: ok array, empty array, invalid json, non-array.
 */
import { describe, it, expect } from "vitest";
import { renderTemplate, parsePhaseSteps } from "../../../../src/commands/plan/templates/render.js";

// ---------------------------------------------------------------------------
// FR-PLAN-0034 — Placeholder render with strict bidirectional matching
// ---------------------------------------------------------------------------

describe("renderTemplate — FR-PLAN-0034 happy path", () => {
  // FR-PLAN-0034 — all declared placeholders provided and no extra tokens → success
  it("renders template with correct placeholder substitution", () => {
    const template = {
      placeholders: ["plan-name", "plan-description"] as const,
      content: {
        name: "[plan-name]",
        description: "[plan-description]",
        phases: [],
      },
    };

    const result = renderTemplate(template, {
      "plan-name": "My Feature",
      "plan-description": "Implements the feature",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rendered = result.rendered as { name: string; description: string; phases: unknown[] };
    expect(rendered.name).toBe("My Feature");
    expect(rendered.description).toBe("Implements the feature");
    expect(rendered.phases).toEqual([]);
  });

  // FR-PLAN-0034 — literal substitution: values containing [other] text are not re-interpreted
  it("performs literal substitution — values containing [other-token] are not re-interpreted", () => {
    const template = {
      placeholders: ["plan-name"] as const,
      content: { name: "[plan-name]" },
    };

    // Value contains brackets that look like a placeholder — must be treated as literal
    const result = renderTemplate(template, { "plan-name": "Value with [other-token] inside" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rendered = result.rendered as { name: string };
    // The [other-token] part must NOT be substituted — it's a literal string value
    expect(rendered.name).toBe("Value with [other-token] inside");
  });

  // FR-PLAN-0034 — nested substitution in arrays and nested objects
  it("substitutes placeholders deep in nested arrays and objects", () => {
    const template = {
      placeholders: ["phase-id", "phase-name"] as const,
      content: {
        id: "[phase-id]",
        name: "[phase-name]",
        steps: [
          { id: "[phase-id]-s-first", name: "First under [phase-name]" },
        ],
      },
    };

    const result = renderTemplate(template, { "phase-id": "ph-impl", "phase-name": "Implementation" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rendered = result.rendered as {
      id: string;
      name: string;
      steps: Array<{ id: string; name: string }>;
    };
    expect(rendered.id).toBe("ph-impl");
    expect(rendered.name).toBe("Implementation");
    expect(rendered.steps[0]!.id).toBe("ph-impl-s-first");
    expect(rendered.steps[0]!.name).toBe("First under Implementation");
  });
});

describe("renderTemplate — FR-PLAN-0034 failure mode 1: unexpected param from caller", () => {
  // FR-PLAN-0034 — caller provides key not in declared set → unexpected_template_param
  it("returns unexpected_template_param when caller provides undeclared key", () => {
    const template = {
      placeholders: ["plan-name"] as const,
      content: { name: "[plan-name]" },
    };

    const result = renderTemplate(template, {
      "plan-name": "OK",
      "extra-key": "Not declared",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("unexpected_template_param");
    expect(result.error).toContain("extra-key");
  });
});

describe("renderTemplate — FR-PLAN-0034 failure mode 2: missing declared placeholder", () => {
  // FR-PLAN-0034 — declared placeholder not provided by caller → missing_template_param
  it("returns missing_template_param when declared placeholder is not provided", () => {
    const template = {
      placeholders: ["plan-name", "plan-description"] as const,
      content: { name: "[plan-name]", description: "[plan-description]" },
    };

    // Only provide plan-name, omit plan-description
    const result = renderTemplate(template, { "plan-name": "My Plan" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("missing_template_param");
    expect(result.error).toContain("plan-description");
  });
});

describe("renderTemplate — FR-PLAN-0034 failure mode 3: undeclared token in template content", () => {
  // FR-PLAN-0034 — pre-substitution scan: [token] in template content not in declared set → unexpected_template_param
  it("returns unexpected_template_param when template content has undeclared [token]", () => {
    // Template declares only [plan-name] but content has [undeclared-token]
    const template = {
      placeholders: ["plan-name"] as const,
      content: {
        name: "[plan-name]",
        notes: "This references [undeclared-token] which is not declared",
      },
    };

    const result = renderTemplate(template, { "plan-name": "My Plan" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("unexpected_template_param");
    expect(result.error).toContain("undeclared-token");
  });
});

describe("renderTemplate — FR-PLAN-0034 empty placeholders", () => {
  // FR-PLAN-0034 — template with no placeholders: empty params and no [token] in content → success
  it("renders template with no placeholders when no params provided and no tokens in content", () => {
    const template = {
      placeholders: [] as const,
      content: { name: "Static Name", phases: [] },
    };

    const result = renderTemplate(template, {});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rendered = result.rendered as { name: string };
    expect(rendered.name).toBe("Static Name");
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0043 — parsePhaseSteps
// ---------------------------------------------------------------------------

describe("parsePhaseSteps — FR-PLAN-0043", () => {
  // FR-PLAN-0043 — valid JSON array of step objects → ok=true, steps returned
  it("returns ok=true and parsed steps for a valid JSON array of step objects", () => {
    const steps = [
      { id: "step-1", name: "Step One", prompt: "Do step one" },
      { id: "step-2", name: "Step Two", prompt: "Do step two" },
    ];
    const result = parsePhaseSteps(JSON.stringify(steps));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps).toHaveLength(2);
    expect((result.steps[0] as { id: string }).id).toBe("step-1");
    expect((result.steps[1] as { id: string }).id).toBe("step-2");
  });

  // FR-PLAN-0043 — empty array is valid; leaves seeded steps unchanged
  it("returns ok=true and empty steps array for empty JSON array input", () => {
    const result = parsePhaseSteps("[]");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps).toHaveLength(0);
    expect(Array.isArray(result.steps)).toBe(true);
  });

  // FR-PLAN-0043 — invalid JSON → invalid_phase_steps
  it("returns ok=false with invalid_phase_steps for invalid JSON string", () => {
    const result = parsePhaseSteps("not valid json");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("invalid_phase_steps");
  });

  // FR-PLAN-0043 — valid JSON but not an array → invalid_phase_steps
  it("returns ok=false with invalid_phase_steps when JSON is an object, not an array", () => {
    const result = parsePhaseSteps('{"id":"step-1","name":"Not an array"}');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("invalid_phase_steps");
  });

  // FR-PLAN-0043 — null JSON value (valid JSON, not array) → invalid_phase_steps
  it("returns ok=false with invalid_phase_steps when JSON is null", () => {
    const result = parsePhaseSteps("null");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("invalid_phase_steps");
  });

  // FR-PLAN-0043 — number JSON value (valid JSON, not array) → invalid_phase_steps
  it("returns ok=false with invalid_phase_steps when JSON is a number", () => {
    const result = parsePhaseSteps("42");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("invalid_phase_steps");
  });
});
