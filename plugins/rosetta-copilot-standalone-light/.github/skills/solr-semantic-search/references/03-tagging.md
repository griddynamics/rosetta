# Phrase Tagging

The tagger is the front door of the semantic pipeline: it takes a raw user phrase and produces a structured list of recognized concepts (`ProducedTag`s). This file covers the lookup mechanics in detail.

## Two routes: built-in `solr.TaggerRequestHandler` vs custom handler

Before designing your own tagger, **always evaluate Solr's built-in `solr.TaggerRequestHandler`** (also called "SolrTextTagger"). It's been in Solr since 7.4 and solves the core "find dictionary terms in a text" problem extremely efficiently using a Lucene FST (Finite State Transducer) over the indexed dictionary. For many use cases — especially early-stage ones — it's all you need, and it ships with Solr.

The custom `TagHandler` described below in the rest of this file is what you end up with when the built-in handler doesn't fit. The two are not mutually exclusive: many production systems start with the built-in tagger and migrate to a custom one only when they hit specific limitations.

### Built-in `solr.TaggerRequestHandler` — what it does

Given a Solr collection where one field holds dictionary terms (concepts), POST a chunk of text to the tagger and it returns every match with offsets and full document metadata. One pass over the input text. FST-based: very low memory, very fast, deterministic.

### Minimum viable setup

Schema (`managed-schema` of the concept collection):

```xml
<fieldType name="tag" class="solr.TextField" postingsFormat="FST50"
           omitNorms="true" omitTermFreqAndPositions="true">
  <analyzer type="index">
    <tokenizer class="solr.StandardTokenizerFactory"/>
    <filter class="solr.EnglishPossessiveFilterFactory"/>
    <filter class="solr.ASCIIFoldingFilterFactory"/>
    <filter class="solr.LowerCaseFilterFactory"/>
    <filter class="solr.ConcatenateGraphFilterFactory" preservePositionIncrements="false"/>
  </analyzer>
  <analyzer type="query">
    <tokenizer class="solr.StandardTokenizerFactory"/>
    <filter class="solr.EnglishPossessiveFilterFactory"/>
    <filter class="solr.ASCIIFoldingFilterFactory"/>
    <filter class="solr.LowerCaseFilterFactory"/>
  </analyzer>
</fieldType>

<field name="id"        type="string" indexed="true" stored="true"/>
<field name="name"      type="string" indexed="false" stored="true"/>
<field name="name_tag"  type="tag"    indexed="true" stored="false"/>
<field name="weight"    type="pint"   indexed="true" stored="true" docValues="true"/>
<copyField source="name" dest="name_tag"/>
```

Two key pieces:
- `postingsFormat="FST50"` on the tag field — enables the FST-based postings format that the tagger needs
- `ConcatenateGraphFilterFactory` at index time only — concatenates the analyzed tokens of each multi-word entity into a single FST entry. The query-time analyzer skips this filter, so the input text is tokenized normally.

solrconfig.xml needs the codec factory + handler:

```xml
<codecFactory class="solr.SchemaCodecFactory"/>

<requestHandler name="/tag" class="solr.TaggerRequestHandler">
  <lst name="defaults">
    <str name="field">name_tag</str>
    <str name="fl">id,name,weight</str>
    <str name="overlaps">NO_SUB</str>
  </lst>
</requestHandler>
```

### Calling it

```bash
curl -X POST \
  'http://localhost:8983/solr/concepts/tag?overlaps=NO_SUB&matchText=true&fl=id,name,weight&wt=json' \
  -H 'Content-Type: text/plain' \
  -d 'sony wh-1000xm5 ear pads'
```

Response:

```json
{
  "responseHeader": {"status": 0, "QTime": 1},
  "tagsCount": 3,
  "tags": [
    {"startOffset": 0,  "endOffset": 4,  "matchText": "sony",       "ids": ["brand_sony"]},
    {"startOffset": 5,  "endOffset": 15, "matchText": "wh-1000xm5", "ids": ["model_wh_1000xm5"]},
    {"startOffset": 16, "endOffset": 24, "matchText": "ear pads",   "ids": ["category_ear_pads"]}
  ],
  "response": {
    "numFound": 3, "start": 0,
    "docs": [
      {"id": "brand_sony",      "name": "Sony",      "weight": 50000},
      {"id": "model_wh_1000xm5", "name": "WH-1000XM5", "weight": 8000},
      {"id": "category_ear_pads", "name": "Ear Pads", "weight": 12000}
    ]
  }
}
```

Each tag has `startOffset`/`endOffset` (character positions in the input), `ids` (concept doc ids), and the matching concept docs are returned alongside in `response.docs` with whatever fields you requested via `fl`.

### Important parameters

| Param | Purpose |
|---|---|
| `field` (required) | the indexed dictionary field |
| `fq` | filter queries to scope the dictionary (e.g., `fq=lang:en`, `fq=source:catalog`) |
| `rows` | how many concept docs to return (default 10000 for tag requests; not 10) |
| `fl` | which fields of the matched concept docs to include in `response.docs` |
| `matchText` | include the actual matched substring in each tag (very useful for debugging) |
| `overlaps` | tag overlap resolution algorithm — see below |
| `tagsLimit` | max tags returned (default 1000) |
| `subTags` | when overlaps=ALL, include all overlapping tags (otherwise excluded) |
| `ignoreStopwords` | tag through stopword positions; default auto-detected from analyzer |

### `overlaps` — overlap resolution

When the dictionary contains "sony", "wh-1000xm5", "sony wh-1000xm5", and the input has "sony wh-1000xm5", which tags do you keep?

| Value | Behavior |
|---|---|
| `ALL` | return every match, including subsumed ones (3 tags: sony, wh-1000xm5, sony wh-1000xm5) |
| `NO_SUB` | drop tags that are entirely contained in another tag (2 tags: sony wh-1000xm5 + nothing else; the shorter ones are sub-tags) |
| `LONGEST_DOMINANT_RIGHT` | greedy; pick longest non-overlapping span moving left-to-right (most production setups use this) |

For semantic search where you want the strongest interpretation: `LONGEST_DOMINANT_RIGHT` or `NO_SUB`. For a graph-based downstream that compares all interpretations: `ALL` (and let your ambiguity resolver pick).

### Filtering by attribute (multi-language, multi-source)

The same `fq` mechanism works for scoping. If your concept docs have `lang:en|es|all` and `source:catalog|synonyms|...`, narrow at request time:

```bash
curl -X POST \
  'http://localhost:8983/solr/concepts/tag?fq=lang:(en+OR+all)&fq=source:catalog&overlaps=NO_SUB&matchText=true' \
  -H 'Content-Type: text/plain' \
  -d 'red shoes'
```

`fq` supports the standard filterCache, so repeated `lang:en AND source:catalog` filters reuse cached entries. This makes per-request filtering cheap.

### Hard limitations

These are why most production setups eventually outgrow the built-in tagger:

1. **No fuzzy matching.** The FST does exact (post-analysis) matching only. If the user types "sny" and the concept is "sony", no tag fires. Mitigation: build a separate spellcheck step *before* tagging, OR add fuzzy variants as alternative concept entries at indexing time.

2. **No prefix / substring matching.** If concept is "wh-1000xm5" and user types "wh-1000", no tag. Mitigation: shingle/n-gram the indexed terms (but see #4).

3. **No native scoring by match type.** All matches are equal — there's no way to say "exact match scores 100, fuzzy match scores 25". The tagger returns only positions and ids; weighting must happen downstream from your own logic over the matched concept docs (e.g., using the `weight` field).

4. **No shingling-during-tagging.** With current `ConcatenateGraphFilterFactory` you can't combine shingling with the tag field reliably. Both work in isolation but composition is awkward — see [SolrTextTagger issue #82](https://github.com/OpenSextant/SolrTextTagger/issues/82). For multi-word concept matching it works fine because `ConcatenateGraphFilterFactory` handles those, but partial-match-via-shingles is constrained.

5. **No multi-language analyzer per request.** The tag field has one indexed analyzer chain. If you need EN tokenization for English queries and ES tokenization for Spanish, you typically run two separate tag fields (`name_tag_en`, `name_tag_es`) and call the tagger twice (once per language) — extra latency and config.

6. **Single-shard requirement.** "The Tagger request handler does not yet support a sharded index. The collection that stores the tag dictionary must be a single-sharded collection." Not normally a problem (concept dictionaries are small), but plan for it: don't auto-shard the concept collection like the catalog.

7. **No graph output.** Returns a flat list of tags with offsets. Building a graph + finding K-shortest paths is *your* job downstream.

8. **No synonym expansion at tag time.** You can index synonym terms as additional concept docs (multiple docs sharing the same `id` or grouped via a key) but you can't dynamically apply a synonyms file. Multi-word synonyms work if you index them as separate concept docs.

### Decision matrix: built-in vs custom

| Use case | Recommendation |
|---|---|
| One-shot tagging for query understanding (e.g., "what brand did they mention?") — return matches and you're done | **Built-in** |
| Tag for autocomplete or "did you mean" suggestions | **Built-in** |
| Need fuzzy / prefix / spell-corrected matching as a first-class concept | **Custom** |
| Need multi-language tagging in one call with per-language analyzer | **Custom** (or two built-in calls + merge in app code) |
| Need per-match-type scoring (exact 100×, fuzzy 25×, prefix 50×) baked into the tag response | **Custom** |
| Domain-specific synonym handling beyond what indexed concept docs provide | **Custom** |
| Need graph output, K-shortest paths, ambiguity resolution downstream | **Custom orchestrator** wrapping either tagger (built-in is a fine source of raw tags) |
| Real-time synonym reloading from a database without core reload | **Custom** |
| Concept dictionary < 10M entries, exact-match is enough | **Built-in** |

A common pragmatic pattern: use the **built-in tagger** as the inner lookup for dictionary terms, and put a **thin custom orchestrator** in front that handles shingles / synonyms / graph building / multi-language. The custom layer doesn't need to do its own FST lookups — it composes calls to the built-in handler.

### Example: hybrid pattern (built-in tagger + thin custom layer)

```java
@Override
public void handleRequestBody(SolrQueryRequest req, SolrQueryResponse rsp) {
    String phrase = req.getParams().required().get("q");
    String lang = req.getParams().get("lang", "en");

    // 1. Call built-in tagger via internal request to /tag handler
    SolrParams tagParams = new ModifiableSolrParams()
        .set("field", "name_tag_" + lang)
        .set("fq", "lang:(" + lang + " OR all)")
        .set("overlaps", "ALL")
        .set("matchText", "true")
        .set("fl", "id,token,field,weight,tokenId");

    SolrQueryRequest tagReq = new LocalSolrQueryRequest(req.getCore(), tagParams);
    SolrQueryResponse tagRsp = new SolrQueryResponse();
    req.getCore().getRequestHandler("/tag").handleRequest(tagReq, tagRsp);

    // 2. Convert built-in tagger output to ProducedTag list
    List<ProducedTag> tags = convertTaggerResponse(tagRsp);

    // 3. Apply custom logic:
    //    - synonym expansion via SynonymsStorage
    //    - fuzzy / prefix supplementation if shingle didn't match
    //    - relation-type assignment based on which analyzer fired
    tags = applyCustomLogic(tags, phrase);

    // 4. Return enriched response (with optional DOT graph for debugging)
    rsp.add("tokens", tokenize(phrase, lang));
    rsp.add("tags", tags);
}
```

You inherit FST speed for the dictionary lookup and pay custom-code cost only for the value-add logic. This is the path most teams take after their first iteration.

### When to commit fully to a custom handler

If two or more of these are true, the built-in tagger isn't a good fit even as inner lookup:

- Per-match-type scoring needs to influence which tags survive (not just downstream re-ranking)
- Fuzzy is the *primary* match mode (not a fallback)
- Multi-word synonyms need to interact with multi-language analysis
- The tagger needs to produce an explicit graph with quasi-positions for synonym alternatives (see `04-graph-paths.md`)
- You need to run multiple parses (per-language, per-source-type) and merge with deduplication, all within one HTTP request from the client

That's the world the custom handler in this skill addresses. The rest of this file describes how that custom handler works.

---

## Request handler

Exposed as `/semanticTagGraph` on the **concept collection** (not the catalog).

```xml
<requestHandler name="/semanticTagGraph" class="com.example.semantic.TagHandler">
  <lst name="defaults">
    <int name="maxShingleLength">4</int>
    <int name="maxTag">50</int>
    <bool name="fuzzy">false</bool>
    <bool name="wordBreak">false</bool>
    <bool name="prefix">false</bool>
  </lst>
</requestHandler>
```

Request:
```
GET /solr/concepts/semanticTagGraph?
  q=sony+wh-1000xm5+ear+pads&
  lang=en&
  source=semantic&
  fuzzy=true&
  wordBreak=true&
  prefix=true&
  maxShingleLength=4&
  debug=true&
  dot=true
```

Parameters:

| Param | Type | Effect |
|---|---|---|
| `q` | string | the phrase to tag |
| `lang` | string | "en", "es", "all" — which language to analyze with |
| `source` | string | filter concepts by source (e.g., "semantic", "catalog_db") |
| `fuzzy` | bool | enable fuzzy matching on shingles |
| `wordBreak` | bool | enable word-break matching |
| `prefix` | bool | enable prefix matching |
| `maxShingleLength` | int | max N for N-grams (default 4) |
| `maxTag` | int | top-N tags to return per shingle (default 50) |
| `debug` | bool | include parsed lookup queries in response |
| `dot` | bool | include graphviz DOT dump for visualization |

Response:
```json
{
  "tokens": [
    {"position": 0, "term": "sony", "lang": "en"},
    {"position": 1, "term": "wh-1000xm5", "lang": "en"},
    ...
  ],
  "tags": [
    {"start": 0, "end": 1, "token": "sony", "originalToken": "sony",
     "relation": "CONCEPT",
     "entryFields": [{"name": "brand_name_concept", "weight": 50000, "tokenId": "SONY"}]},
    {"start": 1, "end": 2, "token": "wh-1000xm5", "originalToken": "wh-1000xm5",
     "relation": "CONCEPT",
     "entryFields": [{"name": "model_name_concept", "weight": 8000, "tokenId": "WH-1000XM5"}]},
    ...
  ],
  "unrecognizedTags": [],
  "multiwordSynTags": [...],
  "tagsDot": "digraph G { ... }"
}
```

## Step-by-step processing

### 1. Tokenize per language

```java
List<Token> tokens = Analyzers.analysePhrase(core, phrase, lang);
tokens = TokenPositionNormalizer.normalizePositions(tokens);
```

Uses Lucene analyzer chain (loaded from concept core or from a configured `analysisCore` parameter) to produce `Token`s with positions. The same analyzers used at indexing must be used here, so user input matches indexed tokens.

If `lang=ALL`, this runs once per language (en, es) and tokens are merged.

### 2. Generate shingles

For tokens at positions 0..N, generate every N-gram of length 1 to `maxShingleLength`:

```
"sony wh-1000xm5 ear":
  shingleLen 1: [sony], [wh-1000xm5], [ear]
  shingleLen 2: [sony wh-1000xm5], [wh-1000xm5 ear]
  shingleLen 3: [sony wh-1000xm5 ear]
```

Each shingle has:
- `token` — the joined string ("sony wh-1000xm5")
- `startPosition` — first token's position
- `offset` — token count (length of n-gram)
- `originalTokenOffset` — offset for boost calculation

### 3. Look up each shingle

For each shingle, build a Solr query and execute against the concept collection:

```java
BooleanQuery.Builder qb = new BooleanQuery.Builder().setMinimumNumberShouldMatch(1);

// Exact match
qb.add(wrapQuery(new TermQuery(new Term("token", shingleToken)),
                 100.0f * pow), SHOULD);

// Fuzzy
if (fuzzy && editsAllowed >= 1 && shingle.isOriginal()) {
    qb.add(wrapQuery(new FuzzyQuery(new Term("token", shingleToken),
                                     editsAllowed, prefixLength, maxExpansions, transpositions),
                     25.0f * pow), SHOULD);
}

// Word break
if (wordBreaking) {
    qb.add(wrapQuery(WordBreakingQueryBuilder.getQuery("token", shingleToken),
                     75.0f * pow), SHOULD);
}

// Prefix
if (prefix && shingle.getOffset() == 1 && !isAllDigits) {
    qb.add(wrapQuery(new RegexpQuery(new Term("token", shingleToken + "[^ ]+")),
                     50.0f * pow), SHOULD);
}

// Filter by lang and source
qb.add(buildFQ(params, shingle.getLang()), FILTER);

BooleanQuery query = qb.build();
TopDocs topDocs = searcher.search(query, maxTag);
```

`wrapQuery(q, score)` is `new BoostQuery(new ConstantScoreQuery(q), score)` — wraps in constant score so all matches of one type contribute the same boost regardless of intrinsic IDF.

`pow = 2 ^ (originalTokenOffset - 1)`. So:
- 1-token shingle: pow=1, exact=100, prefix=50, fuzzy=25
- 2-token shingle: pow=2, exact=200, prefix=100, fuzzy=50
- 3-token shingle: pow=4, exact=400, prefix=200, fuzzy=100
- 4-token shingle: pow=8, exact=800

This biases toward longer matches even when shorter matches also fire.

### 4. Determine relation type

Each top doc is one match. Determine its relation:

```java
if (forceType != null) {
    relation = forceType;
} else if (tokenInDoc.equals(shingleToken)) {
    relation = TagType.CONCEPT;        // exact match
} else if (tokenInDoc.startsWith(shingleToken)
           && tokenInDoc.length() > shingleToken.length()
           && tokenInDoc.charAt(shingleToken.length()) != ' ') {
    relation = TagType.PREFIX;          // user typed "son" matched "sony"
} else {
    relation = TagType.SPELL;           // fuzzy / spell-correction
}
```

`forceType` is set when the shingle came from a synonym path — those tags get `MULTI_SYN` regardless of how they matched in the lookup.

### 5. Synonym expansion

Before lookup, the tagger consults `SynonymsStorage` for each shingle:

```java
for (TagType synType : List.of(SYN, MULTI_SYN)) {
    Collection<String> synonyms = synonymsStorage.getSynonyms(synType).get(shingleToken);
    for (String synonym : synonyms) {
        if (!shingleToken.equals(synonym)) {
            // add synonym as additional graph edge
            graph.addEdge(start, end,
                Shingle.of(synonym, start, offset, synType.getName(), shingleToken));
        }
    }
}
```

Single-word synonyms become alternative edges with same start/end as original. Multi-word synonyms get **quasi-positions** (intermediate negative-id vertices) — see `04-graph-paths.md`.

`SynonymsStorage` is loaded once at handler startup (in `inform(SolrCore)`). Reloading requires core reload.

The recommended source format is **standard Solr `synonyms.txt`** (the same format consumed by `solr.SynonymGraphFilterFactory`):

```
# two-way (equivalent): all terms expand to all terms
ear pads, ear pad set, ear cushions
bose, bse, quiet comfort

# one-way (LHS replaced by RHS, LHS dropped unless re-listed)
teh => the
sny => sony
huge, ginormous => large
```

Two-way rules become bidirectional edges in `SynonymsStorage` (looking up "bse" returns ["bose", "quiet comfort"]; looking up "bose" returns ["bse", "quiet comfort"]). One-way rules become unidirectional (looking up "teh" returns ["the"]; looking up "the" returns nothing). Multi-word entries become MULTI_SYN; single-word become SYN. See `07-applying-to-domain.md` for the complete format spec.

### 6. Build the response

For each shingle, the lookup returned 0+ top docs. For each top doc, populate `tagTypesMap`:

```java
final Map<String, Multimap<TagType, Map>> tagTypesMap = new HashMap<>();
for (ScoreDoc doc : topDocs.scoreDocs) {
    Document conceptDoc = searcher.doc(doc.doc);
    String field = conceptDoc.get("field");
    String token = conceptDoc.getField("token").stringValue();
    int weight = conceptDoc.getField("weight").numericValue().intValue();
    String lang = conceptDoc.getField("lang").stringValue();

    TagType relation = determineRelation(token, shingleToken, ...);

    addOrCreate(tagTypesMap, relation, fieldEntry(field, weight, lang), token);
}
```

Then convert tagTypesMap to `ProducedTag` objects (one per (token, relation) combo, with all matched fields). Append to the response.

### 7. Spell-check unrecognized

After main tagging, find shingles that produced NO tags:
```java
List<ProducedTag> unrecognized = ...;
```

If lang=ALL, gather unrecognized shingles that failed in BOTH languages. For these, retry tagging with `isSpellcheckEnabled=true` (relaxes thresholds, allows looser fuzzy).

This is the "did you mean..." fallback. Tags it produces have relation=SPELL.

## Multi-language tagging

When `lang=ALL`:

1. Run analyzer per language (English, Spanish, etc.). Each produces possibly different token lists (different stemming, different stopwords).
2. Run tagging once per token list.
3. Merge results — same tag from different languages stays once (deduped by start+end+token).
4. Identify shingles unrecognized in BOTH languages → run spellcheck retry.
5. Final response merges all tags from all languages.

This means a phrase like "shoes zapatos" (English + Spanish for shoes) gets tagged correctly under both languages, and the downstream query treats them as alternative interpretations.

## Edge cases

### Empty phrase

Returns empty response. No error.

### Single token

Shingles = just the one token. Synonyms still applied. No multi-word synonyms (no spans).

### Very long phrase (10+ tokens)

Shingle generation is O(N × maxShingleLength). For N=20, maxShingleLength=4, that's 80 shingles, each with up to 4 lookup queries (exact + fuzzy + wordbreak + prefix). 320 lookups per language. Performance budget concern. Either:
- Cap maxShingleLength lower (3 or 2)
- Truncate phrase length upstream
- Pre-filter phrases through a quick token-count check

### Phrase with gaps

Tokenizer can produce gaps (stopwords filtered, punctuation, etc.):
```
phrase: "sony the wh-1000xm5"   →   tokens at positions 0, 2 (gap at 1)
```

`TokenPositionNormalizer.normalizePositions()` collapses to `[sony]@0, [wh-1000xm5]@1`. The original gap-aware path is preserved separately for the response (so users see the gap reflected).

### Shingles with digits

Numeric shingles have special rules:
- `prefix=true` doesn't apply to all-digit shingles (would match too broadly)
- Optional `shortNumericTagsEnabled` adds prefix matching for short numeric (1-2 chars) with constraint: token must be followed by a letter (e.g., "5w" matches "5w30" but not "500")

### Repeated tokens

"red red shoes" — does the tagger return one tag for "red" or two? Two — each position is independent. Path resolution treats them as separate edges.

## Performance considerations

### Lookup query cost

Each shingle = 1 SolrIndexSearcher query against the concept collection. If you have 10 shingles and run for 2 languages, that's 20 queries per request.

Concept collection is small (1M-50M docs typical). Queries are fast (under 1ms). Total tagger latency for typical phrase: 20-50ms.

### Filter cache

The lang/source filter is the same across all shingle lookups in one request. Make sure it's cached:
- `lang:en AND source:semantic` should hit `filterCache` after first request

### maxTag threshold

`maxTag` (default 50) caps top-N per shingle. Higher = more candidates → more processing in graph layer. Lower = may miss valid concepts. Default fits most cases; tune if you see top-N truncation in debug.

### Synonym reloading

`SynonymsStorage` is loaded once at handler init. If you update synonyms (typically a flat file or DB table), you need to reload the concept core for changes to take effect.

For frequent synonym updates: implement a periodic reloader that rebuilds the storage from source on a timer, without requiring core reload. Adds complexity but avoids reload-driven cache flushes.

## Debugging the tagger

### `debug=true`

Includes the actual Lucene queries used for each shingle lookup in the response under `debugQueries`. Useful for "why didn't this match?" — copy the query, run it directly against the concept core.

### `dot=true`

Returns a graphviz DOT dump under `tagsDot` and `multiwordSynTagsDot`. Pipe to graphviz to render:
```
echo "$DOT" | dot -Tpng > tags.png
```

The DOT output uses colors:
- Green: CONCEPT (exact match)
- Red: SYN, MULTI_SYN
- Blue: SPELL
- Purple: PREFIX
- Black: unrecognized

Solid lines: mandatory field tags. Dashed: optional.

This is the single best debugging tool. For any non-trivial phrase, generate the DOT and look at it visually.

### Checking a missing tag

If you expect "sony" to tag but it doesn't:

1. Confirm the concept exists: query the concept collection directly:
   ```
   /solr/concepts/select?q=token:sony+AND+field:brand_name_concept
   ```
2. Confirm lang/source filters: are you tagging with `lang=en` while the concept has `lang=es`?
3. Confirm analyzer agreement: tokenize "sony" through the concept core's analyzer; does it produce exactly "sony"?
4. Check `debug=true` queries — is the lookup query right?
5. Check maxTag — could the tag have been truncated?

### Performance debugging

`debug=true` also includes per-shingle query counts. If one shingle takes 100ms, something's wrong with that lookup specifically (probably regex prefix match against many docs).

For overall request latency:
- Profile `analyzePhrase` (analyzer overhead)
- Profile `searcher.search` cumulative time across shingles
- Check filterCache hit rate via `/solr/concepts/admin/mbeans?stats=true`
