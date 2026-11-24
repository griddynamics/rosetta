# eDisMax Query Parser

eDisMax (Extended DisMax) is the parser you use for **user-facing search**: a search box where users type free text and you want sensible scoring across multiple fields. This file covers production-grade configuration and the anti-patterns that hurt recall or relevance.

## When to use eDisMax

Use it when:
- Query string comes from a user typing into a search box
- You want multi-field search with per-field weights
- You want phrase boosting or "all-words-required" semantics
- You want to add boost queries or boost functions

Do **not** use it for:
- `fq` filters (eDisMax produces scores; fq doesn't use them — wasted work)
- Code-constructed queries with explicit boolean structure (use `lucene`)
- Single-field exact-match scenarios (use `term`/`field`)

## Required and core parameters

| Param | Meaning | Notes |
|---|---|---|
| `q` | User query string | Required |
| `qf` | Query fields with boosts | Required: `"title_t^5 brand_s^2"` |
| `mm` | Minimum should match | See dedicated section |
| `pf` | Phrase fields | Boost when terms appear adjacent |
| `pf2` | Bigram phrase fields | Boost any 2 adjacent words |
| `pf3` | Trigram phrase fields | Boost any 3 adjacent words |
| `ps` | Phrase slop for pf | Default 0 |
| `ps2`, `ps3` | Slop for pf2/pf3 | Default to ps if unset |
| `tie` | Tiebreaker for multi-field matches | 0–1, see below |
| `bf` | Boost function | Additive |
| `bq` | Boost query | Additive |
| `boost` | Multiplicative boost function | Multiplicative |
| `lowercaseOperators` | Treat `and`/`or` as operators | Default `false` in 9.x |
| `q.alt` | Fallback query when q is empty | Often `*:*` |
| `uf` | User fields | Restricts which fields user can `field:` against |

## qf: the core ranking parameter

```
qf=title_t^10 brand_s^6 category_s^4 description_t^2
```

Boosts are multiplicative on the contribution of each field. The contribution of a field is also affected by:
- Field-level analyzer (more terms → potentially more matches → higher score, modulo length norm)
- IDF of matched terms in that field
- TF of matched terms in that doc

Choosing boosts is iterative. Start with order-of-magnitude differences (10/5/2/1) reflecting field semantic importance, then tune by judgment lists or A/B.

## mm: the recall/precision dial

`mm` (minimum-should-match) controls how many of the user's terms must match for a document to qualify.

**Hard absolute** (almost always wrong in production):
```
mm=2     # require 2 matching terms
mm=100%  # require all terms
```

Hard absolute breaks on short queries: `mm=2` against a 1-term query returns zero.

**Formula** (production-correct):
```
mm=2<75%
```

Reads: "if there are 2 or fewer terms, require all; else require 75%."

```
mm=2<-1 5<-2
```

Reads: "if 1-2 terms, all required; if 3-5 terms, allow 1 missing; if 6+ terms, allow 2 missing."

The negative numbers are "max permitted to miss" — `-1` means "all but one." Positive percentages are "minimum required."

**Default behavior**: if `mm` is not set, eDisMax defaults to `100%` when `q.op=AND` and `0%` when `q.op=OR` (the request operator).

## pf, pf2, pf3: phrase boosts

These boost documents where terms appear adjacent (in any of the listed fields), in addition to the qf-based score.

```
pf=title_t^20             # full phrase boost: all q terms must appear in title_t adjacent
pf2=title_t^10            # bigram boost: any 2 adjacent q terms in title_t
pf3=title_t^5             # trigram boost: any 3 adjacent q terms
```

`pf2`/`pf3` only exist in eDisMax (not in plain `dismax`). They generate boost queries for every adjacent pair / triple from the user query.

`ps`/`ps2`/`ps3` add slop (positional flexibility) — useful when users may insert filler words: `ps2=1` allows one word between adjacent pair.

For e-commerce, a common production setup:
```
pf=name_t^20
pf2=name_t^10 description_t^3
pf3=name_t^5
ps=1
ps2=1
```

## tie: the multi-field tiebreaker

eDisMax under the hood is a DisjunctionMaxQuery: for each term, pick the field where it scores highest. `tie` controls what fraction of the **other** fields' scores also contribute:

```
tie=0     # winner-take-all: only the best field counts
tie=1     # sum: all matching fields contribute fully
tie=0.1   # winner mostly + 10% of others (typical production value)
```

`tie=0.1` is the canonical "production" value. It rewards documents that match in multiple fields without letting weak matches dominate.

## bf vs bq vs boost: three ways to influence ranking

These differ in **composition** with the base query score:

### `bf=` (boost function — additive)
```
bf=log(sum(popularity_i,1))
bf=recip(ms(NOW,created_dt),3.16e-11,1,1)
```
Score becomes: `(qf+pf score) + (bf value)`. Multiple `bf=` are summed.

`log` of zero is `-∞`, so always `sum(field,1)` first when the field can be zero.

### `bq=` (boost query — additive)
```
bq=in_stock_b:true^2
bq=featured_b:true^5
```
Score becomes: `(qf+pf score) + (bq match score)`. Each `bq=` is independent.

Useful for boolean signals: in stock, featured, premium tier.

### `boost=` (multiplicative)
```
boost=if(in_stock_b,1.5,1)
boost=mul(div(popularity_i,100),0.1)
```
Score becomes: `(qf+pf score) * (boost value)`.

Multiplicative changes the **ratio** between documents, not just the gap. For decay functions (newer is better), `boost=` is preferred over `bf=` because additive boosts can be drowned by base scores on common-term queries.

**Decision guide**:
- Boolean attribute, want to nudge → `bq`
- Continuous numeric (popularity, age) for additive nudge → `bf`
- Continuous numeric where you want it to reshape ranking → `boost`

## Configuring eDisMax: full production example

URL form:
```
q=nike running shoes
defType=edismax
qf=name_t^10 brand_s^8 category_s^4 description_t^1
pf=name_t^20
pf2=name_t^10 description_t^3
pf3=name_t^5
mm=2<75%
ps=1
ps2=1
tie=0.1
bf=log(sum(popularity_i,1))
boost=if(in_stock_b,1.0,0.3)
bq=featured_b:true^3
q.alt=*:*
```

JSON form:
```json
{
  "query": "{!edismax v=$qq}",
  "params": {
    "qq": "nike running shoes",
    "qf": "name_t^10 brand_s^8 category_s^4 description_t^1",
    "pf": "name_t^20",
    "pf2": "name_t^10 description_t^3",
    "pf3": "name_t^5",
    "mm": "2<75%",
    "ps": "1",
    "ps2": "1",
    "tie": "0.1",
    "bf": "log(sum(popularity_i,1))",
    "boost": "if(in_stock_b,1.0,0.3)",
    "bq": "featured_b:true^3"
  }
}
```

## uf: user fields restriction

```
uf=*_t *_s -internal_*
```

Whitelists which fields the user may target with `field:` syntax in their query. By default, users can search any indexed field — which lets a malicious user query `_root_:something` or expose internal fields. `uf` should be set in production.

## stopwords and pf

If your analyzer includes stopwords ("the", "a", "of"), they get removed from `qf` matching but **also from pf phrase queries**. This causes "the matrix" to phrase-match "matrix" but not boost over plain term matches.

Workaround: configure the same analyzer on `pf` fields, or use a separate non-stopworded field for phrase boosting.

## Common eDisMax problems

### Zero results for short queries
Usually `mm` set as hard absolute (`mm=3`) clobbering 1- or 2-word queries. Switch to formula `2<75%`.

### Single-word queries score the same regardless of field
Single term has no `pf`/`pf2`/`pf3` to apply (no phrase to boost). Only `qf` boosts apply. This is correct behavior — phrase boosting is a multi-term feature.

### Very high-frequency terms dominate
For e-commerce, `name_t:nike` may match 10,000 documents and the term has poor IDF. The `bq` and `boost` mechanisms exist to reshape this. Also consider per-field analyzers that drop stopword-like brand terms in low-priority fields.

### `bf` changes nothing on common-term queries
Common-term `qf` scores are large (high TF/IDF sum); additive `bf` like `log(popularity_i)` returns small values (e.g., 1-5). The boost gets lost in noise. Switch to multiplicative `boost=`.

### `_query_:` injection
Users typing `field:something _query_:"{!join from=...}"` can inject arbitrary parsers. Disable `lowercaseOperators` is not enough. Set `uf` and consider `q.op=AND` to limit injection surface.

### Special characters in user queries breaking parsing
Users typing `C++` or `node.js` may cause parse errors. eDisMax in Solr 9.x is more lenient than `dismax`, but still: pre-sanitize user input or set `q.escapeUnknown=true` (Solr 9.x option, escapes unknown special chars).

## When eDisMax is overkill

For known-structured queries (e.g., autocomplete with strict field hits, exact-match SKU lookup), use `lucene`, `term`, or `field` parsers directly. eDisMax's machinery (DisMax + phrase boost expansion + mm logic) adds latency.

A typical e-commerce app uses:
- eDisMax for the main search box (`q`)
- `lucene` / `terms` for filters (`fq`)
- `term`/`field` for ID lookups
- `knn` for "more like this" / similarity

## DisMax vs eDisMax

DisMax (`defType=dismax`) is the older parser. eDisMax is a strict superset:
- eDisMax adds `pf2`, `pf3`, `boost`, `lowercaseOperators`, full Lucene syntax fallback in `q`
- DisMax accepts only flat user queries (no `field:`, no `(...)`); eDisMax allows them in `q`

There is no reason to use plain DisMax in new code. Keep eDisMax.
