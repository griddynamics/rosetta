# Block Join Queries

Block join lets you query parent-child document hierarchies indexed as adjacent blocks. This is the right tool for e-commerce (product → SKUs), forum (thread → posts), bill-of-materials (assembly → parts) — anything where a "thing" has multiple "variants" and you want to query by variant attributes but return the thing.

This file covers the full mental model, syntax, 3-level hierarchies, the `[child]` transformer, scoring, and the mistakes people make most often.

## The data model

Block join requires documents to be **indexed as blocks**: a parent immediately followed by its children in a single update batch, with no other documents between. Solr maintains an internal `_root_` field on every doc in a block, pointing to the root parent's ID.

A typical product/sku block:
```json
[
  {"id": "p1", "type_s": "product", "name_t": "Air Max", "brand_s": "Nike", "_root_": "p1"},
  {"id": "p1-sku-r-9", "type_s": "sku", "color_s": "red", "size_i": 9, "stock_i": 5, "_root_": "p1"},
  {"id": "p1-sku-b-9", "type_s": "sku", "color_s": "blue", "size_i": 9, "stock_i": 0, "_root_": "p1"},
  {"id": "p1-sku-r-10", "type_s": "sku", "color_s": "red", "size_i": 10, "stock_i": 3, "_root_": "p1"}
]
```

Indexing must be atomic (one update). Updates to any child re-index the entire block — there is no in-place child update for block join.

## The Block Mask concept

A **Block Mask** is a query that matches **all parent documents in your index** at the level you're asking about. It is *not* a filter to narrow which parents you care about. It defines block boundaries.

For products: `type_s:product` is the Block Mask if every product has `type_s=product` and nothing else does.

This is the source of most block join bugs. You are constantly tempted to write:
```
which="type_s:product AND brand_s:Nike"     # WRONG
```
to mean "give me Nike products with red children." But this restricts the Block Mask: Solr now only sees Nike products as parent-block boundaries, and child documents from non-Nike products end up grouped with the wrong parent block.

Filter parents through a separate `fq`:
```
q={!parent which="type_s:product"}color_s:red
fq=brand_s:Nike
```

## `{!parent}` — promote children to parents

Use when: child query, want parent results.

```
q={!parent which="type_s:product"}color_s:red
```

Reads: "find children matching `color_s:red`; return the **parent** of each."

Parameters:
- `which=` — the Block Mask (parent filter, **all** parents)
- `score=` — how to combine matching child scores into parent score: `none` (default; constant 1), `avg`, `max`, `min`, `total`, `sum`
- `v=` — alternative way to specify the child query (instead of after `}`)

```
q={!parent which="type_s:product" score=max v=$cq}
&cq=color_s:red AND stock_i:[1 TO *]
```

## `{!child}` — descend parents to children

Use when: parent query, want child results.

```
q={!child of="type_s:product"}brand_s:Nike
```

Reads: "find parents matching `brand_s:Nike`; return their **children**."

Parameters:
- `of=` — the Block Mask (parent filter, all parents)
- `v=` — alternative for the parent query
- `parentFilter=` — synonym for `of=` (older)

`{!child}` returns ALL children of matching parents — there's no scoring, just a constant. To filter children, layer with another `fq`:
```
q={!child of="type_s:product"}brand_s:Nike
fq=stock_i:[1 TO *]
```

This returns Nike-product children that are in stock.

## Combining: parents matching by both their own AND child attributes

The classic e-commerce case: "products from Nike that have at least one red SKU in stock."

```
q={!parent which="type_s:product"}+color_s:red +stock_i:[1 TO *]
fq=brand_s:Nike
fq=type_s:product
```

The last `fq=type_s:product` is essential — without it, when `q` returns parents, their children are also candidates for matching against `fq=brand_s:Nike`, which on a child doc returns false.

Alternative — combine inside the parent query body:
```
q=+{!parent which="type_s:product" v=$cq} +brand_s:Nike +type_s:product
&cq=+color_s:red +stock_i:[1 TO *]
```

The full BNF gets ugly. JSON Request API is cleaner:
```json
{
  "query": {
    "bool": {
      "must": [
        {"parent": {"which": "type_s:product", "query": {"bool": {"must": [
          {"lucene": {"query": "color_s:red"}},
          {"lucene": {"query": "stock_i:[1 TO *]"}}
        ]}}}},
        {"lucene": {"query": "brand_s:Nike"}},
        {"lucene": {"query": "type_s:product"}}
      ]
    }
  }
}
```

## Score propagation

By default, `{!parent}` returns parents with score 1 — children's scores are ignored. To use child scores:

```
{!parent which="type_s:product" score=max}+color_s:red
```

`score` modes:
- `none` (default) — constant 1
- `avg` — average of all matching child scores
- `max` — the highest-scoring child's score
- `min` — the lowest matching child's score
- `total` / `sum` — sum of all matching child scores

For e-commerce: `score=max` is typically what you want — "rank parent by its best matching SKU."

When you combine with eDisMax in `qf`/`bq`/`bf`, the parent's own score factors in too. The composition is additive in BooleanQuery clauses.

## The `[child]` document transformer

To return both the matching parent AND its (selected) children:

```
fl=*,[child parentFilter="type_s:product" childFilter="color_s:red" limit=5]
```

Returns each parent doc with a `_childDocuments_` field containing matching children.

Parameters:
- `parentFilter=` — REQUIRED, the Block Mask (same as `which=`/`of=` elsewhere)
- `childFilter=` — optional, restrict which children to include
- `limit=` — max children per parent (default 10)
- `fl=` — fields to include on children (rare; usually `fl=*` works)

Without `[child]`, even when you query children via `{!parent}`, you only get the parent fields — not the actual SKU info. The transformer is essential for product-listing UIs.

Multi-level: in a 3-level hierarchy, `[child]` returns *all* descendants by default. To get only direct children, set `childFilter` accordingly:
```
fl=*,[child parentFilter="type_s:collection" childFilter="type_s:product" limit=20]
```

## 3-level hierarchies

```
collection (type_s:collection)
  └── product (type_s:product)
        └── sku (type_s:sku)
```

The Block Mask `parentFilter`/`which`/`of` always refers to the **immediate parent level** of what you're transitioning between. So:
- "Find products under collection X that have red SKUs" — two transitions

```
q=+{!parent which="type_s:collection" v=$pq}+id:collection-X
&pq=+{!parent which="type_s:product" v=$cq}+color_s:red
&cq=color_s:red
```

This reads bottom-up: red SKUs → their products → those products' collection.

For 3-level, you also need the explicit child-level filter when constructing block-aware filters:
```
{!bool filter=type_s:sku filter=color_s:red}
```

Without `filter=type_s:sku`, the bool query may match both SKU children and product grandchildren of collections, producing incorrect block resolution.

The `_root_` field always points to the **topmost ancestor** (collection in this case), regardless of how many levels deep. So `uniqueBlock(_root_)` in a 3-level facet under SKU scope counts unique collections, NOT unique products. To count unique products from a SKU-level facet, use a parent-id field (e.g., index `parent_product_id_s` on each SKU) and `uniqueBlock(parent_product_id_s)`.

## Block Mask gotchas: Error 17 territory

The dreaded "child block lookup found different segments" or duplicate-key errors usually trace to:

### Plain documents in the index without children
If your index has `type_s:product` blocks AND standalone `type_s:article` documents (no children), Solr's block-walking can mis-identify articles as children of the previous product block.

Fix: use a Block Mask that includes both:
```
which="type_s:product OR type_s:article"
```
Now Solr knows where blocks end, even if some are "blocks of one."

Or index articles separately, with their own root: ensure `_root_` is set to the article's own ID for standalone docs.

### Restrictive `which` / `of`
Already covered above. Symptom: missing parents from results, or random-looking child mis-grouping.

### Reordering / deletes
Block join requires the original block order. If documents are deleted and segments merged in unfortunate ways, block boundaries can become ambiguous. This is rare in practice but worth knowing when seeing strange results after heavy delete activity.

### Soft commit timing
Block join queries against an index that just had a soft commit may briefly see inconsistent state. Use the explicit commit's response, not auto-soft-commit timing, when block updates immediately precede block queries (e.g., in tests).

## Performance notes

- `{!parent}` and `{!child}` are O(matching docs) on top of base query cost. They're fast when the underlying child/parent query is selective.
- `[child]` transformer adds a per-doc child fetch. For large result pages with `limit=` high, this gets expensive. Use small `limit` and lazy load.
- `score=max` requires examining all matching children per parent (not just stopping at first). For very high-cardinality parents (millions of children), this dominates.
- Block join queries cache poorly compared to flat queries — the filterCache only stores the parent set, child predicates re-execute.

## When NOT to use block join

- If you ever need to update children independently of parents (block join requires reindexing the whole block on any child change). Consider `{!join}` (slower at query but flexible at update) or denormalization (duplicate parent attrs onto child).
- For 1-to-few relationships (e.g., user → addresses, max 3): denormalization is usually faster than block join.
- For frequently changing child sets: re-indexing the block per change is expensive.

## Validation checklist

Before deploying a block join query, verify:

1. Block Mask matches **all** parents at that level — `count(which=...)` equals total parents
2. `which`/`of` is a parent-only filter — never includes child attributes
3. Parent filtering goes through `fq` or top-level `bool` clauses, not via narrowing the Block Mask
4. `[child]` transformer is included if the UI needs child data
5. `score=` mode is set if child relevance should affect parent ranking
6. For 3-level: explicit type filters on child queries; awareness that `_root_` is the topmost ancestor
