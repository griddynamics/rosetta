# Query Building

This is the last layer: take resolved graph paths, turn them into actual Solr queries that hit the catalog. Covers the Sm query model, dependency groups, full-phrase constraints, mm calculation, and the experimental `removeWeakTokens` optimization.

## Top-level flow

```java
public static SemanticStageQuery buildStageQuery(
        StageConfig stageConfig,
        SemanticGraphSources graphSources,
        List<StagedTag> additionalBoostsTags,
        boolean generateDot,
        SearchMode searchMode,
        List<String> tokens) {

    var graph = GraphUtils.buildGraph(stageConfig, graphSources);
    if (graph == null) return SemanticStageQuery.EMPTY;

    var allOriginalGraphPaths = GraphUtils.getAllEdgePaths(graph);

    // Optional: try removing weak concept tokens
    if (stageConfig.isRemoveWeakTokens()) {
        var nonWeakGraph = removeWeakTokens(graph, allOriginalGraphPaths, tokens);
        if (nonWeakGraph.isPresent()) {
            var query = createNonTrackingLowLevelQuery(
                GraphUtils.getAllEdgePaths(nonWeakGraph.get()),
                additionalBoostsTags, stageConfig, searchMode);
            if (query.isPresent()) {
                return new SemanticStageQuery(query.get().getQuery(),
                                               query.get().getPathsIndex(),
                                               generateDot ? toDot(...) : "");
            }
        }
    }

    // Standard path: build from all edge paths
    var query = createNonTrackingLowLevelQuery(
        allOriginalGraphPaths, additionalBoostsTags, stageConfig, searchMode);
    return query.map(info -> new SemanticStageQuery(info.getQuery(),
                                                     info.getPathsIndex(),
                                                     dot))
        .orElseGet(() -> new SemanticStageQuery(dot));
}
```

For each viable path, build a per-path query. Combine all paths with OR. The full result is the stage's query.

## Per-path query construction

```java
private static List<SmQuery> buildPathQueries(
        StageConfig config,
        List<StagedTag> pathTags,
        int nextPathId) {

    int phraseTokensCount = pathTags.size();
    int configMinPatternScore = config.getMinPatternScore();
    String configMinShouldMatch = config.getMinShouldMatch();

    // 1. Drop tags that violate full-phrase constraints
    pathTags = removeViolatingFullPhraseEntries(pathTags);

    // 2. Filter to tags with non-empty terms (or recognized product)
    List<StagedTag> stagedTags = pathTags.stream()
        .filter(e -> CollectionUtils.isNotEmpty(e.getTerms())
                  || e.getFieldTagType() == TagType.RECOGNIZED_PRODUCT)
        .collect(toList());

    if (stagedTags.isEmpty()) return List.of();

    // 3. RECOGNIZED_PRODUCT tags don't generate queries but take graph positions —
    //    lower the effective phrase token count
    for (StagedTag tag : stagedTags) {
        if (tag.getFieldTagType() == TagType.RECOGNIZED_PRODUCT) {
            phraseTokensCount = Math.max(1, phraseTokensCount - (tag.getEnd() - tag.getStart()));
        }
    }

    // 4. Validate path's minimum score
    if (configMinPatternScore > 0) {
        double minimumScore = calcMinPathScore(stagedTags);
        if (minimumScore < configMinPatternScore) {
            return List.of();  // path too weak — drop entirely
        }
    }

    // 5. Find dependency groups
    List<SmQuery> resultQueries = new ArrayList<>();
    for (DependencyGroup group : DependencyGroupService.findAllGroups(stagedTags)) {
        buildWeightedSmQuery(String.valueOf(nextPathId + resultQueries.size()),
                              phraseTokensCount, configMinShouldMatch,
                              stagedTags, group)
            .ifPresent(resultQueries::add);
    }

    // 6. Plus the no-dependency case
    buildWeightedSmQuery(String.valueOf(nextPathId + resultQueries.size()),
                          phraseTokensCount, configMinShouldMatch,
                          stagedTags, DependencyGroup.EMPTY)
        .ifPresent(resultQueries::add);

    return resultQueries;
}
```

## `buildWeightedSmQuery`: from tags to SmBooleanQuery

```java
private static Optional<SmQuery> buildWeightedSmQuery(
        String pathId,
        int phraseTokensCount,
        String minShouldMatch,
        List<StagedTag> tags,
        DependencyGroup dependencyGroup) {

    int mm = calculateMinShouldMatch(phraseTokensCount, minShouldMatch);
    if (tags.size() < mm) return Optional.empty();

    boolean fullPhraseMatch = (mm == phraseTokensCount);

    Map<Integer, Pair<SmQuery, SmClause.Occur>> queriesMap = new HashMap<>();
    for (StagedTag stagedTag : tags) {
        SmClause.Occur occur = stagedTag.hasMandatoryField() || fullPhraseMatch
                                ? SmClause.Occur.MUST
                                : SmClause.Occur.SHOULD;
        makeQueryFromStagedTag(stagedTag, "", pathId, phraseTokensCount,
                               dependencyGroup.getFiredDependencies())
            .ifPresent(query -> queriesMap.put(stagedTag.getStart(),
                                                Pair.of(query, occur)));
    }

    // Replace dependency-root tags with combined dependency-group query
    if (!dependencyGroup.isEmpty()) {
        Optional<SmQuery> rootQuery = buildDependencyGroupRootQuery(
            dependencyGroup, pathId, phraseTokensCount);
        if (rootQuery.isPresent()) {
            dependencyGroup.getRoots().forEach(t -> queriesMap.remove(t.getStart()));
            int anyRootPos = dependencyGroup.getRoots().get(0).getStart();
            queriesMap.put(anyRootPos, Pair.of(rootQuery.get(), SmClause.Occur.MUST));
        }
    }

    if (queriesMap.isEmpty()) return Optional.empty();

    int must = (int) queriesMap.values().stream()
        .filter(p -> SmClause.Occur.MUST.equals(p.getRight())).count();
    int should = (int) queriesMap.values().stream()
        .filter(p -> SmClause.Occur.SHOULD.equals(p.getRight())).count();

    if (mm > (must + should)) return Optional.empty();  // can't satisfy mm

    if (queriesMap.size() == 1) {
        SmQuery q = queriesMap.values().iterator().next().getLeft();
        q.setQueryId("path_" + pathId);
        return Optional.of(q);
    }

    SmBooleanQuery pathQuery = new SmBooleanQuery();
    pathQuery.setQueryId("path_" + pathId);
    queriesMap.values().forEach(pair -> pathQuery.add(pair.getLeft(), pair.getRight()));
    pathQuery.setMinimumNumberShouldMatch(mm - must);

    return Optional.of(pathQuery);
}
```

## Decision tree: MUST vs SHOULD

```
For each tag:
  ┌── tag has hasMandatoryField()?
  │     YES → MUST
  │     NO ──── path is full-phrase match (mm == phraseTokensCount)?
  │              YES → MUST
  │              NO → SHOULD (counts toward mm)
```

`hasMandatoryField()` is a tag-level property: true for tags whose at least one matched field is configured as mandatory. Mandatory fields force their containing tag to MUST regardless of stage policy.

Full-phrase match (mm = N) means every tag must match. So even SHOULD-eligible tags become MUST in this case.

After classification, the BooleanQuery's `minimumNumberShouldMatch` is set to `mm - must` (so the SHOULD clauses provide the rest).

## Full-phrase constraint

A field can be marked `fullPhraseMatch=true`. Such a field requires the entire path to match it — partial matches don't count.

```java
private static List<StagedTag> removeViolatingFullPhraseEntries(List<StagedTag> tags) {
    if (tags.size() < 2) return tags;

    boolean hasFullPhrase = tags.stream()
        .map(StagedTag::getTerms).filter(Objects::nonNull)
        .flatMap(Collection::stream).map(StagedSearchTerm::getField)
        .anyMatch(StagedField::isFullPhraseMatch);

    if (!hasFullPhrase) return tags;

    return tags.stream()
        .peek(t -> t.setTerms(
            t.getTerms().stream()
                .filter(Predicate.not(ff -> ff.getField().isFullPhraseMatch()))
                .collect(toList())
        )).collect(toList());
}
```

The logic: only ONE field marked fullPhraseMatch is allowed per path. If multiple paths produce fullPhraseMatch terms in different fields, OR they're combined with non-fullPhraseMatch terms, those terms are removed (because they'd contradict the constraint).

Use case: you have a `category_full_phrase_concept` field that should match only when the user types EXACTLY a category name. If they type "case and ear pads" (3 categories smashed together), no full-phrase match should fire.

## Dependency groups

Some fields aren't independently meaningful. Example: `attr_position` (front/rear) only makes sense with a `category_concept` (ear_pad). A query for `attr_position:front` alone is too vague.

`DependencyGroupService.findAllGroups(tags)` finds groups: each group has **roots** (the parent fields, e.g., category) and **dependents** (the dependent fields, e.g., attr_*).

Output: list of `DependencyGroup`s. Each represents one possible root-dependent combination from the path.

For each found group:
1. Generate a query that combines root + dependents as MUST
2. Add this as a separate path query alongside the no-dependency version

Both versions go into the final OR — the dependency-aware version scores higher when both root and dependents match; the fallback works when only the root is present.

```
Path tags: [category:ear_pad] + [attr_position:front]

DependencyGroupService finds:
  Group { root: [category:ear_pad], dependents: [attr_position:front] }

Generated queries:
  Q1 (with dep): category:ear_pad AND attr_position:front
  Q2 (no dep):   category:ear_pad

Combined: Q1 OR Q2
```

Without dependency awareness, the query would just be:
```
category:ear_pad AND attr_position:front
```

Which fails for any product missing the position attribute, even if it's a valid ear pad.

## Min-should-match

`calculateMinShouldMatch(phraseTokensCount, minShouldMatchSpec)`:

| spec | phraseTokensCount=1 | =2 | =5 | =10 |
|---|---|---|---|---|
| `100%` | 1 | 2 | 5 | 10 |
| `2<-1` | 1 | 2 | 4 | 9 |
| `2<-25%` | 1 | 2 | 4 | 8 |
| `1<-25%` | 1 | 2 | 4 | 8 |
| `1<-1 5<80%` | 1 | 1 | 4 | 8 |

Same syntax as eDisMax mm — USE SKILL `solr-query` to apply eDisMax for the full spec.

For semantic search, `minShouldMatch` is per-stage. Strict stages: `100%` (full phrase). Lenient: `2<-25%`.

## `calcMinPathScore`

A stage can require a minimum **path score**. The score of a path is the sum of minimum boost-per-tag across the path:

```java
private static double calcMinPathScore(List<StagedTag> tags) {
    return tags.stream()
        .mapToDouble(t -> t.getTerms().stream()
                           .mapToDouble(term -> term.getField().getBoost())
                           .min().orElse(0))
        .sum();
}
```

For each tag, we use its **minimum** field boost (worst-case scoring). Sum across the path. Compare to `configMinPatternScore`.

If the min boost (e.g., the path's weakest single field) makes the sum fall below the threshold, the path is dropped. This guards against paths that are technically complete but full of low-value matches.

Tuning:
- `minPatternScore=0` — accept any path
- `minPatternScore=100` — require strong concept matches throughout
- `minPatternScore=1000` — extreme strictness

## `removeWeakTokens` (experimental)

When the stage flag is set, attempts to drop concept tokens marked "weak" if a complete concept-coverage path exists without them.

```java
private static Optional<DirectedWeightedMultigraph<Integer, StagedTag>> removeWeakTokens(
        DirectedWeightedMultigraph<Integer, StagedTag> graph,
        List<GraphPath<Integer, StagedTag>> allOriginalGraphPaths,
        List<String> tokensOnThePosition) {

    List<GraphPath<Integer, StagedTag>> conceptCoverage = allOriginalGraphPaths.stream()
        .filter(StagedTagUtils::hasFullCompleteCoverage).collect(toList());

    BitSet weakPositions = conceptCoverage.stream()
        .map(StagedTagUtils::getWeakPositions)
        .reduce((a, b) -> { a.and(b); return a; })
        .orElse(new BitSet());

    if (weakPositions.isEmpty()) return Optional.empty();

    List<StagedTag> nonWeakEdges = graph.edgeSet().stream()
        .filter(t -> !weakPositions.get(t.getStart(), t.getEnd() - 1).isEmpty())
        .collect(toList());

    if (nonWeakEdges.isEmpty()) return Optional.empty();

    DirectedWeightedMultigraph<Integer, StagedTag> nonWeakGraph =
        new DirectedWeightedMultigraph<>(StagedTag.class);
    graph.vertexSet().forEach(nonWeakGraph::addVertex);
    nonWeakEdges.forEach(e -> nonWeakGraph.addEdge(e.getStart(), e.getEnd(), e));
    weakPositions.stream().forEach(p -> nonWeakGraph.addEdge(p, p + 1,
        StagedTag.unmatched("weak_" + tokensOnThePosition.get(p) + "_" + p, p, p + 1,
                             tokensOnThePosition.get(p))));

    return Optional.of(nonWeakGraph);
}
```

Use case: the user types "battery 50 amp 12 volt". `battery` is a strong concept; `50`, `12` are numeric values; `amp`, `volt` are likely tokens marked weak (because they appear too frequently to be discriminating concepts in isolation).

If a concept-coverage path exists from the strong tokens alone (e.g., `[battery]` covering position 0), and weak tokens exist at the other positions, drop the weak tokens. The remaining path is just the strong concept; it gets matched against the catalog more cleanly.

This is experimental — the gains depend on per-domain token frequencies. Tune carefully.

## BLM tag handling

`RECOGNIZED_PRODUCT` tags are special:
- They occupy graph positions but don't generate queries
- Their effect is **lowering the effective phrase token count** for mm calculation

This is because BLM is handled separately — when BLM is recognized, the catalog query gets a BLM filter (`brand_id_s:SONY AND line_id_s:WH AND model_id_s:WH-1000XM5`). The tagger's job for BLM is to identify and validate the recognition; the actual query construction happens in a BLM post-processor (see below).

```java
for (StagedTag stagedTag : stagedTags) {
    if (stagedTag.getFieldTagType() == TagType.RECOGNIZED_PRODUCT) {
        phraseTokensCount -= (stagedTag.getEnd() - stagedTag.getStart());
        phraseTokensCount = Math.max(phraseTokensCount, 1);
    }
}
```

For phrase "sony wh-1000xm5 ear pads" with BLM recognized:
- Phrase tokens: 5
- BLM tag spans positions 0-3 (3 tokens)
- Effective phrase tokens for mm: 5 - 3 = 2
- mm calculated against the remaining "ear pads" tokens

Without this adjustment, mm requires "all 5 tokens to match" but BLM doesn't generate a query clause — so mm could never be satisfied.

## BLM post-processor

`BrandLineModelProcessor` is a separate component. After tagging produces the raw concept tags, this processor:

1. Filters tags to CONCEPT-relation
2. Identifies which tags map to Brand, Line, Model, SubModel fields
3. Sorts: Brand first, then Line, Model, SubModel
4. Validates each combination against `CatalogProvider` (the canonical product DB)
5. Updates the tag list:
   - Valid BLM combinations get a synthesized `RECOGNIZED_PRODUCT` tag spanning all BLM positions
   - Original Brand/Line/Model concept tags are filtered out (replaced)
   - Invalid combinations (e.g., Sony WH-5000XX) are dropped entirely
6. Returns updated `TagHandlerResponse`

```java
public class BrandLineModelProcessor {
    public static RecognizedBrandLineModel processBrandLineModelTags(
            List<ProducedTag> producedTags,
            StagesConfig stagesConfig,
            CatalogProvider catalogProvider) {

        var blmResult = new RecognizedBrandLineModel();
        List<ProducedTag> conceptTags = producedTags.stream()
            .filter(tag -> tag.getRelation() == TagType.CONCEPT)
            .collect(toList());

        // Identify BLM-eligible tags
        for (Pair<ProducedTag, BrandLineModelField> pair : blmTags) {
            switch (pair.getRight()) {
                case BRAND:
                    blmResult.setBrand(...);
                    break;
                case LINE:
                    var lineId = LineTokenId.parse(pair.getLeft().getTokenId());
                    if (blmResult.lineId() == null) blmResult.include(lineId);
                    break;
                case MODEL:
                    // ...
                case SUB_MODEL:
                    // ...
            }
        }

        // Validate against CatalogProvider
        if (!catalogProvider.isValid(blmResult)) {
            return RecognizedBrandLineModel.UNRECOGNIZED;
        }

        return blmResult;
    }
}
```

The result feeds back into the staging service: a recognized BLM becomes both:
- A `RECOGNIZED_PRODUCT` synthetic tag (so positions are accounted for in mm)
- A direct filter on the catalog query (`brand_id_s:SONY AND line_id_s:WH AND model_id_s:WH-1000XM5`)

## Sm → Solr translation

Each `SmQuery` subtype has a corresponding `Sm*SolrQP` (Solr query parser) that converts to Lucene Query:

| Sm class | Translates to |
|---|---|
| `SmBooleanQuery` | `BooleanQuery` |
| `SmTermQuery` | `TermQuery` |
| `SmBoostQuery` | `BoostQuery` |
| `SmDisjunctionMaxQuery` | `DisjunctionMaxQuery` |
| `SmParentWrappedQuery` | `ToParentBlockJoinQuery` |
| `SmChildWrappedQuery` | `ToChildBlockJoinQuery` |
| `SmToParentBlockJoinQuery` | block-join with score mode |
| `SmTermsQuery` | `TermsQuery` (multi-term) |
| `SmCollapseFilter` | applies CollapseQParser semantics |
| `SmEdismaxBoostQuery` | edismax-style boost |
| `SmEdismaxQuery` | edismax-built query |

The `SolrQueryParserFabric` walks the Sm tree and produces the Lucene Query. Same translation can be implemented for ES (`ESQueryParserFabric`) — that's how the same staging pipeline serves both backends.

For the **complete code** of every `Sm*Query` class, the `SmClause` enum, the parser fabric, and the per-type Solr translators (with the named-param trick that makes nested boolean queries readable), see `08-query-model-implementation.md`. Drop those classes into your project as a starting point.

## Combining stage queries

After all stages run, `CommonSemanticSearcher.processStagesSequentially` returns a list of `StageInfo`. Each StageInfo has:
- The Lucene query for that stage
- A "cutoff" — minimum hits needed for this stage to be considered "successful"

The orchestrator runs each stage's query against the catalog. First stage to produce hits ≥ cutoff wins. Its query becomes the user-facing query. Subsequent stages are skipped.

If no stage hits its cutoff: fall back to the lowest-priority stage's query (best-effort, accept fewer hits).

## Common issues

### Path produces empty query

`buildWeightedSmQuery` returns `Optional.empty()` when:
- Path's tag count < mm (can't satisfy)
- After must/should classification, must+should < mm (still can't)
- All tags filtered out by must-have-terms

Diagnose by emitting tag list + mm value. Often it's a stage config too strict for the recognized concepts.

### Dependency group never fires

`DependencyGroupService.findAllGroups()` returns empty list. Check:
- Are root and dependent fields actually configured for dependency? (StagesConfig)
- Are both root and dependent tags present in the path?
- Is the field naming consistent (e.g., attr_* prefix matches expected)?

Use `dot=true` and look at the tag colors and field names.

### Full-phrase constraint dropping good tags

`removeViolatingFullPhraseEntries` is conservative — if multiple paths have fullPhraseMatch fields, all may be dropped. Diagnose by inspecting tags before and after this step. Often a sign that fullPhraseMatch is set on a field where it shouldn't be.

### `removeWeakTokens` underperforming

This optimization works only when:
- `stageConfig.isRemoveWeakTokens()` is true
- Some fields are marked `weak=true` in stage config
- A complete concept-coverage path exists from non-weak tokens alone

If your domain has few "weak" tokens (everything is a strong concept), this won't help. Common domain pattern: it helps a lot for technical specs ("12V battery 5A fuse"); doesn't help for proper-name domains ("Sony WH-1000XM5 Wireless").
