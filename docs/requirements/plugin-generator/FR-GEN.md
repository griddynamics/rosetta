# plugin-generator — FR: Index Generation and Template Rendering

## Folder index generation

<req id="FR-GEN-0001" type="FR" level="System" ticketId="315" classification="technical">
  <title>Generate folder index</title>
  <statement>Where a target declares generated indexes for a folder, the `pluginGenerateIndexes()` processor (FR-ARCH-0047) shall produce an `INDEX.md` `VirtualFile` in that folder listing each document with its description, built from the final post-`fileRename()` target paths (FR-ARCH-0038) so the listing already carries correct paths and requires no reference rewriting.</statement>
  <rationale>Agents use the index as a table of contents to discover available rules and workflows. The index is a generated artifact with its own pipeline stage, not an out-of-band write; generating it against final paths means it never lists a pre-rename path that would need fixing.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a folder of documents When: indexed Then: `INDEX.md` lists each non-index document with `folder/filename` and its description.</criteria>
    <criteria>Given: a folder with no qualifying documents When: indexed Then: no index file is written.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented as a retained, deliberately unused capability: pluginGenerateIndexes
  (src/rosettify-plugins/src/plugin-processors/plugin-generate-indexes.ts) builds an INDEX.md VirtualFile
  per IndexDecl from the final post-fileRename target paths, is composed into the pipeline by
  buildPipeline in src/rosettify-plugins/src/spec/targets.ts, and is covered by
  tests/unit/plugin-processors/plugin-generate-indexes.test.ts. No plugin set declares an index - indexes
  is empty on every spec and src/rosettify-plugins/plugins.json carries no index key - so no INDEX.md
  reaches any output, verified as zero INDEX.md files across a real --release r3 build of all 49 folders.
  Retained capability, not dead code: an index is generated per plugin and would misrepresent a
  multi-plugin install, so the sets declare none while the capability stays ready to be declared again.</implementationNotes>
  <notes>Dormant since 2026-09-01 (ticket #315): the capability is retained in full, but no plugin set declares a generated index, so no `PluginSpec` composes `pluginGenerateIndexes()` and no `INDEX.md` reaches any output. An index is generated per plugin and could never list another plugin's documents, which is why the split sets declare none. The unit stays Approved so the capability may be declared again without re-authoring it.</notes>
</req>

<req id="FR-GEN-0002" type="FR" level="System" ticketId="315" classification="technical">
  <title>Description source and fallback</title>
  <statement>The generator shall take each index entry's description from the document's frontmatter description field, falling back to a title derived from the filename when absent.</statement>
  <rationale>Descriptions let agents understand a document's purpose from the index alone.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a document with a frontmatter description When: indexed Then: that description is used.</criteria>
    <criteria>Given: a document without one When: indexed Then: a title-cased name derived from the filename stem is used.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented as a retained, deliberately unused capability: the description resolution and filename-stem
  fallback live in pluginGenerateIndexes
  (src/rosettify-plugins/src/plugin-processors/plugin-generate-indexes.ts) with the title derivation in
  src/rosettify-plugins/src/serialize/markdown-index.ts, covered by
  tests/unit/plugin-processors/plugin-generate-indexes.test.ts. No set declares an index, so no INDEX.md
  reaches any output (zero across all 49 generated folders). See FR-GEN-0001 for the dormancy rationale.</implementationNotes>
  <notes>Dormant since 2026-09-01 (ticket #315): the capability is retained in full, but no plugin set declares a generated index, so no `PluginSpec` composes `pluginGenerateIndexes()` and no `INDEX.md` reaches any output. An index is generated per plugin and could never list another plugin's documents, which is why the split sets declare none. The unit stays Approved so the capability may be declared again without re-authoring it.</notes>
</req>

<req id="FR-GEN-0003" type="FR" level="System" ticketId="315" classification="technical">
  <title>Tag-filtered index membership</title>
  <statement>Where an index requires a tag, the generator shall include a document when that tag is an exact member of the document's parsed frontmatter tag set (exact matching, FR-ARCH-0037).</statement>
  <rationale>The workflow index must list only workflow entry documents, excluding per-phase files. Exact membership prevents a required tag `workflow` from spuriously matching a tag like `workflow-helper`.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a workflows folder containing entry and phase files When: indexed with required tag `workflow` Then: only entry files appear.</criteria>
    <criteria>Given: a document tagged `workflow-helper` and required tag `workflow` When: membership is tested Then: it is excluded (exact membership, not substring).</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented as a retained, deliberately unused capability: exact tag-set membership is applied by
  pluginGenerateIndexes (src/rosettify-plugins/src/plugin-processors/plugin-generate-indexes.ts) against
  the parsed frontmatter tag set per FR-ARCH-0037, so a required tag workflow does not match
  workflow-helper; covered by tests/unit/plugin-processors/plugin-generate-indexes.test.ts. No set
  declares an index, so the filter never runs in a shipped build. See FR-GEN-0001 for the dormancy
  rationale.</implementationNotes>
  <depends>FR-ARCH-0037</depends>
  <notes>Dormant since 2026-09-01 (ticket #315): the capability is retained in full, but no plugin set declares a generated index, so no `PluginSpec` composes `pluginGenerateIndexes()` and no `INDEX.md` reaches any output. An index is generated per plugin and could never list another plugin's documents, which is why the split sets declare none. The unit stays Approved so the capability may be declared again without re-authoring it.</notes>
</req>

<req id="FR-GEN-0004" type="FR" level="System" ticketId="315" classification="technical">
  <title>Index heading normalization</title>
  <statement>The generator shall title a generated index by a canonical display name, mapping workflow-equivalent folder names (`commands`, `prompts`) to the same display name as `workflows`.</statement>
  <rationale>The workflow index must read identically regardless of the IDE-specific physical folder name.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: folder `commands` or `prompts` When: indexed Then: the heading reads `# Rosetta Workflows Index`.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented as a retained, deliberately unused capability: canonical heading derivation, mapping the
  workflow-equivalent folder names commands and prompts onto one display name, lives in
  src/rosettify-plugins/src/serialize/markdown-index.ts and is applied by pluginGenerateIndexes; covered
  by tests/unit/plugin-processors/plugin-generate-indexes.test.ts. No set declares an index, so no heading
  is ever emitted in a shipped build. See FR-GEN-0001 for the dormancy rationale.</implementationNotes>
  <notes>Dormant since 2026-09-01 (ticket #315): the capability is retained in full, but no plugin set declares a generated index, so no `PluginSpec` composes `pluginGenerateIndexes()` and no `INDEX.md` reaches any output. An index is generated per plugin and could never list another plugin's documents, which is why the split sets declare none. The unit stays Approved so the capability may be declared again without re-authoring it.</notes>
</req>

## Template rendering

<req id="FR-GEN-0010" type="FR" level="System" ticketId="315" classification="technical">
  <title>Render Handlebars templates</title>
  <statement>Where a target declares templates, the `pluginRenderTemplates()` processor (FR-ARCH-0048) shall render each Handlebars template `VirtualFile` to its sibling output `VirtualFile` with the template suffix removed, using a context of release variables, the per-target bootstrap payload value, and the pre-serialized hook configuration the assembler publishes (FR-GEN-0011); the set's bootstrap flag and hook list reach the output through that assembled value rather than as template variables (FR-SET-0070, DATA-CFG-0007). Whether a hook configuration file is produced at all follows from the building set's declaration and is FR-SET-0070; this unit states no rule about it.</statement>
  <rationale>Hook configuration is generated from templates parameterized by release and per-target bootstrap content. Rendering is a distinct pipeline stage, not an out-of-band step.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `hooks/hooks.json.tmpl` and a set declaring a bootstrap flag or a non-empty hook list When: rendered Then: `hooks/hooks.json` is produced.</criteria>
    <criteria>Given: the render context When: inspected Then: it carries exactly the release name, the effective deterministic-hooks value, the bootstrap payload value and the assembled hook-configuration value, every key a template may reference being plumbed explicitly so strict rendering cannot meet an unknown one.</criteria>
    <criteria>Given: a declared template that is missing When: rendering Then: a warning is emitted and the run continues.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented against the corrected text: pluginRenderTemplates
  (src/rosettify-plugins/src/plugin-processors/plugin-render-templates.ts) renders each .tmpl frame to its
  sibling with the suffix removed under Handlebars strict: true, never emits the .tmpl frame itself, and
  warns-and-continues on a missing template or render error - verified, zero .tmpl files reach the output
  tree. emitsHooksJson (plugin-assemble-hooks-json.ts) suppresses both hooks.json and the hooks/ folder
  for a set declaring an empty hook list with bootstrap unset: verified on a real --release r3 build, all
  four add-on sets (workflows, qe, search, modernization) ship zero hooks.json and zero hooks/ directories
  across every IDE target. The render context in generate.ts is baseTemplateContext = { release,
  deterministic_hooks, bootstrap_hooks, hooks_json }, every key plumbed explicitly so strict rendering
  cannot meet an unknown one.</implementationNotes>
  <notes>The entry-less `hooks.json` some targets emit, and why suppressing it is deferred, are recorded on FR-SET-0070.</notes>
</req>

<req id="FR-GEN-0011" type="FR" level="System" ticketId="315" classification="technical">
  <title>Assembled hook configuration and raw injection</title>
  <statement>The hook configuration document shall be assembled in generator code and injected into its template as one pre-serialized value, not composed by template control flow. The `pluginAssembleHooksJson()` processor shall build the complete document from the building set's declared hook list and bootstrap flag (FR-SET-0070) resolved against that target's `HOOK_LAYOUTS` bindings, serialize it with `JSON.stringify`, and publish it as the single `hooks_json` template value; the template shall then insert that value raw (unescaped). A hook-configuration template shall carry exactly one raw-injection placeholder and no control flow: no conditional block, no iteration, and no literal hook entry. Bootstrap payload values shall likewise be injected raw, as pre-escaped JSON fragments. Rendering shall be strict, so a placeholder the context does not plumb shall throw rather than render empty. The rendered configuration shall be valid JSON for every combination of an effective deterministic-hooks value, a bootstrap flag, and a hook list of any length including zero — a property that follows from serializing a built object rather than from template authoring discipline.</statement>
  <rationale>Six near-duplicate templates previously relied on a trailing-comma idiom to stay valid JSON while conditionally emitting hook entries, which made malformed output a one-character authoring mistake. Serializing a built object makes malformed output structurally impossible and collapses those templates to a single shared line, so adding a set or an IDE changes data rather than template text. The placeholder is retained rather than writing the file directly because rendering stays the one uniform stage that turns preserved `.tmpl` frames into output, and strict rendering keeps an unplumbed variable loud instead of silently empty.</rationale>
  <source>Documentation</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a raw-injection placeholder When: rendered Then: the JSON fragment is inserted verbatim, unescaped.</criteria>
    <criteria>Given: any shipped hook-configuration template When: inspected Then: it carries a single raw placeholder and contains no conditional block, no iteration and no literal hook entry.</criteria>
    <criteria>Given: sets declaring hook lists of differing length rendered from the same template When: compared Then: each result carries exactly its own entries, produced by the assembler rather than by template iteration or literals.</criteria>
    <criteria>Given: any combination of an effective deterministic-hooks value, a bootstrap flag and a hook list of any length including zero When: rendered Then: the result is valid JSON.</criteria>
    <criteria>Given: a placeholder the render context does not plumb When: rendered Then: rendering throws rather than emitting an empty value.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/plugin-processors/plugin-assemble-hooks-json.ts buildHooksDocument builds the document from spec.hookModules, spec.bootstrap and the target's HOOK_LAYOUTS bindings, and pluginAssembleHooksJson publishes JSON.stringify(doc, null, 2) under HOOKS_JSON_KEY; emitsHooksJson drops the frame entirely when a set would render an empty configuration. src/rosettify-plugins/src/plugin-processors/plugin-render-templates.ts renders with Handlebars strict: true and never emits the .tmpl frame. Verified: all 7 shipped hooks.json.tmpl files are the single line {{{hooks_json}}}, with zero occurrences of {{#if}} or {{#each}} in any of them; across the generated tree 90 hooks.json files all parse as valid JSON, with per-file entry counts of 0, 1, 3, 8, 10, 12, 15 and 18 — proving content varies by set and IDE while the template is identical; and zero .tmpl files leak into output.</implementationNotes>
  <depends>DATA-CFG-0008</depends>
  <notes>The assembler is the reason validity is structural rather than editorial. `HOOK_LAYOUTS` (src/rosettify-plugins/src/spec/hook-layouts.ts) owns the per-IDE event and matcher shape, so one declared hook list serves all seven targets.</notes>
</req>
