# solr-query
Builds and debugs Apache Solr 9.x queries — parser selection, eDisMax, block join, JSON Facets, kNN, explain — at the syntax level the official docs underspecify.

## Why it exists
A model asked to write or debug a Solr query will guess at plausible-looking syntax: invented parsers (`{!phrase}`, `{!exact}`), a hard `mm=3` that zeroes out short queries, a narrowed block-join `which=` that corrupts the block mask, scoring logic placed in `fq` (which never scores), or a default post-filtered kNN that returns near-zero results under a selective `fq`. None of these raise an error — they just produce wrong or empty results silently. The skill replaces guessing with named decision tables (`bf` vs `bq` vs `boost`, `{!child}` vs `[subquery]`, BM25 vs `BooleanSimilarity`) and an anti-pattern catalog, so answers are checked against documented landmines instead of reconstructed from memory of the docs.

## When to engage
Triggers: `q`/`fq`, parser selection, eDisMax, block join, JSON Facets, kNN/hybrid vectors, scoring, `explain` output, or a query returning wrong/no results. Actor: any agent; auto-invocable (`disable-model-invocation: false`) and user-invocable. Boundaries: analyzer chains/synonyms/field types → **solr-schema**; custom SearchComponent/QueryParser/URP/DocTransformer/ValueSource development → **solr-extending**; concept-tagging/taxonomy query-understanding architecture → **solr-semantic-search** (which routes vector/kNN search and relevancy/LTR tuning back into this skill).

## How it works
SKILL.md is a router: `<core_concepts>` names three axes to separate before changing anything (`q` vs `fq` scoring, parser selection, block/facet scope), then a `<references>` table maps topic → file via `READ SKILL FILE`. `references/NN-*.md`:
- `01-lucene-syntax.md` — operators, escaping, wildcards, ranges, fuzzy, `{!term}` escape-bypass
- `02-local-params.md` — `{!parser}` syntax, `$param` dereferencing, `cache=false`/`cost=`, parsers that don't exist
- `03-edismax.md` — `qf`/`pf`/`pf2`/`pf3`/`mm`/`tie`, the `bf` vs `bq` vs `boost` decision guide
- `04-block-join.md` — the Block Mask concept, `{!parent}`/`{!child}`, `[child]` transformer, 3-level `_root_` gotcha
- `05-json-facets.md` — terms/range/query/heatmap, `domain` transitions, metrics-are-strings-not-types
- `06-tag-exclude.md` — `{!tag=}`/`excludeTags` multi-select faceting; legacy `{!ex=}` vs JSON `domain.excludeTags`
- `07-knn.md` — `DenseVectorField` setup, pre/post-filter recall trap, hybrid RRF/rerank
- `08-explain.md` — `debug=true` shape, BM25 explain anatomy, doc-vs-doc comparison workflow
- `09-function-spatial.md` — function queries, `geofilt`/`bbox`/`geodist`, `pt` is `lat,lon`
- `10-common-errors.md` — cross-cutting anti-pattern catalog (parser/operator/escaping/scope/distributed)
- `11-doc-transformers.md` — `[child]` vs `[subquery]` performance tradeoff
- `12-relevancy.md` — BM25 `k1`/`b` tuning, `BooleanSimilarity` for tag-based scoring, judgment-list workflow, LTR

`<debugging_checklist>` (6 ordered checks) and `<anti_patterns>` (9 call-outs) live in SKILL.md itself as the first-response filter, applied before answering the literal question.

## Mental hooks & unexpected rules
- "kNN with a restrictive `fq` and small `topK` — post-filtering can leave zero results" — default kNN+`fq` is post-filter; raise `topK` or use `preFilter` (Solr 9.5+).
- "It is *not* a filter to narrow which parents you care about. It defines block boundaries" (of the Block Mask, `which=`) — `{!parent which="type_s:product AND brand_s:Nike"}` corrupts block resolution; filter parents via a separate `fq`.
- "Each metric is a string. **Not** an object. **Not** a `type`" — `uniqueBlock(_root_)` etc. are metric strings; treating them as a facet `type` is the #1 JSON Facets mistake.
- "JSON Facets does NOT use `{!ex=}`" — the legacy exclusion syntax silently fails to apply; JSON Facets uses `domain.excludeTags`.
- "Solr ignores unknown `domain` keys silently" — `excludeFilters`/`exclude` typos produce no error, just a facet that runs as if unexcluded.
- "`log` of zero is `-∞`" — always `sum(field,1)` before `log()` in boost functions.
- "`BooleanSimilarity` cuts it out: clause score IS the configured boost" — for tag-based semantic-search fields, BM25's IDF/TF silently reinterprets a config's `boost:100` as something else; swap similarity per fieldType instead of fighting BM25.
- "`_root_` always points to the topmost ancestor" — in a 3-level hierarchy, `uniqueBlock(_root_)` from SKU scope counts collections, not products.

## Invariants — do not change
- Frontmatter `name: solr-query` must equal the folder name and the `docs/definitions/skills.md` entry (`- solr-query`); renaming either breaks registration.
- `description` ("To build and debug Solr queries: eDisMax, block join, JSON facets, kNN, explain.") is the only text visible for auto-activation (`disable-model-invocation: false`) — keep it terse and inside the shared ~25-token budget (`docs/schemas/skill.md`).
- `disable-model-invocation: false` / `user-invocable: true` — flipping either changes discoverability (auto vs. user-only vs. hidden).
- `references/01-*.md` through `references/12-*.md` filenames are hardcoded in SKILL.md's `<references>` table (`READ SKILL FILE`, nameless form). Sibling skills reference INTO this skill only via the intent form (`USE SKILL \`solr-query\` to apply local params / function queries / document transformers / relevancy tuning / eDisMax / kNN`) — the corresponding topic keywords in the `<references>` table must keep routing to the matching file.
- Cross-skill intent-form contract: `solr-semantic-search/references/07-applying-to-domain.md` and `01-architecture.md` both use `USE SKILL \`solr-query\` to apply kNN/vector search` and `USE SKILL \`solr-query\` to apply relevancy tuning` — the kNN and relevancy topic keywords in this skill's `<when_to_use_skill>`/`<references>` must keep routing to `references/07-knn.md` and `references/12-relevancy.md` respectively; narrowing either topic silently breaks those two sibling pointers.
- XML section names in SKILL.md (`<solr-query>`, `<role>`, `<when_to_use_skill>`, `<core_concepts>`, `<references>`, `<debugging_checklist>`, `<anti_patterns>`, `<solr_10_deltas>`) are structural; the outer `<solr-query>` wrapper must match the skill name. The `which=`/`of=` parameter names in `{!parent}`/`{!child}` examples are the real Solr API — do not "fix" them to look symmetric.
- Inbound couplings, confirmed by `grep -rn "solr-query" instructions/r3/core --include="*.md"`: `solr-schema/SKILL.md` and its README route eDisMax/faceting/kNN/explain questions here; `solr-extending/SKILL.md` and four of its references route query construction, local params, function queries, document transformers, and relevancy tuning here; `solr-semantic-search/SKILL.md` and three of its references (`01-architecture.md`, `06-query-building.md`, `07-applying-to-domain.md`) route vector/kNN, eDisMax-mm, and relevancy/LTR questions here — all via the intent form. Moving this skill's topic boundaries without updating those files creates a silent routing gap.

## Editing guide
Safe: wording/examples within a single `references/*.md` file, adding anti-pattern rows, tightening SKILL.md prose. Handle with care: the `<references>` table (must stay in sync with the 12 filenames and keep the topic keywords that inbound intent-form sentences route on); the canonical cross-skill sentences that route kNN/relevancy work in from `solr-semantic-search`; the `<debugging_checklist>` ordering (a diagnostic sequence, not an arbitrary list). New content spanning a new topic belongs in a new `references/13-*.md` file plus a new `<references>` row — SKILL.md itself should stay a thin router. Referenced by `solr-schema`, `solr-extending`, `solr-semantic-search` (see couplings above); this skill in turn defers to `solr-schema` (analyzers/synonyms/field types) and `solr-extending` (custom plugin code).
