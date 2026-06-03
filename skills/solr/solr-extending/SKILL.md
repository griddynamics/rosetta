---
name: solr-extending
description: This skill should be used when developing custom Solr plugins — SearchComponent, DocTransformer/TransformerFactory, QParser/QParserPlugin, UpdateRequestProcessor (URP), ValueSourceParser/function queries, and plugin packaging/wiring in solrconfig.xml. It helps engineers write production-grade Solr plugins, navigate the request lifecycle, handle distributed-mode correctness, register components correctly, and avoid classloader and version-compatibility traps. Use when the user mentions writing/extending a Solr SearchComponent, custom doc transformer, custom query parser, URP chain, custom function query, plugin jar packaging, or solrconfig.xml registration. Targets Solr 9.x.
---

# Solr Extending Skill (Solr 9.x)

This skill helps engineers **build custom Solr plugins**. For query construction (eDisMax, block join, JSON Facets), see the **solr-query** skill. For relevancy tuning (BM25, boosts), see solr-query reference `12-relevancy.md`.

## How to use this skill

This SKILL.md is a router and high-level reference. For non-trivial questions, **read the relevant reference file** under `references/`.

### When the user asks about... → read this reference

| Topic | Reference |
|---|---|
| `SearchComponent` lifecycle (prepare/process), distributed mode, registration | `01-search-component.md` |
| `DocTransformer` / `TransformerFactory` — per-doc augmentation, examples | `02-doc-transformer.md` |
| `QParser` / `QParserPlugin` — custom query syntax | `03-query-parser.md` |
| `UpdateRequestProcessor` (URP) — indexing-time transformations | `04-update-processor.md` |
| `ValueSourceParser` — custom function queries | `05-value-source-parser.md` |
| `solrconfig.xml` wiring, jar packaging, classloading, version compat | `06-plugin-wiring.md` |

---

## Core mental model

A Solr request flows through pluggable layers. Picking the right plugin point depends on **when** in the request lifecycle you need to act:

```
HTTP request
     │
     ▼
RequestHandler  ── /select, /update, custom handlers
     │
     ▼
SearchHandler  ── orchestrates components below
     │
     ├── QueryComponent       ── parses q, fq via QParser plugins
     │       │
     │       └── QParser/QParserPlugin  ← custom syntax
     │
     ├── FacetComponent
     ├── HighlightComponent
     ├── DebugComponent
     ├── (any custom SearchComponent)
     │
     ▼
Response ──> applies DocTransformers per doc  ← per-doc augmentation
```

Indexing has its own pipeline:
```
HTTP /update
     │
     ▼
UpdateRequestHandler
     │
     ▼
UpdateRequestProcessorChain
     │
     ├── URP1 (e.g., timestamp adder)
     ├── URP2 (e.g., field validator)
     ├── URP3 (e.g., dedupe)
     │   ...
     ▼
DistributedUpdateProcessor (in SolrCloud)
     │
     ▼
RunUpdateProcessor (writes to Lucene)
```

## Picking the right extension point

| You want to... | Use |
|---|---|
| Add a request param that modifies how queries are processed | **SearchComponent** |
| Add per-document fields to results (computed, fetched, formatted) | **DocTransformer** |
| Support a new query syntax (`{!myparser ...}`) | **QParser** |
| Compute something from doc fields usable in `bf=` / `sort=` | **ValueSourceParser** |
| Modify documents during indexing (clean fields, derive values, dedupe) | **UpdateRequestProcessor** |
| Wholly new request endpoint with custom output | **RequestHandlerBase** subclass |
| Custom analyzer/tokenizer/filter | (covered by `solr-schema` skill) |

The **most common mistake** is using a SearchComponent when a DocTransformer would do, or vice versa:

- DocTransformer runs per result doc — cheap if doing 10 docs, expensive if 1000+
- SearchComponent runs once per request — can pre/post-process the entire response

If you need to enrich every result doc with data from another source: DocTransformer.
If you need to filter/reorder/deduplicate the result set: SearchComponent.
If you need to inject something into facet processing: SearchComponent (FacetComponent is one).

---

## Quick anatomy: every custom plugin

Every Solr plugin extends one of these base classes:

```java
public class MySearchComponent extends SearchComponent { ... }
public class MyDocTransformer extends DocTransformer { ... }
public class MyTransformerFactory extends TransformerFactory { ... }
public class MyQParser extends QParser { ... }
public class MyQParserPlugin extends QParserPlugin { ... }
public class MyUpdateProcessor extends UpdateRequestProcessor { ... }
public class MyUpdateProcessorFactory extends UpdateRequestProcessorFactory { ... }
public class MyValueSourceParser extends ValueSourceParser { ... }
public class MyHandler extends RequestHandlerBase { ... }
```

Most of these come in **factory + instance** pairs — the factory is registered in `solrconfig.xml` once and is configured with `init` params; the factory creates fresh instance per request.

Common plugin lifecycle hooks:

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

---

## Anti-patterns to call out immediately

When you see these in user code or design, push back before answering:

- **DocTransformer doing batched fetches** — `transform()` is per-doc; if you batch, you accumulate state across docs and break with parallel response writers. Use a SearchComponent in `process()` to pre-fetch, then look up in DocTransformer.
- **SearchComponent for per-doc enrichment** — code path is harder, you have to walk the DocList yourself, easy to break sorting/highlighting. DocTransformer is the right tool.
- **QParser that accepts arbitrary unescaped user input** — XSS / injection. Always parse via `SolrParams`, validate field names against schema.
- **URP that throws on bad input without ignore-on-error wrapping** — a single bad doc kills bulk indexing. Either tolerate gracefully or wrap in `IgnoreCommitOptimizeUpdateProcessorFactory` semantics.
- **SearchComponent that doesn't override `distributedProcess()`** — works in standalone, breaks (silently) in SolrCloud. See `01-search-component.md`.
- **Plugin jar deployed via `<lib>` directive in solrconfig.xml in modern Solr** — deprecated; use Solr packages or `sharedLib` directory.
- **Plugin with mutable instance state** — Solr reuses plugin instances across threads. Field state must be either thread-local, immutable after `init`, or properly synchronized.

---

## Distributed (SolrCloud) considerations

Most plugins work fine in standalone but fail in subtle ways under SolrCloud. Default behavior:

- **SearchComponent**: `process()` runs per shard; you also get `distributedProcess()`, `handleResponses()`, and shard-specific stages. Pure per-doc-result components work without override; cross-shard aggregation does not.
- **DocTransformer**: runs on the node assembling the final response (not per shard). Your transformer sees the merged result; if it needs per-shard state, you need a SearchComponent partner.
- **QParser**: runs on each shard; the parsed Query must be serializable / deterministic so shards agree.
- **URP**: runs at multiple stages — preprocessor on the receiving node, then again on the leader, then again on replicas via `RunUpdateProcessor`. Idempotency matters. The standard `DistributedUpdateProcessor` handles routing; custom URPs go before it (preprocessing) or after (replica-side adjustments).

Always test in a 2+ shard SolrCloud setup before declaring done.

---

## Solr 10 deltas (when relevant)

Most plugin APIs are unchanged in Solr 10. Notable:
- Some deprecated factory methods removed
- `solr.xml` `<lib>` directive support changes (packages-first)
- HTTP/2 client changes affect components doing inter-shard calls explicitly
- Some `org.apache.solr.handler.component.*` internals refactored

If you're on Solr 9.x (the target of this skill), ignore Solr 10 unless asked.

---

## Quick reference: minimal plugin shapes

The fully-formed examples are in references. Quick syntax reminders:

### SearchComponent shape

```java
public class MyComponent extends SearchComponent {
    @Override public void prepare(ResponseBuilder rb) { ... }
    @Override public void process(ResponseBuilder rb) throws IOException { ... }
    @Override public String getDescription() { return "..."; }
}
```

Register:
```xml
<searchComponent name="myComp" class="com.example.MyComponent">
  <str name="someConfig">value</str>
</searchComponent>

<requestHandler name="/select" class="solr.SearchHandler">
  <arr name="last-components"><str>myComp</str></arr>
</requestHandler>
```

### DocTransformer shape

```java
public class MyTransformerFactory extends TransformerFactory {
    @Override public DocTransformer create(String field, SolrParams params, SolrQueryRequest req) {
        return new MyTransformer(field, params.get("arg"));
    }
}

class MyTransformer extends DocTransformer {
    private final String name;
    private final String arg;
    MyTransformer(String name, String arg) { this.name = name; this.arg = arg; }
    @Override public String getName() { return name; }
    @Override public void transform(SolrDocument doc, int docid) { ... }
}
```

Register:
```xml
<transformer name="myTransform" class="com.example.MyTransformerFactory"/>
```

Use:
```
fl=*,result:[myTransform arg=foo]
```

### QParser shape

```java
public class MyQParserPlugin extends QParserPlugin {
    @Override public QParser createParser(String qstr, SolrParams localParams,
                                          SolrParams params, SolrQueryRequest req) {
        return new MyQParser(qstr, localParams, params, req);
    }
}

class MyQParser extends QParser {
    MyQParser(...) { super(...); }
    @Override public Query parse() throws SyntaxError {
        // build Lucene Query from qstr + localParams
    }
}
```

Register:
```xml
<queryParser name="myparser" class="com.example.MyQParserPlugin"/>
```

Use:
```
q={!myparser foo=bar}query body
```
