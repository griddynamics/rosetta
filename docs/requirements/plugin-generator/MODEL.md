# plugin-generator — Configuration Contract (DATA)

The generator is data-driven: a future release, plugin set, or IDE is added by editing descriptors, not control flow. These descriptors are the contract a re-implementation must reproduce. Field names are normative concepts, not required identifiers.

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

<req id="DATA-CFG-0002" type="DATA" level="System" ticketId="315" classification="technical">
  <title>Plugin-target descriptor</title>
  <statement>Each `PluginTarget` descriptor shall declare, as data, its `PluginSpec` — an ordered list of `SpecEntry` (`{source: glob, target: path, exclude: string[], processors: FileProcessor[]}`), an ordered `PluginProcessor` pipeline, and the descriptor fields (target name, output location and base subfolder, preserved-file seed source, `ModelVocabulary`, bootstrap manifest and inclusion flags, the building set's bootstrap flag and hook list (DATA-CFG-0007, FR-SET-0070)). Every per-IDE adaptation shall be expressed by `FileProcessor`s in `SpecEntry` pipelines (per-case model normalization, file/suffix renames, codex agent format), by the `SpecEntry` `target` (folder placement, alternate-name duplication), or by generic `PluginProcessor`s parameterized by descriptor data (reference rewriting, index generation, template rendering, post-render mirror declarations consumed by a generic `pluginMirrorFiles(from, to)`, directory creation by a generic `createFolder(path)`) — never by bespoke descriptor flags, target-/release-specific options, out-of-band passes (FR-ARCH-0004), or an identity-discriminant flag whose value set enumerates IDE/target/case identities (FR-ARCH-0005). The descriptor shall hold no bootstrap-delivery-strategy field and no per-release, per-target, or identity-discriminant behavior flag; whether that payload is delivered through hooks is FR-VAR-0070.</statement>
  <rationale>Uniform, declarative target definition lets every variant be generated the same way: one shared spec shape (FR-ARCH-0001/0002), values in the plugin-set catalog and the per-target spec builders, behavior in the two-tier processor pipelines.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the plugins produced by one run When: each is generated Then: only its descriptor differs; the generation procedure is identical.</criteria>
    <criteria>Given: any descriptor field When: inspected Then: it is a value, map, glob, path, or composed processor list — never an identity-discriminant flag enumerating IDE/target/case identities (FR-ARCH-0005).</criteria>
    <criteria>Given: a descriptor omitting an optional adaptation When: generated Then: that adaptation is skipped without error.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: PluginSpec (src/rosettify-plugins/src/types.ts) carries name (bare IDE identity), set,
  destination, preservedSource, modelVocabulary, bootstrapManifest, hookFolder, hookModules
  and bootstrap, plus specEntries and pluginProcessors; no hookEntryShape or identity-discriminant flag
  exists anywhere in the tree. The indexes field remains but every builder supplies it
  empty (dormant, not removed). The configure and templates SpecEntries are gone.</implementationNotes>
  <depends>DATA-CFG-0007</depends>
  <notes>Target-state descriptor = `PluginSpec` = descriptor fields (name, destination, baseSubfolder, preserved-file seed source, modelVocabulary, bootstrap manifest/inclusion flags, hook config) + `SpecEntry[]` + `PluginProcessor[]`. File-tier behavior lives in each `SpecEntry`'s `FileProcessor` pipeline (`fileRead`, `fileApplyOverrides`, `fileBundle`, per-vocabulary model-normalization processors, `fileRename`, `fileCodexAgentFormat`); plugin-tier behavior is `PluginProcessor`s (`pluginCleanup`, `pluginCopy`, `pluginProcessSpecEntries`, `pluginRewriteReferences`, `pluginGenerateIndexes`, `pluginEmitDistributionRoot`, `pluginRenderTemplates`, `pluginWrite`). The old Python flags `rename_folders` map to `SpecEntry` `target`s; `rename_files`/`rename_agents` to `fileRename()`; `pre_copy_folders` to an extra `SpecEntry` (FR-COPY-0033); `pre_move_files` to a relocation `SpecEntry`/`fileRename()` (FR-COPY-0034); runtime-layout moves to `SpecEntry` `target`s (FR-VAR-0030/0041). Implemented in `src/rosettify-plugins/src/spec/targets.ts`. `pluginGenerateIndexes` remains an available `PluginProcessor`, but no declared set declares an index, so no descriptor composes it (FR-GEN-0001..0004, dormant). The `configure` and `templates` `SpecEntry`s are gone: `configure/` no longer exists in the instruction source and the `templates` entry could only ever emit nothing.</notes>
</req>

<req id="DATA-CFG-0003" type="DATA" level="System" ticketId="138, 315" classification="technical">
  <title>Target inventory</title>
  <statement>The generator shall build one plugin per (set variant × IDE target) pair, taking both the IDE target inventory and the set inventory from the plugin-set configuration (FR-SET-0001, DATA-CFG-0007). The IDE target identities shall be `claude`, `cursor`, `copilot`, `codex`, `cursor-standalone`, `copilot-standalone`, `antigravity`. What an IDE target's `name` carries, and what its `destination` carries, are FR-SET-0040 and are not restated here. The number of output folders shall be derived from the configuration — IDE target count × the declared variants across all sets — and shall be fixed by no requirement, so adding a set or a variant changes the output count with no code change. The IDE target inventory shall change only when an IDE is added or removed, never when a set is.</statement>
  <rationale>Known delivery set per supported IDE and mode, multiplied by a configurable set inventory: IDE identity is a code-level concern (each target needs its own adaptation processors), while set composition is pure data, so the two are declared separately and only their product is fixed. Antigravity ships as a single combined plugin (no separate standalone target): the plugin and an in-repo extraction differ only by the presence of `plugin.json`, which the IDE ignores as an extra file, so one target serves both installation and in-repo use.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a generation run When: complete Then: the output directory contains exactly one folder per (set variant × IDE target) pair the configuration declares, and no folder for any pair it does not.</criteria>
    <criteria>Given: the IDE target inventory When: inspected Then: `antigravity` is present and no `antigravity-standalone` target exists.</criteria>
    <criteria>Given: a set declaring one variant added to the configuration When: the run completes Then: the output folder count grows by the IDE target count and no generator code changed.</criteria>
    <criteria>Given: any IDE target When: its spec is inspected Then: its `name` is the bare IDE identity (e.g. `claude`), while its `destination` is `<set-name>-<name>` plus the variant's destination suffix.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: buildSpecsForSet (src/rosettify-plugins/src/spec/targets.ts) builds one PluginSpec per
  (set, variant, target) tuple driven by the catalog-derived list from selectSets, so the output count
  follows configuration rather than a fixed number. TARGET_NAMES
  (src/rosettify-plugins/src/spec/target-names.ts) enumerates exactly the 7 identities and contains no
  antigravity-standalone; each spec keeps the bare identity in name while destination composes set, target
  and variant suffix.</implementationNotes>
  <notes>Each main IDE target's preserved config folder: `claude` `.claude-plugin`, `cursor` `.cursor-plugin`, `copilot` `.github`, `codex` `.codex-plugin`. `antigravity` has no dot-config folder — its manifest is `plugin.json` at the plugin root. The single Antigravity target covers all three Antigravity products (Antigravity, Antigravity CLI, Antigravity IDE), which all read `plugin.json`. The standalone targets hold no preserved folder of their own; they seed from their parent IDE's template (FR-SEED-0002).</notes>
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

<req id="DATA-CFG-0005" type="DATA" level="System" ticketId="138, 315" classification="technical">
  <title>Preserved-file source location</title>
  <statement>The generator shall hold a committed preserved-file source under `<preservedFilesSource>/<template>-<ide>/`, where `<preservedFilesSource>` is the effective preserved-file source root — the `--pluginsSource` value, defaulting to `<source>/src/rosettify-plugins/plugins` (FR-CLI-0020) — `<template>` is the preserved-file template the building set names (DATA-CFG-0007) and `<ide>` is the IDE target identity (DATA-CFG-0003), mirroring the output-relative layout, that contains every file a plugin keeps but does not generate: the IDE manifest, hook templates, IDE config-folder contents, and any `.mcp.json`. A template folder shall exist once per (template × main IDE target) pair, never once per plugin: several sets may name one template, so the preserved source shall not grow when a set is added that names an existing template. Each main IDE target's preserved files shall be sourced only from its own `<template>-<ide>` location. Every variant of a set shall reuse that same preserved tree, requiring no separate preserved source, and shall take the manifest name and description suffixes from the variant (FR-SET-0030) rather than substituting files. The per-set manifest `name` and `description` are supplied by the plugin-set configuration (DATA-CFG-0007), so a template's `plugin.json` carries only what every set sharing it shares.</statement>
  <rationale>The preserved files have no derivation from the instruction source; a committed source is the only authority for them and is what makes generation into a clean output directory possible. Templating that source rather than copying it per set is what keeps the count of hand-maintained folders flat as the set inventory grows — one folder per set × IDE would be dozens of near-identical trees that drift apart silently.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the preserved-file source (default `<source>/src/rosettify-plugins/plugins`) When: inspected Then: `<preservedFilesSource>/<template>-<ide>/` exists for every template a declared set names and every main IDE target, and holds that plugin's manifest, hook templates, and config-folder files at their output-relative paths.</criteria>
    <criteria>Given: a file generated from the instruction source When: inspected Then: it is absent from every `<preservedFilesSource>/<template>-<ide>/`.</criteria>
    <criteria>Given: a set variant declaring a destination suffix When: preserved files are sourced Then: the same `<template>-<ide>` tree is reused and the preserved manifest's name and description are suffixed rather than any file being replaced.</criteria>
    <criteria>Given: a new set naming the `template` template added to the configuration When: the preserved source is inspected Then: no folder was added to it.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/plugins/ holds exactly 5 preserved folders,
  template-{claude,cursor,copilot,codex,antigravity}, one per main IDE target. The preserved plugin.json
  files carry only shared fields (version, author, homepage, license, keywords) and no name or
  description, which now come from the set manifest and variant suffixes. The 7 hooks.json.tmpl files
  under these folders each carry their own emitted document's literal structure — one template per
  emitted document, its path in the preserved tree being its identity (FR-GEN-0011).</implementationNotes>
  <depends>DATA-CFG-0002, DATA-CFG-0003, DATA-CFG-0006, DATA-CFG-0007</depends>
  <notes>The preserved source holds five template folders — `template-claude`, `template-cursor`, `template-copilot`, `template-codex`, `template-antigravity` — one per main IDE target, each named by every declared set. Per-folder preserved sets (grounded in the current `plugins/` tree): `template-claude` → `.claude-plugin/plugin.json`, `hooks/hooks.json.tmpl`; `template-cursor` → `.cursor-plugin/plugin.json`, `hooks/hooks.json.tmpl`, `hooks.json.tmpl` (root, standalone-form template); `template-copilot` → `.github/plugin/plugin.json`, `.github/plugin/hooks.json.tmpl`, `hooks/hooks.json.tmpl` (and `.github/plugin/.mcp.json` where present); `template-codex` → `.codex-plugin/plugin.json`, `.codex-plugin/hooks.json.tmpl`; `template-antigravity` → `plugin.json` (plugin root), `hooks.json.tmpl` (plugin root). These mirror the per-plugin preserved set: `preserved_folder` plus `preserved_files` in DATA-CFG-0002/0003, minus the items the generator renders/syncs (rendered `hooks.json`, `*.js` bundles). The `.tmpl` files are preserved source only; the generator renders each into a real file (e.g. `hooks.json`) in the output — the output never contains a `.tmpl`. Each `hooks.json.tmpl` renders from its own literal structure, gated by the release conditional; the building set's declared bootstrap flag and hook list decide WHETHER the document is emitted and which entries the conditional admits, not what shape it takes (FR-SET-0070, FR-GEN-0011). Standalone preserved files are not stored here (FR-SEED-0002).</notes>
</req>

<req id="DATA-CFG-0006" type="DATA" level="System" ticketId="315" classification="technical"
     source="User" priority="Must" verification="Inspection"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="DATA-CFG-0003, DATA-CFG-0004"
     implementation="Implemented">
  <title>Profile descriptor</title>
  <statement>A profile descriptor shall define, as data loaded from a named profile, exactly one field: `modelOverrides`, the per-target model map, a two-level map. `modelOverrides` shall be keyed at the outer level by IDE target name, one of the `spec.name` values (DATA-CFG-0003), and at the inner level by that target's own vocabulary key-space (DATA-CFG-0004), which differs per target. Destination, plugin-name and plugin-description suffixing shall be properties of a set variant, not of a profile (DATA-CFG-0007, FR-SET-0030): a descriptor carrying `destinationSuffix`, `pluginNameSuffix` or `pluginDescriptionSuffix` is invalid. The descriptor shall be the single source of per-profile configuration, mirroring how the release descriptor (DATA-CFG-0001) is the single source of per-release configuration. Profile shall be an axis orthogonal to release and to plugin set: an active profile shall alter neither release selection nor a set's folder layering. A `modelOverrides` block for `antigravity` shall be invalid, as that target holds no model vocabulary. `modelOverrides` shall be optional: an absent field means no overrides, leaving every target its built-in vocabulary, so the empty descriptor `{}` is valid and its whole remaining effect is to make that profile's `profile-<name>-only` files match while it is active. `modelOverrides` is nonetheless the complete set of fields a descriptor may carry — a descriptor declaring any other top-level field is invalid.</statement>
  <rationale>Per-profile configuration must be one descriptor, keyed the same way each target's built-in vocabulary is keyed, so a profile can replace a target's map without the generator learning bespoke per-target rules. Suffixes leave the descriptor because one `lightweight` profile must produce `-light` for the combo set and no suffix for the split sets, which a descriptor-level suffix cannot express; keeping profile orthogonal to release and set keeps the axes independently composable.</rationale>
  <acceptance>
    <criteria id="DATA-CFG-0006.AC1" ears="ubiquitous" system="the generator" shall="recognize a profile descriptor providing the single field `modelOverrides`"/>
    <criteria id="DATA-CFG-0006.AC2" ears="ubiquitous" system="the generator" shall="read `modelOverrides` as a two-level map whose outer keys are IDE target names drawn from the `spec.name` values"/>
    <criteria id="DATA-CFG-0006.AC3" ears="optional" where="the outer key is `claude`" system="the generator" shall="accept inner keys only from the closed set {`opus`, `sonnet`, `haiku`} — a block replaces the vocabulary in full, and family keys are what guarantee total coverage, so the exact-token tier the built-in Claude vocabulary may carry (FR-COPY-0021) is not available to a block"/>
    <criteria id="DATA-CFG-0006.AC4" ears="optional" where="the outer key is `cursor`, `copilot`, or `codex`" system="the generator" shall="accept inner keys that are exact source model tokens, such as `claude-sonnet-5`, `claude-opus-4-8`, or `gpt-5.5-high`"/>
    <criteria id="DATA-CFG-0006.AC5" ears="state" while="a standalone target declares no block" system="the generator" shall="apply its parent target's block, so `cursor-standalone` inherits `cursor` and `copilot-standalone` inherits `copilot`"/>
    <criteria id="DATA-CFG-0006.AC6" ears="unwanted" if="`modelOverrides` contains a block keyed `antigravity`" system="the generator" shall="treat the descriptor as invalid"/>
    <criteria id="DATA-CFG-0006.AC7" ears="unwanted" if="an outer key of `modelOverrides` is not one of the `spec.name` values" system="the generator" shall="treat the descriptor as invalid"/>
    <criteria id="DATA-CFG-0006.AC8" ears="unwanted" if="a `claude` block carries an inner key outside {`opus`, `sonnet`, `haiku`}" system="the generator" shall="treat the descriptor as invalid"/>
    <criteria id="DATA-CFG-0006.AC9" ears="unwanted" if="the profile descriptor carries a top-level field other than `modelOverrides` — `destinationSuffix`, `pluginNameSuffix` and `pluginDescriptionSuffix` included" system="the generator" shall="treat the descriptor as invalid, naming the unrecognized field"/>
    <criteria id="DATA-CFG-0006.AC10" ears="event" when="a profile descriptor is the empty object `{}`" system="the generator" shall="accept it, give every target its built-in model vocabulary non-exhaustively, and still match that profile's `profile-<name>-only` files while it is active"/>
  </acceptance>
  <implementationNotes>Implemented: ProfileDescriptor (src/rosettify-plugins/src/spec/profiles.ts) carries only modelOverrides,
  with DESCRIPTOR_FIELDS as the closed allow-list; loadProfile rejects any other top-level field, rejects
  an antigravity block, rejects a claude block with a key outside opus/sonnet/haiku, and accepts the empty
  object. resolveEffectiveVocabulary applies STANDALONE_PARENT inheritance when a standalone declares no
  block of its own. profiles/lightweight.json is now exactly {}. Tests: tests/unit/spec/profiles.test.ts.</implementationNotes>
  <notes>Inner key-space per IDE target (mirrors each target's built-in vocabulary keying):

| IDE target | Inner key space | Example |
|---|---|---|
| claude | closed family set `opus`, `sonnet`, `haiku` | `opus` |
| cursor | exact source model tokens | `claude-sonnet-5` |
| copilot | exact source model tokens | `claude-opus-4-8` |
| codex | exact `gpt-` source tokens | `gpt-5.5-high` |
| cursor-standalone | as cursor | inherits parent block |
| copilot-standalone | as copilot | inherits parent block |
| antigravity | none — no vocabulary exists | block is invalid |

Reference valid profile:
```json
{
  "modelOverrides": {
    "claude":  { "opus": "claude-sonnet-5", "sonnet": "claude-sonnet-5" },
    "cursor":  { "claude-sonnet-5": "gpt-5.4", "claude-opus-4-8": "gpt-5.4" },
    "copilot": { "claude-opus-4-8": "Claude Sonnet 5" },
    "codex":   { "gpt-5.5-high": "gpt-5.4-medium" }
  }
}
```

`{}` is equally valid. An explicit standalone block overrides the inherited parent block. A dead inner entry (a key matching no model token anywhere in the instruction source) is ignored silently. Fail-fast enforcement of an invalid descriptor before any output is written is governed by FR-PROF-0001, the sole owner of the abort-on-bad-descriptor outcome; the criteria here fix only what makes a descriptor well-formed.</notes>
</req>

<req id="DATA-CFG-0007" type="DATA" level="System" ticketId="315" classification="technical"
     source="User" priority="Must" verification="Inspection"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="DATA-CFG-0003, DATA-CFG-0006"
     implementation="Implemented">
  <title>Plugin-set descriptor</title>
  <statement>The plugin-set configuration shall declare, as data, the IDE target inventory, the hook support-module map, and an ordered list of plugin sets. Each set descriptor shall carry: `name`, the set identity that leads its output folder name and forms its `set-<name>-only` directive token (FR-SET-0040); `folders`, the ordered non-empty list of instruction folders composing it (FR-SET-0020); `variants`, a non-empty list where each entry names the profile it builds with — a profile name or none — and its `destinationSuffix`, `manifestNameSuffix` and `manifestDescriptionSuffix` (FR-SET-0030); `template`, the preserved-file template it seeds from (DATA-CFG-0005); `manifest`, the `name` and `description` written into that set's plugin manifest; `requires`, the set names it expects to be installed alongside (FR-SET-0050); `releases`, the non-empty list of releases the set is available for; `bootstrap`, whether its hook configuration carries a session-start bootstrap block; and `hooks`, the ordered list of hook module names it ships (FR-SET-0070). A `hooks` entry is a bare module name: the event and matcher each module binds to are carried by each target's hook configuration templates and are not declared here, so one declaration serves every IDE target of the set. Only `requires` and `hooks` shall be optional, each defaulting to an empty list; `name`, `folders`, `variants`, `template`, `releases`, `bootstrap` and `manifest` shall all be required, and omitting any of them shall be invalid. Within a variant, `profile` shall default to none and the three suffixes to the empty string. A set `name` shall be unique across the whole document, and shall be a lowercase alphanumeric identifier whose segments are joined by single hyphens. The set descriptor shall declare no index and no injection index. The listed names shall be the complete set of fields a set descriptor may carry — a descriptor declaring any other top-level field is invalid. This unit fixes what makes the configuration well-formed; where it is found is FR-CLI-0034 and rejecting a malformed one is FR-SET-0010.</statement>
  <rationale>One descriptor per set, keyed the same way the release and profile descriptors are, is what makes adding a plugin a config edit rather than a code change. `folders` and `requires` are deliberately separate fields because they answer different questions — what a plugin contains versus what it expects beside it — and fusing them would silently duplicate every core document into each domain plugin. Manifest identity lives here rather than in the preserved template because templates are shared across sets, so the template cannot carry a name that distinguishes them. `hooks` names modules rather than event bindings because the same module binds to different events and matchers in different IDEs; keeping the binding in each target's own hook configuration template is what lets one set declaration serve all seven targets. The near-total absence of defaults is deliberate: a set that silently acquired a template, a release list or a bootstrap posture it did not state would ship wrong content with no build-time signal, so the loader requires each to be stated.</rationale>
  <evidence>src/rosettify-plugins/src/spec/plugin-sets.ts PluginSetDecl, SetVariant, SetManifest, PluginCatalog, SET_FIELDS, VARIANT_FIELDS, MANIFEST_FIELDS, CATALOG_FIELDS, loadPluginCatalog, readSet, readVariants, readManifest; src/rosettify-plugins/plugins.json (the shipped catalog in this shape); src/rosettify-plugins/plugins/template-&lt;ide&gt;/**/hooks.json.tmpl (the per-IDE event/matcher bindings a `hooks` module name resolves against, one template per emitted document)</evidence>
  <acceptance>
    <criteria id="DATA-CFG-0007.AC1" ears="ubiquitous" system="the generator" shall="recognize a set descriptor providing the fields `name`, `folders`, `variants`, `template`, `manifest`, `requires`, `bootstrap` and `hooks`"/>
    <criteria id="DATA-CFG-0007.AC2" ears="unwanted" if="a set descriptor omits `template`, `releases` or `bootstrap`" system="the generator" shall="treat the configuration as invalid, naming the set and the missing field"/>
    <criteria id="DATA-CFG-0007.AC3" ears="event" when="a set descriptor omits `requires` and `hooks`" system="the generator" shall="read an empty `requires` list and an empty hook list"/>
    <criteria id="DATA-CFG-0007.AC4" ears="ubiquitous" system="the generator" shall="read each `hooks` entry as a bare hook module name, such as `dangerous-actions`, resolving its event and matcher from that target's hook configuration templates rather than from the descriptor"/>
    <criteria id="DATA-CFG-0007.AC5" ears="ubiquitous" system="the generator" shall="read `manifest.name` as the set's base marketplace plugin name — `rosetta`, `core`, `workflows`, `qe`, `search`, `modernization` — independently of the output folder name, the variant's `manifestNameSuffix` producing the shipped name (so `rosetta` plus `-light` gives `rosetta-light`)"/>
    <criteria id="DATA-CFG-0007.AC6" ears="event" when="a set declares `releases: [r2]`" system="the generator" shall="build it only when release `r2` is selected"/>
    <criteria id="DATA-CFG-0007.AC7" ears="unwanted" if="two set descriptors declare the same `name`, whatever releases they name" system="the generator" shall="treat the configuration as invalid, naming the duplicated set name"/>
    <criteria id="DATA-CFG-0007.AC8" ears="unwanted" if="a set descriptor carries a top-level field the descriptor does not define, such as `indexes`" system="the generator" shall="treat the configuration as invalid"/>
    <criteria id="DATA-CFG-0007.AC9" ears="unwanted" if="a set descriptor declares an empty `folders`, an empty `releases` or an empty `variants` list" system="the generator" shall="treat the configuration as invalid"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/plugin-sets.ts defines the contract as PluginSetDecl, SetVariant, SetManifest and PluginCatalog, and enforces it in loadPluginCatalog via readSet, readVariants and readManifest against the closed allow-lists CATALOG_FIELDS, SET_FIELDS, VARIANT_FIELDS and MANIFEST_FIELDS, every violation raising PluginCatalogError before any output is written. requireString/requireStringArray/requireBoolean make template, releases, bootstrap and manifest mandatory, while requires and hooks default through ?? [] and the three variant suffixes through optionalString. readVariants additionally rejects two variants sharing a destinationSuffix. src/rosettify-plugins/plugins.json ships six sets in exactly this shape.</implementationNotes>
  <notes>Reference configuration (verified to load through `loadPluginCatalog`):
```json
{
  "targets": ["claude", "cursor", "copilot", "codex",
              "antigravity", "cursor-standalone", "copilot-standalone"],
  "hookSupportModules": { "read-once": ["read-once-reset", "read-once-shared"] },
  "sets": [
    { "name": "rosetta",
      "folders": ["core", "workflows", "qe", "search", "modernization"],
      "template": "template",
      "releases": ["r3"],
      "requires": [],
      "bootstrap": true,
      "hooks": ["dangerous-actions", "read-once", "loose-files",
                "md-file-advisory", "codemap-refresh", "lint-format-advisory"],
      "manifest": { "name": "rosetta", "description": "Rosetta - instruction set, workflows, and guardrails." },
      "variants": [
        { "profile": null,          "destinationSuffix": "",       "manifestNameSuffix": "",       "manifestDescriptionSuffix": "" },
        { "profile": "lightweight", "destinationSuffix": "-light", "manifestNameSuffix": "-light",
          "manifestDescriptionSuffix": " (lightweight: simpler workflows, smaller models)" }
      ] },
    { "name": "core",
      "folders": ["core"],
      "template": "template",
      "releases": ["r2", "r3"],
      "bootstrap": true,
      "hooks": ["dangerous-actions", "read-once", "loose-files",
                "md-file-advisory", "codemap-refresh", "lint-format-advisory"],
      "manifest": { "name": "core", "description": "Rosetta Core - foundation instruction set, rules, skills, and guardrails." },
      "variants": [{ "profile": "lightweight" }] },
    { "name": "workflows",
      "folders": ["workflows"],
      "template": "template",
      "releases": ["r3"],
      "requires": ["core"],
      "bootstrap": false,
      "manifest": { "name": "workflows", "description": "Rosetta Workflows - orchestration workflows and specialist subagents. Requires Rosetta Core." },
      "variants": [{ "profile": "lightweight" }] },
    { "name": "qe",
      "folders": ["qe"], "template": "template", "releases": ["r3"],
      "requires": ["core", "workflows"], "bootstrap": false,
      "manifest": { "name": "qe", "description": "Rosetta QE - test automation and quality-engineering workflows. Requires Rosetta Core and Workflows." },
      "variants": [{ "profile": "lightweight" }] }
  ]
}
```

`hooks` entries are subject to the effective deterministic-hooks value (FR-CLI-0012): a build with that value false emits none of them and renders only the bootstrap block where `bootstrap` is set. Support modules a declared module imports are resolved from the catalog-level `hookSupportModules` map rather than restated per set (`read-once` pulls `read-once-reset` and `read-once-shared`), per FR-HOOK-0020. Release `r2` keeps its single `core` folder and is served by the one `core` set, whose `releases` names both `r2` and `r3`; that reproduces the folder names `core-<ide>` and `core-<ide>-light` it produces today (FR-SET-0040, FR-SET-0060). A set name is declared once for the whole document — availability across releases is expressed by listing several releases on the one declaration, never by declaring the same name twice.</notes>
</req>

<req id="DATA-CFG-0008" type="DATA" level="System" ticketId="315" classification="technical"
     source="User" priority="Must" verification="Inspection"
     status="Deprecated" approved_by="isolomatov-gd" changed="2026-09-03"
     depends="DATA-CFG-0003, DATA-CFG-0007"
     implementation="Removed">
  <title>Per-target hook-layout descriptor</title>
  <statement>The shape of a target's emitted `hooks.json` shall be held as data in a per-target hook-layout table, one entry per IDE target identity (DATA-CFG-0003). Each layout shall carry four members: `entry`, a function building one entry object from a hook module name and the spec's output folder name; `bindings`, the ordered list of event-to-module bindings, each naming an `event`, an optional `matcher`, the `modules` bound there in emission order, and an optional `flat` marker; `bootstrap`, the slot the assembled session-start payload occupies, or `null` where the target takes none; and `envelope`, the function wrapping the assembled events map in that target's file shape. A `bootstrap` slot shall carry a `payload` discriminant of either `inject`, meaning write the assembled payload here when the set declares bootstrap, or `empty`, meaning always write a literal empty array and never a payload. A binding marked `flat` shall place its entries directly in the event array; an unmarked binding shall group them as a single `{ matcher, hooks: [...] }` object. The set decides WHICH hooks a plugin ships (FR-SET-0070) and the layout decides WHAT SHAPE they take, so one set declaration serves every target and no target identity is branched on in generator control flow (FR-ARCH-0005). Where a spec's layout is `null` the plugin emits no `hooks.json` at all. This unit fixes the STRUCTURE of the table only. Whether an emitted entry conforms to its IDE's documented hook schema, and the per-interpreter escaping that transport requires, is FR-HOOK-0005; assembling and serializing the document from the table is FR-GEN-0011.</statement>
  <rationale>Six near-duplicate `hooks.json.tmpl` files previously encoded each IDE's envelope, matcher grouping and command form in template text, so a new IDE meant a new template and a new set meant editing every one. Making the shape a table entry reduces both to a data edit and lets one assembler serve all seven targets. The `entry` member is a function rather than a string template because Copilot's commands embed the plugin's own output folder name and Claude's embed a runtime variable, which no static shape expresses. `payload: 'empty'` is a distinct discriminant rather than an absent slot because Copilot's standalone form requires the event key to be PRESENT and empty — omitting the key and emitting an empty array are different documents to that IDE. `flat` is per binding rather than per layout because Copilot groups its tool events but not its `preCompact`. Holding the shape in a target-keyed map satisfies FR-ARCH-0005 rather than straining it: that unit admits a value or a map as the data form, and forbids a PROCESSOR branching on identity. The layout is resolved once at composition time onto `PluginSpec.hookLayout`, so the assembler reads a value and contains no identity conditional.</rationale>
  <evidence>src/rosettify-plugins/src/spec/hook-layouts.ts HookBinding, BootstrapBinding, HookLayout, HOOK_LAYOUTS, HOOKS_PSEUDO_FOLDER, COPILOT_PLUGIN_PATH, copilotProbeBash, copilotProbePowershell; src/rosettify-plugins/src/types.ts PluginSpec.hookLayout; src/rosettify-plugins/src/plugin-processors/plugin-assemble-hooks-json.ts buildHooksDocument (the sole consumer)</evidence>
  <acceptance>
    <criteria id="DATA-CFG-0008.AC1" ears="ubiquitous" system="the generator" shall="hold exactly one layout per IDE target identity — seven in total, keyed `claude`, `codex`, `copilot`, `copilot-standalone`, `cursor`, `cursor-standalone` and `antigravity`"/>
    <criteria id="DATA-CFG-0008.AC2" ears="ubiquitous" system="each layout" shall="carry an `entry` builder, a `bindings` list, a `bootstrap` slot and an `envelope` wrapper"/>
    <criteria id="DATA-CFG-0008.AC3" ears="ubiquitous" system="the layouts for `cursor`, `cursor-standalone` and `antigravity`" shall="declare `bootstrap: null`, taking no session-start payload"/>
    <criteria id="DATA-CFG-0008.AC4" ears="ubiquitous" system="the `copilot-standalone` layout" shall="declare a bootstrap slot with `payload: 'empty'`, so its event key is always present and always an empty array"/>
    <criteria id="DATA-CFG-0008.AC5" ears="ubiquitous" system="the layouts for `claude`, `codex` and `copilot`" shall="declare a bootstrap slot with `payload: 'inject'`"/>
    <criteria id="DATA-CFG-0008.AC6" ears="event" when="a document is assembled" system="the envelope" shall="wrap the events map in that target's file shape — `{ hooks }` for `claude` and `codex`, `{ version: 1, hooks }` for both Copilot and both Cursor forms, and `{ rosetta: { enabled, PreInvocation, ... } }` for `antigravity`"/>
    <criteria id="DATA-CFG-0008.AC7" ears="optional" where="a binding is marked `flat`" system="the assembler" shall="place its entries directly in the event array rather than inside a `{ matcher, hooks: [...] }` group"/>
    <criteria id="DATA-CFG-0008.AC8" ears="ubiquitous" system="the assembler" shall="select a layout by data lookup alone, containing no branch on a target identity"/>
    <criteria id="DATA-CFG-0008.AC9" ears="optional" where="a spec's `hookLayout` is `null`" system="the generator" shall="emit no `hooks.json` for that plugin"/>
  </acceptance>
  <implementationNotes>2026-09-03 (Deprecated): the per-target hook-layout table is retired. It keyed one
  layout per bare IDE target identity — seven entries, which AC1 fixes as the whole inventory — while
  the generator emits NINE distinct hook documents: Copilot and Cursor each own both a plugin form and
  a standalone form. A structure that cannot address the document it describes can only produce one
  document per target, so the two forms collapsed into byte-identical copies; measured, the Copilot
  standalone form went from 60 bytes to 24443, an exact copy of the plugin form, and the Cursor root
  document took plugin-form addressing where standalone-form addressing was required. The table's three
  special cases — `bootstrap: null`, `payload: 'empty'`, and the per-binding `flat` marker — were each
  a symptom of the same misfit. Hook document structure returns to one literal `hooks.json.tmpl` file
  per emitted document, where the file's path in the preserved template tree is its identity and no
  lookup is needed to route it (FR-GEN-0011, FR-VAR-0071). The JSON-validity property this table was
  adopted for is provided instead by post-render validation (FR-GEN-0011), which is strictly stronger:
  it also covers a malformed raw bootstrap injection, which serializing a built object cannot detect.
  Which hook modules a target's templates invoke remains generator data, because it decides which
  bundles ship rather than what any document looks like; that is FR-SET-0070 and FR-HOOK-0020, not this
  unit. Record kept rather than deleted because FR-VAR-0070, FR-HOOK-0005, FR-GEN-0010, FR-GEN-0011 and
  FR-SET-0070 referenced it; those references are redirected to FR-GEN-0011 and FR-VAR-0071 in the same
  pass. Implementation is `ToBeRemoved` rather than `Removed` because the code carrying the table —
  src/rosettify-plugins/src/spec/hook-layouts.ts, PluginSpec.hookLayout and
  plugin-assemble-hooks-json.ts — is still present at the time this record was written; it flips to
  `Removed` when that deletion lands. UPDATE 2026-09-03: it has. PluginSpec.hookLayout,
  plugin-assemble-hooks-json.ts and spec/hook-layouts.ts are all deleted, and HOOKS_PSEUDO_FOLDER — the
  one symbol from that module worth keeping, since it names a pseudo-folder rather than a document
  shape — is relocated to src/rosettify-plugins/src/spec/hooks.ts. No HOOK_LAYOUTS reference remains in
  the source tree.</implementationNotes>
</req>
