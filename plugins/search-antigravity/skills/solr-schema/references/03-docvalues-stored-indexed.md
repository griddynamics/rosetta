# `indexed`, `stored`, `docValues`: Three Independent Axes (Solr 9.x)

These three field attributes are **orthogonal**. Each controls a separate on-disk structure with a separate purpose. The most common schema mistakes here are (1) assuming one implies another, (2) defaulting all three to `true` and wasting disk/heap, and (3) omitting `docValues` on a field that facets or sorts, which silently forces a fieldCache build and can OOM the node. Decide all three **per field**, against the field's actual use.

## The three axes

| Attribute | On-disk structure | Enables | Direction |
|---|---|---|---|
| `indexed` | Inverted index (term → docs) | **Search, filter, range query, prefix/wildcard** — anything in `q`/`fq` | term → document |
| `stored` | Stored-fields (per-doc blob) | **Verbatim retrieval** — return the original value in `fl` exactly as sent | document → original value |
| `docValues` | Column-stride (forward, per-doc value) | **Facet, sort, function queries, grouping, streaming, JSON Facet, field collapsing** | document → value(s) |

The mental model:

- `indexed` answers *"which documents contain this term?"* (inverted).
- `docValues` answers *"what is this document's value for this field?"* (forward / columnar).
- `stored` answers *"what did the client originally send for this field?"* (raw bytes, untokenized).

A field can need **any combination**. A searchable, displayed, sortable field needs all three. A facet-only field needs only `docValues`. A pure full-text body needs only `indexed`.

## What each one is for

### `indexed=true`
Required for the field to appear in `q` or `fq`: term matching, phrase, range (`price_i:[10 TO 50]`), prefix, wildcard, sorting *is not* served by this. If a field is never searched or filtered, set `indexed=false` and save the inverted-index cost.

### `stored=true`
Returns the **exact original input** in result documents. The value is kept verbatim — for a `text_general` field, `stored` keeps the pre-analysis string, not the tokens. Only set `stored=true` for fields you actually return to the client in `fl`.

### `docValues=true`
A column-oriented, uninverted structure read sequentially per document. Required (or strongly preferred) for every operation that needs to read a field's value *for a set of matching docs*:

- **Faceting** (`facet.field`, `facet.range`, JSON Facet API)
- **Sorting** (`sort=price_i asc`)
- **Function queries** (`bf=log(popularity_i)`, `sort=div(a,b)`)
- **Grouping / field collapsing** (`group.field`, `{!collapse field=...}`)
- **Streaming expressions / export handler** (`/export` *requires* docValues)
- **`facet.method=uif`**, stats, pivot facets

## `useDocValuesAsStored`

Defaults to **`true`** in modern schemas. When a field has `docValues=true` but `stored=false`, Solr can still **return the value in `fl`** by reading it from docValues — no separate stored copy needed. This lets you drop `stored=true` on numeric/string/date facet/sort fields and still display them, saving the stored-fields blob.

```xml
<field name="price_i" type="pint" indexed="true" stored="false" docValues="true"/>
<!-- price_i still returned in fl=price_i via docValues, because useDocValuesAsStored defaults to true -->
```

Caveats:
- Set `useDocValuesAsStored="false"` on a field if you do **not** want it auto-returned by `fl=*` (e.g. an internal sort key).
- docValues are sorted and de-duplicated per document, so for **multi-valued** fields the returned order/duplicates may not match the original input. If you need exact original order or duplicates back, keep `stored=true`.
- Full-text `text_*` fields can't use this — they don't support docValues at all (see below).

## The failure mode: faceting/sorting without docValues

If you facet, sort, or run a function query on a field that **lacks `docValues`**, Solr must **uninvert** the inverted index at runtime into an in-heap `UnInvertedField` / fieldCache entry to get per-doc values. Consequences:

- Large, **on-heap** structures built lazily on first use — a latency spike, then sustained heap pressure.
- On high-cardinality fields or large segments this causes **GC thrashing or OutOfMemoryError**.
- For some operations on some field types it **fails outright** rather than falling back.

The fix is **not** a config flag toggle that takes effect immediately:

1. Set `docValues="true"` on the field in the schema.
2. **Full REINDEX.** docValues are built at index time; flipping the attribute does nothing for documents already in the index. You must re-index every document so the column-stride structure is written.

> Adding `docValues="true"` to an existing field and *not* re-indexing leaves the old docs without docValues — queries that touch them still fall back to fieldCache (or error). Re-index is mandatory.

## docValues defaults and the text-field restriction

- For `string`, numeric (`pint`, `plong`, `pfloat`, `pdouble`), `boolean`, and `pdate` field types, modern Solr schema templates default **`docValues=true`**. You usually get docValues for free on these — but always verify, because an older or hand-edited schema may not.
- **Tokenized full-text fields (`text_general`, `text_en`, any `solr.TextField` with an analyzer) cannot have docValues.** docValues store one (or a sorted set of) discrete value(s) per document; a tokenized field produces an arbitrary token *stream* per document, which has no single columnar value to store. Attempting `docValues=true` on a `TextField` is a schema error.
  - This is exactly why you cannot facet/sort directly on a `text_*` field. The standard pattern: index the searchable text as `text_*`, and `copyField` it to a parallel `string` companion (e.g. `brand_s`) that carries `docValues=true` for the facet/sort.

## Over-storing

`stored=true` on a large field that is **never returned to the client** is pure waste:

- Inflates the stored-fields segment files → larger index on disk.
- **Slows segment merges** (more bytes to copy) and backup/replication.
- Adds decompression cost on retrieval even when you don't ask for the field.

If a big `description_t` is only ever searched (never displayed), use `stored=false`. If a numeric/string field is only faceted or sorted, use `docValues=true, stored=false` and rely on `useDocValuesAsStored` for any occasional display.

## Decision table by field role

| Field role | `indexed` | `stored` | `docValues` | Example |
|---|---|---|---|---|
| Full-text search only (never displayed) | `true` | `false` | n/a (text) | large `description_t` body |
| Full-text search + displayed | `true` | `true` | n/a (text) | `title_t` shown in results |
| Facet only | `false` | `false` | `true` | `category_s` used only in `facet.field` |
| Sort only | `false` | `false` | `true` | internal `rank_i` sort key |
| Facet/sort + displayed | `false` | `false` | `true` | `price_i` (returned via `useDocValuesAsStored`) |
| Exact-match filter + facet + display | `true` | `false` | `true` | `brand_s` (display via docValues) |
| Search + display + sort | `true` | `true` | `true` | `name_s` shown and sorted |
| `uniqueKey` id | `true` | `true` | `false`* | `id` |

\* The `uniqueKey` field needs `indexed`+`stored`; docValues is optional and often omitted for the id.

### Worked examples

```xml
<!-- Searchable free-text body, never displayed: index only -->
<field name="description_t" type="text_general" indexed="true" stored="false"/>

<!-- Brand: filterable, facetable, displayable — but NOT a text field -->
<field name="brand_s" type="string" indexed="true" stored="false" docValues="true"/>

<!-- Price: range-filter + sort + display, no stored copy needed -->
<field name="price_i" type="pint" indexed="true" stored="false" docValues="true"/>

<!-- Title: searched (text) AND displayed; companion string for sort/facet -->
<field name="title_t" type="text_general" indexed="true" stored="true"/>
<field name="title_s" type="string" indexed="false" stored="false" docValues="true"/>
<copyField source="title_t" dest="title_s"/>
```

## Quick rules

- **Searched or filtered?** → `indexed=true`.
- **Returned to the user verbatim, multi-valued order matters, or a text field?** → `stored=true`.
- **Faceted, sorted, function-queried, grouped, or streamed?** → `docValues=true` (and **re-index**).
- **Numeric/string/date you only sort or facet on?** → `docValues=true, stored=false`, lean on `useDocValuesAsStored` for display.
- **Want to facet/sort a `text_*` field?** → you can't; `copyField` to a `string`+`docValues` companion.
- Default-all-`true` is a smell: it costs disk (`stored`) and inverted-index space (`indexed`) you may not need.
