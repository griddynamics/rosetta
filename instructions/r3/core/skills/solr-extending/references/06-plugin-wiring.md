# Plugin Wiring: Packaging, Registration, Classloading (Solr 9.x)

This file covers getting your custom plugins from a Java project into a running Solr — jar packaging, deployment options (deprecated `<lib>`, `sharedLib`, Solr Packages), classloader behavior, version-compat traps, and the registration syntax for each plugin type.

## Plugin registration syntax (cheatsheet)

For each plugin type, the registration in `solrconfig.xml`:

| Plugin type | XML element |
|---|---|
| `SearchComponent` | `<searchComponent name="X" class="..."/>` then add to a `<requestHandler>`'s components |
| `RequestHandler` | `<requestHandler name="/path" class="..."/>` |
| `QParserPlugin` | `<queryParser name="X" class="..."/>` |
| `ValueSourceParser` | `<valueSourceParser name="X" class="..."/>` |
| `TransformerFactory` | `<transformer name="X" class="..."/>` |
| `UpdateRequestProcessorFactory` | `<processor class="..."/>` inside an `<updateRequestProcessorChain>` |
| Custom Analyzer/Tokenizer/Filter | (in schema, not solrconfig — see solr-schema skill) |
| `SimilarityFactory` (per-field) | (in schema fieldType, not solrconfig — see solr-query `12-relevancy.md`) |

`name=` is the public name (used by users in queries / fl / etc.). `class=` is the fully-qualified Java class.

You can pass init params via nested `<str>`, `<int>`, `<float>`, `<bool>`, `<lst>`, `<arr>`:

```xml
<searchComponent name="myComp" class="com.example.MyComponent">
  <str name="configValue">production</str>
  <int name="threshold">100</int>
  <bool name="enabled">true</bool>
  <lst name="nested">
    <str name="key1">value1</str>
  </lst>
  <arr name="targets">
    <str>foo</str>
    <str>bar</str>
  </arr>
</searchComponent>
```

These arrive in the factory's `init(NamedList args)` method.

## Three deployment models

### Model 1: `sharedLib` directory (simplest)

In `solr.xml`:
```xml
<solr>
  <str name="sharedLib">${solr.install.dir}/contrib/myplugins/lib</str>
</solr>
```

All jars in that directory get loaded at startup, available to all cores. No per-core config needed.

Best for:
- Single deployment shared across all cores
- Simple ops — drop a jar in a folder
- Plugins that don't need versioning

Caveats:
- One classloader for everything in `sharedLib`
- Cannot have two versions of the same dependency across plugins
- Restart Solr to pick up new jars

### Model 2: `<lib>` directive in solrconfig.xml (deprecated in 9.x)

```xml
<config>
  <lib dir="${solr.install.dir}/dist/" regex="solr-myplugin-.*\.jar"/>
  <lib dir="${solr.install.dir}/contrib/myplugin/lib" regex=".*\.jar"/>
  <!-- ... -->
</config>
```

Loads listed jars per-core. Was the standard Solr 7-8 approach.

Status in Solr 9.x: **deprecated and disabled by default** for security reasons (arbitrary jars from disk). To re-enable:
```bash
SOLR_OPTS="$SOLR_OPTS -Dsolr.allowPaths=/path/to/jars"
# or
SOLR_OPTS="$SOLR_OPTS -Dsolr.config.lib.enabled=true"
```

Don't rely on `<lib>` for new code. Use Solr Packages or sharedLib.

### Model 3: Solr Packages (modern, since 8.4)

The package management system: jars are uploaded to the Package Store (in ZooKeeper), versioned, signed, and explicitly enabled per-collection.

Workflow:
```bash
# 1. Sign your jar (one-time setup, prepare a key pair)
openssl dgst -sha1 -sign mykey.pem myplugin-1.0.jar | openssl enc -base64 | tr -d \\n

# 2. Upload jar to package store
curl -X PUT --data-binary @myplugin-1.0.jar -H 'Content-Type: application/octet-stream' \
  "http://localhost:8983/api/cluster/files/myplugin/myplugin-1.0.jar"

# 3. Create a manifest
echo '{
  "name": "myplugin",
  "version": "1.0",
  "files": ["/myplugin/myplugin-1.0.jar"]
}' > manifest.json

# 4. Add the package
curl -X POST -H 'Content-Type: application/json' \
  "http://localhost:8983/api/cluster/package?action=add" -d '{
    "add": {
      "package": "myplugin",
      "version": "1.0",
      "files": ["/myplugin/myplugin-1.0.jar"],
      "manifest": "/myplugin/manifest.json",
      "manifestSHA512": "..."
    }
  }'

# 5. Use the package's classes — reference with package: prefix in solrconfig
```

In solrconfig.xml:
```xml
<searchComponent name="myComp" class="myplugin:com.example.MyComponent"/>
```

Best for:
- SolrCloud production
- Multiple plugin versions across collections
- Compliance environments requiring signed jars
- Dependency isolation (each package has its own classloader)

Requires more setup. The `bin/solr package` CLI helps.

## Building a plugin jar

A standard Maven setup:

```xml
<project>
  <groupId>com.example</groupId>
  <artifactId>my-solr-plugin</artifactId>
  <version>1.0.0</version>

  <properties>
    <solr.version>9.6.0</solr.version>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.apache.solr</groupId>
      <artifactId>solr-core</artifactId>
      <version>${solr.version}</version>
      <scope>provided</scope>   <!-- critical: don't bundle Solr in your jar -->
    </dependency>
    <dependency>
      <groupId>org.apache.lucene</groupId>
      <artifactId>lucene-core</artifactId>
      <version>9.10.0</version>
      <scope>provided</scope>
    </dependency>
    <dependency>
      <groupId>com.google.guava</groupId>
      <artifactId>guava</artifactId>
      <version>32.1.3-jre</version>
      <!-- if Solr ships its own guava, may conflict; check ${solr.install}/server/solr-webapp/webapp/WEB-INF/lib/ -->
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <artifactId>maven-shade-plugin</artifactId>
        <version>3.5.1</version>
        <executions>
          <execution>
            <phase>package</phase>
            <goals><goal>shade</goal></goals>
            <configuration>
              <minimizeJar>true</minimizeJar>
              <relocations>
                <!-- relocate guava to avoid conflict with Solr's bundled guava -->
                <relocation>
                  <pattern>com.google.common</pattern>
                  <shadedPattern>com.example.shaded.guava</shadedPattern>
                </relocation>
              </relocations>
            </configuration>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
```

Build:
```bash
mvn clean package
# produces target/my-solr-plugin-1.0.0.jar
```

For Gradle, equivalent setup uses `compileOnly` for Solr deps and the `shadow` plugin for relocation.

## Classloader behavior

Solr has a hierarchical classloader:

```
Bootstrap CL
   ↑
System CL (Solr's own jars in server/solr-webapp/webapp/WEB-INF/lib)
   ↑
SharedLib CL (jars in <sharedLib>)
   ↑
Per-core CL (jars in <lib> directives or solr-config-driven)
   ↑
Package CL (per-package classloader, isolated from siblings)
```

Implications:

- A plugin jar in `sharedLib` cannot use a class from a per-core jar (visibility going up only)
- Two cores using `<lib>` to load the same dependency at different versions: each gets its own version (good)
- Two cores using `sharedLib` for a dependency: same version everywhere (must be compatible with all cores)
- Solr's own classes (in System CL) are shared by all plugins

If your plugin needs a dependency that Solr also bundles, beware:
- Your version is preferred only if it's loaded above Solr's
- For `sharedLib` and `<lib>`, your plugin's classloader is below System (Solr's) — Solr's bundled version wins
- For Packages, you have isolated classloaders, so you can use your version

If you need a different version of a Solr-bundled dep: shade-relocate it (Maven shade plugin) to a different package.

## Version compatibility

Solr's plugin API is **not** binary-compatible across major versions:

- Solr 8.x → 9.x: many breaking changes (RequestParser API, SolrCore lifecycle, ManagedSchema interactions)
- Solr 9.x → 10.x: some method signatures changed; deprecated APIs removed
- Within 9.x (9.0 → 9.7): mostly backward compatible, but minor breaking changes happen — read release notes

Best practices:
- Build against the **exact** Solr version you'll deploy to (use `${solr.version}` matched)
- For multi-version targets, build separate jars
- Run an integration test suite per Solr version
- Pin transitive Lucene version to match Solr's exact Lucene

To check what Solr ships:
```bash
ls ${SOLR_HOME}/server/solr-webapp/webapp/WEB-INF/lib | grep -E '^(lucene|solr)-'
```

## Init-time vs request-time

Most factories do their work in `init(NamedList args)` — runs once when the core loads. The instance returned by `getInstance(...)` (or `createParser(...)`, `create(...)`, etc.) handles per-request work.

Init-time:
- Read config params
- Build expensive lookups (caches, models)
- Validate that the schema has required fields
- Register listeners

Request-time:
- Use the cached state
- Don't do `init()`-style work on every request

If you need access to the SolrCore during init: implement `SolrCoreAware`, override `inform(SolrCore core)`. This is called once after the core is fully loaded — safer than the factory's `init()` for accessing schema/searcher/other components.

```java
public class MyComponent extends SearchComponent implements SolrCoreAware {

    @Override public void init(NamedList args) {
        super.init(args);
        // config-only work here
    }

    @Override public void inform(SolrCore core) {
        // schema/searcher/component access here
        IndexSchema schema = core.getLatestSchema();
        validateSchema(schema);
    }
}
```

## Common deployment mistakes

### Bundling Solr or Lucene in your jar

```xml
<dependency>
  <groupId>org.apache.solr</groupId>
  <artifactId>solr-core</artifactId>
  <version>9.6.0</version>
  <!-- BUG: missing <scope>provided</scope> -->
</dependency>
```

Without `provided` scope, your jar contains a copy of Solr. At deploy time, Solr's classloader finds two versions, may pick yours (incompatible), or get NoClassDefFoundError. **Always use `provided` for Solr/Lucene deps.**

### Conflicting transitive dependencies

Common conflicts:
- Guava (Solr ships 32.x; your transitive may be 31.x or 33.x)
- Jackson (Solr's version may differ from yours)
- SLF4J implementations (Solr ships logback-classic; do not bundle log4j)
- Apache Commons (multiple versions floating around)

Detect conflicts: `mvn dependency:tree`. Resolve via shade-relocate or by aligning versions to Solr's.

### Wrong jar in production

Always validate the deployed jar's classes:
```bash
unzip -l my-plugin.jar | grep MySearchComponent
```

You should see exactly the class you expect, no Solr classes, no inner classes you didn't write.

### Unsigned package (Packages model)

Solr will reject unsigned packages by default in production. Sign with a key, register the public key with Solr's package manager, then install.

### Shared mutable state across plugins

Two plugins both deployed to `sharedLib`, both depending on a singleton — they share the singleton. This usually breaks when you don't expect it to.

For per-plugin state, use a config-key namespace, or move state to per-core via `core.getResourceLoader()`.

### Missing or wrong manifest in JAR

For Packages, the manifest must describe what's in the jar. Mismatch → load fails silently or raises cryptic errors. Use `jar -tvf` to list contents and `cat META-INF/MANIFEST.MF` to inspect.

### Deploying jar but forgetting to register in solrconfig.xml

Class is on classpath but no `<searchComponent>` / `<queryParser>` / etc. registers it. Solr ignores it entirely. Reload the core after editing solrconfig.xml.

## Reloading without restart

In SolrCloud:
```bash
curl 'http://localhost:8983/solr/admin/collections?action=RELOAD&name=mycollection'
```

In standalone:
```bash
curl 'http://localhost:8983/solr/admin/cores?action=RELOAD&core=mycore'
```

This re-reads `solrconfig.xml` and `schema.xml`, re-instantiates plugins. Required after editing config.

If you change the jar itself, reload alone doesn't pick it up — Java's classloader caches loaded classes. You need to:
- Restart Solr (definitive)
- Or use Packages with versioning — install new version, the old is unloaded gracefully

`<lib>` directive plus core reload: classes from old jar may stay loaded; behavior is undefined. Use Packages or restart.

## Testing locally

```bash
# install local Solr
./bin/solr start -c

# create a collection
./bin/solr create -c mycoll -shards 2 -replicationFactor 1

# upload schema and config (must include your plugin)
./bin/solr config --upload mycoll path/to/configset.zip

# copy plugin jar to sharedLib
cp my-plugin.jar /path/to/solr/contrib/myplugins/lib/

# restart to pick up
./bin/solr stop && ./bin/solr start -c

# test
curl 'http://localhost:8983/solr/mycoll/select?q=*:*&fl=*,foo:[myTransform]'
```

## Checklist before shipping a plugin

1. Solr/Lucene deps marked `provided` in pom
2. All transitive deps reviewed for conflicts with Solr's bundled versions
3. Custom dep classes shaded if conflict possible
4. Tested in standalone AND SolrCloud (2+ shards)
5. Tested against the exact Solr version that will be deployed
6. `init()` validates required config and fails fast on bad input
7. `inform()` validates schema has required fields
8. `equals()`/`hashCode()` implemented on cacheable plugins (ValueSource, Query)
9. Distributed-mode behavior tested (URP across replicas, SearchComponent across shards, etc.)
10. README for deployment ops: which model, where to put jar, how to register
11. Versioned: jar name includes version, tagged in source control
