# Field Types: `string` vs `text_*`, Tokenizers, and Numeric Points (Solr 9.x)

This file covers the single most common schema decision — **which field type** a field should be — and the analyzer chains behind the built-in text types. For the orthogonal `indexed`/`stored`/`docValues` choice, see `03-docvalues-stored-indexed.md`. For index-vs-query analyzer divergence, see `02-analyzer-asymmetry.md`.

## The core split: `StrField` vs `TextField`

Every searchable field in Solr is one of two analysis shapes:

- **`StrField`** (`string`, `strings`) — **not tokenized**. The entire value is one opaque token. Good for exact match, faceting, sorting, grouping, and identifiers (a `uniqueKey` is almost always a `StrField`). A search for part of the value will not match; only the whole, byte-for-byte value matches.
- **`TextField`** (`text_general`, `text_en`, …) — **tokenized** by an analyzer chain into a token stream. Good for full-text search where users type words, phrases, or partial wording and expect matches. A tokenized field facets and sorts **per token**, not per whole value — so it is the wrong choice for facet/sort.

Picking `string` for searchable prose (a title or description) means phrase and partial-word search silently die — there is nothing to match but the one giant token. Picking `text_general` for an id, brand, or category value means faceting and sorting break, because the field is stored as separate lowercase tokens.

The clean pattern when a value is **both** searched and faceted: index it once as `text_*`, then `copyField` it into a `string` companion (e.g. `brand` → `brand_s`) used only for facet/sort. Don't try to make one field do both.

---

## `text_general` — the language-neutral full-text type

The default general-purpose analyzed type. Index-time chain:

```xml
<fieldType name="text_general" class="solr.TextField" positionIncrementGap="100">
  <analyzer type="index">
    <tokenizer class="solr.StandardTokenizerFactory"/>
    <filter class="solr.StopFilterFactory" words="stopwords.txt" ignoreCase="true"/>
    <filter class="solr.LowerCaseFilterFactory"/>
  </analyzer>
  <analyzer type="query">
    <tokenizer class="solr.StandardTokenizerFactory"/>
    <filter class="solr.StopFilterFactory" words="stopwords.txt" ignoreCase="true"/>
    <filter class="solr.LowerCaseFilterFactory"/>
  </analyzer>
</fieldType>
```

The pieces:

- **`StandardTokenizer`** — the default tokenizer for both `text_general` and `text_en`. Splits on Unicode word boundaries and drops most punctuation. (`title_t` of `"Pro-Grade Kettle"` → `pro`, `grade`, `kettle`.)
- **`LowerCaseFilter`** — case-folds every token so `Kettle` matches `kettle`.
- **`StopFilter`** — removes common words (`the`, `and`, `a`) from `stopwords.txt`.
- **Synonyms** — not shown here; the synonym filter and its index-vs-query placement (a frequent bug, and it requires `FlattenGraphFilter` when applied at index time) are covered in `04-synonyms.md`.

`text_general` does **no stemming**. `"running"` and `"run"` are distinct tokens.

---

## `text_en` — English full-text with stemming

`text_en` is `text_general` plus English-specific filters. The added filters (beyond tokenizer + lowercase + stop):

- **`EnglishPossessiveFilter`** — strips trailing `'s` (`brand's` → `brand`).
- **`KeywordMarkerFilter`** — marks protected words (`protwords.txt`) so the stemmer leaves them intact.
- **`PorterStemFilter`** (or `SnowballPorterFilter` with `language="English"`) — reduces words to a stem so `running`, `runs`, `runner` collapse toward `run` (algorithmic suffix-stripping — it does not handle the irregular `ran`). This is what makes `text_en` match across word forms.

```xml
<fieldType name="text_en" class="solr.TextField" positionIncrementGap="100">
  <analyzer>
    <tokenizer class="solr.StandardTokenizerFactory"/>
    <filter class="solr.StopFilterFactory" words="lang/stopwords_en.txt" ignoreCase="true"/>
    <filter class="solr.LowerCaseFilterFactory"/>
    <filter class="solr.EnglishPossessiveFilterFactory"/>
    <filter class="solr.KeywordMarkerFilterFactory" protected="protwords.txt"/>
    <filter class="solr.PorterStemFilterFactory"/>
  </analyzer>
</fieldType>
```

**Rule of thumb:** English product titles and descriptions → `text_en` (users benefit from stemming). Codes, SKUs, identifiers, and facet/sort values → `string`. Mixed-language or you don't want stemming → `text_general`.

---

## Numeric, date, and boolean types

Use **Point** field types for all numbers and dates in Solr 9.x:

| Logical type | Field type | Typical use |
|---|---|---|
| Integer | `IntPointField` (`pint`) | quantity, count |
| Long | `LongPointField` (`plong`) | large ids, epoch ms |
| Float | `FloatPointField` (`pfloat`) | price, rating |
| Double | `DoublePointField` (`pdouble`) | high-precision measures |
| Date | `DatePointField` (`pdate`) | created/updated timestamps |
| Boolean | `BoolField` (`boolean`) | in-stock, featured flags |

Add `docValues="true"` to any numeric/date field used for range queries, sorting, faceting, or function queries (see `03-docvalues-stored-indexed.md`).

### Version landmine: `Trie*` is gone in Solr 9.0

The old `TrieIntField`, `TrieLongField`, `TrieFloatField`, `TrieDoubleField`, and `TrieDateField` types were **removed in Solr 9.0**. A schema carried over from Solr 8 that still references `solr.TrieIntField` (or the `tint`/`tlong`/`tdate` type names) will fail to load on 9.x. Migrate each `Trie*` field to its `*PointField` equivalent — e.g. `TrieIntField` → `IntPointField`, `TrieDateField` → `DatePointField` — and **reindex**, since the on-disk encoding differs. This is an **8.x → 9.x** migration issue, not a 10.x change.

---

## Decision table

| You need to… | Field type |
|---|---|
| Exact match / identifier / `uniqueKey` | `string` (`StrField`) |
| Facet on a value | `string` + `docValues=true` |
| Sort or group by a value | `string` + `docValues=true` |
| Full-text search, language-neutral | `text_general` (`TextField`) |
| Full-text search, English w/ stemming | `text_en` (`TextField`) |
| Range / sort / function on a number | `*PointField` + `docValues=true` |
| Date range / sort | `pdate` (`DatePointField`) + `docValues=true` |
| True/false flag | `boolean` (`BoolField`) |

---

## `multiValued`, `copyField`, `omitNorms`

- **`multiValued="true"`** — the field can hold more than one value per document (e.g. multiple `category` tags). Note: a `multiValued` field cannot be sorted on directly, and faceting treats each value independently.
- **`copyField`** — copies a source field's raw value into another field at index time, before that destination's analyzer runs. Two common uses:
  - A **catch-all** `text` field that many fields copy into, so a single default-search field covers everything:
    ```xml
    <field name="text" type="text_general" indexed="true" stored="false" multiValued="true"/>
    <copyField source="title_t"  dest="text"/>
    <copyField source="brand_s"  dest="text"/>
    ```
  - A **string companion** of an analyzed field for faceting/sorting (the dual-field pattern above).
  - The catch-all destination is typically `stored="false"` — it exists only to be searched, never returned.
- **`omitNorms="true"`** — drops length-normalization data. `StrField` omits norms by default. Turn it on for short non-scoring text fields to save heap/disk; leave it off for full-text fields where BM25 length normalization matters.

---

## Concrete example: a product-catalog title + brand

```xml
<!-- Field types -->
<fieldType name="text_en" class="solr.TextField" positionIncrementGap="100">
  <analyzer>
    <tokenizer class="solr.StandardTokenizerFactory"/>
    <filter class="solr.StopFilterFactory" words="lang/stopwords_en.txt" ignoreCase="true"/>
    <filter class="solr.LowerCaseFilterFactory"/>
    <filter class="solr.EnglishPossessiveFilterFactory"/>
    <filter class="solr.KeywordMarkerFilterFactory" protected="protwords.txt"/>
    <filter class="solr.PorterStemFilterFactory"/>
  </analyzer>
</fieldType>

<fieldType name="string" class="solr.StrField" sortMissingLast="true" docValues="true"/>

<!-- Fields -->
<!-- title_t: searchable, English-stemmed full text -->
<field name="title_t" type="text_en" indexed="true" stored="true"/>

<!-- brand_s: exact-match string for filtering, faceting, sorting -->
<field name="brand_s" type="string" indexed="true" stored="true" docValues="true"/>

<!-- catch-all default search field -->
<field name="text" type="text_en" indexed="true" stored="false" multiValued="true"/>
<copyField source="title_t" dest="text"/>
<copyField source="brand_s" dest="text"/>
```

Here `title_t` is full-text (stemmed, tokenized) so `"running shoe"` matches `"Running Shoes"`; `brand_s` is a `string` so `brand_s:"Acme Pro"` facets and sorts as one clean value while still being searchable via the `text` catch-all.
