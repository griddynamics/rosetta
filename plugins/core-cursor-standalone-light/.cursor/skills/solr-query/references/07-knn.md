# kNN / Dense Vector Search (Solr 9.x)

Solr 9.0+ ships with native dense-vector indexing and querying via Lucene's HNSW graph. This file covers field setup, the `{!knn}` parser, hybrid lexical+vector ranking, and the pre/post-filter trap that ruins recall.

## Field setup

In schema:
```xml
<fieldType name="knn_vector_768" class="solr.DenseVectorField" vectorDimension="768" similarityFunction="cosine"/>
<field name="embedding" type="knn_vector_768" indexed="true" stored="true"/>
```

`similarityFunction` options:
- `cosine` — most common for sentence embeddings (BERT, sentence-transformers)
- `dot_product` — assumes pre-normalized vectors; faster, equivalent to cosine if normalized
- `euclidean` — for raw distance models

`vectorDimension` must match your model's output exactly. A 768-dim model and a 1024-dim model need different field types.

`indexed=true` is required for kNN search. `stored=true` is optional (uses disk; only needed if you return the vector to the client).

HNSW tuning at index time:
```xml
<fieldType name="knn_vector_768" class="solr.DenseVectorField"
           vectorDimension="768"
           similarityFunction="cosine"
           hnswMaxConnections="32"
           hnswBeamWidth="100"/>
```

`hnswMaxConnections` (default 16) and `hnswBeamWidth` (default 100) control graph density. Higher = better recall, slower indexing, larger index. For most production use, defaults are fine.

## Indexing vectors

JSON:
```json
{
  "id": "p1",
  "name_t": "Air Max sneakers",
  "embedding": [0.012, -0.345, 0.678, ...]
}
```

Vector must be a JSON array of floats with exactly the dimension count. Wrong dimension → indexing error.

For high-volume embedding ingestion, batch updates and consider increasing `ramBufferSizeMB` in solrconfig — vector fields use significant heap during merges.

## Basic kNN query

```
q={!knn f=embedding topK=100}[0.012, -0.345, 0.678, ...]
```

Returns top 100 docs by similarity, ranked by similarity score (cosine in `[0, 1]` post-normalization).

Parameters:
- `f=` — vector field name (required)
- `topK=` — number of results to retrieve from HNSW graph (default 10)

## The pre-filter / post-filter trap

When you combine kNN with `fq`, the order matters and the default behavior is often wrong.

### Default: post-filter

```
q={!knn f=embedding topK=100}[...]
fq=in_stock_b:true
```

Solr first retrieves topK=100 from HNSW (without considering `fq`), then filters those 100 by `in_stock_b:true`. If only 5 of the top 100 vectors happen to be in stock, you get 5 results.

This is a recall disaster when filters are selective. Symptoms:
- "kNN works in dev but returns 2 results in prod"
- "Increasing topK helps but I still don't get enough results"

### Pre-filter (Solr 9.5+)

```
q={!knn f=embedding topK=100 preFilter=in_stock_b:true}[...]
```

Or pull from request:
```
q={!knn f=embedding topK=100 preFilter=$kf}[...]
&kf=in_stock_b:true AND brand_s:Nike
```

Pre-filter integrates the filter into HNSW traversal: only candidate documents matching the filter are considered. Recall is preserved at the cost of more work per traversal.

In Solr versions before pre-filter support (9.0-9.4), the workaround was to use a much higher `topK` (e.g., 1000) and accept the latency.

### Multiple filters

```
q={!knn f=embedding topK=100 preFilter='in_stock_b:true,brand_s:Nike'}[...]
```

Comma-separated for multiple. Each becomes a pre-filter clause (intersected).

Or via param refs:
```
q={!knn f=embedding topK=100 preFilter=$pf1 preFilter=$pf2}[...]
```

### Choosing topK and pre-filter combination

Rules of thumb:
- If filters are very selective (`in_stock_b:true` matches 5% of corpus): use `preFilter`, topK=number-of-results-needed × 2
- If filters are loose (matches 80%): post-filter is fine, topK=number-of-results-needed × 1.5
- If you need exact top-N regardless: use `preFilter` + topK=larger margin

## Hybrid lexical + vector

The most common production pattern combines BM25 (lexical) and kNN (semantic). Two approaches:

### Approach 1: Combined Boolean

```
q=({!edismax qf="title_t^5 brand_s^2" v=$qq})^0.5 OR ({!knn f=embedding topK=100 v=$vec})^0.5
&qq=red running shoes
&vec=[0.012, ...]
```

Each subquery contributes proportionally to the final score via boost. Tuning `^0.5` on each side lets you weight lexical vs vector contribution.

This works but the relative scales of BM25 (open-ended, often 5-30) and cosine similarity (0-1) make weighting fiddly.

### Approach 2: Reciprocal Rank Fusion (RRF) — Solr 9.7+

```
q={!rrf}{!edismax qf=title_t v=$qq}|{!knn f=embedding v=$vec topK=100}
```

(Syntax may vary; check Solr docs for your specific version.)

RRF combines rankings from multiple queries using `1 / (k + rank)` per source. It's robust to scale differences between scoring methods. This is the recommended hybrid approach in 9.7+.

### Approach 3: Re-rank top-N

```
q={!edismax qf=title_t v=$qq}
rq={!rerank reRankQuery=$rqq reRankDocs=200 reRankWeight=2.0}
&rqq={!knn f=embedding topK=200 v=$vec}
```

The lexical query produces the candidate set; the kNN query re-scores the top 200. Useful when you trust lexical for retrieval and want vectors to refine ordering.

## Vector as input from another field

Solr can use a vector stored on a document as the query vector — useful for "more like this":

```
q={!knn f=embedding topK=10 v=field('embedding','p1')}
```

Looks up document `p1`, reads its `embedding` field, uses it as the query vector. Returns the 10 most similar documents (including p1 itself unless filtered out).

## Filtering + scoring with kNN

```
q={!knn f=embedding topK=100 preFilter=in_stock_b:true}[...]
fq=brand_s:Nike
sort=score desc
fl=id,name_t,score
```

`fq` after pre-filtered kNN: an additional cache-able filter applied to the topK result set. Doesn't affect kNN traversal but does post-filter.

`sort=score desc` is the default for `{!knn}` since the query produces relevance scores. You can override:
```
sort=price_f asc
```
to override semantic ordering with a price sort (still showing only the kNN top results).

## Inspecting kNN behavior

`debug=true` shows:
```
"parsedquery": "DocAndScoreQuery[100,...]",
"explain": {
  "p1": "0.873 = within top K vectors at distance 0.873"
}
```

The explain is less informative than for BM25 — vector queries don't decompose into per-term contributions.

If results look wrong, sanity-check:
1. Vector dimension matches field config (server log will show `IllegalArgumentException` on mismatch)
2. Query vector is L2-normalized if using `cosine` (some libraries don't normalize by default)
3. `topK` is large enough relative to filtering selectivity
4. Embeddings were computed by the same model at index and query time

## Common mistakes

### Mismatched vector dimension
Indexing with 768-dim vectors but querying with 384-dim → `IllegalArgumentException` at query time. Sometimes caught at indexing, sometimes only at query. Pin model versions.

### Forgetting to normalize for cosine
Many embedding libraries return raw vectors; `cosine` similarity assumes unit length. If unnormalized, Solr still computes cosine correctly (it normalizes internally for cosine), but `dot_product` similarity will give wildly wrong results on unnormalized vectors.

### Using post-filter on selective filters
Already covered. Symptom: empty result sets. Switch to `preFilter`.

### topK too small
With post-filter and selective fq, topK=10 returns 0-2 results. Either raise topK or use preFilter.

### Reusing vector across model versions
Embedding model upgraded from v1 to v2. Old documents have v1 vectors; new query uses v2 vector. Distance is meaningless. Re-index ALL documents on model change.

### Storing vectors unnecessarily
`stored=true` doubles disk usage. Only set when you need to retrieve vectors via `fl=embedding` (rare).

### Vector field with no indexed flag
`indexed=true` is required. Without it, the field stores values but kNN queries fail to find candidates.

### Mixing similarity functions across fields
Per-field, but if you have two vector fields with different `similarityFunction`, hybrid queries combining them are not directly comparable. Use re-rank or RRF, not boolean OR with boosts.

## Performance characteristics

- HNSW search is O(log N) per query — scales well with corpus size
- Filtered kNN with `preFilter` can be slower if filter selectivity is very low (forces more graph exploration)
- Indexing throughput drops significantly with vector fields — budget 2-5x slower than scalar-only docs
- Memory: HNSW graph is held in heap. Plan ~`vectorDimension * 4 bytes * N docs * (1 + max_connections)` overhead

For corpus > 10M vectors, consider sharding.

## When NOT to use kNN

- Pure substring/prefix matching needs (use `EdgeNGram`)
- Exact attribute matching (use `term`/`field` parsers)
- Simple boolean retrieval (BM25 / eDisMax is faster)
- When you don't have a tuned embedding model for your domain — generic models can underperform good lexical search
