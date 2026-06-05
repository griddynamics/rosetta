# Document Transformers: `[child]`, `[subquery]`, and friends (Solr 9.x)

Document transformers run **per result document** during response building. They produce additional fields on the doc — most often by fetching related documents (children, parent, "more like this") or computing derived values.

This file covers the built-in transformers most relevant to production e-commerce work, with a focus on the `[child]` vs `[subquery]` performance tradeoff that bites people. For writing your own transformer, see the **solr-extending** skill.

## The big picture

A request with `fl=*,foo:[transformerName arg1=val1 arg2=val2]` runs the transformer for every doc in the result page. So:
- If `rows=10`, the transformer runs 10 times
- If `rows=1000`, the transformer runs 1000 times
- The cost per doc matters, a lot

Transformer name conventions:
- `fl=*,[transformerName]` — transformer adds field with default name
- `fl=*,custom:[transformerName]` — transformer adds field named `custom`
- `fl=*,a:[childquery],b:[childquery]` — same transformer twice with different result field names (only some transformers support this; `[child]` and `[child-subquery]` do)

Transformer parameters use **dotted scope**: anything passed as `field.paramName=value` (where `field` is the result field name) becomes `paramName` for that transformer instance. Crucial for `[subquery]` and `[child-subquery]` — see below.

---

## `[child]` — built-in block-join children

```
fl=*,[child parentFilter="type_s:product" childFilter="color_s:red" limit=5]
```

Returns each parent's matching children (or all children if no `childFilter`) under a `_childDocuments_` key on the parent doc.

Required parameter:
- `parentFilter=` — the Block Mask (parent filter that defines block boundaries — same rules as `which=`/`of=` in `{!parent}`/`{!child}` parsers)

Optional:
- `childFilter=` — restrict which children to include
- `limit=` — max children per parent (default 10)
- `fl=` — fields to include on children (default: all stored)

### How `[child]` works under the hood

For each parent doc:
1. Find segment containing the parent
2. Use `BitSetProducer` (built from `parentFilter`) to find the previous-parent boundary in this segment
3. Walk doc IDs from previous-parent + 1 up to current parent (these are the children)
4. Apply `childFilter` to each
5. Materialize matching children up to `limit`

Cost is **O(children-per-block)** per parent, even if you only want a few. For wide blocks (a product with 200 SKUs), every result-page parent triggers a 200-child walk.

### When `[child]` is the right tool

- You always want all children (or close to all)
- Block sizes are small (≤20 children typical)
- `childFilter` is selective enough that you'll see most of them with low effective scan
- You don't need to sort children, or default segment order is fine

### When it hurts

- Wide blocks (100+ children) but you want only top 5
- Need to sort children by a child field (`[child]` doesn't sort)
- Children are needed only for some parents (waste of work for the rest)
- Multi-level hierarchy where you want different children for different result types

---

## `[subquery]` — execute a real subquery per parent

```
fl=*,sku_summary:[subquery]
&sku_summary.q={!terms f=parent_id_s}$row.id
&sku_summary.fl=sku_id,price_f,stock_i
&sku_summary.sort=price_f asc
&sku_summary.rows=5
&sku_summary.fq=in_stock_b:true
```

Returns a full DocList in `sku_summary` field for each parent — exactly like running an independent search.

### How parameters work

Every param prefixed with the result field name (here `sku_summary.`) gets shifted into the subquery's request. So `sku_summary.q=...` becomes the subquery's `q=...`, `sku_summary.rows=5` is the subquery's `rows=5`, and so on.

The magic is `$row.id` — at execution, this gets replaced with the value of the `id` field from the parent doc currently being processed. So for parent `p1`, the subquery becomes `q={!terms f=parent_id_s}p1`.

You can reference any field on the parent: `$row.brand_id_s`, `$row.category_path_s`, etc. The field must be in `fl=` of the main query (or stored in the index — `[subquery]` will trigger a fetch if needed).

### Why `[subquery]` is often faster than `[child]`

Three reasons:

1. **Filter cache hits.** `sku_summary.fq=in_stock_b:true` is cached in `filterCache`; same filter across all parents reuses the entry. `[child]` re-evaluates `childFilter` per block.

2. **Bounded work.** `sku_summary.rows=5` retrieves exactly 5 children per parent, regardless of block width. `[child] limit=5` still walks all children to find the first 5 matching `childFilter`.

3. **Sorted children.** `sku_summary.sort=price_f asc` returns the cheapest 5 SKUs. `[child]` returns segment-order children (effectively insertion order); to get sorted, you'd need to sort in your application.

### When `[subquery]` is the right tool

- You want top-N children per parent with sorting
- Children are filtered by something selective and cacheable
- Parents and children **don't share segments** (e.g., separate cores, or denormalized `parent_id_s` field instead of block-join)
- Multi-level: each level can be a separate `[subquery]`

### When `[subquery]` doesn't help

- Tight block-join indexes where the children are physically adjacent — `[child]` may win on cache locality
- The subquery has no good cacheable filter (each `$row.id` is different, but `fq` clauses can still cache)
- Very high `rows` on subquery (defeats bounded-work advantage)

### Subquery gotchas

- `$row.field` requires the field to be available. If the field is `stored=false` and not in `docValues`, lookup fails. Either include it in main `fl` or make sure it's docValues-backed.
- The default request handler (`/select`) is used; override with `sku_summary.qt=/yourHandler` if needed.
- Default response writer applies; subquery results obey `sku_summary.wt=` if you want different format.
- Subquery does NOT inherit `defType`. If you want eDisMax in the subquery: `sku_summary.defType=edismax`.
- For multi-value `$row.field`, every value becomes part of the substitution — the subquery sees the full array.
- In SolrCloud: subquery executes on the same shard as the parent doc. If you reference IDs that live on other shards, the subquery sees nothing without explicit cross-shard handling.

---

## `[child]` vs `[subquery]` — quick decision

| Situation | Use |
|---|---|
| Always-all-children, narrow blocks | `[child]` |
| Top-N children sorted, wide blocks | `[subquery]` |
| Children in separate core | `[subquery]` (mandatory; `[child]` only works with block-join) |
| Multi-level, different children per level | `[subquery]` per level |
| Need only when present (lazy) | `[subquery]` (it's per-parent; `[child]` is too) |
| Children share filter that recurs | `[subquery]` (filterCache wins) |

For a typical e-commerce listing page (top 20 products, show 3 cheapest in-stock SKUs each):

```
q=...
rows=20
fl=id,name_t,brand_s,
   skus:[subquery]
&skus.q={!terms f=parent_id_s}$row.id
&skus.fq=in_stock_b:true
&skus.sort=price_f asc
&skus.rows=3
&skus.fl=sku_id,price_f,color_s,size_s
```

This is a strong default pattern. 20 parents × 3 children fetched = 60 child reads, each fully cached after first hit, with sort applied at the index level.

---

## Other useful built-in transformers

### `[explain]`

```
fl=*,[explain style=nl]
```

Adds a per-doc explain section to `fl` (similar to what `debug=results` produces, but selectable per-doc). Useful when you need explain for some docs without the full debug overhead.

`style=nl` returns nested JSON. `style=text` is human-readable text. Default is `text`.

### `[shard]`

```
fl=*,[shard]
```

Adds the shard URL each doc came from. Indispensable for SolrCloud debugging when you suspect routing issues.

### `[json]`

```
fl=*,[json]
```

For text fields containing JSON, parses and returns as nested object instead of escaped string. Niche.

### `[docid]`

```
fl=*,[docid]
```

Internal Lucene doc id. Changes with merges — never persist these. Useful for low-level debugging only.

### `[elevated]` / `[excluded]`

When using QueryElevationComponent, marks docs that were elevated or excluded by elevation rules. For configuration-driven result reordering.

### `[geo]`

For spatial fields, can format as GeoJSON, WKT, etc.:
```
fl=*,location:[geo f=store_location format=GeoJSON]
```

---

## Multiple transformers in one request

```
fl=*,
   skus:[subquery],
   explain:[explain],
   shard:[shard]
&skus.q=...
```

All run per result doc. Cost adds up — keep `rows` modest when stacking transformers.

You can also reference the same transformer factory twice with different parameters:

```
fl=*,
   in_stock:[subquery],
   out_of_stock:[subquery]
&in_stock.q={!terms f=parent_id_s}$row.id
&in_stock.fq=stock_i:[1 TO *]
&out_of_stock.q={!terms f=parent_id_s}$row.id
&out_of_stock.fq=stock_i:0
```

Two SKU lookups per parent — both cached, both bounded.

---

## Performance budgeting

A useful rule of thumb for production:

```
total_transformer_cost_per_request ≈
  rows × (per-doc-fetch-cost + sum-of-all-transformer-costs-per-doc)
```

If a request fetches 50 rows and runs `[subquery]` (~1ms) + `[explain]` (~0.5ms) per doc, that's 50 × 1.5 = 75ms of transformer overhead alone — separate from the main query.

Reduce by:
- Lower `rows`
- Bound `[subquery]` `rows` aggressively
- Make sure `[subquery]` filters hit `filterCache`
- Skip `[explain]` in production (debug-only)
- Move expensive computation to indexing time

---

## Custom transformers (cross-reference)

If the built-ins aren't enough, you can write your own. Common patterns:

- **`[child-subquery]`** — hybrid that uses `ParentChildrenBlockJoinQuery` to scope to one parent's children, with subquery-style parameter passing. Faster than `[subquery]` for block-join (no need to filter by `parent_id_s`), more flexible than `[child]` (sort, paginate, fq).
- **`[hierarchical]`** — extension of `[child]` for multi-level nested schemas with `_nest_path_`, supporting per-level limit and explicit type filtering.
- **`[prefixFilter]`** — filter values of a multi-valued field by prefix list (e.g., return only `taxonomy_path_ss` values starting with `electronics/` or `tools/`).

For implementing these, see `solr-extending` skill, reference `02-doc-transformer.md`.
