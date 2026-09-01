# Applying to a New Domain

This file is the practical "how do I bootstrap this architecture for my own domain" guide. The architecture is generic — but applying it requires several non-trivial decisions about your data and concepts.

## When this architecture is right for you

Before investing the work, validate fit. Good fit signals:

- **Curated taxonomies exist**: you have authoritative sources (catalog, brand DB, product DB, product taxonomy) you can derive concepts from
- **Domain has named entities**: products with brand names, models, technical attributes — not free text
- **Precision matters more than recall**: you'd rather miss results than show wrong ones
- **Multi-language support needed**: dictionary approach handles per-language analyzers cleanly
- **Concept synonyms are stable**: brand abbreviations, model nicknames change rarely

Bad fit signals:

- **Free-text domain**: blog posts, user reviews, FAQ content — concepts can't be enumerated
- **High vocabulary churn**: new concepts appear daily, can't keep dictionary current
- **Low-cardinality search**: simple keyword search works fine; semantic adds cost without benefit
- **No authoritative source**: concepts come from user-generated tags, not curated catalogs

If you're on the bad-fit side, consider vector/embedding approaches instead (USE SKILL `solr-query` to apply kNN/vector search).

## Prerequisites

Before bootstrapping, ensure you have:

1. **A Solr 9.x cluster** (standalone or SolrCloud)
2. **A catalog collection**: your existing search index, with documents you want to search
3. **Source data identified**: which catalog fields hold the concepts? Brand, model, category, attributes?
4. **A canonical-id system**: brands have IDs, products have SKUs, etc. Concepts will reference these.
5. **An analyzer chain**: how do you tokenize/normalize text in your domain?

## Bootstrap checklist

The order matters; some steps depend on others.

### Step 1: schema design

Add a `concepts` collection alongside your `catalog`. Schema for concepts as in `02-concept-indexing.md`:

```xml
<schema name="concepts" version="1.6">
  <uniqueKey>id</uniqueKey>
  <field name="id"      type="string" indexed="true" stored="true" required="true"/>
  <field name="field"   type="string" indexed="true" stored="true" docValues="true"/>
  <field name="token"   type="text_concept" indexed="true" stored="true"/>
  <field name="weight"  type="pint" indexed="true" stored="true" docValues="true"/>
  <field name="lang"    type="string" indexed="true" stored="true" multiValued="true" docValues="true"/>
  <field name="source"  type="string" indexed="true" stored="true" docValues="true"/>
  <field name="tokenId" type="string" indexed="true" stored="true" docValues="true"/>
  <fieldType name="text_concept" class="solr.TextField">
    <analyzer>
      <tokenizer class="solr.StandardTokenizerFactory"/>
      <filter class="solr.LowerCaseFilterFactory"/>
      <filter class="solr.ASCIIFoldingFilterFactory"/>
    </analyzer>
  </fieldType>
</schema>
```

### Step 2: identify concept-bearing fields in catalog

Audit your catalog schema. Which fields hold concepts? Use the suffix convention:

- `*_concept` — single-token concepts: brand_name_concept, category_concept
- `*_shingle` — multi-token concepts via shingles: model_name_shingle (for "WH-1000XM5 Wireless")
- `*_text` — looser, token-by-token: description_text (use sparingly)

Add these fields to your catalog schema if they don't exist. Populate them at indexing time:

```xml
<field name="brand_name_concept" type="text_concept" indexed="true" stored="true"/>
<field name="model_name_concept" type="text_concept" indexed="true" stored="true"/>
<field name="model_name_shingle" type="text_shingle" indexed="true" stored="true"/>
<field name="category_concept"   type="text_concept" indexed="true" stored="true"/>
```

The text_concept analyzer should match the concept collection's. The shingle analyzer adds a ShingleFilter for multi-token coverage.

### Step 3: deploy the IndexConceptsHandler

Build the this `IndexConceptsHandler` (or similar) and register on the concepts collection:

```xml
<requestHandler name="/indexConcepts" class="com.example.semantic.IndexConceptsHandler">
  <lst name="defaults">
    <int name="batchSize">1000</int>
  </lst>
</requestHandler>
```

Test:
```bash
curl -X POST 'http://localhost:8983/solr/concepts/indexConcepts?sourceCollection=catalog&sourceType=semantic&clearCollection=true'
```

You should get a count back. Spot-check the collection:
```bash
curl 'http://localhost:8983/solr/concepts/select?q=field:brand_name_concept+AND+token:nike'
```

If your `nike` brand is in catalog and the field is `brand_name_concept`, this should return a doc.

### Step 4: deploy the TagHandler

Build TagHandler. Register on the concepts collection:

```xml
<requestHandler name="/semanticTagGraph" class="com.example.semantic.TagHandler">
  <lst name="defaults">
    <int name="maxShingleLength">4</int>
    <int name="maxTag">50</int>
  </lst>
</requestHandler>
```

Configure stages via a config file (`stages.json` in the conf/ dir). A realistic 4-stage configuration for an e-commerce catalog:

```json
{
  "stages": [
    {
      "name": "Identifier search",
      "cutoff": 1,
      "max_shingle_length": 5,
      "shingle_power": 2,
      "mm": "100%",
      "prefix": false,
      "spell_corrected": false,
      "fields": [
        { "name": "item_id",          "boost": 100, "type": "concept", "mandatory": true, "full_phrase_match": true },
        { "name": "sku_id",           "boost": 100, "type": "concept", "mandatory": true },
        { "name": "manufacturer_pn",  "boost": 100, "type": "concept", "mandatory": true,
          "do_not_overlap_with": ["category_name:concept", "product_group_name:concept"] }
      ]
    },
    {
      "name": "Exact Match",
      "cutoff": 1,
      "max_shingle_length": 5,
      "shingle_power": 2,
      "mm": "100%",
      "prefix": false,
      "search_phrase_spell_correction": true,
      "dominant_language_threshold": 0.8,
      "dyn_fields": [
        { "regexp": "attr_search_.*", "boost": 80, "type": "concept" }
      ],
      "fields": [
        { "name": "sku_id",                  "boost": 100, "type": "concept", "mandatory": true },
        { "name": "manufacturer_pn",         "boost": 100, "type": "concept", "mandatory": true },
        { "name": "product_title",           "boost": 100, "type": "concept", "mandatory": true },
        { "name": "product_title_es",        "boost": 100, "type": "concept", "mandatory": true },

        { "name": "product_group_name",      "boost": 100, "type": "concept", "mandatory": true },
        { "name": "product_group_name_es",   "boost": 100, "type": "concept", "mandatory": true },
        { "name": "category_name",           "boost":  90, "type": "concept", "mandatory": true },
        { "name": "category_name_es",        "boost":  90, "type": "concept", "mandatory": true },

        { "name": "brand_name",              "boost": 100, "type": "concept", "mandatory": true },
        { "name": "brand_name_es",           "boost": 100, "type": "concept", "mandatory": true },
        { "name": "sub_brand_name",          "boost":  80, "type": "concept", "mandatory": true,
          "depends_on": ["brand_name:concept"] },
        { "name": "sub_brand_name_es",       "boost":  80, "type": "concept", "mandatory": true,
          "depends_on": ["brand_name_es:concept"] },

        { "name": "position_name",           "boost":  80, "type": "concept", "mandatory": true,
          "depends_on": ["product_group_name:concept"] },
        { "name": "position_name_es",        "boost":  80, "type": "concept", "mandatory": true,
          "depends_on": ["product_group_name_es:concept"] }
      ]
    },
    {
      "name": "Incomplete Match",
      "cutoff": 1,
      "max_shingle_length": 5,
      "shingle_power": 2,
      "mm": "70%",
      "prefix": true,
      "search_phrase_spell_correction": true,
      "dominant_language_threshold": 0.8,
      "ambiguity_resolver": ["SHINGLES_OVERLAPS", "PATH"],
      "dyn_fields": [
        { "regexp": "attr_search_.*", "boost": 80, "type": "concept" }
      ],
      "fields": [
        { "name": "sku_id",                  "boost": 100, "type": "concept", "mandatory": false },
        { "name": "manufacturer_pn",         "boost": 100, "type": "concept", "mandatory": false },

        { "name": "brand_name",              "boost": 100, "type": "concept", "mandatory": false },
        { "name": "brand_name",              "boost":  80, "type": "shingle", "mandatory": false },
        { "name": "brand_name_es",           "boost": 100, "type": "concept", "mandatory": false },
        { "name": "brand_name_es",           "boost":  80, "type": "shingle", "mandatory": false },

        { "name": "product_title",           "boost": 100, "type": "concept", "mandatory": false },
        { "name": "product_title_es",        "boost": 100, "type": "concept", "mandatory": false },

        { "name": "category_name",           "boost": 100, "type": "concept", "mandatory": false },
        { "name": "category_name",           "boost":  80, "type": "shingle", "mandatory": false },
        { "name": "category_name",           "boost":  40, "type": "text",    "mandatory": false },

        { "name": "position_name",           "boost":  80, "type": "concept", "mandatory": false }
      ]
    },
    {
      "name": "Partial Match 30",
      "cutoff": 1,
      "max_shingle_length": 5,
      "shingle_power": 2,
      "mm": "30%",
      "prefix": true,
      "search_phrase_spell_correction": true,
      "after_spell_correction": true,
      "dominant_language_threshold": 0.8,
      "ambiguity_resolver": ["SHINGLES_OVERLAPS", "PATH"],
      "fields": [
        { "name": "brand_name",              "boost": 100, "type": "concept", "mandatory": false },
        { "name": "brand_name",              "boost":  80, "type": "shingle", "mandatory": false },
        { "name": "category_name",           "boost": 100, "type": "concept", "mandatory": false },
        { "name": "category_name",           "boost":  80, "type": "shingle", "mandatory": false },
        { "name": "category_name",           "boost":  40, "type": "text",    "mandatory": false },
        { "name": "product_title",           "boost": 100, "type": "concept", "mandatory": false },
        { "name": "position_name",           "boost":  80, "type": "concept", "mandatory": false },
        { "name": "position_name",           "boost":  60, "type": "shingle", "mandatory": false },
        { "name": "position_name",           "boost":  40, "type": "text",    "mandatory": false }
      ]
    }
  ],
  "textFieldsNotAllowedInBlm": [
    { "regexp": "position_name_.*" },
    { "regexp": "product_group_name_.*" },
    { "regexp": "category_name_.*" }
  ],
  "alphaNumericFieldsNotAllowedInBlm": [
    { "regexp": "attr_search_.*" },
    { "regexp": "manufacturer_pn_concept" }
  ],
  "universalComprehensionFields": [
    "product_group_name_concept",
    "product_group_name_es_concept"
  ],
  "spell_edits": "1<0 5<1"
}
```

### How to read this config

**Stage ordering and `cutoff`.** Stages run in order. `cutoff: 1` means "if this stage produces ≥1 hit against the catalog, accept its results and skip later stages." So the orchestrator tries strict (Identifier → Exact Match) before relaxing (Incomplete Match at mm=70%, Partial Match 30 at mm=30%).

**`mm` per stage.** Stage 1+2 require all tokens to match (`100%`). Stage 3 allows 30% of tokens to be unmatched (`mm=70%`). Stage 4 only requires 30% match. Each stage trades precision for recall.

**`type: concept | shingle | text`** picks the catalog field naming convention:
- `type: concept` → indexed via `solr.TaggerRequestHandler`-friendly analyzer; exact tag matches
- `type: shingle` → catalog field `<name>_shingle` for multi-token sub-matches
- `type: text` → catalog field `<name>_text` for tokenized full-text match (lowest precision)

**`mandatory: true`** on early stages — every recognized tag becomes a MUST clause. If the tagger produces a brand tag, the doc must contain that brand. On stage 3-4, `mandatory: false` means tags are SHOULD with mm controlling how many must fire.

**`depends_on`** — see `06-query-building.md`. A clause for `sub_brand_name` only fires when there's also a `brand_name` clause in the same path; alone, sub-brand is too vague.

**`do_not_overlap_with`** — additional disambiguation hint. The first stage's `manufacturer_pn` MUST NOT overlap (in tag positions) with `category_name:concept` or `product_group_name:concept`. Without this, a part-number-like string that's also part of a category name would generate competing tags from two different stages and confuse the result. The hint says "if the same span tags both as PN and as category name, drop the PN tag in this stage."

**`dyn_fields`** with `regexp` — instead of listing 50 attribute fields explicitly, match by pattern. `attr_search_.*` covers `attr_search_color`, `attr_search_size`, `attr_search_voltage`, etc. — any catalog field starting with `attr_search_` becomes eligible at boost 80.

**`full_phrase_match: true`** on `item_id` (Stage 1) — see `06-query-building.md` "Full-phrase constraint". This field only matches when the entire user phrase matches it exactly. If user types "12345 ear pads" and 12345 is an item_id, this field does NOT fire (because there's also "ear pads" — not full phrase). Prevents item_id from leaking into broader product searches.

**`shingle_power: 2`** controls the boost-per-shingle-length curve. With `pow = 2 ^ (offset - 1)`, a 2-token shingle weighs 2× a single-token; 3-token weighs 4×; up to `max_shingle_length=5` (16×). Biases the tagger toward longer matches.

**`spell_edits: "1<0 5<1"`** — formula in eDisMax-mm style. "If shingle is 1 char, allow 0 spelling edits; if shingle is 5+ chars, allow 1 edit." Prevents short typos from over-matching ("a" → fuzzy match to "i").

**`textFieldsNotAllowedInBlm` / `alphaNumericFieldsNotAllowedInBlm`** — domain rules. When the user's phrase is recognized as a BLM (Brand/Line/Model — see `06-query-building.md`), some fields shouldn't fire. Position names (`position_name_*`) only make sense paired with a product category; firing them on a product-only query is noise. The `alphanumeric` list is similar but for fields whose values are alphanumeric IDs (e.g., SKUs) — they must not match generic tokens within a BLM phrase.

**`universalComprehensionFields`** — the inverse: fields that ALWAYS fire even in BLM-only queries. `product_group_name_concept` is broad enough that user typing "sony wh-1000xm5 ear" should fire `product_group_name:headphones` even though the phrase is mostly BLM.

### Why the field naming convention matters

The catalog must have fields named consistently with what stage config references:

| Config reference | Catalog field name expected |
|---|---|
| `{"name": "brand_name", "type": "concept"}` | `brand_name_concept` |
| `{"name": "brand_name", "type": "shingle"}` | `brand_name_shingle` |
| `{"name": "brand_name", "type": "text"}` | `brand_name_text` |

The query builder concatenates `name + "_" + type` to derive the actual catalog field. This convention is what lets one stage config drive both concept lookup (in the concept collection — see `02-concept-indexing.md`) and final query construction (against the catalog).

### Per-field similarity reminder

For the tag-style fields (`*_concept`, `*_shingle`), use `solr.BooleanSimilarityFactory` per fieldType in the catalog schema. The boosts in the config above (100, 80, 60, 40) are intended to BE the score contribution of a clause, not "boost adjusted by BM25 corpus statistics." USE SKILL `solr-query` to apply relevancy tuning — it carries the BooleanSimilarity discussion.

For free-text fields (`*_text`, `description_text`), keep `solr.BM25SimilarityFactory` — IDF helps there.

The `StagesConfigProvider` loads this on handler init. See your custom plugin code.

Test the tagger directly:
```bash
curl 'http://localhost:8983/solr/concepts/semanticTagGraph?q=nike+running+shoes&lang=en&debug=true&dot=true'
```

Look at the response. You should see tags for "nike" (brand), "running" (probably category or attribute), "shoes" (category). The DOT visualization shows the graph.

### Step 5: deploy the SemanticSearchHandler

This is the entry point for actual searches. It runs on the **catalog collection**, not concepts:

```xml
<requestHandler name="/semanticSelect" class="com.example.semantic.SemanticSearchHandler">
  <lst name="defaults">
    <str name="conceptsCollection">concepts</str>
    <str name="defType">edismax</str>
  </lst>
</requestHandler>
```

The handler:
1. Receives user `q`
2. Calls `concepts/semanticTagGraph` (internally) to get tags
3. Runs ambiguity resolution + path finding
4. Builds Sm queries per stage; converts to Solr queries
5. Executes the best stage's query against the catalog
6. Returns results

Test:
```bash
curl 'http://localhost:8983/solr/catalog/semanticSelect?q=nike+running+shoes'
```

You should get catalog results. With `debug=true`, the response includes which stage fired and the underlying Lucene query.

### Step 6: tune

This is the iterative part. Common tuning loops:

**Symptom: noisy results (too many false positives)**
- Lower the field boost for low-precision fields (description_text)
- Raise minPatternScore for first stage
- Add stricter ambiguity resolvers
- Mark high-precision fields as `mandatory=true` so they always become MUST

**Symptom: low recall (no results for valid queries)**
- Add a fuzzy-enabled stage at the end (lowest priority)
- Lower minShouldMatch in fallback stages
- Add synonyms for known abbreviations/terms users actually type
- Check tagger isn't dropping valid concepts (use `dot=true`)

**Symptom: wrong field matched**
- Boost the correct field higher in stage config
- Add the wrong field to a higher-precision stage that requires more context

**Symptom: latency too high**
- Reduce `maxShingleLength`
- Reduce stage count
- Enable filterCache on lang/source filters
- Profile per-stage cost; some stages may be near-redundant

## Synonyms

Add a `SynonymsStorage` source. The pragmatic choice is to **reuse Solr's standard `synonyms.txt` format** (the one consumed by `solr.SynonymGraphFilterFactory`) — that way one file feeds both the tagger and any standard analyzer chain in your schema, and you don't fork the format.

The Solr synonyms format supports two kinds of rules.

### Two-way (equivalent / "expand") synonyms

Comma-separated tokens on one line. All terms become equivalent — matching any one of them produces ALL of them at the same position:

```
# Two-way: all terms are mutually equivalent
bose, bse, the boss
sony, sony electronics
ear pads, ear pad set, ear cushions
anc, active noise cancelling, noise cancellation
```

User types "bse" → tagger also fires for "bose" and "the boss" (3 alternative tags at the same span).

This is the safest and most common form. Use unless you specifically need asymmetry.

### One-way (explicit / "reduce") synonyms

Use `=>` to map a left-hand side to a right-hand side. The original LHS token is **dropped** unless also listed on the right:

```
# One-way: LHS is replaced by RHS
teh => the
sny => sony
huge, ginormous, humungous => large
ear pad => ear pads
```

User types "teh" → tagger sees only "the" (typo correction).
User types "humungous" → tagger sees only "large" (canonicalization).

Common uses:
- **Typo / spelling corrections**: `teh => the`, `sny => sony` (one-way; you don't want the misspelling firing as a tag itself)
- **Canonicalization**: `colour, color => color` (collapse spelling variants to one canonical)
- **Brand abbreviation expansion**: `jbl => harman` (only when "jbl" should NOT itself be tagged, just "harman")
- **Unit normalization**: `hr => hour`, `mw => milliwatt`

If you DO want both LHS and RHS to remain searchable, include LHS on the right too: `jbl => jbl, harman` (or just use two-way `jbl, harman`).

### Multi-word synonyms

Tokens with spaces are multi-word entries. They work identically in both rule types — but how they get matched depends on where the synonyms file is consumed:

- **In `solr.SynonymGraphFilterFactory`** (analyzer chain) — multi-word synonyms produce graph token streams. Required: `solr.FlattenGraphFilterFactory` after the SynonymGraphFilter on the index analyzer (not the query analyzer).
- **In your custom `SynonymsStorage`** (the tagger's lookup, see `03-tagging.md`) — multi-word synonyms create graph edges spanning multiple positions. The graph layer represents them via **quasi-positions** (negative-id intermediate vertices — see `04-graph-paths.md`).

In standard Solr, multi-word synonyms are best applied at **index time** with `SynonymGraphFilter` followed by `FlattenGraphFilter` — FlattenGraph flattens the token graph and corrects the position lengths, so this is the recommended default and sidesteps the query-time graph problems (broken `mm`/phrase counting, `sow` interactions). Query-time multi-word synonyms are the fragile path. In the custom tagger, both index-time and query-time work because the tagger explicitly handles multi-position spans. USE SKILL `solr-schema` to apply synonyms — it carries the full treatment.

### File format details

- One rule per line
- Lines starting with `#` are comments; blank lines are ignored
- Whitespace around `,` and `=>` is trimmed (so `a , b => c, d` works)
- Encoding is UTF-8
- The default parser is `solr` (the format described above); `wordnet` is also supported for files in the WordNet `prolog` format
- Files can be referenced as a comma-separated list of paths in the filter config

### Loading and reloading

`SynonymsStorage` loads `synonyms.txt` once at TagHandler `inform(SolrCore)` and indexes every token (and every left-hand-side of `=>` rules) for fast lookup. The storage exposes `getSynonyms(TagType)` returning a `Multimap<token, synonym>` that the tagger consults per shingle (see `03-tagging.md` step 5).

Two update strategies:

1. **Edit-and-reload** (simplest). Change `synonyms.txt`, reload the concepts core: `curl 'http://localhost:8983/solr/admin/cores?action=RELOAD&core=concepts'`. Reload re-runs `inform()` on all `SolrCoreAware` plugins. Downside: reload triggers cache warmup (filter cache, query cache).

2. **Periodic reloader**. Implement a thread inside `SynonymsStorage` that polls a source (file mtime, DB row, or HTTP endpoint) on a timer (e.g. every 5 minutes). On change, rebuild the in-memory map atomically and swap the reference. No core reload, no cache flush, but added complexity. Use only if your synonym churn is measured in hours-not-days.

For SolrCloud: synonyms file lives in the configset (in ZooKeeper). Update via:
```bash
bin/solr zk cp file:./synonyms.txt zk:/configs/concepts/synonyms.txt -z localhost:9983
curl 'http://localhost:8983/solr/admin/collections?action=RELOAD&name=concepts'
```

### When NOT to use synonyms.txt

Synonyms are global — applied to every tag lookup. If your synonyms are domain-specific (e.g., different per product category), don't put them in `synonyms.txt` — index them as separate concept docs in the **concept collection** with `field=brand_alias_concept` or similar, scoped via `fq` at request time.

Rule of thumb:
- **Universal aliases** (typos, language-independent abbreviations) → `synonyms.txt`
- **Domain-specific equivalences** (only-applies-to-headphones synonyms, only-applies-to-speakers) → concept docs scoped by attribute

Mixing the two is fine — the tagger consults both sources.

## Domain-specific post-processors

Most domains need a post-processor analogous to BLM. Examples:

- **Consumer electronics with accessory compatibility**: BLM (Brand/Line/Model) as a domain example
- **Fashion**: Brand+Style+Color combinations validated against authoritative product DB
- **Books**: Author+Title+Year combinations
- **Real estate**: Location+PropertyType+PriceRange combinations

The post-processor:
1. Filters tags that look like the structured entities (e.g., a year, a brand, a model)
2. Validates the combination against an external source (canonical DB)
3. Replaces individual tags with a synthetic recognized-entity tag
4. Adds an explicit filter to the catalog query

Implementation pattern:
```java
public class MyDomainProcessor {
    public RecognizedEntity process(List<ProducedTag> tags, EntityProvider provider) {
        var entity = new RecognizedEntity();
        // collect components, validate against provider
        // ...
        return entity;
    }
}
```

Run after tagging, before query building. The recognized entity becomes an additional filter on the final query.

## Operational concerns

### Concept rebuild cadence

For a stable catalog, daily is fine. For high-velocity catalogs, consider:
- Hourly partial rebuild (only fields that changed)
- Dual-collection alias swap to avoid query downtime
- Streaming concept updates (advanced; not for first pass)

### Monitoring

Track per-stage:
- Tagging latency (p50, p95, p99)
- Stage success rate (which stage fires per query)
- Zero-hits rate (queries that fall through all stages)

Track concept collection:
- Doc count after rebuild (alarm on big deltas)
- Per-source breakdown
- Field coverage (no field with 0 entries)

### Scaling

Tagger is the hot path. Scale by:
- Replicate concepts collection (read-only)
- Cache tagger responses for hot queries (10ms response → 1ms cached)
- Reduce maxShingleLength if phrases are typically short

Catalog search scales independently — same patterns as any Solr deployment.

## Common bootstrap pitfalls

### Indexing description_text into concepts

Tempting because description_text contains useful words. But it makes everything match everything. Either:
- Don't include it
- Include only top-N highest-IDF terms (custom URP filter)
- Include only with a clearly low boost in stage config

### Mismatched analyzers

If concept collection's `text_concept` uses ASCII folding but catalog's `brand_name_concept` doesn't, the user's "café" tags as "cafe" but the catalog stores "café". Mismatch → no hits. Always verify analyzers are pairwise consistent.

### Stage config drift

Edit stage config in dev, forget to deploy to prod. Symptoms: dev works fine, prod doesn't. Treat stages.json as deployable artifact, version-controlled, deployed alongside the JAR.

### Synonyms loaded only at startup

Synonyms file edited. Forgot to reload. New synonyms not in effect. Mitigation: reload core after every synonyms change OR implement periodic reloader.

### Trying to make tagger handle everything

Pre-filter dumb tagging. If your TagHandler is being asked to tag "bla bla bla" because users type random characters, add a length/token-count filter upstream. Don't burn CPU tagging garbage.

### Forgetting to test multi-language

If lang=ALL works in tests but not prod, check production analyzers — sometimes language detection chains differ. Always test with bilingual queries even if your primary user base is monolingual.

## Reference: minimum viable adoption

If you're not ready for the full architecture, you can adopt subsets:

**Just the concept indexing**: build the concepts collection, query it directly from your application. No graph, no path resolution. Useful for autocomplete, "did you mean", or simple intent classification.

**Tagging only**: invoke `/semanticTagGraph` for query understanding (e.g., to extract brand/category for facet pre-selection). Don't use the tag results to drive search; just for analytics or routing.

**Tagging + simple filter generation**: from recognized concepts, build straightforward boolean filters (`brand_id_s:NIKE AND category_s:running`). Simpler than full path resolution; works for domains where every concept maps cleanly to a structured filter.

**Full architecture**: only when you've outgrown simpler approaches and need the full power of staged processing, ambiguity resolution, dependency groups, etc.

Don't start at the deep end if a shallower one solves your problem.
