# Concept Indexing

The concept collection is the **dictionary** the tagger looks up against. This file covers its schema, how it's built, and the BLM-specific case.

## Schema

The concept collection is small and tightly purpose-built. A concept doc is a **(field, token) entry**:

```
{
  "id":     "brand_name_concept_sony",        // unique
  "field":  "brand_name_concept",              // catalog field this concept maps to
  "token":  "sony",                            // the analyzed term
  "weight": 100,                               // term frequency in catalog (or domain weight)
  "lang":   ["en", "all"],                     // multivalued: languages this concept applies to
  "source": "catalog_db"                             // origin (e.g., catalog name, DB name)
}
```

Five core fields:

| Field | Type | Role |
|---|---|---|
| `id` | string, uniqueKey | concat of field+token, ensures uniqueness |
| `field` | string | catalog field name this concept maps back to |
| `token` | text/string analyzed | the actual term to be matched at query time |
| `weight` | int | importance signal (typically term frequency in catalog) |
| `lang` | string multivalued | language codes; "all" matches any |
| `source` | string | which source built this entry; lets multiple sources coexist |

Optionally:
- `tokenId` — the canonical id when the token represents a structured entity (a Brand ID, Model ID)

The `token` field uses the same analyzer chain as the catalog fields it represents — that's how you guarantee the user-typed term, the catalog token, and the concept token all normalize to the same form.

### Schema XML

```xml
<schema name="concepts" version="1.6">
  <uniqueKey>id</uniqueKey>

  <field name="id"     type="string" indexed="true" stored="true" required="true"/>
  <field name="field"  type="string" indexed="true" stored="true" docValues="true"/>
  <field name="token"  type="text_concept" indexed="true" stored="true"/>
  <field name="weight" type="pint"   indexed="true" stored="true" docValues="true"/>
  <field name="lang"   type="string" indexed="true" stored="true" multiValued="true" docValues="true"/>
  <field name="source" type="string" indexed="true" stored="true" docValues="true"/>
  <field name="tokenId" type="string" indexed="true" stored="true" docValues="true"/>

  <fieldType name="text_concept" class="solr.TextField" positionIncrementGap="100">
    <analyzer>
      <tokenizer class="solr.StandardTokenizerFactory"/>
      <filter class="solr.LowerCaseFilterFactory"/>
      <filter class="solr.ASCIIFoldingFilterFactory"/>
    </analyzer>
  </fieldType>
</schema>
```

A few practical notes:
- `token` is analyzed because the same term may have variants (case, accents) that all should match.
- `weight` and `field` and `lang` have docValues for filterCache efficiency.
- The schema is small enough that it's worth keeping it identical across environments — variations create silent inconsistencies.

## Building the concept collection

The concept collection is **derived** from one or more authoritative sources. It's NOT user-edited, NOT manually curated post-build, and NOT synchronized incrementally — it's rebuilt periodically (nightly is typical).

### Pattern: build from catalog

Source = your catalog Solr collection. Walk every `*_concept`, `*_shingle`, `*_text` field; for each distinct term in those fields, create a concept entry pointing back to the field.

A custom request handler (`IndexConceptsHandler`) on the **concept** collection orchestrates this:

```java
public class IndexConceptsHandler extends SearchHandler {
    @Override
    public void handleRequestBody(SolrQueryRequest req, SolrQueryResponse rsp) {
        SolrParams p = req.getParams();
        String sourceCollection = p.required().get("sourceCollection");
        String sourceType       = p.get("sourceType", "semantic");
        boolean clear           = p.getBool("clearCollection", false);

        if (clear) deleteAllDocuments(req.getCore());

        long count = indexConcepts(req, sourceCollection, sourceType);
        rsp.add("count", count);
    }
}
```

Triggered by:
```
POST /solr/concepts/indexConcepts?sourceCollection=catalog&sourceType=semantic&clearCollection=true
```

### How the indexing handler walks the catalog

1. Get all field names from the source collection (`/admin/luke?show=fields`)
2. Filter to fields ending in `_concept`, `_shingle`, `_text`, plus the special `blm_concept_ss` field
3. For each field, walk all its distinct terms via TermsComponent (`/terms` endpoint) in batches of 1000:
   ```
   GET /solr/catalog/terms?terms.fl=brand_name_concept&terms.limit=1000&terms.lower=
   ```
4. For each (field, term, count), generate a SolrInputDocument and add to the concept collection
5. After all fields walked, commit

```java
private void createConcepts(SolrQueryRequest req, UpdateRequestProcessor proc,
                             String fieldName, NamedList<Integer> data, String sourceType) {
    for (int i = 0; i < data.size(); i++) {
        String value = data.getName(i).trim();
        if (value.isEmpty()) continue;

        SolrInputDocument doc = new SolrInputDocument();
        doc.addField("id",     fieldName + "_" + value);
        doc.addField("field",  fieldName);
        doc.addField("token",  value);
        doc.addField("weight", data.getVal(i));
        doc.addField("lang",   List.of("all", detectLangFromFieldName(fieldName).getLang()));
        doc.addField("source", sourceType);

        addSolrDoc(req, proc, doc);
    }
}
```

`weight` here is `data.getVal(i)` — the document frequency for that term in the source field. So a brand that appears in 10,000 products gets weight 10000; an obscure brand in 5 products gets weight 5. This makes common brands rank higher in tag matches, which is usually what you want.

### Field naming convention

Why fields ending in `_concept` / `_shingle` / `_text`?

The convention encodes how the catalog field should be matched:
- `*_concept` — exact match. Each indexed term is one concept (e.g., `brand_name_concept` indexed with full brand name as one token)
- `*_shingle` — multi-token shingles. Useful for partial brand/model matching (e.g., `model_name_shingle` for "WH-1000XM5 Wireless" matching "WH-1000XM5" alone)
- `*_text` — analyzed text, every token a concept (broader match, lower precision)

The tagger doesn't care about the suffix — it indexes them the same way. But downstream code uses the suffix to decide field types/weights when building the staged query. See `06-query-building.md`.

### Avoid: indexing arbitrary text

Do NOT add `description_text` or `notes_text` or anything free-form to the concepts. They contribute high-cardinality, low-signal entries that match noisily.

The concept collection should hold:
- Authoritative names (brand, line, model, category)
- Validated synonyms (curated externally)
- Identifier fields (model numbers, SKUs)
- BLM-decomposed components

Not:
- Free-text description fields
- User-generated content
- Comment threads or reviews

If you index everything, the tagger fires on everything, ambiguity resolution can't distinguish, and quality degrades. Keep it curated.

## BLM-specific indexing

Brand/Line/Model is a special case. The catalog typically has a multi-valued field `blm_concept_ss` holding entries like `2018|SONY|WH-1000XM5|SILVER`. This isn't a single concept — it's four:
- ReleaseYear: 2018
- Brand: SONY
- Model: WH-1000XM5
- Variant: SILVER

The indexing handler decomposes:

```java
private void createBlmConcepts(SolrQueryRequest req, UpdateRequestProcessor proc,
                                NamedList<Integer> data, String sourceType) {
    for (int i = 0; i < data.size(); i++) {
        BrandLineModelField blm = BrandLineModelField.tryParse(data.getName(i));
        if (blm == null) continue;
        int weight = data.getVal(i);

        // ReleaseYear (long form: "2018")
        if (notBlank(blm.year)) {
            addSolrDoc(req, proc, createYearConcept(blm, weight, sourceType));
            // ReleaseYear (short form: "18")
            if (blm.year.length() >= 2) {
                addSolrDoc(req, proc, createYearConceptShort(blm, weight, sourceType));
            }
        }

        // Brand
        if (notBlank(blm.brandNameAnalyzed)) {
            addSolrDoc(req, proc, createBrandConcept(blm, weight, sourceType));
        }

        // Model (full name)
        if (notBlank(blm.modelNameAnalyzed)) {
            addSolrDoc(req, proc, createModelDerivative(blm, weight, sourceType,
                blm.modelNameAnalyzed, "model_name_concept"));

            // Model token-level (for multi-word model names like "WH-1000XM5 Wireless")
            String[] tokens = blm.modelNameAnalyzed.split("\\s");
            if (tokens.length > 1) {
                for (String token : tokens) {
                    addSolrDoc(req, proc, createModelDerivative(blm, weight, sourceType,
                        token, "model_name_text"));
                }
            }

            // Model shingles (for "WH-1000XM5 Wireless" → "WH-1000XM5", "WH-1000XM5 Wireless")
            for (String shingle : generateShingles(List.of(tokens), 5)) {
                addSolrDoc(req, proc, createModelDerivative(blm, weight, sourceType,
                    shingle, "model_name_shingle"));
            }
        }

        // Variant
        if (notBlank(blm.variantId) && notBlank(blm.variantNameAnalyzed)) {
            addSolrDoc(req, proc, createVariantConcept(blm, weight, sourceType));
        }
    }
}
```

Result: from one source entry `2018|SONY|WH-1000XM5|SILVER`, you get up to ~6 concept entries:
- year_dt_concept: "2018"
- year_short_concept: "18"
- brand_name_concept: "sony" (with tokenId=SONY)
- model_name_concept: "wh-1000xm5" (with tokenId=WH-1000XM5)
- model_name_text: "wh-1000xm5"
- variant_name_concept: "silver"

Each carries its `tokenId` so downstream code can validate combinations: a tag with `tokenId=SONY` paired with a tag carrying `tokenId=WH-1000XM5` proves the user mentioned a Sony WH-1000XM5. The `BrandLineModelProcessor` (see `06-query-building.md`) checks these IDs against the canonical product DB.

## Multi-source indexing

The concept collection can hold entries from multiple sources, distinguished by `source`:

| sourceType | Origin | When to use |
|---|---|---|
| `semantic` | Main catalog | Default; user search hits this |
| `catalog_db` | Authoritative product/entity catalog | structured entity recognition (e.g., BLM) |
| `taxonomy` | Authoritative product taxonomy | Category/department naming |
| `synonyms` | Curated synonyms list | Hand-maintained equivalences |

At query time, the tagger filters by `source=` to scope which sources are considered. A user-facing search uses `source=semantic`; an admin tool might use `source=catalog_db` for catalog-only validation.

The lang field (multivalued: `["en", "all"]`) similarly scopes by language.

## Operational concerns

### Rebuild cadence

Daily is typical for catalog-derived. If your catalog updates many times per hour and concepts must be fresh: incremental rebuild is hard (concepts are derived; no clean delta). The pragmatic answer is "rebuild nightly, accept some staleness". Heavy users sometimes maintain dual concept collections and swap aliases.

### Build duration

For a large catalog (10M+ docs, 50+ semantic fields), a full rebuild walks ~5M+ distinct terms. With 1000-batch terms requests and per-doc add cost, expect 30 minutes to 2 hours. Plan accordingly.

### Indexing on a separate Solr cluster

Some teams run concept indexing on a dedicated, lower-traffic Solr cluster, then snapshot/replicate to production. Keeps the build off the production search path. Useful at scale.

### Validation

After every rebuild, sanity-check counts:
- Each `field` has expected entry count (compare to historical)
- No fields with 0 entries (broken source)
- No fields with explosively too many entries (data corruption?)
- BLM count roughly matches expected product count × variants
- All `lang` values are recognized

A mismatch usually indicates source-side data corruption. Catch it before serving traffic.

## Configuration

The handler takes parameters:

| Param | Required | Purpose |
|---|---|---|
| `sourceCollection` | yes | which Solr collection to harvest from |
| `sourceType` | no (default "semantic") | label for the source entries |
| `clearCollection` | no (default false) | delete existing entries first |

Trigger:
```
POST /solr/concepts/indexConcepts?sourceCollection=catalog&sourceType=semantic&clearCollection=true
```

For incremental on top of existing (e.g., adding new source without deleting):
```
POST /solr/concepts/indexConcepts?sourceCollection=products&sourceType=catalog_db&clearCollection=false
```

Register in solrconfig.xml of the concept collection:
```xml
<requestHandler name="/indexConcepts" class="com.example.semantic.IndexConceptsHandler">
  <lst name="defaults">
    <int name="batchSize">1000</int>
  </lst>
</requestHandler>
```
