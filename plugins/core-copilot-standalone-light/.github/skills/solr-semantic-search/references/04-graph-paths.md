# Graph Construction and Path Resolution

The graph layer takes raw `StagedTag`s and produces a finite set of "viable interpretations" of the phrase as paths through a directed weighted multigraph. This file covers JGraphT integration, the vertex/edge model, K-shortest paths, quasi-positions for multi-word synonyms, and graph filtering.

## Why a graph

A phrase "sony wh-1000xm5 earpads" can be interpreted multiple ways:

1. `[sony](brand) + [wh-1000xm5](model) + [earpads](category)` — three separate concept tags
2. `[sony wh-1000xm5](multi-word model) + [earpads](category)` — two tags
3. `[sony](spell of "sonny") + [wh-1000xm5](model) + [earpads](category)` — same as #1 with different relation
4. `[sony wh-1000xm5 earpads](full-phrase concept "Sony WH-1000XM5 Earpads")` — one tag, if such a concept exists

Each is a different path through the phrase positions. Each has a different score. The graph + K-shortest paths algorithm enumerates these alternatives so downstream code can compare and choose.

## Vertices and edges

The graph uses positions as vertices, tags as edges:

```
DirectedWeightedMultigraph<Integer, StagedTag>
                          ├── Integer = position (0..N) or quasi-position (-1, -2, -3...)
                          └── StagedTag = an edge from start position to end position
```

Position 0 is "before the first token". Position N is "after the last token". An edge from start to end represents "this StagedTag covers tokens from position start to position end".

For "sony wh-1000xm5 earpads":
```
positions: 0      1          2        3
            ┌──>───┴────>─────┴───>────┘
              sony  wh-1000xm5  earpads

             Edge: [sony] from 0 → 1
             Edge: [wh-1000xm5] from 1 → 2
             Edge: [earpads]  from 2 → 3
             Edge: [sony wh-1000xm5] from 0 → 2  (multi-word concept, if exists)
             Edge: [sony wh-1000xm5 earpads] from 0 → 3  (full-phrase concept, if exists)
```

A path from vertex 0 to vertex N visits some subset of these edges. The interpretation is "this user phrase resolves to these specific tags."

## Building the graph

```java
public static DirectedWeightedMultigraph<Integer, StagedTag> buildGraph(
        StageConfig stageConfig,
        SemanticGraphSources sources) {

    boolean isAnyTokenRecognized = sources.getEdges().stream()
        .anyMatch(StagedTag::isRecognized);
    if (!isAnyTokenRecognized) {
        return null;  // nothing to do
    }

    // First pass: build with ALL edges
    DirectedWeightedMultigraph<Integer, StagedTag> nonCollapsedGraph =
        toGraph(sources.getNodesPositions(),
                sources.getQuasiNodesPositions(),
                sources.getEdges());

    // Filter excessive edges (e.g., too many synonyms)
    EdgeFilter.filterOutExcessiveEdges(nonCollapsedGraph, stageConfig);

    // Collapse equivalent edges by position+optionality
    Set<StagedTag> filteredEdges = nonCollapsedGraph.edgeSet();
    List<StagedTag> collapsed = EdgeFilter.collapseEdges(filteredEdges, null);

    // Final pass: build collapsed
    return toGraph(sources.getNodesPositions(),
                   sources.getQuasiNodesPositions(),
                   collapsed);
}

private static DirectedWeightedMultigraph<Integer, StagedTag> toGraph(
        Collection<Integer> nodes,
        Collection<Integer> quasiNodes,
        Collection<StagedTag> edges) {
    DirectedWeightedMultigraph<Integer, StagedTag> dg =
        new DirectedWeightedMultigraph<>(StagedTag.class);
    nodes.forEach(dg::addVertex);
    quasiNodes.forEach(dg::addVertex);
    for (StagedTag edge : edges) {
        dg.addEdge(edge.getStart(), edge.getEnd(), edge);
    }
    return dg;
}
```

JGraphT's `DirectedWeightedMultigraph<V, E>`:
- "Multigraph" — allows multiple edges between same vertex pair (we need this; "sony" can have multiple tags from different concept fields)
- "Directed" — edges go start→end, not bidirectional
- "Weighted" — each edge has a weight (here, the StagedTag's combined boost)

## K-shortest paths

JGraphT provides `KShortestSimplePaths<V, E>`:

```java
public static final int MAX_NUMBER_OF_PATHS = 25;

public static <T> List<GraphPath<Integer, T>> getAllEdgePaths(
        DirectedWeightedMultigraph<Integer, T> graph) {

    if (graph == null) return List.of();

    // determine maximum path length
    TreeSet<Integer> vertexSet = graph.vertexSet().stream()
        .filter(i -> i >= 0)
        .collect(toCollection(TreeSet::new));

    int maxQuasiPathLength = graph.vertexSet().stream()
        .filter(i -> i < 0)
        .map(TagEdge::parseQuasiPosition)
        .mapToInt(arr -> arr[3] + 2)
        .max().orElse(0);

    int maxPathLength = Math.max(maxQuasiPathLength, vertexSet.size());

    KShortestSimplePaths<Integer, T> kShortestPaths =
        new KShortestSimplePaths<>(graph, maxPathLength);

    return kShortestPaths.getPaths(vertexSet.first(), vertexSet.last(),
                                    MAX_NUMBER_OF_PATHS);
}
```

`MAX_NUMBER_OF_PATHS` (25) caps the number of paths returned. More paths → more downstream work. 25 is a pragmatic balance.

"Simple" in `KShortestSimplePaths` means "no repeated vertices" — paths don't loop back. For our graph (positions strictly forward), every path is naturally simple, but the algorithm name is just stating the constraint.

`maxPathLength` is the longest possible path. We compute it as max of (vertex count, quasi-positions span) to ensure quasi-positions paths aren't truncated.

The result: up to 25 `GraphPath<Integer, StagedTag>` objects. Each has `getEdgeList()` — the list of tags along this interpretation.

## Quasi-positions for multi-word synonyms

A multi-word synonym is an edge where ONE source shingle maps to MULTIPLE target tokens. Example:

```
phrase:        "cushions"  (one token at position 0, ending at position 1)
synonym:       "cushions" → "ear cushions" (two tokens)
```

Without intermediate vertices, you can't represent the synonym path: there's no vertex between 0 and 1 to put "ear" at.

Solution: **quasi-positions** — negative-id vertices that act as intermediaries:

```
positions:   0             1
              ├──[cushions]──┤             ← original edge
              ├──[ear]──>(−1)──[cushions]──┤  ← synonym path via quasi-position
```

The vertex `-1` is virtual; the edges `[ear]@(0→-1)` and `[cushions]@(-1→1)` together cover position 0 to position 1, just like the direct edge `[cushions]@(0→1)`.

K-shortest finds both as valid paths:
- Path 1: `[cushions]` directly
- Path 2: `[ear] → [cushions]` via quasi

Quasi-position assignment uses an encoding that prevents collisions. Different multi-word synonyms get different negative ids. The encoding is something like:

```java
TagEdge.calculateQuasiPosition(start, offset, synonymNum, totalNodesToAdd, currentNodeNum)
```

Where:
- `start, offset` — original phrase position info
- `synonymNum` — which synonym (if multiple multi-word synonyms exist for this shingle)
- `totalNodesToAdd` — how many intermediate nodes needed for THIS synonym
- `currentNodeNum` — which intermediate node we're building (1, 2, ...)

The function returns a deterministic negative integer such that no two distinct (synonym, position) pairs collide. Implementation detail; the user-facing concept is just "quasi-positions = virtual vertices for multi-word syns."

### Multi-word synonyms in `createGraph` (TagHandler internal)

Inside the tagger, building the synonym graph during shingle processing:

```java
for (String multiwordSyn : multiwordSynonymsList) {
    int nodesToAdd = multiwordSyn.size() - 1;
    if (nodesToAdd == 0) {
        // single-word synonym; just add direct edge
        addMultiwordSynEdge(..., shingle, ..., 0, start, end);
        continue;
    }
    int nodeNum = 1;
    int startNode = start;
    int endNode = calculateQuasiPosition(start, offset, synonymNum, nodesToAdd, nodeNum);

    for (int i = 0; i < nodesToAdd; i++) {
        if (i + 1 < nodesToAdd) nodeNum++;
        addMultiwordSynEdge(..., shingle, ..., i, startNode, endNode);
        startNode = endNode;
        endNode = endNode - 1;  // next quasi-position
    }
    endNode = end;  // last edge ends at original end position
    addMultiwordSynEdge(..., shingle, ..., nodesToAdd, startNode, endNode);
    synonymNum++;
}
```

The result for `"cushions" → "ear cushions"` (2-word synonym, 1 node to add):
```
edge 0: from start to quasi(-1):  token="ear"  (substring of synonym)
edge 1: from quasi(-1) to end:     token="cushions" (substring of synonym)
```

These edges have a special `MultiSynSubShingle` wrapper that links back to the original shingle, so downstream code can treat the path as "ONE multi-word synonym match" rather than "two independent tags."

## Edge collapsing

Different concept lookups can produce equivalent edges (same start/end, same field, equivalent token). The `EdgeFilter.collapseEdges()` step deduplicates:

```java
List<StagedTag> collapsed = EdgeFilter.collapseEdges(allEdges, null);
```

After collapse, two edges with same `(start, end, field, optionality)` become one. This reduces the graph's edge count and makes paths more meaningful.

## Excessive edge filtering

If you have hundreds of synonym entries for one shingle, the graph blows up. `EdgeFilter.filterOutExcessiveEdges` caps the per-position edge count:

```java
EdgeFilter.filterOutExcessiveEdges(graph, stageConfig);
```

Configurable per-stage. Common limit: keep top-N synonym edges by weight, drop the rest. Without this, a noisy synonym source can produce O(synonyms²) paths which dominates downstream cost.

## Path coverage

A "complete" path covers every token position from start (0) to end (N). An incomplete path skips positions. Most stages reject incomplete paths — the user's full phrase should be accounted for. Some lenient stages allow partial coverage (with corresponding mm relaxation).

`StagedTagUtils.hasFullCompleteCoverage(path)` checks coverage:
```java
public static boolean hasFullCompleteCoverage(GraphPath<Integer, StagedTag> path) {
    return path.getEdgeList().stream()
        .allMatch(tag -> tag.isRecognized()
                       && tag.getTerms().stream()
                           .anyMatch(term -> term.getField().isCompleteMatch()));
}
```

Where `isCompleteMatch()` is a property of the field config — true for fields that represent the entire concept (e.g., a product category name) rather than a sub-component.

## Visualizing graphs

`GraphUtils.toDot` generates a graphviz DOT representation:

```java
public static String toDot(DirectedWeightedMultigraph<Integer, StagedTag> graph,
                            String description) {
    // ... uses DOTExporter ...
}
```

Returns a string like:
```
digraph G {
  rankdir=LR;
  label="myStage";
  labelloc=t;
  0 -> 1 [label="CONCEPT: 'sony' in brand_name_concept(50000)^1.0"
          color="green" style="solid"];
  1 -> 2 [label="CONCEPT: 'wh-1000xm5' in model_name_concept(8000)^1.0"
          color="green" style="solid"];
  ...
}
```

Pipe to graphviz:
```bash
dot -Tpng input.dot > graph.png
```

Color coding from `toDot`:
- Green: CONCEPT (exact match, the strongest)
- Red: SYN, MULTI_SYN (synonym match)
- Blue: SPELL (spell-corrected match)
- Purple: PREFIX (prefix match)
- Black: unrecognized / fallback

Style:
- Solid: mandatory field tag
- Dashed: optional field tag

For debugging multi-stage processing, generate the DOT at each stage and watch how filtering progresses. Tells you immediately what's being kept and what's being dropped.

## Common issues

### Empty graph

If `buildGraph` returns null, it means **no token was recognized at all**. Either:
- Concepts don't exist for these terms in this language/source
- Filters (lang/source) excluded all matches
- Phrase is gibberish

Check with `debug=true` on the tagger — does the response have any `tags`?

### Disconnected vertices

If a token at position K has no edges, paths can't traverse through K. This breaks full-phrase paths.

Mitigations:
- Stage allows incomplete coverage (relaxed mm)
- Add a fallback `unrecognized` edge spanning the gap (some stages do this automatically)
- Raise tagger `maxTag` to surface more candidates

### Too many paths

If K-shortest returns 25 paths and they're all different orderings of the same tags, the graph has too much ambiguity. Reduce by:
- Stricter ambiguity resolver (drop weak alternatives more aggressively)
- Lower `MAX_NUMBER_OF_PATHS`
- Filter excessive synonym edges

### Quasi-position collision

Encoding bug: two synonyms get same quasi id. Symptoms: paths through quasi merge unexpectedly. Diagnose by emitting DOT and looking for paths that reuse quasi vertices in a way that doesn't make sense. Fix: review `calculateQuasiPosition` arithmetic.

### K-shortest performance

For graphs with 100+ edges, K-shortest is O(K × V × E) at worst. If you hit performance issues here, options:
- Reduce K (fewer paths)
- Reduce edges (more aggressive ambiguity resolution before this step)
- Use `AllDirectedPaths` only when you need every path; usually K-shortest with k=25 is fine
