---
name: solr-query
description: This skill should be used when working with Apache Solr query construction, query debugging, or troubleshooting search behavior. It helps engineers write correct Solr queries and debug them — covering Lucene/eDisMax syntax, local params and parser selection, block join (parent/child) queries, JSON Facets including nested and tag/exclude faceting, kNN dense vector search and hybrid lexical+vector patterns, and reading explain output to diagnose ranking issues. Use when the user mentions Solr query syntax, fq/q construction, faceting, block join, kNN/vectors, scoring, explain, debug=results, or asks why a Solr query returns wrong/no results. Targets Solr 9.x; flags Solr 10 differences where relevant.
---

# Solr Query Skill (Solr 9.x)

This skill helps engineers **construct correct Solr queries** and **debug query behavior**. It is not a generic Solr tutorial — it focuses on the things that go wrong in production and on the syntax details that the official docs underspecify.

For analyzer chains, synonyms, and field type design, see the **solr-schema** skill.
For custom SearchComponent, QueryParser, or URP development, see the **solr-extending** skill.

---

## How to use this skill

This SKILL.md is a quick reference and a router. For any non-trivial question, **read the relevant reference file** under `references/` before answering. References contain detailed examples, gotchas, and decision tables that are not duplicated here.

### When the user asks about... → read this reference

| Topic | Reference |
|---|---|
| Lucene query syntax (operators, escaping, wildcards, ranges, fuzzy) | `01-lucene-syntax.md` |
| Local params, parser selection, `{!parser ...}`, `v=$param` deref | `02-local-params.md` |
| eDisMax: qf/pf/pf2/pf3/mm/bf/bq/boost/tie | `03-edismax.md` |
| Block join: `{!parent}`, `{!child}`, `[child]` transformer, 3-level | `04-block-join.md` |
| JSON Facets: terms/range/query, nested sub-facets, `domain` transitions | `05-json-facets.md` |
| Multi-select faceting via `{!tag=}` and `excludeTags` | `06-tag-exclude.md` |
| Dense vector / kNN search, hybrid lexical+vector ranking | `07-knn.md` |
| Reading `debug=true` explain output, score forensics | `08-explain.md` |
| Function queries, geofilt, bbox, distance | `09-function-spatial.md` |
| Document transformers — `[child]`, `[subquery]`, `[explain]`, performance | `11-doc-transformers.md` |
| Relevancy tuning — BM25, similarity choice (incl. BooleanSimilarity for tag-based search), scoring composition, judgment lists, LTR overview | `12-relevancy.md` |
| Cross-cutting anti-patterns and frequent errors | `10-common-errors.md` |

---

## Core mental model

Solr query processing has three orthogonal axes that you must keep separate:

1. **`q` vs `fq`**. `q` produces a score; `fq` is a cached boolean filter that does not. Putting scoring intent into `fq` (e.g., `fq={!edismax}...`) is almost always wrong.
2. **Parser** (`{!parser ...}`). The default parser is `lucene` unless `defType` says otherwise. The parser determines what the rest of the string means. Picking the wrong parser is the most common cause of "syntax error" messages that mention nonsense tokens.
3. **Scope**. For block join, JSON Facets, and any `domain` operation, "what set of documents am I currently looking at" is a property of the position in the request, not a global. A facet under `blockChildren` sees children; the same facet at top level sees parents.

When debugging, always identify these three before changing anything.

---

## Quick syntax reference

The following are condensed reminders. **Do not synthesize complex queries from these alone — read the reference file.**

### Parsers

```
{!lucene}field:value AND other:value          # default; Lucene syntax
{!term f=sku_id}ABC-123/XL                    # one TermQuery, no escaping needed
{!terms f=sku_id}100,101,102                  # TermInSetQuery, fast for many values
{!field f=name_s}exact phrase                 # FieldType-aware single-term/phrase
{!edismax qf="title_t^5 brand_s^2"}red shoes  # user-facing search
{!parent which=PARENT_FILTER}CHILD_QUERY      # promote children → parents
{!child of=PARENT_FILTER}PARENT_QUERY         # descend parents → children
{!join from=A to=B}...                        # cross-collection join (avoid; expensive)
{!knn f=vector_field topK=50}[1.0,0.5,...]    # dense vector search
```

`{!phrase}`, `{!wildcard}`, `{!regexp}` **do not exist as parsers**. Use Lucene syntax inline (`field:"phrase"`, `field:abc*`, `field:/regex/`) or `{!complexphrase}`.

### Block join essentials

`which=` (on `{!parent}`) and `of=` (on `{!child}`) take the **parent filter** that defines block boundaries — never a child filter, never a partial parent filter. Filter parent attributes with a separate `fq`, not by narrowing `which=`/`of=`.

### JSON Facets shape

```json
{
  "facet": {
    "by_brand": {
      "type": "terms",
      "field": "brand_s",
      "limit": 20,
      "domain": { "excludeTags": ["BRAND"] },
      "facet": {
        "avg_price": "avg(price_f)",
        "by_color": { "type": "terms", "field": "color_s", "limit": 5 }
      }
    }
  }
}
```

`uniqueBlock(_root_)` is a **string-valued metric**, not a `type` and not a property. The valid facet `type` values are `terms`, `range`, `query`, `heatmap`.

### kNN

```
q={!knn f=embedding topK=100}[0.1, 0.2, ...]
fq=in_stock_b:true                  # post-filter (applied AFTER topK retrieval)
```

To pre-filter (apply filter BEFORE kNN traversal), put the filter inside the parser:
```
q={!knn f=embedding topK=100 preFilter=in_stock_b:true}[...]
```
Pre-filter behavior changed across Solr 9.x point releases — see `07-knn.md`.

### Debug output

```
debug=true              # full debug: query parsing + explain per result
debug=query             # parsing only, no explain (fast)
debug=results           # explain per result, no parsing detail
debug.explain.structured=true   # JSON explain instead of text (parseable)
```

---

## Common reasons a Solr query "doesn't work"

When the user reports unexpected results, check in this order:

1. **Did the query parse the way you think it did?** Run with `debug=query` and inspect `parsedquery_toString`. The most common surprise is that lowercase `and`/`or` are treated as terms, not operators.
2. **Is the field analyzed the way you think?** A search for `iPhone` against a tokenized field with LowercaseFilter becomes a search for `iphone`. The `/analysis` endpoint shows you the term stream — see solr-schema skill.
3. **Are you scoring against `fq`?** `fq` does not contribute to score. Anything you want to influence ranking must be in `q` (or via `bq`/`bf`/`boost` for eDisMax).
4. **Is the scope what you expect?** For block join and faceting, ask: at this point in the request, am I looking at parents or children? Use `[child]` transformer to inspect.
5. **Is `mm` killing recall?** A hard `mm=3` against a 1-word user query returns zero results. Use formulas like `2<75%`.
6. **Is the analyzer asymmetric?** Index-time and query-time analyzers can differ; multi-word synonyms at query-time often don't expand. See solr-schema skill.

---

## Anti-patterns to call out immediately

When you see these in user code, point them out before answering the literal question:

- `{!parent of=...}` or `{!child which=...}` — parameter names are swapped
- `{!parent which="type:product AND brand:Nike"}` — restricts Block Mask, breaks scope
- `"type": "uniqueBlock"` or `"uniqueBlock": "_root_"` as facet property — it's a metric string `"uniqueBlock(_root_)"`
- `fq=field1:a&field2:b` — `&` is HTTP separator, not boolean; needs `AND`
- `q=foo and bar` — lowercase boolean is a term, not an operator
- `{!edismax}` used in `fq` — eDisMax is for user q, fq doesn't score
- `mm=3` (hard absolute) in production — use `2<75%` formula
- Long `field:(a OR b OR c OR ... OR z)` for many values — use `{!terms f=field}a,b,c,...,z`
- kNN combined with restrictive `fq` and small `topK` — post-filtering can leave zero results; raise topK or use `preFilter`

---

## Solr 10 deltas (when relevant)

Most of this skill applies unchanged to Solr 10. Notable differences:
- Several deprecated parsers (e.g., legacy `surround` quirks) cleaned up
- HTTP/2 client default; some response timing fields renamed
- kNN supports more distance functions natively

Mention version-specific behavior only when the user is on Solr 10 or asks. Default to Solr 9.x answers otherwise.
