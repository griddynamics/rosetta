# Common Errors and Anti-Patterns (Cross-Cutting)

This file collects the mistakes that cut across query categories — wrong parser choice, mis-scoped clauses, escaping issues, performance traps. For topic-specific errors, see the relevant reference (block-join errors in `04-block-join.md`, kNN errors in `07-knn.md`, etc.).

## Parser confusion

### `{!parser}` parameter swaps in block join

```
{!child which=...}    # WRONG: child uses `of=`
{!parent of=...}      # WRONG: parent uses `which=`
```

Mnemonic: parent has children, so child query → return parent uses `which` (which parents). Going the other way, `{!child of=parent_filter}` reads naturally: "children OF this parent set."

### Restrictive Block Mask

```
{!parent which="type_s:product AND brand_s:Nike"}    # WRONG
```

The `which` parameter defines block boundaries. Filter parents through `fq=brand_s:Nike` separately.

### `{!edismax}` for filters

```
fq={!edismax qf="title_t^5"}red shoes    # WRONG: fq doesn't score
```

eDisMax exists to produce ranking scores. `fq` is cached and binary — pass/fail. Use `lucene` or specific parsers for filters.

### Made-up parsers

```
{!phrase ...}      # not a parser
{!wildcard ...}    # not a parser
{!regexp ...}      # not a parser
{!exact ...}       # not a parser
{!or ...}          # not a parser
```

Real parsers are listed in `02-local-params.md`. For phrase queries, use `field:"phrase"` or `{!complexphrase}`. For wildcards/regex, use inline syntax.

## Boolean and operator mistakes

### Lowercase boolean

```
q=solr and lucene    # parses as: solr OR and OR lucene
```

Operators must be UPPERCASE: `AND`, `OR`, `NOT`. Lowercase is a term.

### `&` as AND

```
q=field1:a&field2:b    # & is HTTP separator, not boolean
```

`&` separates HTTP query params. Use `AND`:
```
q=field1:a AND field2:b
```

### Implicit OR in child query

```
q={!child of="type_s:product"}status:approved price:[100 TO 500]
```

Default operator (without `q.op=AND`) is OR — this matches docs with `status:approved` OR `price:[100 TO 500]`. Add explicit AND or use `+`:
```
q={!child of="type_s:product"}+status:approved +price:[100 TO 500]
```

### Multiple AND/OR operators

```
q=a AND OR b           # syntax error
q=a OR AND b           # syntax error
q=a AND AND b          # syntax error
```

Common when concatenating fragments programmatically. Filter out empty pieces before joining.

## Escaping and special characters

### Special chars in IDs

```
fq=sku_id:ABC-123/XL    # parses ABC and 123 separately due to /
```

Solutions:
- `fq={!term f=sku_id}ABC-123/XL` — bypass parser, handle as one TermQuery
- `fq=sku_id:ABC\-123\/XL` — backslash-escape
- `fq=sku_id:"ABC-123/XL"` — quoting works for some chars

`{!term}` is cleanest for non-tokenized fields with weird IDs.

### Unbalanced quotes / parens

Common parse errors trace back to unmatched `"` or `(`. Search the query string for them first.

### Regex with special meta chars

```
q=field:/[Ss]olr 9.x/    # the `.` in 9.x is a wildcard
q=field:/[Ss]olr 9\.x/   # literal dot
```

Lucene regex follows Java conventions. Inside `/.../`, dot is wildcard.

## Filter query mistakes

### `OR` chain instead of `{!terms}`

```
fq=sku_id:(100 OR 101 OR 102 OR ... OR 199)    # 100-clause BooleanQuery
fq={!terms f=sku_id}100,101,102,...,199        # one TermInSetQuery
```

For >10 values, `{!terms}` is faster. For >100, the difference is large.

### Forgetting `cache=false` on per-request filters

```
fq={!frange l=$user_threshold}div(sales, views)
```

If `user_threshold` varies per request, every request creates a new filterCache entry. Eventually evicts everything else.

```
fq={!frange l=$user_threshold cache=false cost=100}div(sales, views)
```

`cache=false` to skip cache. `cost=100` so this expensive filter runs after cheap ones narrow the set.

### `must` vs `filter` in `{!bool}`

```
{!bool must=type_s:sku must=color_s:red}        # both contribute to score
{!bool filter=type_s:sku filter=color_s:red}    # cached, no score
```

For non-scoring constraints (almost all `fq` content), use `filter=`. `must=` is appropriate inside `q` for constraints that should score.

## Scope confusion (block join + facets)

### `_root_` in 3-level hierarchy

```
collection → product → sku
```

`_root_` always points to the topmost ancestor (`collection`). `uniqueBlock(_root_)` from SKU scope counts unique collections, not unique products.

To count unique products from SKU scope, index a `parent_product_id_s` field on each SKU and use `uniqueBlock(parent_product_id_s)`.

### Facet on wrong-scope field

```json
"by_color": {
  "type": "terms", "field": "color_s",
  "domain": { "blockParent": "type_s:product" }   // WRONG: color is on child
}
```

After `blockParent`, you're at parent scope. If `color_s` is a child attribute, the facet sees zero. Either:
- Don't transition: facet at child scope (current scope, no `blockParent`)
- Transition to children if you started at parent: `blockChildren`

### Facet excludeTags doesn't apply across scope transitions

If a filter is tagged at one block level and the facet runs at another, the tag/exclude works as long as the filter is on the request — Solr knows what to exclude. But if you're confused about WHEN scope changes happen, debug with simple test cases first.

## JSON Facets mistakes

### `uniqueBlock` as facet type
```json
{ "type": "uniqueBlock", "field": "_root_" }    # WRONG
"unique_count": "uniqueBlock(_root_)"            # CORRECT (it's a metric)
```

### `uniqueBlock` as a property
```json
{ "type": "terms", "field": "color_s", "uniqueBlock": "_root_" }    # WRONG
{ "type": "terms", "field": "color_s",
  "facet": { "u": "uniqueBlock(_root_)" } }                          # CORRECT
```

### Wrong `domain` key
```json
"domain": { "exclude": ["X"] }           # silently ignored
"domain": { "excludeFilters": ["X"] }    # silently ignored
"domain": { "excludeTags": ["X"] }       # correct
```

Solr does not warn about unknown `domain` keys.

### Sort by undefined metric
```json
{ "type": "terms", "field": "brand_s",
  "sort": "avg_price desc"                     # ERROR if avg_price isn't defined
  // missing: "facet": { "avg_price": "avg(price_f)" }
}
```

## Distributed mode (SolrCloud) mistakes

### Top-N facets without overrequest
With sharded indexes, facet `limit=10` may miss correct top-10 because each shard returns its top 10 — the global top 10 may be a shard's #11. Use `overrequest=50` minimum, `refine=true` for accuracy.

### kNN routing
HNSW graph is per-shard. kNN with sharded index searches each shard's graph and merges. Recall depends on per-shard `topK` allocation. For exact recall, route documents intentionally and query specific shards.

### `_route_` parameter forgotten
For block join with custom routing, ensure `_route_` is set so updates and queries hit the right shard:
```
&_route_=p1!
```

Without this, blocks may split across shards and block join queries return wrong results.

## Performance traps

### Leading wildcard
```
q=title_t:*solr*
```

Iterates the term dictionary. Slow on large fields. Use:
- `EdgeNGramFilter` for prefix
- `ReversedWildcardFilterFactory` for suffix
- N-gram for substring

### Faceting on tokenized text fields
```
facet.field=description_t    # description_t is tokenized text
```

Counts every distinct token in the field across all docs — usually millions of values. Always facet on `_s` (string) fields, not `_t` (text).

### Deep paging
```
start=10000&rows=20
```

Solr (without `cursorMark`) sorts and skips. Cost grows linearly with `start`. For deep paging, use `cursorMark`:
```
sort=id asc&cursorMark=*&rows=20
```

Then on subsequent requests, pass the returned `nextCursorMark`.

### `rows=1000000`
Returning a million docs in one request: huge response payload, hash-table overflow, slow JSON serialization. Page or use Streaming Expressions for bulk export.

### Faceting with `mincount=0`
For high-cardinality fields, returns ALL distinct values, not just matching ones. Use `mincount=1` (default) unless you specifically need empty buckets.

## Schema/query mismatch

### Searching tokenized field as exact
```
fq=description_t:red running shoes    # tokenized; matches each word independently
```

If you want exact phrase match, quote it:
```
fq=description_t:"red running shoes"
```

Or use a `_s` field for exact-match attributes.

### Wildcard against analyzed field
```
fq=name_t:Foo*    # wildcard bypasses analyzer
```

If `name_t` is lowercased at index time, indexed terms are `foo`, `bar`, etc. `Foo*` won't match. Lowercase the wildcard term:
```
fq=name_t:foo*
```

This is one of the most common sources of "wildcard matches nothing" reports.

### Searching missing field
```
fq=brand_s:Nike    # if brand_s doesn't exist in schema
```

Returns "undefined field: brand_s" error in Solr 9.x by default. In some legacy modes, returns nothing silently. Verify field with `/schema/fields/brand_s`.

## Edge cases

### Empty query string with eDisMax
```
q=
```

Returns no results (matches nothing) by default. Set `q.alt=*:*` to fall back:
```
q=
q.alt=*:*
```

This makes empty queries return everything — useful for "show all" pages.

### Negative-only query
```
q=-field:value    # all docs except matching
```

In some parsers, this errors. Wrap with `*:*`:
```
q=*:* -field:value
```

eDisMax handles this better than lucene.

### Negation inside boolean group
```
q=type:product AND -discontinued:true
```

Works in lucene. Inside `{!parent}` body or other parser-specific contexts, may need explicit positive clause.

### Quoting a single-word phrase
```
fq=name_s:"Nike"    # phrase query of one term — equivalent to fq=name_s:Nike
```

Harmless. Sometimes needed for consistency in code generation.
