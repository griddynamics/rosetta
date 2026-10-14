# Synonyms: SynonymGraphFilter, Index-vs-Query Placement, and synonyms.txt (Solr 9.x)

This file covers synonym strategy at the schema layer: which filter factory to use, where in the analyzer chain to place it, the `synonyms.txt` rule formats, and the managed REST API. For query-side relevance effects (`mm`, phrase, `qf`) see the **solr-query** skill; for the tagger's angle on synonyms (lookup via `SynonymsStorage`) see the **solr-semantic-search** skill. Examples here are vendor-neutral product-catalog terms.

---

## Use `SynonymGraphFilterFactory`, not `SynonymFilterFactory`

`solr.SynonymFilterFactory` is **deprecated**. It cannot emit a correct token graph for multi-word synonyms (e.g. `flat screen` ⇄ `flat panel`) — it produces overlapping tokens that silently corrupt phrase and span queries. Use `solr.SynonymGraphFilterFactory` for every new schema.

The catch: a token graph is fine for the **query** analyzer (Lucene consumes the graph at search time), but the **index** does not store graphs — postings are a flat token stream. So at **index time** you must flatten the graph with `solr.FlattenGraphFilterFactory` placed **immediately after** the synonym filter.

```xml
<fieldType name="text_syn" class="solr.TextField" positionIncrementGap="100">
  <analyzer type="index">
    <tokenizer class="solr.StandardTokenizerFactory"/>
    <filter class="solr.SynonymGraphFilterFactory"
            synonyms="synonyms.txt" expand="true" ignoreCase="true"/>
    <filter class="solr.FlattenGraphFilterFactory"/>   <!-- INDEX ONLY -->
    <filter class="solr.LowerCaseFilterFactory"/>
  </analyzer>
  <analyzer type="query">
    <tokenizer class="solr.StandardTokenizerFactory"/>
    <filter class="solr.SynonymGraphFilterFactory"
            synonyms="synonyms.txt" expand="true" ignoreCase="true"/>
    <!-- NO FlattenGraphFilter here -->
    <filter class="solr.LowerCaseFilterFactory"/>
  </analyzer>
</fieldType>
```

Rules:

- `FlattenGraphFilterFactory` belongs **only** on the index analyzer, **only** when `SynonymGraphFilterFactory` is also on the index analyzer.
- Never add `FlattenGraphFilter` to the query analyzer — it would re-corrupt the graph you just built.
- Putting `LowerCaseFilterFactory` **after** the synonym filter lets you keep `ignoreCase="true"` and still match mixed-case `synonyms.txt` entries; many shops instead lowercase consistently on both sides.

---

## Index-time vs query-time placement

You generally choose **one** side to apply synonyms, not both (applying on both double-expands and inflates the index or the query needlessly).

### Index-time synonyms (recommended default)

Expand on the index analyzer, leave the query analyzer plain.

- **Pro:** the multi-word graph problem disappears — by query time everything is already flat tokens in the index, so `mm`, phrase queries, and `sow` behave normally.
- **Pro:** query latency is unaffected.
- **Con:** changing `synonyms.txt` requires **reindexing** the whole collection.
- **Con:** larger index; IDF is skewed because synonym variants inflate term frequencies.

### Query-time synonyms

Expand on the query analyzer, leave the index plain.

- **Pro:** edit `synonyms.txt`, reload the core, done — no reindex.
- **Con:** multi-word synonyms produce a **token graph at query time** that breaks `mm` counting and phrase construction (see next section).

**Rule of thumb:** if your synonyms are stable and you care about phrase/`mm` correctness, do **index-time** expansion. Use query-time only for single-word synonyms or when you must hot-edit without reindexing.

---

## Why query-time multi-word synonyms are problematic

When a query-time synonym rule maps a multi-word phrase (e.g. `tv, television, telly` where one alternative is multi-word, or `flat screen => flat panel`), `SynonymGraphFilterFactory` emits a **token graph** — parallel paths of differing token counts at the same position. Several query-builder assumptions then break:

1. **`mm` (min-should-match) miscounts.** `mm` counts query clauses; a graph injects extra positions/clauses so a `mm=100%` or `mm=2<-1` formula no longer means what you intended, and recall silently shifts.
2. **Phrase queries fragment.** A multi-word alternative can't be slotted cleanly into a single `PhraseQuery`; you get a `GraphQuery`/span construct whose behavior differs from a plain phrase, sometimes missing exact-phrase matches.
3. **`sow` (split-on-whitespace) interacts.** eDisMax/standard parsers default to `sow=false` so the analyzer sees the whole multi-term query and can apply multi-word synonyms — but that same setting changes how each `qf` field is queried. If `sow=true`, multi-word synonyms never fire at all (each whitespace token is analyzed separately).
4. **`autoGeneratePhraseQueries`** on the field type changes whether adjacent graph tokens become an implicit phrase. Leaving it `false` (the default) is usually safest; setting it `true` with query-time graphs can produce surprising phrase requirements.

The clean fix is to move the multi-word expansion to **index time** (with `FlattenGraphFilter`), where none of `mm`/phrase/`sow` are involved. Keep query-time synonyms restricted to single-word equivalences if you need hot-editing.

---

## `synonyms.txt` format

Lives in the collection's config (`conf/synonyms.txt`). `#` starts a comment; blank lines are ignored. Two rule forms:

### Explicit equivalence (two-way) — `a,b,c`

Comma-separated terms are all mutually equivalent. With `expand="true"`, any one of them expands to all of them.

```
# product-catalog equivalences
tv, television, telly
sofa, couch, settee
laptop, notebook computer
```

Note `notebook computer` is a multi-word entry — that's exactly what triggers the graph (handle it at index time).

### Directional (one-way) — `a => b`

The left-hand side is **replaced by** the right-hand side; the LHS token is dropped unless you re-list it on the RHS.

```
# normalize misspelling, drop the bad token
fridge => refrigerator

# expand an abbreviation to BOTH forms (keep LHS by repeating it)
tv => tv, television
```

`=>` rules are unaffected by the `expand` attribute (direction is explicit).

### Attributes

| Attribute | Meaning |
|---|---|
| `synonyms` | Path to the file (`synonyms.txt`) relative to the config set, or a managed resource name. |
| `expand` | `true`: comma rules expand each term to all terms. `false`: comma rules collapse all terms to the **first** term only. Ignored by `=>` rules. |
| `ignoreCase` | `true`: match rule terms case-insensitively. Pair with a `LowerCaseFilter` placed after, or lowercase consistently. |
| `tokenizerFactory` | Tokenizer used to **parse the rule terms in the file** (not the field). Set it to match your field's tokenizer so multi-word entries split the same way the field does. |
| `format` | Defaults to `solr`; `wordnet` for WordNet-format files (rare). |

`tokenizerFactory` matters when synonym entries contain punctuation or non-default splitting — if the file is parsed with `StandardTokenizer` but your field uses `WhitespaceTokenizer`, a multi-word entry can tokenize inconsistently and never match.

---

## Managed synonyms via the REST API

If you want to edit synonyms over HTTP instead of editing `synonyms.txt` and reloading, use a **managed** synonym filter. This requires `ManagedIndexSchemaFactory` (the managed schema) in `solrconfig.xml` — the default in modern Solr config sets:

```xml
<schemaFactory class="ManagedIndexSchemaFactory">
  <bool name="mutable">true</bool>
  <str name="managedSchemaResourceName">managed-schema</str>
</schemaFactory>
```

Declare the filter as **managed** and give it a resource handle:

```xml
<filter class="solr.ManagedSynonymGraphFilterFactory" managed="product_synonyms"/>
```

This exposes a REST endpoint under the field type's managed resource:

```bash
# View the managed synonym set
curl http://localhost:8983/solr/catalog/schema/analysis/synonyms/product_synonyms

# Add a two-way equivalence (JSON body)
curl -X PUT -H 'Content-Type: application/json' \
  http://localhost:8983/solr/catalog/schema/analysis/synonyms/product_synonyms \
  --data '{"tv":["tv","television","telly"]}'

# Add a directional mapping
curl -X PUT -H 'Content-Type: application/json' \
  http://localhost:8983/solr/catalog/schema/analysis/synonyms/product_synonyms \
  --data '{"fridge":["refrigerator"]}'
```

Notes:

- Use `ManagedSynonymGraphFilterFactory` (graph-aware), not the older `ManagedSynonymFilterFactory`.
- After a PUT, **reload the collection** for the change to take effect on analysis; the managed resource is persisted in ZooKeeper (SolrCloud) or on disk (standalone).
- The index-vs-query and reindex caveats above still apply — managed only changes *how you edit* the rules, not *when expansion happens*.

---

## Quick decision summary

- **New schema?** `SynonymGraphFilterFactory`; add `FlattenGraphFilterFactory` after it on the **index** analyzer only.
- **Multi-word synonyms + care about phrase/`mm`?** Expand at **index time**; accept reindex-on-change.
- **Single-word only, need hot edits?** Query-time is fine.
- **Want to edit over HTTP?** `ManagedSynonymGraphFilterFactory` + `ManagedIndexSchemaFactory`.
- **Two-way?** `a, b, c`. **One-way?** `a => b` (repeat `a` on the right to keep it).
