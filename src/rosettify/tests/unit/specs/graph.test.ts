/**
 * Unit tests for commands/specs/graph.ts — pure graph primitives (FR-SPECS-0022) and the
 * cmdGraph envelope wrapper (target mode / whole-doc mode / cross-document resolution).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  buildGraph,
  closure,
  reverseClosure,
  enumerateCycles,
  edgeList,
  unresolvedRefs,
  cmdGraph,
} from "../../../src/commands/specs/graph.js";
import { saveSpecs } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-graph-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

// ---------------------------------------------------------------------------
// Pure primitives
// ---------------------------------------------------------------------------

describe("buildGraph", () => {
  it("unions specs from multiple docs by id", () => {
    const docA = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] });
    const docB = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0002" })] });
    const g = buildGraph([docA, docB]);
    expect(g.specsById.size).toBe(2);
  });

  it("treats a doc with specs missing entirely as contributing nothing (no crash)", () => {
    const doc = {} as unknown as Parameters<typeof buildGraph>[0][number];
    const g = buildGraph([doc]);
    expect(g.specsById.size).toBe(0);
  });

  it("treats a spec with depends_on/related literally undefined as having no edges", () => {
    const spec = { id: "FR-CHK-0001" } as unknown as ReturnType<typeof makeSpec>;
    const doc = makeDoc({ specs: [spec] });
    const g = buildGraph([doc]);
    expect(g.depends.get("FR-CHK-0001")).toEqual([]);
    expect(g.related.get("FR-CHK-0001")).toEqual([]);
  });
});

describe("closure — transitive forward closure (dependencies)", () => {
  it("returns [B, A] for C depends_on B, B depends_on A", () => {
    const map = new Map([
      ["C", ["B"]],
      ["B", ["A"]],
      ["A", []],
    ]);
    expect(closure(map, "C")).toEqual(["B", "A"]);
  });

  it("excludes the start node even under a cycle", () => {
    const map = new Map([
      ["A", ["B"]],
      ["B", ["A"]],
    ]);
    expect(closure(map, "A")).toEqual(["B"]);
  });

  it("returns [] for a node with no outgoing edges", () => {
    const map = new Map([["A", []]]);
    expect(closure(map, "A")).toEqual([]);
  });
});

describe("reverseClosure — impact set (dependents)", () => {
  it("returns dependents [B, C] when B and C depend_on A", () => {
    const map = new Map([
      ["B", ["A"]],
      ["C", ["A"]],
      ["A", []],
    ]);
    expect(reverseClosure(map, "A").sort()).toEqual(["B", "C"]);
  });

  it("returns [] for a node nothing depends on", () => {
    const map = new Map([["A", []]]);
    expect(reverseClosure(map, "A")).toEqual([]);
  });

  it("returns multi-hop dependents [B, C] when C depends_on B depends_on A (transitive impact set, >=2 hops)", () => {
    const map = new Map([
      ["C", ["B"]],
      ["B", ["A"]],
      ["A", []],
    ]);
    expect(reverseClosure(map, "A").sort()).toEqual(["B", "C"]);
  });
});

describe("enumerateCycles — whole-doc cycle enumeration", () => {
  it("returns one cycle for a two-node depends_on cycle X<->Y", () => {
    const map = new Map([
      ["X", ["Y"]],
      ["Y", ["X"]],
    ]);
    const cycles = enumerateCycles(map);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]!.every((e) => e.kind === "depends_on")).toBe(true);
  });

  it("returns the exact {from,to} edge identities for a two-node depends_on cycle X<->Y", () => {
    const map = new Map([
      ["X", ["Y"]],
      ["Y", ["X"]],
    ]);
    const cycles = enumerateCycles(map);
    expect(cycles).toEqual([
      [
        { from: "X", to: "Y", kind: "depends_on" },
        { from: "Y", to: "X", kind: "depends_on" },
      ],
    ]);
  });

  it("returns [] for an acyclic graph", () => {
    const map = new Map([
      ["A", ["B"]],
      ["B", []],
    ]);
    expect(enumerateCycles(map)).toEqual([]);
  });

  it("reports each cycle exactly once (not once per rotation)", () => {
    const map = new Map([
      ["A", ["B"]],
      ["B", ["C"]],
      ["C", ["A"]],
    ]);
    expect(enumerateCycles(map)).toHaveLength(1);
  });

  it("does not recurse into a referenced node that is not itself a source key (no crash, no false cycle)", () => {
    // "B" is referenced by "A" but is never a key in the map — order.get("B") is undefined,
    // so the traversal must not treat it as part of a cycle.
    const map = new Map([["A", ["B"]]]);
    expect(enumerateCycles(map)).toEqual([]);
  });
});

describe("edgeList", () => {
  it("flattens both depends_on and related maps into one edge list", () => {
    const depends = new Map([["A", ["B"]]]);
    const related = new Map([["A", ["C"]]]);
    const edges = edgeList(depends, related);
    expect(edges).toContainEqual({ from: "A", to: "B", kind: "depends_on" });
    expect(edges).toContainEqual({ from: "A", to: "C", kind: "related" });
  });
});

describe("unresolvedRefs", () => {
  it("reports a referenced id absent from the resolved union", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "A", depends_on: ["MISSING"] })] });
    const g = buildGraph([doc]);
    expect(unresolvedRefs(g)).toEqual(["MISSING"]);
  });

  it("returns [] when every reference resolves", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "A", depends_on: [] })] });
    const g = buildGraph([doc]);
    expect(unresolvedRefs(g)).toEqual([]);
  });

  it("reports a related-only unresolved reference (not just depends_on)", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "A", depends_on: [], related: ["GHOST"] })] });
    const g = buildGraph([doc]);
    expect(unresolvedRefs(g)).toEqual(["GHOST"]);
  });
});

// ---------------------------------------------------------------------------
// cmdGraph — target mode / whole-doc mode / cross-document
// ---------------------------------------------------------------------------

describe("cmdGraph — target mode", () => {
  it("returns dependencies=[B,A] for target C where C depends_on B, B depends_on A", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({
        specs: [
          makeSpec({ id: "FR-CHK-0001" }), // A
          makeSpec({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] }), // B
          makeSpec({ id: "FR-CHK-0003", depends_on: ["FR-CHK-0002"] }), // C
        ],
      }),
    );
    const result = await cmdGraph(file, "FR-CHK-0003");
    expect(result.ok).toBe(true);
    expect(result.result!.dependencies).toEqual(["FR-CHK-0002", "FR-CHK-0001"]);
  });

  it("returns dependents including every spec that depends_on the target", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({
        specs: [
          makeSpec({ id: "FR-CHK-0001" }), // A
          makeSpec({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] }), // B
          makeSpec({ id: "FR-CHK-0003", depends_on: ["FR-CHK-0001"] }), // C
        ],
      }),
    );
    const result = await cmdGraph(file, "FR-CHK-0001");
    expect(result.ok).toBe(true);
    expect(result.result!.dependents!.sort()).toEqual(["FR-CHK-0002", "FR-CHK-0003"]);
  });

  it("returns direct related ids for the target", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({
        specs: [makeSpec({ id: "FR-CHK-0001", related: ["FR-CHK-0002"] }), makeSpec({ id: "FR-CHK-0002" })],
      }),
    );
    const result = await cmdGraph(file, "FR-CHK-0001");
    expect(result.result!.related).toEqual(["FR-CHK-0002"]);
  });

  it("returns target_not_found for an unknown target id", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdGraph(file, "FR-CHK-9999");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("target_not_found");
  });
});

describe("cmdGraph — whole-document mode", () => {
  it("returns edges and cycles for the whole document", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({
        specs: [
          makeSpec({ id: "FR-CHK-0001", depends_on: ["FR-CHK-0002"] }),
          makeSpec({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] }),
        ],
      }),
    );
    const result = await cmdGraph(file);
    expect(result.ok).toBe(true);
    expect(result.result!.cycles!.length).toBeGreaterThan(0);
    expect(result.result!.edges!.length).toBeGreaterThan(0);
    expect(result.result!.dependencies).toBeUndefined();
  });
});

describe("cmdGraph — cross-document resolution via additional_paths", () => {
  it("resolves a reference present only in an additional document", async () => {
    const primary = specsFile("primary.json");
    const extra = specsFile("extra.json");
    saveSpecs(primary, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", depends_on: ["FR-OTHER-0001"] })] }));
    saveSpecs(extra, makeDoc({ specs: [makeSpec({ id: "FR-OTHER-0001" })] }));

    const result = await cmdGraph(primary, "FR-CHK-0001", [extra]);
    expect(result.ok).toBe(true);
    expect(result.result!.unresolved).toEqual([]);
    expect(result.result!.dependencies).toEqual(["FR-OTHER-0001"]);
  });

  it("reports a reference unresolved in any supplied document", async () => {
    const primary = specsFile("primary.json");
    saveSpecs(primary, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", depends_on: ["FR-GHOST-0001"] })] }));
    const result = await cmdGraph(primary, "FR-CHK-0001");
    expect(result.ok).toBe(true);
    expect(result.result!.unresolved).toEqual(["FR-GHOST-0001"]);
  });

  it("skips a missing/corrupted additional document (best-effort)", async () => {
    const primary = specsFile("primary.json");
    saveSpecs(primary, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdGraph(primary, "FR-CHK-0001", [specsFile("does-not-exist.json")]);
    expect(result.ok).toBe(true);
  });
});

describe("cmdGraph — document errors", () => {
  it("returns specs_not_found for a missing document", async () => {
    const result = await cmdGraph(specsFile("nope.json"));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_not_found");
  });

  it("returns specs_file_corrupted for invalid JSON", async () => {
    const file = specsFile();
    fs.writeFileSync(file, "{{not json{{");
    const result = await cmdGraph(file);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_file_corrupted");
  });
});
