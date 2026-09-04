# plugin-generator — FR: Target Architecture (VFS + Two-Tier Processor Pipeline)

Architecture requirements: the configuration-driven generation model — uniform spec contract, immutable flat VFS, filename directives, and the **two-tier** pure processor pipeline. A `FileProcessor` transforms one `FileProcessingFrame`; a `PluginProcessor` transforms the whole-plugin `PluginProcessingFrame` (which holds all of the target's `FileProcessingFrame`s), giving cross-file processors a whole-plugin view without recomputation or barriers. Naming: types are PascalCase; processor factory functions are camelCase and carry a `file`/`plugin` tier prefix. Per-case variation is expressed by composition — case-specific processors in specific specs plus shared low-level helpers — never by branching on IDE identity or an identity-discriminant flag (FR-ARCH-0004, FR-ARCH-0005). Terms: see `GLOSSARY.md`.

## Specification contract

<req id="FR-ARCH-0001" type="FR" level="System" ticketId="315" classification="technical">
  <title>Uniform spec contract, values externalized</title>
  <statement>The generator shall define one specification contract used identically for every target — a `PluginSpec` — and shall store the concrete per-target values in a separate data module (`plugin-specs.ts`).</statement>
  <rationale>One contract + externalized data keeps every target generated the same way and additions data-only.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: every IDE target When: inspected Then: each is described by a single named spec type (one shared `PluginSpec` interface) of identical shape, differing only in values held in `plugin-specs.ts`.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: PluginSpec (src/rosettify-plugins/src/types.ts) is the single shared contract every target
  builder returns, and the per-target values are externalized as data - src/rosettify-plugins/plugins.json
  for the set/target catalog, loaded by loadPluginCatalog (src/rosettify-plugins/src/spec/plugin-sets.ts),
  plus buildSpecsForSet and TARGET_BUILDERS in src/rosettify-plugins/src/spec/targets.ts. NOTE: the text
  names a module plugin-specs.ts that does not exist anywhere in the tree; the externalized data lives in
  plugins.json and spec/targets.ts instead. Naming drift only, no behavioural gap.</implementationNotes>
  <depends>FR-CLI-0040, DATA-CFG-0002</depends>
</req>

<req id="FR-ARCH-0002" type="FR" level="System" ticketId="" classification="technical">
  <title>SpecEntry and PluginSpec shape</title>
  <statement>Each `SpecEntry` shall declare `{source: glob, target: path, exclude: string[], processors: FileProcessor[]}` — a VFS-relative source glob, a target folder/path, a list of VFS paths to exclude from emission, and an ordered `FileProcessor` pipeline. A `PluginTarget`'s `PluginSpec` shall hold an ordered list of `SpecEntry`s, an ordered `PluginProcessor` pipeline, and the per-target descriptor values (identity, output location and base subfolder, preserved-file seed source, model vocabulary, bootstrap manifest, hook configuration, and index and injection declarations). A file's destination folder is the `SpecEntry` `target` (e.g. `workflows`→`commands`); a filename/suffix change is `fileRename()` within that entry's processors; a source file that must not ship is named in `exclude` (no source rename — the source files remain unchanged for MCP and instruction references). Per-case file behavior (e.g. model normalization, hook entry-shape emission) is selected by which `FileProcessor`s a `SpecEntry`/`PluginSpec` composes, not by an identity-discriminant field on the spec (FR-ARCH-0005).</statement>
  <rationale>Processing is expressed as source→target mappings (folder placement) with an explicit per-file processor chain, while whole-plugin steps and descriptor data live on the `PluginSpec`. `exclude` is data on the entry, so each set folder can own its own omissions and no source file has to be renamed.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-11</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a `SpecEntry` When: read Then: it provides `{source: glob, target: path, exclude: string[], processors: FileProcessor[]}`.</criteria>
    <criteria>Given: a VFS path listed in `exclude` When: the entry is processed Then: no frame is created for it and it is not emitted.</criteria>
    <criteria>Given: a `PluginSpec` When: read Then: it provides `specEntries: SpecEntry[]`, `processors: PluginProcessor[]`, and the descriptor fields.</criteria>
    <criteria>Given: a `workflows`→`commands` move When: expressed Then: it is a `SpecEntry` with `target: "commands"`; a `.md`→`.mdc` change is `fileRename()` in that entry.</criteria>
    <criteria>Given: per-case file behavior When: a `PluginSpec` is read Then: it is carried by the case-specific `FileProcessor`s composed into the relevant `SpecEntry` pipeline, not by an identity-discriminant descriptor field (FR-ARCH-0005).</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/types.ts (PluginSpec shape); src/rosettify-plugins/src/spec/targets.ts (per-vocabulary FileProcessors wired per SpecEntry). Identity-discriminant fields `hookEntryShape` and `ModelVocabulary.kind` removed.</implementationNotes>
  <depends>FR-ARCH-0001</depends>
</req>

<req id="FR-ARCH-0003" type="FR" level="System" ticketId="" classification="technical">
  <title>Precise, specific naming with tier convention</title>
  <statement>The re-implementation shall give every domain concept a precise, specific named type — not only files — and shall avoid bare generic words (e.g. "item", "entry", "value", "thing", "data", "spec", "frame") as type or identifier names. Types shall be PascalCase (`FileProcessor`, `PluginProcessor`, `FileProcessingFrame`, `PluginProcessingFrame`, `PluginSpec`, `SpecEntry`, `VirtualFile`, `SourceFile`, `ModelVocabulary`, …); processor factory functions shall be camelCase and carry a `file`/`plugin` tier prefix (`fileRename`, `fileApplyOverrides`, `pluginRewriteReferences`, `pluginGenerateIndexes`).</statement>
  <rationale>Unambiguous, self-documenting code; the tier prefix makes a processor's scope (one file vs the whole plugin) visible at the call site.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the type definitions When: inspected Then: each glossary concept has a correspondingly named PascalCase type.</criteria>
    <criteria>Given: any processor factory When: inspected Then: it is camelCase with a `file` or `plugin` tier prefix indicating its scope.</criteria>
    <criteria>Given: any identifier When: inspected Then: it names a specific concept, not a generic placeholder.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0004" type="FR" level="System" ticketId="" classification="technical">
  <title>Processors are universal and reusable</title>
  <statement>Every `FileProcessor` and `PluginProcessor` shall be a universal, reusable unit of work: it shall encode no specific target, IDE, release, folder, or filename, and all specificity shall be supplied to it as data (glob, target path, path pair, vocabulary, declaration) at composition time. A processor that copies a file shall be a general `pluginCopyFiles(source, target)` / `pluginMirrorFiles(from, to)`, never a `copilotCopyHooks()`; a processor that creates a directory shall be a general `createFolder(path)`, never a per-target/per-release flag; reference rewriting shall consume the resolved renames already recorded on the frames (FR-ARCH-0049), never re-derive them from per-target rules. No processor name, branch, or constant shall name a concrete target (`core-cursor`), release (`r2`/`r3`), folder (`rules`/`workflows`), or instruction filename. Supplying specificity "as data" excludes an identity-discriminant flag — a descriptor value whose value set enumerates IDE/target/case identities (e.g. `hookEntryShape`, a `ModelVocabulary` `kind`) or that is otherwise derived from identity; such a flag is identity relabeled, and branching on it is prohibited (FR-ARCH-0005).</statement>
  <rationale>A processor is a small, composable unit; correctness and maintainability come from composing a fixed catalog of generic processors over per-target data, not from growing target-aware variants or option flags. Naming or branching on a concrete target/release/folder couples the engine to content and defeats the data-driven design (NFR-0006, DATA-CFG-0002).</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-11</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: any processor When: inspected Then: it contains no literal target name, release name, folder name, or instruction filename; all such values arrive as data.</criteria>
    <criteria>Given: a need to copy or mirror a file When: expressed Then: it is a general copy/mirror processor parameterized by source and target, reusable by any target.</criteria>
    <criteria>Given: a need to create a directory When: expressed Then: it is a general `createFolder(path)` processor, not a per-target/per-release flag.</criteria>
    <criteria>Given: the processor catalog When: extended Then: new behavior is a new generic processor or new data, never a target-specific branch inside an existing one.</criteria>
    <criteria>Given: a per-IDE adaptation supplied "as data" When: inspected Then: it is a value, a map, or a composed case-specific processor — never an identity-discriminant flag branched on at runtime (FR-ARCH-0005).</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/types.ts (fields removed); src/rosettify-plugins/src/spec/model-maps.ts (kind removed from 4 vocabulary constants); src/rosettify-plugins/src/spec/targets.ts (per-vocabulary processors + per-IDE assemblers composed per spec).</implementationNotes>
  <depends>FR-ARCH-0003, FR-ARCH-0035, FR-ARCH-0049, NFR-0006</depends>
</req>

<req id="FR-ARCH-0005" type="FR" level="System" ticketId="" classification="technical">
  <title>No identity branching or identity-discriminant flags; per-case variation by composition</title>
  <statement>No `FileProcessor` or `PluginProcessor` shall branch on a `PluginTarget`'s IDE/target identity (Claude, Cursor, Copilot, Codex, or any specific target), and none shall branch on an identity-discriminant flag — a `PluginSpec`/descriptor value whose value set enumerates IDE/target/case identities (e.g. `hookEntryShape`, a `ModelVocabulary` `kind`) or that is otherwise derived from identity. Any branching a processor performs shall rest only on a genuine behavior flag that names a capability or outcome, never on identity. Per-case variation shall instead be expressed by composition: (a) each processor shall perform one small unit of work; (b) behavior that differs by case shall be a separate, case-specific processor placed only in the pipeline(s) of the `PluginSpec`(s) that require it, so the applicable case is selected by which processor the spec composes — not by a runtime branch; (c) logic shared across case-specific processors shall live in low-level reusable functions that each such processor composes, never duplicated and never routed through a shared identity-dispatching processor; and (d) behavior that applies only to specific paths shall be scoped by a `SpecEntry` source glob and that entry's processors (FR-ARCH-0002), never by a path test inside a shared processor.</statement>
  <rationale>FR-ARCH-0004's "all specificity as data" is met in spirit only when the data is a value, a map, or a composed case-specific processor; re-encoding identity as an enum and switching on it reintroduces the exact target-coupling FR-ARCH-0004 and NFR-0006 remove — an identity-discriminant flag is the target name relabeled. Composition keeps the processor catalog generic and content-agnostic while per-case behavior lives where the case is declared (its `PluginSpec`), and shared low-level functions keep that per-case code DRY without a dispatcher.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-11</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: any `FileProcessor` or `PluginProcessor` When: inspected Then: it contains no conditional on a target/IDE identity and no conditional on an identity-discriminant flag (e.g. `hookEntryShape`, `ModelVocabulary.kind`).</criteria>
    <criteria>Given: two targets that need different per-case behavior (e.g. hook entry shape, model normalization) When: their pipelines are inspected Then: each `PluginSpec` composes its own case-specific processor for that behavior and no single shared processor selects between the cases.</criteria>
    <criteria>Given: logic common to several case-specific processors When: inspected Then: it is a shared low-level function composed by each, not duplicated and not reached through an identity switch.</criteria>
    <criteria>Given: a behavior limited to specific paths When: expressed Then: it is a `SpecEntry` with a source glob plus that entry's processors, not a path branch inside a shared processor.</criteria>
    <criteria>Given: a new IDE/target When: added Then: it is realized by new descriptor data and/or new case-specific processors composed into its spec, with no edit to any shared processor's control flow.</criteria>
  </acceptance>
  <depends>FR-ARCH-0002, FR-ARCH-0003, FR-ARCH-0004, NFR-0006</depends>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/types.ts (hookEntryShape, ModelVocabulary.kind removed); src/rosettify-plugins/src/spec/model-maps.ts (kind removed); src/rosettify-plugins/src/file-processors/file-normalize-models.ts (switch dispatcher deleted, 4 helpers exported); src/rosettify-plugins/src/file-processors/file-normalize-{claude,cursor,copilot,codex}-models.ts (new per-vocabulary processors); src/rosettify-plugins/src/bootstrap/payload.ts (switch deleted, callback-driven assembleBootstrapPayload, 4 entry builders exported); src/rosettify-plugins/src/plugin-processors/plugin-assemble-{claude,cursor,copilot,codex}-bootstrap.ts (new per-IDE assemblers); src/rosettify-plugins/src/plugin-processors/plugin-assemble-bootstrap.ts (deleted).</implementationNotes>
  <notes>All 5 violation sites eliminated (C1–C4): fileNormalizeModels switch(vocabulary.kind), buildEntryForIde switch(shape), buildPluginRootEntry switch(shape), bootstrap_hooks_${shape} dynamic key, hookEntryShape+ModelVocabulary.kind identity-discriminant fields. tsc clean, 410 tests pass, r2/r3 parity verified.</notes>
</req>

## Virtual File System (VFS)

<req id="FR-ARCH-0010" type="FR" level="System" ticketId="" classification="technical">
  <title>Flat VFS model</title>
  <statement>The generator shall build a flat virtual file system as an ordered list of `VirtualFile`s, each `VirtualFile` having a VFS path and an ordered collection of `SourceFile`s, where each `SourceFile` carries its absolute origin path, a frontmatter slot, an order key, and a conditions set.</statement>
  <rationale>The VFS is the single intermediate model the processors operate on; precise types (`VirtualFile`, `SourceFile`) replace the ambiguous word "file".</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the source structure When: the VFS is built Then: each `VirtualFile` has shape `{path, sourceFiles:[{origin, frontmatter, order, conditions}]}`.</criteria>
    <criteria>Given: two source files mapping to the same VFS path When: built Then: both appear as `SourceFile`s in that `VirtualFile`'s collection in order.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0011" type="FR" level="System" ticketId="" classification="technical">
  <title>VFS built from structure and filename directives only</title>
  <statement>The generator shall build the VFS from filesystem structure and filename-encoded directives only, without reading file contents.</statement>
  <rationale>Content reads are confined to the `fileRead()` processor (FR-ARCH-0033); directives live in filenames, so VFS assembly needs no content.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: VFS assembly When: it runs Then: no file body is opened; only names, paths, and directives are used.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0033</depends>
</req>

<req id="FR-ARCH-0012" type="FR" level="System" ticketId="" classification="technical">
  <title>Sorted, ordered VFS</title>
  <statement>The generator shall present every VFS array sorted and ordered, with each `VirtualFile`'s `SourceFile`s ordered by their order key.</statement>
  <rationale>Deterministic, reproducible processing.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a built VFS When: inspected Then: the `VirtualFile`s and each `VirtualFile`'s `SourceFile` collection are in stable sorted order.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>NFR-0002</depends>
</req>

<req id="FR-ARCH-0013" type="FR" level="System" ticketId="" classification="technical">
  <title>Immutable VFS after render</title>
  <statement>Once built, the VFS shall be treated as immutable; processors shall operate on `ProcessingFrame`s (FR-ARCH-0030, FR-ARCH-0039) and shall not alter the VFS itself.</statement>
  <rationale>A frozen source of truth prevents cross-target contamination and order-of-execution defects.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a built VFS When: a processor runs Then: any attempt to mutate the shared VFS is prevented or has no effect on it.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0014</depends>
</req>

<req id="FR-ARCH-0014" type="FR" level="System" ticketId="" classification="technical">
  <title>Immutability with structural sharing</title>
  <statement>No processor at either tier shall mutate its input frame. A processor shall return its input unchanged when it changes nothing, or a new frame that carries the changed values and shares references to all unchanged sub-objects (copy-on-write / structural sharing) rather than deep-copying. This applies to `FileProcessor`→`FileProcessingFrame` (share unchanged fields) and `PluginProcessor`→`PluginProcessingFrame` (share the unchanged `FileProcessingFrame`s and their fields).</statement>
  <rationale>Purity makes the pipeline predictable; structural sharing keeps memory bounded by reusing the (large) unchanged content instead of cloning it on every stage.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any processor When: it runs Then: its input frame is unchanged (identity and field values) after the call.</criteria>
    <criteria>Given: a processor that changes one field When: it returns Then: the result shares the same object references for every unchanged sub-object and holds new objects only for what changed.</criteria>
    <criteria>Given: a processor that changes nothing When: it returns Then: it returns the very same input frame instance.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Filename directives

<req id="FR-ARCH-0020" type="FR" level="System" ticketId="315" classification="technical">
  <title>Directive-bearing filenames</title>
  <statement>The generator shall recognize a `FilenameDirective` in a source filename of the form `name~token[~token...]~.ext` — tokens separated by tildes, opened by a tilde after the base stem and closed by a trailing tilde before the extension; the closing fence contributes no token — and shall map the `SourceFile` to the VFS path `name.ext` (the `FilenameDirective` removed). Every selector token shall be namespaced by its own prefix — `target-<id>-only`, `ide-<family>-only`, `set-<id>-only`, `profile-<name>-only` — so no selector kind can be read as another.</statement>
  <rationale>Per-file behavior is declared in the filename; the output name is the clean base name.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `bootstrap-core-policy~1a~target-claude-only~overwrite~.md` When: mapped Then: VFS path is `rules/bootstrap-core-policy.md` with order `1a` and conditions `{target-claude-only, overwrite}`.</criteria>
    <criteria>Given: a filename with no tilde-fenced directive segment When: mapped Then: it maps to its plain name with default order and no conditions.</criteria>
    <criteria>Given: `bootstrap-guardrails~overwrite~.md` When: mapped Then: the clean name is `bootstrap-guardrails.md` and conditions are `{overwrite}`; the closing tilde fence contributes no token.</criteria>
    <criteria>Given: `bootstrap-core-policy~target-claude-only~overwrite~.md` When: mapped Then: conditions are `{target-claude-only, overwrite}`; a `target-<id>-only` token compares its `<id>` against the target `name`, whose values are `claude`, `cursor`, `copilot`, `codex`, `cursor-standalone`, `copilot-standalone`, `antigravity` (so the correct form is `target-claude-only`, not `claude-only` and not `core-claude-only`).</criteria>
    <criteria>Given: `coding-flow~profile-lightweight-only~overwrite~.md` When: mapped Then: the clean name is `coding-flow.md` and conditions are `{profile-lightweight-only, overwrite}`; the profile token's selection semantics are governed by FR-PROF-0030.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: the tilde grammar, the four namespaced token families (target-<id>-only,
  ide-<family>-only, set-<id>-only, profile-<name>-only) and clean-name stripping are all implemented in
  parseDirectives (src/rosettify-plugins/src/vfs/directives.ts). The OrderToken in the first criterion did
  NOT ship: parseDirectives throws 'Unknown filename directive "1a"' on a ~1a~ token, ParsedFilename
  carries no order field, and VFS ordering instead comes from the layer array index set in
  src/rosettify-plugins/src/vfs/build-vfs.ts, unrelated to any filename token. Either drop the order-token
  grammar from this unit or implement it.</implementationNotes>
</req>

<req id="FR-ARCH-0021" type="FR" level="System" ticketId="315" classification="technical">
  <title>Directive grammar and validation</title>
  <statement>The generator shall parse a `FilenameDirective`, whose form FR-ARCH-0020 defines, as an ordered token list where an optional `OrderToken`, if present, appears first and the remaining `DirectiveToken`s appear in any order; it shall reject the `SourceFile` with an error if any `DirectiveToken` is unknown or if any appears more than once. A token lacking one of the recognized namespace prefixes is unknown, whatever else it resembles.</statement>
  <rationale>Strict validation prevents silent misconfiguration.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `policy~1a~overwrite~target-claude-only~.md` When: parsed Then: it is accepted.</criteria>
    <criteria>Given: a duplicate token or an unknown token When: parsed Then: it errors naming the file and token.</criteria>
    <criteria>Given: an order token not in first position When: parsed Then: it errors.</criteria>
    <criteria>Given: `bootstrap-guardrails~overwrite~.md` When: parsed Then: the token set is `{overwrite}` and the closing tilde fence contributes no token.</criteria>
    <criteria>Given: `bootstrap-core-policy~target-claude-only~overwrite~.md` When: parsed Then: the token set is `{target-claude-only, overwrite}`; the `target-<id>-only` token compares its `<id>` against the target `name` (e.g. `claude`), while `ide-claude-only` matches every target of the Claude family (FR-ARCH-0023) and a bare `claude-only` carries no namespace prefix and is rejected.</criteria>
    <criteria>Given: `coding-flow~profile-lightweight-only~overwrite~.md` When: parsed Then: the token set is `{profile-lightweight-only, overwrite}`; the profile token's selection semantics are governed by FR-PROF-0030.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: token-set derivation for the known directives matches the spec exactly. Two criteria fail.
  The OrderToken grammar does not exist at all, so the order-token-first acceptance and the
  order-token-misplacement rejection are both unimplementable as written (see FR-ARCH-0020).
  Duplicate-token rejection is also absent: parseDirectives (src/rosettify-plugins/src/vfs/directives.ts)
  collects conditions into a Set, so a doubled token is silently de-duplicated instead of raising the
  error this unit requires; no duplicate check exists in the parser.</implementationNotes>
</req>

<req id="FR-ARCH-0022" type="FR" level="System" ticketId="" classification="technical">
  <title>OrderToken semantics</title>
  <statement>The generator shall treat the `OrderToken` as an opaque sort key and order a `VirtualFile`'s `SourceFile`s by it as a filesystem/IDE would sort the equivalent name (WYSIWYG lexicographic), defaulting to the plain filename order when absent.</statement>
  <rationale>Authors control bundling order by what they literally see in the name.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: files with order `1a`, `2a`, `10a` When: ordered Then: ordering follows lexicographic name sort (`10a` before `2a`), matching the filesystem.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes>NotStarted: `SourceFile.order` is populated in src/rosettify-plugins/src/vfs/build-vfs.ts as the layer array index (`order: ${i}`), not from a filename token, and no code reads it. No filename order token is parsed, consumed, or tested — no `OrderToken` reference exists in src or tests. Current ordering comes from the layer order plus the stable lexicographic filename sort in src/rosettify-plugins/src/vfs/source-resolver.ts, which is exactly this requirement's own documented fallback ("plain filename order when absent"); present output is therefore correct for every current input, since no source file uses an order token.</implementationNotes>
</req>

<req id="FR-ARCH-0023" type="FR" level="System" ticketId="315" classification="technical">
  <title>TargetOnlyToken and IdeOnlyToken scoping</title>
  <statement>The generator shall recognize two distinct IDE-scoping token kinds and shall not treat either as the other. Where a `SourceFile` declares a `TargetOnlyToken` (`target-<id>-only`), it shall include that `SourceFile` only when generating the `PluginTarget` whose `name` equals `<id>` exactly. Where a `SourceFile` declares an `IdeOnlyToken` (`ide-<family>-only`), it shall include that `SourceFile` for every `PluginTarget` of that IDE family, families being derived from the target names by stripping any `-standalone` suffix so no second list is maintained. Neither kind shall be affected by which plugin set is building; set scoping is a separate token kind (FR-ARCH-0025). A `SourceFile` declaring several scoping tokens participates where any one of them matches.</statement>
  <rationale>Overloading one token kind with both an exact name and a family key made the two indistinguishable by shape, so a typo in either fell through to the other's matching rule and silently dropped the document. Explicit prefixes make the intended reach readable in the filename and make an unrecognized token a hard failure (FR-ARCH-0060). Deriving families from the target names keeps adding an IDE a one-place change.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `ide-copilot-only` When: generating Then: the file participates for `copilot` and `copilot-standalone` only.</criteria>
    <criteria>Given: `target-copilot-standalone-only` When: generating Then: the file participates for that exact target only.</criteria>
    <criteria>Given: `target-copilot-only` When: generating Then: the file participates for `copilot` alone and NOT for `copilot-standalone`.</criteria>
    <criteria>Given: a `PluginTarget` not matched When: generating Then: the `SourceFile` is absent from that `PluginTarget`'s VFS contribution.</criteria>
    <criteria>Given: `ide-claude-only` and two plugin sets building for `claude` When: generating Then: the file participates in both sets, since an IDE token carries no set scoping.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: matchesTarget (src/rosettify-plugins/src/vfs/directives.ts) separates the exact target
  token, matched against the bare PluginSpec.name, from ide-<family>-only, resolved through
  TARGET_FAMILIES/TARGET_FAMILY_KEYS in src/rosettify-plugins/src/spec/target-names.ts by stripping the
  -standalone suffix. The ^core- strip is gone from family derivation. Verified by direct execution:
  ide-copilot-only matches copilot and copilot-standalone but not claude; target-copilot-only matches
  copilot alone; an IDE token is unaffected by which set is building.</implementationNotes>
</req>

<req id="FR-ARCH-0024" type="FR" level="System" ticketId="" classification="technical">
  <title>OverwriteToken condition</title>
  <statement>Where a `SourceFile` declares the `OverwriteToken` (`overwrite`), the generator shall, during override application, render all earlier-ordered `SourceFile`s for that `VirtualFile` irrelevant so only the overwriting `SourceFile` and later ones remain.</statement>
  <rationale>Lets a target- or domain-specific file replace accumulated content for a path.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a path with files ordered A, B(overwrite), C When: overrides applied Then: A is removed; B and C remain in order.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0025" type="FR" level="System"
     ticketId="315" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="isolomatov-gd" changed="2026-09-01"
     depends="FR-ARCH-0020, FR-ARCH-0021, FR-ARCH-0023, FR-SET-0001"
     implementation="Implemented">
  <title>SetOnlyToken filename directive</title>
  <statement>The FilenameDirective grammar shall recognize a namespaced token kind `set-<id>-only`,
  distinct from `target-<id>-only`, `ide-<family>-only` and `profile-<name>-only`. A `SourceFile`
  carrying `set-<id>-only` shall be included only while the plugin set whose id is `<id>` is being
  built, and shall be excluded from every other set regardless of IDE target or active profile. Set
  filtering shall occur in the same pipeline step as target and profile filtering, before overwrite
  truncation, so an `overwrite` token does not bypass set exclusion. The `<id>` shall be validated by
  shape only — a non-empty name — and shall not be resolved against the declared sets, so VFS parsing
  stays independent of the plugin-set configuration.</statement>
  <rationale>Plugin identity is two-dimensional once one run builds several sets, and the existing
  tokens address only the IDE dimension: without a set-scoped kind, a document meant for one set has
  no way to say so except by living in that set's folder, which forbids a shared document that varies
  by set. Shape-only validation mirrors `profile-<name>-only` for the same reason — resolving the id
  would make filename parsing depend on the configuration file, and would reject a valid
  `--domain`-filtered run that legitimately builds none of the sets a file names.</rationale>
  <evidence>src/rosettify-plugins/src/vfs/directives.ts matchesTarget and matchesProfile (the per-kind filters this kind joins); src/rosettify-plugins/src/file-processors/file-apply-overrides.ts fileApplyOverrides (target and profile filters precede overwrite truncation)</evidence>
  <acceptance>
    <criteria id="FR-ARCH-0025.AC1" ears="state" while="the `qe` set is being built" system="the generator" shall="include `policy~set-qe-only~.md` at VFS path `rules/policy.md`"/>
    <criteria id="FR-ARCH-0025.AC2" ears="unwanted" if="a set other than `qe` is being built" system="the generator" shall="exclude every file carrying `set-qe-only`, whatever the IDE target or active profile"/>
    <criteria id="FR-ARCH-0025.AC3" ears="ubiquitous" system="the generator" shall="treat `set-<id>-only` as a token kind distinct from `target-<id>-only`, `ide-<family>-only` and `profile-<name>-only`"/>
    <criteria id="FR-ARCH-0025.AC4" ears="event" when="a file carries both `set-<id>-only` and `overwrite` and that set is not being built" system="the generator" shall="exclude the file before overwrite truncation, so it does not supersede the base document"/>
    <criteria id="FR-ARCH-0025.AC5" ears="unwanted" if="the token is `set-only`, carrying an empty id" system="the generator" shall="reject the filename as an unrecognized directive (FR-ARCH-0060)"/>
    <criteria id="FR-ARCH-0025.AC6" ears="ubiquitous" system="the generator" shall="accept `set-<id>-only` without consulting the plugin-set configuration, so a set name naming no declared set parses successfully and simply matches nothing"/>
  </acceptance>
  <implementationNotes>Implemented: set-<id>-only is a distinct namespace in KNOWN_DIRECTIVES/SET_ONLY_PATTERN and is matched
  by the set- branch of matchesTarget against the building set
  (src/rosettify-plugins/src/vfs/directives.ts). Validation is shape-only, so an unknown set name parses
  without a config lookup while a bare set-only is rejected.
  src/rosettify-plugins/src/file-processors/file-apply-overrides.ts runs the matchesTarget/matchesProfile
  filter strictly before overwrite truncation, so a set-scoped exclusion cannot be bypassed by an
  overwrite directive.</implementationNotes>
  <notes></notes>
</req>

## Processing model: frames and tiers

<req id="FR-ARCH-0030" type="FR" level="System" ticketId="" classification="technical">
  <title>FileProcessingFrame</title>
  <statement>The generator shall pass through each `FileProcessor` a `FileProcessingFrame` carrying the source VFS path, the target plugin-relative path, a binary flag, `target_contents`, and `source` — the working `SourceFile` collection (a structurally-shared copy of the originating `VirtualFile`'s `SourceFile`s). The `VirtualFile` itself remains immutable; the `FileProcessingFrame` is the per-file working object.</statement>
  <rationale>A uniform, distinctly-named `FileProcessingFrame` lets `FileProcessor`s compose as pipes without touching the frozen `VirtualFile`.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: any `FileProcessor` When: invoked Then: it receives a `FileProcessingFrame` `{sourcePath, target, isBinary, target_contents, source}` where `source` is a structurally-shared copy of the `VirtualFile`'s `SourceFile` collection.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0039" type="FR" level="System" ticketId="" classification="technical">
  <title>PluginProcessingFrame</title>
  <statement>The generator shall pass through each `PluginProcessor` a `PluginProcessingFrame` carrying a reference to the target's `PluginSpec`, a reference to the immutable VFS, `frames` — the ordered collection of the target's `FileProcessingFrame`s — and `templateContext` — the accumulating render context (the release variables plus the assembled bootstrap-payload placeholder key-values) that `pluginAssembleBootstrap()` (FR-ARCH-0055) populates and `pluginRenderTemplates()` (FR-ARCH-0048) consumes. A `PluginProcessor` may read across all `frames` (e.g. to look up every file's final target path), and shall return a new `PluginProcessingFrame` that shares the unchanged `frames`/`templateContext`.</statement>
  <rationale>The whole-plugin frame gives cross-file processors (`pluginRewriteReferences`, `pluginGenerateIndexes`, `pluginEmitDistributionRoot`) the visibility they need by reading already-produced per-file results — no precomputed map, no barrier, no duplicated rename logic. `templateContext` is where the bootstrap placeholders produced by one plugin processor are carried forward to the template-rendering one, consistent with the pure, frame-threading model.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: any `PluginProcessor` When: invoked Then: it receives a `PluginProcessingFrame` `{spec, vfs, frames: FileProcessingFrame[]}`.</criteria>
    <criteria>Given: `pluginRewriteReferences` When: it runs Then: it derives the `{sourcePath → targetPath}` lookup by reading `frames`, not by re-applying rename rules.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0030</depends>
</req>

<req id="FR-ARCH-0031" type="FR" level="System" ticketId="" classification="technical">
  <title>Processor purity (both tiers)</title>
  <statement>A `FileProcessor` shall not modify its input `FileProcessingFrame`, and a `PluginProcessor` shall not modify its input `PluginProcessingFrame`; each shall return the input unchanged or a new frame per the structural-sharing rule (FR-ARCH-0014).</statement>
  <rationale>Purity makes the two-tier pipeline predictable and the VFS safe.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a processor at either tier When: it runs Then: the input frame is unchanged after the call.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0014</depends>
</req>

<req id="FR-ARCH-0032" type="FR" level="System" ticketId="" classification="technical">
  <title>Processing order (two tiers)</title>
  <statement>The generator shall process `PluginTarget`s one at a time. For each target it shall run that target's `PluginProcessor` pipeline in declared order. The `pluginProcessSpecEntries()` processor shall, in turn, process the target's `SpecEntry`s in declared order, the source files within each entry one at a time, and the entry's `FileProcessor`s in declared order.</statement>
  <rationale>Deterministic, debuggable execution; uniform across targets, with a clear nesting of plugin-tier and file-tier order.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a run When: traced Then: ordering is plugin-by-plugin; within a plugin, plugin-processor-by-plugin-processor; within `pluginProcessSpecEntries`, entry-by-entry, file-by-file, file-processor-by-file-processor.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-CLI-0040</depends>
</req>

<req id="FR-ARCH-0033" type="FR" level="System" ticketId="" classification="technical">
  <title>Content I/O confined to fileRead and pluginWrite</title>
  <statement>The generator shall read source file contents only within the `fileRead()` `FileProcessor`, and write output files only within the `pluginWrite()` `PluginProcessor`. No other processor shall perform file-content I/O.</statement>
  <rationale>Isolating ingress and egress makes the pipeline testable and the no-content-in-logs rule enforceable.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the code When: inspected Then: source-content reads appear only in `fileRead()` and output writes only in `pluginWrite()`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0034" type="FR" level="System" ticketId="" classification="technical">
  <title>Processor input validation (fail-fast)</title>
  <statement>Every processor at either tier shall deeply validate its input frame before acting and shall exit with an error when anything is wrong or unexpected for that processor's contract.</statement>
  <rationale>Fail-fast on invalid pipeline state prevents silent corruption of generated output. (`fileBundle()`'s binary-with-multiple-`SourceFile`s error in FR-ARCH-0042 is one example of this general rule.)</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any processor receiving a frame that violates its contract When: invoked Then: it errors with a message identifying the processor, the affected path, and the violation, rather than producing output.</criteria>
    <criteria>Given: `fileBundle()` with a binary `VirtualFile` and more than one remaining `SourceFile` When: invoked Then: it errors per this rule (FR-ARCH-0042).</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0035" type="FR" level="System" ticketId="" classification="technical">
  <title>Every step is a processor at its tier; no out-of-band passes</title>
  <statement>The generator shall express every generation step as a `FileProcessor` or a `PluginProcessor` in a declared pipeline; there shall be no out-of-band whole-tree passes. The output wipe is the `pluginCleanup()` processor and preserved-file seeding is the `pluginCopy()` processor (both `PluginProcessor`s at the head of the pipeline); a file relocated to another folder/name is a `SpecEntry` `target` and/or a `fileRename()`; an alternate-named duplicate is an additional `SpecEntry`; a file that should not appear is a `FileProcessingFrame` whose `target_contents` is `null`.</statement>
  <rationale>One uniform execution path: every outcome is a declared processor, so behavior is predictable and there is no hidden mutation. (Provenance: the original generator carried `reset_generated_tree`, `pre_copy_folders`, `pre_move_files`, `pre_cleanup`, and `post_cleanup` as out-of-band tree mutations; each becomes an ordered processor at the correct tier.)</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the generation design When: inspected Then: every step is a `FileProcessor` or `PluginProcessor` in a declared pipeline, including the output wipe (`pluginCleanup`) and preserved-file seeding (`pluginCopy`).</criteria>
    <criteria>Given: a relocation the original did via pre-move When: expressed Then: it is a `SpecEntry` `target` and/or `fileRename()`.</criteria>
    <criteria>Given: a file the original removed via cleanup When: expressed Then: its `FileProcessingFrame` has `target_contents` `null`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0002, FR-ARCH-0036</depends>
</req>

<req id="FR-ARCH-0036" type="FR" level="System" ticketId="" classification="technical">
  <title>target_contents states</title>
  <statement>The generator shall treat a `FileProcessingFrame`'s `target_contents` as having three distinct states: `null` meaning the content was removed and no file is to be produced; empty meaning a file is to be produced with optional frontmatter and empty main content; and a string or byte array meaning a file is to be produced with that content.</statement>
  <rationale>Removal and emptiness are different outcomes and must drive different `pluginWrite()` behavior.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `target_contents` is `null` When: written Then: no file is created.</criteria>
    <criteria>Given: `target_contents` is empty When: written Then: a file is created with empty main content (optional frontmatter).</criteria>
    <criteria>Given: `target_contents` holds content When: written Then: a file is created with that content.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0045</depends>
</req>

<req id="FR-ARCH-0037" type="FR" level="System" ticketId="" classification="technical">
  <title>Exact matching: anchored regexes and complete-token recognition</title>
  <statement>Every regular expression and every match the generator performs shall be exact: a regular expression shall be anchored to the full string it classifies, and every token shall be recognized only as a complete, boundary-delimited unit. Concretely: a `fileRename()` pattern matches the complete plugin-relative path (e.g. `^agents/(.+)\.md$`); a path reference is a complete path bounded by token delimiters (string start/end, whitespace, quotes, backticks, parentheses, brackets, or a path separator); a frontmatter field or model value is matched on its whole line; and an index tag is an exact member of the parsed tag set. This granularity is the standing rule for all current and future matching in the generator.</statement>
  <rationale>Exact matching is what makes path and token handling correct and safe — a complete-token match touches exactly the intended unit and nothing else. (Provenance: a non-exact replacement of the token `agents`→`.codex/agents` once corrupted the ordinary word "agents" across every document; mandating complete-token matching makes that class of corruption structurally impossible.)</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any regular expression in the generator When: inspected Then: it is anchored/bounded to the complete intended token, never an unanchored fragment or substring match.</criteria>
    <criteria>Given: any `fileRename()` pattern When: inspected Then: it is anchored to the full plugin-relative path.</criteria>
    <criteria>Given: the prose words "agents", "rules", or "commands" in a document body When: any path rewriting runs Then: they are unchanged.</criteria>
    <criteria>Given: a substring occurrence inside a larger word (e.g. `subagents`, `agentschema`) When: any matching runs Then: it is not matched.</criteria>
    <criteria>Given: a required tag `workflow` and a document tag `workflow-helper` When: tag membership is tested Then: it is not a match (exact membership, not substring).</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0038" type="FR" level="System" ticketId="" classification="technical">
  <title>Generated content produced against final (post-rename) paths</title>
  <statement>Generated and appended content — `pluginGenerateIndexes()`, `pluginEmitDistributionRoot()`, and any other derived artifact — shall be produced from the final post-`fileRename()` target paths recorded on the `frames`, so that such content already carries correct paths and requires no subsequent reference rewriting. Consequently, `pluginRewriteReferences()` shall apply only to hand-authored references carried in source document bodies, never to generated content.</statement>
  <rationale>Because these are `PluginProcessor`s that run after `pluginProcessSpecEntries()`, the `frames` already hold final paths, so an index lists `commands/…` directly (never `workflows/…`). This both removes work and shrinks the surface of reference rewriting to author-written cross-references only.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a folder moved `workflows`→`commands` When: the index is generated Then: its entries already read `commands/…` and no reference rewrite is applied to the index.</criteria>
    <criteria>Given: any generated or injected content When: inspected Then: it contains no pre-rename paths needing correction.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0032, FR-ARCH-0043</depends>
</req>

## File processors (`FileProcessor`)

<req id="FR-ARCH-0040" type="FR" level="System" ticketId="" classification="technical">
  <title>fileRead() processor</title>
  <statement>The `fileRead()` processor shall read each remaining `SourceFile`'s content and, for text `SourceFile`s, split frontmatter from body, erroring on malformed frontmatter and logging (without error) when frontmatter is absent; for binary `SourceFile`s it shall load only the byte content and set the binary flag without splitting.</statement>
  <rationale>Single, well-defined content ingress with explicit failure modes.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a text file with valid frontmatter When: read Then: frontmatter and body are separated.</criteria>
    <criteria>Given: malformed frontmatter When: read Then: it errors naming the file.</criteria>
    <criteria>Given: no frontmatter When: read Then: it logs and proceeds with body only.</criteria>
    <criteria>Given: a binary file When: read Then: only byte content is loaded and the binary flag is set.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0041" type="FR" level="System" ticketId="" classification="technical">
  <title>fileApplyOverrides() processor</title>
  <statement>The `fileApplyOverrides()` processor shall produce an operation over the working `SourceFile` collection that removes `SourceFile`s made irrelevant by an `overwrite` condition, by a `<target>-only` mismatch with the current target, or otherwise no longer applicable, leaving the effective set.</statement>
  <rationale>Centralizes override/relevance resolution so downstream file processors see only effective files.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a `SourceFile` collection containing an `OverwriteToken` `SourceFile` When: applied Then: earlier-ordered `SourceFile`s for the path are removed.</criteria>
    <criteria>Given: `SourceFile`s irrelevant to the current `PluginTarget` When: applied Then: they are removed.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0024, FR-ARCH-0023</depends>
</req>

<req id="FR-ARCH-0042" type="FR" level="System" ticketId="" classification="technical">
  <title>fileBundle() processor</title>
  <statement>The `fileBundle()` processor shall concatenate the contents of the remaining `SourceFile`s in order into `target_contents` without inserting any markup or delimiters, and — as one instance of the general input-validation rule (FR-ARCH-0034) — shall error when the `VirtualFile` is binary and more than one `SourceFile` remains.</statement>
  <rationale>Layer content is combined by plain concatenation; binaries cannot be concatenated.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: two text `SourceFile`s When: bundled Then: the output is their bodies concatenated in order with no added tags.</criteria>
    <criteria>Given: a single binary `SourceFile` When: bundled Then: its bytes pass through unchanged.</criteria>
    <criteria>Given: a binary `VirtualFile` with more than one remaining `SourceFile` When: bundled Then: it errors.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0041</depends>
</req>

<req id="FR-ARCH-0043" type="FR" level="System" ticketId="" classification="technical">
  <title>fileRename(pattern, replacement) processor</title>
  <statement>The `fileRename()` processor shall set the target plugin-relative path by applying a regular-expression pattern and replacement to the path, where the pattern is anchored to the complete plugin-relative path (exact matching per FR-ARCH-0037), leaving the path unchanged when the pattern does not match, and shall not read or modify `target_contents`. It changes the filename/suffix only; the destination folder is the `SpecEntry` `target` (FR-ARCH-0002), and updating in-body references that follow a rename is the separate responsibility of `pluginRewriteReferences()` (FR-ARCH-0049).</statement>
  <rationale>Per-IDE filename/suffix naming expressed declaratively, with a single responsibility: path-only, full-path-anchored. Fusing path changes with content edits (as the original `copy_core_tree` did) is the SRP violation this split removes.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: pattern `^rules/(.+)\.md$`→`rules/$1.mdc` When: applied to `rules/x.md` Then: target is `rules/x.mdc`.</criteria>
    <criteria>Given: a non-matching path When: applied Then: the target is unchanged.</criteria>
    <criteria>Given: any input `FileProcessingFrame` When: `fileRename()` runs Then: `target_contents` is unchanged.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0044" type="FR" level="System" ticketId="" classification="technical">
  <title>fileCodexAgentFormat(meta) processor</title>
  <statement>The `fileCodexAgentFormat()` processor shall convert an agent document's frontmatter and body into the Codex subagent format defined by the Codex guide (INT-IDE-0002), honoring a configurable meta parameter, producing the target contents in that form.</statement>
  <rationale>Codex requires a specific subagent format; the transform is one declarative file processor and the exact format is owned by the Codex guide.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an agent document and the configured meta parameter When: applied Then: target contents are a valid Codex subagent definition per the Codex guide.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>INT-IDE-0002</depends>
</req>

<req id="FR-ARCH-0046" type="FR" level="System" ticketId="" classification="technical">
  <title>Model-normalization file processors (per vocabulary)</title>
  <statement>The generator shall normalize a text `FileProcessingFrame`'s frontmatter model value into the current `PluginTarget`'s model identifier format using a case-specific model-normalization `FileProcessor` composed into that target's `SpecEntry` pipeline — one such processor per model vocabulary — each rewriting the model value per its target's `ModelVocabulary` and leaving content without a model value unchanged. Logic shared across these processors shall be reused as low-level frontmatter and model-mapping helpers (FR-ARCH-0005), and no model-normalization processor shall branch on a vocabulary-kind identity-discriminant.</statement>
  <rationale>Each IDE accepts only its own model identifier format, produced by genuinely different rules (token-scan, first-token, two-line split); each is therefore its own small case-specific processor that reuses shared helpers, rather than one processor switching on a vocabulary `kind` (FR-ARCH-0005). Normalization stays an explicit file-tier stage, not hidden inside copying. Maintainers intentionally use order of models so that they can select different model providers for different agents/skills (example: engineer subagent uses Sonnet, while reviewer uses GPT).</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-08-19</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a frame whose frontmatter declares a model When: normalized for a `PluginTarget` Then: the model value is rewritten per that target's `ModelVocabulary`.</criteria>
    <criteria>Given: a frame with no model value When: normalized Then: its content is unchanged.</criteria>
    <criteria>Given: a target's pipeline When: inspected Then: it composes exactly the model-normalization processor for that target's vocabulary, and no such processor selects behavior by a vocabulary-kind discriminant (FR-ARCH-0005).</criteria>
    <criteria>Given: the Python generator's CURSOR_MODEL_MAP, COPILOT_MODEL_MAP, or CLAUDE_MODEL_MAP is updated to a new model version When: the TypeScript CURSOR_CLAUDE_MAP, CURSOR_GPT_MAP, CURSOR_GEMINI_MAP, COPILOT_CLAUDE_MAP, COPILOT_GPT_MAP, or COPILOT_GEMINI_MAP are inspected Then: they produce identical output values for all model token inputs present in instruction source frontmatter. (Parity enforcement: TypeScript maps must be kept in sync with Python authoritative maps.)</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/file-processors/file-normalize-models.ts (switch dispatcher deleted; 4 helpers exported); file-normalize-claude-models.ts; file-normalize-cursor-models.ts; file-normalize-copilot-models.ts; file-normalize-codex-models.ts. Multi-vendor model ordering intentional: maintainers order models in frontmatter to select different providers per agent/skill (engineer=Sonnet, reviewer=GPT). Maps: CURSOR_CLAUDE_MAP + CURSOR_GPT_MAP (GPT 5.3+; 5.5→5.6-sol, 5.4/5.3/5.3-codex→5.6-terra, 5.4-mini→5.6-luna) + CURSOR_GEMINI_MAP (every gemini→3.7-flash) + CURSOR_GROK_MAP (4.5→4.6); COPILOT_CLAUDE_MAP + COPILOT_GPT_MAP (same GPT upgrades) + COPILOT_GEMINI_MAP (every gemini→3.7-flash). Every opus variant (4.6/4.7/4.8)→opus-5. Distinct GPT cost tiers map to distinct 5.6-era successors. Gemini effort assignment on authored tokens (Pro -> -high, superseded Flash -> -low, otherwise -medium) is a source-authoring rule, not a map value; see FR-ARCH-0057.</implementationNotes>
  <depends>DATA-CFG-0004, FR-ARCH-0005</depends>
</req>

## Plugin processors (`PluginProcessor`)

<req id="FR-ARCH-0052" type="FR" level="System" ticketId="" classification="technical">
  <title>pluginCleanup() processor</title>
  <statement>The `pluginCleanup()` processor shall empty the target's output location of all content and ensure the output directory exists, leaving a clean slate for the rest of the pipeline. It is the first `PluginProcessor` in the pipeline.</statement>
  <rationale>A wipe-then-rebuild start makes every run reproducible; modeling it as a `PluginProcessor` keeps it inside the uniform pipeline rather than an out-of-band step. Because seeding (`pluginCopy`) re-establishes preserved files every run, nothing needs to survive the wipe.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a populated output When: `pluginCleanup()` runs Then: the output location is empty and present.</criteria>
    <criteria>Given: a non-existent output When: `pluginCleanup()` runs Then: the directory is created and the run proceeds.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0035</depends>
</req>

<req id="FR-ARCH-0053" type="FR" level="System" ticketId="" classification="technical">
  <title>pluginCopy() processor (preserved-file seeding)</title>
  <statement>The `pluginCopy()` processor shall copy the target's committed preserved files from `src/rosettify-plugins/plugins/<name>/` into the output at their mirrored output-relative paths, before instruction-derived content is produced. The seed source is the sole authority for preserved files; because cleanup wipes and `pluginCopy()` re-seeds every run, there is no "survive-the-wipe" preserved-file set in the output.</statement>
  <rationale>The IDE manifest, hook templates, and config-folder files have no instruction-source derivation; seeding them from a committed source makes generation self-contained into a clean output directory and removes the former dependency on files already committed in the output tree.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an empty output and `src/rosettify-plugins/plugins/<name>/` When: `pluginCopy()` runs Then: every preserved file is present at its output-relative path.</criteria>
    <criteria>Given: the pipeline When: ordered Then: `pluginCopy()` runs after `pluginCleanup()` and before `pluginProcessSpecEntries()`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0052, DATA-CFG-0005</depends>
</req>

<req id="FR-ARCH-0054" type="FR" level="System" ticketId="" classification="technical">
  <title>pluginProcessSpecEntries() processor</title>
  <statement>The `pluginProcessSpecEntries()` processor shall, for each `SpecEntry` in declared order, expand the entry's source glob over the VFS, skip any matched `VirtualFile` whose VFS path is listed in the entry's `exclude` (creating no frame for it), create a `FileProcessingFrame` for each remaining matched `VirtualFile` whose initial target path is the entry's `target` folder joined with the file's name, run the entry's `FileProcessor` pipeline over each frame, and collect the resulting frames into the `PluginProcessingFrame`'s `frames`.</statement>
  <rationale>This is the bridge from the plugin tier to the file tier: it turns the declarative `SpecEntry`s into the per-file frames every later `PluginProcessor` reads. Folder placement comes from `target`; per-file transforms come from the entry's `FileProcessor`s.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a `SpecEntry` `{source: "workflows/**/*", target: "commands", processors: [...]}` When: processed Then: each matched file yields a frame whose target is under `commands/` after its `FileProcessor`s run.</criteria>
    <criteria>Given: completion When: inspected Then: `frames` holds one `FileProcessingFrame` per matched file with its final target path and contents.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0002, FR-ARCH-0032</depends>
</req>

<req id="FR-ARCH-0049" type="FR" level="System" ticketId="315" classification="technical">
  <title>pluginRewriteReferences() processor</title>
  <statement>The `pluginRewriteReferences()` processor shall update the path references each document carries to other instruction files so they match those files' final locations for the target, changing content only and leaving target paths to `fileRename()`/`SpecEntry`. It shall derive its lookup by reading the already-produced `frames` — the set of (source VFS path → final target path) pairs, one per frame whose path changed (including frames whose `target_contents` is `null`, dropped during processing, but whose path changed, so references to them still resolve) — together with the folder-level pairs (`<from>/`→`<to>/`) read from the `SpecEntry` `source→target` folder mappings. A folder-level pair shall be emitted ONLY when that folder's mapping is a pure folder relocation — that is, when every in-scope frame originating in the source folder lands directly in the target folder as a single path segment (an extension-only rename such as `.md`→`.mdc` still qualifies). When a mapping instead RESTRUCTURES document paths, so that a source document lands at a deeper path within the target folder (for example `workflows/<name>.md` → `skills/<name>/SKILL.md`), no folder-level pair shall be emitted for that source folder; only the exact per-document pairs shall apply. A bare folder token carries no document identity, so rewriting it under a restructuring mapping would produce a path that does not exist and would also corrupt prose and glob mentions that merely contain the token. (Files named in a `SpecEntry`'s `exclude` are never materialized as frames; they do not move, so no reference rewriting is needed toward them.) For each pair (frame-derived or folder-level) it shall replace the source path with the final path wherever the source appears as a complete, boundary-delimited path reference (exact matching, FR-ARCH-0037), applied longest-from-string first. Correcting a prose or glob-documentation string that names a restructuring mapping's source form (e.g. `` WORKFLOW/COMMAND `workflows/*.md` ``) is NOT this processor's job — that is `pluginReplaceLiterals()` (FR-ARCH-0058), a separate composed processor with plain-substring semantics.</statement>
  <rationale>In-body reference updating is a distinct content concern and is its own `PluginProcessor`, because it needs the whole-plugin view (every file's final path). Reading the lookup from the `frames` means `fileRename()`/`SpecEntry` remain the only place renames are decided — references are observed, never recomputed — answering "where do the pairs come from" with no duplicated logic. Exact, complete-token matching keeps the update confined to genuine path references.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a body reference `workflows/coding-flow.md` and a `workflows`→`commands` move When: run Then: it reads `commands/coding-flow.md` and the document's target path is unchanged.</criteria>
    <criteria>Given: a bare reference `workflows/` and a pure folder relocation `workflows`→`commands` When: run Then: it becomes `commands/`.</criteria>
    <criteria>Given: a restructuring mapping `workflows/<name>.md`→`skills/<name>/SKILL.md` When: run Then: an exact document reference `workflows/coding-flow.md` becomes `skills/coding-flow/SKILL.md`, but a bare `workflows/` token is left unchanged and no folder-level pair is emitted for that source folder.</criteria>
    <criteria>Given: prose or glob mentions that merely contain the token, such as `(skills/agents/workflows/rules)`, under a restructuring mapping When: run Then: they are unchanged.</criteria>
    <criteria>Given: a reference to a frame whose `target_contents` is `null` but whose path changed When: run Then: the reference is still rewritten to the final form.</criteria>
    <criteria>Given: the prose word "agents" (with an `agents`→`.codex/agents` move in effect) When: run Then: the word is unchanged; only complete `agents/<path>` references are rewritten.</criteria>
    <criteria>Given: the `frames` When: the lookup is assembled Then: it is read from the frames (`sourcePath → targetPath`) plus the entries' folder pairs, not recomputed from rename rules.</criteria>
    <criteria>Given: a path reference preceded by a dot-directory segment such as `.windsurf/workflows/` or `.cursor/rules/` When: run Then: the reference is NOT rewritten — dot-directory-prefixed paths are IDE-native filesystem documentation, not Rosetta instruction cross-references (FR-ARCH-0037).</criteria>
    <criteria>Given: a SpecEntry with `verbatim: true` When: `pluginRewriteReferences` runs Then: all frames produced by that entry are returned unchanged regardless of rename pairs in effect.</criteria>
    <criteria>Given: the per-IDE configuration guides under `skills/harness/references/configure/`, which document other IDEs' on-disk layouts When: `pluginRewriteReferences` runs for any target Then: they are emitted byte-identical to their source, so a Cursor build does not rewrite `workflows/` to `commands/` inside a document describing Claude Code's layout.</criteria>
    <criteria>Given: frames contributed by two folders of one set that a single SpecEntry maps to one target folder When: the folder-level pair is considered Then: the pure-relocation discriminant is evaluated over all of that entry's in-scope frames together, so a mapping stays a pure relocation only if every contributing folder's frames land one segment deep.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: pluginRewriteReferences and buildRenamePairs
  (src/rosettify-plugins/src/plugin-processors/plugin-rewrite-references.ts) build the rename lookup
  purely from frames, including ghost frames with null content but a changed path, plus the SpecEntry
  folder pairs, gated by isPureFolderRelocation on a depth discriminant rather than a basename.
  rewritePathToken's negative lookbehinds block dot-directory-prefixed paths and enforce word boundaries;
  verbatim frames are skipped. Tests: tests/unit/plugin-processors/plugin-rewrite-references.test.ts
  (22/22).</implementationNotes>
  <depends>FR-ARCH-0039, FR-ARCH-0037, FR-ARCH-0054, FR-SET-0020</depends>
</req>

<req id="FR-ARCH-0058" type="FR" level="System" ticketId="315" classification="technical">
  <title>pluginReplaceLiterals() processor</title>
  <statement>The `pluginReplaceLiterals(pairs)` processor factory shall accept, as data supplied at composition time, an ordered list of `(from, to)` literal string pairs and return a `PluginProcessor` that, for each non-binary, non-null-content, non-`verbatim` frame's `target_contents`, replaces every exact occurrence of each pair's `from` string with its `to` string, applying plain substring substitution — no regular expressions, no complete-token boundary rules, no path-separator or dot-directory guards, and no escaping of `from` beyond exact literal matching. A pair whose `from` equals its `to`, or whose `from` is the empty string, shall be a no-op. The returned processor shall be composed into a target's pipeline only by the specs that need it (FR-ARCH-0004, FR-ARCH-0005) — never selected inside a shared processor by an identity branch on target/IDE — and, within `buildPipeline`, shall run after `pluginGenerateIndexes()` and before the bootstrap assembler, so that assembled hook payloads (which read document bodies from `frames`) inherit the substitution.</statement>
  <rationale>`pluginRewriteReferences()` (FR-ARCH-0049) intentionally matches only complete, boundary-delimited path tokens, because it is correcting genuine cross-references to files that moved; a restructuring mapping (e.g. `workflows/<name>.md` → `skills/<name>/SKILL.md`) deliberately emits no folder-level pair, so a prose or glob-documentation string that merely names the mapping's source form (e.g. `` WORKFLOW/COMMAND `workflows/*.md` ``) is left stale by design, since it is not a path reference and per-document exact pairs do not match it. Bolting that correction onto `pluginRewriteReferences()` — as an earlier iteration did via an optional `PluginSpec.literalRewritePairs` field folded into its lookup — put a prose-substitution concern on the wrong abstraction and under the wrong matching semantics (boundary/regex), and added a field to `PluginSpec` used by only two specs of the whole inventory. Prose correction needs exact, unconditional substring substitution: no boundary rules, because the target is documentation text describing a glob pattern, not a filesystem path. A small, separately named, separately composed processor keeps this concern isolated, keeps `PluginSpec` free of a field most specs never populate, and keeps `pluginRewriteReferences()`'s semantics uncomplicated by a second, incompatible matching mode.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `pluginReplaceLiterals([['WORKFLOW/COMMAND \`workflows/*.md\`', 'WORKFLOW/COMMAND \`skills/*-flow/SKILL.md\`']])` and a frame whose content contains that exact literal When: run Then: the literal is replaced with the declared replacement.</criteria>
    <criteria>Given: content containing both the long literal `` WORKFLOW/COMMAND `workflows/*.md` `` and, elsewhere, a separate bare `` `workflows/*.md` `` mention (e.g. `skills/rosetta/README.md`) When: run Then: only the long literal is rewritten; the unrelated bare mention is left unchanged.</criteria>
    <criteria>Given: a literal preceded by a word character or a dot-directory segment (contexts `pluginRewriteReferences()` would refuse to match) When: run Then: the literal is still replaced — this processor applies no boundary or dot-directory guard.</criteria>
    <criteria>Given: `pairs` is an empty array When: run Then: the input `PluginProcessingFrame` is returned unchanged (same object).</criteria>
    <criteria>Given: a pair whose `from === to` When: run Then: no substitution occurs for that pair.</criteria>
    <criteria>Given: a binary frame, a frame whose `target_contents` is `null`, or a frame with `verbatim: true` When: run Then: that frame is returned unchanged, even if its content would otherwise match a pair.</criteria>
    <criteria>Given: the built specs When: inspected Then: the `codex` and `antigravity` pipelines contain a processor named `pluginReplaceLiteralsProcessor`; the `claude`, `cursor`, `copilot`, `cursor-standalone`, and `copilot-standalone` pipelines do not.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: pluginReplaceLiterals
  (src/rosettify-plugins/src/plugin-processors/plugin-replace-literals.ts) applies plain substring
  substitution with no boundary or regex rules, skips binary/null/verbatim frames, and no-ops on an empty
  pair list. It is composed only in the codex and antigravity builders via buildPipeline's
  extraAfterIndexes in src/rosettify-plugins/src/spec/targets.ts, confirmed absent from the other five
  targets by the composition test. Also carries the requiredIn/driftGuard options that hard-error when a
  keyed literal goes stale against its host document. Tests:
  tests/unit/plugin-processors/plugin-replace-literals.test.ts.</implementationNotes>
  <depends>FR-ARCH-0049, FR-ARCH-0004, FR-ARCH-0005, FR-ARCH-0047</depends>
</req>

<req id="FR-ARCH-0047" type="FR" level="System" ticketId="" classification="technical">
  <title>pluginGenerateIndexes() processor</title>
  <statement>The `pluginGenerateIndexes()` processor shall, for each index folder declared on the `PluginSpec`, produce a folder-index `FileProcessingFrame` whose `target_contents` lists the qualifying frames of that folder with their descriptions, built from the frames' final target paths (FR-ARCH-0038), where membership and heading follow the folder-index rules.</statement>
  <rationale>The table-of-contents output is a generated artifact produced from the whole-plugin view of final paths, so it lists correct names and needs no later rewriting.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a folder of frames When: indexed Then: a single index frame is produced listing each qualifying member with its description at its final path.</criteria>
    <criteria>Given: no qualifying members When: indexed Then: no index frame is produced.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-GEN-0001, FR-ARCH-0038</depends>
</req>

<req id="FR-ARCH-0051" type="FR" level="System" ticketId="315" classification="technical">
  <title>pluginEmitDistributionRoot() processor</title>
  <statement>The `pluginEmitDistributionRoot()` processor shall append a distribution-root declaration to the content of the rule document the IDE auto-loads every session, changing content only and never the target path. It shall be a FACTORY taking its per-distribution configuration — the extraction root and the name of the workflow folder relative to it — as composition-time arguments, and shall be placed only in the pipelines of the specs that need it; no `PluginSpec` field shall carry that configuration. The declaration shall be appended at a deterministic structural position, the end of the block that wraps the document's plugin-files-mode content, and shall not depend on an optional marker being present: the insertion point is the close of the block that always wraps the document's content, with the end of the document as fallback, so there is no state in which the emission is skipped for want of a place to put it. Where the host document is absent the processor shall discriminate two cases rather than skip uniformly: a plugin whose set ships a rules folder but produced no host document is a hard error, while a plugin whose set ships no rules folder has no host to carry the declaration and is skipped legitimately. The host document shall be identified by its base name taken to the FIRST dot, so a per-IDE rename that appends further dotted segments still matches. The workflow FILE EXTENSION the declaration advertises shall be derived from the frames the plugin actually emits and shall never be restated in configuration; only the folder name is configured.</statement>
  <rationale>A configuration field that five of seven specs leave unset, read by a processor that no-ops for most of them, is identity branching wearing a data costume; a factory composed only where it applies keeps the case where the case is declared, which is what FR-ARCH-0005 requires. The position is structural rather than anchor-matched because the mechanism this replaces skipped silently whenever its anchor was absent, and the anchor WAS absent from the real instruction source, so the declaration never once reached a shipped standalone while its unit tests passed against a fixture that happened to contain it. A skip that cannot be distinguished from success is the defect, so the replacement has no skip path. Matching the host to the first dot exists because Copilot renames the rule to `plugin-files-mode.instructions.md`, which a last-dot strip never matched. Deriving the workflow extension from emitted frames keeps Copilot's `*.prompt.md` from drifting away from what the target actually writes.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-02</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a host document and a configured extraction root When: the processor runs Then: the declaration appears at the end of the plugin-files-mode block and the target path is unchanged.</criteria>
    <criteria>Given: a distribution whose set ships a rules folder When: generated Then: the declaration is present, there being no condition under which it is silently omitted.</criteria>
    <criteria>Given: a host document renamed with additional dotted segments, such as `plugin-files-mode.instructions.md` When: the host is matched Then: it is found, the base name being taken to the first dot.</criteria>
    <criteria>Given: a set that emits workflow files When: the declaration is composed Then: the advertised workflow path carries the extension those emitted frames actually use.</criteria>
    <criteria>Given: a set that emits no workflow files When: the declaration is composed Then: it advertises no workflow path at all.</criteria>
    <criteria>Given: a plugin whose set ships a rules folder but no host document When: the processor runs Then: it fails with a hard error naming the missing host document and the root that could not be declared.</criteria>
    <criteria>Given: a plugin whose set ships no rules folder When: the processor runs Then: it makes no change and raises no error, there being no host document to carry a declaration.</criteria>
    <criteria>Given: the generator source When: inspected Then: the per-distribution configuration is passed at composition time and no `PluginSpec` field carries it.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/plugin-processors/plugin-emit-distribution-root.ts exports DistributionRootConfig, buildRootDeclaration and the pluginEmitDistributionRoot factory; HOST_STEM and BLOCK_END fix the host document and the structural insertion point, and deriveWorkflowGlob reads the extension off a real emitted workflow frame, preserving a compound extension such as `.prompt.md`. Host matching uses baseDocName in src/rosettify-plugins/src/frames.ts, which takes the basename to its first dot. Composed via extraAfterIndexes in src/rosettify-plugins/src/spec/targets.ts at exactly two sites, `{ root: '.cursor', workflowFolder: 'commands' }` and `{ root: '.github', workflowFolder: 'prompts' }`. Tests: tests/unit/plugin-processors/plugin-emit-distribution-root.test.ts.</implementationNotes>
  <depends>FR-ARCH-0005</depends>
</req>

<req id="FR-ARCH-0055" type="FR" level="System" ticketId="" classification="technical">
  <title>pluginAssembleBootstrap() processor</title>
  <statement>The `pluginAssembleBootstrap()` processor shall assemble the target's session-start bootstrap context payload from the present bootstrap frames, in the order of the `PluginSpec`'s bootstrap manifest, per the FR-HOOK bootstrap requirements (assembly, prefix, escaping, size limit, per-IDE entry shape), and shall record the resulting placeholder key-values into the `PluginProcessingFrame`'s `templateContext` (alongside the release variables) for `pluginRenderTemplates()` to consume. The payload serialization shall reproduce the current generator's exact byte layout (NFR-0001).</statement>
  <rationale>Bootstrap-payload assembly needs the whole-plugin view (it reads multiple bootstrap frames in a defined order), so it is a `PluginProcessor`; the detailed contract lives in FR-HOOK. Its output is the template placeholder values, carried on the frame's `templateContext`.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-11</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a target's present bootstrap frames When: assembled Then: the payload is built in manifest order per FR-HOOK and exposed to template rendering.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/plugin-processors/plugin-assemble-claude-bootstrap.ts; src/rosettify-plugins/src/plugin-processors/plugin-assemble-cursor-bootstrap.ts; src/rosettify-plugins/src/plugin-processors/plugin-assemble-copilot-bootstrap.ts; src/rosettify-plugins/src/plugin-processors/plugin-assemble-codex-bootstrap.ts. All 4 assemblers call callback-driven assembleBootstrapPayload(p, buildEntry, buildRootEntry) and write templateContext['bootstrap_hooks'] (one fixed key). Cursor generates a full bootstrap payload that is never injected, because neither Cursor hook configuration template carries a bootstrap placeholder (FR-GEN-0011); the delivery rule is FR-VAR-0070. Monolithic plugin-assemble-bootstrap.ts deleted.</implementationNotes>
  <depends>FR-HOOK-0001, FR-HOOK-0009, FR-HOOK-0005</depends>
</req>

<req id="FR-ARCH-0056" type="FR" level="System" ticketId="" classification="technical">
  <title>Target-path uniqueness within a plugin's frame set</title>
  <statement>If two or more SpecEntries in a PluginSpec produce FileProcessingFrames whose target paths are identical, the generator shall fail with a hard error before writing any output, naming each conflicting target path, the VFS source path of each conflicting frame, and the SpecEntry source glob and target folder that produced each frame.</statement>
  <rationale>Silent target-path collisions cause one SpecEntry's output to overwrite another's without any diagnostic. Because pluginWrite writes frames in order and the last writer wins silently, a collision is undetectable at the output level. Failing hard with full attribution allows authors to detect misconfigured SpecEntry source globs or target folders immediately.</rationale>
  <source>Inferred</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-16</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: two SpecEntries whose FileProcessor pipelines yield frames with the same target path When: pluginProcessSpecEntries completes Then: the generator emits a hard GenError naming the target path, the VFS sourcePath of each conflicting frame, and the source glob and target folder of each contributing SpecEntry, before pluginWrite runs.</criteria>
    <criteria>Given: all SpecEntries produce frames with distinct target paths When: pluginProcessSpecEntries completes Then: no error is raised and the pipeline proceeds normally.</criteria>
  </acceptance>
  <depends>FR-ARCH-0054</depends>
  <implementation>Implemented</implementation>
  <implementationNotes>plugin-process-spec-entries.ts: replaced dead existingByTarget Map with an allFrames conflict detector; hard GenError emitted on target collision with full attribution.</implementationNotes>
</req>

<req id="FR-ARCH-0057" type="FR" level="System" ticketId="315" classification="technical">
  <title>Model vocabulary scope, upgrade rules, and Codex effort-omission rule</title>
  <statement>The built-in Cursor and Copilot model vocabulary maps (CURSOR_GPT_MAP, COPILOT_GPT_MAP) shall cover only GPT 5.3 and above; no entry whose key starts with `gpt-4`, `o3`, or `o4` shall be present in a built-in map. This restriction is scoped to the built-in maps only: a profile's per-target model-override block may name model ids the built-in maps exclude, because a profile exists to serve a client whose available models differ. The following upgrade rules shall be applied during normalization: every opus token — `claude-opus-4-6`, `claude-opus-4-7`, `claude-opus-4-8`, and any `claude-4.7-opus*` or `claude-4.8-opus*` token — shall map to `claude-opus-5`; `gpt-5.5` (all effort variants) shall map to `gpt-5.6-sol`; `gpt-5.4`, `gpt-5.3`, and `gpt-5.3-codex` (all effort variants) shall map to `gpt-5.6-terra`; `gpt-5.4-mini` shall map to `gpt-5.6-luna`; every `gemini-*` token shall map to `gemini-3.7-flash`; and `grok-4.5` shall map to `grok-4.6`. The governing invariant is version-independent: a built-in map shall RETAIN a key for every model token the instruction set has authored, including superseded ones, and each such key shall resolve to the current model of that token's own cost tier. Where a superseded Gemini token is carried forward into authored source, its reasoning-effort suffix shall be assigned by tier: a Gemini Pro token takes `-high`; a superseded Flash token (`gemini-3-flash`, `gemini-3.5-flash`, `gemini-3-flash-preview`) takes `-low`; every other Gemini token takes `-medium`. The vocabulary maps resolve any of these to the IDE-native Gemini id, which carries no effort suffix — the suffix is authored guidance read by the agent, not a mapped value. Keys are therefore never removed as a model ages — only their values move forward — and each superseded GPT family upgrades to its own successor so distinct cost tiers stay distinct rather than being conflated. When a Codex normalization encounters a GPT token with no trailing effort suffix, the generator shall write only `model: <id>` and shall not write a `model_reasoning_effort` field; no default effort value is substituted.</statement>
  <rationale>Stale or over-broad maps produce silent model downgrades or wrong IDE-specific IDs. Restricting Cursor/Copilot GPT maps to 5.3+ and encoding explicit upgrade rules prevents unintentional degradation. Retaining a superseded key rather than deleting it is what makes an older or third-party instruction layer keep resolving to a usable model instead of silently emitting a model the IDE no longer offers; enumerating specific versions as permanently exempt from upgrade would instead pin the maps to whichever generation was current when the rule was written. `gpt-5.4` and `gpt-5.5` belong to different cost tiers and so resolve to different successors (`gpt-5.6-terra` and `gpt-5.6-sol`), never to a single shared one. Requiring an explicit effort suffix in source is a content authoring contract; the generator must not silently substitute a default. The built-in-map restriction is scoped to the built-in maps and does not extend to profile override blocks, which exist precisely to name models a standard client would not use.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a Cursor or Copilot SpecEntry normalizes a file whose frontmatter first token is `claude-opus-4-7` When: normalized Then: the output model field is `claude-opus-5`.</criteria>
    <criteria>Given: a Cursor or Copilot SpecEntry normalizes a file whose frontmatter first token is `gpt-5.3-high` When: normalized Then: the output model field is `gpt-5.6-terra`.</criteria>
    <criteria>Given: a Codex SpecEntry normalizes a file whose frontmatter first token is `gpt-5.4` (no effort suffix) When: normalized Then: the output contains `model: gpt-5.6-terra` and does not contain `model_reasoning_effort`.</criteria>
    <criteria>Given: the built-in CURSOR_GPT_MAP or COPILOT_GPT_MAP is inspected When: inspected Then: no entry key starts with `gpt-4`, `o3`, or `o4`.</criteria>
    <criteria>Given: a profile `cursor` override block naming `gpt-4o` When: the profile is applied Then: the id is accepted and used, and the built-in-map restriction is not treated as violated.</criteria>
    <criteria>Given: the built-in Cursor, Copilot and Codex maps are inspected When: inspected Then: every GPT 5.3, 5.4, 5.4-mini and 5.5 token, in each of its effort variants, is present as a key and resolves to its tier's current successor — `gpt-5.6-sol` for the 5.5 family, `gpt-5.6-terra` for the 5.4 and 5.3 families, `gpt-5.6-luna` for the mini family.</criteria>
  </acceptance>
  <depends>FR-ARCH-0046, FR-COPY-0022</depends>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: CURSOR_GPT_MAP, COPILOT_GPT_MAP and CODEX_GPT_MAP
  (src/rosettify-plugins/src/spec/model-maps.ts) carry no gpt-4, o3 or o4 keys, and every stated upgrade
  rule is present. normalizeCodex emits no reasoning-effort value when the source token carries no effort
  suffix, via splitCodexEffort. The profile-override carve-out through resolveEffectiveVocabulary
  (src/rosettify-plugins/src/spec/profiles.ts) is unaffected by the built-in restriction. Tests:
  tests/unit/spec/model-maps.test.ts (75/75).</implementationNotes>
</req>

<req id="FR-ARCH-0059" type="FR" level="System"
     ticketId="" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="User" changed="2026-08-19"
     depends="FR-ARCH-0005, FR-ARCH-0046"
     implementation="Implemented">
  <title>Effective model map threaded as a processor parameter</title>
  <statement>The generator shall supply each model-normalization function with its target's effective model map as an explicit parameter passed by the caller, and shall refactor the existing normalization functions in place to accept that parameter rather than reading a hardcoded map. Every caller shall be updated to pass the effective map; no parallel or duplicated normalization code path shall be introduced for the profile case. `PluginSpec.modelVocabulary` shall be the sole live carrier of the effective map — the built-in vocabulary by default, or the active profile's per-target override block when present — and no new field shall be added beside it. The effective map shall be plain data read from the passed-in parameter; no normalization function shall branch on target or IDE identity to choose the map (FR-ARCH-0005).</statement>
  <rationale>`PluginSpec.modelVocabulary` is the single live carrier of each target's effective model map: the four normalization functions read the map handed to them and nothing else, rather than reaching for hardcoded maps directly and ignoring their context argument. Making the field the live carrier and threading it as a parameter is the minimal change that lets a profile substitute the map without duplicating logic; the alternative of a second, profile-specific code path was rejected because it would drift from the built-in path and double the maintenance surface. The map must be data passed in rather than a switch on identity, because FR-ARCH-0005 forbids branching on target/IDE identity or an identity-discriminant flag.</rationale>
  <acceptance>
    <criteria id="FR-ARCH-0059.AC1" ears="ubiquitous" system="each model-normalization function" shall="accept the effective model map as an explicit parameter supplied by its caller and normalize using only that passed-in map"/>
    <criteria id="FR-ARCH-0059.AC2" ears="event" when="a caller invokes a model-normalization function" system="the generator" shall="pass the target's `PluginSpec.modelVocabulary` as the effective map for that invocation"/>
    <criteria id="FR-ARCH-0059.AC3" ears="state" while="a profile supplies a per-target override block for a target" system="the generator" shall="place that block on the target's `PluginSpec.modelVocabulary` as the effective map, introducing no field beside `modelVocabulary`"/>
    <criteria id="FR-ARCH-0059.AC4" ears="optional" where="no profile override block exists for a target" system="the generator" shall="place the target's built-in vocabulary on `PluginSpec.modelVocabulary` so normalization output is identical to today"/>
    <criteria id="FR-ARCH-0059.AC5" ears="unwanted" if="a normalization path would select the map by branching on target or IDE identity, or a second parallel normalization implementation is introduced for the profile case" system="the generator" shall="fail the build at type-check time, since the normalization functions accept the map only as a parameter and expose no target-identity argument to branch on (FR-ARCH-0005)"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/model-maps.ts (the four normalize functions refactored in place to take the effective map as a parameter; no parallel path); src/rosettify-plugins/src/types.ts (PluginSpec.modelVocabulary is the sole live carrier; ModelVocabulary.exhaustive added; no new field); src/rosettify-plugins/src/spec/targets.ts (every caller passes spec.modelVocabulary); src/rosettify-plugins/src/file-processors/file-normalize-{claude,cursor,copilot,codex}-models.ts and file-codex-agent.ts (all callers updated). Tests: tests/unit/spec/model-maps.test.ts.</implementationNotes>
</req>

<req id="FR-ARCH-0048" type="FR" level="System" ticketId="" classification="technical">
  <title>pluginRenderTemplates() processor</title>
  <statement>The `pluginRenderTemplates()` processor shall render each template frame into its non-template output frame, using the `PluginProcessingFrame`'s `templateContext` (release variables, the assembled bootstrap payload placeholder values, and the spec's output folder name), with raw injection and release-driven conditionals. A rendered frame whose output path denotes JSON shall be parsed immediately after rendering, a parse failure being a hard error that suppresses the frame (FR-GEN-0011).</statement>
  <rationale>Template rendering depends on the assembled bootstrap payload (carried on the frame's `templateContext`), so it is a `PluginProcessor` and an explicit pipeline stage rather than an out-of-band step. Validation belongs here for the same reason: this is the stage that produces the final text, and it is the only point at which a raw injection and the literal structure around it exist together.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a template frame and a render context When: rendered Then: the output frame content is the rendered result and the template suffix is removed from its path.</criteria>
    <criteria>Given: a release-conditional block When: rendered Then: the output is valid for the selected release.</criteria>
    <criteria>Given: a rendered frame whose output path denotes JSON When: rendering completes Then: it is parsed, and a parse failure raises a hard error naming the target and the output file instead of emitting the frame.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-GEN-0010, FR-GEN-0011, FR-ARCH-0055</depends>
</req>

<req id="FR-ARCH-0045" type="FR" level="System" ticketId="" classification="technical">
  <title>pluginWrite() processor with dry-run</title>
  <statement>The `pluginWrite()` processor shall produce, for each frame, a file at the frame's target path under the output directory according to its `target_contents` state — creating no file when `target_contents` is `null`, and creating the file otherwise — and under dry-run it shall instead emit each frame's full target path and full target contents to the output sink and write nothing to disk. The output sink shall be caller-provided, defaulting to the process standard output, so consumers and tests can capture or redirect the dry-run preview without patching global streams.</statement>
  <rationale>Single content egress for the whole plugin; honors removal vs. emptiness; dry-run gives a complete preview without side effects; an injectable sink keeps the preview testable and decoupled from the process stdout.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-07-17</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a frame with non-null `target_contents` When: written Then: the file appears at the target path under the output directory.</criteria>
    <criteria>Given: a frame with `target_contents` `null` When: written Then: no file is created.</criteria>
    <criteria>Given: dry-run When: written Then: the full path and full content of each frame are emitted to the output sink and no file is created.</criteria>
    <criteria>Given: a caller-provided output sink When: dry-run is written Then: the preview is emitted to that sink instead of the process standard output.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/plugin-processors/plugin-write.ts (tri-state write + dry-run emit to the `out` sink); sink threaded via `GenerateOptions.out` (default process.stdout) through src/rosettify-plugins/src/generate.ts and src/rosettify-plugins/src/spec/targets.ts (buildAllSpecs/buildPipeline). Covered by src/rosettify-plugins/tests/unit/plugin-processors/plugin-write.test.ts and tests/e2e/sample.e2e.test.ts.</implementationNotes>
  <depends>FR-CLI-0050</depends>
</req>

## Observability

<req id="FR-ARCH-0050" type="FR" level="System" ticketId="" classification="technical">
  <title>Decision and I/O logging without content</title>
  <statement>The generator shall log every decision and every processor's input and output frame metadata — per `PluginProcessor` and, within `pluginProcessSpecEntries()`, per `FileProcessor` — excluding the actual file content, and shall expand logging detail under verbose mode. The minimum log level shall be resolvable with the usual inheritance: the `info` default is overridden by the `ROSETTIFY_PLUGINS_LOG_LEVEL` environment variable, which is in turn overridden by the verbose flag (which forces `debug`) — so operators can quiet a run to warnings/errors (`warn`) without editing code and automated callers avoid log-flooding.</statement>
  <rationale>Full traceability of two-tier pipeline behavior without leaking or bloating logs with file bodies; a configurable threshold lets non-interactive callers (pre-commit, CI, AI agents) keep output to actionable warnings/errors.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-07-17</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a run When: logs are inspected Then: each decision and each processor's input/output frame metadata is logged at both tiers and no file body appears.</criteria>
    <criteria>Given: verbose mode When: enabled Then: per-frame, per-processor detail is logged.</criteria>
    <criteria>Given: `ROSETTIFY_PLUGINS_LOG_LEVEL=warn` and no verbose flag When: invoked Then: info/debug diagnostics are suppressed and only warnings/errors are emitted; Given the verbose flag is also set Then it wins and debug detail is emitted regardless of the environment variable.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/logging.ts (pino factory; level precedence: `info` default, then `ROSETTIFY_PLUGINS_LOG_LEVEL`, then verbose which forces `debug`); per-PluginProcessor input/output metadata logging in src/rosettify-plugins/src/generate.ts and per-FileProcessor detail in src/rosettify-plugins/src/plugin-processors/plugin-process-spec-entries.ts (no file content). Covered by src/rosettify-plugins/tests/e2e/sample.e2e.test.ts (verbose emits more log lines than non-verbose).</implementationNotes>
  <depends>FR-CLI-0051, NFR-0010</depends>
</req>

<req id="FR-ARCH-0060" type="FR" level="System" ticketId="315" classification="technical">
  <title>Unrecognized FilenameDirective token rejection</title>
  <statement>The generator shall reject a source filename that carries a directive token it does not recognize, aborting the run with a message naming the offending token, the filename it appeared in, and the accepted tokens. A token is recognized when it is `overwrite`; when it is `target-<id>-only` for one of the IDE target names (DATA-CFG-0003); when it is `ide-<family>-only` for one of the IDE-family keys those names derive, which expands to every target of that IDE (FR-ARCH-0023); when it matches the set-only shape `set-<id>-only` with a non-empty `<id>` (FR-ARCH-0025); or when it matches the profile-only shape `profile-<name>-only` with a non-empty `<name>` (FR-PROF-0030). A bare `<name>-only` token carrying no namespace prefix is not recognized. The closing tilde fence contributes no token and is therefore never subject to this check. Neither a profile-only token's `<name>` nor a set-only token's `<id>` shall be resolved against the profiles or sets that exist: a file scoped to an inactive profile or an unbuilt set is excluded by the corresponding filter, so filename parsing shall depend on neither the profile source directory nor the plugin-set configuration.</statement>
  <rationale>An unrecognized token used to be kept in the condition set and then silently misread: a mistyped target token such as `target-clade-only` still ends with `-only`, so target matching excluded the file from EVERY target and the document vanished from every plugin with no diagnostic. Failing the run loudly is the only outcome that surfaces a typo, and naming the accepted set turns the failure into its own fix. The profile-only and set-only kinds are recognized by shape rather than enumerated because their names are chosen per profile and per configuration and cannot be listed in advance; requiring a non-empty name keeps `profile-only` and `set-only` themselves rejected typos. Resolving either name here would make VFS parsing depend on inputs it otherwise knows nothing about, and would reject a perfectly valid build of a repository that carries files scoped to a profile or set this run does not build.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `policy~clade-only.md` When: parsed Then: the run aborts with a message naming `clade-only`, the filename, and the accepted tokens, because the token carries no namespace prefix.</criteria>
    <criteria>Given: `file~overwrite~.md` When: parsed Then: the token set is `{overwrite}` and the closing fence raises no rejection.</criteria>
    <criteria>Given: `coding-flow~profile-lightweight-only~overwrite~.md` When: parsed Then: both tokens are accepted, with no profile source consulted.</criteria>
    <criteria>Given: `file~profile-only.md` When: parsed Then: the run aborts, because a profile-only token requires a non-empty name.</criteria>
    <criteria>Given: `rule~ide-copilot-only~.md` When: parsed Then: the token is accepted, because an IDE-family key is a valid `ide-<family>-only` token (FR-ARCH-0023).</criteria>
    <criteria>Given: `rule~set-qe-only~.md` When: parsed Then: the token is accepted, with no plugin-set configuration consulted.</criteria>
    <criteria>Given: `rule~set-only~.md` When: parsed Then: the run aborts, because a set-only token requires a non-empty id.</criteria>
    <criteria>Given: a repository carrying profile-scoped files and a build with no active profile When: generated Then: the run completes, and each profile-scoped file is excluded by profile matching rather than rejected as an unknown directive.</criteria>
  </acceptance>
  <depends>FR-ARCH-0020, FR-ARCH-0021, FR-ARCH-0023, FR-ARCH-0025, FR-PROF-0030, DATA-CFG-0003</depends>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: isKnownDirective with KNOWN_DIRECTIVES, SET_ONLY_PATTERN and PROFILE_ONLY_PATTERN
  (src/rosettify-plugins/src/vfs/directives.ts) rejects any token lacking a recognized namespace prefix,
  naming the offending token, the filename and the full allowed list. Verified by direct execution: a
  misspelled clade-only is rejected; set-qe-only and ide-copilot-only are accepted without consulting any
  plugin-set or IDE-family configuration, keeping validation shape-only; matchesProfile excludes
  profile-scoped files rather than erroring when no profile is active.</implementationNotes>
</req>
