// Generic cycle-detection primitive, shared across commands.
// Lifted verbatim from commands/plan/core.ts so both `plan` and `specs` can import a single
// implementation from `shared/` instead of one command importing from another command.

/**
 * Detects a cycle in a directed graph given as an adjacency map (node -> list of neighbor ids).
 * Returns "dependency_cycle" if a cycle is found, otherwise null.
 */
export function detectCycle(
  graph: Map<string, string[]>,
): string | null {
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    inStack.add(node);
    for (const neighbor of graph.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (inStack.has(neighbor)) {
        return true;
      }
    }
    inStack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) return "dependency_cycle";
    }
  }
  return null;
}
