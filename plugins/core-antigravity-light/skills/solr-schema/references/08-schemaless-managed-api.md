# Schemaless Mode & the Schema REST API (Solr 9.x)

This file covers two ways a schema gets built without hand-editing `managed-schema`: **schemaless mode** (Solr guesses field types from the first document it sees) and the **Schema REST API** (you POST explicit field/type definitions to a running collection). Both rely on the **managed schema** (`ManagedIndexSchemaFactory`, the 9.x default). The two are easy to confuse and have very different production safety profiles: schemaless is a convenience for prototyping that you should turn **off** before production; the Schema API is the safe, deliberate way to evolve a schema programmatically.

For the underlying `indexed`/`stored`/`docValues` decisions these APIs encode, see `03-docvalues-stored-indexed.md`. For field-type selection, see `01-field-types.md`.

---

## Schemaless mode: how the guessing works

"Schemaless" is not a separate Solr mode — it's an **update processor chain** that runs at index time and, when it sees a field it doesn't recognize, **adds a field definition to the managed schema on the fly**. The component that does this is:

```
solr.AddSchemaFieldsUpdateProcessorFactory
```

It sits in an update request processor (URP) chain in `solrconfig.xml`, usually alongside `ParseBooleanFieldUpdateProcessorFactory`, `ParseLongFieldUpdateProcessorFactory`, `ParseDoubleFieldUpdateProcessorFactory`, and `ParseDateFieldUpdateProcessorFactory`. When a document arrives with an unknown field, the parse processors inspect the **string value** and `AddSchemaFields` maps the guessed Java class to a configured Solr field type.

A typical mapping block looks like this:

```xml
<updateProcessor class="solr.AddSchemaFieldsUpdateProcessorFactory" name="add-schema-fields">
  <lst name="typeMapping">
    <str name="valueClass">java.lang.String</str>
    <str name="fieldType">text_general</str>
    <lst name="copyField">
      <str name="dest">*_str</str>
      <int name="maxChars">256</int>
    </lst>
  </lst>
  <lst name="typeMapping">
    <str name="valueClass">java.lang.Boolean</str>
    <str name="fieldType">booleans</str>
  </lst>
  <lst name="typeMapping">
    <str name="valueClass">java.lang.Long</str>
    <str name="valueClass">java.lang.Integer</str>
    <str name="fieldType">plongs</str>
  </lst>
  <lst name="typeMapping">
    <str name="valueClass">java.lang.Number</str>
    <str name="fieldType">pdoubles</str>
  </lst>
</updateProcessor>
```

Note the **`s`** on `booleans`, `plongs`, `pdoubles` — the stock schemaless config maps to **multiValued** field types. That detail is the source of most schemaless pain.

---

## Why schemaless is dangerous in production

Schemaless optimizes for "index anything, ask no questions." That convenience produces several traps:

1. **Wrong type from a misleading first value.** Guessing keys off the **first** document's string value. A ZIP/postal code `"01001"` parses as a `Long` and the field is created numeric — the leading zero is gone and `"00420"` no longer matches. A SKU `"123456"` becomes numeric and loses prefix/wildcard search. A field that is *sometimes* `"12"` and *sometimes* `"12A"` flips type depending on document order.

2. **`multiValued=true` by default.** The stock type mappings point at multiValued types (`strings`, `plongs`, …). Once a field is created multiValued you **cannot** sort on it normally, and some function/grouping operations behave differently. You wanted a single-valued `price`; you got a multiValued one.

3. **`string` / `text_general` catch-all.** Anything that doesn't parse as a number/boolean/date becomes `text_general` (full-text, tokenized) **plus** a `*_str` copy. You rarely want full-text analysis on an identifier, and you pay for the extra copyField you never asked for.

4. **Type lock-in after the first doc is indexed.** Once a field exists and documents are indexed against it, you **cannot freely change its type** — the existing Lucene segments were written with the old type's encoding. Fixing a bad guess means changing the schema **and reindexing** (see below). Schemaless gives you the wrong type silently and then makes it expensive to undo.

5. **Schema drift / non-reproducibility.** The schema becomes a side effect of whatever data happened to arrive first, in whatever order. Two environments fed slightly different sample data end up with **different schemas** — impossible to review in version control.

**Recommendation:** Use schemaless only for **prototyping / exploring unknown data**. Before production, **turn it off** and pin an explicit schema. Disable it by removing `AddSchemaFieldsUpdateProcessorFactory` from the active update chain (or pointing the collection at a chain without it) in `solrconfig.xml`. Define every field deliberately — by editing `managed-schema` or via the Schema REST API below — so the schema is reviewable and reproducible.

---

## The Schema REST API: deliberate, programmatic schema changes

The Schema API lets you **read and modify** the schema of a running collection over HTTP, without restarting Solr and without editing files by hand. This is the right tool for automated provisioning and CI: changes are explicit, ordered, and scriptable.

**Prerequisite:** the collection must use a **managed schema**, i.e. `ManagedIndexSchemaFactory` is the active `schemaFactory` in `solrconfig.xml`. This is the **Solr 9.x default**. If the config instead uses `ClassicIndexSchemaFactory` (hand-edited `schema.xml`), the Schema API is **read-only** and write commands return an error. Convert with `bin/solr config ... -property schema.factory=ManagedIndexSchemaFactory` or by adjusting `solrconfig.xml`. (See `05-solrconfig-review.md` for `schemaFactory`.)

### Write commands

All writes are a single **POST** of JSON to `/solr/<collection>/schema`. The JSON keys name the operation:

| Command | Purpose |
|---|---|
| `add-field` | Add a new explicit field |
| `replace-field` | Redefine an existing field (full replacement — you must restate all attributes) |
| `delete-field` | Remove a field |
| `add-field-type` | Add a new `fieldType` (analyzer chain, class, params) |
| `replace-field-type` / `delete-field-type` | Redefine / remove a field type |
| `add-dynamic-field` | Add a dynamic field rule (e.g. `*_s`) |
| `add-copy-field` | Add a `copyField` source→dest rule |

A value can be a single object or an **array** of objects to add several in one request. Multiple different commands can be combined in one POST body; Solr applies them in order.

### Concrete example — add `brand_s` as a docValues string

```bash
curl -X POST -H 'Content-type: application/json' \
  http://localhost:8983/solr/products/schema \
  --data-binary '{
    "add-field": {
      "name": "brand_s",
      "type": "string",
      "indexed": true,
      "stored": true,
      "docValues": true,
      "multiValued": false
    }
  }'
```

This creates an exact-match, facet/sort-ready `brand_s` (`docValues=true` for faceting and sorting — see `03-docvalues-stored-indexed.md`), explicitly single-valued so it does **not** inherit the multiValued surprise schemaless would have handed you.

### Adding a field type, then a field of that type, plus a copyField

You can stage related changes in one ordered POST:

```bash
curl -X POST -H 'Content-type: application/json' \
  http://localhost:8983/solr/products/schema \
  --data-binary '{
    "add-field-type": {
      "name": "text_title",
      "class": "solr.TextField",
      "positionIncrementGap": "100",
      "analyzer": {
        "tokenizer": { "class": "solr.StandardTokenizerFactory" },
        "filters": [ { "class": "solr.LowerCaseFilterFactory" } ]
      }
    },
    "add-field": { "name": "title_t", "type": "text_title", "indexed": true, "stored": true },
    "add-copy-field": { "source": "title_t", "dest": "text" }
  }'
```

`add-dynamic-field` follows the same shape, with `name` as a glob pattern:

```json
{ "add-dynamic-field": { "name": "*_dt", "type": "pdate", "indexed": true, "docValues": true, "stored": true } }
```

### Reading the schema

Reads are plain **GET** requests and work regardless of `schemaFactory`:

```
GET /solr/products/schema                 # whole schema as JSON
GET /solr/products/schema/fields          # all fields
GET /solr/products/schema/fields/brand_s  # one field
GET /solr/products/schema/fieldtypes      # all field types
GET /solr/products/schema/copyfields      # copyField rules
```

See `07-live-inspection.md` for using these endpoints to audit a running instance.

---

## Changing a field type on existing data: the reindex rule

This is the single most important caveat for both schemaless fixes and Schema API edits:

> **Changing a field's type (or any indexing-time attribute — `indexed`, `docValues`, `multiValued`, the analyzer chain) does NOT rewrite already-indexed documents.** The change applies only to documents indexed **after** the change. Existing segments still hold data encoded under the old definition, so the collection is now in a mixed, inconsistent state. To make the change real for all data you **must reindex** — re-feed every document through the updated schema (typically into a fresh collection, then swap an alias).

Why a reindex is unavoidable: a `string`→`text_general` change alters tokenization; a non-docValues→docValues change adds a columnar structure that the old segments never wrote; `pint`→`plong` changes the on-disk numeric encoding. Solr cannot retroactively reconstruct these from existing segments. `replace-field` happily accepts the new definition over the API, but **the API call alone does not migrate data** — without a reindex you get silent wrong/zero results on the old documents.

Practical pattern: create a **new collection** with the corrected schema, reindex the full dataset into it, then repoint the alias (or use the Collections API reindex / `reindexcollection`). Do **not** assume an in-place `replace-field` "fixed" anything until every old document has been re-fed.

Attributes that are **query-time-only** (e.g. `stored` for display, or some `useDocValuesAsStored` cases) may not require a full reindex, but anything touching analysis or the indexed/docValues structure does. When in doubt: reindex.

---

## Quick decision summary

- **Prototyping unknown data?** Schemaless (`AddSchemaFieldsUpdateProcessorFactory`) is fine — but treat its guesses as throwaway.
- **Going to production?** Turn schemaless **off**; define fields explicitly. Pin types so leading zeros, identifiers, and single-valued numerics survive.
- **Need programmatic/automated schema setup?** Use the **Schema REST API** (POST JSON to `/solr/<c>/schema`) — requires `ManagedIndexSchemaFactory` (9.x default).
- **Changing a field type on a collection that already has data?** Update the schema **and reindex**. The API call alone never migrates existing documents.
