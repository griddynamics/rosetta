# Lucene Query Syntax (Solr 9.x)

The `lucene` parser is Solr's default. It is also what fires when you write a query without `{!parser}` or `defType`. This file covers operators, escaping, and the syntactic edges that bite people.

## What `lucene` actually is

The parser is `org.apache.solr.parser.SolrQueryParser` (a slight extension of Lucene's `QueryParser`). It produces:
- `TermQuery` for `field:value` where `value` is a single tokenizer-output term
- `PhraseQuery` for `field:"two words"`
- `BooleanQuery` for combinations
- `WildcardQuery` / `PrefixQuery` for `*` and `?` patterns
- `RegexpQuery` for `field:/regex/`
- `TermRangeQuery` for `field:[a TO b]` on string fields
- Numeric/`PointRangeQuery` for `field:[1 TO 10]` on numeric/point fields

The output is determined by **field type** as much as by syntax. `name_t:foo` and `name_s:foo` parse identically but produce different queries because the field types analyze differently.

## Operators

```
AND  OR  NOT  +  -  &&  ||  !
```

Critical: **boolean operators must be UPPERCASE**. Lowercase `and` is a term:

```
q=solr and lucene        # parses as: solr OR and OR lucene  (default operator OR)
q=solr AND lucene        # parses as: +solr +lucene
```

The default operator is `OR` unless `q.op=AND` is set or the parser is configured otherwise. For `defType=edismax`, `q.op` defaults to `OR` but `mm` controls actual matching.

`+` and `-` are positional (no space between operator and term):
```
+required -forbidden optional
```

`&&` and `||` exist but are non-idiomatic in Solr — prefer `AND`/`OR`.

## Grouping

```
field:(a OR b OR c)        # three TermQueries against `field`, OR'd
(field1:a OR field2:b)     # two TermQueries on different fields
field:"a b"~2              # phrase with slop 2 (allows 2-position rearrangement)
```

Without `field:`, terms inside `(...)` go to the default field. There is no "default field" in modern Solr — you typically get a parse error or a query against `text` (if it exists).

## Wildcards and prefixes

```
field:foo*       # PrefixQuery — fast
field:f?o        # WildcardQuery with one-char wildcard
field:*foo       # leading wildcard — SLOW; expands entire term dictionary
field:*foo*      # contains-search — VERY slow
```

Leading wildcards work but cost O(N terms) in the field's term dictionary. For 50M+ docs this means seconds. Solutions:
- Index an `EdgeNGramFilter` field for autocomplete/prefix scenarios
- Index a reversed-token field (`ReversedWildcardFilterFactory`) for suffix search
- Use a `path_s` field or `n-gram` for substring search

Wildcards do not analyze. `field:Foo*` against a lowercased field will not match `foo` — wildcards bypass analysis entirely. Lowercase your wildcard term yourself.

## Ranges

```
field:[a TO z]     # inclusive both ends
field:{a TO z}     # exclusive both ends
field:[a TO z}     # mixed
field:[* TO 10]    # open-start
field:[10 TO *]    # open-end
```

For dates: `field:[2024-01-01T00:00:00Z TO NOW]`. `NOW`, `NOW/DAY`, `NOW-7DAYS` all work.

## Fuzzy and proximity

```
roam~          # fuzzy, default edit distance 2
roam~1         # edit distance 1
"jakarta apache"~5    # phrase slop 5
```

Fuzzy search does not work on a per-term basis inside phrases — `~` after a phrase is slop, not fuzziness.

## Special characters that need escaping

These have meaning in Lucene syntax:
```
+ - && || ! ( ) { } [ ] ^ " ~ * ? : \ /
```

To match a literal one in a query, escape with backslash:
```
q=path_s:\/var\/log\/app    # match the literal /var/log/app
q=name_s:C\+\+              # match "C++"
```

URL-encoding the backslash is needed for HTTP transport. In JSON Request API, JSON-escape the backslash (`\\`).

The escape problem is the #1 reason people use `{!term}`:
```
fq={!term f=sku_id}ABC-123/XL    # no escaping needed; one TermQuery
```

`{!term}` bypasses the Lucene parser entirely. The whole value after `}` becomes the term — no operators are recognized. **Caveat**: it produces a single TermQuery, so for tokenized text fields it will likely match nothing. Use `{!term}` for `_s` (string) and other non-tokenized fields.

## Phrase queries and complexphrase

A standard phrase query supports slop but not wildcards inside the phrase:
```
title_t:"red shoes"~2     # OK
title_t:"red sho*"        # parses but * is a literal char in the phrase, won't match prefixes
```

For wildcards inside phrases, use `{!complexphrase}`:
```
{!complexphrase inOrder=true}title_t:"red sho*"
{!complexphrase}title_t:"(red OR crimson) shoes"
```

`{!complexphrase}` is much slower than regular phrase queries — only use it when you need wildcards/booleans inside phrase boundaries. It is also notorious for surprising parse errors with special characters; escape liberally.

## Regular expressions

```
field:/[Ss]olr [0-9]+/
```

Uses Lucene's regex flavor (similar to Java but not identical — see Lucene docs). Like wildcards, regex bypasses analysis. Like leading wildcards, regex queries can be expensive — they iterate matching terms in the field. Best with `field:/^prefix.*/` patterns where the leading anchor prunes the term iteration.

## Field-less terms

```
q=solr lucene          # without a field: prefix
```

This goes against the `df` (default field) request param if set, otherwise typically errors out. With `defType=edismax`, the absence of `field:` is normal — eDisMax dispatches to `qf` fields.

## Boosting at query time

```
field:value^2.0
"phrase query"^3
(grouped OR clause)^0.5
```

Multiplies the score contribution of that subquery. For eDisMax, prefer `qf=title_t^5` (per-field boost) over inline `^`.

## Common parse errors

### `Cannot parse '...': Encountered "<EOF>"`
You probably have unbalanced quotes or parens. Search for unmatched `"` first.

### `Cannot parse '...': Encountered " "AND" "AND ""`
You wrote `AND AND` — usually because of a stray operator. Common when concatenating fragments programmatically without filtering empty strings.

### `org.apache.solr.search.SyntaxError: Cannot parse '...': Lexical error at line 1, column N. Encountered: "/" (47), after : ""`
Unescaped special char. Identify with the column number, then escape or wrap with `{!term}`.

### `undefined field: ...`
The field is not in the schema. Schema may be in `managed-schema` mode and your local copy is stale. Check `/schema/fields/{name}`.

### `Multiple docs/queries with same value for ...` (in `{!parent}`)
Block join sees children outside parents. This is **Error 17** territory — see `04-block-join.md`.

## Specifying the parser

Three ways:
```
q={!edismax qf=title_t}red shoes      # local params (recommended for q)
defType=edismax&q=red shoes            # request param
&q=red shoes&qf=title_t                # implicit when defType is set in solrconfig.xml
```

For `fq` you almost always use local params — `defType` does not apply to `fq`.

## Lucene vs eDisMax decision

Use **lucene** when:
- The query string is constructed by code, not user input
- You want exact control over field selection, boolean logic
- Filters (`fq` is almost always lucene)

Use **eDisMax** when:
- The query string comes from a user typing into a search box
- You want multi-field search with per-field boosts
- You want phrase boost, minimum-match, or boost queries
