# solrconfig.xml Review: Commits, Caches, schemaFactory, Version (Solr 9.x)

This file covers the `solrconfig.xml` decisions a schema audit must check: commit strategy (`autoCommit` / `autoSoftCommit`), the query caches, `schemaFactory`, `luceneMatchVersion`, classloading (`<lib>`), update processor chains, and request-handler defaults. The schema (`managed-schema`) decides field types and analysis; `solrconfig.xml` decides **how the index is written, refreshed, and queried**. The two are reviewed together because a perfect schema with a broken commit or cache config still fails in production.

For getting **custom plugin jars** onto the classpath and registering them (the `<lib>` directive in depth, `sharedLib`, Solr Packages, classloader hierarchy), see the sibling skill reference `solr-extending/references/06-plugin-wiring.md`. This file references `<lib>` only as a config-review item and defers the packaging detail there.

---

## Commit strategy: hard vs soft commit

Two independent commit knobs exist, and conflating them is the most common solrconfig mistake.

- **Hard commit** (`<autoCommit>`) — flushes the in-memory index buffer to durable segment files on disk and syncs the transaction log. This is what gives you **durability** (data survives a crash). It does **not** by itself make new documents visible to searches unless `openSearcher=true`.
- **Soft commit** (`<autoSoftCommit>`) — makes recently indexed documents **visible** to queries by opening a new searcher over the in-memory + on-disk state. This is the near-real-time (NRT) knob. A soft commit does **not** guarantee durability — it is cheaper than a hard commit because it skips the full fsync of segments.

The mental split: **hard commit = durability, soft commit = visibility.** Document visibility / NRT latency is controlled by `autoSoftCommit`, not by `autoCommit`.

### Recommended baseline

```xml
<autoCommit>
  <maxTime>15000</maxTime>        <!-- hard commit every 15s -->
  <maxDocs>25000</maxDocs>        <!-- or after 25k docs, whichever first -->
  <openSearcher>false</openSearcher>
</autoCommit>

<autoSoftCommit>
  <maxTime>1000</maxTime>         <!-- new docs visible within ~1s -->
</autoSoftCommit>
```

### Why `openSearcher=false` on the hard commit

Opening a searcher is the expensive part of a commit — it builds new caches, runs autowarming, and discards the old searcher. If a **frequent** hard `autoCommit` also sets `openSearcher=true`, every flush pays that searcher-open cost, so you get redundant, expensive searcher churn and GC pressure.

The correct division of labor: let `autoSoftCommit` own **visibility** (cheap, frequent, opens the searcher), and let `autoCommit` own **durability** only (`openSearcher=false`, so it just flushes segments and the tlog without opening a searcher). Set `openSearcher=false` on any frequent hard commit; soft commit handles making documents visible.

### Typical ratios

- Soft commit interval **shorter** than hard commit interval (visibility is wanted faster than durability flushes). A common ratio is soft ~1s and hard ~15–60s.
- Heavier ingest → loosen soft commit toward several seconds to reduce searcher churn.
- If true NRT is not required, raise `autoSoftCommit` to tens of seconds (or disable it) and let queries see data only after the hard commit.

### Commit pitfalls to flag

| Pitfall | Why it hurts |
|---|---|
| Client sends `commit=true` per request (per-request / explicit commits) | Each request forces a full commit + searcher open; throughput collapses, caches never warm. Use auto-commit instead. |
| `openSearcher=true` on a frequent hard `autoCommit` | Redundant expensive searcher opens; let soft commit own visibility, hard commit keeps `openSearcher=false`. |
| Sub-second `autoSoftCommit` with large autowarmed caches | Constant cache invalidation + autowarm storms; GC churn and NRT instability. |
| No `autoCommit` at all | Transaction log grows unbounded; very slow restart/recovery, risk on crash. |
| `commitWithin` and `autoSoftCommit` both very aggressive | Double commit pressure; pick one visibility mechanism and tune it. |

---

## Query caches (Solr 9.x = `CaffeineCache`)

Solr 9.x uses `solr.search.CaffeineCache` as the cache implementation for all the per-searcher caches (the old `LRUCache`/`FastLRUCache` classes are superseded). The three caches a review must check:

```xml
<filterCache class="solr.CaffeineCache"
             size="512" initialSize="512" autowarmCount="0"/>

<queryResultCache class="solr.CaffeineCache"
                  size="512" initialSize="512" autowarmCount="0"/>

<documentCache class="solr.CaffeineCache"
               size="512" initialSize="512"/>
```

- **`filterCache`** — caches the doc-set (bitset) result of each `fq` clause, keyed by the filter query. Huge win for repeated facet/filter values. Each entry can cost up to `maxDoc/8` bytes (one bit per document), so a large `size` on a big index is real heap. Tune `size` to the number of **distinct** filter clauses you actually reuse.
- **`queryResultCache`** — caches the ordered list of top-N doc ids for a `(query, sort, filters)` key. Helps repeated identical searches and pagination. Affected by `queryResultWindowSize` / `queryResultMaxDocsCached`.
- **`documentCache`** — caches stored-field document contents by internal doc id, so the same doc returned across requests isn't re-fetched from disk. **`autowarmCount` is not used** here (doc ids change when segments merge), so it has no `autowarmCount`.

### Sizing vs heap and autowarm cost

- Cache memory is **per searcher**, and during a commit the **new** searcher's caches coexist with the **old** one's — so peak memory is roughly double a single searcher's caches. Size against heap accordingly.
- `autowarmCount` re-runs the top N keys from the old searcher against the new one on every commit. Large `autowarmCount` + frequent soft commits = warming work that can outlast the commit interval, stalling visibility. Keep `autowarmCount` modest (or `0`) when soft commits are sub-second.
- A `filterCache` `size` far larger than the count of genuinely reused filters wastes heap without raising hit ratio. Check the Solr admin **Plugins/Stats → Cache** hit ratios to right-size.

---

## `schemaFactory`: managed vs classic

```xml
<schemaFactory class="ManagedIndexSchemaFactory"/>
```

- **`ManagedIndexSchemaFactory`** — the **Solr 9.x default**. The schema is **mutable at runtime** via the Schema REST API (`/schema`); Solr persists changes to a `managed-schema` file (it renames a starter `schema.xml` to `managed-schema.xml` on first load). Required for schemaless / field-guessing mode and for any programmatic schema edits.
- **`ClassicIndexSchemaFactory`** — reads a static, hand-edited `schema.xml` and is **read-only at runtime** (no Schema API writes). Choose it when you want the schema fully controlled in version control with no live mutation.

For runtime schema edits, the managed factory is the one to use; it is also the default in 9.x. If a config pins `ClassicIndexSchemaFactory` but the team expects the Schema API to work, that mismatch is a finding.

---

## `luceneMatchVersion`

```xml
<luceneMatchVersion>9.6.0</luceneMatchVersion>
```

`luceneMatchVersion` declares which Lucene version's **behavior, defaults, and compatibility** Solr should emulate for analysis and index-writing components — it controls version-dependent defaults (tokenizer/filter behavior, codec defaults) so an upgrade doesn't silently change analysis. Set it to the Lucene version that ships with your Solr release. A stale value after an upgrade is a common review flag: components may run in a back-compat mode you didn't intend. Match it to the deployed Solr/Lucene version.

---

## Classloading: `<lib>` directives

```xml
<lib dir="${solr.install.dir}/dist/" regex="solr-myplugin-.*\.jar"/>
```

The `<lib>` directive loads per-core jars from disk. In Solr 9.x it is **deprecated and disabled by default** for security (arbitrary jars from disk), so seeing `<lib>` in a 9.x config is a flag — confirm it is intended and that the install has re-enabled it, or migrate to `sharedLib` / Solr Packages. The full packaging story (`sharedLib`, Packages, signing, classloader hierarchy, re-enabling `<lib>`) lives in `solr-extending/references/06-plugin-wiring.md`; a schema/solrconfig review only needs to confirm the directive is present-for-a-reason and not a leftover.

---

## Update request processor chains (overview)

An `updateRequestProcessorChain` is a pipeline every document passes through on the way into the index. A schema review should at least confirm which chain is the default and whether field-guessing is on.

```xml
<updateRequestProcessorChain name="add-unknown-fields-to-the-schema" default="${update.autoCreateFields:true}">
  <processor class="solr.UUIDUpdateProcessorFactory"/>
  <processor class="solr.RemoveBlankFieldUpdateProcessorFactory"/>
  <processor class="solr.FieldNameMutatingUpdateProcessorFactory"/>
  <processor class="solr.AddSchemaFieldsUpdateProcessorFactory"> ... </processor>
  <processor class="solr.LogUpdateProcessorFactory"/>
  <processor class="solr.RunUpdateProcessorFactory"/>
</updateRequestProcessorChain>
```

- The chain marked `default="true"` runs for updates that don't name a chain via `update.chain`.
- `AddSchemaFieldsUpdateProcessorFactory` is the **schemaless / field-guessing** processor — it requires `ManagedIndexSchemaFactory`. In production schemas you usually want this **off** (set `update.autoCreateFields=false`) so a typo'd field name doesn't silently create a guessed field of the wrong type.
- `RunUpdateProcessorFactory` must be **last** — it's what actually writes the doc. Any processor after it never runs.
- Custom processors are registered here as `<processor class="...">`; the registration syntax for custom plugin processors is in `solr-extending/references/06-plugin-wiring.md`.

---

## Request handler `/select` defaults and `maxBooleanClauses`

```xml
<requestHandler name="/select" class="solr.SearchHandler">
  <lst name="defaults">
    <str name="echoParams">explicit</str>
    <int name="rows">10</int>
    <str name="df">_text_</str>
  </lst>
</requestHandler>
```

- `<lst name="defaults">` sets parameters a request inherits unless it overrides them (`rows`, `df`, `wt`, etc.). Use `defaults` for overridable values; `invariants` for values that must not be overridden; `appends` to always add (e.g. a security `fq`).
- A missing or wrong `df` (default field) means an un-fielded query (`q=foo`) targets the wrong field or nothing.

```xml
<query>
  <maxBooleanClauses>1024</maxBooleanClauses>
</query>
```

- `maxBooleanClauses` caps the number of clauses a single boolean query may expand to. Wildcard/prefix/range expansions and big `OR`/`{!terms}` lists can blow past the default and throw `too many boolean clauses`. Raise it deliberately (it costs memory per query); prefer `{!terms}` (a `TermInSetQuery`, not subject to this limit) over giant `OR` chains. Note there is also a global `solr.max.booleanClauses` system property ceiling in 9.x that the per-core value cannot exceed.

---

## Audit checklist — solrconfig.xml

Each row: the symptom to look for → the finding → the fix.

| # | Look for | Finding | Fix |
|---|---|---|---|
| 1 | Client sends `commit=true` per request | Per-request commits crush throughput; caches never warm | Remove explicit commits; rely on `autoCommit` + `autoSoftCommit` |
| 2 | `autoCommit` with `openSearcher=true` and a short `maxTime` | Frequent expensive searcher opens on the durability commit | Set `openSearcher=false`; let `autoSoftCommit` own visibility |
| 3 | No `autoCommit` block | Unbounded transaction log; slow/risky recovery | Add `autoCommit` (`maxTime` ~15s, `openSearcher=false`) |
| 4 | `autoSoftCommit maxTime` sub-second with big autowarm | Cache-invalidation + autowarm storms, GC churn, NRT instability | Raise soft-commit interval and/or lower `autowarmCount` |
| 5 | Cache `class` not `solr.CaffeineCache` | Pre-9.x cache class (`LRUCache`/`FastLRUCache`) | Switch all caches to `solr.CaffeineCache` |
| 6 | `filterCache size` far above reused-filter count | Wasted heap (each entry up to `maxDoc/8` bytes), low hit gain | Size to distinct reused filters; check hit ratio in admin stats |
| 7 | Large `autowarmCount` + frequent commits | Warming outlasts commit interval, stalls visibility | Lower `autowarmCount` (or `0` for sub-second soft commits) |
| 8 | `ClassicIndexSchemaFactory` but Schema API expected | Runtime schema edits silently rejected (read-only) | Switch to `ManagedIndexSchemaFactory` (9.x default) |
| 9 | Stale `luceneMatchVersion` after an upgrade | Components run in unintended back-compat behavior | Set to the deployed Solr/Lucene version |
| 10 | `<lib>` directive present in a 9.x config | Deprecated/disabled-by-default jar loading | Confirm intent; migrate to `sharedLib`/Packages — see `solr-extending/references/06-plugin-wiring.md` |
| 11 | `AddSchemaFieldsUpdateProcessorFactory` active in prod | Field-guessing creates wrong-typed fields from typos | Set `update.autoCreateFields=false`; define fields explicitly |
| 12 | A processor after `RunUpdateProcessorFactory` | That processor never runs (Run writes the doc) | Make `RunUpdateProcessorFactory` last in the chain |
| 13 | Giant `OR` chains hitting `maxBooleanClauses` | `too many boolean clauses` errors | Use `{!terms}` (TermInSetQuery); raise `maxBooleanClauses` only if needed |
| 14 | `/select` missing/wrong `df` | Un-fielded queries target wrong field | Set a correct `df` (or require fielded queries) |

---

## Related references

- `solr-extending/references/06-plugin-wiring.md` — jar packaging, `<lib>`/`sharedLib`/Packages, classloader hierarchy, registering custom processors and handlers.
- `01-field-types.md`, `03-docvalues-stored-indexed.md` — the schema-side decisions reviewed alongside this file.
- `06-anti-patterns.md` — the anti-pattern catalog and Solr 9.x version-compat landmines.
