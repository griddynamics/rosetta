# SearchComponent (Solr 9.x)

A SearchComponent is invoked once per request as part of a SearchHandler's pipeline. Use for: cross-cutting query modification, response post-processing, custom result aggregation, anything that needs to see/modify the whole response (not per-doc).

## Lifecycle

```
SearchHandler invokes for each registered component, in order:
  1. prepare(ResponseBuilder)        ── optional pre-flight
  2. process(ResponseBuilder)         ── main work; runs per-shard in distributed
  3. (distributed only)
       distributedProcess(ResponseBuilder)  ── decides further stages
       handleResponses(ResponseBuilder, ShardRequest) ── merges shard responses
  4. finishStage(ResponseBuilder)     ── stage-finalization hook
```

The standard built-in components (in default order):
- `query` — runs the main Q
- `facet` — JSON facets and legacy facets
- `mlt` — MoreLikeThis
- `highlight` — snippet generation
- `stats` — stats over fields
- `debug` — debug info
- `expand` — collapse/expand
- `terms` — terms enumeration
- `spellcheck` — spell suggestions

You insert custom components either before, between, or after these via `first-components`, `components`, or `last-components` in solrconfig.xml.

## Anatomy of a SearchComponent

```java
public class MyComponent extends SearchComponent implements SolrCoreAware {

    private String configValue;

    @Override
    public void init(NamedList args) {
        super.init(args);
        configValue = (String) args.get("configValue");
    }

    @Override
    public void inform(SolrCore core) {
        // called once after core fully loaded
        // safe place to access schema, register listeners, etc.
    }

    @Override
    public void prepare(ResponseBuilder rb) throws IOException {
        // pre-process the request; can modify rb.req params, add filters, etc.
        SolrQueryRequest req = rb.req;
        SolrParams params = req.getParams();
        if (params.getBool("myFeature", false)) {
            ModifiableSolrParams modifiable = new ModifiableSolrParams(params);
            modifiable.add("fq", "some_field:value");
            req.setParams(modifiable);
        }
    }

    @Override
    public void process(ResponseBuilder rb) throws IOException {
        // main work — runs after the search executes (if registered as last-components)
        // or before (as first-components)
        DocList results = rb.getResults().docList;
        // augment the response
        rb.rsp.add("myComponentResult", computeStuff(results));
    }

    @Override
    public String getDescription() {
        return "Adds X to query and Y to response";
    }
}
```

`SolrCoreAware` is optional — implement it only if you need access to the core after init (most plugins do).

## Configuration

```xml
<searchComponent name="myComp" class="com.example.MyComponent">
  <str name="configValue">production</str>
  <int name="threshold">100</int>
  <lst name="nestedConfig">
    <str name="key1">value1</str>
  </lst>
</searchComponent>

<requestHandler name="/select" class="solr.SearchHandler">
  <lst name="defaults">...</lst>
  <arr name="first-components"><str>preProc</str></arr>
  <arr name="components"><str>query</str><str>myComp</str><str>facet</str></arr>
  <arr name="last-components"><str>postProc</str></arr>
</requestHandler>
```

`first-components` runs before built-ins. `last-components` runs after. `components` (without prefix) **replaces** the entire pipeline — use only when you fully understand what you're omitting.

For one-off use, override on a per-request basis: `&components=query,myComp,facet`. Useful for testing.

## Distributed mode (SolrCloud)

In SolrCloud, a request typically:
1. Hits a coordinator node
2. Coordinator creates a `ResponseBuilder` and calls `prepare()` on each component
3. For each stage, calls `distributedProcess()` to determine if more shard requests are needed
4. Sends shard requests; waits for responses
5. For each shard response, calls `handleResponses(rb, shardRequest)` on each component
6. Final response merged and returned

A SearchComponent that doesn't override `distributedProcess()` and `handleResponses()` works at standalone but in distributed mode:
- `prepare()` runs on coordinator
- `process()` runs on each shard (during the `STAGE_GET_FIELDS` typically)
- Custom response additions only appear in shard responses, not aggregated

For a SearchComponent that adds to the top-level response (`rb.rsp.add(...)`), the shard's addition gets stripped during merge unless the component handles `handleResponses`.

### Distributed-aware skeleton

```java
@Override
public int distributedProcess(ResponseBuilder rb) throws IOException {
    if (!enabled(rb)) return ResponseBuilder.STAGE_DONE;
    if (rb.stage < ResponseBuilder.STAGE_EXECUTE_QUERY) {
        return ResponseBuilder.STAGE_EXECUTE_QUERY;
    }
    if (rb.stage == ResponseBuilder.STAGE_EXECUTE_QUERY) {
        // Issue an additional shard request
        ShardRequest sreq = new ShardRequest();
        sreq.purpose = ShardRequest.PURPOSE_GET_TOP_IDS;
        sreq.params = new ModifiableSolrParams();
        sreq.params.add("myparam", "value");
        rb.addRequest(this, sreq);
        return ResponseBuilder.STAGE_EXECUTE_QUERY;
    }
    return ResponseBuilder.STAGE_DONE;
}

@Override
public void handleResponses(ResponseBuilder rb, ShardRequest sreq) {
    // process shard responses; sreq.responses has individual shard outputs
    Map<String, Integer> aggregated = new HashMap<>();
    for (ShardResponse srsp : sreq.responses) {
        NamedList shardResult = (NamedList) srsp.getSolrResponse().getResponse().get("myComponentResult");
        // merge into aggregated
    }
    rb.rsp.add("myComponentResult", aggregated);
}
```

The full `ResponseBuilder.STAGE_*` constants in order:
- `STAGE_START` (0)
- `STAGE_PARSE_QUERY` (1000)
- `STAGE_TOP_GROUPS` (1500)
- `STAGE_EXECUTE_QUERY` (2000)
- `STAGE_GET_FIELDS` (3000)
- `STAGE_DONE` (Integer.MAX_VALUE)

You can insert work at any stage by returning the appropriate next stage from `distributedProcess()`.

## Common SearchComponent patterns

### Pattern 1: pre-process query (modify before query runs)

Register as `first-components`. Override `prepare()`. Mutate `rb.req` params.

Example use cases:
- Inject a security filter based on user context
- Auto-add a default `fq=tenant_id_s:$user_tenant`
- Translate user-friendly query syntax to Solr syntax

### Pattern 2: post-process results (decorate response)

Register as `last-components`. Override `process()`. Read `rb.getResults().docList`, add to `rb.rsp`.

Example use cases:
- Add custom aggregations across all results
- Compute query-time analytics
- Inject related-search suggestions

### Pattern 3: replace/wrap a built-in component

Override `process()` to do what the built-in does plus more. Register with the built-in's name in `components` to fully replace, or chain via `first/last`.

Be careful — replacing `query` component is brittle; you have to handle pagination, sort, fl, etc.

### Pattern 4: custom collapse/dedup

This is a real production pattern. Replace the standard query result with a deduped/collapsed set after `query` runs.

```java
@Override
public void process(ResponseBuilder rb) throws IOException {
    DocList originalResults = rb.getResults().docList;
    DocList deduped = dedupeBySomeKey(originalResults, rb.req);
    rb.getResults().docList = deduped;
    // also update numFound, etc.
}
```

For block-join-aware collapse (collapse to one parent per group), this is essentially what `QueryBasedCollapseComponent` does — uses block-join knowledge to pick "best" child per parent and only return the parent.

### Pattern 5: batch fetching to avoid N+1

If your DocTransformer needs data from external source (DB, another core, cache), don't fetch per-doc. Instead, write a SearchComponent partner that fetches in bulk:

```java
@Override
public void process(ResponseBuilder rb) throws IOException {
    if (!needsExternalData(rb)) return;
    DocList results = rb.getResults().docList;
    Set<String> ids = collectIdsFromDocs(results, rb);
    Map<String, ExternalData> bulkFetched = externalSource.fetchBatch(ids);
    rb.req.getContext().put("externalDataCache", bulkFetched);
}
```

Then your DocTransformer reads from `req.getContext().get("externalDataCache")` per doc — O(1) per doc instead of O(externalCallLatency) per doc.

This pattern is essentially what `BatchChildFetchComponent` does for child-doc lookups: pre-fetches all children for the page of parents in one query, populates a per-request cache, and a partner DocTransformer uses the cache to attach children without per-parent queries.

## Registering and ordering

The `<arr name="first-components">` / `last-components` declarations are additive to defaults. So this:

```xml
<requestHandler name="/select" class="solr.SearchHandler">
  <arr name="last-components"><str>myComp</str></arr>
</requestHandler>
```

Adds `myComp` after the default pipeline (query, facet, mlt, highlight, stats, debug, expand, terms).

To reorder built-ins, use `<arr name="components">` to specify the entire pipeline:
```xml
<arr name="components">
  <str>query</str>
  <str>myComp</str>      <!-- runs between query and facet -->
  <str>facet</str>
  <str>highlight</str>
  <str>debug</str>
</arr>
```

When `components` is set, `first-components` and `last-components` are still respected (prepended/appended).

## Testing

A SearchComponent is straightforward to integration-test with `SolrTestCaseJ4`:

```java
public class MyComponentTest extends SolrTestCaseJ4 {
    @BeforeClass public static void beforeClass() throws Exception {
        initCore("solrconfig.xml", "schema.xml");
    }

    @Test public void testComponentAdds() throws Exception {
        assertU(adoc("id", "1", "field_s", "value"));
        assertU(commit());
        assertQ("component should add result",
            req("q", "*:*", "myFeature", "true"),
            "//response/lst[@name='myComponentResult']"
        );
    }
}
```

For distributed-mode behavior, `BaseDistributedSearchTestCase` is the standard harness — slow but realistic.

## Common mistakes

- **Caching state in instance fields.** Components are reused across threads. Either store request-scoped data in `rb.req.getContext()`, use ThreadLocal, or make the component truly stateless after init.
- **Forgetting `init()` chain.** Always call `super.init(args)` first.
- **Modifying `rb.req` params after `process()`.** By that point, downstream components have already read what they need. Mutate in `prepare()`.
- **Custom response keys conflicting with built-ins.** Don't add `rb.rsp.add("response", ...)` — collides with the standard results doc list.
- **Doing IO in `prepare()` synchronously.** Slow components block the entire pipeline. Defer to `process()` if possible, or move to async fetch with a SearchComponent + DocTransformer combo.
- **Forgetting the SolrCloud case.** Test in a 2-shard config minimum. Behavior that "works" in standalone may produce nonsense merges in distributed.
- **Using `last-components` when you want to modify the query.** Last components run AFTER query; for query modification, use `first-components`.
