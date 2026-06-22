# plugin-generator — Configuration Contract (DATA)

The generator is data-driven: a future release, domain, or IDE is added by editing descriptors, not control flow. These descriptors are the contract a re-implementation must reproduce. Field names are normative concepts, not required identifiers.

<req id="DATA-CFG-0001" type="DATA" level="System" ticketId="" classification="technical">
  <title>Release descriptor</title>
  <statement>A release descriptor shall define: a release name; the instruction source line it draws from; and a set of template variables handed verbatim to template rendering. The template-variable set shall be the single source of per-release configuration.</statement>
  <rationale>Adding a release must be one descriptor entry; generator code stays release-agnostic.</rationale>
  <source>Documentation</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the known releases When: inspected Then: `r2` carries `deterministic_hooks=false` and `r3` carries `deterministic_hooks=true`, each carrying its own `release` name value.</criteria>
    <criteria>Given: a new release When: a descriptor entry is added Then: generation succeeds with no other code change.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <notes>Template variables currently observed: `release` (name) and `deterministic_hooks` (bool).</notes>
</req>

<req id="DATA-CFG-0002" type="DATA" level="System" ticketId="" classification="technical">
  <title>Plugin-target descriptor</title>
  <statement>Each `PluginTarget` descriptor shall declare, as data, its `PluginSpec` — an ordered list of `SpecEntry` (`{source: glob, target: path, exclude: string[], processors: FileProcessor[]}`), an ordered `PluginProcessor` pipeline, and the descriptor fields (target name, output location and base subfolder, preserved-file seed source, `ModelVocabulary`, bootstrap manifest and inclusion flags, hook configuration, and index and injection declarations). Every per-IDE adaptation shall be expressed by `FileProcessor`s in `SpecEntry` pipelines (per-case model normalization, file/suffix renames, codex agent format), by the `SpecEntry` `target` (folder placement, alternate-name duplication), or by generic `PluginProcessor`s parameterized by descriptor data (reference rewriting, index generation, template rendering, section injection, post-render mirror declarations consumed by a generic `pluginMirrorFiles(from, to)`, directory creation by a generic `createFolder(path)`) — never by bespoke descriptor flags, target-/release-specific options, out-of-band passes (FR-ARCH-0004), or an identity-discriminant flag whose value set enumerates IDE/target/case identities (FR-ARCH-0005). The descriptor shall hold no bootstrap-delivery-strategy field and no per-release, per-target, or identity-discriminant behavior flag; delivery is a property of the preserved templates/rules (FR-VAR-0070).</statement>
  <rationale>Uniform, declarative target definition lets every variant be generated the same way: one shared spec shape (FR-ARCH-0001/0002), values in `plugin-specs.ts`, behavior in the two-tier processor pipelines.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-09</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the six variants When: each is generated Then: only its descriptor differs; the generation procedure is identical.</criteria>
    <criteria>Given: any descriptor field When: inspected Then: it is a value, map, glob, path, or composed processor list — never an identity-discriminant flag enumerating IDE/target/case identities (FR-ARCH-0005).</criteria>
    <criteria>Given: a descriptor omitting an optional adaptation When: generated Then: that adaptation is skipped without error.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: `hookEntryShape` and any per-target/identity-discriminant behavior flag are dropped from the descriptor.</implementationNotes>
  <notes>Target-state descriptor = `PluginSpec` = descriptor fields (name, destination, baseSubfolder, preserved-file seed source, modelVocabulary, bootstrap manifest/inclusion flags, hook config) + `SpecEntry[]` + `PluginProcessor[]`. File-tier behavior lives in each `SpecEntry`'s `FileProcessor` pipeline (`fileRead`, `fileApplyOverrides`, `fileBundle`, per-vocabulary model-normalization processors, `fileRename`, `fileCodexAgentFormat`); plugin-tier behavior is `PluginProcessor`s (`pluginCleanup`, `pluginCopy`, `pluginProcessSpecEntries`, `pluginRewriteReferences`, `pluginGenerateIndexes`, `pluginInjectSections`, `pluginAssembleBootstrap`, `pluginRenderTemplates`, `pluginWrite`). The old Python flags `rename_folders` map to `SpecEntry` `target`s; `rename_files`/`rename_agents` to `fileRename()`; `pre_copy_folders` to an extra `SpecEntry` (FR-COPY-0033); `pre_move_files` to a relocation `SpecEntry`/`fileRename()` (FR-COPY-0034); runtime-layout moves to `SpecEntry` `target`s (FR-VAR-0030/0041). Implemented in `src/rosettify-plugins/src/spec/targets.ts`.</notes>
</req>

<req id="DATA-CFG-0003" type="DATA" level="System" ticketId="" classification="technical">
  <title>Target inventory</title>
  <statement>The generator shall define exactly six targets: `core-claude`, `core-cursor`, `core-copilot`, `core-codex`, `core-cursor-standalone`, `core-copilot-standalone`.</statement>
  <rationale>Fixed, known delivery set per supported IDE and mode.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a generation run When: complete Then: the output directory contains all six target folders.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <notes>Each main target's preserved config folder: core-claude `.claude-plugin`, core-cursor `.cursor-plugin`, core-copilot `.github`, core-codex `.codex-plugin`.</notes>
</req>

<req id="DATA-CFG-0004" type="DATA" level="System" ticketId="" classification="technical">
  <title>Model vocabularies</title>
  <statement>The generator shall hold one model-vocabulary mapping per IDE that uses named or mapped model identifiers, keyed by a release-neutral logical model key.</statement>
  <rationale>Each IDE accepts a different model identifier format for the same underlying model.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-10</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: logical key `sonnet` When: normalized Then: Claude→`claude-sonnet-4-6`, Cursor→`claude-sonnet-4-6`, Copilot→`Claude Sonnet 4.6`.</criteria>
    <criteria>Given: a `gpt-*` value When: normalized for Codex Then: a base model and optional reasoning-effort are derived.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes></implementationNotes>
  <notes>Mapping values (model version strings) are content/config, expected to change over time; the mapping mechanism is the requirement, not the specific strings.</notes>
</req>

<req id="DATA-CFG-0005" type="DATA" level="System" ticketId="" classification="technical">
  <title>Preserved-file source location</title>
  <statement>The generator shall hold a committed preserved-file source under `src/rosettify-plugins/plugins/<target>/`, mirroring the output-relative layout, that contains every file a target keeps but does not generate: the IDE manifest, hook templates, IDE config-folder contents, and any `.mcp.json`. Each main target's preserved files shall be sourced only from its own `src/rosettify-plugins/plugins/<target>/` location.</statement>
  <rationale>The preserved files have no derivation from the instruction source; a committed source is the only authority for them and is what makes generation into a clean output directory possible.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the preserved-file source When: inspected Then: `src/rosettify-plugins/plugins/<target>/` exists for each main target and holds that target's manifest, hook templates, and config-folder files at their output-relative paths.</criteria>
    <criteria>Given: a file generated from the instruction source When: inspected Then: it is absent from `src/rosettify-plugins/plugins/<target>/`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>DATA-CFG-0002, DATA-CFG-0003</depends>
  <notes>Main-target preserved-file source sets (grounded in the current `plugins/` tree): core-claude → `.claude-plugin/plugin.json`, `hooks/hooks.json.tmpl`; core-cursor → `.cursor-plugin/plugin.json`, `hooks/hooks.json.tmpl`, `hooks.json.tmpl` (root, standalone-form template); core-copilot → `.github/plugin/plugin.json`, `.github/plugin/hooks.json.tmpl`, `hooks/hooks.json.tmpl` (and `.github/plugin/.mcp.json` where present); core-codex → `.codex-plugin/plugin.json`, `.codex-plugin/hooks.json.tmpl`. These mirror the per-target preserved set: `preserved_folder` plus `preserved_files` in DATA-CFG-0002/0003, minus the items the generator renders/syncs (rendered `hooks.json`, `*.js` bundles). Standalone preserved files are not stored here (FR-SEED-0002).</notes>
</req>
