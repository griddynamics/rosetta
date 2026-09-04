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
  <statement>Where a target declares templates, the `pluginRenderTemplates()` processor (FR-ARCH-0048) shall render each Handlebars template `VirtualFile` to its sibling output `VirtualFile` with the template suffix removed, using a context of release variables, the per-target bootstrap payload value, and the spec's output folder name (FR-GEN-0011). A document that renders successfully but is not valid JSON shall be a HARD error under FR-GEN-0011, distinct from the warn-and-continue handling this unit applies to render failures. Whether a hook configuration file is produced at all follows from the building set's declaration and is FR-SET-0070; this unit states no rule about it.</statement>
  <rationale>Hook configuration is generated from templates parameterized by release and per-target bootstrap content. Rendering is a distinct pipeline stage, not an out-of-band step.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-09-03</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `hooks/hooks.json.tmpl` and a set declaring a bootstrap flag or a non-empty hook list When: rendered Then: `hooks/hooks.json` is produced.</criteria>
    <criteria>Given: the render context When: inspected Then: it carries exactly the release name, the effective deterministic-hooks value, the bootstrap payload value and the spec's output folder name, every key a template may reference being plumbed explicitly so strict rendering cannot meet an unknown one.</criteria>
    <criteria>Given: a declared template that is missing When: rendering Then: a warning is emitted and the run continues.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented against the corrected text: pluginRenderTemplates
  (src/rosettify-plugins/src/plugin-processors/plugin-render-templates.ts) renders each .tmpl frame to its
  sibling with the suffix removed under Handlebars strict: true, never emits the .tmpl frame itself, and
  warns-and-continues on a missing template or render error - verified, zero .tmpl files reach the output
  tree. The per-set emit decision suppresses both hooks.json and the hooks/ folder
  for a set declaring an empty hook list with bootstrap unset: verified on a real --release r3 build, all
  four add-on sets (workflows, qe, search, modernization) ship zero hooks.json and zero hooks/ directories
  across every IDE target. The render context in generate.ts becomes { release,
  deterministic_hooks, bootstrap_hooks, destination }, every key plumbed explicitly so strict rendering
  cannot meet an unknown one; the hooks_json key left it with the assembler (FR-GEN-0011). Verified:
  generate.ts now plumbs destination into the per-spec render context.</implementationNotes>
  <notes>The entry-less `hooks.json` some targets emit, and why suppressing it is deferred, are recorded on FR-SET-0070. Status moved Approved to Draft: the render context loses the assembled hook-configuration value and gains the spec's output folder name, which changes what this unit's second criterion asserts, and awaits re-approval.</notes>
</req>

<req id="FR-GEN-0011" type="FR" level="System" ticketId="315" classification="technical">
  <title>Literal hook-configuration templates and post-render validation</title>
  <statement>Each emitted hook configuration document shall be produced by its own literal Handlebars template file, whose path in the preserved template tree determines the output document it produces. A template shall carry the document's complete structure — envelope, event keys, matchers, grouping and entry commands — as literal text, together with the release conditional that gates the deterministic hook entries and, where that target delivers bootstrap through session-start hooks, one raw-injection placeholder for the assembled bootstrap payload. A target that emits more than one DISTINCT hook document shall provide one template per distinct document, and no template shall be given its CONTENT by matching its filename — a document's structure comes from the file at that path and from nowhere else. An alternate-name copy of an already-rendered document is the same document at a second path and needs no template of its own (FR-VAR-0031). Whether a spec emits hook configuration AT ALL is a separate, per-set decision (FR-SET-0070) applied uniformly to every hook template of that spec, and may be taken by recognising the hook-template filename. Generator code shall supply VALUES only — the effective deterministic-hooks value, the pre-escaped bootstrap payload fragment, and the spec's output folder name where a target's hook commands must address a fixed install location — and shall not compose the document. Rendering shall be strict, so a placeholder the context does not plumb shall throw rather than render empty. Immediately after rendering, every document whose output path denotes JSON shall be parsed; a document that does not parse shall raise a HARD error naming the target, the output file and the parser message, and shall not be emitted. This validation is distinct from, and stricter than, the warn-and-continue handling FR-GEN-0010 applies to render failures.</statement>
  <rationale>Where a document's structure lives decides whether the generator can tell two documents apart. Holding structure in generator code keyed on target identity cannot express a target that emits two documents of different FORMS — Copilot's and Cursor's marketplace and standalone forms — and collapsing them is silent, because both keep their paths. A literal template per document makes the distinction structural: there is nothing to route, and each file stays diffable against the per-IDE verified specification in `docs/hooks/`. The JSON-validity guarantee that previously justified composing the document in code is obtained instead by parsing what was rendered, which is strictly stronger: it also covers a malformed raw bootstrap injection, which serializing a built object cannot detect. Validity therefore no longer depends on template authoring discipline, and the trailing-comma idiom is checked rather than trusted. The duplication this restores across near-identical templates is accepted deliberately: the probe and command strings are what a reviewer verifies against the IDE guides, so they must be readable in the file that emits them, and collapsing them into a code helper is the move being undone.</rationale>
  <source>Documentation</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-09-03</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a target whose templates produce more than one hook document When: generated Then: each template-rendered document comes from its own template file, and documents of different FORMS are not byte-identical wherever the effective deterministic-hooks value makes them distinguishable; alternate-name copies of a rendered document are governed by FR-VAR-0031 and NFR-0012, not by this criterion.</criteria>
    <criteria>Given: any hook configuration template When: inspected Then: it carries the document's literal structure, and generator code contains no per-target table of event keys, matchers, entry shapes or envelopes.</criteria>
    <criteria>Given: the bootstrap-payload raw-injection placeholder When: rendered Then: the pre-escaped JSON fragment is inserted verbatim, unescaped.</criteria>
    <criteria>Given: a hook configuration template rendered with any combination of an effective deterministic-hooks value, a bootstrap flag and a hook list of any length including zero When: the rendered output is parsed Then: it is valid JSON.</criteria>
    <criteria>Given: a template that renders to malformed JSON When: the generator runs Then: it raises a hard error naming the target and the output file, and emits no document for it.</criteria>
    <criteria>Given: a template referencing a variable the context does not plumb When: rendered Then: rendering throws rather than producing empty text.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: the seven literal hooks.json.tmpl files are restored under
  src/rosettify-plugins/plugins/template-&lt;ide&gt;/ at the paths git ref 492b6a78~1 held them, each
  carrying its own document's structure; plugin-assemble-hooks-json.ts is deleted and the per-set
  frame-drop folded into pluginCopy; PluginSpec.hookLayout is gone. The Copilot plugin-form template is
  the only one carrying a generator-supplied value beyond the release conditional and the bootstrap
  payload: the spec's own output folder name at the fourteen sites where its install-location probes
  name that folder (verified: 14 occurrences), plumbed from spec.destination into the render context in
  generate.ts — without it a non-default set's Copilot plugin would probe another set's directory. Nine
  documents are emitted from seven templates plus two mirrors (FR-VAR-0030, FR-VAR-0031).
  plugin-render-templates.ts JSON.parse's every rendered document whose output path denotes JSON and
  raises a hard error naming the target and the file on failure. spec/hook-layouts.ts is deleted.</implementationNotes>
  <depends>FR-GEN-0010</depends>
  <notes>Validity is a checked property of the rendered text, not a structural consequence of
  serializing a built object. Post-render parsing is strictly the stronger of the two: it also catches a
  malformed raw bootstrap injection, which serializing a built object cannot see, because that fragment
  is spliced in as text after the object would have been serialized. The per-IDE event and matcher shape
  lives in each target's own template, so one declared hook list still serves all seven targets — the
  set declares WHICH modules, each template declares WHERE they bind. Status moved Approved to Draft:
  the obligation changed from assemble-then-serialize to render-then-validate and awaits re-approval.</notes>
</req>
