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
  <implementationNotes>src/plugin-generator/src/plugin-processors/plugin-assemble-{claude,cursor,copilot,codex}-bootstrap.ts (all 4 IDEs always assemble full bootstrap); templateContext['bootstrap_hooks'] (one key, no per-IDE suffix); plugins/core-claude/hooks/hooks.json.tmpl, plugins/core-codex/.codex-plugin/hooks.json.tmpl, plugins/core-copilot/.github/plugin/hooks.json.tmpl (placeholder renamed from bootstrap_hooks_<ide> to bootstrap_hooks); cursor template has no placeholder — payload assembled but not injected.</implementationNotes>
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
  <implementationNotes>src/plugin-generator/src/spec/targets.ts (cursor and copilot specs carry both hook template forms). Tied to FR-VAR-0070 bootstrap delivery rework.</implementationNotes>
</req>

<req id="FR-VAR-0072" type="FR" level="System" ticketId="" classification="technical">
  <title>Standalone index/instruction injection rationale</title>
  <statement>Where a standalone target delivers bootstrap through native rules or auto-loaded instructions, the generator shall ensure the workflow index and the plugin-root instructions are present in that natively-loaded file, inserted via the `pluginInjectSections()` processor (FR-ARCH-0051).</statement>
  <rationale>A standalone carries no session-start hook to convey the workflow catalog or the plugin-root path, so that information must travel in the rule/instruction file the IDE auto-loads. The insertion is an explicit content-only processor, not an in-place edit bolted onto a derivation pass.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-11</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: Cursor-standalone When: generated Then: the commands index and plugin-root instructions appear in the auto-loaded rule file.</criteria>
    <criteria>Given: Copilot-standalone When: generated Then: the workflow index and plugin-root instructions appear in the auto-loaded instructions file.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/plugin-generator/src/plugin-processors/plugin-inject-sections.ts; src/plugin-generator/src/spec/targets.ts (cursor-standalone and copilot-standalone injection declarations). Tied to FR-VAR-0070 bootstrap delivery rework.</implementationNotes>
  <depends>FR-VAR-0070, FR-ARCH-0051</depends>
</req>

## Claude (`core-claude`) — marketplace

Native folder names, short model names, hooks, `.claude-plugin` manifest. Bootstrap via **session-start hooks** (no always-on rule auto-load for this payload); native dedup.

<req id="FR-VAR-0010" type="FR" level="System" ticketId="" classification="technical">
  <title>Claude output</title>
  <statement>The Claude variant shall contain instruction folders unchanged in name, model values in Claude short-name vocabulary, generated `rules` and `workflows` indexes, a rendered `hooks/hooks.json`, and a preserved `.claude-plugin` config folder.</statement>
  <rationale>Claude Code consumes native folder names, short model names, and a plugin manifest.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Claude variant When: generated Then: `rules/INDEX.md`, `workflows/INDEX.md`, and `hooks/hooks.json` exist and `.claude-plugin` is preserved.</criteria>
    <criteria>Given: a document model `claude-opus-4-6` When: generated Then: its model reads `opus`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>DATA-CFG-0003, FR-COPY-0021, FR-GEN-0001, FR-GEN-0010, FR-HOOK-0001, FR-VAR-0070</depends>
</req>

## Cursor (`core-cursor`) — marketplace

`workflows`→`commands`, `rules/*.md`→`*.mdc`, Cursor model vocabulary, two hook-template forms. Marketplace form delivers bootstrap via **session-start hooks**; the standalone derivative uses native rules (see FR-VAR-0050).

<req id="FR-VAR-0020" type="FR" level="System" ticketId="" classification="technical">
  <title>Cursor output</title>
  <statement>The Cursor variant shall rename `workflows` to `commands`, rename `rules/*.md` to `*.mdc`, use Cursor model vocabulary, generate `rules` and `commands` indexes, render both plugin-form and standalone-form hook templates, and preserve a `.cursor-plugin` config folder.</statement>
  <rationale>Cursor expects `commands/`, `.mdc` rules, mapped model identifiers, and two hook template forms.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-11</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Cursor variant When: generated Then: `commands/` exists, `rules/*.mdc` exist, and `commands/INDEX.md` reads `# Rosetta Workflows Index`.</criteria>
    <criteria>Given: a cross-reference to `workflows/x.md` When: generated Then: it reads `commands/x.md`.</criteria>
    <criteria>Given: cursor When: bootstrap assembled Then: each entry = `{"type":"command","command":"printf '%s' '{\"additional_context\":\"<body>\"}'"}` and the plugin-root entry uses `${CURSOR_PROJECT_DIR}` for env-var expansion.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/plugin-generator/src/plugin-processors/plugin-assemble-cursor-bootstrap.ts (buildCursorBootstrapEntry, CURSOR_PLUGIN_ROOT_ENTRY); src/plugin-generator/src/escaping/json-string.ts (buildCursorHookPayloadJson); src/plugin-generator/src/spec/bootstrap-manifest.ts (CURSOR_PLUGIN_ROOT_ENTRY). Bootstrap assembled for ALL IDEs; cursor template has no {{{bootstrap_hooks}}} placeholder so payload is not injected — template decision per FR-VAR-0070.</implementationNotes>
  <depends>FR-COPY-0030, FR-COPY-0031, FR-COPY-0032, FR-GEN-0004, FR-VAR-0071, FR-VAR-0070, FR-HOOK-0005</depends>
</req>

## Copilot (`core-copilot`) — marketplace

`workflows`→`commands`, agents→`*.agent.md`, Copilot model vocabulary, runtime config at plugin root, `.github` preserved. Bootstrap via **session-start hooks** with a per-entry dedup lock (Copilot fires hooks twice).

<req id="FR-VAR-0030" type="FR" level="System" ticketId="" classification="technical">
  <title>Copilot output</title>
  <statement>The Copilot variant shall rename `workflows` to `commands`, rename agent files to `*.agent.md`, use Copilot model vocabulary, generate `rules` and `commands` indexes, render hook templates, and preserve a `.github` config folder. It shall produce exactly three `hooks.json` files at distinct paths: (1) `.github/plugin/hooks.json` — the plugin-form hooks, rendered from `.github/plugin/hooks.json.tmpl`; (2) `hooks.json` at the plugin root — an alternate-name copy of `.github/plugin/hooks.json` with identical content, expressed as an additional `SpecEntry` (`fileRename()` target `"."`) and not a bespoke layout step; (3) `hooks/hooks.json` — the standalone-form hooks, rendered from `hooks/hooks.json.tmpl` (standalone-form template). Files (1) and (2) shall be byte-identical.</statement>
  <rationale>Copilot expects `*.agent.md` agents, mapped model names, and the plugin-form hooks accessible at the plugin root. The root copy is an alternate-name duplication (not a rename — both source and root copy are present), confirmed byte-identical by MD5 in the r2/r3 baseline. The standalone-form hooks at `hooks/hooks.json` serve in-repo (standalone) extraction. Three distinct paths, three distinct purposes.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Copilot variant When: generated Then: agent files end in `.agent.md`.</criteria>
    <criteria>Given: the Copilot variant When: generated Then: exactly three `hooks.json` files exist at `hooks.json` (root), `.github/plugin/hooks.json`, and `hooks/hooks.json`.</criteria>
    <criteria>Given: `hooks.json` (root) and `.github/plugin/hooks.json` When: compared Then: they are byte-identical (same MD5).</criteria>
    <criteria>Given: `hooks/hooks.json` When: inspected Then: it contains the standalone-form hooks with `"sessionStart": []` (empty, no bootstrap payload for standalone use).</criteria>
  </acceptance>
  <implementation>ToBeModified</implementation>
  <implementationNotes>ToBeModified: clean-architecture re-implementation (runtime layout via SpecEntry, RECON-2). corrected to match generator baseline; pending owner review — original stated "root copy expressed as a SpecEntry/fileRename() target" without clarifying that .github/plugin/hooks.json also remains (both present, not renamed); original omitted hooks/hooks.json (standalone-form) entirely; baseline MD5 confirms root hooks.json = .github/plugin/hooks.json (b53bc4cfbc0c19eb6ceebd4717211b6c for r2)</implementationNotes>
  <depends>FR-COPY-0031, FR-COPY-0033, FR-HOOK-0006, FR-VAR-0071</depends>
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

## Codex (`core-codex`) — marketplace

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

<req id="FR-VAR-0041" type="FR" level="System" ticketId="" classification="technical">
  <title>Codex directory layout</title>
  <statement>The Codex variant shall place instruction folders under the Codex agent-config root (`.agents/…`) by `SpecEntry` `target` placement (with `fileRename()` where filenames also change) rather than a post-hoc move pass, mirror hook configuration to the Codex runtime location, generate `rules` and `workflows` indexes, and preserve a `.codex-plugin` config folder.</statement>
  <rationale>Codex resolves instructions and hooks from specific reserved directories. Expressing the layout as each file's `fileRename()` target keeps it within the uniform pipeline (no `generate_codex_runtime_layout`-style imperative move of whole folders).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Codex variant When: generated Then: instruction folders reside under the Codex agent-config root and hook config is mirrored to the Codex runtime location.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Cursor standalone (`core-cursor-standalone`) — in-repo extraction

All content under `.cursor/`; bootstrap delivered via **native Cursor rules** (`.mdc`) — no session-start bootstrap hook; standalone-form hooks at `.cursor/hooks.json`.

<req id="FR-VAR-0050" type="FR" level="System" ticketId="" classification="technical">
  <title>Cursor standalone output</title>
  <statement>The Cursor-standalone variant shall be generated from the instruction source by the same uniform pipeline as every other target (not derived from `core-cursor`'s output), with Cursor adaptations laid out entirely under `.cursor/`: a standalone-form hook configuration, the commands index and plugin-root instructions injected (via `pluginInjectSections()`) into the plugin-files-mode rule, no plugin-marketplace-only templates or config (simply not emitted — no cleanup pass), and a generated plugin manifest.</statement>
  <rationale>In-repo extraction needs IDE-rooted paths and rule-delivered bootstrap. Generating directly from source — rather than deriving from the main plugin — removes the coupling AC-1 identifies as the root of repeated standalone defects (and the `.cursor/.cursor/` self-nesting guard, QF-4).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Cursor-standalone variant When: generated Then: all content sits under the IDE subfolder with a top-level standalone hook config and no marketplace-only template files.</criteria>
    <criteria>Given: the Cursor-standalone target generated in isolation When: complete Then: its output is complete and correct.</criteria>
    <criteria>Given: the generation design When: inspected Then: the standalone is produced from the instruction source, not by reading `core-cursor`'s output.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-CLI-0040, FR-SEED-0002, FR-VAR-0070, FR-VAR-0072, FR-ARCH-0051</depends>
</req>

## Copilot standalone (`core-copilot-standalone`) — in-repo extraction

All content under `.github/`; bootstrap delivered via **auto-loaded instructions** (`instructions/*.instructions.md`, `applyTo: "**"`) — no session-start bootstrap hook; workflows as `prompts/*.prompt.md`; nested standalone hooks.

<req id="FR-VAR-0051" type="FR" level="System" ticketId="" classification="technical">
  <title>Copilot standalone output</title>
  <statement>The Copilot-standalone variant shall be generated from the instruction source by the same uniform pipeline as every other target (not derived from `core-copilot`'s output), with Copilot adaptations laid out entirely under `.github/`: bootstrap rules relocated (via a relocation `SpecEntry` `target` and `fileRename()`) to auto-loaded instruction files, workflow content under `prompts` with `*.prompt.md` names, nested standalone hook configuration, regenerated indexes, plugin instructions injected (via `pluginInjectSections()`), no plugin-marketplace-only config (simply not emitted — no cleanup pass), and a generated plugin manifest.</statement>
  <rationale>Copilot in-repo extraction auto-loads instructions and expects `prompts/*.prompt.md`. Generating directly from source removes the derive-from-main coupling (AC-1); relocation is `fileRename()` and injection is `pluginInjectSections()`, not pre/post-cleanup passes.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Copilot-standalone variant When: generated Then: bootstrap rules appear as `instructions/*.instructions.md`, workflows appear as `prompts/*.prompt.md`, and nested standalone hook config exists.</criteria>
    <criteria>Given: the Copilot-standalone target generated in isolation When: complete Then: its output is complete and correct.</criteria>
    <criteria>Given: the generation design When: inspected Then: the standalone is produced from the instruction source, not by reading `core-copilot`'s output.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
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
