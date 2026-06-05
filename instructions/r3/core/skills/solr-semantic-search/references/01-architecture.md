# Architecture Overview

This file describes the three-layer architecture in detail: tagging, graph, query building. It's the conceptual foundation — read this first, then the topic-specific references.

## End-to-end flow

```
User HTTP request: q="sony wh-1000xm5 ear pads"
        │
        ▼
┌──── REQUEST HANDLER (e.g., /select on catalog core) ────┐
│                                                           │
│   1. Receives the user's q parameter                     │
│   2. Calls semantic search service:                      │
│        a) tagger to get ProducedTags                     │
│        b) staging to filter/expand for current context   │
│        c) ambiguity resolver to drop weak alternatives   │
│        d) graph builder + K-shortest paths               │
│        e) query builder: each path → SmQuery → Lucene    │
│   3. Wraps best query in a top-level eDisMax / boolean   │
│   4. Executes against the catalog index                  │
│   5. Returns results (with debug info if enabled)        │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

The semantic search service uses **two** Solr collections:

1. **Concept collection** (small, fast — the dictionary) — see `02-concept-indexing.md`
2. **Catalog collection** (large — the products) — the actual searchable corpus

The concept collection is **read-only at query time**. It's rebuilt offline from the catalog (or from a separate authoritative source like a product DB or brand catalog DB).

---

## Layer 1: Tagging

**Input**: raw phrase string + language hint
**Output**: list of `ProducedTag` objects, one per recognized concept-position-relation

### Sub-steps

1. **Analyze** the phrase per language (English, Spanish, etc.) using Lucene analyzers. Produces tokens with positions.
2. **Generate shingles** — every contiguous token sequence of length 1 to `maxShingleLength`. For "sony wh-1000xm5 ear", shingles are: `[sony]`, `[wh-1000xm5]`, `[ear]`, `[sony wh-1000xm5]`, `[wh-1000xm5 ear]`, `[sony wh-1000xm5 ear]`.
3. **Lookup each shingle** in the concept collection. The lookup is a Solr query (BooleanQuery) with these SHOULD clauses:
   - Exact match (boost 100×pow)
   - Fuzzy (FuzzyQuery at edit distance N, boost 25×pow) — only if `fuzzy=true` and shingle is original
   - Word break (e.g., "earpads" → "ear pads", boost 75×pow) — if `wordBreak=true`
   - Prefix (regex `term[^ ]+`, boost 50×pow) — if `prefix=true` and shingle is original
4. **Apply synonyms** — for each shingle, look up known synonyms (single-word and multi-word) from `SynonymsStorage`. Add synonym tags as additional edges with `relation=SYN` or `MULTI_SYN`.
5. **Multi-language merge** — if `lang=ALL`, run steps 1-4 per language and merge unique tags.
6. **Spell-check unrecognized** — for tokens that produced no tags in any language, attempt spell-correction by re-running the lookup with fuzzy enabled.

### Key handler

The tagger is a `RequestHandlerBase` exposed at `/semanticTagGraph` on the concept collection. It implements `SolrCoreAware` to load `StagesConfig` (per-collection config: which fields to consider, what shingle length, etc.).

Pseudocode:
```java
public class TagHandler extends RequestHandlerBase implements SolrCoreAware {
    @Override
    public void handleRequestBody(SolrQueryRequest req, SolrQueryResponse rsp) {
        TagRequestParams params = extractParams(req);
        if (params.phrase.isEmpty()) return;

        SolrIndexSearcher conceptSearcher = req.getSearcher();
        TagHandlerResponse response = phraseTagging(req.getCore(), params, conceptSearcher);
        response.populateResponse(rsp);
    }
}
```

The `phraseTagging` method does steps 1-6. `TagHandlerResponse` carries the tags, unrecognized terms, optional debug queries, and optional DOT graph for visualization.

### Scoring within tagging

Match types are scored differently to bias toward exact matches:

| Match type | Boost factor |
|---|---|
| Exact (token equals shingle) | 100 × `pow` |
| Word break (broken into multiple matching tokens) | 75 × `pow` |
| Prefix (token starts with shingle) | 50 × `pow` |
| Fuzzy (within edit distance) | 25 × `pow` |

Where `pow = 2 ^ (originalTokenOffset - 1)`. So 2-token shingles weigh 2× single-token; 3-token weighs 4×; etc. This biases the tagger toward longer matches even when shorter ones exist.

The `SchemaSimilarity` score from this query is what's used to rank lookup candidates — top `maxTag` (default 50) become tags.

---

## Layer 2: Graph

**Input**: list of `StagedTag` (= ProducedTag + staging context: which fields are eligible, weights, dependency markers)
**Output**: filtered, ambiguity-resolved set of edges; multiple "paths" through the phrase representing valid interpretations

### Why a graph

Different shingles can cover overlapping positions. "sony wh-1000xm5" can be:
- `[sony]` (brand) + `[wh-1000xm5]` (model) — two tags
- `[sony wh-1000xm5]` (model line, if known multi-word concept) — one tag

These are **alternative interpretations**. Some are stronger (specific = weight 100), some weaker (generic = weight 10). You can't keep them all — they conflict on positions. You can't drop arbitrarily — you need to compare.

A directed weighted multigraph models this:
- **Vertices**: token positions (0, 1, 2, ..., N) plus negative "quasi-positions" for multi-word synonym intermediate nodes
- **Edges**: each `StagedTag` is one edge, going from `start` to `end` position
- A "path" through the graph from position 0 to position N is a way to cover the entire phrase

Use **K-shortest-paths algorithm** (JGraphT `KShortestSimplePaths`) to enumerate up to 25 best paths.

### Quasi-positions for multi-word synonyms

Multi-word synonyms create a problem: a single shingle "ear cushions" might map to a synonym "ear cushion set" (2 tokens). At graph-building time, we don't have intermediate positions for "ear cushion set" because they're not in the original phrase.

Solution: **quasi-positions**. Negative integers like -1, -2, -3 act as virtual intermediate vertices. The synonym path goes `pos(cushions_start) → -1 → pos(cushions_end)` while the original token stays as `pos(cushions_start) → pos(cushions_end)` directly.

K-shortest-paths sees both as valid alternatives. Path with quasi-positions = "interpret as multi-word synonym"; path without = "interpret as original token".

### Ambiguity resolution

K-shortest gives you up to 25 paths. Many overlap; some are strictly weaker. Run an `AmbiguityResolver` to drop dominated alternatives:

- **PathAmbiguityResolver**: if a strong complete-coverage path exists for a position range, drop weaker alternatives that overlap it.
- **ShingleOverlappingAmbiguityResolver**: among multiple ways to fill the same position range with the same field, keep only the highest weighted-boost combination.

The result is a smaller, cleaner edge set. The graph is rebuilt from the filtered edges, and final paths are re-enumerated.

See `04-graph-paths.md` and `05-ambiguity-resolution.md` for details.

---

## Layer 3: Query Building

**Input**: viable graph paths (each path = ordered list of `StagedTag`)
**Output**: a single Solr `Query` (the result of combining all viable paths)

### Per-path query

For each path:

1. Filter out tags that violate full-phrase constraints (rare but real)
2. Validate path's minimum pattern score (`configMinPatternScore`)
3. Find dependency groups within the path (some fields depend on others — see below)
4. Build an `SmBooleanQuery` with one clause per tag, occurring as MUST or SHOULD based on tag's `hasMandatoryField()` and the path's full-phrase status
5. Apply min-should-match calculated from `configMinShouldMatch` and the phrase's token count

### Sm query model

Rather than building Lucene queries directly, the architecture uses an intermediate `Sm*` model (SmBooleanQuery, SmTermQuery, SmBoostQuery, SmDisjunctionMaxQuery, SmParentWrappedQuery, SmToParentBlockJoinQuery, etc.). Why:

- **Backend-agnostic**: the same Sm query can be converted to Solr (via `SolrQueryParserFabric`) or Elasticsearch (via an equivalent ES converter). This is real — in production deployments, the same staging pipeline produces queries used by both Solr and ES backends.
- **Inspectable**: Sm queries are easier to log/debug than verbose Lucene Query toString output
- **Composable**: building SmBooleanQuery + adding clauses + setting MM is more readable than nested BooleanQuery.Builder code

For complete class-level code (every `Sm*Query` subtype, the parser fabric, all Solr translators), see `08-query-model-implementation.md`.

### Dependency groups

Some fields aren't independently meaningful — they only make sense paired with other fields. Example: `attr_*` fields (product attributes that depend on a primary category being present) only apply when a `category_concept` is present. A query with `attr_position=front` alone is too vague.

`DependencyGroupService` finds these groups. For each path, it identifies "root" tags (e.g., category) and "dependent" tags (attr_*). The query builder generates one clause requiring the root + dependents, and another clause without dependencies (allowing fallback).

This produces queries like:
```
(category:ear_pad AND attr_position:front)  # full match
OR
category:ear_pad                                # partial match
```

Without dependency groups, you'd get false matches for "front" appearing in random fields.

### Min-should-match

Calculated dynamically from path:
```
mm = calculateMinShouldMatch(phraseTokensCount, configMinShouldMatch)
```

Where `configMinShouldMatch` is something like "1<-25%" (if 1 token, all required; otherwise allow 25% to miss). This integrates with eDisMax-style mm formulas — same syntax.

A path with fewer tags than `mm` is rejected (no point — it can't satisfy the constraint).

If `mm == phraseTokensCount`, the path requires **full phrase match** — every clause becomes MUST. Otherwise tags become SHOULD with `setMinimumNumberShouldMatch(mm - mustCount)`.

---

## Multi-stage processing

A real semantic search request often runs through **multiple stages**:

```
Stage 1: STRICT_CONCEPT_MATCH      (only exact CONCEPT matches; high precision)
   ↓ (if no results)
Stage 2: WITH_SYNONYMS              (allow SYN, MULTI_SYN)
   ↓ (if no results)
Stage 3: FUZZY_AND_PREFIX           (allow SPELL, PREFIX)
   ↓ (if no results)
Stage 4: PARTIAL_PHRASE_MATCH       (relax mm, allow incomplete coverage)
```

Each stage has its own `StageConfig`: which TagTypes are allowed, min-should-match, min-pattern-score, fields-allowed list, ambiguity resolver to use. Stages run in order; earliest stage that returns sufficient results wins (the `cutoff` per stage controls the threshold).

This staged approach lets you get high-precision results when the user's phrase is well-formed, with graceful fallback when it isn't.

`CommonSemanticSearcher.processStagesSequentially()` orchestrates this.

---

## Where the architecture sits relative to standard Solr

Standard Solr request:
```
HTTP /select → SearchHandler → QueryComponent (parses q via QParser)
                                       ↓
                                  Lucene search → results
```

Semantic search request:
```
HTTP /select → SearchHandler → SemanticSearchHandler (custom)
                                       ↓
                                  TagHandler (on concept core)
                                  AmbiguityResolver
                                  GraphUtils
                                  SemanticQueryBuilder
                                       ↓
                                  Lucene Query (built from staged tags)
                                       ↓
                                  Lucene search → results
```

The semantic layer is a **request handler** (or component) that runs on the catalog collection. It calls the concept collection internally for tagging. The final Lucene query is what the catalog index actually searches against.

You don't replace eDisMax; you replace the **query-from-string** step with a much smarter pipeline. The resulting Lucene query may include eDisMax-equivalent constructs (DisjunctionMaxQuery, BoostQuery) but it's built programmatically from recognized concepts, not parsed from a syntax string.

---

## What this skill does NOT cover

- **Vector/embedding semantic search**: fundamentally different mechanism. See `solr-query/references/07-knn.md`.
- **Neural rerankers / cross-encoders**: layer that goes on top of retrieval.
- **Generic LTR**: see `solr-query/references/12-relevancy.md` for brief mention.
- **Schema design for the catalog itself**: covered by the `solr-schema` skill.

This skill is specifically for **dictionary-driven phrase tagging + graph-based path resolution + structured query construction** — a particular architecture that's powerful for domains with curated taxonomies.
