# UpdateRequestProcessor — URP (Solr 9.x)

A URP runs during indexing — it can modify, validate, enrich, or reject documents before they hit Lucene. Use for: clean fields, derive values, dedupe, tagging, language detection, and any other "do this to every doc on the way in".

## URP chain anatomy

```
HTTP /update
     │
     ▼
UpdateRequestHandler  ── parses the request body (JSON, XML, CSV)
     │
     ▼
UpdateRequestProcessorChain
     │
     ├── URP-1
     ├── URP-2
     ├── ...
     ├── DistributedUpdateProcessor   ← in SolrCloud, routes to shard leader/replicas
     ├── ...
     ▼
RunUpdateProcessor  ← actually writes to Lucene
```

The chain is a sequence of factories defined in solrconfig.xml. Each URP's `processAdd(AddUpdateCommand)` (and `processDelete`, `processCommit`) gets called in order; each calls `super.processAdd(...)` to pass control to the next URP.

A request finishes when it reaches `RunUpdateProcessor`, which writes to Lucene's IndexWriter.

## Anatomy

```java
package com.example;

public class MyUpdateProcessorFactory extends UpdateRequestProcessorFactory {

    private String configValue;

    @Override
    public void init(NamedList args) {
        super.init(args);
        configValue = (String) args.get("configValue");
    }

    @Override
    public UpdateRequestProcessor getInstance(SolrQueryRequest req,
                                              SolrQueryResponse rsp,
                                              UpdateRequestProcessor next) {
        return new MyUpdateProcessor(req, rsp, next, configValue);
    }
}

class MyUpdateProcessor extends UpdateRequestProcessor {
    private final SolrQueryRequest req;
    private final String configValue;

    MyUpdateProcessor(SolrQueryRequest req, SolrQueryResponse rsp,
                      UpdateRequestProcessor next, String configValue) {
        super(next);
        this.req = req;
        this.configValue = configValue;
    }

    @Override
    public void processAdd(AddUpdateCommand cmd) throws IOException {
        SolrInputDocument doc = cmd.getSolrInputDocument();
        // mutate doc
        doc.setField("indexed_at_dt", new Date());
        if (doc.getFieldValue("status_s") == null) {
            doc.setField("status_s", "active");
        }
        // pass to next URP
        super.processAdd(cmd);
    }

    @Override
    public void processDelete(DeleteUpdateCommand cmd) throws IOException {
        // delete handling
        super.processDelete(cmd);
    }

    @Override
    public void processCommit(CommitUpdateCommand cmd) throws IOException {
        super.processCommit(cmd);
    }
}
```

Register:
```xml
<updateRequestProcessorChain name="myChain">
  <processor class="com.example.MyUpdateProcessorFactory">
    <str name="configValue">production</str>
  </processor>
  <processor class="solr.LogUpdateProcessorFactory"/>
  <processor class="solr.DistributedUpdateProcessorFactory"/>
  <processor class="solr.RunUpdateProcessorFactory"/>
</updateRequestProcessorChain>

<requestHandler name="/update" class="solr.UpdateRequestHandler">
  <lst name="defaults">
    <str name="update.chain">myChain</str>
  </lst>
</requestHandler>
```

`DistributedUpdateProcessorFactory` and `RunUpdateProcessorFactory` are required and must come last (in that order). Place your URP **before** Distributed if you want it to run before sharding decisions. Place after Distributed to run on each replica independently.

## When to put a URP before vs after Distributed

```
URP-Pre  → DistributedUpdateProcessor → URP-Post → RunUpdate
```

**Before Distributed (most common):**
- Field validation, derivation, normalization
- Document-level decisions that should be consistent across all replicas
- Anything that affects routing (e.g., generating the doc ID)

Runs once on the receiving node. Distributed copies the (mutated) doc to leader and replicas.

**After Distributed:**
- Replica-side bookkeeping (rare)
- Things that depend on shard-local state
- Logging that needs to happen per-replica

Runs on each leader and replica. Easy to introduce inconsistency — use only when you understand the implications.

## Built-in URPs you should know

| URP | Purpose |
|---|---|
| `LogUpdateProcessorFactory` | Logs each add/delete; useful in dev, often skipped in prod |
| `DistributedUpdateProcessorFactory` | SolrCloud routing — required in cloud mode |
| `RunUpdateProcessorFactory` | Actually writes to Lucene — required, must be last |
| `IgnoreCommitOptimizeUpdateProcessorFactory` | Drops user-issued commits; force scheduled commits only |
| `TimestampUpdateProcessorFactory` | Adds a timestamp field |
| `UUIDUpdateProcessorFactory` | Generates UUIDs for unset id field |
| `RegexpBoostProcessorFactory` | Boosts docs matching regex patterns |
| `LangDetectLanguageIdentifierUpdateProcessor` | Detects language from text fields |
| `AddSchemaFieldsUpdateProcessorFactory` | Adds new fields to managed schema based on doc content |
| `SignatureUpdateProcessorFactory` | Computes content signature for dedup |
| `ScriptUpdateProcessorFactory` | Runs a JavaScript snippet per doc (deprecated; consider Java URP) |

## Common patterns

### Pattern 1: derive a field from others

```java
@Override
public void processAdd(AddUpdateCommand cmd) throws IOException {
    SolrInputDocument doc = cmd.getSolrInputDocument();
    Object firstName = doc.getFieldValue("first_name_s");
    Object lastName = doc.getFieldValue("last_name_s");
    if (firstName != null && lastName != null) {
        doc.setField("full_name_s", firstName + " " + lastName);
    }
    super.processAdd(cmd);
}
```

### Pattern 2: validate and reject

```java
@Override
public void processAdd(AddUpdateCommand cmd) throws IOException {
    SolrInputDocument doc = cmd.getSolrInputDocument();
    String type = (String) doc.getFieldValue("type_s");
    if (!Set.of("product", "sku", "article").contains(type)) {
        throw new SolrException(ErrorCode.BAD_REQUEST,
            "invalid type_s: " + type + " (id=" + doc.getFieldValue("id") + ")");
    }
    super.processAdd(cmd);
}
```

Throwing `SolrException` aborts the doc. The whole batch may abort or skip the doc depending on the request's `failOnVersionConflicts` and similar settings.

### Pattern 3: normalize values

```java
@Override
public void processAdd(AddUpdateCommand cmd) throws IOException {
    SolrInputDocument doc = cmd.getSolrInputDocument();
    Object brand = doc.getFieldValue("brand_s");
    if (brand instanceof String) {
        doc.setField("brand_s", ((String) brand).trim().toLowerCase(Locale.ROOT));
    }
    super.processAdd(cmd);
}
```

Useful for case normalization, trimming, format standardization that you don't want to do at query time.

### Pattern 4: enrich from external source

```java
@Override
public void processAdd(AddUpdateCommand cmd) throws IOException {
    SolrInputDocument doc = cmd.getSolrInputDocument();
    String productId = (String) doc.getFieldValue("id");
    if (productId != null) {
        ExternalProductMeta meta = externalCache.get(productId);
        if (meta != null) {
            doc.setField("external_score_f", meta.score);
            doc.setField("external_tags_ss", meta.tags);
        }
    }
    super.processAdd(cmd);
}
```

The cache reference comes from the factory; populated outside the indexing path. Don't do synchronous external calls per doc — that destroys throughput.

### Pattern 5: dedupe by content signature

Use `SignatureUpdateProcessorFactory` (built-in):

```xml
<processor class="solr.SignatureUpdateProcessorFactory">
  <bool name="enabled">true</bool>
  <str name="signatureField">signature_s</str>
  <bool name="overwriteDupes">true</bool>
  <str name="fields">title_t,description_t</str>
  <str name="signatureClass">solr.processor.MD5Signature</str>
</processor>
```

Computes MD5 of `title_t` + `description_t`, stores in `signature_s`, deletes any existing doc with the same signature before adding.

For more sophisticated dedupe (fuzzy match, normalized comparison), write a custom URP that computes a normalized key and queries the index for existing matches before adding.

### Pattern 6: reject bad batch members without aborting

The default behavior — throw exception aborts the doc but may abort the whole batch. To skip-and-continue:

```java
@Override
public void processAdd(AddUpdateCommand cmd) throws IOException {
    SolrInputDocument doc = cmd.getSolrInputDocument();
    try {
        validate(doc);
    } catch (ValidationException e) {
        log.warn("Skipping doc {}: {}", doc.getFieldValue("id"), e.getMessage());
        return;   // don't call super.processAdd — doc is silently dropped
    }
    super.processAdd(cmd);
}
```

Returning without calling `super.processAdd()` drops the doc. The batch continues. Trade-off: silent drops are dangerous; always log loud enough to monitor.

For visibility, accumulate stats in `req.getContext()` and have a SearchComponent expose them in the response, or use a metrics gauge.

### Pattern 7: idempotent / re-runnable URPs

Critical for SolrCloud — your URP may run again on replica recovery, on commit replay, etc. Make sure repeated execution doesn't double-process:

```java
@Override
public void processAdd(AddUpdateCommand cmd) throws IOException {
    SolrInputDocument doc = cmd.getSolrInputDocument();
    if (doc.getFieldValue("normalized_at_dt") == null) {
        normalize(doc);
        doc.setField("normalized_at_dt", new Date());
    }
    super.processAdd(cmd);
}
```

The marker field prevents re-normalization on replay. Pick a field that only your URP sets.

## Distributed mode behavior

In SolrCloud:
1. Doc arrives at any node
2. URPs **before** `DistributedUpdateProcessor` run on the receiving node
3. `DistributedUpdateProcessor` routes to the leader of the appropriate shard
4. Leader runs URPs **after** `DistributedUpdateProcessor` (often nothing) and writes to its index
5. Leader forwards to replicas; each replica runs the post-Distributed URPs

So pre-Distributed URPs run **once**, post-Distributed run **once per replica**.

If a URP must be deterministic across replicas (e.g., "compute id based on content hash"), it must be pre-Distributed. Otherwise different replicas could compute different ids. Most validation and normalization are pre.

If a URP must record where the doc was actually written (e.g., per-replica auditing), post-Distributed is correct.

## Common mistakes

### Forgetting `super.processAdd(cmd)`

```java
@Override
public void processAdd(AddUpdateCommand cmd) throws IOException {
    mutate(cmd.getSolrInputDocument());
    // BUG: missing super.processAdd(cmd) — doc never written!
}
```

The chain stops here. `RunUpdateProcessor` is never reached. The doc disappears. Always call `super.processAdd(cmd)` unless you're intentionally dropping.

### Modifying after `super.processAdd`

```java
super.processAdd(cmd);
doc.setField("foo", "bar");   // BUG: too late, doc already written
```

Mutations after `super` are not reflected. Always mutate before passing on.

### Reading from request context across docs

```java
class MyURP extends UpdateRequestProcessor {
    private int counter = 0;   // BUG: shared across docs in batch, but instance is per-request

    @Override public void processAdd(AddUpdateCommand cmd) throws IOException {
        counter++;
        // ...
    }
}
```

A URP instance is created per request, not per doc. If your batch has 1000 docs, all 1000 are processed by the same instance. State accumulates within a batch. Whether that's a bug depends on intent.

### Doing slow IO synchronously

```java
@Override public void processAdd(AddUpdateCommand cmd) throws IOException {
    String enrichment = httpClient.fetch(...).blockingGet();   // BAD
    cmd.getSolrInputDocument().setField("extra", enrichment);
    super.processAdd(cmd);
}
```

Per-doc IO at index time crushes throughput. Pre-cache the data (factory-level), or batch fetches in a SearchComponent partner that runs separately, or skip enrichment in URP and do it in a parallel process.

### Throwing for transient errors

```java
catch (TransientException e) {
    throw new SolrException(...);   // BAD: aborts whole batch
}
```

For transient errors, retry internally, or log-and-continue. Throwing terminates the entire `/update` request, losing all docs in the batch.

### Not testing both the standalone and SolrCloud paths

URPs that work in standalone may behave subtly differently in SolrCloud due to the leader/replica distinction. Always test in 2+ shard config.

### Confusing UpdateRequestProcessorChain definitions

A handler can have a default chain set via `update.chain=myChain` in defaults. If user sends `?update.chain=other`, that overrides. Double-check what's actually running by adding a `LogUpdateProcessorFactory` mid-chain and inspecting logs.

## Testing

```java
public class MyURPTest extends SolrTestCaseJ4 {
    @BeforeClass public static void beforeClass() throws Exception {
        initCore("solrconfig.xml", "schema.xml");
    }

    @Test public void testProcessorAddsField() throws Exception {
        SolrInputDocument doc = sdoc("id", "1", "first_name_s", "John", "last_name_s", "Smith");
        assertU(adoc(doc));
        assertU(commit());
        assertQ("URP added full_name_s",
            req("q", "id:1", "fl", "*"),
            "//doc/str[@name='full_name_s'][.='John Smith']"
        );
    }
}
```

For factory-init testing:
```java
@Test public void testFactoryInit() {
    NamedList<String> args = new NamedList<>();
    args.add("configValue", "test");
    MyUpdateProcessorFactory factory = new MyUpdateProcessorFactory();
    factory.init(args);
    assertEquals("test", factory.getConfigValue());
}
```
