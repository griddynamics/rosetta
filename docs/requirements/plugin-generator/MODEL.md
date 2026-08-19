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
  <notes>Template variables currently observed: `release` (name) and `deterministic_hooks` (bool). A CLI argument may override `deterministic_hooks` per run (FR-CLI-0012); the override replaces the descriptor value at resolution time, so the effective variable set remains the single input to rendering.</notes>
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
    <criteria>Given: the seven variants When: each is generated Then: only its descriptor differs; the generation procedure is identical.</criteria>
    <criteria>Given: any descriptor field When: inspected Then: it is a value, map, glob, path, or composed processor list — never an identity-discriminant flag enumerating IDE/target/case identities (FR-ARCH-0005).</criteria>
    <criteria>Given: a descriptor omitting an optional adaptation When: generated Then: that adaptation is skipped without error.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: `hookEntryShape` and any per-target/identity-discriminant behavior flag are dropped from the descriptor.</implementationNotes>
  <notes>Target-state descriptor = `PluginSpec` = descriptor fields (name, destination, baseSubfolder, preserved-file seed source, modelVocabulary, bootstrap manifest/inclusion flags, hook config) + `SpecEntry[]` + `PluginProcessor[]`. File-tier behavior lives in each `SpecEntry`'s `FileProcessor` pipeline (`fileRead`, `fileApplyOverrides`, `fileBundle`, per-vocabulary model-normalization processors, `fileRename`, `fileCodexAgentFormat`); plugin-tier behavior is `PluginProcessor`s (`pluginCleanup`, `pluginCopy`, `pluginProcessSpecEntries`, `pluginRewriteReferences`, `pluginGenerateIndexes`, `pluginInjectSections`, `pluginAssembleBootstrap`, `pluginRenderTemplates`, `pluginWrite`). The old Python flags `rename_folders` map to `SpecEntry` `target`s; `rename_files`/`rename_agents` to `fileRename()`; `pre_copy_folders` to an extra `SpecEntry` (FR-COPY-0033); `pre_move_files` to a relocation `SpecEntry`/`fileRename()` (FR-COPY-0034); runtime-layout moves to `SpecEntry` `target`s (FR-VAR-0030/0041). Implemented in `src/rosettify-plugins/src/spec/targets.ts`.</notes>
</req>

<req id="DATA-CFG-0003" type="DATA" level="System" ticketId="138" classification="technical">
  <title>Target inventory</title>
  <statement>The generator shall define exactly seven base targets: `core-claude`, `core-cursor`, `core-copilot`, `core-codex`, `core-cursor-standalone`, `core-copilot-standalone`, `core-antigravity`. Each base target's `name` shall stay fixed; when a profile is active, only the target's `destination` shall be suffixed by the profile's `destinationSuffix` (DATA-CFG-0006). The base target set shall remain exactly these seven regardless of any active profile.</statement>
  <rationale>Fixed, known delivery set per supported IDE and mode. Antigravity ships as a single combined plugin (no separate standalone target): the plugin and an in-repo extraction differ only by the presence of `plugin.json`, which the IDE ignores as an extra file, so one target serves both installation and in-repo use.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-08-19</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a generation run When: complete Then: the output directory contains all seven target folders.</criteria>
    <criteria>Given: the target set When: inspected Then: `core-antigravity` is present and no `core-antigravity-standalone` target exists.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/targets.ts (buildAllSpecs returns the seven targets incl. core-antigravity with no standalone; each target's destination is now suffixed by an active profile's destinationSuffix while spec.name stays fixed). Tests: tests/e2e/profile.e2e.test.ts, tests/unit/spec/targets-antigravity-output.test.ts.</implementationNotes>
  <notes>Each main target's preserved config folder: core-claude `.claude-plugin`, core-cursor `.cursor-plugin`, core-copilot `.github`, core-codex `.codex-plugin`. `core-antigravity` has no dot-config folder — its manifest is `plugin.json` at the plugin root. The single Antigravity target covers all three Antigravity products (Antigravity, Antigravity CLI, Antigravity IDE), which all read `plugin.json`.</notes>
</req>

<req id="DATA-CFG-0004" type="DATA" level="System" ticketId="" classification="technical">
  <title>Model vocabularies</title>
  <statement>The generator shall resolve, per IDE that uses named or mapped model identifiers, an effective model vocabulary: the IDE's built-in mapping — keyed by a release-neutral logical model key, by an exact source model token, or by both, whichever that IDE's selection strategy resolves against (FR-COPY-0021, FR-COPY-0022) — or — where an active profile declares a block for that target (DATA-CFG-0006) — that block, which replaces the built-in mapping entirely and exhaustively. A model token absent from the effective vocabulary shall be treated as unmapped.</statement>
  <rationale>Each IDE accepts a different model identifier format for the same underlying model.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-08-19</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: logical key `sonnet` When: normalized Then: Claude→`claude-sonnet-5`, Cursor→`claude-sonnet-5`, Copilot→`Claude Sonnet 5`.</criteria>
    <criteria>Given: exact source token `claude-5-opus-high` When: normalized Then: Claude→`claude-opus-5`, Cursor→`claude-opus-5`, Copilot→`Claude Opus 5`.</criteria>
    <criteria>Given: a `gpt-*` value When: normalized for Codex Then: a base model and optional reasoning-effort are derived.</criteria>
    <criteria>Given: an active profile declaring a block for a target When: that target's effective vocabulary is resolved Then: the profile block replaces the built-in mapping in full and any model token it does not name is treated as unmapped.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/model-maps.ts (per-target built-in vocabulary constants populated, including the previously-empty CLAUDE and CODEX maps); src/rosettify-plugins/src/spec/profiles.ts (resolveEffectiveVocabulary: a profile block replaces the built-in map in full and exhaustively, an absent token treated as unmapped). Tests: tests/unit/spec/model-maps.test.ts, tests/unit/spec/profiles.test.ts.</implementationNotes>
  <notes>Mapping values (model version strings) are content/config, expected to change over time; the mapping mechanism is the requirement, not the specific strings.</notes>
</req>

<req id="DATA-CFG-0005" type="DATA" level="System" ticketId="138" classification="technical">
  <title>Preserved-file source location</title>
  <statement>The generator shall hold a committed preserved-file source under `<preservedFilesSource>/<target>/`, where `<preservedFilesSource>` is the effective preserved-file source root — the `--pluginsSource` value, defaulting to `<source>/src/rosettify-plugins/plugins` (FR-CLI-0020) — mirroring the output-relative layout, that contains every file a target keeps but does not generate: the IDE manifest, hook templates, IDE config-folder contents, and any `.mcp.json`. Each main target's preserved files shall be sourced only from its own `<preservedFilesSource>/<target>/` location. An active profile shall reuse this same preserved tree, requiring no separate preserved source, and shall suffix the preserved manifest's name and description (DATA-CFG-0006) rather than substituting files.</statement>
  <rationale>The preserved files have no derivation from the instruction source; a committed source is the only authority for them and is what makes generation into a clean output directory possible.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-08-19</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the preserved-file source (default `<source>/src/rosettify-plugins/plugins`) When: inspected Then: `<preservedFilesSource>/<target>/` exists for each main target and holds that target's manifest, hook templates, and config-folder files at their output-relative paths.</criteria>
    <criteria>Given: a file generated from the instruction source When: inspected Then: it is absent from `<preservedFilesSource>/<target>/`.</criteria>
    <criteria>Given: an active profile When: preserved files are sourced Then: the same `<preservedFilesSource>/<target>/` tree is reused and the preserved manifest's name and description are suffixed rather than any file being replaced.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/plugins/core-antigravity/ (plugin.json at root, hooks.json.tmpl) added alongside the existing per-target preserved dirs.</implementationNotes>
  <depends>DATA-CFG-0002, DATA-CFG-0003, DATA-CFG-0006</depends>
  <notes>Main-target preserved-file source sets (grounded in the current `plugins/` tree): core-claude → `.claude-plugin/plugin.json`, `hooks/hooks.json.tmpl`; core-cursor → `.cursor-plugin/plugin.json`, `hooks/hooks.json.tmpl`, `hooks.json.tmpl` (root, standalone-form template); core-copilot → `.github/plugin/plugin.json`, `.github/plugin/hooks.json.tmpl`, `hooks/hooks.json.tmpl` (and `.github/plugin/.mcp.json` where present); core-codex → `.codex-plugin/plugin.json`, `.codex-plugin/hooks.json.tmpl`; core-antigravity → `plugin.json` (plugin root), `hooks.json.tmpl` (plugin root). These mirror the per-target preserved set: `preserved_folder` plus `preserved_files` in DATA-CFG-0002/0003, minus the items the generator renders/syncs (rendered `hooks.json`, `*.js` bundles). The `.tmpl` files are preserved source only; the generator renders each into a real file (e.g. `hooks.json`) in the output — the output never contains a `.tmpl`. Standalone preserved files are not stored here (FR-SEED-0002).</notes>
</req>

<req id="DATA-CFG-0006" type="DATA" level="System" ticketId="" classification="technical"
     source="User" priority="Must" verification="Inspection"
     status="Approved" approved_by="User" changed="2026-08-19"
     depends="DATA-CFG-0003, DATA-CFG-0004, DATA-CFG-0005"
     implementation="Implemented">
  <title>Profile descriptor</title>
  <statement>A profile descriptor shall define, as data loaded from a named profile, exactly four fields: `destinationSuffix`, a string appended to each target's `destination` — the output folder name — and never to `spec.name` (DATA-CFG-0003) or to any manifest value; `pluginNameSuffix` and `pluginDescriptionSuffix`, strings appended respectively to the preserved manifest's existing name and description (DATA-CFG-0005), globally across all targets; and `modelOverrides`, the per-target model map, a two-level map. `modelOverrides` shall be keyed at the outer level by target name, one of the seven `spec.name` values (DATA-CFG-0003), and at the inner level by that target's own vocabulary key-space (DATA-CFG-0004), which differs per target. The descriptor shall be the single source of per-profile configuration, mirroring how the release descriptor (DATA-CFG-0001) is the single source of per-release configuration. Profile shall be an axis orthogonal to release and domain: an active profile shall alter neither release selection nor domain layering. A `modelOverrides` block for `core-antigravity` shall be invalid, as that target holds no model vocabulary. Each of the four fields shall be optional: an absent suffix field shall default to the empty string, and an absent `modelOverrides` field shall mean no overrides, leaving every target its built-in vocabulary. The four names are nonetheless the complete set of fields a descriptor may carry — a descriptor declaring any other top-level field is invalid.</statement>
  <rationale>Per-profile configuration must be one descriptor, keyed the same way each target's built-in vocabulary is keyed, so a profile can replace a target's map without the generator learning bespoke per-target rules; making profile orthogonal to release and domain keeps the three axes independently composable.</rationale>
  <acceptance>
    <criteria id="DATA-CFG-0006.AC1" ears="ubiquitous" system="the generator" shall="recognize a profile descriptor providing the fields `destinationSuffix`, `pluginNameSuffix`, `pluginDescriptionSuffix`, and `modelOverrides`"/>
    <criteria id="DATA-CFG-0006.AC2" ears="ubiquitous" system="the generator" shall="read `modelOverrides` as a two-level map whose outer keys are target names drawn from the seven `spec.name` values"/>
    <criteria id="DATA-CFG-0006.AC3" ears="optional" where="the outer key is `core-claude`" system="the generator" shall="accept inner keys only from the closed set {`opus`, `sonnet`, `haiku`} — a block replaces the vocabulary in full, and family keys are what guarantee total coverage, so the exact-token tier the built-in Claude vocabulary may carry (FR-COPY-0021) is not available to a block"/>
    <criteria id="DATA-CFG-0006.AC4" ears="optional" where="the outer key is `core-cursor`, `core-copilot`, or `core-codex`" system="the generator" shall="accept inner keys that are exact source model tokens, such as `claude-sonnet-5`, `claude-opus-4-8`, or `gpt-5.5-high`"/>
    <criteria id="DATA-CFG-0006.AC5" ears="state" while="a standalone target declares no block" system="the generator" shall="apply its parent target's block, so `core-cursor-standalone` inherits `core-cursor` and `core-copilot-standalone` inherits `core-copilot`"/>
    <criteria id="DATA-CFG-0006.AC6" ears="unwanted" if="`modelOverrides` contains a block keyed `core-antigravity`" system="the generator" shall="treat the descriptor as invalid"/>
    <criteria id="DATA-CFG-0006.AC7" ears="unwanted" if="an outer key of `modelOverrides` is not one of the seven `spec.name` values" system="the generator" shall="treat the descriptor as invalid"/>
    <criteria id="DATA-CFG-0006.AC8" ears="unwanted" if="a `core-claude` block carries an inner key outside {`opus`, `sonnet`, `haiku`}" system="the generator" shall="treat the descriptor as invalid"/>
    <criteria id="DATA-CFG-0006.AC9" ears="unwanted" if="the profile descriptor carries a top-level field other than `destinationSuffix`, `pluginNameSuffix`, `pluginDescriptionSuffix`, or `modelOverrides`" system="the generator" shall="treat the descriptor as invalid"/>
    <criteria id="DATA-CFG-0006.AC10" ears="event" when="a profile descriptor declares suffix fields and no `modelOverrides` field" system="the generator" shall="accept the descriptor and give every target its built-in model vocabulary, non-exhaustively"/>
    <criteria id="DATA-CFG-0006.AC11" ears="event" when="a profile descriptor omits a suffix field" system="the generator" shall="treat that suffix as the empty string"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/profiles.ts (ProfileDescriptor with the four fields destinationSuffix/pluginNameSuffix/pluginDescriptionSuffix/modelOverrides, each optional — readSuffixField defaults an absent suffix to the empty string, an absent modelOverrides normalizes to an empty map; modelOverrides read as a two-level map keyed by target then per-target vocabulary; loadProfile validates the shape, rejects an unrecognized top-level field and a core-antigravity block); src/rosettify-plugins/profiles/lightweight.json (reference descriptor, suffix fields only). Tests: tests/unit/spec/profiles.test.ts.</implementationNotes>
  <notes>Inner key-space per target (mirrors each target's built-in vocabulary keying):

| Target | Inner key space | Example |
|---|---|---|
| core-claude | closed family set `opus`, `sonnet`, `haiku` | `opus` |
| core-cursor | exact source model tokens | `claude-sonnet-5` |
| core-copilot | exact source model tokens | `claude-opus-4-8` |
| core-codex | exact `gpt-` source tokens | `gpt-5.5-high` |
| core-cursor-standalone | as core-cursor | inherits parent block |
| core-copilot-standalone | as core-copilot | inherits parent block |
| core-antigravity | none — no vocabulary exists | block is invalid |

Reference valid profile:
```json
{
  "destinationSuffix": "-light",
  "pluginNameSuffix": "-light",
  "pluginDescriptionSuffix": " (lightweight)",
  "modelOverrides": {
    "core-claude":  { "opus": "claude-sonnet-5", "sonnet": "claude-sonnet-5" },
    "core-cursor":  { "claude-sonnet-5": "gpt-5.4", "claude-opus-4-8": "gpt-5.4" },
    "core-copilot": { "claude-opus-4-8": "Claude Sonnet 5" },
    "core-codex":   { "gpt-5.5-high": "gpt-5.4-medium" }
  }
}
```

An explicit standalone block overrides the inherited parent block. A dead inner entry (a key matching no model token anywhere in the instruction source) is ignored silently. `destinationSuffix` applies to `spec.destination` only, never `spec.name` (DATA-CFG-0003); `pluginNameSuffix` and `pluginDescriptionSuffix` append to the preserved manifest's existing name and description (DATA-CFG-0005). Fail-fast enforcement of an invalid descriptor before any output is written is governed by FR-PROF-0001, the sole owner of the abort-on-bad-descriptor outcome; the criteria here fix only what makes a descriptor well-formed.</notes>
</req>
