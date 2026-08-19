# plugin-generator — FR: Preserved-File Seeding, Tree Reset, Copy, Normalization, Renames

> These units define the behaviors of `npx -y rosettify-plugins@latest`, re-expressed on the unified two-tier target architecture (FR-ARCH). The **how** is normative in FR-ARCH's VFS + processor model: copy = `fileRead()`→`pluginWrite()`; model normalization = per-vocabulary model-normalization processors (FR-ARCH-0046); path changes = `fileRename()` (path only); in-body reference rewriting = `pluginRewriteReferences()` (content only, FR-ARCH-0049); the output wipe and preserved-file seeding are the `pluginCleanup()` and `pluginCopy()` plugin processors at the head of the pipeline (FR-ARCH-0035/0052/0053). There are no `pre-copy`/`pre-move` passes: a duplicated folder is an additional `SpecEntry`, a relocation is a `SpecEntry` `target` and/or `fileRename()`.

## Preserved-file seeding

The files a target keeps but never generates — the IDE manifest, hook templates, IDE config-folder contents, any `.mcp.json` — have a committed source under `src/rosettify-plugins/plugins/<target>/` (DATA-CFG-0005). The `pluginCopy()` processor (FR-ARCH-0053) copies that source into the output before generating instruction-derived content on top, so a target can be produced into a clean or empty output directory.

<req id="FR-SEED-0001" type="FR" level="System" ticketId="" classification="technical">
  <title>Seed preserved files before generation</title>
  <statement>When generating a target, the `pluginCopy()` processor (FR-ARCH-0053) shall copy that target's preserved-file source from `src/rosettify-plugins/plugins/<target>/` into the target output at the mirrored output-relative paths, before any instruction-derived content is produced for that target.</statement>
  <rationale>The preserved files are an input with no instruction-source derivation; copying them first makes generation self-contained and reproducible into a clean output directory instead of depending on files already committed in the output tree.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an empty target output directory When: the target is generated Then: every preserved file from `src/rosettify-plugins/plugins/<target>/` is present at its output-relative path and the generated content is present on top.</criteria>
    <criteria>Given: the seeding step When: it runs Then: it completes before any instruction-derived content is written for that target.</criteria>
    <criteria>Given: a clean environment with only the instruction source and `src/rosettify-plugins/plugins/` present When: the generator runs Then: each target output is complete with no pre-existing files required in the output tree.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>DATA-CFG-0005, FR-COPY-0001, FR-COPY-0010</depends>
  <notes>Resolves the previously implicit precondition that manifests and `*.tmpl` templates were already committed in the output tree (former ASSUMPTIONS AC-3 scope; see AC-3a). Hook templates seeded here are rendered in place by FR-GEN template rendering; hook bundles are synced separately by FR-HOOK.</notes>
</req>

<req id="FR-SEED-0002" type="FR" level="System" ticketId="" classification="technical">
  <title>Standalone preserved-file derivation</title>
  <statement>A standalone target shall source its preserved files from its parent target's preserved-file source (`src/rosettify-plugins/plugins/<parent>/`) rather than from an independent config folder, taking the standalone-form hook template and the parent manifest version, and shall not retain the parent's marketplace-only preserved files.</statement>
  <rationale>A standalone has no independent IDE config folder; its only preserved inputs are the standalone-form template and the version, both owned by the parent, consistent with the standalone transform chain.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: core-cursor-standalone When: generated Then: its standalone-form hook configuration derives from the parent `core-cursor` standalone-form template and its manifest version equals the parent manifest version.</criteria>
    <criteria>Given: core-copilot-standalone When: generated Then: it carries no parent marketplace-only preserved config folder and its manifest version equals the parent manifest version.</criteria>
    <criteria>Given: a standalone target When: generated Then: no independent `src/rosettify-plugins/plugins/<standalone>/` config folder is required.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>DATA-CFG-0005, FR-SEED-0001, FR-VAR-0071</depends>
  <notes>Reconciles with the standalone output units FR-VAR-0050/0051/0060, which depend on this unit (one-way: those units consume this seeding behavior). Parent mapping: core-cursor-standalone ← core-cursor; core-copilot-standalone ← core-copilot. Standalone-form hook template for cursor is the parent's root `hooks.json.tmpl`; copilot-standalone's nested hooks derive from the parent copilot hook template. Manifest version per FR-VAR-0060.</notes>
</req>

## Reset

<req id="FR-COPY-0001" type="FR" level="System" ticketId="" classification="technical">
  <title>Reset output (pluginCleanup)</title>
  <statement>Before generating a target's content, the `pluginCleanup()` processor (FR-ARCH-0052) shall empty the target's output location entirely and create it if absent. Nothing is kept across the wipe; the preserved files are re-established immediately afterward by `pluginCopy()` (FR-COPY/FR-ARCH-0053). Removal of an individual prospective output during generation is expressed instead by a processor setting `target_contents` to `null` (FR-ARCH-0036).</statement>
  <rationale>Each run starts from a clean slate, made reproducible by wipe-then-seed. Because `pluginCopy()` re-seeds the preserved files every run from their committed source, there is no need for anything to "survive" the wipe — which removes the old dependency on preserved files already sitting in the output tree.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a populated target output When: `pluginCleanup()` runs Then: the output is emptied.</criteria>
    <criteria>Given: a non-existent output When: `pluginCleanup()` runs Then: the directory is created and the run proceeds.</criteria>
    <criteria>Given: cleanup followed by `pluginCopy()` When: the run continues Then: the preserved files are present (re-seeded), not surviving from a prior run.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>DATA-CFG-0002, DATA-CFG-0005, FR-ARCH-0052, FR-ARCH-0053</depends>
</req>

## Copy and content adaptation

<req id="FR-COPY-0010" type="FR" level="System" ticketId="" classification="technical">
  <title>Copy instruction source into target</title>
  <statement>The generator shall materialize every file from the resolved instruction source into the target output via the pipeline's `fileRead()`→`pluginWrite()` content I/O (FR-ARCH-0033) — binary files passing through unchanged — preserving relative structure except where `fileRename()` applies, and shall skip operating-system artifact files.</statement>
  <rationale>The instruction content is the payload of every plugin. "Copy" is just `fileRead()` then `pluginWrite()`; there is no separate bulk-copy routine that also mutates content.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a source tree When: copied Then: all non-artifact files appear in the target at their (possibly renamed) paths.</criteria>
    <criteria>Given: a `.DS_Store` file in source When: copied Then: it is omitted.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-COPY-0011" type="FR" level="System" ticketId="" classification="technical">
  <title>Exclude designated source files</title>
  <statement>The generator shall not emit source files matched by a `SpecEntry`'s `exclude` list (an array of VFS paths or path globs, e.g. `templates/shell-schemas/**`) into the target — `pluginProcessSpecEntries()` creates no frame for them (FR-ARCH-0054). The excluded set is: the legacy MCP-mode rules `rules/bootstrap.md` and `rules/local-files-mode.md`; and the entire `templates/shell-schemas/` folder (`agent-shell.md`, `skill-shell.md`, `workflow-shell.md` — authoring schemas not needed in any plugin). Exclusion is data on the entry (composing with `--domain` overlays) and requires no source rename — the source files remain unchanged because MCP and other instructions still reference them.</statement>
  <rationale>Certain files are delivered via hooks, are legacy, or are authoring-only schemas (`templates/shell-schemas/*` describe frontmatter fields for authors and are not needed by any IDE plugin), but the source files cannot be renamed or removed because MCP serves them and instruction text references them. A data `exclude` list (supporting whole-folder globs) omits them at generation without touching the source.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-05</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `rules/bootstrap.md` or `rules/local-files-mode.md` listed in `exclude` When: generated Then: it is absent from the target and the source file is unchanged.</criteria>
    <criteria>Given: the glob `templates/shell-schemas/**` in `exclude` When: any target is generated Then: no `templates/shell-schemas/` files appear in that target's output and the source files are unchanged.</criteria>
    <criteria>Given: an overlay domain adding a path to `exclude` When: generated Then: that path is omitted for that target.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: generator code must add `templates/shell-schemas/**` to the templates SpecEntry exclude (RECON-6). templates/shell-schemas exclusion added 2026-06-05 per owner instruction (authoring-only schemas, not needed in plugins); exclude now supports folder globs; pending owner review.</implementationNotes>
  <depends>FR-ARCH-0002, FR-ARCH-0054</depends>
</req>

<req id="FR-COPY-0012" type="FR" level="System" ticketId="" classification="technical">
  <title>Preserve file timestamps and metadata</title>
  <statement>The generator shall preserve source file metadata (timestamps) on copied files.</statement>
  <rationale>Stable metadata supports change detection downstream.</rationale>
  <source>Sources</source>
  <priority>Could</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a copied file When: inspected Then: its modification time matches the source.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Model normalization

<req id="FR-COPY-0020" type="FR" level="System" ticketId="" classification="technical">
  <title>Normalize model identifiers per IDE</title>
  <statement>Where a target requires model normalization, the target's own model-normalization `FileProcessor` (the per-vocabulary case-specific processor composed into its pipeline, FR-ARCH-0046) shall rewrite each markdown document's frontmatter `model:` value into that target's effective `ModelVocabulary` — the built-in vocabulary, or, when a profile supplies a per-target model-override block for that target, that block in its place — using the IDE's selection strategy (see FR-COPY-0021 for Claude; FR-COPY-0022 for Codex; first-model-overall for Cursor and Copilot), and shall leave content without a model value unchanged. The selection strategy is unchanged; only the map consulted after selection changes. When applying the Cursor or Copilot first-model-overall strategy, a candidate token absent from the effective map shall be skipped as if it were not present and the scan shall continue to the next candidate. When no candidate survives, the no-survivor outcome depends on whether a profile supplies a per-target override block for this target: with no such block (the unprofiled path) the unmapped token shall pass through unchanged, as today; with an active block (the profiled path) the frontmatter `model:` line shall be dropped, as governed by FR-PROF-0011.</statement>
  <rationale>Each IDE accepts only its own model identifier format. Normalization is one explicit pipeline stage, not a side effect hidden inside copying. The selection strategy differs per IDE: Claude scans for the first claude-compatible model; Codex scans for the first gpt-* model; Cursor and Copilot take the first model overall.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-08-19</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `model: claude-4.8-opus-high, gpt-5.5-high` for Cursor When: normalized Then: the value becomes `claude-opus-4-8` (first model overall).</criteria>
    <criteria>Given: a Cursor profile whose `core-cursor` override block maps `claude-opus-4-8`→`gpt-5.4` and `model: claude-opus-4-8` When: normalized Then: the value becomes `gpt-5.4` (mapped through the effective override block; selection strategy unchanged).</criteria>
    <criteria>Given: `model: claude-opus-4-8, gpt-5.4` for Cursor and an effective map that contains `gpt-5.4` but not `claude-opus-4-8` When: normalized Then: `claude-opus-4-8` is skipped and the value becomes `gpt-5.4` (first candidate present in the effective map).</criteria>
    <criteria>Given: `model: gpt-5.4-medium, gemini-3.1-pro-preview, claude-5-sonnet` for Cursor When: normalized Then: the value becomes `gpt-5.4` (first model overall).</criteria>
    <criteria>Given: `model: claude-opus-4-8, gpt-5.4` for Cursor or Copilot, no active override block for this target, and neither token present in the effective map When: normalized Then: the unmapped token passes through unchanged (unprofiled no-survivor behavior, today's behavior).</criteria>
    <criteria>Given: an active `core-cursor` or `core-copilot` override block for this target under which no candidate survives mapping When: normalized Then: the `model:` line is dropped (profiled no-survivor behavior, per FR-PROF-0011).</criteria>
    <criteria>Given: a document without frontmatter When: processed Then: content is unchanged.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/file-processors/file-normalize-{claude,cursor,copilot,codex}-models.ts thread ctx.spec.modelVocabulary.map + .exhaustive into the normalize functions; the effective map (built-in or profile block) is consulted, an absent candidate is skipped-and-continued, and MODEL_DROP drops the model: line on the profiled path via file-normalize-models.ts. Tests: tests/unit/file-processors/file-normalize-*-models.test.ts, tests/unit/spec/model-maps.test.ts.</implementationNotes>
  <depends>DATA-CFG-0004, FR-ARCH-0046, FR-COPY-0021, FR-COPY-0022</depends>
</req>

<req id="FR-COPY-0021" type="FR" level="System" ticketId="" classification="technical">
  <title>Claude model normalization: scan for first claude-compatible model</title>
  <statement>For the Claude vocabulary, the Claude model-normalization processor shall scan the comma-separated `model:` list for the first claude-compatible token — defined as a token that either starts with `claude-` (case-insensitive) or contains the substring `opus`, `sonnet`, or `haiku` (case-insensitive). A matching token that contains a recognized tier substring (`opus`, `sonnet`, or `haiku`) shall be mapped through the effective `ModelVocabulary` — the built-in `CLAUDE_CODE_MAP`, or the active profile's `core-claude` override block keyed by the same `opus`/`sonnet`/`haiku` keys — to its Claude model value (built-in values `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5` respectively); a matching token that starts with `claude-` but contains none of the tier substrings shall map to `inherit`. A claude-compatible token whose tier key is absent from the effective map shall be skipped as if it were not present and the scan shall continue to the next token. When no claude-compatible token survives, the no-survivor outcome depends on whether a profile supplies a `core-claude` override block for this target: with no such block (the unprofiled path) the processor shall fall back to `inherit`; with an active block (the profiled path) the frontmatter `model:` line shall be dropped, as governed by FR-PROF-0011. The scan shall skip any leading non-claude tokens (e.g. `gpt-*`, `gemini-*`) without mapping them.</statement>
  <rationale>Claude Code accepts full model IDs (`claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5`) and `inherit`. Agents may list a preferred non-claude model first (e.g. reviewer lists `gpt-5.4-medium` first); Claude normalization must skip non-claude entries and find the first claude-compatible one. Target output: `model: gpt-5.4-medium, gemini-3.1-pro-preview, claude-5-sonnet` → `claude-sonnet-5` (reviewer and validator agents).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-08-19</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `model: claude-4.8-opus-high, gpt-5.5-high` When: normalized for Claude Then: result is `claude-opus-4-8` (first token contains `opus`).</criteria>
    <criteria>Given: `model: claude-4.8-opus-high, claude-5-sonnet` and an effective `core-claude` override block that contains key `sonnet` but not key `opus` When: normalized for Claude Then: the `opus` candidate is skipped and the result is the block's `sonnet` value.</criteria>
    <criteria>Given: an active `core-claude` override block mapping `opus`→`claude-sonnet-5` and `model: claude-4.8-opus-high` When: normalized for Claude Then: the result is `claude-sonnet-5` (mapped through the effective block; scan strategy unchanged).</criteria>
    <criteria>Given: `model: gpt-5.4-medium, gemini-3.1-pro-preview, claude-5-sonnet` When: normalized for Claude Then: result is `claude-sonnet-5` (scans past gpt-* and gemini-*, finds first claude-* token containing `sonnet`).</criteria>
    <criteria>Given: `model: claude-4.5-haiku, gpt-5.4-low` When: normalized for Claude Then: result is `claude-haiku-4-5`.</criteria>
    <criteria>Given: `model: claude-sonnet-5, gpt-5.4-medium` When: normalized for Claude Then: result is `claude-sonnet-5`.</criteria>
    <criteria>Given: `model: gpt-5.5-high, gemini-3.1-pro-high` (no claude token) and no active `core-claude` override block for this target When: normalized for Claude Then: result is `inherit` (unprofiled no-survivor behavior).</criteria>
    <criteria>Given: an active `core-claude` override block for this target under which no claude-compatible token survives mapping When: normalized for Claude Then: the `model:` line is dropped (profiled no-survivor behavior, per FR-PROF-0011).</criteria>
    <criteria>Given: any model token present in instruction source frontmatter for a currently supported model When: normalized by any of the Claude Code, Cursor, or Copilot vocabularies Then: each vocabulary produces the current authoritative model identifier for that IDE in its expected format; no vocabulary produces a stale model identifier for a currently supported model.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/model-maps.ts (normalizeClaude(field, map, exhaustive): scan for the first claude-compatible token, family key opus/sonnet/haiku read from the effective map, skip-and-continue on an absent tier key, non-exhaustive fallback inherit, exhaustive no-survivor MODEL_DROP); consumed by src/rosettify-plugins/src/file-processors/file-normalize-claude-models.ts. Tests: tests/unit/spec/model-maps.test.ts, tests/unit/file-processors/file-normalize-claude-models.test.ts.</implementationNotes>
  <notes>Concrete target examples (r3): architect `claude-4.8-opus-high, gpt-5.5-high, gemini-3.1-pro-high` → `claude-opus-4-8`; reviewer `gpt-5.4-medium, gemini-3.1-pro-preview, claude-5-sonnet` → `claude-sonnet-5`; validator `gpt-5.4-medium, gemini-3.1-pro-preview, claude-5-sonnet` → `claude-sonnet-5`; executor `claude-4.5-haiku, gpt-5.4-low, gemini-3-flash` → `claude-haiku-4-5`.</notes>
</req>

<req id="FR-COPY-0022" type="FR" level="System" ticketId="" classification="technical">
  <title>Codex model and reasoning-effort split</title>
  <statement>For the Codex vocabulary, the generator shall select the first `gpt-*` model from a comma-separated list, map the selected token through the effective `ModelVocabulary` (the built-in Codex map, or the active profile's `core-codex` override block when present) to its replacement `gpt-*` token — skipping a `gpt-*` candidate that is absent from the effective map as if it were not present and continuing the scan to the next candidate — then separate a trailing reasoning-effort suffix (`-high`, `-medium`, or `-low`) into a distinct effort value when present, write both `model: <id>` and `model_reasoning_effort: <effort>` when a suffix is present, write only `model: <id>` when no suffix is present (no default effort is substituted), and emit no model fields when no qualifying token is found. When a `gpt-*` token is selected but no candidate survives mapping (each skipped as absent from the effective map), the no-survivor outcome depends on whether a profile supplies a `core-codex` override block for this target: with no such block (the unprofiled path) no model fields shall be emitted, as today; with an active block (the profiled path) the frontmatter `model:` line shall be dropped, as governed by FR-PROF-0011.</statement>
  <rationale>Codex requires an OpenAI model and a separate reasoning-effort field when effort is explicit. Requiring an explicit effort suffix in source is a content authoring contract; the generator must not silently substitute a default value because different agents carry different intended effort levels.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-08-19</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `gpt-5.3-codex-high` When: normalized for Codex Then: model is `gpt-5.3-codex` and effort is `high`.</criteria>
    <criteria>Given: an active `core-codex` override block mapping `gpt-5.5-high`→`gpt-5.4-medium` and `model: gpt-5.5-high` When: normalized for Codex Then: model is `gpt-5.4` and effort is `medium` (mapped through the effective block, then effort split).</criteria>
    <criteria>Given: `model: claude-opus-4-8, gpt-5.6-experimental, gpt-5.4` for Codex and an effective map that contains `gpt-5.4` but not `gpt-5.6-experimental` When: normalized for Codex Then: `gpt-5.6-experimental` is skipped and model is `gpt-5.4` (first `gpt-*` candidate present in the effective map).</criteria>
    <criteria>Given: `gpt-5.4` (no effort suffix) When: normalized for Codex Then: the output contains `model: gpt-5.4` and does not contain `model_reasoning_effort`.</criteria>
    <criteria>Given: a value with no `gpt-` entry When: normalized for Codex Then: no model fields are produced.</criteria>
    <criteria>Given: `model: gpt-5.6-experimental` for Codex, no active override block for this target, and the token absent from the effective map When: normalized for Codex Then: no model fields are produced (unprofiled no-survivor behavior, today's behavior).</criteria>
    <criteria>Given: an active `core-codex` override block for this target under which no `gpt-*` candidate survives mapping When: normalized for Codex Then: the `model:` line is dropped (profiled no-survivor behavior, per FR-PROF-0011).</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/spec/model-maps.ts (normalizeCodex(field, map, exhaustive): first gpt-* selection through the effective map, skip-and-continue on an absent candidate, trailing effort suffix split into model_reasoning_effort with no default substituted, MODEL_DROP on the exhaustive no-survivor path); consumed at both Codex call sites (file-normalize-codex-models.ts, file-codex-agent.ts). Tests: tests/unit/spec/model-maps.test.ts, tests/unit/file-processors/file-normalize-codex-models.test.ts.</implementationNotes>
</req>

## Renames and reference rewriting

<req id="FR-COPY-0030" type="FR" level="System" ticketId="" classification="technical">
  <title>Folder renames</title>
  <statement>Where a target declares folder renames, the `fileRename()` processor (FR-ARCH-0043) shall place affected files under the renamed top-level folder in the output by changing the target path only.</statement>
  <rationale>IDEs expect workflow content under IDE-specific folder names (e.g. `commands`, `prompts`). The path change is `fileRename()`'s sole responsibility; the matching in-body reference updates are `pluginRewriteReferences()` (FR-COPY-0032).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rename `workflows`→`commands` When: generated Then: source `workflows/x.md` lands at `commands/x.md`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0043</depends>
</req>

<req id="FR-COPY-0031" type="FR" level="System" ticketId="" classification="technical">
  <title>Pattern-based file renames</title>
  <statement>Where a target declares file-rename patterns (including the agent-file suffix rename), the `fileRename()` processor (FR-ARCH-0043) shall set the matching file's target path according to the pattern's replacement, changing the path only.</statement>
  <rationale>IDEs require specific file suffixes (e.g. `.mdc`, `.prompt.md`, `.agent.md`). The agent rename (`agents/x.md`→`agents/x.agent.md`) is one such pattern, not a separate special case.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: pattern `rules/(.+)\.md`→`\1.mdc` When: generated Then: `rules/x.md` lands at `rules/x.mdc`.</criteria>
    <criteria>Given: a Copilot agent file When: generated Then: `agents/x.md` lands at `agents/x.agent.md`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0043</depends>
</req>

<req id="FR-COPY-0032" type="FR" level="System" ticketId="" classification="technical">
  <title>Precise content reference rewriting (separate from rename)</title>
  <statement>When a target renames folders or files, the `pluginRewriteReferences()` processor (FR-ARCH-0049) — a content-only stage distinct from `fileRename()` — updates the hand-authored cross-references in a document body to the renamed paths, using the target's rename map (the `fileRename()` decisions over the whole VFS, FR-ARCH-0049) and exact complete-token matching (FR-ARCH-0037). It updates complete path references, including bounded bare-folder references (`<from>/`→`<to>/`), and changes content only; the document's own path is set by `fileRename()`. Generated content needs no such update — it is produced against final paths (FR-ARCH-0038).</statement>
  <rationale>Instruction text references other instruction files by path; those references follow the file to its renamed location. This is a **separate processor from `fileRename()`**: setting a file's path and updating another file's body are two responsibilities. Fusing them (as the original `copy_core_tree` did) is the SRP violation this split removes.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a reference `workflows/coding-flow.md` and rename to `commands` When: rewritten Then: it becomes `commands/coding-flow.md` and the document's own target path is unaffected by this processor.</criteria>
    <criteria>Given: a bare reference `workflows/` When: rewritten Then: it becomes `commands/`.</criteria>
    <criteria>Given: a reference to an excluded, renamed source path When: rewritten Then: it follows the rename.</criteria>
    <criteria>Given: an unrelated word containing the folder name as a substring When: rewritten Then: it is unchanged.</criteria>
    <criteria>Given: the prose word "agents" with an `agents`→`.codex/agents` rename in effect When: rewritten Then: the word is unchanged; only complete `agents/<path>` references change.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0049, FR-ARCH-0037, FR-COPY-0030, FR-COPY-0031</depends>
</req>

<req id="FR-COPY-0033" type="FR" level="System" ticketId="" classification="technical">
  <title>Alternate-name folder duplication (as a SpecEntry, not a pre-pass)</title>
  <statement>Where a target needs a duplicate of a source folder under an alternate output name, the generator shall express it as an additional `SpecEntry` (source glob → alternate target folder) whose `FileProcessor` pipeline applies the target's model-normalization processor only (with `fileRead` ingress / `pluginWrite` egress) — no `fileRename()` and, since it is generated content with no hand-authored cross-references to fix, no involvement of `pluginRewriteReferences()`. There shall be no separate "pre-copy" pass.</statement>
  <rationale>A second source→target mapping is exactly a `SpecEntry`; modeling it as a one-off imperative pre-pass (the original `pre_copy_folders`) broke uniformity. The pipeline omitting `pluginRewriteReferences()`/`fileRename()` reproduces the original's "model normalization only" behavior for these copies.</rationale>
  <source>Sources</source>
  <priority>Could</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an alternate-name `SpecEntry` When: generated Then: the alternate-named folder exists with frontmatter models normalized and no reference rewriting applied.</criteria>
    <criteria>Given: the generation design When: inspected Then: this duplication is a `SpecEntry`, not a pre-pass.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: applies the target's per-vocabulary model-normalization processor rather than a single `fileNormalizeModels`.</implementationNotes>
  <depends>FR-ARCH-0002, FR-ARCH-0035</depends>
</req>

<req id="FR-COPY-0034" type="FR" level="System" ticketId="" classification="technical">
  <title>File relocation (as a rename, not a pre-move pass)</title>
  <statement>Where a target relocates matching files into a destination subfolder under a renamed filename, it shall do so with the `fileRename()` processor (FR-ARCH-0043) setting the target path (folder + filename) of the affected `VirtualFile`s. There shall be no separate "pre-move" pass.</statement>
  <rationale>Relocating a file is a path change — exactly `fileRename()`. The original `pre_move_files` (e.g. `rules/bootstrap-*.md`→`instructions/*.instructions.md` for Copilot-standalone) was an out-of-band move; as a `fileRename()` it composes with the rest of the pipeline and its reference updates flow through `pluginRewriteReferences()`.</rationale>
  <source>Sources</source>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: relocation `rules/bootstrap-*.md`→`instructions/*.instructions.md` When: generated Then: matching files land at the new folder and filename via `fileRename()`.</criteria>
    <criteria>Given: the generation design When: inspected Then: this relocation is a `fileRename()`, not a pre-move pass.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0043, FR-ARCH-0035</depends>
</req>

## Workflow-to-skill transform

<req id="FR-COPY-0080" type="FR" level="System" ticketId="138" classification="technical">
  <title>Workflow-to-skill transform</title>
  <statement>For each target configured to package workflows as skills, the generator shall transform every Rosetta workflow document into a skill at the target's configured skills root: the workflow body shall become `<skills-root>/<name>/SKILL.md`, and each phase file shall be emitted without YAML frontmatter under `<skills-root>/<name>/phases/`. The generator shall assign a phase to the workflow whose document stem is the shortest hyphen-bounded prefix of the phase stem. Within the resulting `SKILL.md` and every emitted phase file, the generator shall rewrite references to that workflow's actual phase file names only — never arbitrary `*.md` mentions — to the form `APPLY SKILL FILE \`phases/<phase>.md\``. The rewrite shall run in two ordered passes: (1) the full form `APPLY PHASE <name>` — where `<name>` may be bare or wrapped in a delimiter — with the `APPLY PHASE ` prefix consumed; then (2) the standalone short form, matched only when the phase name is wrapped in a matching delimiter (backtick, single quote, or double quote) on both sides. A bare name in the full form shall be bounded by the `APPLY PHASE ` prefix and a `.md` word boundary. The standalone form shall require matching delimiters on both sides. The transform shall apply to `core-codex` with skills root `.agents/skills/` and to `core-antigravity` with skills root `skills/`.</statement>
  <rationale>For the `core-codex` and `core-antigravity` targets, the generator packages reusable workflows as skills. A shared transform preserves the established workflow and phase mapping without target-specific duplication. Removing phase frontmatter leaves phase files as skill resources rather than independently discoverable skills. Exact phase-name matching prevents unrelated file references from changing.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-07-27</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Rosetta workflow `coding-flow` and the `core-codex` target When: the generator processes the workflow Then: `.agents/skills/coding-flow/SKILL.md` exists and each phase appears under `.agents/skills/coding-flow/phases/`.</criteria>
    <criteria>Given: the Rosetta workflow `coding-flow` and the `core-antigravity` target When: the generator processes the workflow Then: `skills/coding-flow/SKILL.md` exists and each phase appears under `skills/coding-flow/phases/`.</criteria>
    <criteria>Given: a workflow with no phase files and the `core-codex` or `core-antigravity` target When: the generator processes the workflow Then: `<skills-root>/<name>/SKILL.md` is produced and no `phases/` folder is created.</criteria>
    <criteria>Given: a phase file with YAML frontmatter and the `core-codex` or `core-antigravity` target When: the generator processes the phase Then: the emitted phase file contains the phase body and no YAML frontmatter.</criteria>
    <criteria>Given: workflow `sample-flow.md` and phases `sample-flow-setup.md` and `sample-flow-setup-advanced.md` When: the generator processes them for a workflow-to-skill target Then: both phases are emitted under `<skills-root>/sample-flow/phases/`.</criteria>
    <criteria>Given: the real phase name `init-workspace-flow-discovery.md`, referenced as `APPLY PHASE \`init-workspace-flow-discovery.md\`` and as a bare/backticked/single-quoted/double-quoted `init-workspace-flow-discovery.md` When: transformed Then: every occurrence becomes `APPLY SKILL FILE \`phases/init-workspace-flow-discovery.md\``.</criteria>
    <criteria>Given: a `*.md` mention that is not one of the workflow's real phase names When: transformed Then: it is left unchanged.</criteria>
    <criteria>Given: the ordered passes (full form, then short form) When: applied to a reference Then: the result is rewritten exactly once — the short-form pass does not re-match the full-form pass's output (no double rewrite).</criteria>
    <criteria>Given: a target other than `core-codex` or `core-antigravity` When: the generator processes that target Then: this transform is not applied.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>`src/rosettify-plugins/src/file-processors/file-workflow-to-skill.ts` (renamed from `file-antigravity-workflow-to-skill.ts`): derives its target base from the incoming `frame.target` set by `computeTargetPath`, so `SpecEntry.target` owns placement and the processor takes no argument; shortest-hyphen-bounded-prefix ownership and the two-pass reference rewrite are unchanged; phase documents pass through `stripFrontmatter` while the main `SKILL.md` retains it. Composed in both the `core-codex` and `core-antigravity` workflow entries in `src/rosettify-plugins/src/spec/targets.ts`. Tests: `tests/unit/file-processors/file-workflow-to-skill.test.ts` (22 cases — both pre-targeted bases plus an arbitrary base, main/phase/zero-phase, nested and non-hyphen-bounded prefix stems, all reference forms, no double-rewrite, frame immutability, binary and null-content passthrough); `tests/e2e/sample.e2e.test.ts`; `tests/e2e/parity-derive-structure.ts` with an independent path oracle.</implementationNotes>
  <depends>FR-ARCH-0043</depends>
</req>

## `core-antigravity`-specific transforms

These transforms apply to the `core-antigravity` target only; the other six targets are unaffected.

<req id="FR-COPY-0081" type="FR" level="System" ticketId="138" classification="technical">
  <title>Antigravity frontmatter reduction (name + description only)</title>
  <statement>For the Antigravity target, the generator shall reduce the YAML frontmatter of every agent file and every skill `SKILL.md` to exactly two fields — `name` and `description` — removing all other frontmatter fields (including `model`, `mode`, `readonly`, `baseSchema`, and any others) and leaving the document body unchanged. This transform applies to the Antigravity target only.</statement>
  <rationale>Antigravity agents and skills expect a minimal `name` + `description` frontmatter contract. Antigravity currently maps its selectable model tiers (flash_lite, flash, pro) to extremely old models, so any explicitly specified model is worse than none — the agent should use Antigravity's own current default. Every non-essential field, model foremost, is therefore dropped. This is the "drop" half of the model-handling rule; the "inherit" half is FR-COPY-0082.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-07-23</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an agent file with frontmatter `name`, `description`, `model`, `mode`, `readonly`, `baseSchema` When: generated for Antigravity Then: only `name` and `description` remain and the body is unchanged.</criteria>
    <criteria>Given: a skill `SKILL.md` carrying a `model:` field When: generated for Antigravity Then: `model:` is removed and only `name` and `description` remain.</criteria>
    <criteria>Given: a target other than Antigravity When: generated Then: frontmatter is not reduced.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/plugin-processors/plugin-antigravity-reduce-frontmatter.ts (agents/* + **/SKILL.md → name+description only, after pluginGenerateIndexes); serialize/frontmatter.ts reduceFrontmatterToNameDescription (layout-preserving; throws on block-scalar name/description). Rules NOT reduced.</implementationNotes>
  <depends>FR-VAR-0081</depends>
</req>

<req id="FR-COPY-0082" type="FR" level="System" ticketId="138" classification="technical">
  <title>Antigravity subagent_required_model rewrite to inherit</title>
  <statement>For the Antigravity target, the generator shall rewrite every `subagent_required_model="<any value>"` attribute occurrence in generated content to `subagent_required_model="inherit"`, regardless of the original value. This transform applies to the Antigravity target only; the other six targets shall retain the original attribute values.</statement>
  <rationale>The `subagent_required_model` attribute tells the agent which model to spawn a subagent with. Antigravity cannot programmatically select current 3.x models for subagents — its selectable set maps flash_lite/flash/pro to extremely old models — so a subagent must instead inherit the user-selected mode; `inherit` is the only correct value. This is the "inherit" half of the model-handling rule; the "drop" half is FR-COPY-0081. Scope is Antigravity-only because the other six targets already route subagent models correctly.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-07-23</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol"` When: generated for Antigravity Then: it becomes `subagent_required_model="inherit"`.</criteria>
    <criteria>Given: the same attribute When: generated for Claude, Cursor, Copilot, or Codex Then: its value is unchanged.</criteria>
    <criteria>Given: `subagent_required_model="inherit"` already present When: generated for Antigravity Then: it remains `subagent_required_model="inherit"` (idempotent).</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/plugin-processors/plugin-antigravity-subagent-model.ts (rewrites every subagent_required_model="..." → "inherit" over non-binary/non-verbatim frames; idempotent; Antigravity pipeline only).</implementationNotes>
  <depends>FR-ARCH-0049</depends>
</req>

## subagent_required_model list normalization

<req id="FR-COPY-0083" type="FR" level="System"
     ticketId="" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="User" changed="2026-08-19"
     depends="FR-COPY-0020, FR-COPY-0021, FR-COPY-0022, FR-COPY-0082"
     implementation="Implemented">
  <title>subagent_required_model list normalization (always-on)</title>
  <statement>For every target except Antigravity, and independently of whether a profile is active, the generator shall normalize each `subagent_required_model="<comma-separated tokens>"` attribute in generated content by applying that target's own per-IDE model-selection logic to every token in the list — Claude keeps tokens of the `opus`/`sonnet`/`haiku` family, Cursor and Copilot keep tokens present in the target's effective map, Codex keeps `gpt-*` tokens — mapping each surviving token through that target's effective `ModelVocabulary` to its IDE-native value, de-duplicating survivors while keeping the first occurrence, preserving source order, and re-emitting the result as a comma-separated list. For Codex, whose frontmatter emission splits a token into a model field and a separate reasoning-effort field, a surviving token shall be emitted in this single-slot attribute as its base model id with any trailing reasoning-effort suffix removed (`gpt-5.5-high` emits as `gpt-5.5`), since the attribute has no second slot for an effort value and only the base id is a valid model identifier. Where a per-target override block is in force for the target, that block is the whole allowed vocabulary, so a token absent from it shall be dropped from the list rather than passed through — including a Codex `gpt-`-prefixed token, which is otherwise kept. Without such a block the target's built-in behavior applies. When no token survives, the attribute value shall become `inherit`. This normalization is always applied, with or without a profile; it is a second model-emission surface alongside the frontmatter `model:` value and closes a pre-existing leak in which the raw multi-vendor list ships unnormalized. Antigravity is excluded: it retains its existing unconditional rewrite of the attribute to `inherit` (FR-COPY-0082).</statement>
  <rationale>The `subagent_required_model` attribute is a model-emission surface distinct from the frontmatter `model:` value, and it was omitted from the original normalization requirements. Today the raw comma-separated multi-vendor list ships byte-for-byte unnormalized into four of the seven targets — core-claude (`plugins/core-claude/workflows/requirements-authoring-flow.md:33`), core-cursor (`plugins/core-cursor/commands/requirements-authoring-flow.md:33`), core-copilot (`plugins/core-copilot/commands/api-aqa-flow.md:60`), and core-codex (`plugins/core-codex/.agents/skills/security-flow/SKILL.md:45`) — sourced from 21+ workflow files under `instructions/r3/core/workflows/*.md` (e.g. requirements-authoring-flow.md:33) (discovery-notes.md:80-89). Only Antigravity currently rewrites it to `inherit`. Consequently a frontmatter-only fix cannot satisfy "a disallowed model appears nowhere in a shipped plugin": a client with no Opus access would still receive `claude-opus-4-8` in the plain body text of four targets. Reusing each target's existing selection logic and effective map keeps this behavior identical to frontmatter normalization. The behavior is always-on because the leak exists today regardless of profiles; the map merely differs when a profile is active.</rationale>
  <acceptance>
    <criteria id="FR-COPY-0083.AC1" ears="ubiquitous" system="the generator" shall="apply, for every target except Antigravity and whether or not a profile is active, that target's per-IDE model-selection logic to each token of a `subagent_required_model` list before re-emitting the list"/>
    <criteria id="FR-COPY-0083.AC2" ears="event" when="a `subagent_required_model` list `claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, claude-sonnet-5` is normalized for Claude with the built-in map" system="the generator" shall="rewrite the list to `claude-opus-4-8, claude-sonnet-5` — non-claude tokens dropped, survivors mapped and kept in source order"/>
    <criteria id="FR-COPY-0083.AC3" ears="event" when="a `subagent_required_model` list `gpt-5.4, claude-opus-4-8, gpt-5.4` is normalized for Codex" system="the generator" shall="rewrite the list to `gpt-5.4` — non-gpt token dropped, duplicate collapsed keeping the first occurrence, source order preserved"/>
    <criteria id="FR-COPY-0083.AC4" ears="state" while="a profile supplies a `core-cursor` override block mapping `claude-opus-4-8`→`gpt-5.4` with no entry for `claude-sonnet-5`" system="the generator" shall="normalize the Cursor `subagent_required_model` list `claude-opus-4-8, claude-sonnet-5` to `gpt-5.4` — survivor mapped through the effective block, token absent from the block dropped"/>
    <criteria id="FR-COPY-0083.AC5" ears="unwanted" if="no token in the list survives the target's selection and effective-map filtering" system="the generator" shall="set the attribute value to `inherit`"/>
    <criteria id="FR-COPY-0083.AC6" ears="optional" where="the target is Antigravity" system="the generator" shall="retain the existing unconditional rewrite of the attribute to `inherit` and not apply this list normalization (FR-COPY-0082)"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/plugin-processors/plugin-normalize-subagent-model.ts (pluginNormalizeSubagentRequiredModel factory + four per-vocabulary token mappers: per-IDE token filtering, effective-map mapping, Codex effort-suffix strip, exhaustive-block drop, de-dup keeping first occurrence, source order preserved, no-survivor -> "inherit"); src/rosettify-plugins/src/spec/targets.ts (composed after indexes for the six non-Antigravity targets; Antigravity keeps its existing rewrite). Tests: tests/unit/plugin-processors/plugin-normalize-subagent-model.test.ts.</implementationNotes>
  <notes>Deliberate defect fix: changes the CONTENT of currently-shipped plugins (attribute values only), not their file or path sets, so structural parity (NFR-0001) is unaffected. Evidence: discovery-notes.md:78-89.</notes>
</req>

<req id="FR-COPY-0084" type="FR" level="System"
     ticketId="" classification="technical"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="User" changed="2026-08-19"
     depends="FR-COPY-0022, FR-COPY-0083, FR-ARCH-0059"
     implementation="Implemented">
  <title>Codex model normalization applied at both call sites</title>
  <statement>Codex emits models at two independent call sites — the markdown model-normalization processor `fileNormalizeCodexModels` (covering rules, workflows, and skills) and the agents-TOML formatter `fileCodexAgentFormat` (covering `agents/**`, which bypasses the markdown processor). Every change to the effective `ModelVocabulary` (including a profile's `core-codex` override block) and to `subagent_required_model` list filtering (FR-COPY-0083) shall be applied identically at both call sites, so the two Codex output shapes never present divergent model resolutions for the same input token.</statement>
  <rationale>The two Codex emission paths are independent: `fileNormalizeCodexModels` handles rules/workflows/skills and `fileCodexAgentFormat` emits TOML for `agents/**` via `emitCodexToml`, bypassing the markdown processor (discovery-notes.md:105-108). An override or filtering change wired into only one path would make Codex's agent files disagree with its rules/workflows/skills — the same token resolved one way in TOML and another (or raw) in markdown. Threading the effective map as a parameter (FR-ARCH-0059) to both call sites keeps them in lockstep without a parallel code path.</rationale>
  <acceptance>
    <criteria id="FR-COPY-0084.AC1" ears="ubiquitous" system="the generator" shall="resolve a given Codex model token to the same value at both the `fileNormalizeCodexModels` markdown call site and the `fileCodexAgentFormat` agents-TOML call site"/>
    <criteria id="FR-COPY-0084.AC2" ears="event" when="a profile supplies a `core-codex` override block mapping `gpt-5.5-high`→`gpt-5.4-medium`" system="the generator" shall="apply that block at both the markdown call site and the agents-TOML call site, so both emit model `gpt-5.4` with effort `medium`"/>
    <criteria id="FR-COPY-0084.AC3" ears="event" when="`subagent_required_model` list filtering (FR-COPY-0083) is applied for Codex" system="the generator" shall="apply the identical filtering wherever the attribute is emitted, regardless of which Codex output shape carries it"/>
    <criteria id="FR-COPY-0084.AC4" ears="unwanted" if="the same model token is resolved through the effective map at one Codex call site but passed through unresolved at the other" system="the generator" shall="emit the same resolved model value at both call sites, so a divergence between the markdown and agents-TOML outputs is detectable by comparing them for one source document"/>
  </acceptance>
  <implementationNotes>Implemented: src/rosettify-plugins/src/file-processors/file-normalize-codex-models.ts and src/rosettify-plugins/src/file-processors/file-codex-agent.ts (both Codex call sites call the same normalizeCodex with the effective map + exhaustive; subagent-list filtering applied wherever the attribute is emitted). Tests: tests/unit/file-processors/file-codex-agent.test.ts, tests/unit/file-processors/file-normalize-codex-models.test.ts.</implementationNotes>
  <notes>Evidence: discovery-notes.md:105-108 (two independent Codex normalize call sites; `fileCodexAgentFormat` bypasses `fileNormalizeCodexModels`).</notes>
</req>
