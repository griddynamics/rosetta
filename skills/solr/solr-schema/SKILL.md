---
name: solr-schema
description: This skill should be used when auditing or designing an Apache Solr schema or solrconfig — reviewing an existing managed-schema/schema.xml or solrconfig.xml, or designing field types, analyzer chains, and synonyms for a new collection. It diagnoses field-type misuse, index-vs-query analyzer asymmetry, missing docValues on facet/sort/function fields, over-storing, synonym placement errors, commit/cache misconfiguration, and version-compat landmines; and it recommends field types, analyzers, docValues/stored/indexed choices, and synonym strategy. Use when the user mentions managed-schema, schema.xml, solrconfig.xml, fieldType, tokenizer/filter/analyzer, docValues/stored/indexed, synonyms, "review/audit my schema", "design field types for…", analyzer asymmetry, schemaless, or the Schema REST API. Targets Solr 9.x; flags Solr 10 differences where relevant.
---

# Solr Schema Skill (Solr 9.x)

This skill helps engineers **audit an existing Solr schema/solrconfig** and **design a new schema** from a domain description. It is not a generic Solr tutorial — it focuses on the field-type, analyzer, docValues, synonym, and solrconfig decisions that quietly break relevance, faceting, or indexing in production.

It operates in **two modes** (see below). Use the audit checklist and anti-pattern catalog to push back on bad config before answering the literal question.

### Boundaries — when to hand off

- **Query construction or debugging** (why a query returns wrong/no results, eDisMax, faceting requests, kNN, explain output) → use the **solr-query** skill.
- **Custom plugin or component code** (SearchComponent, QueryParser, URP, DocTransformer, ValueSource) → use the **solr-extending** skill.
- **Tagging / graph semantic-search architecture** (concept indexing, K-shortest-paths, query-model building) → use the **solr-semantic-search** skill.

This skill stops at the schema and solrconfig layer: field types, analyzers, synonyms, docValues/stored/indexed, caches, commit strategy, and version compatibility.

---

## Two modes

**Mode A — Audit.** The user pastes a `managed-schema` / `schema.xml` and/or `solrconfig.xml`, or gives a running-Solr URL. Produce a **structured review**: walk the audit checklist below in severity order, cite the specific field/element, explain the impact, and give the corrected config. If only a URL is available (no files), pivot to live inspection via `07-live-inspection.md`.

**Mode B — Design.** The user describes a domain (e.g. a product catalog with title, brand, price, category, free-text description). Produce **field-type / analyzer / docValues / synonym recommendations** plus a concrete **`managed-schema` fragment** they can paste in. Justify each `indexed`/`stored`/`docValues` choice against the field's actual use (search vs. facet vs. sort vs. display vs. function).

---

## How to use this skill

This SKILL.md is a quick reference and a router. For any non-trivial question, **read the relevant reference file** under `references/` before answering. References contain detailed examples, decision tables, and gotchas not duplicated here.

### When the user asks about... → read this reference

| Topic | Reference |
|---|---|
| Field type selection; `string` vs `text_general` vs `text_en`; tokenizers + filter chains | `01-field-types.md` |
| Index vs query analyzer asymmetry; detecting silent misses | `02-analyzer-asymmetry.md` |
| `indexed`/`stored`/`docValues` triad; `useDocValuesAsStored`; facet/sort/function needs | `03-docvalues-stored-indexed.md` |
| Synonyms: `SynonymGraphFilter`, index vs query placement, `synonyms.txt` vs managed | `04-synonyms.md` |
| `solrconfig.xml` review: caches, `autoCommit`/`softCommit`, `schemaFactory`, `luceneMatchVersion`, URP chains | `05-solrconfig-review.md` |
| Anti-pattern catalog + Solr 9.x version-compat | `06-anti-patterns.md` |
| Live-instance inspection: `/schema`, `/analysis`, `/admin/luke` (no XML files) | `07-live-inspection.md` |
| Schemaless mode pitfalls + Schema REST API | `08-schemaless-managed-api.md` |

---

## Core mental model

Schema design has three orthogonal axes that must be decided **per field**, never globally:

1. **Analysis** — is this field exact-match (`string`) or full-text (`text_*`)? A `string` field is one opaque token; a `text_*` field is a token stream produced by an analyzer chain. Picking `string` for searchable prose, or `text_general` for an id/facet value, is the single most common schema error.
2. **Storage triad** — `indexed`, `stored`, and `docValues` are independent. `indexed` enables search/filter; `stored` returns the original value; `docValues` enables fast facet/sort/function/group. A field can need any combination; defaulting all three to `true` wastes disk and memory.
3. **Index vs query symmetry** — index-time and query-time analyzer chains can legally differ, and small divergences (a filter on one side only, multi-word synonyms at query time) cause **silent zero-hit failures** that no error surfaces.

Decide these three before writing any `<field>` or `<fieldType>`.

---

## Audit checklist (Mode A spine, severity-ordered)

Walk these in order; the earlier items cause the loudest production failures.

1. **Field-type misuse** — `string` used for full-text (no tokenization → phrase/partial search dies); `text_*` used where exact-match, sort, or facet is needed (tokenized values facet/sort wrong). → `01-field-types.md`
2. **Analyzer asymmetry** — index vs query chains diverge, producing silent misses. → `02-analyzer-asymmetry.md`
3. **Missing `docValues`** on facet / sort / function / group fields (forces fieldCache / fails outright on some types). → `03-docvalues-stored-indexed.md`
4. **Over-storing** — `stored=true` on large or never-displayed fields (bloats index, slows retrieval). → `03-docvalues-stored-indexed.md`
5. **`uniqueKey` / required-field / `copyField` sanity** — missing or wrong `uniqueKey`; `copyField` into a `stored` destination; required fields without defaults. → `01-field-types.md`
6. **Synonym placement errors** — query-time multi-word synonyms breaking phrase queries / `mm`. → `04-synonyms.md`
7. **solrconfig** — commit strategy (`autoCommit`/`softCommit`), cache sizing vs heap, `schemaFactory`, `luceneMatchVersion`. → `05-solrconfig-review.md`
8. **Version-compat landmines** — e.g. `Trie*`→`*Point` field migration on an 8→9 upgrade. → `06-anti-patterns.md`

> If only a URL is available (no files to read), pivot to live inspection: `07-live-inspection.md`.

---

## Anti-patterns to call out immediately

When you see these, flag them before answering the literal question.

| Anti-pattern | Why it's wrong | Reference |
|---|---|---|
| `string` field used for full-text search (`description`, `title`) | One opaque token — no partial/phrase match, no analysis | `01-field-types.md` |
| `text_*` field used for faceting or sorting (`brand`, `category`) | Tokenized values facet per-term and sort unpredictably | `01-field-types.md` |
| Missing `docValues=true` on a facet/sort/function field | Forces fieldCache (heap pressure) or fails for some types | `03-docvalues-stored-indexed.md` |
| Asymmetric index vs query analyzer (filter on one side only) | Silent zero-hit failures with no error | `02-analyzer-asymmetry.md` |
| `stored=true` on large bodies never returned to the user | Index bloat, slower retrieval; use `docValues` if only sort/facet needed | `03-docvalues-stored-indexed.md` |
| Multi-word synonyms applied at **query** time | Breaks phrase queries and `mm`; prefer index-time `SynonymGraphFilter` | `04-synonyms.md` |
| No `uniqueKey` (or wrong field) | Updates duplicate instead of replacing; atomic updates break | `01-field-types.md` |
| Aggressive `autoSoftCommit` (sub-second) with large caches | Constant cache invalidation, GC churn, NRT instability | `05-solrconfig-review.md` |

---

## Quick design reminders

Condensed only — **read the reference before emitting a real schema**.

- **Want it searchable, free-text?** `text_general` (or `text_en` for English stemming). **Want exact match / facet / sort?** `string` (+ `docValues=true`).
- **Same value both searched and faceted?** Index once as `text_*`, `copyField` to a `string` + `docValues` companion (e.g. `brand_s`). Don't try to make one field do both.
- **Numeric / date?** Use `*PointField` (e.g. `pint`, `pfloat`, `pdate`) with `docValues=true` for range/sort/function. Never `Trie*` — removed in 9.0.
- **Returned to the user?** `stored=true`. **Only used for facet/sort/function?** `docValues=true`, `stored=false`, optionally `useDocValuesAsStored`.

---

## Solr 10 deltas (conservative)

This skill targets **Solr 9.x**. Key version notes:

- **`Trie*` field types are already gone as of Solr 9.0** — migrate to the `*PointField` equivalents (`pint`, `plong`, `pfloat`, `pdouble`, `pdate`). This is an **8.x → 9.x** landmine, not a 10.x change.
- For any specific **Solr 10** behavior, **verify against the official release notes** rather than assuming a removal or rename. Do not assert unverified 10.x changes; default all answers to 9.x unless the user states otherwise.
