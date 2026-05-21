/**
 * Unit tests for template registry — FR-PLAN-0033 / FR-PLAN-0035 / FR-PLAN-0036.
 *
 * Byte-equivalence strategy: to compare TS-embedded template content vs. asset JSON files,
 * we parse both sides with JSON.parse and then compare their canonical JSON representations
 * using JSON.stringify with stable key order (sorted keys). This gives semantic equivalence
 * that is immune to irrelevant whitespace differences in the source files.
 *
 * For true content equivalence we compare JSON.stringify(JSON.parse(assetFileContent))
 * against JSON.stringify(tsEmbeddedContent) after normalizing both through the same
 * serialization so any key-order differences are eliminated.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createTemplates, upsertTemplates, buildTemplateCatalog } from "../../../../src/commands/plan/templates/index.js";
import { forOrchestrator } from "../../../../src/commands/plan/templates/create/for-orchestrator.js";
import { forSubagent } from "../../../../src/commands/plan/templates/upsert/for-subagent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/unit/plan/templates/ → rosettify/ is 4 levels up, then rosetta/ is one more up
const ROSETTIFY_ROOT = path.resolve(__dirname, "../../../../");
const REPO_ROOT = path.resolve(ROSETTIFY_ROOT, "..");

// Asset paths (in the monorepo docs folder, sibling of rosettify/)
const CREATE_ASSET = path.join(
  REPO_ROOT,
  "docs/requirements/rosettify/assets/templates/create-for-orchestrator.json",
);
const UPSERT_ASSET = path.join(
  REPO_ROOT,
  "docs/requirements/rosettify/assets/templates/upsert-for-subagent.json",
);

/** Canonical JSON comparison: sort all object keys recursively. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k]));
  return "{" + pairs.join(",") + "}";
}

// ---------------------------------------------------------------------------
// FR-PLAN-0033 — Template registry structure
// ---------------------------------------------------------------------------

describe("Template registry — FR-PLAN-0033", () => {
  // FR-PLAN-0033 — for-orchestrator is in createTemplates ONLY
  it("for-orchestrator is in createTemplates only (not in upsertTemplates)", () => {
    expect("for-orchestrator" in createTemplates).toBe(true);
    expect("for-orchestrator" in upsertTemplates).toBe(false);
  });

  // FR-PLAN-0033 — for-subagent is in upsertTemplates ONLY
  it("for-subagent is in upsertTemplates only (not in createTemplates)", () => {
    expect("for-subagent" in upsertTemplates).toBe(true);
    expect("for-subagent" in createTemplates).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0035 — Byte-equivalence: for-orchestrator TS vs. asset JSON
// ---------------------------------------------------------------------------

describe("forOrchestrator — FR-PLAN-0035 byte-equivalence with create-for-orchestrator.json", () => {
  // FR-PLAN-0035 / FR-PLAN-0033 — content byte-equivalent to asset JSON
  // Strategy: parse both from JSON, then compare canonical representations.
  it("TS-embedded content is semantically equivalent to the asset JSON file", () => {
    const assetRaw = fs.readFileSync(CREATE_ASSET, "utf8");
    const assetContent = JSON.parse(assetRaw) as unknown;

    const tsContent = forOrchestrator.content as unknown;

    // Compare canonical JSON representations (key-order independent, whitespace independent)
    expect(canonicalize(tsContent)).toBe(canonicalize(assetContent));
  });

  it("forOrchestrator has name=for-orchestrator and correct placeholders", () => {
    expect(forOrchestrator.name).toBe("for-orchestrator");
    expect(Array.from(forOrchestrator.placeholders)).toEqual(["plan-name", "plan-description"]);
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0036 — Byte-equivalence: for-subagent TS vs. asset JSON
// ---------------------------------------------------------------------------

describe("forSubagent — FR-PLAN-0036 byte-equivalence with upsert-for-subagent.json", () => {
  // FR-PLAN-0036 / FR-PLAN-0033 — content byte-equivalent to asset JSON
  it("TS-embedded content is semantically equivalent to the asset JSON file", () => {
    const assetRaw = fs.readFileSync(UPSERT_ASSET, "utf8");
    const assetContent = JSON.parse(assetRaw) as unknown;

    const tsContent = forSubagent.content as unknown;

    expect(canonicalize(tsContent)).toBe(canonicalize(assetContent));
  });

  // FR-PLAN-0036 — step IDs prefixed with [phase-id]-s- for plan-wide uniqueness
  it("forSubagent step IDs are all prefixed with [phase-id]-s-", () => {
    const content = forSubagent.content as { steps: Array<{ id: string }> };
    for (const step of content.steps) {
      expect(step.id).toMatch(/^\[phase-id\]-s-/);
    }
  });

  it("forSubagent has name=for-subagent and correct placeholders", () => {
    expect(forSubagent.name).toBe("for-subagent");
    expect(Array.from(forSubagent.placeholders)).toEqual(["phase-id", "phase-name", "phase-description"]);
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0032 — buildTemplateCatalog shape
// ---------------------------------------------------------------------------

describe("buildTemplateCatalog — FR-PLAN-0032", () => {
  it("returns catalog with create and upsert arrays", () => {
    const catalog = buildTemplateCatalog();
    expect(Array.isArray(catalog.create)).toBe(true);
    expect(Array.isArray(catalog.upsert)).toBe(true);
  });

  it("each catalog entry has name, brief, and placeholders", () => {
    const catalog = buildTemplateCatalog();
    for (const entry of [...catalog.create, ...catalog.upsert]) {
      expect(typeof entry.name).toBe("string");
      expect(typeof entry.brief).toBe("string");
      expect(Array.isArray(entry.placeholders)).toBe(true);
    }
  });

  it("for-orchestrator appears in create catalog", () => {
    const catalog = buildTemplateCatalog();
    const names = catalog.create.map((e) => e.name);
    expect(names).toContain("for-orchestrator");
  });

  it("for-subagent appears in upsert catalog", () => {
    const catalog = buildTemplateCatalog();
    const names = catalog.upsert.map((e) => e.name);
    expect(names).toContain("for-subagent");
  });
});
