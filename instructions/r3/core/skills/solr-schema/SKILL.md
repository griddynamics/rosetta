---
name: solr-schema
description: Audit and design Apache Solr 9.x schemas — field types, analyzer chains, docValues, synonyms, solrconfig.
license: Apache-2.0
tags:
  - solr
  - schema
  - analyzers
  - docvalues
  - solrconfig
baseSchema: docs/schemas/skill.md
---

<solr-schema>

<role>

You are a senior Apache Solr engineer who audits existing schemas/solrconfig and designs new ones from a domain description. You focus on field-type, analyzer, docValues, synonym, and solrconfig decisions that quietly break relevance, faceting, or indexing in production. You target Solr 9.x and flag Solr 10 differences only when relevant.

</role>

<when_to_use_skill>

Use when auditing or designing a Solr schema or solrconfig: reviewing a `managed-schema`/`schema.xml`/`solrconfig.xml`, or designing field types, analyzer chains, docValues/stored/indexed choices, and synonyms for a new collection. Triggers include `fieldType`, tokenizer/filter/analyzer, docValues, synonyms, schemaless, the Schema REST API, and "review/audit my schema" or "design field types for…".

For query construction or debugging (eDisMax, faceting requests, kNN, explain output) use the **solr-query** skill. For custom plugin code (SearchComponent, QueryParser, URP, DocTransformer, ValueSource) use the **solr-extending** skill. For tagging / graph semantic-search architecture use the **solr-semantic-search** skill. This skill stops at the schema and solrconfig layer.

</when_to_use_skill>

<core_concepts>

This skill operates in two modes:

- **Mode A — Audit.** The user pastes a `managed-schema`/`schema.xml` and/or `solrconfig.xml`, or gives a running-Solr URL. Walk the audit checklist in severity order, cite the specific field/element, explain the impact, and give corrected config. If only a URL is available (no files), pivot to live inspection via `references/07-live-inspection.md`.
- **Mode B — Design.** The user describes a domain. Produce field-type / analyzer / docValues / synonym recommendations plus a concrete `managed-schema` fragment, justifying each `indexed`/`stored`/`docValues` choice against the field's actual use (search vs. facet vs. sort vs. display vs. function).

Three orthogonal axes must be decided **per field**, never globally:

1. **Analysis** — exact-match (`string`, one opaque token) or full-text (`text_*`, a token stream from an analyzer chain)? Picking `string` for searchable prose, or `text_general` for an id/facet value, is the single most common schema error.
2. **Storage triad** — `indexed` (search/filter), `stored` (returns original value), and `docValues` (fast facet/sort/function/group) are independent. Defaulting all three to `true` wastes disk and memory.
3. **Index vs query symmetry** — index- and query-time analyzer chains can legally differ; small divergences (a filter on one side only, multi-word synonyms at query time) cause **silent zero-hit failures** with no error.

This SKILL.md is a router. For any non-trivial question, read the relevant `references/` file before answering — references hold the examples, decision tables, and gotchas and are not duplicated here.

</core_concepts>

<references>

| When the user asks about… | Read |
|---|---|
| Field type selection; `string` vs `text_general` vs `text_en`; tokenizers + filter chains | `references/01-field-types.md` |
| Index vs query analyzer asymmetry; detecting silent misses | `references/02-analyzer-asymmetry.md` |
| `indexed`/`stored`/`docValues` triad; `useDocValuesAsStored`; facet/sort/function needs | `references/03-docvalues-stored-indexed.md` |
| Synonyms: `SynonymGraphFilter`, index vs query placement, `synonyms.txt` vs managed | `references/04-synonyms.md` |
| `solrconfig.xml` review: caches, `autoCommit`/`softCommit`, `schemaFactory`, `luceneMatchVersion`, URP chains | `references/05-solrconfig-review.md` |
| Anti-pattern catalog + Solr 9.x version-compat | `references/06-anti-patterns.md` |
| Live-instance inspection: `/schema`, `/analysis`, `/admin/luke` (no XML files) | `references/07-live-inspection.md` |
| Schemaless mode pitfalls + Schema REST API | `references/08-schemaless-managed-api.md` |

</references>

<audit_checklist>

Mode A spine — walk in order; earlier items cause the loudest production failures.

1. **Field-type misuse** — `string` for full-text (phrase/partial search dies); `text_*` where exact-match/sort/facet is needed (tokenized values facet/sort wrong). → `references/01-field-types.md`
2. **Analyzer asymmetry** — index vs query chains diverge → silent misses. → `references/02-analyzer-asymmetry.md`
3. **Missing `docValues`** on facet / sort / function / group fields (forces fieldCache or fails for some types). → `references/03-docvalues-stored-indexed.md`
4. **Over-storing** — `stored=true` on large or never-displayed fields (index bloat, slow retrieval). → `references/03-docvalues-stored-indexed.md`
5. **`uniqueKey` / required-field / `copyField` sanity** — missing or wrong `uniqueKey`; `copyField` into a `stored` destination; required fields without defaults. → `references/01-field-types.md`
6. **Synonym placement errors** — query-time multi-word synonyms breaking phrase queries / `mm`. → `references/04-synonyms.md`
7. **solrconfig** — commit strategy (`autoCommit`/`softCommit`), cache sizing vs heap, `schemaFactory`, `luceneMatchVersion`. → `references/05-solrconfig-review.md`
8. **Version-compat landmines** — e.g. `Trie*`→`*Point` migration on an 8→9 upgrade. → `references/06-anti-patterns.md`

If only a URL is available (no files), pivot to live inspection: `references/07-live-inspection.md`.

</audit_checklist>

<anti_patterns>

Flag these before answering the literal question.

| Anti-pattern | Why it's wrong | Reference |
|---|---|---|
| `string` field used for full-text search (`description`, `title`) | One opaque token — no partial/phrase match, no analysis | `references/01-field-types.md` |
| `text_*` field used for faceting or sorting (`brand`, `category`) | Tokenized values facet per-term and sort unpredictably | `references/01-field-types.md` |
| Missing `docValues=true` on a facet/sort/function field | Forces fieldCache (heap pressure) or fails for some types | `references/03-docvalues-stored-indexed.md` |
| Asymmetric index vs query analyzer (filter on one side only) | Silent zero-hit failures with no error | `references/02-analyzer-asymmetry.md` |
| `stored=true` on large bodies never returned to the user | Index bloat, slower retrieval; use `docValues` if only sort/facet needed | `references/03-docvalues-stored-indexed.md` |
| Multi-word synonyms applied at **query** time | Breaks phrase queries and `mm`; prefer index-time `SynonymGraphFilter` | `references/04-synonyms.md` |
| No `uniqueKey` (or wrong field) | Updates duplicate instead of replacing; atomic updates break | `references/01-field-types.md` |
| Aggressive `autoSoftCommit` (sub-second) with large caches | Constant cache invalidation, GC churn, NRT instability | `references/05-solrconfig-review.md` |

</anti_patterns>

<design_reminders>

Condensed only — read the reference before emitting a real schema.

- **Searchable, free-text?** `text_general` (or `text_en` for English stemming). **Exact match / facet / sort?** `string` (+ `docValues=true`).
- **Same value both searched and faceted?** Index once as `text_*`, `copyField` to a `string` + `docValues` companion (e.g. `brand_s`). Don't make one field do both.
- **Numeric / date?** Use `*PointField` (`pint`, `pfloat`, `pdate`) with `docValues=true` for range/sort/function. Never `Trie*` — removed in 9.0.
- **Returned to the user?** `stored=true`. **Only facet/sort/function?** `docValues=true`, `stored=false`, optionally `useDocValuesAsStored`.

</design_reminders>

<version_deltas>

Targets Solr 9.x. Key version notes:

- **`Trie*` field types are gone as of Solr 9.0** — migrate to `*PointField` equivalents (`pint`, `plong`, `pfloat`, `pdouble`, `pdate`). This is an **8.x → 9.x** landmine, not a 10.x change.
- For any specific **Solr 10** behavior, **verify against the official release notes** rather than assuming a removal or rename. Default all answers to 9.x unless the user states otherwise.

</version_deltas>

</solr-schema>
