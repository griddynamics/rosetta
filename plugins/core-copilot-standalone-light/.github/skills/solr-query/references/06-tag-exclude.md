# Tag/Exclude Pattern (Multi-Select Faceting)

The tag/exclude pattern lets a faceted search show "options that would be available if you toggled this filter off." It is the core mechanism behind multi-select sidebars in e-commerce.

## The problem

User search:
```
fq=brand_s:Nike
fq=color_s:red
```

The brand facet should show ALL brands (so the user can switch from Nike to Adidas) — not just Nike (which is the only brand left after `fq=brand_s:Nike`).

The color facet should show ALL colors that are available for Nike (color filter cleared, brand filter kept) — so the user can switch from red to blue.

## The solution

1. Tag each filter with `{!tag=NAME}`.
2. In each facet, exclude the tag(s) of filters that should not constrain it.

```
fq={!tag=BRAND}brand_s:Nike
fq={!tag=COLOR}color_s:red
```

JSON Facets:
```json
{
  "facet": {
    "by_brand": {
      "type": "terms", "field": "brand_s",
      "domain": { "excludeTags": ["BRAND"] }
    },
    "by_color": {
      "type": "terms", "field": "color_s",
      "domain": { "excludeTags": ["COLOR"] }
    }
  }
}
```

`by_brand` ignores `BRAND`-tagged filter → shows all brands (under remaining color constraint).
`by_color` ignores `COLOR`-tagged filter → shows all colors (under remaining brand constraint).

## Tagging filters

```
fq={!tag=NAME}field:value
fq={!tag=NAME}field:value AND other:value
fq={!tag=NAME cache=false}{!frange l=0 u=100}price_f
```

- Tag names are arbitrary strings, **case-sensitive**
- Tags can stack (comma-separated): `{!tag=BRAND,VENDOR}brand_s:Nike` — this filter has two tags, can be excluded by either name
- Multiple `fq=` can share the same tag — `excludeTags=["X"]` removes all of them

```
fq={!tag=PRICE}price_f:[0 TO 100]
fq={!tag=PRICE cache=false}{!frange l=4.5 u=5}rating_f
```

A facet excluding `PRICE` will see neither filter.

## Excluding in JSON Facets

```json
"domain": { "excludeTags": ["BRAND"] }
```

Or comma-separated string:
```json
"domain": { "excludeTags": "BRAND,COLOR" }
```

Both forms are accepted. Use the array form for consistency.

## Excluding in legacy facet API

In the legacy URL-style facet API:
```
fq={!tag=BRAND}brand_s:Nike
&facet=true
&facet.field={!ex=BRAND}brand_s
```

`{!ex=NAME}` is the exclusion syntax for legacy faceting. **JSON Facets does NOT use `{!ex=}`** — it uses `domain.excludeTags`. Mixing the syntaxes is a common mistake.

| Style | Tag | Exclude |
|---|---|---|
| Legacy URL facets | `fq={!tag=X}field:val` | `facet.field={!ex=X}field` |
| JSON Facets | `fq={!tag=X}field:val` (same) | `domain.excludeTags: ["X"]` |

The tagging is the same; the exclusion mechanism differs.

## Multi-tag exclusion

```json
"domain": { "excludeTags": ["BRAND", "COLOR"] }
```

This facet runs as if both `BRAND` and `COLOR` filters were absent.

## What tag/exclude CANNOT do

Tag/exclude only works for **filter queries** (`fq=`). It does not work for the main query (`q=`).

If you have:
```
q=red shoes
defType=edismax
fq={!tag=BRAND}brand_s:Nike
```

You cannot exclude the `q=red shoes` constraint from a facet. The `q` is always part of the document set being faceted.

If you need to exclude `q`, restructure: move the user query into an `fq` (loses scoring) or use a top-level `domain.query` to replace the entire scope:

```json
{
  "query": "*:*",
  "filter": ["{!tag=BRAND}brand_s:Nike"],
  "facet": {
    "by_brand": {
      "type": "terms", "field": "brand_s",
      "domain": {
        "excludeTags": ["BRAND"],
        "query": "type_s:product"
      }
    }
  }
}
```

`domain.query` REPLACES the scope, so even `q` is gone. Use sparingly — you lose scoring entirely.

## With block join

When the main query is at one block level and you want to facet at another, combine `excludeTags` with `blockChildren`/`blockParent`:

```json
{
  "query": "{!parent which='type_s:product'}color_s:red",
  "filter": ["{!tag=BRAND}brand_s:Nike"],
  "facet": {
    "available_brands": {
      "type": "terms",
      "field": "brand_s",
      "domain": { "excludeTags": ["BRAND"] }
    },
    "available_colors": {
      "type": "terms",
      "field": "color_s",
      "domain": {
        "blockChildren": "type_s:product",
        "excludeTags": ["COLOR"]
      }
    }
  }
}
```

`brand_s` is a parent attribute → facet at parent scope (default).
`color_s` is a child attribute → transition to child scope, then exclude.

If you tag a filter at child level (e.g., a SKU-level color filter applied via parent join), the tag/exclude logic still works as long as the filter is on the request — the engine knows which filter has which tag.

## Common mistakes

### Tag name typo
```
fq={!tag=BRND}brand_s:Nike
"domain": { "excludeTags": ["BRAND"] }   // doesn't match BRND
```

Tags are silently unmatched — the facet just doesn't get the exclusion. Always test by removing the filter to confirm the facet count rises.

### Wrong key name
```json
"domain": { "exclude": ["BRAND"] }       // WRONG
"domain": { "excludeFilters": ["BRAND"] } // WRONG
"domain": { "excludeTags": ["BRAND"] }    // CORRECT
```

Solr ignores unknown `domain` keys silently.

### Tagging the main query
```
q={!tag=Q}red shoes        // tag has no effect on q
```

Tags only apply to filters. The above is silently ignored for facet exclusion.

### Tag inside `{!edismax}` body
```
q={!edismax tag=Q}red shoes    // tag here doesn't tag for facet exclusion
```

Tag must be on `fq`, not on `q`. Refactor to put the constrainable parts in `fq`.

### Excluding a tag that's also `cache=false`
This works fine, but be aware: the un-cached filter still runs at facet time (no cache benefit), and the exclusion just removes its constraint. Both behaviors apply.

### Excluding parent filter at child scope
```json
"available_colors": {
  "type": "terms", "field": "color_s",
  "domain": {
    "blockChildren": "type_s:product",
    "excludeTags": ["BRAND"]      // brand is on parent — this works (parent filter applies before child transition)
  }
}
```

This is correct. `blockChildren` transitions scope, and `excludeTags` removes parent-tagged filters before that scope evaluates.

But:
```json
"available_brands": {
  "type": "terms", "field": "brand_s",
  "domain": {
    "blockChildren": "type_s:product",   // WRONG: brand_s is on PARENT
    "excludeTags": ["BRAND"]
  }
}
```

You'd be faceting on `brand_s` at child scope where children don't have brand. Empty results.

## Production checklist

For a multi-select facet panel:

1. Every facet filter is in `fq`, never in `q`
2. Every `fq` has a unique tag
3. Each facet `excludeTags` includes its own filter's tag (so the facet shows all options of that field)
4. Cross-field interactions work: clicking brand=Nike updates the color facet to show colors-for-Nike (because color facet doesn't exclude BRAND)
5. Block-join cases use the right `blockChildren`/`blockParent` for the field's level
