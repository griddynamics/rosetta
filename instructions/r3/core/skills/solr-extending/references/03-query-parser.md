# QParser and QParserPlugin (Solr 9.x)

A QParser converts a string (the `q` body or `fq` body) into a Lucene `Query` object. Custom QParsers let you support new query syntax — typically domain-specific shortcuts — without users having to compose complex Lucene/edismax expressions.

For built-in parsers and how to use them (`{!term}`, `{!terms}`, `{!parent}`, etc.), see solr-query skill, reference `02-local-params.md`. This file is about **writing your own**.

## When to write a custom QParser

Justified cases:
- Domain DSL: `{!product q="red shoes" brand=Nike}` is cleaner than the equivalent edismax + fq combination
- Wrap a complex Lucene query type that has no built-in parser (rare; most do)
- Inject business logic: `{!secured q=$qq user=$u}` enforces ACL filters
- Custom score combiner: build an `SmBooleanQuery` or similar that combines paths your way

Not justified:
- "I want shorter syntax" — usually a request handler `defaults` block does the same job without code
- Wrapping eDisMax with extra params — use `defType` + `defaults` in the handler
- Anything you can do via `bq=` / `bf=` / `boost=` in eDisMax

## Anatomy

Two classes: a `QParserPlugin` (the factory, registered in solrconfig.xml) and a `QParser` (one per parse).

```java
package com.example;

public class MyQParserPlugin extends QParserPlugin {
    @Override
    public QParser createParser(String qstr,
                                 SolrParams localParams,
                                 SolrParams params,
                                 SolrQueryRequest req) {
        return new MyQParser(qstr, localParams, params, req);
    }
}

class MyQParser extends QParser {
    public MyQParser(String qstr, SolrParams localParams, SolrParams params, SolrQueryRequest req) {
        super(qstr, localParams, params, req);
    }

    @Override
    public Query parse() throws SyntaxError {
        // qstr is the body (after the closing })
        // localParams has the {!myparser key=value} args
        // params has the full request params
        // req gives access to schema, searcher, request context

        String field = localParams.get("f");
        if (field == null) throw new SyntaxError("missing 'f' param");

        // ... build and return Lucene Query ...
        return new TermQuery(new Term(field, qstr));
    }
}
```

Register in solrconfig.xml:
```xml
<queryParser name="myparser" class="com.example.MyQParserPlugin"/>
```

Use:
```
q={!myparser f=color_s}red
fq={!myparser f=brand_s}Nike
```

## Constructor parameters

```java
QParser(String qstr, SolrParams localParams, SolrParams params, SolrQueryRequest req)
```

| Parameter | Contents |
|---|---|
| `qstr` | The query body — everything after `}` in `{!myparser ...}body`. May be `null` if user used `v=$param` |
| `localParams` | Just the local params: `{!myparser key=value}` → SolrParams with `key=value` |
| `params` | Full request params (q, fq, defType, sort, etc.) |
| `req` | The request object — `req.getSchema()`, `req.getSearcher()`, `req.getCore()` |

The body of the query (`qstr`) can come from three places:
1. After `}` in the local params: `{!myparser}body`
2. From `localParams.get("v")`: `{!myparser v="body"}`
3. From a request param ref: `{!myparser v=$qq}` with `qq=body`

The base `QParser` constructor handles dereferencing automatically — `qstr` is always the resolved final body. If you need the raw, use `localParams.get("v")` directly.

## Accessing request context

```java
@Override
public Query parse() throws SyntaxError {
    IndexSchema schema = req.getSchema();
    SchemaField field = schema.getField(localParams.get("f"));
    if (field == null) throw new SyntaxError("unknown field");

    Analyzer analyzer = field.getType().getQueryAnalyzer();
    // ... use analyzer to tokenize qstr ...

    SolrIndexSearcher searcher = req.getSearcher();   // for index-aware parsing
    return buildQuery(...);
}
```

`req.getCore()` gives you the SolrCore; useful for accessing other request handlers, registered components, etc.

## Returning useful Query types

For most cases, build standard Lucene queries:

```java
return new TermQuery(new Term(field, value));
return new BooleanQuery.Builder()
    .add(new TermQuery(new Term("color_s", "red")), BooleanClause.Occur.MUST)
    .add(new TermQuery(new Term("brand_s", "Nike")), BooleanClause.Occur.MUST)
    .build();
return new ConstantScoreQuery(innerQuery);
return new BoostQuery(innerQuery, 2.5f);
```

For block-join queries (parent ↔ child):
```java
return new ToParentBlockJoinQuery(childQuery, parentBitSet, ScoreMode.Max);
return new ToChildBlockJoinQuery(parentQuery, parentBitSet);
```

For function queries:
```java
ValueSource vs = ...;
return new FunctionScoreQuery(matchAll, vs.asDoubleValuesSource());
```

## Sub-parsing: delegating to other parsers

A common pattern: take user input, parse part of it through another QParser:

```java
String childBody = localParams.get("childq");
QParser childParser = subQuery(childBody, "lucene");
Query childQuery = childParser.getQuery();
```

`subQuery(string, defaultParserName)` is a helper on the base class — it invokes whatever parser the embedded `{!parser}` says, or `defaultParserName` if no `{!}` present.

This is how `{!parent which=...}` parses its own body via the standard Lucene parser:
```java
String childQueryStr = qstr;
QParser childParser = subQuery(childQueryStr, "lucene");
Query childQuery = childParser.getQuery();
return new ToParentBlockJoinQuery(childQuery, parentBitSet, scoreMode);
```

## SortSpec from a parser

If your parser also supports a `sort` parameter:

```java
@Override
public SortSpec getSortSpec(boolean useGlobalParams) throws SyntaxError {
    String sortStr = localParams.get(CommonParams.SORT);
    if (sortStr == null && useGlobalParams) {
        sortStr = params.get(CommonParams.SORT);
    }
    if (sortStr == null) return null;
    return SortSpecParsing.parseSortSpec(sortStr, req);
}
```

This lets your parser produce a query AND a sort, useful for `[subquery]` integration.

## Caching considerations

If your parser produces a Query that's deterministic for given inputs, the standard query cache works automatically. Don't return Query objects with mutable state — they get cached by reference and shared across requests.

For large derived state, build query lazily inside the Query subclass, not in `parse()`.

## Distributed mode

Each shard parses independently. The Query you return is **not** serialized across shards — only the original `q`/`fq` strings are sent. Each shard runs its own QParser to produce its Query.

This means:
- The Query class your parser produces must be available on every shard's classpath (i.e., your jar deployed everywhere)
- The parsing must be deterministic — same inputs produce equivalent queries
- Don't depend on shard-local state during `parse()`; that's where Query goes wrong

## Common patterns

### Pattern 1: domain shortcut

A parser that takes a few high-level params and produces a complex query:

```java
public Query parse() throws SyntaxError {
    String text = qstr;
    String brand = localParams.get("brand");
    String category = localParams.get("category");

    BooleanQuery.Builder builder = new BooleanQuery.Builder();

    if (text != null) {
        QParser textParser = subQuery(text, "edismax");
        // configure edismax via params
        ModifiableSolrParams mp = new ModifiableSolrParams();
        mp.add("qf", "title_t^5 description_t^1");
        mp.add("mm", "2<75%");
        textParser.params = SolrParams.wrapDefaults(mp, params);
        builder.add(textParser.getQuery(), BooleanClause.Occur.MUST);
    }

    if (brand != null) {
        builder.add(new TermQuery(new Term("brand_s", brand)), BooleanClause.Occur.FILTER);
    }
    if (category != null) {
        builder.add(new TermQuery(new Term("category_s", category)), BooleanClause.Occur.FILTER);
    }

    return builder.build();
}
```

Use:
```
q={!product brand=Nike category=running}red shoes
```

### Pattern 2: parser that wraps with block join

```java
public Query parse() throws SyntaxError {
    String childQueryStr = qstr;
    String parentFilterStr = localParams.get("of");
    if (parentFilterStr == null) throw new SyntaxError("missing 'of'");

    Query childQuery = subQuery(childQueryStr, "lucene").getQuery();
    Query parentFilter = subQuery(parentFilterStr, "lucene").getQuery();
    BitSetProducer parentBitSet = new QueryBitSetProducer(parentFilter);

    String scoreModeStr = localParams.get("score", "max");
    ScoreMode scoreMode = ScoreMode.valueOf(scoreModeStr.toUpperCase());

    return new ToParentBlockJoinQuery(childQuery, parentBitSet, scoreMode);
}
```

Same logic as built-in `{!parent}` but you can add domain-specific defaults — e.g., always add a tenant filter to the child query, or always set `score=max`.

### Pattern 3: dependency-aware composition

For graph-based query building (semantic search style — see solr-semantic-search skill):

```java
public Query parse() throws SyntaxError {
    SmQuery rootQuery = parseSmQuery(qstr);  // parse some abstract structure
    DependencyGroup deps = parseDependencies(localParams.get("deps"));

    Query luceneQuery = rootQuery.toLuceneQuery(req.getSchema());
    if (!deps.isEmpty()) {
        luceneQuery = wrapWithDependencyConstraints(luceneQuery, deps);
    }
    return luceneQuery;
}
```

This is how this architecture's semantic-search query builder converts `SmBooleanQuery` / `SmTermQuery` / `SmBoostQuery` etc. into actual Lucene queries — tagging produces an abstract Sm tree, then a custom QParser-style builder converts it to Lucene.

### Pattern 4: validate input strictly

User-facing parsers should validate aggressively:

```java
public Query parse() throws SyntaxError {
    String field = localParams.get("f");
    if (field == null) throw new SyntaxError("missing 'f'");

    SchemaField sf = req.getSchema().getFieldOrNull(field);
    if (sf == null) {
        throw new SyntaxError("unknown field: " + field);
    }
    if (!sf.indexed()) {
        throw new SyntaxError("field not indexed: " + field);
    }
    if (qstr == null || qstr.isEmpty()) {
        throw new SyntaxError("query body required");
    }
    if (qstr.length() > 4096) {
        throw new SyntaxError("query too long");
    }

    return new TermQuery(new Term(field, qstr));
}
```

Always throw `SyntaxError` for user-input issues, never `RuntimeException` — Solr translates `SyntaxError` to a clean 400 Bad Request.

## Common mistakes

### Returning null

```java
public Query parse() throws SyntaxError {
    if (qstr.isEmpty()) return null;   // BUG: callers may NPE
}
```

Never return null from `parse()`. Return `MatchAllDocsQuery()` if "no constraints" is the intent, or throw `SyntaxError`.

### Reading from `params` when you should use `localParams`

```java
String field = params.get("f");   // BUG: this is the request 'f' param, not your local one
```

For your own parser's params, use `localParams`. `params` is for inheriting request-wide settings only.

### Building queries that mutate after construction

```java
BooleanQuery.Builder builder = new BooleanQuery.Builder();
builder.add(...);
return builder.build();   // immutable, OK

// vs

BooleanQuery bq = new BooleanQuery(false);  // deprecated mutable form, BAD
bq.add(...);  // not safe across threads
return bq;
```

Always use `Builder` for BooleanQuery; never mutate after construction.

### Doing IO during parse

```java
public Query parse() throws SyntaxError {
    String value = httpClient.fetch(...);   // BAD: parse is on hot path
    return new TermQuery(new Term(field, value));
}
```

`parse()` runs on every request. IO here adds latency to every query. Cache results, or move to `init()` (factory level, runs once).

### Not handling the `v=` form

```java
public Query parse() throws SyntaxError {
    if (qstr == null) throw new SyntaxError("missing body");  // OK — base class resolves $param refs already
}
```

The base class handles `v=$paramref` resolution before calling your `parse()`. By the time you read `qstr`, it's the resolved value. Don't re-implement dereferencing.

## Testing

```java
public class MyQParserTest extends SolrTestCaseJ4 {
    @BeforeClass public static void beforeClass() throws Exception {
        initCore("solrconfig.xml", "schema.xml");
    }

    @Test public void testParserBuildsCorrectQuery() throws Exception {
        SolrQueryRequest req = req();
        try {
            QParser qp = QParser.getParser("{!myparser f=color_s}red", req);
            Query q = qp.getQuery();
            assertEquals(new TermQuery(new Term("color_s", "red")), q);
        } finally {
            req.close();
        }
    }

    @Test public void testParserMissingFieldErrors() throws Exception {
        SolrQueryRequest req = req();
        try {
            QParser qp = QParser.getParser("{!myparser}red", req);
            expectThrows(SyntaxError.class, qp::getQuery);
        } finally {
            req.close();
        }
    }
}
```
