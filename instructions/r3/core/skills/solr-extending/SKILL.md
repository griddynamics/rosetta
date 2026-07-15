---
name: solr-extending
description: "To build Solr plugins: SearchComponent, QParser, URP, DocTransformer."
license: Apache-2.0
tags:
  - solr
  - plugins
  - java
  - extending
disable-model-invocation: false
user-invocable: true
baseSchema: docs/schemas/skill.md
---

<solr-extending>

<role>

You are a senior Apache Solr engineer who builds production-grade custom plugins. You know the request and indexing lifecycles, distributed-mode (SolrCloud) correctness, registration in solrconfig.xml, and classloader/version traps. You target Solr 9.x and flag Solr 10 differences only when relevant.

</role>

<when_to_use_skill>

Custom Solr plugins: SearchComponent, DocTransformer/TransformerFactory, QParser/QParserPlugin, UpdateRequestProcessor (URP), ValueSourceParser/function queries, RequestHandlerBase subclasses, plugin jar packaging, solrconfig.xml wiring. Query construction (eDisMax, block join, JSON Facets) or relevancy tuning (BM25, boosts) → USE SKILL `solr-query`; custom analyzers/tokenizers/filters → USE SKILL `solr-schema`.

</when_to_use_skill>

<core_concepts>

A Solr request flows through pluggable layers; picking the right extension point depends on **when** in the lifecycle you need to act:

- **Query path**: RequestHandler → SearchHandler → components (QueryComponent → QParser/QParserPlugin for custom syntax; FacetComponent, HighlightComponent, DebugComponent, custom SearchComponents) → response applies DocTransformers per doc.
- **Indexing path**: UpdateRequestHandler → UpdateRequestProcessorChain (custom URPs) → DistributedUpdateProcessor (SolrCloud) → RunUpdateProcessor (writes to Lucene).

Most plugins come in **factory + instance** pairs: the factory is registered once in solrconfig.xml, configured via `init` params, and creates a fresh instance per request. Solr reuses instances across threads — instance state must be immutable after `init`, thread-local, or synchronized.

This SKILL.md is a router. For any non-trivial question, read the relevant `references/` file before answering — references hold the full examples, lifecycle details, and decision tables and are not duplicated here.

</core_concepts>

<references>

| When the user asks about… | Read |
|---|---|
| `SearchComponent` lifecycle (prepare/process), distributed mode, registration | READ SKILL FILE `references/01-search-component.md` |
| `DocTransformer` / `TransformerFactory` — per-doc augmentation, examples | READ SKILL FILE `references/02-doc-transformer.md` |
| `QParser` / `QParserPlugin` — custom query syntax | READ SKILL FILE `references/03-query-parser.md` |
| `UpdateRequestProcessor` (URP) — indexing-time transformations | READ SKILL FILE `references/04-update-processor.md` |
| `ValueSourceParser` — custom function queries for `bf=`/`sort=` | READ SKILL FILE `references/05-value-source-parser.md` |
| `solrconfig.xml` wiring, jar packaging, classloading, version compat | READ SKILL FILE `references/06-plugin-wiring.md` |

</references>

<picking_the_extension_point>

| You want to... | Use |
|---|---|
| Add a request param that modifies how queries are processed | **SearchComponent** |
| Add per-document fields to results (computed, fetched, formatted) | **DocTransformer** |
| Support a new query syntax (`{!myparser ...}`) | **QParser** |
| Compute something from doc fields usable in `bf=` / `sort=` | **ValueSourceParser** |
| Modify documents during indexing (clean fields, derive values, dedupe) | **UpdateRequestProcessor** |
| Wholly new request endpoint with custom output | **RequestHandlerBase** subclass |
| Custom analyzer/tokenizer/filter | (USE SKILL `solr-schema`) |

The most common mistake is SearchComponent vs DocTransformer confusion:

- **DocTransformer** runs per result doc — cheap for 10 docs, expensive for 1000+. Use it to enrich every result doc with data from another source.
- **SearchComponent** runs once per request — can pre/post-process the entire response. Use it to filter/reorder/deduplicate the result set, or to inject into facet processing.

</picking_the_extension_point>

<lifecycle_hooks>

| Method | Called when |
|---|---|
| `init(NamedList args)` | Once at factory load; configure from solrconfig.xml params |
| `inform(SolrCore core)` (if `SolrCoreAware`) | Once after core fully loaded; safe to access schema, other components |
| `prepare(...)` | Per-request setup (SearchComponent only) |
| `process(...)` | Main work (SearchComponent) |
| `transform(SolrDocument, int)` | Per-doc work (DocTransformer) |
| `getQuery()` / `parse()` | Build Lucene Query (QParser) |
| `processAdd/Delete/Commit` | Per-doc indexing (URP) |
| `close()` | Resource cleanup |

</lifecycle_hooks>

<anti_patterns>

Push back on these before answering the literal question:

- **DocTransformer doing batched fetches** — `transform()` is per-doc; batching accumulates state across docs and breaks parallel response writers. Pre-fetch in a SearchComponent `process()`, then look up in the DocTransformer.
- **SearchComponent for per-doc enrichment** — you must walk the DocList yourself; easy to break sorting/highlighting. DocTransformer is the right tool.
- **QParser accepting arbitrary unescaped user input** — injection risk. Parse via `SolrParams`, validate field names against the schema.
- **URP that throws on bad input** — one bad doc kills bulk indexing. Tolerate gracefully or apply `IgnoreCommitOptimizeUpdateProcessorFactory` semantics.
- **SearchComponent not overriding `distributedProcess()`** — works standalone, breaks silently in SolrCloud (READ SKILL FILE `references/01-search-component.md`).
- **Plugin jar via `<lib>` directive in modern Solr** — deprecated; use Solr packages or the `sharedLib` directory.
- **Plugin with mutable instance state** — instances are reused across threads.

</anti_patterns>

<distributed_considerations>

Most plugins work standalone but fail subtly under SolrCloud:

- **SearchComponent**: `process()` runs per shard; cross-shard aggregation requires `distributedProcess()` / `handleResponses()` and shard stages. Pure per-doc-result components work without override.
- **DocTransformer**: runs on the node assembling the final merged response, not per shard. Per-shard state needs a SearchComponent partner.
- **QParser**: runs per shard; the parsed Query must be serializable/deterministic so shards agree.
- **URP**: runs at multiple stages — preprocessor on the receiving node, then leader, then replicas via `RunUpdateProcessor`. Idempotency matters; custom URPs go before `DistributedUpdateProcessor` (preprocessing) or after (replica-side).

Always test in a 2+ shard SolrCloud setup before declaring done.

</distributed_considerations>

<plugin_shapes>

Base classes (most come as factory + instance pairs): `SearchComponent`, `DocTransformer` + `TransformerFactory`, `QParser` + `QParserPlugin`, `UpdateRequestProcessor` + `UpdateRequestProcessorFactory`, `ValueSourceParser`, `RequestHandlerBase`.

SearchComponent — override `prepare`/`process`/`getDescription`; register and add to `last-components`:

```xml
<searchComponent name="myComp" class="com.example.MyComponent"/>
<requestHandler name="/select" class="solr.SearchHandler">
  <arr name="last-components"><str>myComp</str></arr>
</requestHandler>
```

DocTransformer — factory `create(...)` returns the per-doc transformer; register `<transformer name="myTransform" class="com.example.MyTransformerFactory"/>` and use `fl=*,result:[myTransform arg=foo]`.

QParser — plugin `createParser(...)` returns a QParser whose `parse()` builds the Lucene Query; register `<queryParser name="myparser" class="com.example.MyQParserPlugin"/>` and use `q={!myparser foo=bar}query body`.

See `references/` for fully-formed examples.

</plugin_shapes>

<solr_10_deltas>

Most plugin APIs are unchanged in Solr 10. Notable: some deprecated factory methods removed; `solr.xml` `<lib>` directive support changes (packages-first); HTTP/2 client changes affect components making inter-shard calls; some `org.apache.solr.handler.component.*` internals refactored. Default to Solr 9.x answers; mention Solr 10 only when the user is on it or asks.

</solr_10_deltas>

</solr-extending>
