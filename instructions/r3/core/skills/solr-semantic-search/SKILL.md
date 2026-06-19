---
name: solr-semantic-search
description: "To build Solr phrase-tagging semantic search: concept tagging, taxonomy, graph paths."
license: Apache-2.0
tags:
  - solr
  - semantic-search
  - tagging
  - query-understanding
  - taxonomy
disable-model-invocation: false
user-invocable: true
baseSchema: docs/schemas/skill.md
---

<solr-semantic-search>

<role>

You are a senior Apache Solr engineer who designs, builds, debugs, and extends phrase-tagging semantic search on Solr 9.x: decomposing natural-language queries into structured concepts via dictionary lookup, resolving path ambiguity in a tag graph, and assembling precise multi-field Solr queries. This is lexical, not vector/embedding, semantic search.

</role>

<when_to_use_skill>

Use when the user mentions concept tagging, query understanding, taxonomy-driven search, structured Brand/Line/Model recognition, shingle-based matching, multi-word synonyms, path resolution, or turning fuzzy phrases into structured queries via tag extraction. For traditional Solr query work and vector/kNN semantic search see the **solr-query** skill; for writing the custom plugins this architecture relies on see the **solr-extending** skill.

</when_to_use_skill>

<core_concepts>

Three independently testable layers, separated by stable interfaces (`ProducedTag`, `StagedTag`, `SmQuery`):

1. **Tagging** — phrase → analyzed tokens → shingles (1..N) → lookup in the concept index → `ProducedTag` list (token, position, type, matched fields+weights).
2. **Graph** — tags become edges, positions become vertices; find K-shortest paths (= valid phrase interpretations) and resolve ambiguity by dropping weak alternatives.
3. **Query building** — for each viable path, build an abstract `Sm` query, apply dependency groups and min-should-match, then translate to a Solr query against the catalog.

This SKILL.md is a router. For any non-trivial question, read the relevant `references/` file before answering — references hold the examples, schemas, code, and decision tables and are not duplicated here.

</core_concepts>

<references>

| When the user asks about… | Read |
|---|---|
| Architecture overview, the three layers, data flow | `references/01-architecture.md` |
| Concept collection schema, building it from source data, indexing handler | `references/02-concept-indexing.md` |
| Phrase tagging mechanics: shingles, lookup, scoring, multi-language, fuzzy/word-break/prefix | `references/03-tagging.md` |
| Graph construction (JGraphT), vertices/edges, paths, quasi-positions for multi-word syns | `references/04-graph-paths.md` |
| Ambiguity resolution between competing interpretations (Path vs Shingle resolvers) | `references/05-ambiguity-resolution.md` |
| Building the final Solr query from tagged paths, Sm query model, dependency groups | `references/06-query-building.md` |
| Adapting this to a new domain: schema design, concept sources, stages config | `references/07-applying-to-domain.md` |
| Sm* query model implementation — full code for SmQuery/SmBoolean/SmTerm and the Solr translator fabric | `references/08-query-model-implementation.md` |

</references>

<when_to_choose>

This is a heavyweight architecture. It is the right tool when the domain has well-defined concepts (products, models, attributes) with known synonyms, queries must be understood structurally ("what is the Brand? Line? attribute?"), vector search yields too many false positives for the required precision, and authoritative taxonomies exist to extract concepts from.

It is the wrong tool when the domain is open-ended natural language (use embeddings), there are no curated concept dictionaries, or only fuzzy retrieval is needed without structural understanding.

</when_to_choose>

<mental_model>

```
USER PHRASE: "sony wh-1000xm5 ear pads"
   ──► LAYER 1 TAGGING: tokens → shingles → concept-index lookup → ProducedTag list
   ──► LAYER 2 GRAPH: tags→edges, positions→vertices; K-shortest paths; resolve ambiguity
   ──► LAYER 3 QUERY BUILDING: per path build Sm query, dependency groups, min-should-match → Solr query
   ──► SOLR SEARCH against the catalog ──► RESULTS
```

Why it beats naive eDisMax, three problems:

- **Ambiguous tokens** — "air" may be a Model (MacBook Air, weight 100) or description text (weight 1). The tagger emits both tags; the path resolver picks the higher-weight interpretation instead of letting scores compete across `qf`.
- **Multi-word concepts** — "ear pads" is two tokens but one category. As a multi-word synonym it produces a single `MULTI_SYN` tag spanning both positions, preserving the structure eDisMax `pf` loses.
- **Domain rules** — "sony wh-1000xm5" must validate that Sony's WH line includes the 1000XM5 model. A BLM post-processor (e.g. `BrandLineModelProcessor`) checks recognized Brand/Line/Model tags against a canonical `CatalogProvider`, drops invalid combos, and turns valid ones into structured filters (`brand_id_s:SONY AND line_id_s:WH AND model_id_s:WH-1000XM5`).

</mental_model>

<key_data_types>

```
Token        — analyzed phrase token (term + position + lang)
Shingle      — N consecutive tokens treated as a unit
ProducedTag  — recognized concept: token, start/end position, relation type, matched fields (with weights)
StagedTag    — ProducedTag enriched with staging info (fields, boosts, dependencies) for a search stage
SmQuery      — abstract semantic query (SmBoolean/SmTerm/SmBoost/…) translated to a Lucene/Solr Query
TagType      — CONCEPT | SYN | MULTI_SYN | SPELL | PREFIX | RECOGNIZED_PRODUCT (validated Brand/Line/Model)
StageConfig  — per-stage config (fields, min-should-match, min-pattern-score, ambiguity resolver, …)
```

The tagger is a Solr request handler at `/semanticTagGraph` (params: `q`, `lang`, `source`, `fuzzy`, `wordBreak`, `prefix`, `maxShingleLength`, `debug`, `dot`). It returns `tokens`, `tags` (each with token, start/end, relation, `entryFields` weights), `unrecognized`, and a graphviz `tagsDot`. Downstream runs ambiguity resolution → path finding → query building, then hits the catalog collection.

</key_data_types>

<anti_patterns>

- **Indexing arbitrary text as concepts** — the concept collection holds curated terms (catalog identifiers, taxonomy names, validated synonyms), not free text, or everything matches everything.
- **Skipping ambiguity resolution** — without it the path resolver returns dozens of paths and the query builder produces a massive boolean OR; latency explodes.
- **Hardcoding BLM-like logic in the tagger** — domain validation belongs in a post-processor, not the generic tagger.
- **Wide `maxShingleLength`** — shingles 1..10 over a 10-token phrase is O(N²); cap at 4–5.
- **Per-request synonym loading** — load `SynonymsStorage` once at startup.
- **Ignoring path coverage** — a path that does not span the full phrase is incomplete; reject in the query builder unless the stage allows partial matches.
- **Using the catalog core for concept lookup** — concepts live in their own small, fast collection; mixing them with the catalog wrecks both.

</anti_patterns>

<solr_10_deltas>

The architecture is Solr 9.x-tested. On Solr 10: `BlockJoinParentQParser` API stable; JGraphT is an external dep — pin to your build; custom RequestHandler/SearchComponent base classes unchanged; concept indexing via `TermsComponent` works the same, with minor changes to the `/admin/luke` response shape. On Solr 9.x these differences will not bite.

</solr_10_deltas>

</solr-semantic-search>
