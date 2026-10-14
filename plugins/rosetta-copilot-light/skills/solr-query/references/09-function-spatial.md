# Function Queries and Spatial

This file covers function queries (math expressions used in scoring or filtering) and spatial queries (geo distance, bbox, heatmaps). Both are heavily used in production search but underdocumented in the official Solr reference.

## Function queries: what they are

A function query is a Lucene query that returns a numeric value per document, computed from field values or constants. Used as:
- Scoring boost: `bf=log(popularity)` in eDisMax
- Ranking by computed value: `sort=mul(price,0.9) asc`
- Filter on computed value: `fq={!frange l=0 u=1.0}sub(rating,0.5)`
- As a query for ranking: `q={!func}log(popularity)`

The full list of functions is in the Solr docs; this file covers the most used and the gotchas.

## Field accessors

```
field('popularity_i')         # value of the field
field('popularity_i', min)    # for multivalued fields, aggregate
field('popularity_i', max)
```

Bare `popularity_i` works as shorthand for `field('popularity_i')`.

For multivalued fields, you must specify aggregation: `min`, `max`, `sum`, `avg`. Otherwise Solr errors out.

For text fields, function queries don't work — they need numeric or sortable atomic values (numeric, date, single-valued string with docValues).

## Constants

```
const(5)
const(3.14)
val(7)         # alias
literal('hello')   # for string contexts
```

`const(5)` is rarely needed explicitly — `5` is parsed as constant in most function contexts. But inside `sum(...)` you sometimes need explicit `const()`:
```
sum(popularity_i, const(1))    # to ensure 1 is treated as numeric, not field name
```

## Math operations

```
sum(a, b, c)        # a + b + c
sub(a, b)           # a - b
product(a, b)       # a * b (alias: mul)
div(a, b)           # a / b
mod(a, b)           # a mod b
sqrt(a)
log(a)              # natural log
ln(a)               # alias for log
exp(a)              # e^a
pow(a, b)           # a^b
abs(a)
min(a, b, ...)
max(a, b, ...)
ms(a, b)            # milliseconds: a - b (typically dates)
```

Watch out: `log(0)` is `-Infinity`. Always guard:
```
log(sum(popularity_i, 1))     # never log(0)
```

## Conditional and boolean

```
if(test, then_value, else_value)
exists(field)            # 1 if field exists, 0 otherwise
def(field, default)      # field value if exists, else default
not(test)
and(a, b)
or(a, b)
```

```
if(in_stock_b, 1.0, 0.3)              # multiplier for in-stock
if(exists(featured_b), 5.0, 1.0)      # boost featured docs
def(rating_f, 3.0)                    # default 3.0 for missing ratings
```

`if` returns a numeric. The `test` is treated as boolean (any nonzero value is true).

## Date and time

```
ms()                  # current time as milliseconds
ms(a)                 # field value as milliseconds since epoch (for date fields)
ms(a, b)              # difference in ms
```

The classic decay function:
```
recip(ms(NOW, created_dt), 3.16e-11, 1, 1)
```

Reads: 1 / (3.16e-11 × age_in_ms + 1)

The constant `3.16e-11` is `1 / (1 year in ms)`, so the function evaluates to ~1 for new docs and ~0.5 for one-year-old docs. Tune the constant to set the half-life.

`recip(x, m, a, b) = a / (m × x + b)`

## ord, rord, scale

```
ord(field)         # ordinal position in sorted unique values (1, 2, 3, ...)
rord(field)        # reverse ordinal (largest gets 1)
scale(func, min, max)   # scale function output to [min, max]
```

`ord`/`rord` are slow on high-cardinality fields — they require enumerating distinct values. Avoid in production.

`scale` is useful for normalizing computed scores:
```
scale(query($qq), 0, 1)     # normalize the query's scores to [0,1]
```

## Common combinations

### Time-decay boost
```
boost=recip(ms(NOW, created_dt), 3.16e-11, 1, 1)
```
Multiplicative half-life decay.

### Inventory boost
```
bq=stock_i:[1 TO *]^2          # binary boost via boost query
boost=if(stock_i>0, 1.0, 0.3)  # multiplicative penalty for OOS
```

### Logarithmic popularity
```
bf=log(sum(popularity_i, 1))
```
Diminishing returns: doubling popularity adds a constant.

### Ratio
```
fq={!frange l=0.5}div(positive_reviews_i, sum(reviews_i, 1))
```
Documents with at least 50% positive review rate.

### Weighted sum of fields
```
boost=sum(product(rating_f, 0.3), product(scale(price_f, 0, 1), -0.2))
```

## `{!frange}` — function range filter

```
fq={!frange l=0 u=100}price_f
fq={!frange l=10 incl=false}div(sales_i, views_i)
fq={!frange u=1.0}sub(0.5, score_field)
```

`l`, `u` — lower, upper bound (omit for unbounded)
`incl`, `incu` — inclusive lower / upper (defaults: `incl=true`, `incu=true`)

`{!frange}` evaluates the function for **every document** that passes other filters. Heavy. Always set `cost=100` to ensure it runs after cheap filters narrow the set:

```
fq={!frange l=0.5 cost=100}div(sales_i, views_i)
```

For non-cacheable variants:
```
fq={!frange l=$min cost=100 cache=false}div(sales_i, views_i)
&min=0.5
```

`cache=false` is necessary when the threshold varies per request — otherwise filterCache fills with one-off entries.

## `{!func}` — function as query

```
q={!func}log(popularity_i)
sort=score desc
```

The function value becomes the score. Useful for "show me popular things" without any text query.

For text + popularity hybrid, use `bf=` in eDisMax instead — combining `{!func}` with text queries via boolean is unwieldy.

---

## Spatial queries

Solr supports geo via `LatLonPointSpatialField` (or older `location` for legacy). This section covers query patterns; field setup is in solr-schema territory.

### Field setup (recap)

```xml
<fieldType name="latlon" class="solr.LatLonPointSpatialField"/>
<field name="store_location" type="latlon" indexed="true" stored="true"/>
```

Indexing:
```json
{ "id": "s1", "store_location": "37.7749,-122.4194" }
```

Format: `lat,lon` as a string. For multivalued (multiple locations per doc): just multiple values.

### `{!geofilt}` — within a radius

```
fq={!geofilt sfield=store_location pt=37.7749,-122.4194 d=5}
```

Returns docs where `store_location` is within 5 km of (37.7749, -122.4194).

`d=` is in km always. Solr does not have a unit option; convert if you have miles input.

For multiple centers OR'd:
```
fq={!geofilt sfield=store_location pt=37.7749,-122.4194 d=5} OR {!geofilt sfield=store_location pt=40.7128,-74.0060 d=5}
```

This requires the OR sit at top level Lucene syntax — `{!geofilt}` can't combine OR internally.

### `{!bbox}` — bounding box

```
fq={!bbox sfield=store_location pt=37.7749,-122.4194 d=5}
```

Same params, different shape. Bbox is faster than geofilt (rectangular vs circular). For coarse filtering followed by exact distance, use bbox to pre-filter then geofilt or `geodist()` to refine.

### `geodist()` — distance function

```
fl=*,distance:geodist(store_location,37.7749,-122.4194)
sort=geodist(store_location,37.7749,-122.4194) asc
```

Returns distance in km from the point. Use for sorting by distance and for displaying it.

For per-doc distance, `geodist()` runs in result-rendering — fine for small result pages, slow for thousands.

### Common patterns

#### Stores near user, sorted by distance
```
q=*:*
fq={!bbox sfield=store_location pt=37.7749,-122.4194 d=10}
sort=geodist(store_location,37.7749,-122.4194) asc
fl=id,name_s,distance:geodist(store_location,37.7749,-122.4194)
```

`bbox` for cheap filtering, `geodist` sort for ordering. Don't double-evaluate — use bbox even if geofilt would be more accurate, because the filter is the dominant cost.

#### Boost results by proximity
```
defType=edismax
q=coffee
qf=name_t description_t
boost=recip(geodist(store_location,$lat,$lon), 0.1, 1, 1)
&lat=37.7749
&lon=-122.4194
```

Multiplicative decay: closer = higher boost.

#### Combined geo + attributes
```
fq={!geofilt sfield=store_location pt=37.7749,-122.4194 d=5}
fq=open_b:true
fq=cuisine_s:Italian
sort=geodist(store_location,37.7749,-122.4194) asc
```

Order in `fq` matters for cache use; geofilt is expensive so put cheap filters first or use `cost=100` on geofilt:
```
fq={!geofilt sfield=store_location pt=37.7749,-122.4194 d=5 cost=100}
fq=open_b:true
fq=cuisine_s:Italian
```

### Heatmaps via JSON Facets

For map-tile aggregation:
```json
{
  "facet": {
    "density": {
      "type": "heatmap",
      "field": "store_location",
      "geom": "[\"-180 -90\" TO \"180 90\"]",
      "gridLevel": 6
    }
  }
}
```

`gridLevel` 1-12; higher = finer grid. Each cell returns the count of docs in that area.

Output is a 2D matrix of counts — useful for choropleth maps or density heatmaps.

### Spatial gotchas

- **`pt` order is `lat,lon`** — not `lon,lat`. GeoJSON uses `[lon, lat]`; Solr uses `lat,lon`. Mixing them up returns nonsense without errors.
- **Distance is always km**. No unit options. Convert miles before passing.
- **`geodist()` without geofilt scans everything**. Always pre-filter before sorting by distance.
- **Antimeridian**: bbox crossing the date line (e.g., spans 170° to -170°) needs special handling; use two bbox filters with OR or use a different approach.
- **Multivalued location**: `geodist` picks the minimum distance among the doc's locations by default.
- **Coordinate precision**: `LatLonPointSpatialField` is stored at ~1cm precision globally — fine for most use cases. Use `RptWithGeometrySpatialField` for higher precision or polygon shapes.

## Function query gotchas

- **Function values are floats**, even for integer fields. `field('popularity_i')` returns the int as a float.
- **NaN propagates**. `div(0, 0)` is NaN. Handle with `def(div(...), 0)`.
- **Functions are not cached** unless wrapped in a filter query with explicit caching strategy.
- **`exists()` checks indexed-ness, not stored-ness**. A field with `indexed=false stored=true` returns false from `exists()`.
- **Date math syntax** (`NOW-1DAY`) works in `ms()` and `recip()` arguments — but only as field selectors, not as nested function calls.
