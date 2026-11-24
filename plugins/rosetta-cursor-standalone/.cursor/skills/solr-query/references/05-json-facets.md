# JSON Facets

The JSON Facets API replaces the legacy `facet.field=` style with a tree-structured, sub-faceting-capable system. This file covers terms/range/query facets, sub-facets, the `domain` mechanism (block transitions, exclusion, filtering), and the surprises in distributed mode.

For multi-select faceting (tag/exclude pattern), see `06-tag-exclude.md`.

## Why JSON Facets

The legacy facet API can't:
- Nest facets (sub-facets per bucket)
- Compute multiple metrics per bucket
- Transition between block scopes within faceting
- Switch domains mid-tree

If you need ANY of those, use JSON Facets. If you only need flat term counts, the legacy API is fine but JSON is more consistent.

## Anatomy

```json
{
  "query": "*:*",
  "facet": {
    "by_brand": {
      "type": "terms",
      "field": "brand_s",
      "limit": 20,
      "sort": "count desc",
      "facet": {
        "avg_price": "avg(price_f)",
        "by_color": { "type": "terms", "field": "color_s", "limit": 5 }
      }
    },
    "price_buckets": {
      "type": "range",
      "field": "price_f",
      "start": 0,
      "end": 1000,
      "gap": 100
    },
    "in_stock": {
      "type": "query",
      "q": "stock_i:[1 TO *]"
    }
  }
}
```

The `facet` block sits at the top level (HTTP request body) or as `json.facet` URL param value (escaped). Each named bucket is `name: { type, ... }`.

## Facet types

There are exactly four:

### `terms` — group by field values

```json
{ "type": "terms", "field": "brand_s", "limit": 20, "mincount": 1 }
```

Useful params:
- `limit` — top N (default 10; `-1` for unlimited)
- `mincount` — minimum count to include (default 1)
- `sort` — `count desc` (default), `count asc`, `index asc`, or by sub-metric: `"my_metric desc"`
- `offset` — for paging
- `missing` — include count of docs without the field (default false)
- `numBuckets` — return total distinct value count (expensive in distributed)
- `prefix` — only include values with this prefix
- `overrequest` — for distributed accuracy (default 10; raise to 50+ for high-cardinality)
- `refine` — `true` for refinement pass in distributed (more accurate, more requests)

### `range` — bucket numeric/date values

```json
{
  "type": "range",
  "field": "price_f",
  "start": 0,
  "end": 1000,
  "gap": 100,
  "other": "after",
  "include": "lower"
}
```

`other` adds buckets for values outside the range: `"before"`, `"after"`, `"between"`, `"all"`, `"none"`.
`include` controls bucket boundary inclusion: `"lower"` (default; `[start, end)`), `"upper"`, `"edge"`, `"outer"`, `"all"`.

For dates:
```json
{ "type": "range", "field": "created_dt", "start": "NOW/DAY-7DAYS", "end": "NOW/DAY+1DAY", "gap": "+1DAY" }
```

### `query` — single bucket from arbitrary filter

```json
{ "type": "query", "q": "stock_i:[1 TO *]" }
```

Returns one count. Useful for binary metrics ("how many in stock?") or building dashboards.

### `heatmap` — spatial aggregation

For geo points: aggregates into a grid. See `09-function-spatial.md`.

## Metrics

A metric is a string-valued aggregation, used as a sibling of nested facets:

```json
{
  "type": "terms", "field": "brand_s",
  "facet": {
    "avg_price": "avg(price_f)",
    "max_price": "max(price_f)",
    "stock_total": "sum(stock_i)",
    "doc_count": "unique(id)",
    "products_per_brand": "uniqueBlock(_root_)"
  }
}
```

Available metrics:
- `sum(field)`, `avg(field)`, `min(field)`, `max(field)`, `sumsq(field)`
- `unique(field)` — approximate cardinality (HyperLogLog)
- `hll(field)` — same, explicit
- `unique_block(field)` / `uniqueBlock(field)` — count of distinct **block roots** (block-aware unique)
- `countvals(field)` — count of values (for multivalued fields)
- `missing(field)` — count of docs without the field
- `percentile(field, 50, 90, 99)` — percentile values
- `stddev(field)`, `variance(field)`
- `relatedness(...)` — for "interesting terms" analysis

Each metric is a string. **Not** an object. **Not** a `type`.

```json
"my_count": "unique(id)"           // CORRECT
"my_count": { "type": "unique", "field": "id" }   // WRONG: no such facet type
```

This is the #1 mistake with metrics — treating them as facets.

### `uniqueBlock(field)` — block-aware unique

In a block-join index, `uniqueBlock(_root_)` counts **distinct root parent IDs** in the current scope.

```json
{
  "facet": {
    "by_color": {
      "type": "terms",
      "field": "color_s",
      "domain": { "blockChildren": "type_s:product" },
      "facet": {
        "unique_products": "uniqueBlock(_root_)"
      }
    }
  }
}
```

This counts how many distinct products have at least one SKU of each color.

In a 3-level hierarchy (collection → product → sku), `_root_` is the **collection**, not the product. To count unique products from SKU scope, you need a `parent_product_id_s` field on each SKU.

## Sub-facets (nesting)

A facet can nest more facets inside. They run in the scope of the parent bucket:

```json
{
  "by_brand": {
    "type": "terms", "field": "brand_s", "limit": 10,
    "facet": {
      "by_color": { "type": "terms", "field": "color_s", "limit": 5 },
      "avg_rating": "avg(rating_f)",
      "price_distribution": {
        "type": "range", "field": "price_f",
        "start": 0, "end": 500, "gap": 100
      }
    }
  }
}
```

Reads: "for each top brand, give me the top colors, the average rating, and a price-range histogram."

You can sort the parent facet by a sub-metric:
```json
{
  "by_brand": {
    "type": "terms", "field": "brand_s", "limit": 10,
    "sort": "avg_rating desc",
    "facet": { "avg_rating": "avg(rating_f)" }
  }
}
```

Sub-facets are evaluated for each bucket of the parent. For high cardinality with deep nesting, this is the slowest part of JSON Facets — limit aggressively.

## The `domain` mechanism

`domain` lets a facet operate on a different document set than its parent. Five kinds of transitions:

### `excludeTags` — multi-select faceting

```json
"domain": { "excludeTags": ["BRAND"] }
```

Removes filters tagged `{!tag=BRAND}` from this facet's domain. See `06-tag-exclude.md`.

### `blockChildren` — descend to children

```json
"domain": { "blockChildren": "type_s:product" }
```

The value is the **parent filter** (Block Mask). The facet now sees children. Use when the main query returns parents but you want to facet on child attributes.

### `blockParent` — ascend to parents

```json
"domain": { "blockParent": "type_s:product" }
```

The value is, again, the **parent filter** (Block Mask). The facet now sees parents. Use when the main query returns children but you want to count distinct parents.

### `filter` — narrow the domain

```json
"domain": { "filter": "in_stock_b:true" }
```

Adds a filter applied just to this facet's domain.

To use a request-param reference:
```json
"domain": { "filter": "{!query v=$sf}" }
```

Direct `"filter": "$sf"` does NOT dereference — it's interpreted as a literal query string `$sf`. Wrap with `{!query v=$param}`.

### `query` — replace the domain entirely

```json
"domain": { "query": "type_s:product AND in_stock_b:true" }
```

Throws away the current scope and runs against this query. Rare; usually `filter` is what you want.

### Combining

```json
"domain": {
  "blockChildren": "type_s:product",
  "filter": "stock_i:[1 TO *]",
  "excludeTags": ["COLOR"]
}
```

Order: scope is set by the block transition first, then filters narrow it, then exclusions remove tagged filters.

## Distributed mode caveats

In SolrCloud (sharded), JSON Facets gather counts per shard, then merge. This has accuracy implications:

### `terms` with `limit` may be undercounted

If a term is the 11th most common in shard A but the 1st in shard B, a `limit=10` per-shard query may miss it from A. The merged top-N can be wrong.

Mitigation:
- `overrequest=N` — fetch N more per shard to improve merge accuracy (default 10; use 50-100 for high-cardinality)
- `refine=true` — second-pass refinement: shards report exact counts for the merged candidates. Slower but accurate.

For e-commerce facets where users see exact counts, `refine=true` is usually worth the latency.

### `numBuckets` is expensive

`numBuckets=true` requires every shard to compute total distinct cardinality. Cost grows with cardinality.

### `unique(field)` is approximate

Uses HyperLogLog. Error ~1-2% in typical use. For small cardinalities or small datasets, it's exact. For "give me the EXACT distinct count," use `numBuckets` on a `terms` facet with high `limit`.

### `uniqueBlock` distributed

`uniqueBlock(_root_)` is correct in distributed mode IF documents in a block all live on the same shard. This is true when you index with the route key being the root ID (Solr's default with `_root_`). Verify with `_route_` param.

If blocks are split across shards (e.g., custom routing without `_root_` consideration), `uniqueBlock` is wrong.

## Performance hints

- High-cardinality `terms` facets (10k+ distinct values) — use `unique(field)` for cardinality estimation rather than full enumeration
- Deeply nested facets (3+ levels) — flatten where possible; each level multiplies work
- `range` facets are cheap; prefer them over many `query` facets for histograms
- `limit=-1` (unlimited) — never use in distributed; merging cost explodes
- For numeric range facets that always look the same, consider docValues (already on by default for numeric) — orders of magnitude faster than UninvertedField

## Common mistakes

### `uniqueBlock` as a facet type
```json
"x": { "type": "uniqueBlock", "field": "_root_" }    // WRONG
"x": "uniqueBlock(_root_)"                            // CORRECT
```

### `uniqueBlock` as a property
```json
"x": { "type": "terms", "field": "color", "uniqueBlock": "_root_" }   // WRONG
"x": { "type": "terms", "field": "color",
       "facet": { "u": "uniqueBlock(_root_)" } }                      // CORRECT
```

### Excluded tag name doesn't match
Tag names are case-sensitive. `{!tag=BRAND}` matches `excludeTags=["BRAND"]` but not `excludeTags=["Brand"]` or `excludeTags=["brand"]`.

### `excludeFilters` instead of `excludeTags`
Wrong key name. Solr silently ignores unknown `domain` keys. The facet runs as if no exclusion was specified.

### `blockChildren` value is a child filter
```json
"domain": { "blockChildren": "type_s:sku" }    // WRONG: this is a child filter
"domain": { "blockChildren": "type_s:product" } // CORRECT: parent (Block Mask)
```

### Nested facet on a metric
```json
"by_brand": {
  "type": "terms", "field": "brand_s",
  "facet": {
    "avg_price": {
      "facet": { "by_color": ... }              // WRONG: avg_price is a metric, not a facet
    }
  }
}
```

Metrics are leaves. Only facet types (terms/range/query/heatmap) can have nested `facet`.

### `mincount=0` requesting all values
For a `terms` facet, `mincount=0` is dangerous on high-cardinality fields — Solr will enumerate every distinct value, not just the matching ones. Use this only for low-cardinality enums.

### Sort by a metric that doesn't exist in the bucket scope
```json
"by_brand": {
  "type": "terms", "field": "brand_s",
  "sort": "avg_price desc"            // ERROR if avg_price isn't defined here
  // missing "facet": { "avg_price": "avg(price_f)" }
}
```

The sort key must be either `count` or a metric defined as a sibling sub-facet.

## Top-level filter for facets only

Sometimes you want facets to run against a different document set than the main query. Use top-level `domain`:

```json
{
  "query": "*:*",
  "facet": {
    "_facets_only_": {
      "type": "query",
      "q": "*:*",
      "domain": { "filter": "in_stock_b:true" },
      "facet": {
        "by_color": { "type": "terms", "field": "color_s" }
      }
    }
  }
}
```

A `type: query` wrapper at the top, then nested facets inside it. The wrapper's `domain` applies to all its children.
