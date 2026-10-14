# ValueSourceParser — Custom Function Queries (Solr 9.x)

A `ValueSourceParser` lets you add new functions usable in `bf=`, `boost=`, `sort=`, `{!func}`, `{!frange}` — anywhere Solr accepts function syntax. Use for: domain-specific scoring math that's not expressible with built-in functions.

For built-in functions and how to use them, USE SKILL `solr-query` to apply function queries and spatial. This file is about **adding your own**.

## When justified

- The math involves multiple fields with non-trivial combination (built-ins are limited)
- You need access to docValues in custom ways (cardinality, stats, etc.)
- You want to expose external lookup as a function (e.g., per-doc score from an ML model)
- The expression is so common in your queries that named function is cleaner than `mul(div(...),...)` chains

Not justified:
- "I want a shorter name for `log(sum(x,1))`" — that's what request param defaults are for
- One-off math you'll use once

## Anatomy

Three layers: `ValueSourceParser` (the factory), `ValueSource` (the function), `FunctionValues` (the per-segment evaluator).

```java
package com.example;

public class MyValueSourceParser extends ValueSourceParser {
    @Override
    public ValueSource parse(FunctionQParser fp) throws SyntaxError {
        // parse function args from the syntax: myfunc(arg1, arg2)
        ValueSource arg1 = fp.parseValueSource();
        ValueSource arg2 = fp.parseValueSource();
        return new MyValueSource(arg1, arg2);
    }
}

class MyValueSource extends ValueSource {
    private final ValueSource arg1;
    private final ValueSource arg2;

    MyValueSource(ValueSource arg1, ValueSource arg2) {
        this.arg1 = arg1;
        this.arg2 = arg2;
    }

    @Override
    public FunctionValues getValues(Map context, LeafReaderContext readerContext) throws IOException {
        FunctionValues v1 = arg1.getValues(context, readerContext);
        FunctionValues v2 = arg2.getValues(context, readerContext);
        return new FunctionValues() {
            @Override
            public double doubleVal(int doc) throws IOException {
                return v1.doubleVal(doc) * v2.doubleVal(doc) + 1.0;
            }
            @Override
            public String toString(int doc) throws IOException {
                return "myfunc(" + v1.toString(doc) + "," + v2.toString(doc) + ")=" + doubleVal(doc);
            }
        };
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MyValueSource)) return false;
        MyValueSource other = (MyValueSource) o;
        return arg1.equals(other.arg1) && arg2.equals(other.arg2);
    }

    @Override
    public int hashCode() {
        return Objects.hash(arg1, arg2);
    }

    @Override
    public String description() {
        return "myfunc(" + arg1.description() + "," + arg2.description() + ")";
    }
}
```

Register in solrconfig.xml:
```xml
<valueSourceParser name="myfunc" class="com.example.MyValueSourceParser"/>
```

Use:
```
bf=myfunc(popularity_i, ratings_avg_f)
boost=myfunc(field1_f, field2_f)
sort=myfunc(field1, field2) desc
fq={!frange l=1.5}myfunc(field1, field2)
```

## Parsing args from `FunctionQParser`

`FunctionQParser` provides helpers for the common cases:

```java
ValueSource vs = fp.parseValueSource();   // recursive — parses field name, constant, or nested function
String s = fp.parseArg();                  // parses a literal string arg (quoted)
int i = fp.parseInt();                     // integer constant
float f = fp.parseFloat();                 // float constant
List<ValueSource> list = fp.parseValueSourceList();   // comma-separated list until `)`

boolean hasMoreArgs = fp.hasMoreArguments();  // peek
```

Use these to build the right argument signatures:

```java
// myfunc(field) — single field
ValueSource arg = fp.parseValueSource();

// myfunc(field, threshold) — field plus float
ValueSource field = fp.parseValueSource();
float threshold = fp.parseFloat();

// myfunc(field, "literal_str", 5) — mixed
ValueSource field = fp.parseValueSource();
String label = fp.parseArg();
int count = fp.parseInt();

// myfunc(f1, f2, f3, ...) — variable args
List<ValueSource> args = fp.parseValueSourceList();
```

## `FunctionValues` per-segment

`getValues(context, readerContext)` is called **once per segment**. The returned `FunctionValues` then has `doubleVal(int doc)` called for each doc within the segment.

For docValues-backed fields:
```java
@Override
public FunctionValues getValues(Map context, LeafReaderContext readerContext) throws IOException {
    NumericDocValues docValues = DocValues.getNumeric(readerContext.reader(), fieldName);
    return new FunctionValues() {
        @Override
        public double doubleVal(int doc) throws IOException {
            if (docValues.advanceExact(doc)) {
                return docValues.longValue();
            }
            return 0.0;
        }
        // implement other methods as needed
    };
}
```

For multivalued fields with docValues:
```java
SortedNumericDocValues sndv = DocValues.getSortedNumeric(readerContext.reader(), fieldName);
// per doc, advance and call sndv.docValueCount() and sndv.nextValue()
```

For text/string fields with docValues:
```java
SortedDocValues sdv = DocValues.getSorted(readerContext.reader(), fieldName);
// per doc, sdv.advanceExact(doc) → sdv.lookupOrd(sdv.ordValue()).utf8ToString()
```

## Implementing `equals`/`hashCode`

`ValueSource` instances are cached by Solr — equal ValueSources reuse cached results. **Always implement `equals` and `hashCode`** based on all configuration that affects output. Forgetting this means cache entries collide silently or never reuse, depending on the bug.

```java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof MyValueSource)) return false;
    MyValueSource other = (MyValueSource) o;
    return arg1.equals(other.arg1)
        && arg2.equals(other.arg2)
        && threshold == other.threshold;
}

@Override
public int hashCode() {
    return Objects.hash(arg1, arg2, threshold);
}
```

If your function depends on external state that varies across requests (e.g., user context), include it in equals/hashCode — or, better, take it as an argument so it appears in the function syntax.

## `FunctionValues` methods to implement

The base class declares many; you must override the ones your function actually returns:

| Method | When to implement |
|---|---|
| `doubleVal(int)` | Almost always (default scoring) |
| `floatVal(int)` | If used in sort or score |
| `longVal(int)`, `intVal(int)` | For integer-typed functions |
| `strVal(int)` | If function should be sortable as string |
| `exists(int)` | Check if value defined for doc |
| `toString(int)` | For explain output |

Default implementations of unimplemented methods throw `UnsupportedOperationException`. If a downstream operation uses one you didn't override (e.g., sorting by your function in long mode), you'll see a runtime error.

## Function Score Query (full Lucene Query from a function)

If you need your function to be the entire query (not just a boost), wrap with `FunctionScoreQuery`:

```java
@Override
public Query parse() throws SyntaxError {
    ValueSource vs = ...;
    return new FunctionScoreQuery(new MatchAllDocsQuery(), vs.asDoubleValuesSource());
}
```

This is what `{!func}myfunc(...)` does internally. Useful when you want to rank everything by the function value.

## Common patterns

### Pattern 1: cap a field at a max

```java
class CapValueSource extends ValueSource {
    private final ValueSource inner;
    private final double cap;

    CapValueSource(ValueSource inner, double cap) {
        this.inner = inner;
        this.cap = cap;
    }

    @Override
    public FunctionValues getValues(Map context, LeafReaderContext readerContext) throws IOException {
        FunctionValues iv = inner.getValues(context, readerContext);
        return new FunctionValues() {
            @Override
            public double doubleVal(int doc) throws IOException {
                return Math.min(iv.doubleVal(doc), cap);
            }
            // ...
        };
    }
}
```

Use:
```
bf=cap(popularity_i, 1000.0)
```

For e-commerce ranking, capping outliers (one product with viral popularity_i=1M shouldn't dominate) is a common pattern that's awkward without a custom function.

### Pattern 2: docValues-aware count

```java
class MultiValuedCountValueSource extends ValueSource {
    private final String fieldName;

    @Override
    public FunctionValues getValues(Map context, LeafReaderContext readerContext) throws IOException {
        SortedSetDocValues ssdv = DocValues.getSortedSet(readerContext.reader(), fieldName);
        return new FunctionValues() {
            @Override
            public double doubleVal(int doc) throws IOException {
                if (!ssdv.advanceExact(doc)) return 0.0;
                long count = 0;
                while (ssdv.nextOrd() != SortedSetDocValues.NO_MORE_ORDS) {
                    count++;
                }
                return count;
            }
        };
    }
}
```

Use:
```
boost=mvcount(tag_ss)
```

Boosts docs with more tags. Useful as proxy for completeness/richness.

### Pattern 3: weighted multi-field combination

```java
class WeightedSumValueSource extends ValueSource {
    private final ValueSource[] sources;
    private final double[] weights;

    @Override
    public FunctionValues getValues(Map context, LeafReaderContext readerContext) throws IOException {
        FunctionValues[] fvs = new FunctionValues[sources.length];
        for (int i = 0; i < sources.length; i++) {
            fvs[i] = sources[i].getValues(context, readerContext);
        }
        return new FunctionValues() {
            @Override
            public double doubleVal(int doc) throws IOException {
                double sum = 0;
                for (int i = 0; i < fvs.length; i++) {
                    sum += weights[i] * fvs[i].doubleVal(doc);
                }
                return sum;
            }
        };
    }
}
```

Use:
```
boost=wsum(rating_f, 0.5, popularity_log_f, 0.3, recency_score_f, 0.2)
```

Cleaner than nested `sum(mul(rating,0.5), mul(popularity_log,0.3), mul(recency,0.2))`.

### Pattern 4: docValues lookup with default

```java
class FieldOrDefaultValueSource extends ValueSource {
    private final String fieldName;
    private final double defaultValue;

    @Override
    public FunctionValues getValues(Map context, LeafReaderContext readerContext) throws IOException {
        NumericDocValues ndv = DocValues.getNumeric(readerContext.reader(), fieldName);
        return new FunctionValues() {
            @Override
            public double doubleVal(int doc) throws IOException {
                if (ndv.advanceExact(doc)) return ndv.longValue();
                return defaultValue;
            }
            @Override
            public boolean exists(int doc) throws IOException {
                return true;  // function always exists
            }
        };
    }
}
```

Like built-in `def(field, default)` but explicit and customizable.

## Common mistakes

### Per-doc instantiation in `getValues`

```java
@Override
public FunctionValues getValues(Map context, LeafReaderContext readerContext) throws IOException {
    return new FunctionValues() {
        @Override public double doubleVal(int doc) throws IOException {
            NumericDocValues ndv = DocValues.getNumeric(readerContext.reader(), fieldName);  // BAD: per-doc
            // ...
        }
    };
}
```

Get docValues **once** in `getValues`, then use them in the inner per-doc method. Per-doc DocValues lookup destroys performance.

### Forgetting `equals`/`hashCode`

Without proper equals/hashCode, ValueSource caching is broken. Two equivalent functions create separate cache entries; identical queries don't reuse work. Always implement.

### Using non-docValues field

```java
NumericDocValues ndv = DocValues.getNumeric(readerContext.reader(), fieldName);
// ndv may be null or empty if field doesn't have docValues
```

If your function reads a field, the field MUST be `docValues=true` in schema. Otherwise you get null/empty results silently. Validate at parser-init time:

```java
public ValueSource parse(FunctionQParser fp) throws SyntaxError {
    String field = fp.parseArg();
    SchemaField sf = fp.getReq().getSchema().getField(field);
    if (!sf.hasDocValues()) {
        throw new SyntaxError("field '" + field + "' must have docValues for myfunc");
    }
    return new MyValueSource(field);
}
```

### Not handling the segment-boundary case

`getValues` is called once per segment. If you accumulate state across segments, that breaks. Each segment is independent; never share `FunctionValues` across them.

### Throwing in `doubleVal`

```java
@Override
public double doubleVal(int doc) throws IOException {
    if (docValues.advanceExact(doc)) {
        return docValues.longValue();
    }
    throw new RuntimeException("missing value for doc " + doc);   // BAD
}
```

`doubleVal` is on the hot path. Throwing kills the whole query. Return `0.0`, `Double.NaN`, or use `exists()` to signal absence — never throw.

### Wrong description string

```java
@Override
public String description() {
    return "MyValueSource";   // BAD: should reproduce the syntax
}
```

`description()` shows in explain output. Make it look like the function call: `myfunc(arg1.description(), arg2.description())` — so when reading explain, you can trace back to the function syntax.

## Testing

```java
public class MyValueSourceParserTest extends SolrTestCaseJ4 {
    @BeforeClass public static void beforeClass() throws Exception {
        initCore("solrconfig.xml", "schema.xml");
    }

    @Test public void testFunctionScore() throws Exception {
        assertU(adoc("id", "1", "popularity_i", "100", "rating_f", "4.5"));
        assertU(adoc("id", "2", "popularity_i", "10", "rating_f", "4.0"));
        assertU(commit());

        assertQ("function should boost popular docs",
            req("q", "*:*",
                "defType", "edismax",
                "qf", "id^0.001",  // tiny base score
                "boost", "myfunc(popularity_i, rating_f)",
                "fl", "id,score"
            ),
            "//result/doc[1]/str[@name='id'][.='1']"  // popular doc ranks first
        );
    }
}
```
