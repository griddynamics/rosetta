# plugin-generator — FR: Per-Target Structure, Reasoning, and Bootstrap Delivery

Per-target requirements: required output structure, **why each target is shaped that way**, and how each delivers the bootstrap context. Generation is uniform (FR-CLI-0040); these state per-target *outcomes and rationale*, never derivation mechanics. IDs keep the stable `FR-VAR-*` prefix; new cross-cutting units use the same series.

## Bootstrap delivery — a property of the target's preserved templates and rules, not a generator strategy

The generator assembles the bootstrap context values uniformly for every target (FR-HOOK-0001) and exposes them to template rendering as the `bootstrap_hooks` template context value. **Whether and how those values reach the agent is decided by the target's preserved templates and rule/instruction files, not by the generator.** A hook template that references `{{{bootstrap_hooks}}}` delivers bootstrap via session-start hooks; a template that omits the placeholder delivers nothing through hooks, and the target instead relies on natively auto-loaded rules/instructions (`alwaysApply`/`applyTo: "**"`) that already carry the same bootstrap bodies. The generator does not classify or choose a delivery mechanism — it always assembles the values and always size-checks them (NFR-0004); the preserved templates own the consumption decision. See the authoritative per-IDE guides (REFERENCES.md, INT-IDE-0002) for each IDE's capability.

<req id="FR-VAR-0070" type="FR" level="System" ticketId="" classification="technical">
  <title>Uniform bootstrap assembly; delivery owned by preserved templates/rules</title>
  <statement>The generator shall assemble and expose the bootstrap context values uniformly for every target, and shall size-check every assembled entry (NFR-0004), regardless of how the target ultimately delivers bootstrap. The generator shall not hold a per-target "delivery strategy" field nor decide between hooks, rules, and instructions: a target delivers bootstrap via session-start hooks if and only if its preserved hook template injects the `{{{bootstrap_hooks}}}` placeholder, and otherwise delivers the same content via its natively auto-loaded rule/instruction files. A target whose preserved templates inject the placeholder and whose rules also auto-load the same bootstrap content would double-deliver; preventing that is a property the preserved templates/rules must satisfy, owned by the template/rule author per the IDE guide, not enforced by a generator strategy flag.</statement>
  <rationale>Generation stays uniform and content-agnostic (NFR-0006, FR-ARCH-0004): the generator produces values, the IDE-config author's preserved templates/rules decide delivery. This avoids encoding consumption policy in the engine and matches each IDE's documented capability.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-11</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: any target When: generated Then: its bootstrap entries are assembled and size-checked, independent of delivery mechanism.</criteria>
    <criteria>Given: a target whose preserved hook template omits the `{{{bootstrap_hooks}}}` placeholder When: generated Then: its hooks carry no bootstrap payload and the same content is delivered by its auto-loaded rules/instructions.</criteria>
    <criteria>Given: the generator When: inspected Then: it holds no per-target bootstrap-delivery-strategy field and does not branch on a delivery mechanism.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/plugin-processors/plugin-assemble-{claude,cursor,copilot,codex}-bootstrap.ts (all 4 IDEs always assemble full bootstrap); templateContext['bootstrap_hooks'] (one key, no per-IDE suffix); plugins/core-claude/hooks/hooks.json.tmpl, plugins/core-codex/.codex-plugin/hooks.json.tmpl, plugins/core-copilot/.github/plugin/hooks.json.tmpl (placeholder renamed from bootstrap_hooks_<ide> to bootstrap_hooks); cursor template has no placeholder — payload assembled but not injected.</implementationNotes>
  <depends>INT-IDE-0002, FR-HOOK-0001, FR-HOOK-0004, FR-ARCH-0004</depends>
</req>

<req id="FR-VAR-0071" type="FR" level="System" ticketId="" classification="technical">
  <title>Two hook-template forms for in-repo distributions</title>
  <statement>A target that has a separate in-repo (standalone) distribution shall provide both a marketplace-form and a standalone-form hook template, so each distribution references hooks by paths valid in its runtime location.</statement>
  <rationale>Marketplace install and in-repo extraction resolve hook paths from different roots; one template form cannot serve both.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-11</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: Cursor or Copilot When: generated Then: both a marketplace-form and a standalone-form hook template are produced.</criteria>
    <criteria>Given: a target with no separate in-repo distribution When: generated Then: a single hook-template form suffices.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/spec/targets.ts (cursor and copilot specs carry both hook template forms). Tied to FR-VAR-0070 bootstrap delivery rework.</implementationNotes>
</req>

<req id="FR-VAR-0072" type="FR" level="System" ticketId="315" classification="technical">
  <title>Standalone index/instruction injection rationale</title>
  <statement>Where a standalone target delivers bootstrap through native rules or auto-loaded instructions, the generator shall ensure the plugin-root instructions are present in that natively-loaded file, inserted via the `pluginInjectSections()` processor (FR-ARCH-0051). No index section shall be injected: a folder index lists one plugin's own documents and would be wrong beside a second installed Rosetta plugin (FR-HOOK-0004, FR-GEN-0001 dormant).</statement>
  <rationale>A standalone carries no session-start hook to convey the plugin-root path, so that information must travel in the rule/instruction file the IDE auto-loads. The insertion is an explicit content-only processor, not an in-place edit bolted onto a derivation pass. The workflow catalog is no longer conveyed at all, because no set generates one.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: Cursor-standalone When: generated Then: the plugin-root instructions appear in the auto-loaded rule file and no index section is injected.</criteria>
    <criteria>Given: Copilot-standalone When: generated Then: the plugin-root instructions appear in the auto-loaded instructions file and no index section is injected.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: the index half of this unit is correctly implemented - the kind:'index' injection sections
  are gone from the cursor-standalone and copilot-standalone declarations and no index section is injected
  anywhere (FR-GEN-0001 dormant). The plugin-root half FAILS against the real r3 content.
  pluginInjectSections (src/rosettify-plugins/src/plugin-processors/plugin-inject-sections.ts) skips
  injection when its anchor '# PREP STEP 1:' is absent from the host frame, by design.
  instructions/r3/core/rules/plugin-files-mode.md carries no such anchor, so generating cursor-standalone
  and copilot-standalone from the real source produces plugin-files-mode.mdc and
  plugin-files-mode.instructions.md with NO injected plugin-root text. The unit tests pass only because
  tests/fixtures/sample-instructions/r3/core/rules/plugin-files-mode.md DOES contain the anchor; no e2e
  test exercises this against the real instructions/r3 tree. The fixture is masking a real gap.</implementationNotes>
  <depends>FR-VAR-0070, FR-ARCH-0051</depends>
</req>

## Claude (`claude`) — marketplace

Native folder names, short model names, hooks, `.claude-plugin` manifest. Bootstrap via **session-start hooks** (no always-on rule auto-load for this payload); native dedup.

<req id="FR-VAR-0010" type="FR" level="System" ticketId="315" classification="technical">
  <title>Claude output</title>
  <statement>The Claude variant shall contain instruction folders unchanged in name, model values drawn from Claude Code's accepted model vocabulary — either a family short name (`opus`, `sonnet`, `haiku`) or a full model ID (`claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5`), both of which Claude Code accepts — generated `rules` and `workflows` indexes, a rendered `hooks/hooks.json`, and a preserved `.claude-plugin` config folder. This unit permits both forms and constrains neither; which form a value takes is determined by the effective `ModelVocabulary` (FR-COPY-0021).</statement>
  <rationale>Claude Code consumes native folder names, short model names, and a plugin manifest.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Claude variant of a set declaring hooks When: generated Then: `hooks/hooks.json` exists, `.claude-plugin` is preserved, and no `rules/INDEX.md` or `workflows/INDEX.md` is emitted.</criteria>
    <criteria>Given: a document model `claude-opus-4-6` When: generated Then: its model reads the effective Claude vocabulary's value for the opus family, in either accepted form — the family short name `opus` or a full opus model ID.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: the claude target in src/rosettify-plugins/src/spec/targets.ts keeps native folder names
  and hookFolder 'hooks'; CLAUDE_CODE_MAP with claudeLookup (src/rosettify-plugins/src/spec/model-maps.ts)
  resolves any opus/sonnet/haiku token to the effective vocabulary value in either accepted form, per
  FR-COPY-0021. Verified on generated rosetta-claude and core-claude: hooks/hooks.json present,
  .claude-plugin preserved, and no rules or workflows INDEX.md anywhere in the tree.</implementationNotes>
  <depends>DATA-CFG-0003, FR-COPY-0021, FR-GEN-0001, FR-GEN-0010, FR-HOOK-0001, FR-VAR-0070</depends>
</req>

## Cursor (`cursor`) — marketplace

`workflows`→`commands`, `rules/*.md`→`*.mdc`, Cursor model vocabulary, two hook-template forms. Marketplace form delivers bootstrap via **session-start hooks**; the standalone derivative uses native rules (see FR-VAR-0050).

<req id="FR-VAR-0020" type="FR" level="System" ticketId="315" classification="technical">
  <title>Cursor output</title>
  <statement>The Cursor variant shall rename `workflows` to `commands`, rename `rules/*.md` to `*.mdc`, use Cursor model vocabulary, render both plugin-form and standalone-form hook templates, and preserve a `.cursor-plugin` config folder. It shall generate no folder index (FR-GEN-0001, dormant).</statement>
  <rationale>Cursor expects `commands/`, `.mdc` rules, mapped model identifiers, and two hook template forms.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Cursor variant When: generated Then: `commands/` exists, `rules/*.mdc` exist, and no `commands/INDEX.md` or `rules/INDEX.md` is emitted.</criteria>
    <criteria>Given: a cross-reference to `workflows/x.md` When: generated Then: it reads `commands/x.md`.</criteria>
    <criteria>Given: cursor When: bootstrap assembled Then: each entry = `{"type":"command","command":"printf '%s' '{\"additional_context\":\"<body>\"}'"}` and the plugin-root entry uses `${CURSOR_PROJECT_DIR}` for env-var expansion.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: the cursor target in src/rosettify-plugins/src/spec/targets.ts renames workflows to
  commands and rules/*.md to *.mdc, uses the Cursor vocabulary, preserves .cursor-plugin and emits no
  index. pluginRewriteReferences rewrites literal workflows/x.md document references to commands/x.md,
  except inside the verbatim harness configure references which intentionally describe other IDEs. Both
  the plugin-form and the standalone-form hook templates render; HOOK_LAYOUTS.cursor.bootstrap is null, so
  the cursor payload is generated but never injected into either form - the deliberately preserved
  asymmetry of FR-VAR-0070.</implementationNotes>
  <depends>FR-COPY-0030, FR-COPY-0031, FR-COPY-0032, FR-GEN-0004, FR-VAR-0071, FR-VAR-0070, FR-HOOK-0005</depends>
</req>

## Copilot (`copilot`) — marketplace

`workflows`→`commands`, agents→`*.agent.md`, Copilot model vocabulary, runtime config at plugin root, `.github` preserved. Bootstrap via **session-start hooks** (entry shape: FR-HOOK-0005).

<req id="FR-VAR-0030" type="FR" level="System" ticketId="315" classification="technical">
  <title>Copilot output</title>
  <statement>The Copilot variant shall rename `workflows` to `commands`, rename agent files to `*.agent.md`, use Copilot model vocabulary, generate no folder index (FR-GEN-0001, dormant), render hook templates, and preserve a `.github` config folder. It shall produce exactly three `hooks.json` files at distinct paths: (1) `.github/plugin/hooks.json` — the plugin-form hooks, rendered from `.github/plugin/hooks.json.tmpl`; (2) `hooks.json` at the plugin root — an alternate-name copy of `.github/plugin/hooks.json` with identical content, expressed as an additional `SpecEntry` (`fileRename()` target `"."`) and not a bespoke layout step; (3) `hooks/hooks.json` — the standalone-form hooks, rendered from `hooks/hooks.json.tmpl` (standalone-form template). Files (1) and (2) shall be byte-identical.</statement>
  <rationale>Copilot expects `*.agent.md` agents, mapped model names, and the plugin-form hooks accessible at the plugin root. The root copy is an alternate-name duplication (not a rename — both source and root copy are present), confirmed byte-identical by MD5 in the r2/r3 baseline. The standalone-form hooks at `hooks/hooks.json` serve in-repo (standalone) extraction. Three distinct paths, three distinct purposes.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Copilot variant When: generated Then: agent files end in `.agent.md`.</criteria>
    <criteria>Given: the Copilot variant When: generated Then: exactly three `hooks.json` files exist at `hooks.json` (root), `.github/plugin/hooks.json`, and `hooks/hooks.json`.</criteria>
    <criteria>Given: `hooks.json` (root) and `.github/plugin/hooks.json` When: compared Then: they are byte-identical (same MD5).</criteria>
    <criteria>Given: `hooks/hooks.json` When: inspected Then: it contains the standalone-form hooks with `"sessionStart": []` (empty, no bootstrap payload for standalone use).</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: criteria 1-3 hold - agent files are emitted as *.agent.md, three hooks.json exist, and the
  root and .github/plugin copies are byte-identical (verified by matching MD5 on real rosetta-copilot
  output). Criterion 4 fails: hooks/hooks.json inside the copilot target is NOT the standalone form. It is
  byte-identical to the other two and carries the full bootstrap sessionStart array rather than an empty
  one. HOOK_LAYOUTS (src/rosettify-plugins/src/spec/hook-layouts.ts) keys the assembled document by
  TARGET, not by template path, so every hooks.json.tmpl under the copilot target shares that target's one
  assembled document. The genuinely empty sessionStart form belongs to the separate copilot-standalone
  target and lives at .github/hooks/hooks.json, not at hooks/hooks.json within copilot. Status remains
  Draft; approval is independent of this.</implementationNotes>
  <depends>FR-COPY-0031, FR-COPY-0033, FR-HOOK-0005, FR-VAR-0071</depends>
</req>

<req id="FR-VAR-0031" type="FR" level="System" ticketId="" classification="technical">
  <title>Copilot root hooks.json as alternate-name copy</title>
  <statement>The `hooks.json` file at the Copilot plugin root shall be produced as an alternate-name copy of `.github/plugin/hooks.json` — an additional `SpecEntry` that sources the same rendered plugin-form hooks output and writes it to the root path — so that both `hooks.json` (root) and `.github/plugin/hooks.json` exist in the output with identical content. This shall not be expressed as a `fileRename()` (which would remove the source path from the output).</statement>
  <rationale>The IDE runtime reads the plugin-form hooks from the root; `.github/plugin/hooks.json` is also required (it is the canonical rendered location of the plugin-form template). An alternate-name duplication (`SpecEntry`, FR-COPY-0033) correctly produces both files; a `fileRename()` would eliminate one of them. Baseline r2/r3 confirms both files exist and are byte-identical.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Copilot variant When: generated Then: both `hooks.json` (root) and `.github/plugin/hooks.json` exist.</criteria>
    <criteria>Given: the generation design When: inspected Then: the root `hooks.json` is produced by a `SpecEntry` alternate-name copy, not by `fileRename()` from `.github/plugin/hooks.json`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes>corrected to match generator baseline; pending owner review — original FR-VAR-0030 implied a fileRename/SpecEntry producing a single root file; baseline proves both files coexist with identical content</implementationNotes>
  <depends>FR-COPY-0033, FR-VAR-0030</depends>
</req>

## Codex (`codex`) — marketplace

Agents → TOML subagents; instruction folders under the Codex agent-config root; hooks mirrored to the Codex runtime location; `.codex-plugin` preserved. Bootstrap via **session-start hooks**.

<req id="FR-VAR-0040" type="FR" level="System" ticketId="" classification="technical">
  <title>Codex agents as subagents</title>
  <statement>The Codex variant shall convert each source agent document into the Codex subagent format defined by the Codex guide (INT-IDE-0002), deriving the subagent's sandbox mode from the agent's read-only flag, and shall not retain a plain `agents` folder.</statement>
  <rationale>Codex consumes subagents in its own format with a sandbox mode, not markdown; the exact format is owned by the Codex guide.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an agent with `readonly: true` When: converted Then: its subagent sets a read-only sandbox mode; otherwise workspace-write.</criteria>
    <criteria>Given: generation completes When: inspected Then: subagent definitions exist under the Codex agents location and no markdown `agents` folder remains.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0044, INT-IDE-0002</depends>
</req>

<req id="FR-VAR-0041" type="FR" level="System" ticketId="315" classification="technical">
  <title>Codex directory layout</title>
  <statement>For the `codex` target, the generator shall place instruction folders under the Codex agent-config root (`.agents/…`) by `SpecEntry` `target` placement (with `fileRename()` where filenames also change) rather than a post-hoc move pass, mirror hook configuration to the Codex runtime location, generate no folder index (FR-GEN-0001, dormant) and therefore carry no index entry in the session-start hook payload (FR-HOOK-0004), and preserve a `.codex-plugin` config folder.</statement>
  <rationale>The Codex runtime resolves instructions and hooks from specific reserved directories. Expressing the layout as each file's `fileRename()` target keeps it within the uniform pipeline (no `generate_codex_runtime_layout`-style imperative move of whole folders).</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the `codex` target When: the generator completes generation Then: instruction folders reside under the Codex agent-config root and hook config is mirrored to the Codex runtime location.</criteria>
    <criteria>Given: the `codex` target When: the generator completes generation Then: no `.agents/rules/INDEX.md` and no workflows index exist.</criteria>
    <criteria>Given: the session-start hook payload generated for the `codex` target When: inspected Then: it contains no index entry of any kind.</criteria>
    <criteria>Given: the preserved `codex` config folder — `.codex-plugin/plugin.json` and any sibling static config — When: inspected Then: it names no workflows folder or workflows index. Preserved configs are byte-copied and never pass through `pluginRewriteReferences`, so a stale pointer there survives generation silently.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: the codex target in src/rosettify-plugins/src/spec/targets.ts places instruction folders
  under .agents via SpecEntry target and fileRename rather than an imperative move pass, mirrors hooks to
  .codex/hooks.json alongside .codex-plugin/hooks.json, and emits no index. Verified on generated
  core-codex: no .agents/workflows folder, no INDEX.md anywhere, and the preserved
  .codex-plugin/plugin.json no longer points at workflows/INDEX.md. Tests:
  tests/unit/spec/targets-codex-output.test.ts.</implementationNotes>
  <depends>FR-HOOK-0001, FR-VAR-0042</depends>
</req>

<req id="FR-VAR-0042" type="FR" level="System" ticketId="315" classification="technical">
  <title>`codex` workflows as skills</title>
  <statement>For the `codex` target, the generator shall package each source workflow as a skill under `.agents/skills/` using the workflow-to-skill transform in FR-COPY-0080 and shall not emit a `.agents/workflows/` folder. The generator shall retain Codex model normalization for generated workflow skills. The generator shall not apply the `core-antigravity` frontmatter reduction, subagent-model rewriting, or advisory-hook exclusions from FR-VAR-0083 to the `core-codex` output.</statement>
  <rationale>The Codex runtime consumes reusable workflows as skills. Reusing the shared structural transform lets the generator keep workflow behavior consistent while preserving `codex` processing and isolating `antigravity`-only adaptations.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a source workflow, its phase files, and the `codex` target When: the generator processes the workflow Then: the workflow exists at `.agents/skills/<name>/SKILL.md` and its phases exist under `.agents/skills/<name>/phases/`.</criteria>
    <criteria>Given: the `codex` target When: the generator completes generation and the output tree is inspected Then: no `.agents/workflows/` folder exists.</criteria>
    <criteria>Given: a workflow skill generated for the `codex` target When: its frontmatter is inspected Then: the generator has applied Codex model normalization.</criteria>
    <criteria>Given: the `codex` target When: the generator completes generation Then: the `antigravity` frontmatter reduction, subagent-model rewriting, and FR-VAR-0083 advisory-hook exclusions have not changed the `core-codex` content or hooks.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: the codex workflow SpecEntry targets .agents/skills with fileNormalizeCodexModels and
  fileWorkflowToSkill in its processor list (src/rosettify-plugins/src/spec/targets.ts). Verified on
  generated core-codex: .agents/skills/<name>/SKILL.md plus phases/*.md exist, no .agents/workflows folder
  remains, and subagent_required_model tokens are Codex-mapped. The Antigravity-only processors stay wired
  solely to the antigravity spec.</implementationNotes>
  <depends>FR-COPY-0080, FR-COPY-0022</depends>
</req>

## Cursor standalone (`cursor-standalone`) — in-repo extraction

All content under `.cursor/`; bootstrap delivered via **native Cursor rules** (`.mdc`) — no session-start bootstrap hook; standalone-form hooks at `.cursor/hooks.json`.

<req id="FR-VAR-0050" type="FR" level="System" ticketId="315" classification="technical">
  <title>Cursor standalone output</title>
  <statement>The Cursor-standalone variant shall be generated from the instruction source by the same uniform pipeline as every other target (not derived from the `cursor` target's output), with Cursor adaptations laid out entirely under `.cursor/`: a standalone-form hook configuration, the commands index and plugin-root instructions injected (via `pluginInjectSections()`) into the plugin-files-mode rule, no plugin-marketplace-only templates or config (simply not emitted — no cleanup pass), and a generated plugin manifest.</statement>
  <rationale>In-repo extraction needs IDE-rooted paths and rule-delivered bootstrap. Generating directly from source — rather than deriving from the main plugin — removes the coupling AC-1 identifies as the root of repeated standalone defects (and the `.cursor/.cursor/` self-nesting guard, QF-4).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Cursor-standalone variant When: generated Then: all content sits under the IDE subfolder with a top-level standalone hook config and no marketplace-only template files.</criteria>
    <criteria>Given: the Cursor-standalone target generated in isolation When: complete Then: its output is complete and correct.</criteria>
    <criteria>Given: the generation design When: inspected Then: the standalone is produced from the instruction source, not by reading the `cursor` target's output.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: the structural criteria hold - generated cursor-standalone sits entirely under .cursor/
  with a top-level .cursor/hooks.json, no .cursor-plugin folder, and a generated plugin.json manifest
  built from source rather than derived from the cursor target. The statement's injection clause fails
  exactly as in FR-VAR-0072: .cursor/rules/plugin-files-mode.mdc in real generated output carries no
  injected plugin-root text, because pluginInjectSections finds no '# PREP STEP 1:' anchor in
  instructions/r3/core/rules/plugin-files-mode.md and skips silently by design.</implementationNotes>
  <depends>FR-CLI-0040, FR-SEED-0002, FR-VAR-0070, FR-VAR-0072, FR-ARCH-0051</depends>
</req>

## Copilot standalone (`copilot-standalone`) — in-repo extraction

All content under `.github/`; bootstrap delivered via **auto-loaded instructions** (`instructions/*.instructions.md`, `applyTo: "**"`) — no session-start bootstrap hook; workflows as `prompts/*.prompt.md`; nested standalone hooks.

<req id="FR-VAR-0051" type="FR" level="System" ticketId="315" classification="technical">
  <title>Copilot standalone output</title>
  <statement>The Copilot-standalone variant shall be generated from the instruction source by the same uniform pipeline as every other target (not derived from the `copilot` target's output), with Copilot adaptations laid out entirely under `.github/`: bootstrap rules relocated (via a relocation `SpecEntry` `target` and `fileRename()`) to auto-loaded instruction files, workflow content under `prompts` with `*.prompt.md` names, nested standalone hook configuration, regenerated indexes, plugin instructions injected (via `pluginInjectSections()`), no plugin-marketplace-only config (simply not emitted — no cleanup pass), and a generated plugin manifest.</statement>
  <rationale>Copilot in-repo extraction auto-loads instructions and expects `prompts/*.prompt.md`. Generating directly from source removes the derive-from-main coupling (AC-1); relocation is `fileRename()` and injection is `pluginInjectSections()`, not pre/post-cleanup passes.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Copilot-standalone variant When: generated Then: bootstrap rules appear as `instructions/*.instructions.md`, workflows appear as `prompts/*.prompt.md`, and nested standalone hook config exists.</criteria>
    <criteria>Given: the Copilot-standalone target generated in isolation When: complete Then: its output is complete and correct.</criteria>
    <criteria>Given: the generation design When: inspected Then: the standalone is produced from the instruction source, not by reading the `copilot` target's output.</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: the structural criteria hold - bootstrap rules relocate to
  .github/instructions/*.instructions.md, the nested .github/hooks/hooks.json standalone configuration
  carries an empty sessionStart, and the generated plugin.json manifest is produced from source. The
  statement's injection clause fails exactly as in FR-VAR-0072 and FR-VAR-0050:
  .github/instructions/plugin-files-mode.instructions.md in real generated output carries no injected
  plugin-root text, because the '# PREP STEP 1:' anchor is absent from the real r3 source and
  pluginInjectSections skips silently.</implementationNotes>
  <depends>FR-CLI-0040, FR-SEED-0002, FR-VAR-0070, FR-VAR-0072, FR-ARCH-0043, FR-ARCH-0051</depends>
</req>

## All standalones

<req id="FR-VAR-0060" type="FR" level="System" ticketId="" classification="technical">
  <title>Standalone plugin manifest</title>
  <statement>Each standalone variant shall carry a plugin manifest naming the variant and the version taken from the parent target's preserved manifest.</statement>
  <rationale>Distribution requires a manifest with a consistent version, drawn from the parent target's committed manifest.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a standalone variant When: generated Then: its manifest version equals the parent target's manifest version.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-SEED-0002</depends>
</req>

## Antigravity (`antigravity`) — combined plugin (all three products)

One combined plugin serves all three Antigravity products (Antigravity, Antigravity CLI, Antigravity IDE): they all read `plugin.json`, and each product consumes the components it supports. The plugin is a **superset** of Rosetta content — not a lowest-common-denominator intersection. There is no separate standalone target: in-repo use is achieved by extracting this plugin into the workspace (the IDE ignores the extra `plugin.json`). Bootstrap rides an always-on rule (Antigravity has no session-start hook). Install locations are documented for the user, not a generator concern.

<req id="FR-VAR-0080" type="FR" level="System" ticketId="138, 315" classification="technical">
  <title>Antigravity combined-plugin output</title>
  <statement>The Antigravity variant shall be a single plugin containing a preserved `plugin.json` at the plugin root, a rendered `hooks.json`, and whichever of the `rules/`, `skills/` and `agents/` folders the building set contributes. It shall generate no folder index (FR-GEN-0001, dormant). It shall be the sole Antigravity target and shall carry no dot-prefixed IDE config folder.</statement>
  <rationale>Antigravity plugins are identified by a root `plugin.json` and read the same package across all three products; a single superset plugin serves installation and in-repo extraction alike (the extra `plugin.json` is ignored when extracted natively), so no separate standalone target is warranted. The Antigravity contract is verified identical across all three products (`docs/hooks/antigravity.md`), and the plugin follows the same package pattern as every other target, so one package serves all three.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Antigravity variant of a set contributing rules, skills and agents When: generated Then: `plugin.json` exists at the plugin root together with those three folders, and no index file is generated.</criteria>
    <criteria>Given: the Antigravity variant When: generated Then: no dot-prefixed IDE config folder is emitted.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: the antigravity target in src/rosettify-plugins/src/spec/targets.ts produces a root
  plugin.json, a rendered hooks.json, and rules, skills and agents folders. Verified on generated
  rosetta-antigravity and core-antigravity: no INDEX.md and no dot-prefixed IDE configuration folder at
  the plugin root.</implementationNotes>
  <notes>MCP: Rosetta ships no MCP server for Antigravity, so no `mcp_config.json` is produced. If a preserved `mcp_config.json` is later added under `<preservedFilesSource>/template-antigravity/`, it is copied like any other preserved file (cf. Copilot `.mcp.json`).</notes>
  <depends>DATA-CFG-0003, DATA-CFG-0005, FR-VAR-0081, FR-VAR-0082, FR-VAR-0083, INT-IDE-0002</depends>
</req>

<req id="FR-VAR-0081" type="FR" level="System" ticketId="138, 315" classification="technical">
  <title>Antigravity content mapping</title>
  <statement>For the Antigravity variant the generator shall map Rosetta source folders to Antigravity components as follows: `rules` shall be placed under `rules/` with their authored frontmatter preserved unchanged — including any `trigger:` activation field, which the rule author controls; the generator neither adds nor overrides it (rules are NOT subject to the frontmatter reduction that applies to agents and skills); `skills` and `workflows` shall be placed under `skills/`, where each workflow becomes a skill folder `skills/<name>/SKILL.md` and that workflow's phases are emitted as files under `skills/<name>/phases/` (FR-COPY-0080); `agents` shall be placed under `agents/`. No `workflows/`, `configure/` or `templates/` folder shall appear in the output: the instruction source carries no `configure/` folder, the per-IDE guides being reference material of the `harness` skill under `skills/`, and `templates/` belongs to no plugin set.</statement>
  <rationale>Antigravity plugin packaging exposes `skills/` and `rules/` (and, for the CLI, `agents/`); it has no `workflows/` folder. Rosetta workflows are procedural (step/phase) units, matching Antigravity skills; Rosetta rules are persistent guidance, matching Antigravity rules. Agents map to the Antigravity subagent-templates folder — consumed by the CLI today and forward-compatible for the other products. The per-IDE configuration guides still ship, now as `harness` skill references under `skills/`, and still require verbatim treatment (FR-ARCH-0049); the IDE ignores what it does not consume.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a Rosetta workflow `coding-flow` When: generated for Antigravity Then: `skills/coding-flow/SKILL.md` exists and its phases appear under `skills/coding-flow/phases/`.</criteria>
    <criteria>Given: the Antigravity output When: inspected Then: no `workflows/` folder exists.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: verified on generated core-antigravity - skills/<name>/SKILL.md with a phases/ subfolder
  exists, no workflows, configure or templates folder appears anywhere in antigravity output, and rules
  frontmatter such as trigger: always_on is preserved unchanged.</implementationNotes>
  <depends>FR-VAR-0080, FR-COPY-0080, FR-COPY-0081</depends>
</req>

<req id="FR-VAR-0082" type="FR" level="System" ticketId="138" classification="technical">
  <title>Antigravity bootstrap via always-on rule</title>
  <statement>The Antigravity variant shall deliver the bootstrap context through the source's natively auto-loaded bootstrap rule — authored with `trigger: always_on` (e.g. `bootstrap-alwayson.md`, `plugin-files-mode.md`) — and shall not deliver bootstrap through a session-start hook. The generator shall preserve that authored activation (it does not set triggers), assemble and size-check the bootstrap values uniformly (FR-VAR-0070), and omit the bootstrap placeholder from the Antigravity hook template.</statement>
  <rationale>Antigravity has no session-start hook mechanism; its hooks are tool-event hooks. Delivery via a `trigger: always_on` rule is verified across the three products; it is the auto-loaded surface that carries bootstrap (Antigravity's `SessionStart`-analog, `PreInvocation`, is reserved for other hooks, not bootstrap). This is consistent with the FR-VAR-0070 principle that delivery is owned by the preserved templates/rules, not a generator strategy flag.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-07-23</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Antigravity variant When: generated Then: the bootstrap rule carries `trigger: always_on` and contains the bootstrap bodies.</criteria>
    <criteria>Given: the Antigravity `hooks.json` When: inspected Then: it carries no bootstrap payload.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/plugin-processors/plugin-assemble-antigravity-bootstrap.ts (assemble+size-check, payload discarded); hooks.json.tmpl omits the bootstrap placeholder. Bootstrap rides the source's authored always-on rule (unchanged).</implementationNotes>
  <depends>FR-VAR-0070, FR-VAR-0083, FR-HOOK-0001</depends>
</req>

<req id="FR-VAR-0083" type="FR" level="System" ticketId="138, 315" classification="technical">
  <title>Antigravity hook template and advisory-hook exclusion</title>
  <statement>The Antigravity variant shall render its hook configuration from a preserved `hooks.json.tmpl` authored to the Antigravity hooks specification (PreInvocation event), and that rendered configuration shall not inject the bootstrap payload. Which hooks it carries shall be decided by the building set's declared hook list (FR-SET-0070) and by nothing target-specific: an advisory PostToolUse hook whose output Antigravity discards shall be excluded by omitting it from the hook list declared for the sets built for this target, not by a rule that names this target. The generator shall place, and the assembled hook configuration shall carry, exactly the hooks that list names (FR-HOOK-0020, FR-GEN-0011).</statement>
  <rationale>The hook template is retained for tool-event hook use and for the uniform render step, but bootstrap is delivered by the always-on rule (FR-VAR-0082), so this target's `HOOK_LAYOUTS` entry declares a null bootstrap slot and the assembled document carries no payload — mirroring the Cursor asymmetry in FR-VAR-0070. Antigravity ignores hook output on PostToolUse (its protocol discards it), so an advisory hook such as `lint-format`, `md-file` or `loose-files` would consume runtime with no effect there. Expressing that exclusion as a declared hook list rather than a target-named rule is what keeps it out of generator control flow (FR-ARCH-0005): the same mechanism that gives each set its own hooks gives this target its own, with no identity branch. The precise PreInvocation schema is owned by the Antigravity hooks guide `docs/hooks/antigravity.md`, with a reference config at `docs/hooks/antigravity/hooks.json`, per INT-IDE-0002.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the preserved Antigravity `hooks.json.tmpl` and a set declaring a bootstrap flag or a non-empty hook list When: rendered Then: a real `hooks.json` is produced in the output and NO `.tmpl` remains in the output.</criteria>
    <criteria>Given: the rendered Antigravity `hooks.json` When: inspected Then: it contains no bootstrap payload and conforms to the shape in `docs/hooks/antigravity.md` (tool events wrapped in `{matcher, hooks:[…]}`; non-tool events a flat handler list).</criteria>
    <criteria>Given: a set whose declared hook list omits `lint-format`, `md-file` and `loose-files` When: the Antigravity variant is generated Then: the assembled configuration carries none of them and none of those bundles is placed.</criteria>
    <criteria>Given: the generator source When: inspected Then: it contains no rule naming the Antigravity target as the reason an advisory hook is excluded (FR-ARCH-0005).</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented against the corrected text: the preserved plugins/template-antigravity/hooks.json.tmpl
  renders to a real hooks.json with no .tmpl remaining in output; the assembled document carries no
  bootstrap payload because HOOK_LAYOUTS.antigravity declares bootstrap: null
  (src/rosettify-plugins/src/spec/hook-layouts.ts), and it conforms to the Antigravity envelope shape
  {rosetta:{enabled,PreInvocation,...}}; the advisory modules lint-format-advisory, md-file-advisory,
  loose-files and codemap-refresh appear in neither the configuration nor the shipped bundles, because
  HOOK_LAYOUTS.antigravity binds only dangerous-actions and read-once and modulesForTarget
  (src/rosettify-plugins/src/spec/targets.ts) intersects the set's list with what the layout binds; and
  plugin-assemble-hooks-json.ts contains no occurrence of the target name, so the exclusion is layout data
  with no identity branch in control flow. CORRECTED in this pass: the statement previously said the
  TEMPLATE references the declared hooks and that it omits a bootstrap placeholder - selection and
  omission are both decided by the assembler and HOOK_LAYOUTS, the template being the single line
  {{{hooks_json}}}.</implementationNotes>
  <depends>FR-VAR-0082, INT-IDE-0002, FR-SET-0070, FR-HOOK-0020</depends>
  <notes>Grounded facts (per `docs/hooks/antigravity.md`): `SessionStart` is not a valid Antigravity event (its analog is `PreInvocation @ invocationNum:0`); `PostToolUse` output is `{}` (ignored) — the reason the advisory hooks are excluded; bootstrap rides the always-on rule (FR-VAR-0082), not the PreInvocation hook. The exclusion applies to the sets built for this target only; the same hook names remain available to other targets.</notes>
</req>
