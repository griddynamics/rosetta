# Ambiguity Resolution

Ambiguity resolution is what keeps the graph from exploding into hundreds of weak alternatives. Two complementary resolvers handle different kinds of overlap. This file explains both, when to use which, and how to compose them.

## The problem

After tagging, the graph typically has many overlapping interpretations:

```
Phrase: "wh-1000xm5"
Tags found:
  [wh-1000xm5] from model_name_concept (weight=8000) — strong match
  [wh-1000xm5] from description_text (weight=2)       — weak match (matches every "wh-1000xm5" mention)
  [wh-1000xm5] from category_concept (weight=10)      — weak match
```

All three are "valid". But keeping all three means the downstream query becomes:
```
(model_name_concept:wh-1000xm5^8000)
OR (description_text:wh-1000xm5^2)
OR (category_concept:wh-1000xm5^10)
```

The weak alternatives drag down precision. The user clearly meant the Sony WH-1000XM5.

## Two resolvers

### `PathAmbiguityResolver` — drop weak alternatives when a strong complete path exists

Used when ranges overlap and a stronger interpretation covers them entirely.

Logic: if you have a strong complete-coverage path for some position range, drop weaker alternatives that overlap it.

```java
public class PathAmbiguityResolver implements AmbiguityResolver {

    @Override
    public List<StagedTag> process(List<StagedTag> tags) {
        if (tags.isEmpty()) return List.of();

        // 1. Identify "strong" key tags — recognized, multi-position,
        //    with non-weak fields and exact-match types
        BitSet overlappedVertexes = tags.stream()
            .filter(StagedTag::isRecognized)
            .flatMap(t -> IntStream.range(t.getStart() + 1, t.getEnd()).boxed())
            .collect(BitSet::new, BitSet::set, BitSet::or);

        List<TermKey> keys = tags.stream()
            .filter(t -> t.getEnd() - t.getStart() > 1)  // multi-position
            .filter(StagedTag::isRecognized)
            .filter(t -> !overlappedVertexes.get(t.getStart()))
            .filter(t -> !overlappedVertexes.get(t.getEnd()))
            .map(this::convertStrongPaths)
            .flatMap(Collection::stream)
            .collect(toList());

        if (keys.isEmpty()) return tags;

        // 2. For each "key" range, find all paths through that range
        Set<String> removedKeys = new HashSet<>();
        var keysMap = keys.stream().collect(groupingBy(TermKey::getRange));

        for (var entry : keysMap.entrySet()) {
            List<TermKey> rangeKeys = entry.getValue();
            TermKey first = rangeKeys.iterator().next();
            var rangePaths = paths.getPaths(first.getStart(), first.getEnd(),
                                             MAX_NUMBER_OF_PATHS);

            boolean completeMatch = rangeKeys.stream().anyMatch(k -> k.isComplete);

            // 3. For paths with multiple edges (i.e., decompositions of the range
            //    into smaller pieces), drop the inner concepts if a complete strong
            //    match exists
            rangePaths.stream()
                .filter(path -> path.getEdgeList().size() > 1)
                .forEach(path -> dropWeakAlternatives(path, removedKeys, completeMatch));
        }

        return AmbiguityResolverUtils.filter(tags, removedKeys, ...);
    }
}
```

Concrete example:

```
Phrase: "sony wh-1000xm5"
Tags:
  [sony wh-1000xm5] (multi-word concept, model_name_concept, weight=10000) — covers 0→2
  [sony] (brand_name_concept, weight=50000) — covers 0→1
  [wh-1000xm5] (model_name_concept, weight=8000) — covers 1→2
  [wh-1000xm5] (description_text, weight=2) — covers 1→2
```

The "key" is `[sony wh-1000xm5]` from 0 to 2 (a complete multi-position match). Other paths from 0 to 2:
- [sony]@0→1 + [wh-1000xm5]@1→2
- [sony]@0→1 + [wh-1000xm5]@1→2 (different field for wh-1000xm5)

Inside these decomposition paths, the `[wh-1000xm5] (description_text, weight=2)` is a "weak" alternative. With the strong `[sony wh-1000xm5]` complete-coverage match available, drop the weak one.

After resolution: keep `[sony wh-1000xm5]` (10000), `[sony]` (50000), `[wh-1000xm5] (model_name_concept, 8000)`. Drop `[wh-1000xm5] (description_text, 2)`.

The "complete-match" check matters: only fields configured as `isCompleteMatch=true` can dominate via this rule. Otherwise a partial match (e.g., shingle field) wouldn't justify dropping alternatives.

### `ShingleOverlappingAmbiguityResolver` — among multiple paths through the same range, keep highest-weighted

Used when the same field has multiple ways to cover a range. This is common for shingle fields, which can break a phrase down multiple ways.

Logic: build a sub-graph per field with paths through identical (start, end) ranges, find the max weighted boost path, drop everything below it.

```java
public class ShingleOverlappingAmbiguityResolver implements AmbiguityResolver {

    @Override
    public List<StagedTag> process(List<StagedTag> inputTags) {
        // Group tags by fieldName → list of (term, range) keys
        Map<String, List<TermKey>> grouped = inputTags.stream()
            .filter(tag -> CollectionUtils.isNotEmpty(tag.getTerms()))
            .flatMap(tag -> tag.getTerms().stream()
                .filter(term -> term.getField() != null)
                .map(term -> new TermKey(term, tag.getStart(), tag.getEnd())))
            .collect(groupingBy(TermKey::getFieldName));

        Set<String> removedKeys = new HashSet<>();

        for (var entry : grouped.entrySet()) {
            List<TermKey> tags = entry.getValue();
            if (tags.size() == 1) continue;

            // Build per-field sub-graph
            DirectedWeightedMultigraph<Integer, TermKey> graph =
                new DirectedWeightedMultigraph<>(TermKey.class);
            tags.forEach(tag -> { graph.addVertex(tag.start); graph.addVertex(tag.end); });
            for (TermKey tag : tags) {
                graph.addEdge(tag.start, tag.end, tag);
                graph.setEdgeWeight(tag, tag.getWeightedBoost());
            }

            // For each tag's range, enumerate all paths
            AllDirectedPaths<Integer, TermKey> allPaths = new AllDirectedPaths<>(graph);

            for (TermKey tag : tags) {
                if (removedKeys.contains(tag.getKey())) continue;

                List<GraphPath<Integer, TermKey>> paths = allPaths.getAllPaths(
                    tag.start, tag.end, true, tag.end - tag.start);

                if (paths.size() > 1) {
                    int bestWeight = paths.stream()
                        .filter(p -> stillExists(p, removedKeys))
                        .mapToInt(this::pathWeight)
                        .max().orElse(0);

                    Set<String> bestPathKeys = paths.stream()
                        .filter(p -> pathWeight(p) == bestWeight)
                        .flatMap(p -> p.getEdgeList().stream())
                        .map(TermKey::getKey)
                        .collect(toSet());

                    paths.stream()
                        .filter(p -> pathWeight(p) < bestWeight)
                        .flatMap(p -> p.getEdgeList().stream())
                        .filter(e -> !bestPathKeys.contains(e.getKey()))
                        .forEach(t -> removedKeys.add(t.getKey()));
                }
            }
        }

        return AmbiguityResolverUtils.filter(inputTags, removedKeys, ...);
    }
}
```

Weighted boost is what drives the comparison:

```java
weightedBoost = ((int) boost) * weight * (end - start)
```

So a longer-span match (end - start) is rewarded relative to shorter spans. This encourages keeping `[sony wh-1000xm5]` (span=2, weight=10000, weightedBoost=20000) over `[sony]+[wh-1000xm5]` shingles (each span=1, lower weighted boost individually).

The `pathWeight` function uses MIN of edge weights — a chain is only as strong as its weakest link. Two strong edges connected by a weak edge ≈ one weak path.

Concrete example:

```
Phrase: "sony wh-1000xm5" (positions 0..2)
Field: model_name_concept (using shingles)
TermKeys:
  K1: range=0-2, term="sony wh-1000xm5" (full), weightedBoost=20000
  K2: range=0-1, term="sony",        weightedBoost=2500
  K3: range=1-2, term="wh-1000xm5",        weightedBoost=4000
```

Paths from 0 to 2:
- Path A: [K1] — direct, weight=20000
- Path B: [K2 → K3] — chain, weight=min(2500, 4000)=2500

K1 is single-edge. K1's range is the same as A's. Best path = A (weight 20000). Drop K2, K3 (they're in path B which is weaker).

After resolution: keep only K1.

This is the right behavior — when a complete multi-token match exists for the same field, the breakdown into shorter shingles is redundant.

### Field name normalization

Note this trick in `ShingleOverlappingAmbiguityResolver`:

```java
private static String convertFieldName(String fieldName) {
    if (fieldName.endsWith("_shingle")) {
        return fieldName.substring(0, fieldName.length() - "_shingle".length()) + "_incomplete";
    }
    if (fieldName.endsWith("_text")) {
        return fieldName.substring(0, fieldName.length() - "_text".length()) + "_incomplete";
    }
    return fieldName;
}
```

Fields ending in `_shingle` or `_text` are treated as **partial-match variants of the same logical field**. They're normalized to a common `_incomplete` suffix for grouping purposes. So `model_name_shingle` and `model_name_text` group together for ambiguity resolution; the resolver picks the strongest interpretation across both.

## Composition

Both resolvers are typically applied in sequence:

```java
public static List<StagedTag> resolve(List<StagedTag> tags, StageConfig stageConfig) {
    List<StagedTag> result = tags;
    for (AmbiguityResolver resolver : stageConfig.getResolvers()) {
        result = resolver.process(result);
    }
    return result;
}
```

Order matters:
- `ShingleOverlappingAmbiguityResolver` first (drops within-field shingle redundancy)
- `PathAmbiguityResolver` second (drops cross-field weaker interpretations)
- `NopAmbiguityResolver` available for stages that should keep all interpretations

`StageConfig` lists which resolvers to use:
```yaml
stages:
  - name: STRICT_CONCEPT
    resolvers: [ShingleOverlapping, Path]
    minPatternScore: 100
    minShouldMatch: 100%

  - name: SYNONYM_FALLBACK
    resolvers: [ShingleOverlapping]   # less strict — keep more
    minPatternScore: 25
    minShouldMatch: 1<-25%
```

## When to skip ambiguity resolution

Use `NopAmbiguityResolver` (no-op) when:
- The stage explicitly wants to OR all interpretations together (rare, but valid for "fallback" stages)
- You're debugging — disable resolution to see raw graph state
- Single-tag phrases — resolution is a no-op anyway, but worth being explicit

## Configuration parameters

Per-stage:

| Param | Effect |
|---|---|
| `resolvers` | Ordered list of resolver class names |
| `minPathScore` | Minimum path score (sum of edge weights) for a path to be kept |
| `minPatternScore` | Minimum boost-product for a single tag's path |
| `minShouldMatch` | mm formula |

A stage with high `minPathScore` and aggressive resolvers = high precision, may return zero results.
A stage with low score thresholds and lenient resolvers = high recall, may return noise.

The multi-stage approach (see `01-architecture.md`) tries strict first, falls back to lenient if no results.

## Common issues

### Resolution drops the desired tag

Symptom: user types "X", expects to match field A, but tagger drops it because field B has a stronger match.

Diagnose: run with `dot=true` and inspect the graph BEFORE and AFTER resolution. The resolver's `removedKeys` log entries indicate which tags were dropped and why.

Fixes:
- Adjust field weights — give field A's concepts higher weight in the concept collection
- Mark field A as `mandatory` so its tags survive resolution regardless of weight
- Add field A to a dependency group that requires it

### Resolution doesn't drop the noisy tag

Symptom: tagger keeps a low-weight noisy interpretation alongside the strong one.

Likely cause: the noisy tag is in a different field group, so `ShingleOverlappingAmbiguityResolver` doesn't see them as comparable. Or `PathAmbiguityResolver` sees them as non-overlapping.

Fixes:
- Add cross-field comparison (custom resolver)
- Lower the noisy field's weight so it's pruned by `filterOutExcessiveEdges` upstream
- Remove the noisy field from the stage's allowed list

### Too aggressive in early stages

If your first stage drops everything via aggressive resolution, you may end up always falling through to lenient stages. Defeats the purpose of staged processing.

Tune by:
- Loosening early-stage resolvers (e.g., raise the threshold for "strong" classification)
- Lowering early-stage `minPathScore`
- Adding intermediate stages between strict and lenient

### Performance

`PathAmbiguityResolver` builds a full graph per stage and runs K-shortest. For graphs with 100+ edges, this is non-trivial. If you see resolution dominating latency:
- Pre-filter edges before resolution (raise minimum edge weight)
- Increase `MAX_NUMBER_OF_PATHS` only when needed
- Profile and consider caching — the same phrase typed twice should hit a cache; but cache key must include staging context, which is complex
