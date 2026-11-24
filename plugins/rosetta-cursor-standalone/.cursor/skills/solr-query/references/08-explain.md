# Reading Solr Explain Output

`debug=true` is the most powerful debugging tool in Solr. It tells you exactly why each result document scored what it scored, and how the query was parsed before execution. Most engineers never read explain output carefully — this file walks through what each piece means and how to use it to diagnose specific ranking problems.

## Debug parameter variants

```
debug=true                       # everything: parsing + explain + timing
debug=query                      # parsing only (cheap)
debug=results                    # explain per result, no parse detail
debug=timing                     # per-component timing
debug.explain.structured=true    # JSON explain instead of text (parseable)
```

For programmatic use (UIs, log analysis), always use `debug.explain.structured=true` — text explain is for humans reading in a terminal.

## Top-level debug shape

```json
{
  "debug": {
    "rawquerystring": "{!parent which=type_s:product}color_s:red",
    "querystring": "{!parent which=type_s:product}color_s:red",
    "parsedquery": "AllParentsAware(ToParentBlockJoinQuery (color_s:red))",
    "parsedquery_toString": "ToParentBlockJoinQuery (color_s:red)",
    "QParser": "BlockJoinParentQParser",
    "filter_queries": ["brand_s:Nike", "type_s:product"],
    "parsed_filter_queries": ["brand_s:Nike", "type_s:product"],
    "explain": {
      "p1": "1.0 = ConstantScore(...)",
      "p2": "0.85 = ConstantScore(...)"
    },
    "timing": { "prepare": {...}, "process": {...} }
  }
}
```

The five keys to know:

### `parsedquery` and `parsedquery_toString`

The Java toString of the resulting Lucene Query object. **Always check this first** when debugging "my query doesn't match what I expect."

Common surprises:
- `solr and lucene` → parsedquery shows `solr OR and OR lucene` (lowercase `and` is a term)
- `field:[* TO 100]` → parsedquery shows `field:[* TO 100]` for string field but `IntPoint.newRangeQuery(field, MIN, 100)` for numeric — different types use different range query implementations
- `{!edismax qf=title_t pf=title_t^10}red` → parsedquery shows the disjunction expansion plus the phrase boost; if a phrase clause is missing, your `pf` config didn't apply

### `QParser`

Tells you which parser produced the query. If you wrote `{!edismax}` but `QParser` shows `LuceneQParser`, your local params syntax is malformed (often a missing `}` or unquoted spaces).

### `filter_queries` and `parsed_filter_queries`

Each `fq=` shown in raw and parsed form. Useful for debugging tagged filters and `{!frange}`/`{!terms}` expansions.

### `explain`

Per-result-document score breakdown. The most informative section.

### `timing`

Per-component time. If a request is slow, identify whether it's `query` (initial retrieval), `facet`, `highlighting`, or component-X overhead.

## Reading text-format explain

A typical explain entry:

```
0.6931472 = sum of:
  0.4054651 = weight(title_t:red in 5) [SchemaSimilarity], result of:
    0.4054651 = score(freq=1.0), product of:
      2.2 = boost
      0.18443707 = idf, computed as log(1 + (N - n + 0.5) / (n + 0.5)) from:
        100 = N, total number of documents with field
        85 = n, number of documents containing term
      0.99931467 = tf, computed as freq / (freq + k1 * (1 - b + b * dl / avgdl)) from:
        1.0 = freq, occurrences of term within document
        1.2 = k1, term saturation parameter
        0.75 = b, length normalization parameter
        4.0 = dl, length of field
        4.5 = avgdl, average length of field
  0.2876821 = weight(category_s:shoes in 5) [SchemaSimilarity], result of:
    0.2876821 = score(freq=1.0), product of:
      ...
```

Reading top-down:

- **Total score** is the leftmost number on the first line: `0.6931472`
- **`sum of:`** means children are summed (BooleanQuery with multiple clauses)
- Each child is a per-clause contribution
- Inside a clause: `weight(field:term in docId)` shows term, field, doc
- `[SchemaSimilarity]` is the scorer (BM25 by default in Solr 9.x)
- `score(freq=N), product of:` shows the final per-clause math
- `boost` is from `^N` in the query (or 1.0 if none)
- `idf` and `tf` are the BM25 components

When debugging "doc A should rank above doc B but doesn't":
1. Get explain for both A and B
2. Compare the top-level score
3. Identify which clauses contribute differently
4. Within a clause, check if it's `idf` or `tf` driving the difference

## BM25 mechanics in explain

Solr 9.x default similarity is BM25 with `k1=1.2`, `b=0.75`. The score for a single term in a single field is:

```
score = boost × idf × tf
```

Where:
- `idf = log(1 + (N - n + 0.5) / (n + 0.5))` — N=total docs, n=docs with term
- `tf = freq / (freq + k1 × (1 - b + b × dl / avgdl))` — saturating function of frequency

Implications you'll see in explain:
- **Common terms have low idf**. A term in 90% of docs scores ~0; a term in 1% scores high.
- **TF saturates**. Going from 1 to 2 occurrences boosts much more than 10 to 11.
- **Long documents are penalized** (vs short) when `b > 0`. A single match in a 1000-word doc scores less than the same match in a 10-word doc.

## DisjunctionMaxQuery (eDisMax/dismax) explain

eDisMax produces a DisMax (disjunction-max) tree:

```
0.5 = max plus 0.1 times others of:
  0.45 = title_t:red (...)
  0.30 = description_t:red (...)
  0.15 = category_s:red (...)
```

This is "winner takes max + tie × sum of losers" — your `tie` parameter shows here as the multiplier.

If `tie=0`:
```
0.45 = max of:
  0.45 = title_t:red ...
  0.30 = description_t:red ...
  0.15 = category_s:red ...
```

Only the highest-scoring field's contribution makes it through.

## Phrase boost (pf) explain

```
0.95 = sum of:
  0.45 = max plus 0.1 times others of:    # qf disjunction
    0.45 = title_t:red ...
    0.30 = description_t:red ...
  0.50 = title_t:"red shoes"~0 ...        # pf contribution
```

The `pf` clause shows as a phrase query weighted by its `^N` boost. If you don't see a phrase clause for multi-term queries, your `pf` isn't configured or stopwords are dropping the terms.

## Block join explain

```
1.0 = ConstantScore({!parent which=type_s:product})
```

Default block-join parent score is constant 1. If you set `score=max`:

```
0.7 = Score: 0.7 (joining with max)
```

The actual child score is propagated. The parent's own score (if any) is added separately.

## Function query explain

```
2.5 = FunctionQuery(log(sum(int(popularity_i),const(1)))), product of:
  2.5 = log(sum(int(popularity_i)=11.0,const(1.0)))
  1.0 = boost
```

Shows the function decomposition. Useful when `bf=` doesn't seem to affect ranking — check if the value is large enough relative to base scores.

## Comparing explains for two documents

The most common debugging task. Workflow:

1. Run query with `debug=true`
2. Get explain for the doc that's ranking unexpectedly low (say, ID `expected_top`) and the doc that's wrongly on top (`unexpected_top`)
3. Compare line by line

Example: "Why is product B above product A?"

```
Doc A explain (score 1.5):
  1.0 = title_t:red contribution
  0.5 = bf log(popularity)

Doc B explain (score 1.8):
  0.3 = title_t:red contribution
  0.5 = pf "red shoes" contribution    # THIS doesn't appear in A
  1.0 = bf log(popularity)
```

Conclusion: B has the phrase "red shoes" in its title; A only has "red" + "shoes" non-adjacent. The `pf` boost is the differentiator. Either:
- Re-index A with keywords reordered (if you control content)
- Increase `pf` weight if phrase match should dominate
- Decrease `pf` if you want loose matching to win

## Diagnosing common ranking surprises

### "My boost has no effect"

Check explain for the boost clause. If `0.5 = bf log(popularity)` and the rest of the score is `15.0`, the boost is irrelevant. Either:
- Increase the boost magnitude (`bf=mul(log(popularity),5)`)
- Switch to multiplicative (`boost=` instead of `bf=`)
- Reconsider whether the boost should apply at all

### "All results have similar scores"

Check `idf` values in explain. If they're all near zero, your terms are too common — every doc has them. The query carries no discriminative power. Solutions:
- Tighter `mm` to require more matching terms
- More-specific user query
- `bq=`/`bf=` to inject domain-relevant signals

### "One field dominates"

Check explain. If one field's contribution is 10× others, either:
- Its boost in `qf` is too high
- Its analyzer over-tokenizes (more matches → higher tf-summed contribution)
- Different field types (e.g., `_t` for tokenized vs `_s` for string) cause IDF to differ wildly

### "Recent docs not boosted enough"

```
1.0 = bf recip(ms(NOW,created_dt)...)
0.5 = bf recip(ms(NOW,created_dt)...)   # for an older doc
```

Difference is 0.5. If base scores are 10+, this is noise. Switch to `boost=recip(...)` to multiply, not add.

### "kNN scores don't seem to factor"

For hybrid lexical+vector, check if vector similarity is in explain. If the vector contribution is `0.01` and lexical is `5.0`, your weighting is off. RRF or rerank is more robust than direct boost combination.

## Structured explain (JSON)

```
debug.explain.structured=true
```

Produces:

```json
"explain": {
  "p1": {
    "match": true,
    "value": 0.6931472,
    "description": "sum of:",
    "details": [
      {
        "match": true,
        "value": 0.4054651,
        "description": "weight(title_t:red in 5) [SchemaSimilarity], result of:",
        "details": [...]
      }
    ]
  }
}
```

Easier to parse for tools. Useful for building "why this result" UIs in your app.

## Debug for facets

`debug=true` doesn't show facet computation by default. For facet debug:
```
facet.debug=true
```

Shows facet timing and (in some cases) intermediate counts. Less mature than query debug.

## Performance impact of debug=true

Significant — explain computation is O(matched terms × matched docs). Disable in production. For load tests, disable. Use `debug=timing` alone for performance-only debugging.

## Workflow: from "wrong results" to fix

1. **Capture the request.** Get the exact URL/JSON.
2. **Add `debug=true`.** Get parsed query and at least the top 5 explains.
3. **Verify parsing.** Does `parsedquery` match your intent? If not, fix syntax.
4. **Verify scope.** For block join, are you querying parents or children? Use `[child]` to inspect.
5. **Verify filters.** Does `parsed_filter_queries` show what you expect?
6. **Compare explains.** Top result vs expected top. What's different?
7. **Form hypothesis.** Boost too low? Field weights wrong? Pf missing?
8. **Test a single change.** Don't change three things and re-run.
9. **Re-explain.** Did the change have the effect you predicted?

This is the loop. Most "Solr is wrong" turns out to be configuration problems — explain shows you exactly where.
