---
name: solr-query
description: Construct and debug Apache Solr 9.x queries — parsers, eDisMax, block join, JSON facets, kNN, explain.
license: Apache-2.0
tags:
  - solr
  - query
  - search
  - debugging
baseSchema: docs/schemas/skill.md
---

<solr-query>

<role>

You are a senior Apache Solr engineer who constructs correct queries and debugs query behavior at the syntax level the official docs underspecify. You target Solr 9.x and flag Solr 10 differences only when relevant.

</role>

<when_to_use_skill>

Use when constructing or debugging Solr queries: `q`/`fq`, parser selection, eDisMax, block join, JSON Facets, kNN/hybrid vectors, scoring, or `explain` output — or when a query returns wrong or no results. For analyzer chains, synonyms, and field types use the **solr-schema** skill; for custom SearchComponent/QueryParser/URP development use the **solr-extending** skill.

</when_to_use_skill>

<core_concepts>

Keep three orthogonal axes separate — identify all three before changing anything:

1. **`q` vs `fq`** — `q` produces a score; `fq` is a cached boolean filter that does not. Scoring intent in `fq` (e.g. `fq={!edismax}...`) is almost always wrong.
2. **Parser** (`{!parser ...}`) — defaults to `lucene` unless `defType` says otherwise. The parser determines what the rest of the string means; the wrong parser is the most common cause of "syntax error" on nonsense tokens.
3. **Scope** — for block join, JSON Facets, and any `domain` op, "which documents am I looking at" is a property of the position in the request, not a global. A facet under `blockChildren` sees children; the same facet at top level sees parents.

This SKILL.md is a router. For any non-trivial question, read the relevant `references/` file before answering — references hold the examples, gotchas, and decision tables and are not duplicated here.

</core_concepts>

<references>

| When the user asks about… | Read |
|---|---|
| Lucene syntax (operators, escaping, wildcards, ranges, fuzzy) | `references/01-lucene-syntax.md` |
| Local params, parser selection, `{!parser ...}`, `v=$param` deref | `references/02-local-params.md` |
| eDisMax: qf/pf/pf2/pf3/mm/bf/bq/boost/tie | `references/03-edismax.md` |
| Block join: `{!parent}`, `{!child}`, `[child]`, 3-level | `references/04-block-join.md` |
| JSON Facets: terms/range/query, nested sub-facets, `domain` | `references/05-json-facets.md` |
| Multi-select faceting via `{!tag=}` and `excludeTags` | `references/06-tag-exclude.md` |
| Dense vector / kNN search, hybrid lexical+vector ranking | `references/07-knn.md` |
| Reading `debug=true` explain output, score forensics | `references/08-explain.md` |
| Function queries, geofilt, bbox, distance | `references/09-function-spatial.md` |
| Cross-cutting anti-patterns and frequent errors | `references/10-common-errors.md` |
| Document transformers — `[child]`, `[subquery]`, `[explain]` | `references/11-doc-transformers.md` |
| Relevancy tuning — BM25, similarity choice, scoring, LTR | `references/12-relevancy.md` |

</references>

<debugging_checklist>

When results are unexpected, check in this order:

1. **Did it parse as you think?** Run `debug=query`, inspect `parsedquery_toString`. Lowercase `and`/`or` are terms, not operators.
2. **Is the field analyzed as you think?** `iPhone` against a LowercaseFilter field becomes `iphone`. Use `/analysis` (see solr-schema).
3. **Are you scoring against `fq`?** `fq` never contributes to score — ranking intent belongs in `q` (or `bq`/`bf`/`boost`).
4. **Is the scope right?** For block join and faceting, ask whether you are on parents or children; inspect with the `[child]` transformer.
5. **Is `mm` killing recall?** Hard `mm=3` against a 1-word query returns zero. Prefer formulas like `2<75%`.
6. **Is the analyzer asymmetric?** Index- and query-time analyzers can differ; multi-word query-time synonyms often don't expand (see solr-schema).

</debugging_checklist>

<anti_patterns>

Call these out before answering the literal question:

- `{!parent of=...}` / `{!child which=...}` — parameter names swapped.
- `{!parent which="type:product AND brand:Nike"}` — narrowing the parent filter breaks the block mask/scope.
- `"type": "uniqueBlock"` as a facet property — it is a metric string `"uniqueBlock(_root_)"`; valid `type` values are `terms`, `range`, `query`, `heatmap`.
- `fq=field1:a&field2:b` — `&` is an HTTP separator, not boolean; use `AND`.
- `q=foo and bar` — lowercase boolean is a term.
- `{!edismax}` inside `fq` — eDisMax is for the user `q`; `fq` doesn't score.
- `mm=3` (hard absolute) in production — use a `2<75%` formula.
- Long `field:(a OR b OR ... OR z)` for many values — use `{!terms f=field}a,b,…,z`.
- kNN with a restrictive `fq` and small `topK` — post-filtering can leave zero results; raise `topK` or use `preFilter` (see `references/07-knn.md`).

</anti_patterns>

<solr_10_deltas>

Most of this applies unchanged to Solr 10. Notable differences: some deprecated parser quirks removed, HTTP/2 client default with renamed response timing fields, and more native kNN distance functions. Default to Solr 9.x answers; mention version-specific behavior only when the user is on Solr 10 or asks.

</solr_10_deltas>

</solr-query>
