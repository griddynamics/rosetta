// Implements FR-SPECS-0022 (dependency/relation graph analysis). Pure graph primitives per
// SPECS §11.3, plus the cmdGraph envelope wrapper (SPECS §10) — both completed in this stage
// per the execution plan (S5), since readDocWithRetry/envelope/logger are all already available
// from S1/S2 and cmdGraph needs no other S6 subcommand file.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { readDocWithRetry } from "../../shared/doc-io.js";
import type { Spec, SpecsDocument } from "./core.js";
import type { SpecEdge, SpecGraphResult } from "./output.js";
import { ERR_SPECS_FILE_CORRUPTED, ERR_SPECS_NOT_FOUND, ERR_TARGET_NOT_FOUND } from "./errors.js";

// ---------------------------------------------------------------------------
// Pure graph primitives (SPECS §11.3)
// ---------------------------------------------------------------------------

export interface ResolvedGraph {
  specsById: Map<string, Spec>;
  depends: Map<string, string[]>;
  related: Map<string, string[]>;
}

/** Unions the specs of every provided document by id (a later doc's spec wins on id collision —
 * cross-doc resolution is read-only diagnostics, not a merge with defined precedence rules). */
export function buildGraph(docs: SpecsDocument[]): ResolvedGraph {
  const specsById = new Map<string, Spec>();
  const depends = new Map<string, string[]>();
  const related = new Map<string, string[]>();
  for (const doc of docs) {
    for (const spec of doc.specs ?? []) {
      specsById.set(spec.id, spec);
      depends.set(spec.id, [...(spec.depends_on ?? [])]);
      related.set(spec.id, [...(spec.related ?? [])]);
    }
  }
  return { specsById, depends, related };
}

/** Transitive forward closure of `start` over `map` (BFS), excluding `start` itself even if a
 * cycle would otherwise bring traversal back to it. */
export function closure(map: Map<string, string[]>, start: string): string[] {
  const visited = new Set<string>([start]);
  const result: string[] = [];
  const queue = [...(map.get(start) ?? [])];
  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++]!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    result.push(cur);
    for (const next of map.get(cur) ?? []) queue.push(next);
  }
  return result;
}

/** The impact set of `start`: every node that transitively depends on it, i.e. `closure` over
 * the reversed adjacency of `map`. */
export function reverseClosure(map: Map<string, string[]>, start: string): string[] {
  const reverse = new Map<string, string[]>();
  for (const [from, tos] of map) {
    for (const to of tos) {
      const list = reverse.get(to);
      if (list) list.push(from);
      else reverse.set(to, [from]);
    }
  }
  return closure(reverse, start);
}

/**
 * Enumerates every elementary (simple) cycle in `depends` as an edge list. A single-doc
 * depends_on graph is guaranteed acyclic by core.ts's validateDependsAcyclic at write time —
 * this function exists for the cross-document case, where each doc is individually acyclic but
 * their union may not be. Uses the standard "start node is the lexicographically smallest node
 * on the cycle" technique so each cycle is reported exactly once, not once per rotation.
 * Exponential in the worst case (dense cyclic components) — acceptable here since this is a
 * diagnostic/read-only path, never on the write hot path, and real dependency graphs are sparse.
 */
export function enumerateCycles(depends: Map<string, string[]>): SpecEdge[][] {
  const nodes = [...depends.keys()].sort();
  const order = new Map(nodes.map((id, i) => [id, i]));
  const cycles: SpecEdge[][] = [];
  const path: string[] = [];
  const onPath = new Set<string>();

  function dfs(start: string, current: string): void {
    path.push(current);
    onPath.add(current);
    for (const next of depends.get(current) ?? []) {
      if (next === start) {
        const edges: SpecEdge[] = path.map((from, i) => ({
          from,
          to: i + 1 < path.length ? path[i + 1]! : start,
          kind: "depends_on" as const,
        }));
        cycles.push(edges);
      } else if (!onPath.has(next) && (order.get(next) ?? -1) >= (order.get(start) ?? -1)) {
        dfs(start, next);
      }
    }
    path.pop();
    onPath.delete(current);
  }

  for (const start of nodes) dfs(start, start);
  return cycles;
}

/** Flattens both adjacency maps into a single edge list (whole-doc graph mode). */
export function edgeList(depends: Map<string, string[]>, related: Map<string, string[]>): SpecEdge[] {
  const edges: SpecEdge[] = [];
  for (const [from, tos] of depends) {
    for (const to of tos) edges.push({ from, to, kind: "depends_on" });
  }
  for (const [from, tos] of related) {
    for (const to of tos) edges.push({ from, to, kind: "related" });
  }
  return edges;
}

/** Every id referenced by depends_on/related that is absent from the resolved union of docs. */
export function unresolvedRefs(g: ResolvedGraph): string[] {
  const unresolved = new Set<string>();
  for (const tos of g.depends.values()) {
    for (const to of tos) if (!g.specsById.has(to)) unresolved.add(to);
  }
  for (const tos of g.related.values()) {
    for (const to of tos) if (!g.specsById.has(to)) unresolved.add(to);
  }
  return [...unresolved];
}

// ---------------------------------------------------------------------------
// cmdGraph — FR-SPECS-0022, SPECS §10. Target mode returns
// {dependencies, dependents, related, cycles:[], unresolved}; whole-doc mode returns
// {edges, cycles, unresolved}. Missing target id -> target_not_found. additionalPaths are
// read best-effort: a missing/corrupted extra doc is skipped (cross-doc resolution is
// supplementary diagnostics, not a write path with fail-fast integrity requirements).
// ---------------------------------------------------------------------------

export async function cmdGraph(
  specsFile: string,
  targetId?: string,
  additionalPaths?: string[],
): Promise<RunEnvelope<SpecGraphResult>> {
  try {
    let doc: SpecsDocument | null;
    try {
      doc = await readDocWithRetry<SpecsDocument>(specsFile);
    } catch {
      return err(ERR_SPECS_FILE_CORRUPTED);
    }
    if (!doc) return err(ERR_SPECS_NOT_FOUND);

    const docs: SpecsDocument[] = [doc];
    for (const extraPath of additionalPaths ?? []) {
      try {
        const extra = await readDocWithRetry<SpecsDocument>(extraPath);
        if (extra) docs.push(extra);
      } catch {
        // best-effort — a corrupted supplementary doc is skipped, not fatal to the primary graph
      }
    }

    const graph = buildGraph(docs);

    if (targetId) {
      if (!graph.specsById.has(targetId)) return err(ERR_TARGET_NOT_FOUND);
      const result: SpecGraphResult = {
        dependencies: closure(graph.depends, targetId),
        dependents: reverseClosure(graph.depends, targetId),
        related: [...(graph.related.get(targetId) ?? [])],
        cycles: [],
        unresolved: unresolvedRefs(graph),
      };
      logger.info({ specsFile, targetId }, "specs graph: target mode");
      return ok(result);
    }

    const result: SpecGraphResult = {
      edges: edgeList(graph.depends, graph.related),
      cycles: enumerateCycles(graph.depends),
      unresolved: unresolvedRefs(graph),
    };
    logger.info({ specsFile }, "specs graph: whole-doc mode");
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}
