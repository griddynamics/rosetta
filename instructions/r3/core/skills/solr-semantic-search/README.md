# solr-semantic-search
Builds, debugs, and extends dictionary-driven phrase-tagging semantic search on Solr 9.x — concept tagging, graph-based path resolution, structured multi-field query construction.

## Why it exists
The obvious failure mode is the name itself: a model asked for "semantic search" on Solr defaults to vector/embedding retrieval. This skill's role statement exists to preempt that: "This is lexical, not vector/embedding, semantic search." Without it a model would also likely reach for a hand-rolled regex/synonym matcher instead of evaluating Solr's built-in `solr.TaggerRequestHandler` first, skip ambiguity resolution and ship a query that OR's every overlapping interpretation (latency explosion), or bake Brand/Line/Model validation logic into the tagger instead of a separate post-processor.

## When to engage
Actor: senior Solr engineer. Triggers: concept tagging, query understanding, taxonomy-driven search, structured Brand/Line/Model recognition, shingle-based matching, multi-word synonyms, path resolution, turning fuzzy phrases into structured queries via tag extraction. Boundaries: traditional Solr query work and vector/kNN semantic search → **solr-query**; writing the custom plugins (TagHandler, IndexConceptsHandler) this architecture relies on → **solr-extending**; catalog schema design and full synonym-file treatment → **solr-schema**.

## How it works
SKILL.md is a router over three layers joined by stable interfaces (`ProducedTag` → `StagedTag` → `SmQuery`): (1) Tagging — phrase → tokens → shingles → concept-index lookup → `ProducedTag`; (2) Graph — tags as edges, positions as vertices, K-shortest paths, ambiguity resolution; (3) Query building — per path, an abstract `SmQuery` → dependency groups + min-should-match → Solr query. Flow: `USER PHRASE → TAGGING → GRAPH → QUERY BUILDING → SOLR SEARCH → RESULTS`.
- `01-architecture.md` — full three-layer flow, the two Solr collections (concept + catalog), multi-stage processing, what this skill explicitly does not cover.
- `02-concept-indexing.md` — concept collection schema, `IndexConceptsHandler`, BLM decomposition, multi-source indexing, rebuild operations.
- `03-tagging.md` — built-in `solr.TaggerRequestHandler` vs custom `TagHandler` decision matrix, shingle lookup/scoring mechanics, multi-language, debugging.
- `04-graph-paths.md` — JGraphT `DirectedWeightedMultigraph`, K-shortest paths, quasi-positions for multi-word synonyms, edge collapsing.
- `05-ambiguity-resolution.md` — `PathAmbiguityResolver` vs `ShingleOverlappingAmbiguityResolver`, composition order, when to use `NopAmbiguityResolver`.
- `06-query-building.md` — Sm query construction, dependency groups, mm calculation, full-phrase constraint, BLM post-processor, Sm→Solr translation table.
- `07-applying-to-domain.md` — fit checklist, six-step bootstrap, annotated `stages.json`, `synonyms.txt` grammar, tuning loops, bootstrap pitfalls.
- `08-query-model-implementation.md` — complete `Sm*Query` class code, `SmClause`, `QueryParserFabric`, per-backend translators.

## Mental hooks & unexpected rules
- "This is lexical, not vector/embedding, semantic search." — stated in `<role>`; overrides the default assumption behind the skill's own name.
- "always evaluate Solr's built-in `solr.TaggerRequestHandler` ... before designing your own tagger" — the custom `TagHandler` is a last resort, not the starting point; the common production pattern is built-in tagger as inner lookup + a thin custom orchestrator on top.
- BooleanSimilarity boosts (100, 80, 60, 40) "are intended to BE the score contribution of a clause, not boost adjusted by BM25 corpus statistics" — a similarity-class decision, not a relevance-tuning knob.
- `pow = 2 ^ (originalTokenOffset - 1)` deliberately "biases the tagger toward longer matches even when shorter ones exist" — an intentional scoring skew, not incidental.
- `RECOGNIZED_PRODUCT` (BLM) tags occupy graph positions but "don't generate queries" — they only lower `phraseTokensCount` for mm; missing this makes mm unsatisfiable.
- "Indexing arbitrary text as concepts" is the lead anti-pattern — the concept collection is curated terms only, never free text like `description_text`.

## Invariants — do not change
- Frontmatter `name: solr-semantic-search` must equal the folder name and the `- solr-semantic-search` line in `docs/definitions/skills.md`.
- `description` ("To build Solr phrase-tagging semantic search: concept tagging, taxonomy, graph paths.") must stay within the shared ~25-token skill budget; with `disable-model-invocation: false` it is the sole auto-activation signal.
- `references/01-*.md` through `08-*.md` filenames are hardcoded via `READ SKILL FILE` in the `<references>` table in SKILL.md — renaming a file without updating that row breaks the router.
- Canonical outbound cross-skill forms, verbatim in this skill's own reference files and load-bearing because sibling skills document them as inbound dependencies: `USE SKILL \`solr-query\` to apply kNN/vector search` (01-architecture.md, 07-applying-to-domain.md), `USE SKILL \`solr-query\` to apply relevancy tuning` (01-architecture.md, 07-applying-to-domain.md), `USE SKILL \`solr-schema\` to apply synonyms` (07-applying-to-domain.md), bare `USE SKILL \`solr-schema\`` (01-architecture.md). `solr-schema/README.md` names `01-architecture.md` and `07-applying-to-domain.md` explicitly among its six dependent files — deleting or narrowing these sentences breaks that documented coupling.
- XML section names in SKILL.md (`<solr-semantic-search>`, `<role>`, `<when_to_use_skill>`, `<core_concepts>`, `<references>`, `<when_to_choose>`, `<mental_model>`, `<key_data_types>`, `<anti_patterns>`, `<solr_10_deltas>`); the outer wrapper must match the skill name.
- Inbound couplings (grep-confirmed; plain skill-name prose — accepted form, file paths are what's forbidden): `solr-schema/references/04-synonyms.md` and `solr-schema/README.md` name this skill for the tagger's synonym angle; `solr-query/references/12-relevancy.md` names it for tag-based scoring; `solr-extending/references/03-query-parser.md` names it for graph-based query building. Renaming this skill requires updating all four.

## Editing guide
Safe: wording/examples inside a single `references/*.md` file, adding rows to a decision matrix (e.g., built-in-vs-custom tagger, sourceType table), tightening prose, adding anti-patterns or bootstrap pitfalls. Handle with care: the `<references>` file-path table and the canonical `USE SKILL` sentences in `01-architecture.md`/`06-query-building.md`/`07-applying-to-domain.md` — sibling skills depend on these resolving correctly. New content on a new topic needs a new `references/09-*.md` file plus a row in `<references>`; SKILL.md stays a thin router — `08-query-model-implementation.md` is the one file allowed to be a large code dump, new large code samples belong there or in a new dedicated reference, not inline in SKILL.md. Referenced by: `solr-schema`, `solr-query`, `solr-extending` (informal prose mentions, not canonical `USE SKILL` forms on their side).
