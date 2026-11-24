# Local Params and Parser Selection

Local params (`{!parser key=value ...}`) are how you select a query parser and pass parameters to it within a query string. This file covers the syntax in detail, parameter dereferencing, and the parsers that are most useful (and most misused).

## Syntax

```
{!parserName key1=value1 key2="value with spaces" key3=$paramRef}query body
```

Anatomy:
- `{!` `}` — local params delimiters (Solr-specific, not Lucene)
- `parserName` — short name registered in Solr (`lucene`, `edismax`, `term`, `terms`, `field`, `parent`, `child`, `bool`, `frange`, `func`, `geofilt`, `bbox`, `join`, `knn`, `complexphrase`)
- `key=value` — parameter pairs; values without spaces don't need quoting
- `$paramRef` — dereferences another request parameter
- `query body` — everything after `}` is parser-specific input

You can omit `parserName` to inherit the default (or use `type=`):
```
{!cache=false v=$qq}                    # parser inherited (lucene by default)
{!type=edismax qf=$qf}red shoes         # equivalent to {!edismax qf=$qf}red shoes
```

The `v` parameter is a special way to put the query body inside the local params instead of after `}`:
```
{!parent which=type:product v="color_s:red"}
```
is equivalent to:
```
{!parent which=type:product}color_s:red
```

`v=$param` is the canonical pattern for dereferencing a request param into a parser body.

## Quoting and escaping

When a value contains spaces, quote it:
```
{!edismax qf="title_t^5 brand_s^2" pf="title_t^10"}
```

To include a literal `"` inside a quoted value, escape with backslash:
```
{!term f="weird field name with \"quotes\""}foo
```

To include `}` inside a value (rare), quote it. Inside an HTTP URL, also URL-encode special chars.

## Parameter dereferencing

`$paramName` references another HTTP request parameter:
```
q={!parent which=$pq v=$cq}
&pq=type_s:product
&cq=color_s:red
```

This is essential for two reasons:
1. **Reusing complex sub-queries** without escaping nightmares
2. **Caching** — request params hash differently than inlined values; dereferencing lets you parameterize without breaking filterCache hits

You can chain dereferences:
```
&q={!parent which=$pq v=$cq}
&pq=$ptype
&ptype=type_s:product
```

The depth limit is 8 by default.

`$param` works in **any** local param value, including inside `qf=$qf`, `bq=$bq`, etc. This is heavily used in production to keep request bodies clean.

## The standard parsers — when to use which

### `{!lucene}` (default)

Full Lucene syntax. Use for filters and machine-constructed queries. Default for `q` and `fq` if no `{!...}` and no `defType`.

```
fq=status_s:active AND price_f:[10 TO 100]
```

### `{!term f=FIELD}` — single TermQuery, no parsing

Bypasses the Lucene parser. The entire body becomes one term. **No special chars to escape**, no operators recognized.

```
fq={!term f=sku_id}ABC-123/XL          # works
fq={!term f=sku_id}A AND B             # treats "A AND B" as one term — almost certainly wrong
```

Use for non-tokenized fields with values containing special chars: SKUs, paths, IDs.

For **tokenized fields**, `{!term}` produces a TermQuery against a single token, which usually misses most documents. Use `{!field}` instead for FieldType-aware single-value queries on text fields.

### `{!field f=FIELD}` — FieldType-aware

Runs the value through the field's analyzer at query time, producing the right query type for the field. For a text field, it produces a phrase query if multiple tokens result.

```
fq={!field f=description_t}red running shoes    # PhraseQuery against analyzed terms
```

Useful when you have a text field and want exact-after-analysis matching.

### `{!terms f=FIELD}` — TermInSetQuery for many values

For filtering on a long list of exact values, this is dramatically faster than `field:(a OR b OR c OR ...)`:

```
fq={!terms f=sku_id}100,101,102,103,104,105,106,107,108,109,110
```

Default separator is comma. To use another:
```
fq={!terms f=sku_id separator=|}100|101|102
fq={!terms f=tag_s separator=" "}red green blue
```

`{!terms}` works on string and numeric fields. For text fields, each comma-separated value is one token (not analyzed) — so it has the same gotcha as `{!term}`.

Performance: for >10 values, `{!terms}` beats `OR`-chains. For <5 values, similar. The crossover depends on filterCache state.

### `{!bool}` — explicit boolean construction

Useful when constructing complex filters from parameters:
```
{!bool must=type_s:sku must=color_s:red filter=brand_s:Nike must_not=discontinued_b:true}
```

`must` clauses contribute to score (rare for fq context). `filter` clauses are cached and don't score. For non-scoring use (which is almost all fq), prefer `filter=`:

```
{!bool filter=type_s:sku filter=color_s:red filter=brand_s:Nike}
```

Each `filter=` is independently cached — three distinct filterCache entries. This is desirable for combinations that recur with different individual clauses.

`{!bool}` accepts `should=`, `must=`, `must_not=`, `filter=`. Repeat as needed.

### `{!frange}` — function range

Filters on the result of a function:
```
fq={!frange l=0 u=100}price_f
fq={!frange l=10 incl=false}div(sales_i,views_i)        # ratio > 10, exclusive
```

Heavy: every doc must be evaluated. Avoid as the primary filter; use as a refinement.

### `{!func}` — wraps a function as a query (for scoring)

```
q={!func}sum(field_a, field_b)
```

Rare in user-facing queries; common in `bf=` for eDisMax.

### `{!parent}` / `{!child}` — block join

See `04-block-join.md`. `which=` on parent, `of=` on child. **Do not swap them.**

### `{!join}` — cross-document join

```
q={!join from=parent_id_s to=id_s}category_s:books
```

This is a relational join, very expensive on large indexes. If you can use block join instead, do.

### `{!geofilt}` / `{!bbox}` — spatial

See `09-function-spatial.md`.

### `{!knn}` — dense vector

See `07-knn.md`.

### `{!complexphrase}`

Phrases with wildcards or booleans inside. See `01-lucene-syntax.md`.

## Parsers that DO NOT exist

These get invented by people (and by LLMs); they are not real Solr parsers:

- `{!phrase}` — use `field:"phrase"` or `{!complexphrase}`
- `{!wildcard}` — use `field:val*` inline
- `{!regexp}` or `{!regex}` — use `field:/pattern/` inline
- `{!exact}` — use `{!term}` or `{!field}` depending on field type
- `{!or}` / `{!and}` — use `{!bool}` or `{!lucene}`
- `{!not}` — use `{!bool must_not=...}` or Lucene `-clause`

If you're not sure if a parser exists: it must appear in `solr/server/solr/configsets/_default/conf/solrconfig.xml` under `<queryParser>` registrations, or be a built-in (the list above is complete for built-ins in Solr 9.x).

## Caching behavior

For `fq=` clauses:
- `{!cache=false}` — skip filterCache lookup and storage. Use for filters that change every request (e.g., user-specific).
- `{!cost=N}` — control evaluation order. Lower-cost filters run first. Spatial and frange should have higher cost (e.g., `cost=100`) so cheap filters narrow the set first.
- `{!cache=false cost=100}` — common combination for expensive non-cacheable filters.

```
fq={!cache=false cost=100}{!frange l=0.8}similarity(...)
```

Without `cache=false`, every distinct frange parameter would create a new filterCache entry — exhausting it.

## Implicit vs explicit parser

When you write:
```
q=red shoes
defType=edismax
qf=title_t^5
```

The query is parsed by `edismax` because `defType=edismax`. The `qf` parameter is a **request parameter**, not a local param.

When you write:
```
q={!edismax qf="title_t^5"}red shoes
```

The query is parsed by `edismax` because of the local params. The `qf` is a **local param**.

These are equivalent in effect but the second form is what you use inside `fq` (where `defType` doesn't apply) and in JSON Request API for clarity. The first form is more common in URL-style requests.

When mixing: local params win over request params for the same key.

## JSON Request API equivalents

```json
{
  "query": "{!edismax qf=$qf v=$qq}",
  "params": {
    "qq": "red shoes",
    "qf": "title_t^5 brand_s^2"
  },
  "filter": [
    "{!terms f=sku_id}100,101,102",
    "in_stock_b:true"
  ]
}
```

Note `query` (not `q`), `filter` (not `fq`). `params` is the JSON way to define dereferenceable values. `filter` is an array of strings, each parsed as a separate `fq`.

## Debugging parser dispatch

When unsure which parser ran, set `debug=query` and inspect:
- `parsedquery` — the Java toString of the resulting query
- `parsedquery_toString` — same, more readable
- `QParser` — name of the parser that produced it

Example:
```
"debug": {
  "rawquerystring": "{!parent which=type_s:product}color_s:red",
  "querystring": "{!parent which=type_s:product}color_s:red",
  "parsedquery": "AllParentsAware(ToParentBlockJoinQuery (color_s:red))",
  "QParser": "BlockJoinParentQParser"
}
```

If `QParser` is not what you expected, your local params syntax is malformed (often a missing closing `}` or unquoted spaces).
