# Schema Anti-Patterns Catalog + Version Compatibility (Solr 9.x)

This file is the **consolidated catalog** an auditor walks top-to-bottom. Each entry is
`anti-pattern → why → fix`. Topic detail lives in the sibling references; this file
exists to flag the recurring mistakes fast, before answering the literal question.

Cross-links: field types `01-field-types.md` · analyzer asymmetry `02-analyzer-asymmetry.md` ·
storage triad `03-docvalues-stored-indexed.md` · synonyms `04-synonyms.md` ·
solrconfig `05-solrconfig-review.md` · live inspection `07-live-inspection.md`.

---

## Field-type misuse

### `string` for full-text
- **Anti-pattern:** A `description`, `title`, or `body` field declared as `string`.
- **Why:** A `string` field is a single opaque token — no tokenization, lowercasing,
  or stemming. Partial-word and phrase search silently die; only an exact, whole-value
  match works.
- **Fix:** Use `text_general` (or `text_en` for English stemming). If you also need the
  raw value for facet/sort, `copyField` to a `string` + `docValues` companion. See
  `01-field-types.md`.

### `text_*` for exact-match, facet, or sort
- **Anti-pattern:** `brand`, `category`, `status`, or an id declared as `text_general`
  and then faceted, sorted, or filtered for exact value.
- **Why:** The analyzer splits the value into tokens. Faceting then counts **per token**
  (`"Acme Corp"` → buckets `acme` and `corp`), and sorting on a tokenized,
  often-`multiValued` field is undefined. Exact filters match sub-tokens, not the value.
- **Fix:** Use `string` with `docValues=true`. See `01-field-types.md`.

---

## Storage-triad mistakes

### Missing `docValues` on facet / sort / function fields
- **Anti-pattern:** A field used for `facet.field`, `sort=`, `group`, JSON-facet metrics,
  or a function query, declared without `docValues=true`.
- **Why:** Without docValues, Solr falls back to the un-inverted fieldCache (heavy heap
  pressure, GC churn, and heap spikes under load) — and for some field types the
  operation fails outright. The collection works in light testing, then the heap blows up
  in production.
- **Fix:** Set `docValues=true` on every facet/sort/function/group field (and reindex —
  docValues is build-time). See `03-docvalues-stored-indexed.md`.

### Over-storing
- **Anti-pattern:** `stored=true` on large bodies, blobs, or computed fields that are
  never returned to the user.
- **Why:** Stored values bloat the index on disk and slow document retrieval, for no
  benefit if nothing reads them back.
- **Fix:** Set `stored=false`. If the value is only needed for facet/sort/function, keep
  `docValues=true` and optionally `useDocValuesAsStored`. See
  `03-docvalues-stored-indexed.md`.

---

## Analyzer-chain mistakes

### Asymmetric index vs query analyzers
- **Anti-pattern:** A filter present on one analysis chain but not the other (e.g.
  `ASCIIFoldingFilter` or a stemmer at index time only, or a stopword list that differs).
- **Why:** Index and query produce different terms, so the query term never matches the
  indexed term — a **silent zero-hit failure** with no error logged.
- **Fix:** Keep the chains symmetric unless you have a deliberate, documented reason
  (the classic legitimate asymmetry is index-time synonym expansion). Diff the two chains
  field-by-field. See `02-analyzer-asymmetry.md`.

### Query-time multi-word synonyms
- **Anti-pattern:** Multi-word synonyms (`"laptop, notebook computer"`) applied at
  **query** time.
- **Why:** Query-time multi-word expansion injects extra tokens that break phrase queries
  and throw off `mm` (minimum-should-match) counting, producing wrong or zero results.
- **Fix:** Prefer index-time `SynonymGraphFilter` for multi-word entries, or keep
  query-time synonyms single-word only. See `04-synonyms.md`.

---

## Structural / config mistakes

### No `uniqueKey` (or the wrong field)
- **Anti-pattern:** Schema with no `<uniqueKey>`, or one pointing at a non-unique field.
- **Why:** Without a correct unique key, re-indexing a document **appends a duplicate**
  instead of replacing it, and atomic / in-place updates and real-time-get break.
- **Fix:** Declare a single-valued, indexed `string` `<uniqueKey>` (commonly `id`). See
  `01-field-types.md`.

### Unexpected `multiValued`
- **Anti-pattern:** A field left `multiValued=true` (often inherited from a dynamic field
  or schemaless default) that logically holds one value, then sorted or used in a function.
- **Why:** You cannot sort or run a single-valued function on a multiValued field —
  Solr errors or picks an unspecified value. Single-value assumptions in client code
  silently take the first element.
- **Fix:** Set `multiValued=false` explicitly on single-value fields; audit dynamic-field
  and schemaless-inferred defaults. See `01-field-types.md`.

### `copyField` sprawl and loops
- **Anti-pattern:** Dozens of overlapping `copyField` directives, copying into `stored`
  destinations, or two fields copying into each other.
- **Why:** Sprawl inflates index size and makes relevance impossible to reason about; a
  `stored` copy destination duplicates data with no benefit (copy targets only need to be
  indexed/docValues); cyclic copies are a configuration smell that duplicates terms.
- **Fix:** Keep a small, intentional set of copy targets (e.g. one `text` catch-all and
  one `string`+`docValues` companion per searchable facet). Copy destinations should be
  `stored=false`. See `01-field-types.md`.

### Oversized `maxBooleanClauses` / shingle explosion
- **Anti-pattern:** Inflating `maxBooleanClauses` to tens of thousands to paper over
  giant OR-queries, or a `ShingleFilter` with a wide `min/maxShingleSize`.
- **Why:** Each raises term/clause counts dramatically — memory and query latency balloon,
  and a runaway clause count is a denial-of-service footgun. A wide shingle window
  multiplies indexed terms combinatorially.
- **Fix:** Solve large value-sets at query time with `{!terms}` instead of raising the
  clause cap; keep shingle sizes narrow (e.g. 2–2 or 2–3) and only where phrase-ish
  matching is actually needed. See `05-solrconfig-review.md`.

---

## Quick auditor triage (flag these on sight)

| Anti-pattern | One-line tell |
|---|---|
| `string` for full-text | searchable prose that won't partial/phrase-match |
| `text_*` for facet/sort | facet buckets split per word; sort is undefined |
| Missing `docValues` on facet/sort/function | works in dev, heap spikes under load |
| Asymmetric analyzers | silent zero hits, no error |
| Over-storing | `stored=true` on never-returned large fields |
| No / wrong `uniqueKey` | reindex duplicates instead of replacing |
| Unexpected `multiValued` | sort/function errors on a "single value" field |
| `copyField` sprawl/loops | many overlapping or `stored` copy targets |
| Query-time multi-word synonyms | broken phrases, wrong `mm` |
| Oversized `maxBooleanClauses` / shingles | latency and memory blowups |

---

## Version compatibility

This skill targets **Solr 9.x**. The compatibility landmines below are the ones that
turn a "valid" schema from an older release into a broken one after upgrade.

### `Trie*` field types removed in 9.0 → use `*PointField` (the 8 → 9 landmine)
- **Anti-pattern:** A schema carried over from Solr 7.x/8.x still declaring `TrieIntField`,
  `TrieLongField`, `TrieFloatField`, `TrieDoubleField`, or `TrieDateField`.
- **Why:** The entire `Trie*` family was **removed in Solr 9.0**. A 9.x core will not load
  a schema that references them.
- **Fix:** Migrate to the point-based equivalents and **reindex** (the on-disk encoding
  differs):

  | Removed (≤ 8.x) | Replacement (9.x) | Common type alias |
  |---|---|---|
  | `TrieIntField` | `IntPointField` | `pint` |
  | `TrieLongField` | `LongPointField` | `plong` |
  | `TrieFloatField` | `FloatPointField` | `pfloat` |
  | `TrieDoubleField` | `DoublePointField` | `pdouble` |
  | `TrieDateField` | `DatePointField` | `pdate` |

  Add `docValues=true` to any of these used for range, sort, or function queries.

### `ManagedIndexSchemaFactory` is the 9.x default
- In Solr 9.x the default `schemaFactory` is **`ManagedIndexSchemaFactory`** — the schema
  is mutable through the Schema REST API and stored as `managed-schema.xml`. Hand-editing a
  classic `schema.xml` alongside a managed factory leads to confusion about which file is
  authoritative; pick one model deliberately. See `05-solrconfig-review.md` and
  `07-live-inspection.md`.

### Solr 10 — frame conservatively
- This catalog is verified for **9.x only**. For any **Solr 10** behavior, **verify
  against the official release notes** before asserting a removal, rename, or default
  change. Do **not** assume Solr 10 behaves like 9.x for schema syntax, and do not claim
  10.x removals that the release notes have not been checked for. When unsure, default the
  answer to 9.x and flag that the user should confirm against the 10.x release notes.
