/**
 * Structural-completeness tests for commands/specs/help-content.ts (FR-SPECS-0060, FR-SPECS-0061).
 * Content-safety (no leaked ids/paths) is covered separately by leakage.test.ts; this file checks
 * shape/coverage only: every required top-level section is present, all 16 subcommands are
 * registered each with the required fields and dual-form examples, and every FR-SPECS-0061 note
 * is present.
 */
import { describe, it, expect } from "vitest";
import { specsHelpContent, specsNotes } from "../../../src/commands/specs/help-content.js";

const VALID_SUBCOMMANDS = [
  "add",
  "get",
  "query",
  "update",
  "delete",
  "purge",
  "implemented",
  "approve",
  "deprecate",
  "restore",
  "reopen",
  "validate",
  "graph",
  "render",
  "info",
  "migrate",
] as const;

// FR-SPECS-0061 — the 12 caller-facing behaviors, by distinguishing substring (stable even if
// exact wording is later polished, since this test's job is coverage, not verbatim wording).
const FR_SPECS_0061_NOTE_TOPICS = [
  "inline JSON string",
  "ids are caller-provided",
  "Draft/NotStarted",
  "guarded fields",
  "Modified",
  "approve runs validation",
  "reversible soft-delete",
  "all-or-nothing",
  "query grammar",
  "UTC and shown in local time",
  "one-time import",
  "single human-readable string",
];

describe("specsHelpContent — top-level sections present (FR-SPECS-0060)", () => {
  it.each([
    "name",
    "brief",
    "description",
    "specs_file",
    "concepts",
    "subcommands",
    "schemas",
    "limits",
    "query_notation",
    "notes",
    "next_steps_for_ai",
  ])("has top-level key '%s'", (key) => {
    expect(specsHelpContent).toHaveProperty(key);
  });

  it("concepts covers every required sub-topic", () => {
    expect(specsHelpContent.concepts).toHaveProperty("spec_unit");
    expect(specsHelpContent.concepts).toHaveProperty("areas");
    expect(specsHelpContent.concepts).toHaveProperty("status_lifecycle");
    expect(specsHelpContent.concepts).toHaveProperty("depends_on_vs_related");
    expect(specsHelpContent.concepts).toHaveProperty("guarded_fields");
    expect(specsHelpContent.concepts).toHaveProperty("validate_then_approve");
  });

  it("query_notation is present and non-empty", () => {
    expect(specsHelpContent.query_notation.grammar.length).toBeGreaterThan(0);
    expect(specsHelpContent.query_notation.keys.length).toBeGreaterThan(0);
  });

  it("next_steps_for_ai is present and non-empty", () => {
    expect(specsHelpContent.next_steps_for_ai.length).toBeGreaterThan(0);
  });
});

describe("specsHelpContent.subcommands — all 16 registered, each fully specified (FR-SPECS-0060)", () => {
  it("has exactly 16 subcommand entries", () => {
    expect(specsHelpContent.subcommands).toHaveLength(16);
  });

  it("registers every subcommand name exactly once", () => {
    const names = specsHelpContent.subcommands.map((s) => s.name);
    expect(names.sort()).toEqual([...VALID_SUBCOMMANDS].sort());
    expect(new Set(names).size).toBe(names.length); // no duplicates
  });

  it.each(VALID_SUBCOMMANDS)("subcommand '%s' has name/brief/usage/args/description/required and both example forms", (name) => {
    const sub = specsHelpContent.subcommands.find((s) => s.name === name);
    expect(sub).toBeDefined();
    expect(typeof sub!.name).toBe("string");
    expect(sub!.brief.length).toBeGreaterThan(0);
    expect(sub!.usage.length).toBeGreaterThan(0);
    expect(sub!.args).toBeTypeOf("object");
    expect(sub!.required.length).toBeGreaterThan(0); // required-inputs statement (FR-SPECS-0060)
    expect(sub!.description.length).toBeGreaterThan(0);
    expect(sub!.examples).toBeDefined();
    expect(sub!.examples.tip.length).toBeGreaterThan(0);
    expect(sub!.examples.real.length).toBeGreaterThan(0);
  });
});

describe("specsHelpContent.notes — all 12 FR-SPECS-0061 items present", () => {
  it("has exactly 12 notes", () => {
    expect(specsNotes).toHaveLength(12);
    expect(specsHelpContent.notes).toHaveLength(12);
  });

  it.each(FR_SPECS_0061_NOTE_TOPICS)("covers the note topic: '%s'", (topic) => {
    expect(specsNotes.some((n) => n.includes(topic))).toBe(true);
  });
});
