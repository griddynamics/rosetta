# Relevancy Tuning: Scoring, Boosts, and Similarity (Solr 9.x)

This file covers how Solr scores documents end-to-end: BM25 mechanics, similarity options, how boolean queries combine clause scores, how function/boost queries compose with text scores, and the practical workflow for tuning relevancy. For reading explain output, see `08-explain.md`. For eDisMax-specific boost knobs, see `03-edismax.md`.

## What "relevancy" actually means in Solr

A query produces a **score** per matching document. Higher score → ranked higher (when `sort=score desc`, the default for `q=`). Score has no absolute meaning — only ordering matters. Comparing scores across different queries is meaningless; comparing within one query is the entire game.

Three things go into a score:

1. **Similarity** — the per-clause math (BM25 by default; alternatives below)
2. **Boolean composition** — how Lucene combines multiple clause scores into a doc score
3. **Boosts** — explicit multipliers (`^N`, `bf=`, `bq=`, `boost=`) that shift the math

Tuning relevancy is mostly tuning #2 and #3. Touching #1 is rare and intentional.

---

## BM25: the default similarity

Solr 9.x defaults to `BM25Similarity`. For a single term `t` in a single field, the score contribution is:

```
score(t, d) = boost × idf(t) × tf(t, d)
```

where:

```
idf(t) = log(1 + (N - n + 0.5) / (n + 0.5))
                          
                          N = total docs with this field
                          n = docs containing term t

tf(t, d) = freq / (freq + k1 × (1 - b + b × dl / avgdl))

                          freq    = occurrences of t in d's field
                          dl      = length of d's field (in terms)
                          avgdl   = average length across all docs
                          k1, b   = tunable parameters
```

Defaults: `k1=1.2`, `b=0.75`.

### What `k1` does

`k1` controls **term frequency saturation**. As `freq` grows, `tf` grows but with diminishing returns:

| freq | tf with k1=1.2 (avgdl) | tf with k1=2.0 |
|---|---|---|
| 1 | 0.45 | 0.33 |
| 2 | 0.62 | 0.50 |
| 5 | 0.81 | 0.71 |
| 10 | 0.89 | 0.83 |
| 100 | 0.99 | 0.98 |

Higher `k1` = slower saturation, more reward for term repetition. Lower `k1` = faster saturation, terms count quickly to 1 and repetition stops mattering.

For e-commerce: lower `k1` (try 0.6-1.0) since repeated keywords in product names rarely indicate stronger relevance. For long-form content (articles, descriptions): default `k1=1.2` or higher.

### What `b` does

`b` controls **length normalization**. `b=1` fully penalizes long docs (tf decreases linearly with `dl/avgdl`); `b=0` ignores length entirely.

| b | Effect |
|---|---|
| 0.0 | No length normalization. Long docs not penalized. Use for fields where length doesn't reflect topic concentration (titles, brand names). |
| 0.75 | Default. Length matters but capped. |
| 1.0 | Maximum normalization. Use when you really want short docs to win (e.g., Q&A short-answer scoring). |

### When to tune

Default `BM25Similarity(k1=1.2, b=0.75)` is fine for 95% of use cases. Symptoms that suggest tuning:

- "Long product descriptions always rank below short ones" → lower `b`
- "Repeated keywords don't move the needle but should" → raise `k1`
- "Spammy keyword-stuffed titles dominate" → lower `k1`

Tune **per field** when needed (see "Per-field similarity" below) — different fields have different length distributions and tf semantics.

---

## Configuring BM25 globally

In `schema.xml` (or managed-schema):

```xml
<similarity class="solr.BM25SimilarityFactory">
  <float name="k1">1.0</float>
  <float name="b">0.5</float>
</similarity>
```

This applies to all fields without explicit per-field similarity.

## Per-field similarity

For tighter control:

```xml
<fieldType name="text_short" class="solr.TextField">
  ...
  <similarity class="solr.BM25SimilarityFactory">
    <float name="k1">0.4</float>
    <float name="b">0.0</float>
  </similarity>
</fieldType>

<fieldType name="text_long" class="solr.TextField">
  ...
  <similarity class="solr.BM25SimilarityFactory">
    <float name="k1">1.5</float>
    <float name="b">0.85</float>
  </similarity>
</fieldType>
```

Now `<field name="title" type="text_short"/>` uses one config and `<field name="description" type="text_long"/>` uses another.

For per-field similarity to work, the global `<similarity>` must be `solr.SchemaSimilarityFactory` (the default), which delegates to per-field similarities. If you set a global non-Schema similarity, per-field overrides are ignored.

---

## Alternative similarities

You don't usually need these. Awareness, when relevant:

| Class | Use case |
|---|---|
| `BM25SimilarityFactory` | Default. The right answer for almost everything. |
| `ClassicSimilarityFactory` | Old TF-IDF + length norm. Use only if migrating from a Solr 4.x setup that depended on it; otherwise BM25 is strictly better. |
| `DFRSimilarityFactory` | Divergence From Randomness. Theoretically motivated alternative; in practice, similar to BM25 with different tuning surface. |
| `IBSimilarityFactory` | Information-Based. Same family as DFR. |
| `LMDirichletSimilarityFactory` | Language Model with Dirichlet smoothing. Different paradigm; handles short queries against long docs well. |
| `LMJelinekMercerSimilarityFactory` | LM with Jelinek-Mercer smoothing. Tunable smoothing parameter. |
| `BooleanSimilarityFactory` | Returns boost-only score (no IDF, no TF). For "matched/not matched" semantics where you only care about which clauses fired. |
| `SweetSpotSimilarityFactory` | TF-IDF variant with a "sweet spot" range for optimal length. Custom and rarely seen. |

Most "my BM25 isn't working well" problems are actually:
- Wrong field analyzers
- Wrong `qf` boosts
- Stopword removal at wrong time
- `mm` too strict

Switching similarities rarely helps. Tune `qf`/`pf`/`bf`/`boost` first.

---

## `BooleanSimilarity` — when boost is the score

There's one alternative that deserves more than a row in the table: `BooleanSimilarityFactory`. It's situational, but in semantic-search-style pipelines it's often **the right default**, not an exotic choice.

### What it does

`BooleanSimilarity` returns the clause's `boost` value as the score, ignoring IDF and TF entirely. A `TermQuery` for `field:value^3.5` produces score 3.5 if it matches, 0 if it doesn't. That's it. No corpus statistics. No length normalization. No saturation curves.

### Why this can be exactly what you want

In a tag-based semantic search system (see `solr-semantic-search` skill), boosts come from a **search config file**, set per field per match-type:

```json
{ "name": "brand_name",     "boost": 100, "type": "concept" },
{ "name": "brand_name",     "boost": 80,  "type": "shingle" },
{ "name": "sub_brand_name", "boost": 80,  "type": "concept", "depends_on": ["brand_name:concept"] }
```

The intended semantics: when "Nike" tags as a brand concept (exact match), this clause contributes 100 to the score; when it matches as a shingle, 80; and so on. The whole architecture relies on these boosts ranking documents — they encode domain expertise about which match-types matter.

With `BM25Similarity`, that expectation breaks. The actual contribution becomes:

```
clauseScore = boost × idf(brand_name, "nike") × tf(...)
```

Which means:
- A **rare** brand (low corpus frequency, high IDF) gets a much higher final score than a **common** one — because BM25 treats rarity as informative
- Brand names with longer text representations get penalized by length normalization
- Repeated brand mentions in the field saturate via `tf`

None of this is what the config author intended. The config says "brand exact match = 100." BM25 says "brand exact match = 100, but multiplied by something I'll make up from corpus statistics." For a tagging system, that's noise.

`BooleanSimilarity` cuts it out: clause score IS the configured boost. The contract is honored.

### Configuration

Per-field type:

```xml
<fieldType name="text_concept" class="solr.TextField">
  <analyzer>
    <tokenizer class="solr.StandardTokenizerFactory"/>
    <filter class="solr.LowerCaseFilterFactory"/>
    <filter class="solr.ASCIIFoldingFilterFactory"/>
  </analyzer>
  <similarity class="solr.BooleanSimilarityFactory"/>
</fieldType>

<fieldType name="text_shingle" class="solr.TextField">
  <analyzer>
    <tokenizer class="solr.StandardTokenizerFactory"/>
    <filter class="solr.LowerCaseFilterFactory"/>
    <filter class="solr.ShingleFilterFactory" minShingleSize="2" maxShingleSize="3"/>
  </analyzer>
  <similarity class="solr.BooleanSimilarityFactory"/>
</fieldType>
```

For per-field similarity to work, the global similarity must be `solr.SchemaSimilarityFactory` (the Solr default) which delegates to per-field. If you set a global non-Schema similarity, per-field is ignored — same trap as with BM25 tuning.

### How it composes with boolean queries

Inside an `SmBooleanQuery` (or vanilla `BooleanQuery`) over multiple tag fields, each clause contributes its boost when matched. With `BooleanSimilarity` on every involved field:

```
{!bool
  should="brand_name_concept:nike^100"
  should="product_category_name_concept:running shoes^90"
  should="position_name_concept:left^80"
  mm=2}
```

If all three match: total score = 100 + 90 + 80 = 270.
If only brand + terminology: 100 + 90 = 190.
If only one matches: clause-level still scores, but mm=2 rejects (no result).

This is **deterministic** and matches what the config says. Two products with different brand-term frequencies in the corpus rank identically as long as they match the same set of clauses. That's precisely what a tag-based system wants — the *match itself* is the signal, not corpus statistics.

### When `BooleanSimilarity` is the right default

- **Tag-based semantic search**: clauses generated from staged tags, boosts come from per-field-per-type config
- **Faceted boolean filters that affect ranking**: e.g., "boost docs matching this category by N" — you want exactly N, not "N adjusted by category-frequency"
- **Anything where boost values are domain-meaningful and should not be re-interpreted**

### When NOT to use it

- **Free-text fields with natural language**: BM25 is genuinely better for "find docs about red shoes" — IDF rewards rare terms (which usually carry topic info)
- **`product_title_descriptions`, `description_text`**: full-text search benefits from BM25's saturation and IDF behavior
- **Mixed fields where some clauses are tag-based and some are free-text**: keep BM25 for the free-text fields, `BooleanSimilarity` for the tag fields. Per-field similarity is the right tool.

In a multi-stage semantic search pipeline (config below), the typical setup is:

| Field | Similarity | Why |
|---|---|---|
| `brand_name_concept` | BooleanSimilarity | tag — boost is the signal |
| `product_category_name_concept` | BooleanSimilarity | tag |
| `category_concept` | BooleanSimilarity | tag |
| `*_shingle` (multi-word concept variants) | BooleanSimilarity | tag |
| `product_title_descriptions` | BM25 | free-text, IDF helps |
| `description_text` | BM25 | free-text, length norm helps |

Then `qf`/clause boosts in your generated queries match the config's boost values one-to-one with no surprises.

### End-to-end example

Stages config defines:

```json
{ "name": "brand_name",          "boost": 100, "type": "concept" },
{ "name": "product_category_name", "boost": 90, "type": "concept" },
{ "name": "position_name",       "boost": 80, "type": "concept",
  "depends_on": ["product_category_name:concept"] }
```

User types "left sony ear pads". Tagger produces:
- `sony` → `brand_name:sony` (concept match)
- `ear pads` → `product_category_name:ear_pads` (concept match)
- `left` → `position_name:left` (concept match, but depends on product_category presence)

Query construction (using SmBooleanQuery with `BooleanSimilarity` on the three tag fields):

```
{!bool must=$brand must=$pt must=$pos mm=3}
&brand={!term f=brand_name_concept v='sony'}^100
&pt={!term f=product_category_name_concept v='ear pads'}^90
&pos={!term f=position_name_concept v='left'}^80
```

Score for a doc that matches all three: **270**, exactly as the config implies.

With `BM25Similarity` instead, the score would be `100 × idf("sony") × tf(...) + 90 × idf("ear pads") × tf(...) + 80 × idf("left") × tf(...)` — sensitive to how often these terms appear across the catalog, which has nothing to do with relevance for this query intent.

### Verifying it's working

In `debug=true` output, look at the `explain` section. With BooleanSimilarity, the per-clause explain reads simply:

```
1.0 = boost
× 100.0 = clause boost
= 100.0 weight
```

Not the BM25 nested structure with idf/tf/k1/b. If you see BM25-style explain, your similarity isn't actually applied — usually because:
- Global similarity isn't `SchemaSimilarityFactory`
- The fieldType is missing the `<similarity>` element
- You overrode the `<similarity>` in `<fieldType>` but the field uses a different fieldType

### Caveat: norms and termFreq

`BooleanSimilarity` doesn't use them — but Solr still indexes them by default, costing storage/RAM. For tag fields purely scored by `BooleanSimilarity`, you can omit them:

```xml
<fieldType name="text_concept" class="solr.TextField"
           omitNorms="true" omitTermFreqAndPositions="true">
  ...
</fieldType>
```

`omitNorms` saves length-norm storage. `omitTermFreqAndPositions` saves position data — but if you also need phrase queries, leave positions on. For pure token-equality concept fields, omit both.

---

## Boolean query scoring composition

When multiple clauses match, Lucene's `BooleanQuery` combines their scores. The composition depends on clause type:

| Occur | Contributes to score? | In SHOULD count? | Comment |
|---|---|---|---|
| `MUST` (+) | Yes | No | Must match; score added |
| `SHOULD` | Yes | Yes | Score added; counts toward `mm` |
| `MUST_NOT` (-) | No | No | Must not match |
| `FILTER` | No | No | Must match; score ignored |

Final score:
```
score = sum(MUST clause scores) + sum(matched SHOULD clause scores)
```

`MUST_NOT` and `FILTER` clauses contribute nothing to score, only to matching.

### Implications

- Adding `MUST` clauses increases base score
- `FILTER` clauses are free (no scoring work) — use for non-scoring constraints
- `SHOULD` with `mm=2<75%` means 75% of SHOULD clauses must match, but only matched ones contribute scores
- Clauses with high IDF + good TF dominate the score; common-term clauses contribute little

### `MUST` vs `SHOULD` strategic choice

For a user query "red running shoes":

**All MUST** (`q.op=AND`):
- Doc must match every term
- Score = sum of three contributions
- High precision, low recall

**All SHOULD** (`q.op=OR`):
- Doc matches if any term matches
- Score = sum of matched-term contributions
- Low precision, high recall
- `mm` controls the precision/recall tradeoff

eDisMax's `mm=2<75%` formula: ≤2 terms = all required (effectively MUST); >2 terms = 75% required. This gets the best of both worlds.

---

## Function and boost query composition

### `bf=` (additive function boost) in eDisMax

Score after applying `bf`:
```
final_score = base_score + bf_value
```

Each `bf=` is summed into the final score. Multiple `bf=` are independent additions.

If `base_score` ranges from 0–20 and `bf=log(popularity)` returns 0–5, the boost has visible effect (~25% of base). If base ranges 0–500 (common for high-IDF queries), `bf` of 5 is noise.

### `bq=` (additive boost query)

Same composition as `bf` — sum into final score. The "score" of a `bq` clause is the regular Lucene scoring of that clause (e.g., `bq=in_stock_b:true^2` produces a score equal to the IDF×boost of the constant-frequency match, ~2 for a binary field).

### `boost=` (multiplicative boost function) in eDisMax

```
final_score = base_score × boost_value
```

This is the **only** way to apply a boost that scales with the base. Use when you want decay/inventory boosts to remain proportional regardless of how strong the base text match was.

### Typical composition

```
q={!edismax v=$qq}
qf=name_t^10 description_t^2
pf=name_t^15
bf=log(sum(popularity_i,1))
boost=if(in_stock_b,1.0,0.5)
bq=featured_b:true^3

→ final_score = ((qf_disjunction + pf_phrase) + bf + bq) × boost
```

The eDisMax explain output shows this decomposition.

---

## Practical relevancy tuning workflow

This is the workflow that actually works. Theory beats hand-waving every time.

### Step 1: Get a judgment list

A judgment list is queries paired with ranked docs:

```
query: "red running shoes"
  doc-A: 4 (perfect)
  doc-B: 3 (good)
  doc-C: 1 (weak)
  doc-D: 0 (irrelevant)

query: "ducati fuel pump"
  doc-X: 4
  doc-Y: 2
  doc-Z: 0
```

Sources:
- Manual scoring of top results from production logs
- User click data (proxy: click ≈ partial relevance)
- Pre-existing taxonomy/business rules
- LLM-generated judgments (with audit)

20-100 queries with 5-20 judgments each is enough to start. 1000+ is industry standard.

### Step 2: Pick a metric

| Metric | What it measures |
|---|---|
| **NDCG@10** | How well top-10 ranking matches ideal ranking. Best for "the top results matter most." |
| **MAP** (Mean Average Precision) | Aggregate precision across recall levels. Good for "all relevant docs should be ranked high." |
| **MRR** (Mean Reciprocal Rank) | Position of first relevant doc. Good for "users care only about the top hit." |
| **P@k** (Precision at k) | Fraction of top-k that are relevant. Simple, interpretable. |

For e-commerce, NDCG@10 is the standard.

### Step 3: Establish baseline

Run all queries against your current Solr config. Compute the metric. This is your baseline number. Every tuning change is judged against it.

### Step 4: Change one thing

Pick one knob:
- Adjust `qf` weights
- Add/change `pf` boost
- Add/tune `bf=log(popularity)`
- Switch `bq` to `boost=` (additive → multiplicative)
- Adjust `mm`
- Tune BM25 `k1` or `b` per field

Re-run judgment list. Compute metric. Compare to baseline.

### Step 5: Read explain on regressions

Some queries got worse. Open their explain output. What changed? Is the new top result a known-bad one because of a side effect of your change? Refine.

### Step 6: A/B test the winner

Offline metrics correlate with but don't equal user behavior. A judgment-list-winning config might lose in click-through-rate. Always A/B before promoting.

### Common tuning loops

**"Some products dominate due to long descriptions"**
→ Lower `b` on description field, or move boost to title field

**"Featured products don't show up enough"**
→ Add `bq=featured_b:true^N`, tune N

**"Out-of-stock items rank too high"**
→ `boost=if(in_stock_b,1.0,0.3)` (multiplicative, more decisive than `bq`)

**"New products disappear at the bottom"**
→ `bf=recip(ms(NOW,created_dt),3.16e-11,1,1)` and tune the constant for half-life

**"Brand keyword in query doesn't surface brand-named products"**
→ Increase `qf` weight on `brand_s`; consider `bq=brand_s:$qq^5` (boost when query exactly matches a brand)

**"Category browsing returns weird outliers"**
→ `q.op=AND` or `mm=100%` for category-bound contexts; relax for free-text search

---

## Boosting without explain regret

Common mistake: cranking up boosts to fix one query and breaking dozens of others.

Discipline:
- Always check if a boost change affects multiple queries via judgment list
- Prefer tuning **inputs** (fields, analyzers) over **outputs** (boosts) — it ages better
- Keep boost values within an order of magnitude (e.g., `qf=title_t^10 brand_s^5 desc_t^1`); 100x ratios are red flags
- Remove unused/legacy `bf`/`bq` regularly; cargo-culted boosts compound

---

## Learning to Rank (LTR) — brief mention

Solr ships an `ltr` contrib module that supports machine-learned ranking models (linear, neural, gradient boosting). Workflow:

1. Define **features** (fields, function queries, query-doc relationships)
2. Collect **training data** (judgment list + feature values)
3. Train a model offline (xgboost, ranklib, etc.)
4. Upload model to Solr
5. Re-rank top-N candidates using `rq={!ltr model=myModel reRankDocs=200}`

LTR shines when:
- You have substantial click/conversion data
- Hand-tuned BM25+boosts have plateaued
- You can invest in ML infrastructure

It's overkill for early-stage projects. Get BM25+eDisMax+boosts to a good baseline first; consider LTR when you've exhausted that. Solr LTR docs: https://solr.apache.org/guide/solr/latest/query-guide/learning-to-rank.html.

---

## Summary checklist

Before saying "Solr's ranking is wrong":

1. Check `parsedquery` in debug — is the query parsed as you intended?
2. Check `qf` field weights — are they the right order of magnitude?
3. Check `mm` — is recall being killed?
4. Check explain on the disputed docs — what's actually contributing?
5. Check field analyzers — are query and index tokens compatible?
6. Check whether `bf`/`bq`/`boost` are doing what you think (read explain)
7. Compare on a judgment list — anecdotes lie

Only after all of the above: consider tuning BM25 parameters, switching similarity, or adding LTR.
