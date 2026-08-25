# Live Instance Inspection: Auditing a Black-Box Solr (Solr 9.x)

Sometimes you have **only a running-Solr URL** — no `managed-schema`, no
`solrconfig.xml`, no repo access. The schema still exists; it is just behind the
REST API. This file shows how to reconstruct the full schema picture from HTTP
endpoints alone, so you can run the same audit (field-type misuse, analyzer
asymmetry, missing docValues, copyField sanity) without any local files.

Replace `<c>` with the core or collection name (e.g. `products`) and
`http://localhost:8983` with the host in every example below.

## The three endpoint families

| Family | Answers | Endpoint |
|---|---|---|
| **Schema REST API** | What fields/types/copyFields are declared? | `/solr/<c>/schema/*` |
| **Analysis API** | How is one value tokenized at index vs query time? | `/solr/<c>/analysis/field` |
| **Luke handler** | What flags does each *materialized* field actually carry? | `/solr/<c>/admin/luke` |

The Schema API reports the **declared** schema; Luke reports the **effective**
per-field reality (including dynamic fields that matched real documents). Use
both — they can disagree when dynamic fields or schemaless mode are in play.

## 1. Schema REST API — declared structure

Dump everything, then drill in:

```bash
# Full schema (fields + types + dynamic + copyFields + uniqueKey)
curl 'http://localhost:8983/solr/products/schema'

# Just the explicit fields
curl 'http://localhost:8983/solr/products/schema/fields'

# All fieldTypes (analyzer chains live here)
curl 'http://localhost:8983/solr/products/schema/fieldtypes'

# Dynamic field patterns (*_s, *_t, *_i ...)
curl 'http://localhost:8983/solr/products/schema/dynamicfields'

# copyField directives (source -> dest)
curl 'http://localhost:8983/solr/products/schema/copyfields'
```

Inspect a **single** field or type without paging the whole dump:

```bash
curl 'http://localhost:8983/solr/products/schema/fields/title_t'
curl 'http://localhost:8983/solr/products/schema/fieldtypes/text_general'
```

A `/schema/fields/title_t` response gives you the audit-relevant triad directly:

```json
{
  "field": {
    "name": "title_t",
    "type": "text_general",
    "indexed": true,
    "stored": true,
    "docValues": false,
    "multiValued": false
  }
}
```

What to read off these:

- **Field-type misuse** — a `brand_s` declared as `text_general` (should be
  `string` for faceting), or a `title_t` declared as `string` (should be
  `text_*`). Cross-check against `01-field-types.md`.
- **Missing docValues** — `/schema/fields` shows `docValues:false` on a field you
  know is faceted/sorted. Cross-check `03-docvalues-stored-indexed.md`.
- **copyField hygiene** — `/schema/copyfields` reveals a `copyField` whose
  destination is `stored:true` (usually a waste) or a fan-out into a missing
  field. See the audit checklist in `SKILL.md`.

`/schema/fieldtypes/text_general` returns the full `indexAnalyzer` and
`queryAnalyzer` definitions — the JSON equivalent of the `<analyzer type="...">`
blocks. If the two arrays differ, you have a candidate for analyzer asymmetry
(next section).

## 2. Analysis API — live index-vs-query token diff

The single most valuable live check. It shows, for a concrete value, the token
stream produced by the **index** analyzer and the **query** analyzer side by
side — the live counterpart to the XML diff in `02-analyzer-asymmetry.md`.

```bash
curl -G 'http://localhost:8983/solr/products/analysis/field' \
  --data-urlencode 'analysis.fieldname=title_t' \
  --data-urlencode 'analysis.fieldvalue=Wireless Headphones' \
  --data-urlencode 'analysis.query=wireless headphone' \
  --data-urlencode 'wt=json'
```

- `analysis.fieldname` — the field (or fieldType via `analysis.fieldtype`).
- `analysis.fieldvalue` — text run through the **index** analyzer.
- `analysis.query` — text run through the **query** analyzer.

The response lists every filter stage for both chains. Read it bottom-up: the
final row on each side is the term that actually lands in / probes the index.
**If the index final tokens and query final tokens do not overlap, that value
will silently miss** — exactly the failure described in
`02-analyzer-asymmetry.md`. Common culprits visible here: a `KeywordRepeat` or
stemmer on one side only, a synonym expansion at query time only, or an
asymmetric `WordDelimiterGraphFilter`.

Tip: run it with the *same* string in both `fieldvalue` and `query` first to
confirm symmetric chains agree, then with a realistic user query to expose
divergence.

## 3. Luke handler — effective per-field flags

`/admin/luke` reports what each field looks like **in the actual index segments**,
including dynamic fields that only exist because documents matched their pattern.

```bash
# Schema view, no term enumeration (fast)
curl 'http://localhost:8983/solr/products/admin/luke?show=schema&numTerms=0'

# One field, with a few sample terms
curl 'http://localhost:8983/solr/products/admin/luke?fl=title_t&numTerms=5'
```

- `show=schema` — return the schema/flags view rather than per-document detail.
- `numTerms=0` — skip (expensive) term enumeration; you only want flags.
- `fl=<field>` — restrict to one field.

### Decoding the field-flags string

Each field carries a compact `flags` string (and a `schema` string under
`show=schema`). It is a fixed-position mask — a letter means the capability is
present, a `-` means absent. The order is stable; the key positions to know:

| Letter | Meaning |
|---|---|
| `I` | **Indexed** (searchable/filterable) |
| `T` | **Tokenized** (analyzed into multiple terms) |
| `S` | **Stored** (original value returned) |
| `D` | **DocValues** (column store: facet/sort/function) |
| `M` | Multivalued |
| `V` | TermVector stored |
| `o` | stOred term vector Offsets (lowercase `o`) |
| `p` | OmitNorms (letter per the printed legend) |
| `L` | Lazy |
| `B` | Binary |
| `f` | sorted (uses doc values for sort) |
| `F` | Omit term freq & positions (letter per the printed legend) |

So a `title_t` showing `ITS-----...` is **Indexed + Tokenized + Stored** but has
**no DocValues** (the `D` slot is `-`) — faceting/sorting on it would fall back
to the fieldCache. A `brand_s` showing `I-S-D...` (or with `I` and `D` set and
`T` cleared) is **Indexed**, **not tokenized** (a proper `string`), **Stored**,
and **has DocValues** — correct for an exact-match facet field. Luke prints a
`key` legend in its own response; always reconcile your reading against that
legend, since the exact column order is version-sensitive.

Luke is also how you catch fields the Schema API won't show as explicit: a
dynamic-field hit like `color_s` only appears once a document populated it, and
the flags there are the ones that actually got applied.

## Workflow: audit a black-box Solr from a URL only

1. **List cores/collections.** `curl 'http://localhost:8983/solr/admin/cores?wt=json'`
   (standalone) or `.../admin/collections?action=LIST` (SolrCloud) to confirm
   `<c>`.
2. **Dump the declared schema.** `GET /solr/<c>/schema` — note `uniqueKey` and
   the declared field list. The default query field (`df`) is *not* returned
   here: it lives in the request handler (solrconfig.xml / params), not the
   `/schema` endpoint (the old `defaultSearchField` schema element was removed
   well before 9.x).
3. **Triage the triad.** For each field of interest, `GET /schema/fields/<f>`
   and record `indexed`/`stored`/`docValues`/`type`. Flag string-for-prose,
   text-for-facet, and missing-docValues per the `SKILL.md` checklist.
4. **Reconcile with reality via Luke.** `GET /admin/luke?show=schema&numTerms=0`
   and compare effective flags to the declared schema — they diverge under
   schemaless/dynamic fields. Decode flags with the table above.
5. **Diff the analyzers.** For every `text_*` field that matters, hit
   `/analysis/field` with a realistic value and query and confirm the final
   tokens overlap (`02-analyzer-asymmetry.md`).
6. **Check copyField fan-out.** `GET /schema/copyfields` — verify
   search→facet companion copies (e.g. `title_t` → a `string`+docValues field)
   exist and don't copy into oversized `stored` destinations.
7. **Report.** Produce the same structured, severity-ordered review you would
   from XML — you now have every fact the files would have given you.

> When files *are* available, prefer reading them (no live load, full comments);
> use these endpoints to confirm what is actually deployed versus what the repo
> claims. The deployed schema is the source of truth for a production incident.
