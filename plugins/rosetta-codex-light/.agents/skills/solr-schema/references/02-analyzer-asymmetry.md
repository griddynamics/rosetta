# Index vs Query Analyzer Asymmetry: Detecting Silent Misses (Solr 9.x)

A `text_*` fieldType runs **two** analyzer chains: one at **index time** (when a
document is written) and one at **query time** (when a user searches). They share
a `<fieldType>` but can be configured independently:

```xml
<fieldType name="text_title" class="solr.TextField" positionIncrementGap="100">
  <analyzer type="index"> ... </analyzer>
  <analyzer type="query"> ... </analyzer>
</fieldType>
```

If only a single `<analyzer>` (no `type`) is declared, the **same** chain is used
for both — symmetric by construction. The danger arises when the two chains
diverge: index produces one set of terms, query produces a non-overlapping set,
and a search that *should* match returns **zero hits with no error**. Nothing in
the Solr log, response, or HTTP status flags it. This is the single most
common "my query returns nothing and I don't know why" cause, and it is content
the **solr-query** skill defers here: a query is only correct if its query-time
tokens can land on the index-time tokens stored in the term dictionary.

## The core rule

A document matches a term query iff the **term produced by the query analyzer**
exists in the index for that field — i.e. it equals a **term produced by the
index analyzer** at write time. Matching happens on the *post-analysis* tokens,
never on the raw text. So the only question that matters is:

> Do the index-time token stream and the query-time token stream **overlap** for
> the text in question?

When they don't overlap, you get a silent miss.

## Diffing the two token streams: the `/analysis` endpoint

Solr exposes the field analysis API specifically to show both streams side by
side. Hit it before guessing:

```
GET /solr/<core>/analysis/field
      ?analysis.fieldname=title_t
      &analysis.fieldvalue=Wireless Noise-Cancelling Headphones
      &analysis.query=noise cancelling headphones
      &wt=json&indent=true
```

- `analysis.fieldname` — the field (or fieldType) to analyze.
- `analysis.fieldvalue` — text run through the **index** analyzer (what got stored).
- `analysis.query` — text run through the **query** analyzer (what the search emits).

The response lists, per analyzer, the output of **every filter stage** in order,
showing each token's `text`, `start`/`end` offsets, `type`, and `position`. Read
it bottom-up: the **final** stage of each chain is what actually gets indexed /
searched. Compare the two final token lists. If a token the query needs is
absent from the index side (or vice versa), that is your asymmetry. The Admin UI
**Analysis** screen renders the same data visually and highlights matching
tokens in the index row when you fill in the query box — matches are the
overlap, non-highlighted index tokens are dead weight for that query.

> Tip: `analysis.showmatch=true` makes the API/UI mark which index tokens the
> query tokens hit. No highlighted overlap = no match.

## Common asymmetries (and the symptom each produces)

| Asymmetry | What happens | Symptom |
|---|---|---|
| **Synonyms only on one side** | Expansion exists in one chain, not the other | Synonym searches miss (see below) |
| **One-sided stemming** | e.g. `PorterStemFilter` at index only; query keeps full form | Singular/plural & inflected queries miss documents |
| **`WordDelimiterGraphFilter` config mismatch** | Different `splitOnCaseChange`/`catenateWords`/`preserveOriginal` on each side | `WiFi`/`Wi-Fi`/`wifi` variants match inconsistently |
| **Differing stopword sets** | Query strips a word the index kept (or vice versa) | Phrase position gaps; some phrase/`mm` queries miss |
| **Different tokenizers** | e.g. `Standard` vs `Keyword` per side | Wholesale mismatch; almost everything misses |
| **Folding/lowercasing on one side** | `ASCIIFoldingFilter`/`LowerCaseFilter` only on index | Case- or accent-variant queries miss |

### One-sided stemming — worked symptom

Index analyzer has `solr.PorterStemFilterFactory`; query analyzer does not.
Indexing `"running shoes"` stores the stems `run`, `shoe`. A user searches
`running shoes`; the query analyzer (no stemmer) emits `running`, `shoes`.
Neither `running` nor `shoes` exists in the index term dictionary (only `run`,
`shoe` do) → **zero hits**, no error. The fix is to add the **same** stemmer to
the query analyzer (stemming is almost always symmetric). Conversely, stemming
at query time only would emit `run`/`shoe` against an unstemmed index — same
class of miss in the other direction.

## Multi-word synonyms: the asymmetry that bites hardest

Multi-word synonyms (e.g. `tv, television` is single-word and fine, but
`laptop, notebook computer` and `4k, ultra high definition` are multi-word)
require **graph-aware** filtering. Use `SynonymGraphFilterFactory`, and because a
graph (multiple tokens at one position spanning several positions) cannot be
written to a flat Lucene index, it **must** be followed by `FlattenGraphFilter`
**at index time**:

```xml
<fieldType name="text_title" class="solr.TextField" positionIncrementGap="100">
  <analyzer type="index">
    <tokenizer class="solr.StandardTokenizerFactory"/>
    <filter class="solr.LowerCaseFilterFactory"/>
    <filter class="solr.SynonymGraphFilterFactory"
            synonyms="synonyms.txt" expand="true" ignoreCase="true"/>
    <filter class="solr.FlattenGraphFilterFactory"/>   <!-- required after graph at INDEX time -->
  </analyzer>
  <analyzer type="query">
    <tokenizer class="solr.StandardTokenizerFactory"/>
    <filter class="solr.LowerCaseFilterFactory"/>
    <!-- no SynonymGraph here: the synonym corpus is already baked into the index -->
  </analyzer>
</fieldType>
```

### Why query-time multi-word synonyms interact badly

At query time, the query parser (eDisMax/standard) applies `mm`, phrase building,
and per-clause logic over the analyzed tokens, and a multi-word synonym injected
at query time produces a token graph the parser may flatten or mis-count. The
`sow` (split-on-whitespace) flag governs whether the parser pre-splits the input
before analysis; in Solr 9.x `sow` defaults to **`false`** for eDisMax and the
standard parser (so multi-token synonyms *can* form), but it can be set to
`true`, and the graph-handling behavior is still parser- and field-dependent:

- **`mm` miscount** — a 2-word synonym expanding to 1 term (or vice versa) throws
  off the "minimum should match" denominator, so `mm` rejects docs it shouldn't.
- **Phrase breakage** — `pf`/explicit phrase queries built over a graph put the
  synonym alternatives at the wrong positions, so the phrase never matches.
- **`sow` sensitivity** — `sow` defaults to `false` in 9.x, so the multi-token
  synonym *can* form, but the resulting graph behavior then varies by parser and
  field, which is fragile; explicitly setting `sow=true` pre-splits and the
  multi-token synonym never forms at all.

Putting `SynonymGraphFilter` + `FlattenGraphFilter` at **index time** sidesteps
all of this: every synonym alternative is already a real indexed term at the
right position, and the query side stays simple (split words, match terms). This
is exactly why the audit checklist flags query-time multi-word synonyms.

## Fix patterns

1. **Stemming / folding / lowercasing** → keep **symmetric**. Whatever transform
   you index with, apply at query too.
2. **Multi-word synonyms** → `SynonymGraphFilter` + `FlattenGraphFilter` at
   **index** time; nothing synonym-related at query time.
3. **Stopwords** → use the **same** stopword set on both sides, or none.
4. **`WordDelimiterGraph`** → mirror the `catenate*`/`splitOn*`/`preserveOriginal`
   options across both chains; mismatches here are subtle and common.
5. **Verify** every change with `/analysis` (`showmatch=true`) on a representative
   value + query before declaring it fixed.

## When asymmetry is intentional

Divergence is a tool, not always a bug. Legitimate one-sided configurations:

- **Query-time-only synonym expansion, done deliberately.** Some teams *prefer*
  query-time single-word synonyms so they can edit `synonyms.txt` and reload
  without reindexing the whole corpus. This is valid **for single-word synonyms**
  (no graph hazard). Accept it when it's a conscious recall-vs-reindex tradeoff —
  just keep them single-word and watch `mm`/phrase behavior.
- **`EdgeNGramFilter` at index only.** Index-time edge-ngrams power
  prefix/autocomplete; you do **not** ngram the query (you want the raw prefix to
  match the stored ngrams). One-sided by design.
- **Query-time-only `RemoveDuplicatesTokenFilter`** or minor query-only cleanup
  that can't change which terms match.

The discriminator: an **intentional** asymmetry is one whose author can state
*why* and has confirmed (via `/analysis`) it doesn't drop wanted matches. An
**accidental** asymmetry is a filter someone added to one chain and forgot to
mirror. Treat every asymmetry as a bug until proven intentional.

## Worked example: `title_t` query-time multi-word synonym miss

Schema: `title_t` has `SynonymGraphFilterFactory` (`laptop, notebook computer`)
in its **query** analyzer only, with nothing synonym-related at index time. The
original mistake was a missing `FlattenGraphFilter`, which prompted moving
synonym expansion to index time.

A document titled `"Lightweight Notebook Computer 14 inch"` indexes the plain
terms `notebook`, `computer` (no synonym expansion at index time, so no `laptop`
is stored).

User searches `notebook computer`. The query analyzer expands to the graph
`{notebook computer, laptop}`. The parser may pre-split the input on whitespace,
counts clauses for `mm`, and the multi-word `laptop` alternative lands at a
position the phrase/`mm` logic doesn't expect → the document that literally
contains "notebook computer" can fail to match or rank wrong. This is the
genuinely broken direction: query-time multi-word synonym expansion breaks
`mm`/phrase scoring even though the matching term is sitting in the index.

The fix is the reverse: put `SynonymGraphFilter` + `FlattenGraphFilter` at
**index** time so every alternative (`laptop`) is a real indexed term at the
right position. Then a query for `laptop` emits exactly `laptop` and matches the
injected index term directly — index-side expansion makes the synonym available
regardless of the query side, with no graph for the parser to mis-count.

Confirm with:

```
GET /solr/products/analysis/field
      ?analysis.fieldname=title_t
      &analysis.fieldvalue=Lightweight Notebook Computer 14 inch
      &analysis.query=notebook computer
      &analysis.showmatch=true&wt=json
```

If the highlighted overlap between the index row and the query row is empty (or
the `laptop` synonym only appears on the query side), you've reproduced the
asymmetry. **Fix:** move `SynonymGraphFilter` to the **index** analyzer, add
`FlattenGraphFilter` after it, drop the query-side synonym filter, reindex, and
re-run the analysis call to confirm overlap.
