# DocTransformer and TransformerFactory (Solr 9.x)

A DocTransformer adds, modifies, or computes fields on each result document. It runs **per result doc** during response writing, after the query has executed and produced a DocList.

For built-in transformers (`[child]`, `[subquery]`, `[explain]`, etc.) and the `[child]` vs `[subquery]` performance discussion, see the **solr-query** skill, reference `11-doc-transformers.md`. This file focuses on **writing your own** transformer.

## Anatomy

Every custom transformer needs two classes: a `TransformerFactory` and a `DocTransformer`.

```java
package com.example;

public class MyTransformerFactory extends TransformerFactory {
    @Override
    public DocTransformer create(String field, SolrParams params, SolrQueryRequest req) {
        // 'field' is the result field name (the part before ':[...]' in fl)
        // 'params' contains the params inside the brackets (arg1=val1)
        // 'req' is the request, useful for accessing schema, searcher, etc.
        String arg = params.get("arg", "default");
        return new MyTransformer(field, arg, req);
    }
}

class MyTransformer extends DocTransformer {
    private final String name;
    private final String arg;
    private final SolrQueryRequest req;

    MyTransformer(String name, String arg, SolrQueryRequest req) {
        this.name = name;
        this.arg = arg;
        this.req = req;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public void transform(SolrDocument doc, int docid) throws IOException {
        // doc is the result doc being augmented
        // docid is the internal Lucene doc id (use cautiously)
        Object computed = computeValue(doc, arg);
        doc.setField(name, computed);
    }
}
```

Register in solrconfig.xml:
```xml
<transformer name="myTransform" class="com.example.MyTransformerFactory"/>
```

Use in fl:
```
fl=*,result:[myTransform arg=foo]
```

## Important hooks

### `needsSolrIndexSearcher()`

```java
@Override
public boolean needsSolrIndexSearcher() {
    return true;
}
```

Return true if your `transform()` reads from the index (e.g., to fetch related docs, do TermsEnum walks, etc.). Solr will arrange for `context.getSearcher()` to be available. Default is `false`.

### `getExtraRequestFields()`

```java
@Override
public String[] getExtraRequestFields() {
    return new String[]{ "id", "parent_id_s" };
}
```

If your transformer needs specific fields on the doc that aren't in `fl`, declare them here. Solr will fetch them transparently. Without this, your transformer might get a doc that's missing the field it needs.

### `setContext(ResultContext context)`

```java
@Override
public void setContext(ResultContext context) {
    super.setContext(context);
    // context.getSearcher() — index searcher
    // context.getQuery() — the executed query
    // context.getRequest() — request
    // context.getDocList() — full result list (transformer iterates one at a time)
}
```

Called once per response, before transforms begin. Useful for setup that depends on the result set (e.g., pre-fetching all related data).

## Parameter handling: shifting prefixes

The `params` object passed to `create()` contains all request params, but your transformer typically wants only the ones prefixed by the result field name. Built-in transformers do this manually:

```java
private SolrParams retainAndShiftPrefix(SolrParams params, String fieldNamePrefix) {
    ModifiableSolrParams out = new ModifiableSolrParams();
    Iterator<String> it = params.getParameterNamesIterator();
    while (it.hasNext()) {
        String key = it.next();
        if (key.startsWith(fieldNamePrefix + ".")) {
            out.set(key.substring(fieldNamePrefix.length() + 1), params.getParams(key));
        }
    }
    return out;
}
```

Now `mySubquery.q=...` becomes `q=...` for the inner request. This is how `[subquery]` and `[child-subquery]` allow per-instance configuration.

## Common patterns

### Pattern 1: enrich from another field

Compute a derived value from existing fields:

```java
@Override
public void transform(SolrDocument doc, int docid) {
    Object price = doc.getFieldValue("price_f");
    Object discount = doc.getFieldValue("discount_pct_f");
    if (price instanceof Number && discount instanceof Number) {
        double finalPrice = ((Number) price).doubleValue() *
                            (1 - ((Number) discount).doubleValue() / 100.0);
        doc.setField(name, finalPrice);
    }
}
```

Cheap, no IO. Good fit for a transformer.

### Pattern 2: fetch related docs (block-join optimized)

The `[child-subquery]` pattern: scope a sub-search to the children of a specific parent using `ParentChildrenBlockJoinQuery`:

```java
@Override
public void transform(SolrDocument doc, int docid) throws IOException {
    // docid is the parent's Lucene id
    Query childrenInThisBlock = new ParentChildrenBlockJoinQuery(
        parentBitSet,   // BitSetProducer over the parent filter (Block Mask)
        childQuery,     // Lucene query selecting which children we want
        docid           // the parent's docid
    );

    DocList children = context.getSearcher().getDocList(
        childrenInThisBlock, filters, sortSpec.getSort(),
        sortSpec.getOffset(), sortSpec.getCount(),
        SolrIndexSearcher.GET_SCORES
    );

    ReturnFields rf = new SolrReturnFields(subQueryRequest);
    ResultContext rc = new BasicResultContext(children, rf,
        context.getSearcher(), childrenInThisBlock, subQueryRequest);
    doc.setField(name, rc);
}
```

Why `ParentChildrenBlockJoinQuery` instead of `{!terms f=parent_id_s}$row.id`:
- No filter cache pollution (no per-parent fq)
- Block-join already knows the children's docids without a join lookup
- Faster on large indexes; same per-instance configuration as `[subquery]`

### Pattern 3: hierarchical descent

For nested schemas (`_nest_path_`), walking children manually:

```java
@Override
public void transform(SolrDocument rootDoc, int rootDocId) throws IOException {
    // Find segment containing this parent
    LeafReaderContext leaf = ReaderUtil.subIndex(rootDocId, leaves)
                              .pipe(seg -> leaves.get(seg));
    int segRootId = rootDocId - leaf.docBase;

    // Find previous parent boundary in segment via parent BitSet
    BitSet parentsInSeg = parentsFilter.getBitSet(leaf);
    int segPrevRootId = segRootId == 0 ? -1 : parentsInSeg.prevSetBit(segRootId - 1);

    // Children are docs (segPrevRootId+1) to (segRootId-1)
    SortedDocValues nestPaths = DocValues.getSorted(leaf.reader(), NEST_PATH_FIELD_NAME);

    for (int childSegId = segPrevRootId + 1; childSegId < segRootId; childSegId++) {
        // ... apply childFilter, attach to rootDoc by nest path level
    }
}
```

This is the heart of `[hierarchical]` — manual block walking with per-level limits. Useful for schemas with `_nest_path_` and 3+ hierarchy levels where built-in `[child]` returns the wrong shape.

### Pattern 4: filter multivalued field

A simple but useful pattern: keep only values matching a prefix list:

```java
@Override
public void transform(SolrDocument doc, int docId) {
    Object value = doc.getFieldValue(fieldName);
    if (!(value instanceof List)) return;

    List<?> values = (List<?>) value;
    List<Object> filtered = new ArrayList<>();
    for (Object item : values) {
        String s = stringValueOf(item);
        if (s != null && Stream.of(prefixes).anyMatch(s::startsWith)) {
            filtered.add(item);
        }
    }
    doc.setField(fieldName, filtered);
}

private static String stringValueOf(Object item) {
    if (item instanceof LazyDocument.LazyField) return ((LazyDocument.LazyField) item).stringValue();
    if (item instanceof StoredField) return ((StoredField) item).stringValue();
    if (item instanceof String) return (String) item;
    return null;
}
```

Used when a doc has many `taxonomy_path_ss` values but the user wants only those under specific roots. Cheap; no IO; just iterate-and-filter.

### Pattern 5: dedupe / rename uniqueness check

A factory that ensures only one transformer of a given name is registered (avoids result-field collision):

```java
public DocTransformer create(String field, SolrParams params, SolrQueryRequest req) {
    if (field.contains("[") || field.contains("]")) {
        throw new SolrException(ErrorCode.BAD_REQUEST,
            "explicit name required for transformer '" + field + "'");
    }
    checkNoDupe(field, req.getContext());
    return new MyTransformer(...);
}

private void checkNoDupe(String field, Map<Object, Object> context) {
    String key = getClass().getSimpleName();
    Map dupes = (Map) context.computeIfAbsent(key, k -> new HashMap<>());
    if (dupes.put(field, true) != null) {
        throw new SolrException(ErrorCode.BAD_REQUEST,
            "duplicate transformer name: " + field);
    }
}
```

## Distributed mode

DocTransformers run on the node assembling the final response — typically the coordinator in SolrCloud. They see the merged result, not per-shard.

Implications:
- Transformer `transform()` is called only for the `rows`-bounded final result (not all shard candidates).
- If transformer needs data only available on the doc's home shard (e.g., per-shard cached state), you have a problem. Most transformers don't need this — `getSearcher()` returns the coordinator's view, which can read from any shard via the standard mechanisms.
- For transformers that fetch per-doc, network cost from coordinator can be significant in cloud mode. Co-locate caches.

## Common mistakes

### Mutable per-instance state across docs

```java
class MyTransformer extends DocTransformer {
    private final List<String> seenIds = new ArrayList<>();   // BUG

    @Override public void transform(SolrDocument doc, int docid) {
        seenIds.add(doc.getFieldValue("id").toString());
        // ...
    }
}
```

Solr may reuse transformer instances across requests. Mutable state leaks. Use `req.getContext()` for request-scoped state, or ThreadLocal.

### Doing IO without `needsSolrIndexSearcher()` returning true

```java
@Override public void transform(SolrDocument doc, int docid) throws IOException {
    DocList children = context.getSearcher().getDocList(...);   // NPE risk if needsSolrIndexSearcher() is false
}
```

Always declare `needsSolrIndexSearcher() = true` if you use the searcher. Otherwise `context.getSearcher()` may be null.

### Forgetting `getExtraRequestFields()`

If your transform needs `parent_id_s` and the user requests `fl=id,name`, the doc you receive won't have `parent_id_s`. Override `getExtraRequestFields()`.

### Naming mistakes

```java
@Override public String getName() {
    return "myTransform";   // BUG: this should be the user-provided name (the `field` argument)
}
```

The factory's `create(field, ...)` receives the user's chosen field name. Pass it to the transformer as `name` and return it from `getName()`. This lets the same factory produce multiple distinct transformers in the same request (`a:[myT],b:[myT]`).

### Per-doc subquery without caching

If you spawn a real Solr search per doc (the `[subquery]` model), make sure your subquery has cacheable fq clauses. Otherwise filterCache fills with one-shot entries and gets evicted.

### Forgetting to handle null/missing fields

```java
double price = ((Number) doc.getFieldValue("price_f")).doubleValue();  // NPE if absent
```

Always check `getFieldValue` for null:
```java
Object v = doc.getFieldValue("price_f");
if (v instanceof Number) {
    double price = ((Number) v).doubleValue();
    // ...
}
```

### Setting field that conflicts with built-in

```java
doc.setField("score", computedValue);   // collides with the score field
doc.setField("_root_", value);          // collides with block-join root
```

Pick names that won't conflict. Prefer namespaced names (`my_computed_score`).

## Performance budgeting

Per-request transformer cost ≈ `rows × per-doc-cost`.

For pure computation (no IO): negligible even at rows=1000.
For fetches: keep rows × per-doc-fetch-latency under your latency budget. A request with rows=20 and 2ms-per-doc fetch = 40ms transformer overhead. With rows=200, 400ms — too much.

Mitigations:
- Use a SearchComponent partner to bulk-prefetch (see `01-search-component.md`)
- Cache aggressively in `req.getContext()` shared between multiple transformer invocations
- Avoid IO on the doc being transformed — pre-compute at indexing time when possible

## Testing

```java
public class MyTransformerTest extends SolrTestCaseJ4 {
    @BeforeClass public static void beforeClass() throws Exception {
        initCore("solrconfig.xml", "schema.xml");
    }

    @Test public void testTransformerAddsField() throws Exception {
        assertU(adoc("id", "p1", "type_s", "product", "brand_s", "Nike"));
        assertU(commit());

        assertQ("transformer adds computed field",
            req("q", "*:*", "fl", "*,my_field:[myTransform arg=foo]"),
            "//doc/str[@name='my_field'][.='expected']"
        );
    }
}
```
