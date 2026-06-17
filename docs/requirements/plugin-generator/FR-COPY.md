# plugin-generator — FR: Preserved-File Seeding, Tree Reset, Copy, Normalization, Renames

> These units are the as-is behaviors carried over from the original `plugin_generator.py`, re-expressed on the unified two-tier target architecture (FR-ARCH). The **how** is normative in FR-ARCH's VFS + processor model: copy = `fileRead()`→`pluginWrite()`; model normalization = per-vocabulary model-normalization processors (FR-ARCH-0046); path changes = `fileRename()` (path only); in-body reference rewriting = `pluginRewriteReferences()` (content only, FR-ARCH-0049); the output wipe and preserved-file seeding are the `pluginCleanup()` and `pluginCopy()` plugin processors at the head of the pipeline (FR-ARCH-0035/0052/0053). There are no `pre-copy`/`pre-move` passes: a duplicated folder is an additional `SpecEntry`, a relocation is a `SpecEntry` `target` and/or `fileRename()`.

## Preserved-file seeding

The files a target keeps but never generates — the IDE manifest, hook templates, IDE config-folder contents, any `.mcp.json` — have a committed source under `src/plugin-generator/plugins/<target>/` (DATA-CFG-0005). The `pluginCopy()` processor (FR-ARCH-0053) copies that source into the output before generating instruction-derived content on top, so a target can be produced into a clean or empty output directory.

<req id="FR-SEED-0001" type="FR" level="System" ticketId="" classification="technical">
  <title>Seed preserved files before generation</title>
  <statement>When generating a target, the `pluginCopy()` processor (FR-ARCH-0053) shall copy that target's preserved-file source from `src/plugin-generator/plugins/<target>/` into the target output at the mirrored output-relative paths, before any instruction-derived content is produced for that target.</statement>
  <rationale>The preserved files are an input with no instruction-source derivation; copying them first makes generation self-contained and reproducible into a clean output directory instead of depending on files already committed in the output tree.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an empty target output directory When: the target is generated Then: every preserved file from `src/plugin-generator/plugins/<target>/` is present at its output-relative path and the generated content is present on top.</criteria>
    <criteria>Given: the seeding step When: it runs Then: it completes before any instruction-derived content is written for that target.</criteria>
    <criteria>Given: a clean environment with only the instruction source and `src/plugin-generator/plugins/` present When: the generator runs Then: each target output is complete with no pre-existing files required in the output tree.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>DATA-CFG-0005, FR-COPY-0001, FR-COPY-0010</depends>
  <notes>Resolves the previously implicit precondition that manifests and `*.tmpl` templates were already committed in the output tree (former ASSUMPTIONS AC-3 scope; see AC-3a). Hook templates seeded here are rendered in place by FR-GEN template rendering; hook bundles are synced separately by FR-HOOK.</notes>
</req>

<req id="FR-SEED-0002" type="FR" level="System" ticketId="" classification="technical">
  <title>Standalone preserved-file derivation</title>
  <statement>A standalone target shall source its preserved files from its parent target's preserved-file source (`src/plugin-generator/plugins/<parent>/`) rather than from an independent config folder, taking the standalone-form hook template and the parent manifest version, and shall not retain the parent's marketplace-only preserved files.</statement>
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
    <criteria>Given: a standalone target When: generated Then: no independent `src/plugin-generator/plugins/<standalone>/` config folder is required.</criteria>
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
  <statement>Where a target requires model normalization, the target's own model-normalization `FileProcessor` (the per-vocabulary case-specific processor composed into its pipeline, FR-ARCH-0046) shall rewrite each markdown document's frontmatter `model:` value into that target's `ModelVocabulary` using the IDE's selection strategy (see FR-COPY-0021 for Claude; FR-COPY-0022 for Codex; first-model-overall for Cursor and Copilot), and shall leave content without a model value unchanged.</statement>
  <rationale>Each IDE accepts only its own model identifier format. Normalization is one explicit pipeline stage, not a side effect hidden inside copying. The selection strategy differs per IDE: Claude scans for the first claude-compatible model; Codex scans for the first gpt-* model; Cursor and Copilot take the first model overall.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-16</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `model: claude-4.8-opus-high, gpt-5.5-high` for Cursor When: normalized Then: the value becomes `claude-opus-4-8` (first model overall).</criteria>
    <criteria>Given: `model: gpt-5.4-medium, gemini-3.1-pro-preview, claude-4.6-sonnet` for Cursor When: normalized Then: the value becomes `gpt-5.4` (first model overall).</criteria>
    <criteria>Given: a document without frontmatter When: processed Then: content is unchanged.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Each IDE target composes its own per-vocabulary FileProcessor (FR-ARCH-0046). Claude uses scan-for-first-claude (FR-COPY-0021); Codex uses first-gpt-* (FR-COPY-0022); Cursor and Copilot use first-model-overall.</implementationNotes>
  <depends>DATA-CFG-0004, FR-ARCH-0046, FR-COPY-0021, FR-COPY-0022</depends>
</req>

<req id="FR-COPY-0021" type="FR" level="System" ticketId="" classification="technical">
  <title>Claude model normalization: scan for first claude-compatible model</title>
  <statement>For the Claude vocabulary, the Claude model-normalization processor shall scan the comma-separated `model:` list for the first claude-compatible token — defined as a token that either starts with `claude-` (case-insensitive) or contains the substring `opus`, `sonnet`, or `haiku` (case-insensitive). A matching token that contains a recognized tier substring (`opus`, `sonnet`, or `haiku`) shall be mapped to the corresponding Claude full model ID (`claude-opus-4-8`, `claude-sonnet-4-6`, or `claude-haiku-4-5`); a matching token that starts with `claude-` but contains none of the tier substrings shall map to `inherit`. The processor shall fall back to `inherit` when no claude-compatible token is found. The scan shall skip any leading non-claude tokens (e.g. `gpt-*`, `gemini-*`) without mapping them.</statement>
  <rationale>Claude Code accepts full model IDs (`claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`) and `inherit`. Agents may list a preferred non-claude model first (e.g. reviewer lists `gpt-5.4-medium` first); Claude normalization must skip non-claude entries and find the first claude-compatible one. Target output: `model: gpt-5.4-medium, gemini-3.1-pro-preview, claude-4.6-sonnet` → `claude-sonnet-4-6` (reviewer and validator agents).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-16</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `model: claude-4.8-opus-high, gpt-5.5-high` When: normalized for Claude Then: result is `claude-opus-4-8` (first token contains `opus`).</criteria>
    <criteria>Given: `model: gpt-5.4-medium, gemini-3.1-pro-preview, claude-4.6-sonnet` When: normalized for Claude Then: result is `claude-sonnet-4-6` (scans past gpt-* and gemini-*, finds first claude-* token containing `sonnet`).</criteria>
    <criteria>Given: `model: claude-4.5-haiku, gpt-5.4-low` When: normalized for Claude Then: result is `claude-haiku-4-5`.</criteria>
    <criteria>Given: `model: claude-sonnet-4-6, gpt-5.4-medium` When: normalized for Claude Then: result is `claude-sonnet-4-6`.</criteria>
    <criteria>Given: `model: gpt-5.5-high, gemini-3.1-pro-high` (no claude token) When: normalized for Claude Then: result is `inherit`.</criteria>
    <criteria>Given: any model token present in instruction source frontmatter for a currently supported model When: normalized by any of the Claude Code, Cursor, or Copilot vocabularies Then: each vocabulary produces the current authoritative model identifier for that IDE in its expected format; no vocabulary produces a stale model identifier for a currently supported model.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/plugin-generator/src/spec/model-maps.ts: normalizeClaude() scans tokens, CLAUDE_CODE_MAP maps opus/sonnet/haiku substrings to full model IDs. All vocabulary maps for Claude Code, Cursor, and Copilot must be updated together when model tiers change.</implementationNotes>
  <notes>Concrete target examples (r3): architect `claude-4.8-opus-high, gpt-5.5-high, gemini-3.1-pro-high` → `claude-opus-4-8`; reviewer `gpt-5.4-medium, gemini-3.1-pro-preview, claude-4.6-sonnet` → `claude-sonnet-4-6`; validator `gpt-5.4-medium, gemini-3.1-pro-preview, claude-4.6-sonnet` → `claude-sonnet-4-6`; executor `claude-4.5-haiku, gpt-5.4-low, gemini-3-flash` → `claude-haiku-4-5`.</notes>
</req>

<req id="FR-COPY-0022" type="FR" level="System" ticketId="" classification="technical">
  <title>Codex model and reasoning-effort split</title>
  <statement>For the Codex vocabulary, the generator shall select the first `gpt-*` model from a comma-separated list, separate a trailing reasoning-effort suffix (`-high`, `-medium`, or `-low`) into a distinct effort value when present, write both `model: <id>` and `model_reasoning_effort: <effort>` when a suffix is present, write only `model: <id>` when no suffix is present (no default effort is substituted), and emit no model fields when no qualifying token is found.</statement>
  <rationale>Codex requires an OpenAI model and a separate reasoning-effort field when effort is explicit. Requiring an explicit effort suffix in source is a content authoring contract; the generator must not silently substitute a default value because different agents carry different intended effort levels.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-16</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `gpt-5.3-codex-high` When: normalized for Codex Then: model is `gpt-5.3-codex` and effort is `high`.</criteria>
    <criteria>Given: `gpt-5.4` (no effort suffix) When: normalized for Codex Then: the output contains `model: gpt-5.4` and does not contain `model_reasoning_effort`.</criteria>
    <criteria>Given: a value with no `gpt-` entry When: normalized for Codex Then: no model fields are produced.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/plugin-generator/src/spec/model-maps.ts: normalizeCodex() returns { model, effort: undefined } when no effort suffix; Codex emitter writes only `model:` field when effort is undefined.</implementationNotes>
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
