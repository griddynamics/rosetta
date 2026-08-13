/**
 * Unit tests for commands/specs/query-filter.ts — query grammar (parseQuery) and matching
 * (applyFilter). FR-SPECS-0012.
 */
import { describe, it, expect } from "vitest";
import { parseQuery, applyFilter, type Filter } from "../../../src/commands/specs/query-filter.js";
import { makeSpec } from "../../fixtures/specs.js";

function isError(x: Filter | { error: string }): x is { error: string } {
  return "error" in x;
}

// ---------------------------------------------------------------------------
// parseQuery — grammar
// ---------------------------------------------------------------------------

describe("parseQuery — empty/undefined query", () => {
  it("returns an empty Filter for undefined", () => {
    const f = parseQuery(undefined);
    expect(isError(f)).toBe(false);
    expect((f as Filter).terms).toEqual([]);
    expect((f as Filter).includeRemoved).toBe(false);
  });

  it("returns an empty Filter for a blank/whitespace-only string", () => {
    const f = parseQuery("   ");
    expect(isError(f)).toBe(false);
    expect((f as Filter).terms).toEqual([]);
  });
});

describe("parseQuery — AND (space-separated terms)", () => {
  it("parses two field terms as two AND-combined terms", () => {
    const f = parseQuery("type:FR status:Draft") as Filter;
    expect(f.terms).toHaveLength(2);
    expect(f.terms[0]).toMatchObject({ kind: "field", key: "type", values: ["FR"] });
    expect(f.terms[1]).toMatchObject({ kind: "field", key: "status", values: ["Draft"] });
  });
});

describe("parseQuery — comma = OR within a field", () => {
  it("parses area:CLI,MCP into one term with two values", () => {
    const f = parseQuery("area:CLI,MCP") as Filter;
    expect(f.terms).toHaveLength(1);
    expect(f.terms[0]).toMatchObject({ kind: "field", key: "area", values: ["CLI", "MCP"] });
  });
});

describe("parseQuery — leading '-' negates a term", () => {
  it("marks a field term negated", () => {
    const f = parseQuery("-status:Removed") as Filter;
    expect(f.terms[0]).toMatchObject({ kind: "field", key: "status", negate: true });
  });

  it("marks a free-text term negated", () => {
    const f = parseQuery("-retry") as Filter;
    expect(f.terms[0]).toMatchObject({ kind: "free", value: "retry", negate: true });
  });

  it("treats a lone '-' with nothing to negate as free text", () => {
    const f = parseQuery("-") as Filter;
    expect(f.terms[0]).toMatchObject({ kind: "free", value: "-", negate: false });
  });
});

describe("parseQuery — quoted phrase", () => {
  it("parses a quoted field value as exact/case-sensitive (quoted:true)", () => {
    const f = parseQuery('title:"exact phrase"') as Filter;
    expect(f.terms[0]).toMatchObject({ kind: "field", key: "title", values: ["exact phrase"], quoted: true });
  });

  it("parses a quoted bare term as free text", () => {
    const f = parseQuery('"has: a colon"') as Filter;
    expect(f.terms[0]).toMatchObject({ kind: "free", value: "has: a colon" });
  });

  it("returns invalid_query for an unterminated quote", () => {
    const f = parseQuery('title:"unterminated');
    expect(isError(f) && f.error).toBe("invalid_query");
  });

  it("unescapes an escaped quote inside a quoted value", () => {
    const f = parseQuery('title:"say \\"hi\\""') as Filter;
    expect(f.terms[0]).toMatchObject({ values: ['say "hi"'] });
  });
});

describe("parseQuery — bare free-text over title+statement", () => {
  it("parses a bare word as a free-text term", () => {
    const f = parseQuery("retry") as Filter;
    expect(f.terms[0]).toEqual({ kind: "free", value: "retry", negate: false });
  });
});

describe("parseQuery — colon-quoting rule", () => {
  it("an unquoted colon-bearing token with an unrecognized key is invalid_filter", () => {
    const f = parseQuery("http://example.com");
    expect(isError(f) && f.error).toBe("invalid_filter");
  });

  it("a legitimate colon in free text must be quoted to pass", () => {
    const f = parseQuery('"http://example.com"') as Filter;
    expect(f.terms[0]).toMatchObject({ kind: "free", value: "http://example.com" });
  });
});

describe("parseQuery — unknown filter key", () => {
  it("returns invalid_filter for an unrecognized key", () => {
    const f = parseQuery("bogus:value");
    expect(isError(f) && f.error).toBe("invalid_filter");
  });
});

describe("parseQuery — malformed query", () => {
  it("returns invalid_query for an empty value after colon", () => {
    const f = parseQuery("type:");
    expect(isError(f) && f.error).toBe("invalid_query");
  });

  it("returns invalid_query for an empty comma slot", () => {
    const f = parseQuery("type:FR,");
    expect(isError(f) && f.error).toBe("invalid_query");
  });
});

describe("parseQuery — include_removed pseudo-key", () => {
  it("sets includeRemoved when include_removed:true", () => {
    const f = parseQuery("include_removed:true") as Filter;
    expect(f.includeRemoved).toBe(true);
    expect(f.terms).toHaveLength(0);
  });

  it("returns invalid_query for include_removed with a non-true value", () => {
    const f = parseQuery("include_removed:false");
    expect(isError(f) && f.error).toBe("invalid_query");
  });

  it("treats a negated include_removed as a no-op (does not error, stays excluded)", () => {
    const f = parseQuery("-include_removed:true") as Filter;
    expect(f.includeRemoved).toBe(false);
  });
});

describe("parseQuery — combined AND/OR/NOT/free-text", () => {
  it("parses '-status:Removed retry' as negated field + free text", () => {
    const f = parseQuery("-status:Removed retry") as Filter;
    expect(f.terms).toHaveLength(2);
    expect(f.terms[0]).toMatchObject({ kind: "field", key: "status", negate: true, values: ["Removed"] });
    expect(f.terms[1]).toMatchObject({ kind: "free", value: "retry" });
  });
});

// ---------------------------------------------------------------------------
// applyFilter — matching semantics
// ---------------------------------------------------------------------------

describe("applyFilter — exclude Removed by default", () => {
  it("excludes Removed specs when the filter has no override", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", status: "Draft" }), makeSpec({ id: "FR-CHK-0002", status: "Removed" })];
    const filter = parseQuery(undefined) as Filter;
    const result = applyFilter(specs, filter);
    expect(result.map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("includes Removed specs when include_removed:true", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", status: "Draft" }), makeSpec({ id: "FR-CHK-0002", status: "Removed" })];
    const filter = parseQuery("include_removed:true") as Filter;
    const result = applyFilter(specs, filter);
    expect(result.map((s) => s.id).sort()).toEqual(["FR-CHK-0001", "FR-CHK-0002"]);
  });

  it("includes Removed specs when a term explicitly matches status:Removed", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", status: "Draft" }), makeSpec({ id: "FR-CHK-0002", status: "Removed" })];
    const filter = parseQuery("status:Removed") as Filter;
    const result = applyFilter(specs, filter);
    expect(result.map((s) => s.id)).toEqual(["FR-CHK-0002"]);
  });
});

describe("applyFilter — type/status AND", () => {
  it("returns only specs matching every AND-combined term", () => {
    const specs = [
      makeSpec({ id: "FR-CHK-0001", type: "NFR", status: "Approved" }),
      makeSpec({ id: "FR-CHK-0002", type: "NFR", status: "Draft" }),
      makeSpec({ id: "FR-CHK-0003", type: "FR", status: "Approved" }),
    ];
    const filter = parseQuery("type:NFR status:Approved") as Filter;
    expect(applyFilter(specs, filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });
});

describe("applyFilter — area key (via parseId)", () => {
  it("matches specs whose id's area matches the value list", () => {
    const specs = [
      makeSpec({ id: "FR-CLI-0001" }),
      makeSpec({ id: "FR-MCP-0001" }),
      makeSpec({ id: "FR-OTHER-0001" }),
    ];
    const filter = parseQuery("area:CLI,MCP") as Filter;
    expect(applyFilter(specs, filter).map((s) => s.id).sort()).toEqual(["FR-CLI-0001", "FR-MCP-0001"]);
  });
});

describe("applyFilter — depends_on / related keys", () => {
  it("matches specs whose depends_on contains the given id", () => {
    const specs = [
      makeSpec({ id: "FR-CHK-0001", depends_on: [] }),
      makeSpec({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] }),
    ];
    const filter = parseQuery("depends_on:FR-CHK-0001") as Filter;
    expect(applyFilter(specs, filter).map((s) => s.id)).toEqual(["FR-CHK-0002"]);
  });

  it("matches specs whose related contains the given id", () => {
    const specs = [
      makeSpec({ id: "FR-CHK-0001", related: [] }),
      makeSpec({ id: "FR-CHK-0002", related: ["FR-CHK-0001"] }),
    ];
    const filter = parseQuery("related:FR-CHK-0001") as Filter;
    expect(applyFilter(specs, filter).map((s) => s.id)).toEqual(["FR-CHK-0002"]);
  });
});

describe("applyFilter — free text over title+statement", () => {
  it("matches case-insensitively as substring", () => {
    const specs = [
      makeSpec({ id: "FR-CHK-0001", title: "Retry logic", statement: "shall x" }),
      makeSpec({ id: "FR-CHK-0002", title: "Unrelated", statement: "shall y" }),
    ];
    const filter = parseQuery("RETRY") as Filter;
    expect(applyFilter(specs, filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("negated free text excludes matches", () => {
    const specs = [
      makeSpec({ id: "FR-CHK-0001", title: "Retry logic" }),
      makeSpec({ id: "FR-CHK-0002", title: "Unrelated" }),
    ];
    const filter = parseQuery("-retry") as Filter;
    expect(applyFilter(specs, filter).map((s) => s.id)).toEqual(["FR-CHK-0002"]);
  });
});

describe("applyFilter — quoted exact vs unquoted case-insensitive on enum fields", () => {
  it("unquoted status value matches case-insensitively", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", status: "Draft" })];
    const filter = parseQuery("status:draft") as Filter;
    expect(applyFilter(specs, filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("quoted status value requires exact case match", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", status: "Draft" })];
    const filter = parseQuery('status:"draft"') as Filter;
    expect(applyFilter(specs, filter)).toEqual([]);
  });
});

describe("applyFilter — every FILTER_KEYS field is matchable (priority/implementation/verification/source/title/statement)", () => {
  it("matches priority", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", priority: "Must" }), makeSpec({ id: "FR-CHK-0002", priority: "Could" })];
    expect(applyFilter(specs, parseQuery("priority:Must") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("matches implementation", () => {
    const specs = [
      makeSpec({ id: "FR-CHK-0001", implementation: "Implemented" }),
      makeSpec({ id: "FR-CHK-0002", implementation: "NotStarted" }),
    ];
    expect(applyFilter(specs, parseQuery("implementation:Implemented") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("matches verification", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", verification: "Demo" }), makeSpec({ id: "FR-CHK-0002", verification: "Test" })];
    expect(applyFilter(specs, parseQuery("verification:Demo") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("matches source", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", source: "Inferred" }), makeSpec({ id: "FR-CHK-0002", source: "User" })];
    expect(applyFilter(specs, parseQuery("source:Inferred") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("matches title via the explicit title: field key (substring)", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", title: "Cart total" }), makeSpec({ id: "FR-CHK-0002", title: "Other" })];
    expect(applyFilter(specs, parseQuery("title:cart") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("matches statement via the explicit statement: field key (substring)", () => {
    const specs = [
      makeSpec({ id: "FR-CHK-0001", statement: "The system shall recompute totals." }),
      makeSpec({ id: "FR-CHK-0002", statement: "Something unrelated." }),
    ];
    expect(applyFilter(specs, parseQuery("statement:recompute") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });
});

// ---------------------------------------------------------------------------
// FR-SPECS-0012 — the requirement-unit fields added with the criterion model.
// ---------------------------------------------------------------------------

describe("applyFilter — level, subsystem and component", () => {
  it("matches level exactly", () => {
    const specs = [
      makeSpec({ id: "FR-CHK-0001", level: "Component" }),
      makeSpec({ id: "FR-CHK-0002", level: "System" }),
    ];
    expect(applyFilter(specs, parseQuery("level:Component") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("matches level case-insensitively when the value is unquoted", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", level: "Subsystem" })];
    expect(applyFilter(specs, parseQuery("level:subsystem") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("requires an exact case match for a quoted level value", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", level: "Subsystem" })];
    expect(applyFilter(specs, parseQuery('level:"subsystem"') as Filter)).toEqual([]);
  });

  it("matches subsystem exactly", () => {
    const specs = [
      makeSpec({ id: "FR-CHK-0001", subsystem: "checkout" }),
      makeSpec({ id: "FR-CHK-0002", subsystem: "billing" }),
    ];
    expect(applyFilter(specs, parseQuery("subsystem:checkout") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("matches component exactly", () => {
    const specs = [
      makeSpec({ id: "FR-CHK-0001", component: "cart" }),
      makeSpec({ id: "FR-CHK-0002", component: "ledger" }),
    ];
    expect(applyFilter(specs, parseQuery("component:cart") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("does not match a spec whose subsystem is empty against a named one", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", subsystem: "" })];
    expect(applyFilter(specs, parseQuery("subsystem:checkout") as Filter)).toEqual([]);
  });

  it.each(["subsystem", "component"] as const)("treats a %s that is literally undefined as empty", (field) => {
    const spec = makeSpec({ id: "FR-CHK-0001" });
    delete (spec as Record<string, unknown>)[field];
    expect(applyFilter([spec], parseQuery(`${field}:checkout`) as Filter)).toEqual([]);
  });

  it("negates a level term", () => {
    const specs = [
      makeSpec({ id: "FR-CHK-0001", level: "Component" }),
      makeSpec({ id: "FR-CHK-0002", level: "System" }),
    ];
    expect(applyFilter(specs, parseQuery("-level:Component") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0002"]);
  });
});

// FR-SPECS-0012 — `ears` lives on the criterion, so a filter over units can only ask whether a
// unit has ANY criterion declaring that pattern.
describe("applyFilter — ears", () => {
  const withEars = (id: string, ...patterns: string[]) =>
    makeSpec({
      id,
      acceptance: patterns.map((ears, i) => ({
        id: `${id}.AC${i + 1}`,
        ears: ears as never,
        system: "the system",
        shall: "act",
      })),
    });

  it("matches a unit whose only criterion declares that pattern", () => {
    const specs = [withEars("FR-CHK-0001", "event"), withEars("FR-CHK-0002", "ubiquitous")];
    expect(applyFilter(specs, parseQuery("ears:event") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("matches a unit where any one of several criteria declares that pattern", () => {
    const specs = [withEars("FR-CHK-0001", "ubiquitous", "unwanted"), withEars("FR-CHK-0002", "ubiquitous")];
    expect(applyFilter(specs, parseQuery("ears:unwanted") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("does not match a unit with no criteria at all", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", acceptance: [] })];
    expect(applyFilter(specs, parseQuery("ears:event") as Filter)).toEqual([]);
  });

  it("treats acceptance that is literally undefined as no criteria", () => {
    const spec = makeSpec({ id: "FR-CHK-0001" });
    delete (spec as Record<string, unknown>)["acceptance"];
    expect(applyFilter([spec], parseQuery("ears:event") as Filter)).toEqual([]);
  });

  it("matches a pattern case-insensitively when unquoted", () => {
    expect(applyFilter([withEars("FR-CHK-0001", "event")], parseQuery("ears:EVENT") as Filter)).toHaveLength(1);
  });

  it("accepts an OR list of patterns", () => {
    const specs = [
      withEars("FR-CHK-0001", "event"),
      withEars("FR-CHK-0002", "state"),
      withEars("FR-CHK-0003", "ubiquitous"),
    ];
    expect(applyFilter(specs, parseQuery("ears:event,state") as Filter).map((s) => s.id)).toEqual([
      "FR-CHK-0001",
      "FR-CHK-0002",
    ]);
  });
});

// FR-SPECS-0012 — `evidence` takes a closed two-value vocabulary, so a value outside it is a
// malformed value on a KNOWN key: invalid_query, never invalid_filter.
describe("applyFilter / parseQuery — evidence", () => {
  const cited = makeSpec({ id: "FR-CHK-0001", evidence: ["src/cart.ts:10-24"] });
  const bare = makeSpec({ id: "FR-CHK-0002", evidence: [] });

  it("selects the units that cite a location with evidence:present", () => {
    expect(applyFilter([cited, bare], parseQuery("evidence:present") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("selects the units that cite none with evidence:absent", () => {
    expect(applyFilter([cited, bare], parseQuery("evidence:absent") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0002"]);
  });

  it("accepts the vocabulary case-insensitively", () => {
    expect(applyFilter([cited, bare], parseQuery("evidence:PRESENT") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("treats evidence that is literally undefined as absent", () => {
    const spec = makeSpec({ id: "FR-CHK-0003" });
    delete (spec as Record<string, unknown>)["evidence"];
    expect(applyFilter([spec], parseQuery("evidence:absent") as Filter)).toHaveLength(1);
  });

  it("returns invalid_query for a value outside the two-value vocabulary", () => {
    const result = parseQuery("evidence:maybe");
    expect(isError(result)).toBe(true);
    expect((result as { error: string }).error).toBe("invalid_query");
  });

  it("keeps negation legal on evidence", () => {
    expect(applyFilter([cited, bare], parseQuery("-evidence:present") as Filter).map((s) => s.id)).toEqual(["FR-CHK-0002"]);
  });
});

describe("parseQuery — additional grammar edge cases", () => {
  it("tolerates trailing whitespace after the last term", () => {
    const f = parseQuery("type:FR   ") as Filter;
    expect(f.terms).toHaveLength(1);
  });

  it("parses a three-value comma list", () => {
    const f = parseQuery("area:CLI,MCP,SPECS") as Filter;
    expect(f.terms[0]).toMatchObject({ values: ["CLI", "MCP", "SPECS"] });
  });

  it("returns invalid_query for an unterminated quote inside a field's value list", () => {
    const f = parseQuery('area:"unterminated,MCP');
    expect(isError(f) && f.error).toBe("invalid_query");
  });
});

describe("applyFilter — empty query returns all (subject to Removed exclusion)", () => {
  it("returns every non-Removed spec", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0002" })];
    const filter = parseQuery("") as Filter;
    expect(applyFilter(specs, filter).map((s) => s.id).sort()).toEqual(["FR-CHK-0001", "FR-CHK-0002"]);
  });
});
