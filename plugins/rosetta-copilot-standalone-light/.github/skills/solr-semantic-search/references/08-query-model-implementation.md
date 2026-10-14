# Sm* Query Model — Reference Implementation

This file gives you the **complete code** for the abstract Sm query model that's mentioned throughout this skill (in `01-architecture.md` and `06-query-building.md`). If you're implementing semantic search for a new domain, drop these classes into your project as a starting point.

## What this is

The Sm query model is an **intermediate AST** for Solr/ES queries. Instead of building Solr query strings directly during query construction (`{!bool must=...}`), you build a tree of `SmQuery` objects, then translate the tree to a target backend (Solr, Elasticsearch) via a parser fabric.

Why bother with this layer:

- **Backend-agnostic**: same Sm tree → Solr query string (via `SolrParsedQuery`) OR Elasticsearch JSON (via `EsParsedQuery`). Implement once, target both.
- **Composable**: building `SmBooleanQuery + adding clauses + setting MM` is more readable than nested `BooleanQuery.Builder` or string concatenation.
- **Inspectable**: jackson-serializable, easy to log and diff.
- **Decoupled**: the query construction logic in `SemanticQueryBuilder` doesn't know about Solr at all — it produces an Sm tree. Solr knowledge lives in `SolrQueryParserFabric` only.

The pattern is a textbook **visitor** with double dispatch: each `SmQuery` knows its parser-method on the fabric (`fabric.getBooleanQueryParser()`), and each parser knows how to translate that specific Sm type to the target backend.

## Architecture diagram

```
SmQuery (interface)
  ├── SmBooleanQuery       → has List<SmClause>, mm
  ├── SmTermQuery          → field + value (one term match)
  ├── SmTermsQuery         → field + multiple values (terms match)
  ├── SmBoostQuery         → wraps another SmQuery with a float boost
  ├── SmDisjunctionMaxQuery → list of alternatives, tieBreaker
  ├── SmEdismaxQuery        → eDisMax-style query (qf, mm, optional boost)
  ├── SmEdismaxBoostQuery   → field + value + int boost (used by SmEdismaxQuery)
  ├── SmParentWrappedQuery  → wraps inner as block-join {!parent}
  ├── SmChildWrappedQuery   → wraps inner as {!child}
  ├── SmToParentBlockJoinQuery → block-join with explicit Score (avg/max/min/total/sum)
  └── SmCollapseFilter      → collapse filter on a field

SmClause (data class) — { Occur, SmQuery }
  Occur enum: MUST, FILTER, SHOULD, MUST_NOT

ParsedQuery (marker interface)
  ├── SolrParsedQuery     — accumulates "main query string" + named params
  └── EsParsedQuery       — accumulates ES query JSON (you write this if you need ES)

QueryParserFabric<T extends ParsedQuery> (interface)
  Returns a QueryParser<X, T> for each Sm subtype.

QueryParser<X extends SmQuery, T extends ParsedQuery>
  parse(fabric, query, builder) → builder
```

## Base interfaces and types

### `SmQuery` — the marker interface

```java
package com.example.semantic.model.query;

import com.example.semantic.model.parsers.ParsedQuery;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.WRAPPER_OBJECT,
    property = "type"
)
public interface SmQuery {
    void setQueryId(String queryId);
    String getQueryId();

    /**
     * Visitor double-dispatch: hand control back to the fabric for the right
     * parser implementation.
     */
    <R extends ParsedQuery> R parse(QueryParserFabric<R> parserFabric, R queryBuilder);
}
```

`@JsonTypeInfo` makes the tree round-trip through Jackson — useful for logging / persistence / cross-service handoff (e.g., the staging service in one process produces Sm tree, search service in another consumes it).

### `SmClause` — boolean clause container

```java
package com.example.semantic.model.query;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SmClause {
    private Occur occurs;
    private SmQuery query;

    public enum Occur {
        MUST,
        FILTER,
        SHOULD,
        MUST_NOT
    }
}
```

`Occur` mirrors Lucene's `BooleanClause.Occur`. Use:
- `MUST` — must match, contributes to score
- `FILTER` — must match, no score contribution (cheaper)
- `SHOULD` — optional, contributes to score, counts toward mm
- `MUST_NOT` — must not match, no score

### `ParsedQuery` and `QueryParser`

```java
// ParsedQuery.java
package com.example.semantic.model.parsers;

/** Marker interface representing a parsed query in any backend. */
public interface ParsedQuery {
}
```

```java
// QueryParser.java
package com.example.semantic.model.parsers;

import com.example.semantic.model.query.SmQuery;

public interface QueryParser<T extends SmQuery, R extends ParsedQuery> {
    R parse(QueryParserFabric<R> fabric, T query, R queryBuilder);
}
```

### `QueryParserFabric` — backend-specific factory

```java
// QueryParserFabric.java
package com.example.semantic.model.parsers;

import com.example.semantic.model.query.*;

/**
 * Factory interface for parsers that translate Sm queries to a specific backend.
 *
 * @param <T> the parsed-query result type (e.g., SolrParsedQuery, EsParsedQuery)
 */
public interface QueryParserFabric<T extends ParsedQuery> {
    QueryParser<SmBooleanQuery, T>            getBooleanQueryParser();
    QueryParser<SmBoostQuery, T>              getBoostQueryParser();
    QueryParser<SmChildWrappedQuery, T>       getChildWrappedQueryParser();
    QueryParser<SmCollapseFilter, T>          getCollapseFilterParser();
    QueryParser<SmDisjunctionMaxQuery, T>     getDisjunctionMaxQueryParser();
    QueryParser<SmEdismaxBoostQuery, T>       getEdismaxBoostQueryParser();
    QueryParser<SmEdismaxQuery, T>            getEdismaxQueryParser();
    QueryParser<SmParentWrappedQuery, T>      getParentWrappedQueryParser();
    QueryParser<SmTermQuery, T>               getTermQueryParser();
    QueryParser<SmTermsQuery, T>              getTermsQueryParser();
    QueryParser<SmToParentBlockJoinQuery, T>  getToParentBlockJoinQueryParser();
}
```

## Concrete Sm* query classes

Each implements `SmQuery`, holds whatever data the type needs, and forwards `parse()` to the fabric's specific parser.

All examples use Lombok `@Data` (getters, setters, equals, hashCode) and `@NoArgsConstructor` / `@AllArgsConstructor` for Jackson. If you don't use Lombok, write the accessors by hand.

### `SmTermQuery` — single term match

```java
package com.example.semantic.model.query;

import com.example.semantic.model.parsers.ParsedQuery;
import com.example.semantic.model.parsers.QueryParserFabric;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SmTermQuery implements SmQuery {
    private String queryId;
    private String fieldName;
    private String value;
    private Integer edgeId;       // optional: graph edge this came from
    private Integer pathId;       // optional: graph path this came from
    private boolean cacheEnabled = true;

    public SmTermQuery(String fieldName, String value) {
        this.fieldName = fieldName;
        this.value = value;
    }

    public SmTermQuery(String fieldName, String value, String queryId) {
        this.fieldName = fieldName;
        this.value = value;
        this.queryId = queryId;
    }

    public void disableCache() {
        this.cacheEnabled = false;
    }

    @Override
    public <R extends ParsedQuery> R parse(QueryParserFabric<R> parserFabric, R queryBuilder) {
        return parserFabric.getTermQueryParser().parse(parserFabric, this, queryBuilder);
    }
}
```

`edgeId` / `pathId` are optional debugging metadata — they let you trace which graph edge / path a term came from. Drop them if you don't need them.

### `SmTermsQuery` — multi-value match (Solr `{!terms}`)

```java
package com.example.semantic.model.query;

import com.example.semantic.model.parsers.ParsedQuery;
import com.example.semantic.model.parsers.QueryParserFabric;
import lombok.*;

import java.util.Collection;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SmTermsQuery implements SmQuery {
    private String fieldName;
    private String value;
    private String separator = "||";       // pipe-separated values in {!terms} v=...
    private String queryId;
    private boolean cacheEnabled = true;

    public SmTermsQuery(String fieldName, Collection<String> values) {
        this.fieldName = fieldName;
        this.value = String.join(separator, values);
    }

    public SmTermsQuery(String fieldName, Collection<String> values, String queryId) {
        this.fieldName = fieldName;
        this.value = String.join(separator, values);
        this.queryId = queryId;
    }

    public void disableCache() {
        this.cacheEnabled = false;
    }

    @Override
    public <R extends ParsedQuery> R parse(QueryParserFabric<R> parserFabric, R queryBuilder) {
        return parserFabric.getTermsQueryParser().parse(parserFabric, this, queryBuilder);
    }
}
```

### `SmBooleanQuery` — multiple clauses with mm

```java
package com.example.semantic.model.query;

import com.example.semantic.model.parsers.ParsedQuery;
import com.example.semantic.model.parsers.QueryParserFabric;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SmBooleanQuery implements SmQuery {
    private String queryId;
    private List<SmClause> clauses = new ArrayList<>();
    private Integer minimumNumberShouldMatch;
    private String tag;                    // optional: Solr {!tag=...} for facet exclusion

    public SmBooleanQuery(Integer minimumNumberShouldMatch, String queryId) {
        this.minimumNumberShouldMatch = minimumNumberShouldMatch;
        this.queryId = queryId;
    }

    public void add(SmQuery query, SmClause.Occur occurs) {
        this.clauses.add(new SmClause(occurs, query));
    }

    public int length() {
        return clauses.size();
    }

    @Override
    public <R extends ParsedQuery> R parse(QueryParserFabric<R> parserFabric, R queryBuilder) {
        return parserFabric.getBooleanQueryParser().parse(parserFabric, this, queryBuilder);
    }
}
```

This is the most important type. Most query construction ends up wrapping things in `SmBooleanQuery` with mm.

### `SmBoostQuery` — float boost wrapper

```java
package com.example.semantic.model.query;

import com.example.semantic.model.parsers.ParsedQuery;
import com.example.semantic.model.parsers.QueryParserFabric;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SmBoostQuery implements SmQuery {
    private SmQuery boostedQuery;
    private float boost;
    private String queryId;

    @Override
    public <R extends ParsedQuery> R parse(QueryParserFabric<R> parserFabric, R queryBuilder) {
        return parserFabric.getBoostQueryParser().parse(parserFabric, this, queryBuilder);
    }
}
```

### `SmDisjunctionMaxQuery` — DisMax-style alternatives

```java
package com.example.semantic.model.query;

import com.example.semantic.model.parsers.ParsedQuery;
import com.example.semantic.model.parsers.QueryParserFabric;
import lombok.*;

import java.util.ArrayList;
import java.util.Collection;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SmDisjunctionMaxQuery implements SmQuery {
    private String queryId;
    private Float tieBreaker = 0.0f;
    private Integer boost;
    private Collection<SmQuery> queries = new ArrayList<>();
    private int mm = 1;

    public SmDisjunctionMaxQuery(Collection<SmQuery> queries, Float tieBreaker, String queryId) {
        this.queries = queries;
        this.queryId = queryId;
        this.tieBreaker = tieBreaker;
    }

    public void add(SmQuery query) {
        queries.add(query);
    }

    public boolean isEmpty() {
        return queries.isEmpty();
    }

    @Override
    public <R extends ParsedQuery> R parse(QueryParserFabric<R> parserFabric, R queryBuilder) {
        return parserFabric.getDisjunctionMaxQueryParser().parse(parserFabric, this, queryBuilder);
    }
}
```

### `SmEdismaxQuery` — eDisMax full query

```java
package com.example.semantic.model.query;

import com.example.semantic.model.parsers.ParsedQuery;
import com.example.semantic.model.parsers.QueryParserFabric;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SmEdismaxQuery implements SmQuery {
    private List<String> queryFields;        // qf
    private String value;                     // q body
    private String queryId;
    private SmEdismaxBoostQuery boostQuery;   // optional bq
    private boolean forceAndOperator;         // q.op=AND when true

    public SmEdismaxQuery(List<String> queryFields, String value, String queryId) {
        this.queryFields = queryFields;
        this.value = value;
        this.queryId = queryId;
    }

    public SmEdismaxQuery(List<String> queryFields, String value, String queryId, SmEdismaxBoostQuery boostQuery) {
        this.queryFields = queryFields;
        this.value = value;
        this.queryId = queryId;
        this.boostQuery = boostQuery;
    }

    @Override
    public <R extends ParsedQuery> R parse(QueryParserFabric<R> parserFabric, R queryBuilder) {
        return parserFabric.getEdismaxQueryParser().parse(parserFabric, this, queryBuilder);
    }
}
```

### `SmEdismaxBoostQuery` — used inside `SmEdismaxQuery`

```java
package com.example.semantic.model.query;

import com.example.semantic.model.parsers.ParsedQuery;
import com.example.semantic.model.parsers.QueryParserFabric;
import lombok.*;

@Data
@AllArgsConstructor
public class SmEdismaxBoostQuery implements SmQuery {
    private String field;
    private String value;
    private int boost;
    private String queryId;

    @Override
    public <R extends ParsedQuery> R parse(QueryParserFabric<R> parserFabric, R queryBuilder) {
        return parserFabric.getEdismaxBoostQueryParser().parse(parserFabric, this, queryBuilder);
    }
}
```

### `SmParentWrappedQuery` — `{!parent}` block join

```java
package com.example.semantic.model.query;

import com.example.semantic.model.parsers.ParsedQuery;
import com.example.semantic.model.parsers.QueryParserFabric;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SmParentWrappedQuery implements SmQuery {
    private String tag;             // optional {!tag=...}
    private Scope whichScope;       // your domain enum naming the parent filter scope
    private String innerQuery;      // pre-rendered child query body
    private String queryId;
    private String score;           // avg/max/min/total/sum or null

    @Override
    public <R extends ParsedQuery> R parse(QueryParserFabric<R> parserFabric, R queryBuilder) {
        return parserFabric.getParentWrappedQueryParser().parse(parserFabric, this, queryBuilder);
    }

    /**
     * Replace this with your domain's scope enum. Each value should map to a
     * Solr param name that holds the parent-filter query string.
     */
    public enum Scope {
        PRODUCT_SCOPE("product_scope"),
        SKU_SCOPE("sku_scope");
        private final String paramName;
        Scope(String paramName) { this.paramName = paramName; }
        public String getParamName() { return paramName; }
    }
}
```

`whichScope` references a parent-filter query stored as a top-level Solr param (e.g., `product_scope=type_s:product`). The translator emits `{!parent which=$product_scope ...}`. Lets multiple block-join queries share the same parent-filter without duplicating it.

`innerQuery` is the **already-rendered** child query body. The translator doesn't recurse into it — caller is responsible for producing the child query string upfront. Some teams keep this as a nested `SmQuery` and recurse; the explicit-string form is simpler when child query construction is conceptually separate.

### `SmChildWrappedQuery` — `{!child}` block join

```java
package com.example.semantic.model.query;

import com.example.semantic.model.parsers.ParsedQuery;
import com.example.semantic.model.parsers.QueryParserFabric;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SmChildWrappedQuery implements SmQuery {
    private String tag;
    private String whichScope;     // string here (no enum) — symmetric with parent
    private String innerQuery;
    private String queryId;

    @Override
    public <R extends ParsedQuery> R parse(QueryParserFabric<R> parserFabric, R queryBuilder) {
        return parserFabric.getChildWrappedQueryParser().parse(parserFabric, this, queryBuilder);
    }
}
```

### `SmToParentBlockJoinQuery` — explicit Score-mode block join

```java
package com.example.semantic.model.query;

import com.example.semantic.model.parsers.ParsedQuery;
import com.example.semantic.model.parsers.QueryParserFabric;
import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SmToParentBlockJoinQuery implements SmQuery {
    private String queryId;
    private SmQuery childQuery;
    private SmQuery parentFilter;
    private Score score = Score.MAX;

    public SmToParentBlockJoinQuery(SmQuery childQuery, SmQuery parentFilter, String queryId) {
        this.childQuery = childQuery;
        this.parentFilter = parentFilter;
        this.queryId = queryId;
    }

    @Override
    public <R extends ParsedQuery> R parse(QueryParserFabric<R> parserFabric, R queryBuilder) {
        return parserFabric.getToParentBlockJoinQueryParser().parse(parserFabric, this, queryBuilder);
    }

    @Getter
    @AllArgsConstructor
    public enum Score {
        AVG("avg"),
        MAX("max"),
        MIN("min"),
        TOTAL("total"),
        SUM("sum");
        private final String param;
    }
}
```

Difference from `SmParentWrappedQuery`: this one nests `SmQuery` for both child and parent filter (recursive), and exposes `Score` mode explicitly. Use when you need full programmatic control of the block-join. `SmParentWrappedQuery` is more convenient for the common case where the parent-filter is shared and the child query is already rendered.

### `SmCollapseFilter` — collapse on a field

```java
package com.example.semantic.model.query;

import com.example.semantic.model.parsers.ParsedQuery;
import com.example.semantic.model.parsers.QueryParserFabric;
import lombok.Data;

@Data
public class SmCollapseFilter implements SmQuery {
    private String queryId;
    private final String fieldName;

    @Override
    public <R extends ParsedQuery> R parse(QueryParserFabric<R> parserFabric, R queryBuilder) {
        return parserFabric.getCollapseFilterParser().parse(parserFabric, this, queryBuilder);
    }
}
```

## Solr translation: `SolrParsedQuery` and the parser fabric

### `SolrParsedQuery` — the result builder

```java
package com.example.semantic.model.parsers.solr;

import com.example.semantic.model.QueryParameters;
import com.example.semantic.model.parsers.ParsedQuery;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.example.semantic.model.query.SmQuery;
import lombok.Data;

@Data
public class SolrParsedQuery implements ParsedQuery {
    private static final QueryParserFabric<SolrParsedQuery> FABRIC = new SolrQueryParserFabric();

    private String query;                                  // last-written query string (the "main" one)
    private QueryParameters params = new QueryParameters(); // named params, keyed by queryId

    public static SolrParsedQuery from(QueryParameters params) {
        SolrParsedQuery q = new SolrParsedQuery();
        q.setParams(params);
        return q;
    }

    public void addParameter(String key, String value) {
        if (key != null) {
            String old = params.getParameters().put(key, value);
            if (old != null && !old.equals(value)) {
                throw new RuntimeException(
                    "Duplicate parameter: " + key + ". Values: " + old + " and " + value);
            }
        }
    }

    public int getParamsSize() { return params.getParameters().size(); }
    public String getParam(String key) { return params.getParameters().get(key); }

    /** Entry point: parse an Sm tree against the Solr fabric. */
    public SolrParsedQuery parse(SmQuery smQuery) {
        return smQuery.parse(FABRIC, this);
    }
}
```

`QueryParameters` is a thin wrapper around `Map<String, String>`:

```java
package com.example.semantic.model;

import lombok.Data;
import java.util.HashMap;
import java.util.Map;

@Data
public class QueryParameters {
    private Map<String, String> parameters = new HashMap<>();
}
```

### How the named-param indirection works

Look at how `SolrParsedQuery` accumulates state. When a `SmTermQuery` is parsed, the translator:

1. Builds the Solr query string `{!term f=color_s v='red'}`
2. Calls `queryBuilder.addParameter(queryId, queryString)` — stores it under the term's ID
3. Calls `queryBuilder.setQuery(queryString)` — also makes it the "current" query

Now when `SmBooleanQuery` is parsed, it doesn't have to inline the term query string — it just references its ID:
```
{!bool must=$term_id_1 should=$term_id_2 mm=2}
```

The final HTTP request to Solr looks like:
```
?q={!bool must=$term_id_1 should=$term_id_2 mm=2}
&term_id_1={!term f=color_s v='red'}
&term_id_2={!term f=brand_s v='nike'}
```

This avoids deeply nested `{!}` syntax (which Solr does support, but is hard to read and easy to misquote) and lets you reuse the same sub-query by ID multiple times in a request.

The "main query" gets sent as `q=<latest-string>`; the named params are sent alongside.

### `SolrQueryParserFabric` — registers all parsers

```java
package com.example.semantic.model.parsers.solr;

import com.example.semantic.model.parsers.QueryParser;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.example.semantic.model.query.*;

public class SolrQueryParserFabric implements QueryParserFabric<SolrParsedQuery> {
    private static final SmBooleanSolrQP            BOOLEAN              = new SmBooleanSolrQP();
    private static final SmBoostSolrQP              BOOST                = new SmBoostSolrQP();
    private static final SmChildWrappedSolrQP       CHILD_WRAPPED        = new SmChildWrappedSolrQP();
    private static final SmCollapseFilterSolrQP     COLLAPSE             = new SmCollapseFilterSolrQP();
    private static final SmDisjunctionMaxSolrQP     DIS_MAX              = new SmDisjunctionMaxSolrQP();
    private static final SmEdismaxBoostSolrQP       EDISMAX_BOOST        = new SmEdismaxBoostSolrQP();
    private static final SmEdismaxSolrQP            EDISMAX              = new SmEdismaxSolrQP();
    private static final SmParentWrappedSolrQP      PARENT_WRAPPED       = new SmParentWrappedSolrQP();
    private static final SmTermSolrQP               TERM                 = new SmTermSolrQP();
    private static final SmTermsSolrQP              TERMS                = new SmTermsSolrQP();
    private static final SmToParentBlockJoinSolrQP  TO_PARENT_BLOCK_JOIN = new SmToParentBlockJoinSolrQP();

    @Override public QueryParser<SmBooleanQuery, SolrParsedQuery>           getBooleanQueryParser()          { return BOOLEAN; }
    @Override public QueryParser<SmBoostQuery, SolrParsedQuery>             getBoostQueryParser()            { return BOOST; }
    @Override public QueryParser<SmChildWrappedQuery, SolrParsedQuery>      getChildWrappedQueryParser()     { return CHILD_WRAPPED; }
    @Override public QueryParser<SmCollapseFilter, SolrParsedQuery>         getCollapseFilterParser()        { return COLLAPSE; }
    @Override public QueryParser<SmDisjunctionMaxQuery, SolrParsedQuery>    getDisjunctionMaxQueryParser()   { return DIS_MAX; }
    @Override public QueryParser<SmEdismaxBoostQuery, SolrParsedQuery>      getEdismaxBoostQueryParser()     { return EDISMAX_BOOST; }
    @Override public QueryParser<SmEdismaxQuery, SolrParsedQuery>           getEdismaxQueryParser()          { return EDISMAX; }
    @Override public QueryParser<SmParentWrappedQuery, SolrParsedQuery>     getParentWrappedQueryParser()    { return PARENT_WRAPPED; }
    @Override public QueryParser<SmTermQuery, SolrParsedQuery>              getTermQueryParser()             { return TERM; }
    @Override public QueryParser<SmTermsQuery, SolrParsedQuery>             getTermsQueryParser()            { return TERMS; }
    @Override public QueryParser<SmToParentBlockJoinQuery, SolrParsedQuery> getToParentBlockJoinQueryParser(){ return TO_PARENT_BLOCK_JOIN; }
}
```

## Per-type Solr translators

Each one is small. Pattern: produce the Solr query string, call `addParameter(queryId, str)` and `setQuery(str)` on the builder.

### `SmTermSolrQP`

```java
package com.example.semantic.model.parsers.solr;

import com.example.semantic.model.parsers.QueryParser;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.example.semantic.model.query.SmTermQuery;

import java.util.Locale;
import java.util.Objects;

public class SmTermSolrQP implements QueryParser<SmTermQuery, SolrParsedQuery> {
    @Override
    public SolrParsedQuery parse(QueryParserFabric<SolrParsedQuery> fabric,
                                  SmTermQuery query, SolrParsedQuery builder) {
        String result = query.isCacheEnabled()
            ? String.format(Locale.US, "{!term f=%s v='%s'}",
                Objects.requireNonNull(query.getFieldName()),
                Objects.requireNonNull(query.getValue()))
            : String.format(Locale.US, "{!term f=%s v='%s' cache=false}",
                Objects.requireNonNull(query.getFieldName()),
                Objects.requireNonNull(query.getValue()));
        builder.addParameter(query.getQueryId(), result);
        builder.setQuery(result);
        return builder;
    }
}
```

### `SmTermsSolrQP`

```java
package com.example.semantic.model.parsers.solr;

import com.example.semantic.model.parsers.QueryParser;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.example.semantic.model.query.SmTermsQuery;

import java.util.Locale;

public class SmTermsSolrQP implements QueryParser<SmTermsQuery, SolrParsedQuery> {
    @Override
    public SolrParsedQuery parse(QueryParserFabric<SolrParsedQuery> fabric,
                                  SmTermsQuery query, SolrParsedQuery builder) {
        String cacheClause = query.isCacheEnabled() ? "" : " cache=false";
        String result = String.format(Locale.US, "{!terms f=%s separator='%s'%s}%s",
            query.getFieldName(),
            query.getSeparator(),
            cacheClause,
            query.getValue());
        builder.addParameter(query.getQueryId(), result);
        builder.setQuery(result);
        return builder;
    }
}
```

### `SmBooleanSolrQP` — the named-param trick

```java
package com.example.semantic.model.parsers.solr;

import com.example.semantic.model.parsers.QueryParser;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.example.semantic.model.query.SmBooleanQuery;
import com.example.semantic.model.query.SmClause;
import org.apache.commons.lang3.StringUtils;

public class SmBooleanSolrQP implements QueryParser<SmBooleanQuery, SolrParsedQuery> {

    private static String occurToSolrParam(SmClause.Occur occur) {
        switch (occur) {
            case SHOULD:    return "should";
            case MUST:      return "must";
            case MUST_NOT:  return "must_not";
            case FILTER:    return "filter";
            default: throw new IllegalArgumentException("Unknown occur: " + occur);
        }
    }

    @Override
    public SolrParsedQuery parse(QueryParserFabric<SolrParsedQuery> fabric,
                                  SmBooleanQuery query, SolrParsedQuery builder) {
        StringBuilder sb;
        if (StringUtils.isNotBlank(query.getTag())) {
            sb = new StringBuilder("{!tag=").append(query.getTag()).append("}").append("{!bool");
        } else {
            sb = new StringBuilder("{!bool");
        }

        // First, recursively parse each clause — this populates named params on the builder
        query.getClauses().stream()
            .map(SmClause::getQuery)
            .forEach(sub -> sub.parse(fabric, builder));

        // Then reference each clause by its queryId
        query.getClauses().forEach(c -> sb
            .append(" ")
            .append(occurToSolrParam(c.getOccurs()))
            .append("=$")
            .append(c.getQuery().getQueryId()));

        if (query.getMinimumNumberShouldMatch() != null && query.getMinimumNumberShouldMatch() > 0) {
            sb.append(" mm=").append(query.getMinimumNumberShouldMatch());
        }

        String result = sb.append("}").toString();
        builder.addParameter(query.getQueryId(), result);
        builder.setQuery(result);
        return builder;
    }
}
```

This is the heart of the translation. Every clause's sub-query is parsed first (registering itself as a named param), then the boolean query string just references those params: `must=$id1 should=$id2`.

Required: every `SmQuery` going into a boolean clause must have its `queryId` set. If it's null, you'll get `must=$null` which Solr can't resolve. The `SemanticQueryBuilder` (caller) is responsible for assigning IDs.

### `SmBoostSolrQP`

```java
package com.example.semantic.model.parsers.solr;

import com.example.semantic.model.parsers.QueryParser;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.example.semantic.model.query.SmBoostQuery;

import java.util.Locale;

public class SmBoostSolrQP implements QueryParser<SmBoostQuery, SolrParsedQuery> {
    @Override
    public SolrParsedQuery parse(QueryParserFabric<SolrParsedQuery> fabric,
                                  SmBoostQuery query, SolrParsedQuery builder) {
        // Parse the inner query first (registers its named param)
        query.getBoostedQuery().parse(fabric, builder);

        String inner = "$" + query.getBoostedQuery().getQueryId();
        String result = String.format(Locale.US, "{!boost b=%s}%s", query.getBoost(), inner);

        builder.addParameter(query.getQueryId(), result);
        builder.setQuery(result);
        return builder;
    }
}
```

### `SmDisjunctionMaxSolrQP`

```java
package com.example.semantic.model.parsers.solr;

import com.example.semantic.model.parsers.QueryParser;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.example.semantic.model.query.SmDisjunctionMaxQuery;
import com.example.semantic.model.query.SmQuery;

import java.util.Locale;
import java.util.stream.Collectors;

public class SmDisjunctionMaxSolrQP implements QueryParser<SmDisjunctionMaxQuery, SolrParsedQuery> {
    @Override
    public SolrParsedQuery parse(QueryParserFabric<SolrParsedQuery> fabric,
                                  SmDisjunctionMaxQuery query, SolrParsedQuery builder) {
        // Render each sub-query first
        query.getQueries().forEach(sub -> sub.parse(fabric, builder));

        String subRefs = query.getQueries().stream()
            .map(SmQuery::getQueryId)
            .map(id -> "$" + id)
            .collect(Collectors.joining(" "));

        String tieBreaker = query.getTieBreaker() != null
            ? String.format(Locale.US, " tie=%s", query.getTieBreaker())
            : "";

        // Solr's {!dismax} doesn't support param-ref expansion the same way as {!bool},
        // so we inline by joining sub-queries as a single q-style body. Adjust per your needs.
        String result = String.format(Locale.US, "{!dismax%s}%s", tieBreaker, subRefs);

        builder.addParameter(query.getQueryId(), result);
        builder.setQuery(result);
        return builder;
    }
}
```

`{!dismax}` doesn't natively expand `$paramref` like `{!bool}` does, so DisjunctionMax usually needs its sub-queries inlined or wrapped differently. The exact form depends on your usage — adjust the format string. For most use cases, prefer `SmBooleanQuery` with `SHOULD` clauses + tie-breaker semantics expressed via boost weights instead.

### `SmEdismaxSolrQP`

```java
package com.example.semantic.model.parsers.solr;

import com.example.semantic.model.parsers.QueryParser;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.example.semantic.model.query.SmEdismaxQuery;
import org.apache.commons.lang3.StringUtils;

import java.util.Locale;

public class SmEdismaxSolrQP implements QueryParser<SmEdismaxQuery, SolrParsedQuery> {
    @Override
    public SolrParsedQuery parse(QueryParserFabric<SolrParsedQuery> fabric,
                                  SmEdismaxQuery query, SolrParsedQuery builder) {
        String qf = String.join(" ", query.getQueryFields());
        String op = query.isForceAndOperator() ? " q.op=AND" : "";

        String boostPart = "";
        if (query.getBoostQuery() != null) {
            query.getBoostQuery().parse(fabric, builder);
            boostPart = String.format(" bq=$%s", query.getBoostQuery().getQueryId());
        }

        String result = String.format(Locale.US,
            "{!edismax qf='%s'%s%s v='%s'}",
            qf, op, boostPart, query.getValue());

        builder.addParameter(query.getQueryId(), result);
        builder.setQuery(result);
        return builder;
    }
}
```

### `SmEdismaxBoostSolrQP`

```java
package com.example.semantic.model.parsers.solr;

import com.example.semantic.model.parsers.QueryParser;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.example.semantic.model.query.SmEdismaxBoostQuery;

import java.util.Locale;

public class SmEdismaxBoostSolrQP implements QueryParser<SmEdismaxBoostQuery, SolrParsedQuery> {
    @Override
    public SolrParsedQuery parse(QueryParserFabric<SolrParsedQuery> fabric,
                                  SmEdismaxBoostQuery query, SolrParsedQuery builder) {
        String result = String.format(Locale.US, "%s:%s^%d",
            query.getField(), query.getValue(), query.getBoost());

        builder.addParameter(query.getQueryId(), result);
        builder.setQuery(result);
        return builder;
    }
}
```

### `SmParentWrappedSolrQP`

```java
package com.example.semantic.model.parsers.solr;

import com.example.semantic.model.parsers.QueryParser;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.example.semantic.model.query.SmParentWrappedQuery;
import org.apache.commons.lang3.StringUtils;

import java.util.Objects;

public class SmParentWrappedSolrQP implements QueryParser<SmParentWrappedQuery, SolrParsedQuery> {
    @Override
    public SolrParsedQuery parse(QueryParserFabric<SolrParsedQuery> fabric,
                                  SmParentWrappedQuery query, SolrParsedQuery builder) {
        Objects.requireNonNull(query.getWhichScope(), "whichScope is required: " + query);
        Objects.requireNonNull(query.getInnerQuery(), "innerQuery is required: " + query);

        String tagPart = (query.getTag() != null) ? "{!tag=" + query.getTag() + "}" : "";
        String scorePart = StringUtils.isNotBlank(query.getScore())
            ? " score=" + query.getScore() : "";

        String result = String.format("%s{!parent which=$%s%s}%s",
            tagPart, query.getWhichScope().getParamName(), scorePart, query.getInnerQuery());

        builder.addParameter(query.getQueryId(), result);
        builder.setQuery(result);
        return builder;
    }
}
```

The `which=$paramName` references a top-level Solr param holding the parent-filter — the caller is responsible for setting that param too (typically once per request, naming a query like `type_s:product`).

### `SmChildWrappedSolrQP`

```java
package com.example.semantic.model.parsers.solr;

import com.example.semantic.model.parsers.QueryParser;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.example.semantic.model.query.SmChildWrappedQuery;

import java.util.Objects;

public class SmChildWrappedSolrQP implements QueryParser<SmChildWrappedQuery, SolrParsedQuery> {
    @Override
    public SolrParsedQuery parse(QueryParserFabric<SolrParsedQuery> fabric,
                                  SmChildWrappedQuery query, SolrParsedQuery builder) {
        Objects.requireNonNull(query.getWhichScope());
        Objects.requireNonNull(query.getInnerQuery());

        String tagPart = (query.getTag() != null) ? "{!tag=" + query.getTag() + "}" : "";

        String result = String.format("%s{!child of=$%s}%s",
            tagPart, query.getWhichScope(), query.getInnerQuery());

        builder.addParameter(query.getQueryId(), result);
        builder.setQuery(result);
        return builder;
    }
}
```

### `SmToParentBlockJoinSolrQP`

```java
package com.example.semantic.model.parsers.solr;

import com.example.semantic.model.parsers.QueryParser;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.example.semantic.model.query.SmToParentBlockJoinQuery;

public class SmToParentBlockJoinSolrQP implements QueryParser<SmToParentBlockJoinQuery, SolrParsedQuery> {
    @Override
    public SolrParsedQuery parse(QueryParserFabric<SolrParsedQuery> fabric,
                                  SmToParentBlockJoinQuery query, SolrParsedQuery builder) {
        // Parse parent filter and child query first (register their IDs)
        query.getParentFilter().parse(fabric, builder);
        query.getChildQuery().parse(fabric, builder);

        String result = String.format("{!parent which=$%s score=%s}$%s",
            query.getParentFilter().getQueryId(),
            query.getScore().getParam(),
            query.getChildQuery().getQueryId());

        builder.addParameter(query.getQueryId(), result);
        builder.setQuery(result);
        return builder;
    }
}
```

### `SmCollapseFilterSolrQP`

```java
package com.example.semantic.model.parsers.solr;

import com.example.semantic.model.parsers.QueryParser;
import com.example.semantic.model.parsers.QueryParserFabric;
import com.example.semantic.model.query.SmCollapseFilter;

public class SmCollapseFilterSolrQP implements QueryParser<SmCollapseFilter, SolrParsedQuery> {
    @Override
    public SolrParsedQuery parse(QueryParserFabric<SolrParsedQuery> fabric,
                                  SmCollapseFilter query, SolrParsedQuery builder) {
        String result = String.format("{!collapse field=%s}", query.getFieldName());
        builder.addParameter(query.getQueryId(), result);
        builder.setQuery(result);
        return builder;
    }
}
```

## End-to-end usage example

Put it all together. Build an Sm tree, translate to Solr, get back the params:

```java
// Build: query for "sony wh-1000xm5" matching brand_name_concept OR model_name_concept,
// boosted, with mm=2

SmTermQuery sony = new SmTermQuery("brand_name_concept", "sony", "sony_term");
SmTermQuery wh1000xm5Line = new SmTermQuery("brand_name_concept", "wh-1000xm5", "wh1000xm5_as_line");
SmTermQuery wh1000xm5Model = new SmTermQuery("model_name_concept", "wh-1000xm5", "wh1000xm5_as_model");

// wh-1000xm5 could be a line OR a model — wrap as boolean SHOULD with mm=1
SmBooleanQuery wh1000xm5Alternatives = new SmBooleanQuery(1, "wh1000xm5_alternatives");
wh1000xm5Alternatives.add(wh1000xm5Line, SmClause.Occur.SHOULD);
wh1000xm5Alternatives.add(wh1000xm5Model, SmClause.Occur.SHOULD);

// Top-level: sony MUST + wh-1000xm5 alternatives MUST, with mm=2
SmBooleanQuery topLevel = new SmBooleanQuery(2, "top_level");
topLevel.add(sony, SmClause.Occur.MUST);
topLevel.add(wh1000xm5Alternatives, SmClause.Occur.MUST);

// Optionally boost the whole thing
SmBoostQuery boosted = new SmBoostQuery();
boosted.setBoostedQuery(topLevel);
boosted.setBoost(1.5f);
boosted.setQueryId("boosted_root");

// Translate to Solr
SolrParsedQuery solr = new SolrParsedQuery();
solr.parse(boosted);

// solr.getQuery() now holds the main query string
// solr.getParams().getParameters() holds all named sub-queries

System.out.println("Main: " + solr.getQuery());
solr.getParams().getParameters().forEach((k, v) ->
    System.out.println("  " + k + " = " + v));
```

Output (formatted):
```
Main: {!boost b=1.5}$top_level

  sony_term              = {!term f=brand_name_concept v='sony'}
  wh1000xm5_as_line      = {!term f=brand_name_concept v='wh-1000xm5'}
  wh1000xm5_as_model     = {!term f=model_name_concept v='wh-1000xm5'}
  wh1000xm5_alternatives = {!bool should=$wh1000xm5_as_line should=$wh1000xm5_as_model mm=1}
  top_level              = {!bool must=$sony_term must=$wh1000xm5_alternatives mm=2}
  boosted_root           = {!boost b=1.5}$top_level
```

Send to Solr:
```
GET /solr/catalog/select
  ?q={!boost b=1.5}$top_level
  &top_level={!bool must=$sony_term must=$wh1000xm5_alternatives mm=2}
  &wh1000xm5_alternatives={!bool should=$wh1000xm5_as_line should=$wh1000xm5_as_model mm=1}
  &sony_term={!term f=brand_name_concept v='sony'}
  &wh1000xm5_as_line={!term f=brand_name_concept v='wh-1000xm5'}
  &wh1000xm5_as_model={!term f=model_name_concept v='wh-1000xm5'}
  &boosted_root={!boost b=1.5}$top_level
```

Solr resolves the `$paramref` expansions internally and runs the equivalent BooleanQuery.

## Adding a new backend

To target Elasticsearch (or anything else), implement:

1. `EsParsedQuery implements ParsedQuery` — accumulates ES query JSON
2. `EsQueryParserFabric implements QueryParserFabric<EsParsedQuery>` — creates ES-specific parsers
3. One `Sm*EsQP implements QueryParser<Sm*Query, EsParsedQuery>` per Sm subtype

The Sm tree itself doesn't change — it's pure data. Only the fabric and translators are backend-specific.

```java
// Same Sm tree:
SmBooleanQuery topLevel = ...;

// Translate to ES instead:
EsParsedQuery es = new EsParsedQuery();
es.parse(topLevel);

// es.getJson() now holds the equivalent ES query JSON
```

This is the payoff for the indirection — production deployments that run Solr and Elasticsearch from the same staging pipeline produce both via this mechanism.

## Common pitfalls

### Forgetting `queryId`

Most translators reference sub-queries via `$queryId`. If a sub-query has `queryId == null`, you'll get `$null` in the output, which Solr can't resolve.

Always assign `queryId` either:
- In the constructor
- Before adding to a boolean query (`q.setQueryId("path_3_term_5")`)
- Use a counter/sequencer in your `SemanticQueryBuilder`

### Reusing the same `SmQuery` instance in multiple positions

If you put the same `SmTermQuery` instance in two boolean clauses, both clauses reference the same `queryId` — same param, no duplication. That's intended for sharing.

But if you set the queryId AFTER adding to one place and adding to another — the second add sees the new ID. State mutates, behavior differs from intuition. Set IDs first, then add.

### Boolean clauses without sub-query parse

`SmBooleanSolrQP.parse` parses each clause's sub-query first, THEN composes the bool string. If you skip the sub-parse, the named params don't get registered, the bool query references undefined `$paramId`s. Always recurse.

### Cyclic Sm trees

The visitor doesn't detect cycles. If you accidentally build `A → B → A`, parse() recurses forever. Don't share `SmQuery` instances in cycles. Sharing as DAG (one query referenced from multiple parents) is fine.

### Mismatched Lombok annotations

`@Data` includes equals/hashCode that consider all non-static fields. If two `SmTermQuery` instances have the same field+value but different `queryId`, they're not equal — which is what you want for the param-named-by-ID model. If you remove `queryId` from equality, you'd start sharing IDs in unintended ways.

If you don't use Lombok, implement equals/hashCode by hand and include all fields the param-resolution depends on.

### Heavy boost values lost in `int` field

`SmEdismaxBoostQuery.boost` is `int`. If you need fractional boosts (`^1.5`), change to `float`. Same for any other boost-bearing field — pick the type that fits your boost arithmetic precision needs.
