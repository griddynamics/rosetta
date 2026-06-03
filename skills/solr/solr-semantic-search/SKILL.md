---
name: solr-semantic-search
description: This skill should be used when working with phrase-tagging-based semantic search systems built on Solr — extracting concepts/tags from natural-language queries, building a graph of recognized tags and synonyms, resolving path ambiguity, and constructing weighted Solr queries from tagged paths. It helps engineers design, implement, debug, and extend a tagger-and-graph semantic search architecture: the kind where a search like "sony wh-1000xm5 ear pads" gets parsed into Brand/Line/Model + product-attribute tags, validated against domain rules, and turned into a precise multi-field Solr query. Covers concept indexing, multi-language phrase tagging, JGraphT-based path resolution, ambiguity resolution between competing interpretations, dependency groups, full-phrase constraints, custom Sm* query model, and applying the architecture to new domains. Use when the user mentions semantic search, concept tagging, query understanding, taxonomy-driven search, structured product/entity recognition (Brand/Line/Model), shingle-based matching, multi-word synonyms, path resolution, or anything that involves turning fuzzy user phrases into structured queries via tag extraction.
---

# Solr Semantic Search Skill (Solr 9.x)

This skill helps engineers **design, build, debug, and extend** a phrase-tagging semantic search system on Solr. The architecture described here is **not** vector/embedding-based semantic search — that's covered in `solr-query/references/07-knn.md`. This is **lexical** semantic search: a query string is decomposed into structured concepts via dictionary lookup, then assembled into a precise Solr query.

This is a heavyweight architecture. It's the right tool when:
- Your domain has well-defined concepts (products, models, attributes) with known synonyms
- Queries need to be understood structurally (e.g., "what's the Brand? Line? attribute?")
- Vector search produces too many false positives for your precision needs
- You have authoritative taxonomies (catalog, product catalog, brand DB) to extract concepts from

It's the wrong tool when:
- Your domain is open-ended natural language (better fit for embeddings)
- You don't have curated concept dictionaries
- You only need fuzzy retrieval, not structural understanding

For traditional Solr query work, see **solr-query** skill.
For writing the custom plugins this architecture relies on, see **solr-extending** skill.

---

## How to use this skill

This SKILL.md is a router. For non-trivial questions, **read the relevant reference**.

### When the user asks about... → read this reference

| Topic | Reference |
|---|---|
| Architecture overview, the three layers, data flow | `01-architecture.md` |
| Concept collection schema, building it from source data, indexing handler | `02-concept-indexing.md` |
| Phrase tagging mechanics: shingles, lookup, scoring, multi-language, fuzzy/word-break/prefix | `03-tagging.md` |
| Graph construction (JGraphT), vertices/edges, paths, quasi-positions for multi-word syns | `04-graph-paths.md` |
| Ambiguity resolution between competing interpretations (Path vs Shingle resolvers) | `05-ambiguity-resolution.md` |
| Building the final Solr query from tagged paths, Sm query model, dependency groups | `06-query-building.md` |
| Adapting this to a new domain: schema design, concept sources, stages config | `07-applying-to-domain.md` |
| Sm* query model implementation — full code for SmQuery / SmBooleanQuery / SmTermQuery / etc. and the Solr translator fabric | `08-query-model-implementation.md` |

---

## Core mental model: three layers

```
USER PHRASE: "sony wh-1000xm5 ear pads"
        │
        ▼
┌──────────────────────────────────────┐
│ LAYER 1: TAGGING                     │
│  Phrase → analyzers → tokens         │
│  Tokens → shingles (1..N)            │
│  Shingles → lookup in concept index  │
│  Returns: ProducedTag list           │
│    (token, position, type, fields)   │
└──────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│ LAYER 2: GRAPH                       │
│  Tags → edges in directed graph      │
│  Positions → vertices                │
│  Find K-shortest paths (= valid      │
│    interpretations of phrase)        │
│  Resolve ambiguity (drop weak alts)  │
└──────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│ LAYER 3: QUERY BUILDING              │
│  For each viable path:               │
│    Build Sm abstract query           │
│    Apply dependency groups           │
│    Apply min-should-match            │
│  Convert Sm query → Solr query       │
└──────────────────────────────────────┘
        │
        ▼
SOLR SEARCH against actual catalog
        │
        ▼
RESULTS (products matching the recognized concepts)
```

Each layer is independently testable, debuggable, and replaceable. The boundaries are stable interfaces (`ProducedTag`, `StagedTag`, `SmQuery`); within each layer the implementation can evolve.

---

## Why this architecture

Three problems it solves better than naive eDisMax:

### Problem 1: ambiguous tokens

User types "air". Is this an Apple Air (product Model, e.g. MacBook Air)? The word "air" in a product description? A product literally labeled "air"? In naive eDisMax, all three match across `qf` fields, scores compete, ranking is muddled.

In a tagging system: `air` looks up to known concepts. If it matches `model_name_concept` (with weight 100, indicating the MacBook Air model exists), AND also matches `description_text` (weight 1, low signal), the tagger produces both tags and the path resolver picks the higher-weight interpretation.

### Problem 2: multi-word concepts

User types "ear pads". Lexically, two tokens. Conceptually, one thing — a product category. eDisMax with `qf=product_name_t` finds it via phrase boost (`pf`), but the structure is lost — you can't tell downstream "this query was about ear pads, not about ear-and-pads".

In a tagging system: `ear pads` is a multi-word synonym for `earpads_concept`. The tagger produces a single tag spanning both positions, with type=MULTI_SYN. Downstream code can ask "did this phrase resolve to a known product category?".

### Problem 3: domain rules

Brand+Line+Model recognition: "sony wh-1000xm5" must validate that Sony's WH line actually includes the 1000XM5 model. Naive search returns docs with those tokens regardless of validity.

In a tagging system: a BLM post-processor checks recognized brand-line-model tags against a canonical product DB (`CatalogProvider`). Invalid combinations are dropped. Valid ones become structured filters (`brand_id_s:SONY AND line_id_s:WH AND model_id_s:WH-1000XM5`).

---

## Quick reference: key data types

The architecture has a small set of types you'll see everywhere:

```
Token             — analyzed phrase token (term + position + lang)
Shingle           — N consecutive tokens treated as a unit
ProducedTag       — a recognized concept: token, start/end position,
                    relation type, list of matched fields (with weights)
StagedTag         — ProducedTag enriched with staging info (which fields,
                    boosts, dependency info) for a specific search stage
SmQuery           — abstract semantic query (SmBoolean / SmTerm / SmBoost / etc.)
                    that gets translated to Lucene/Solr Query

TagType           — relation kind:
                      CONCEPT       (exact term match)
                      SYN           (single-word synonym)
                      MULTI_SYN     (multi-word synonym)
                      SPELL         (spelling correction)
                      PREFIX        (prefix match)
                      RECOGNIZED_PRODUCT (validated Brand/Line/Model)

StageConfig       — config per processing stage (which fields to consider,
                    min-should-match, min-pattern-score, ambiguity resolver, etc.)
```

---

## Quick syntax: invoking the tagger

The tagger is exposed as a Solr request handler at `/semanticTagGraph`:

```
GET /solr/concepts/semanticTagGraph?
  q=sony+wh-1000xm5+ear+pads&
  lang=en&
  source=semantic&
  fuzzy=true&
  wordBreak=true&
  prefix=true&
  maxShingleLength=4&
  debug=true&
  dot=true
```

Returns:
```json
{
  "tokens": [...],
  "tags": [
    {"token": "sony", "start": 0, "end": 1, "relation": "CONCEPT",
     "entryFields": [{"name": "brand_name_concept", "weight": 100}]},
    {"token": "wh-1000xm5", "start": 1, "end": 2, "relation": "CONCEPT",
     "entryFields": [{"name": "model_name_concept", "weight": 100}]},
    {"token": "ear pads", "start": 2, "end": 4, "relation": "MULTI_SYN",
     "entryFields": [{"name": "category_concept", "weight": 80}]}
  ],
  "unrecognized": [],
  "tagsDot": "digraph G { ... }"  // graphviz format for visualization
}
```

The downstream pipeline takes this response, runs ambiguity resolution + path finding + query building, then hits the catalog collection.

---

## Anti-patterns to call out

When you see these in user code or design discussions, push back:

- **Indexing arbitrary text as concepts** — the concept collection should hold curated terms (catalog identifiers, taxonomy names, validated synonyms), not free text. Otherwise everything matches everything.
- **Skipping ambiguity resolution** — without it, the path resolver returns dozens of valid paths and the query builder produces a massive boolean OR. Latency explodes.
- **Hardcoding BLM-like logic in tagger** — domain validation belongs in a post-processor (`BrandLineModelProcessor` style), not in the tagger itself. Keep the tagger generic.
- **Wide `maxShingleLength`** — generating shingles 1..10 from a 10-token phrase is O(N²). Cap at 4-5 unless you really need longer.
- **Per-request synonym loading** — `SynonymsStorage` should be loaded once at startup, not per request.
- **Ignoring path coverage** — a path that doesn't span the full phrase is incomplete. Reject in query builder unless the stage explicitly allows partial matches.
- **Using the catalog Solr core for concept lookup** — concepts live in their own (small, fast) collection. Mixing them with the catalog wrecks both.

---

## Solr 10 deltas

The architecture is Solr 9.x-tested. For Solr 10:
- `BlockJoinParentQParser` API stable
- JGraphT external dep — version pin to whatever your build manages
- Custom RequestHandler, SearchComponent base classes unchanged
- Concept indexing via `TermsComponent` works the same; minor changes to `/admin/luke` response shape

If you're on Solr 9.x (the target of this skill), Solr 10 differences won't bite you.
