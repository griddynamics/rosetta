# plugin-generator — Per-Target Folder Structures (examples)

Generalized, compressed example of each target's output tree, with provenance. These are the structures the generator must produce. Trees are illustrative (file counts/names abbreviated); exact per-IDE format is owned by the guides (INT-IDE-0002).

**Legend** — `[P]` preserved (committed input, not generated; seeded each run by `pluginCopy`) · `[G]` generated from the instruction source · `← x` = logical provenance (derived from x) · `after y` = produced after step y. All `[G]` outputs are produced by the two-tier processor pipeline (FR-ARCH); provenance notes denote *what feeds what*, not imperative passes — folder moves are a `SpecEntry` `target`, suffix renames are `fileRename()`, in-body reference updates are `pluginRewriteReferences()`, and section insertions are `pluginInjectSections()`. Standalone trees are generated directly from the instruction source (not derived from a main plugin's output). `.tmpl` files are preserved SOURCE only (under `src/rosettify-plugins/plugins/<target>/`) — `pluginCopy` collects each into a frame for rendering but never seeds the `.tmpl` itself into the output tree; only the rendered `[G]` sibling (e.g. `hooks.json`) appears below. No target's output tree contains a `.tmpl` file.

## core-claude — marketplace (bootstrap: session-start hooks)
```
core-claude/
  .claude-plugin/plugin.json      [P] manifest
  agents/*.md                     [G] ← source agents (model→short names)
  rules/*.md + INDEX.md           [G] ← source rules (excl. bootstrap*, local-files-mode); INDEX generated
  skills/<name>/SKILL.md (+assets,references)  [G] ← source skills
  workflows/*.md + INDEX.md       [G] ← source workflows; INDEX lists tag:workflow only
  configure/*.md ; templates/shell-schemas/*  [G] ← source
  hooks/hooks.json                [G] ← rendered from hooks/hooks.json.tmpl [P]; bootstrap payload injected
  hooks/*.js                      [G] ← synced from src/hooks/dist (deterministic-hooks releases only)
```

## core-cursor — marketplace (bootstrap: session-start hooks)
```
core-cursor/
  .cursor-plugin/plugin.json      [P] manifest
  commands/*.md + INDEX.md        [G] ← renamed from workflows/; refs rewritten
  rules/*.mdc + INDEX.md          [G] ← source rules, .md→.mdc
  agents/*.md ; skills/ ; configure/ ; templates/  [G] ← source (model→Cursor map)
  hooks/hooks.json.tmpl           [P] plugin-form template
  hooks.json.tmpl                 [P] standalone-form template (root; consumed by cursor-standalone)
  hooks/hooks.json + hooks/*.js   [G] ← rendered + src/hooks/dist
```

## core-copilot — marketplace (bootstrap: session-start hooks, bash+PowerShell, dedup lock)

Three `hooks.json` files are produced at distinct paths. `hooks.json` (root) and `.github/plugin/hooks.json` are byte-identical (alternate-name copy; MD5 confirmed in r2 baseline). `hooks/hooks.json` is the standalone-form rendered output (distinct content; `"sessionStart": []`).

```
core-copilot/
  .github/plugin/plugin.json      [P] manifest
  .github/plugin/hooks.json.tmpl  [P] plugin-form hook template
  .github/plugin/hooks.json       [G] ← rendered from .github/plugin/hooks.json.tmpl; plugin-form bootstrap payload
  hooks.json                      [G] ← alternate-name copy of .github/plugin/hooks.json (byte-identical); runtime layout for IDE (FR-VAR-0031)
  hooks/hooks.json.tmpl           [P] standalone-form hook template (consumed by copilot-standalone)
  hooks/hooks.json                [G] ← rendered from hooks/hooks.json.tmpl; standalone-form (sessionStart: [])
  hooks/*.js                      [G] ← synced from src/hooks/dist (deterministic-hooks releases only)
  agents/*.agent.md               [G] ← source agents, renamed
  commands/*.md + INDEX.md        [G] ← renamed from workflows/
  rules/*.md + INDEX.md           [G] ← source rules (model→Copilot map)
  skills/ ; configure/ ; templates/  [G] ← source
```

Note: `hooks.json` (root) and `.github/plugin/hooks.json` are produced as an alternate-name duplication (`SpecEntry`, FR-COPY-0033, FR-VAR-0031), not as a `fileRename()`. Both files are present in the output simultaneously.

## core-codex — marketplace (bootstrap: session-start hooks)
```
core-codex/
  .codex-plugin/{plugin.json [P], hooks.json.tmpl [P], hooks.json [G]}
  .codex/agents/*.toml            [G] ← source agents → Codex subagent format; sandbox from readonly flag
  .codex/hooks/{hooks.json,*.js}  [G] ← mirrored hook config + src/hooks/dist
  .agents/rules/*.md + INDEX.md   [G] ← source rules; rules index generated
  .agents/skills/<skill>/         [G] ← source skills
  .agents/skills/<workflow>/SKILL.md + phases/*.md
                                  [G] ← source workflows; phase frontmatter removed; NO workflows index
  .agents/{configure,templates}/  [G] ← source folders
```

## core-cursor-standalone — in-repo extraction (bootstrap: native rules; NO session-start bootstrap hook)
Cursor adaptations under `.cursor/`, generated from the instruction source.
```
core-cursor-standalone/
  plugin.json                     [G] ← version from Cursor manifest
  .cursor/
    rules/*.mdc + INDEX.md        [G] ← Cursor rules; bootstrap delivered HERE (native rules);
                                       commands/INDEX + plugin-root instructions injected into plugin-files-mode.mdc
    commands/*.md + INDEX.md      [G] ← from workflows/ (Cursor rename)
    agents/ ; skills/ ; configure/ ; templates/  [G]
    hooks/hooks.json + hooks/*.js [G] ← standalone-form hooks (.cursor-rooted paths)
```

## core-copilot-standalone — in-repo extraction (bootstrap: auto-loaded instructions; NO session-start bootstrap hook)
Copilot adaptations under `.github/`, generated from the instruction source.
```
core-copilot-standalone/
  plugin.json                     [G] ← version from Copilot manifest
  .github/
    instructions/*.instructions.md + plugin-files-mode.instructions.md  [G]
                                       ← bootstrap rules, moved from rules/ after copy, renamed; auto-loaded (applyTo "**");
                                         plugin-root instructions + prompts/INDEX + rules/INDEX injected into plugin-files-mode.instructions.md
    prompts/*.prompt.md + INDEX.md  [G] ← from commands/ (← workflows/), then *.md→*.prompt.md
    rules/*.md + INDEX.md         [G] ← remaining rules (bootstrap rules removed)
    agents/*.agent.md ; skills/ ; configure/ ; templates/  [G]
    hooks/hooks.json + hooks/*.js [G] ← nested standalone-form hooks (.github-rooted paths)
```

## core-antigravity — combined plugin, all three products (bootstrap: always-on rule; NO session-start hook)
One combined plugin (a superset of content). All three Antigravity products (Antigravity, Antigravity CLI, Antigravity IDE) read the root `plugin.json` and consume the components they support. No separate standalone target — in-repo use = extract this plugin (the extra `plugin.json` is ignored). No dot-prefixed config folder.
```
core-antigravity/
  plugin.json                     [P] manifest (root; carries a name — satisfies the CLI's required-name rule)
  hooks.json                      [G] ← rendered from hooks.json.tmpl [P]; PreInvocation form; NO bootstrap payload
  rules/*.md + INDEX.md           [G] ← source rules + templates; frontmatter preserved as authored (trigger set by the rule author, NOT the generator); bootstrap rule is authored trigger: always_on
  skills/<skill>/SKILL.md         [G] ← source skills; frontmatter reduced to name+description
  skills/<workflow>/SKILL.md + phases/*.md  [G] ← source workflows (workflow→skill; body-only phases; phase refs → APPLY SKILL FILE `phases/…`); SKILL frontmatter reduced to name+description
  skills/INDEX.md                 [G] ← generated skills index (Antigravity analog of Claude's workflow index)
  agents/*.md                     [G] ← source agents; frontmatter reduced to name+description only (model/mode/readonly/baseSchema dropped)
  configure/*.md                  [G] ← source configure, verbatim (like every other target; IDE ignores it — AG-6)
  hooks/*.js                      [G] ← synced from src/hooks/dist/bundles/core-antigravity; advisory hooks (lint-format, md-file, loose-files) excluded (FR-VAR-0083)
```
Note: for the `core-antigravity` target, the generator emits no `model:` (FR-COPY-0081), rewrites every `subagent_required_model` to `inherit` (FR-COPY-0082), and emits no `workflows/` folder (FR-VAR-0081). For the `core-codex` and `core-antigravity` targets, the generator removes workflow-phase frontmatter (FR-COPY-0080); the remaining adaptations apply only to `core-antigravity`.

## Requirements

<req id="FR-STRUCT-0010" type="FR" level="System" ticketId="" classification="technical">
  <title>Marketplace target structures</title>
  <statement>For each marketplace target (`core-claude`, `core-cursor`, `core-copilot`, `core-codex`), the generator shall produce the folder structure documented in its section above, preserving the `[P]` config/manifest paths and generating the `[G]` content from the instruction source.</statement>
  <rationale>The per-IDE on-disk layout is what each IDE loads; it is the concrete acceptance surface for generation.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-07-27</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a marketplace target When: the generator completes generation and its tree is inspected Then: it matches the documented structure, with `[P]` paths preserved and `[G]` paths regenerated.</criteria>
    <criteria>Given: the `core-codex` target When: the generator completes generation and its tree is inspected Then: workflows are skills under `.agents/skills/`, phase files have no frontmatter, and no `.agents/workflows/` folder or workflows index exists.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Generated `core-codex` structure now maps each workflow to `.agents/skills/&lt;name&gt;/SKILL.md` with owned phases under `phases/`, and emits no `.agents/workflows/` folder or index. `.agents/rules/INDEX.md`, `.codex-plugin/plugin.json`, `.codex-plugin/hooks.json`, the `.codex/hooks.json` mirror, `.codex/agents/*.toml`, and the plugin-root probe are all retained. Tests: `tests/unit/spec/targets-codex-output.test.ts`; `tests/e2e/parity.e2e.test.ts` consuming the independent oracle in `tests/e2e/parity-derive-structure.ts`, which re-derives expected paths locally and imports nothing from production. Verified on real r2 and r3 generation for all seven targets; the other five targets regenerate byte-identical to the committed tree.</implementationNotes>
  <depends>FR-VAR-0010, FR-VAR-0020, FR-VAR-0030, FR-VAR-0031, FR-VAR-0041, FR-VAR-0042</depends>
</req>

<req id="FR-STRUCT-0020" type="FR" level="System" ticketId="" classification="technical">
  <title>Standalone target structures</title>
  <statement>Each standalone target (core-cursor-standalone, core-copilot-standalone) shall produce the folder structure documented in its section above, laid out entirely under the IDE in-repo subfolder, generated from the instruction source.</statement>
  <rationale>In-repo extraction requires IDE-rooted paths and the IDE's native bootstrap-delivery layout.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a standalone target generated When: inspected Then: all content sits under the IDE subfolder and matches the documented structure.</criteria>
    <criteria>Given: a standalone target generated in isolation When: complete Then: its output is complete and matches the documented structure.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-CLI-0040, FR-VAR-0050, FR-VAR-0051, FR-VAR-0070, FR-VAR-0072</depends>
</req>

<req id="FR-STRUCT-0030" type="FR" level="System" ticketId="138" classification="technical">
  <title>Antigravity target structure</title>
  <statement>For the `core-antigravity` target, the generator shall produce the folder structure documented in its section above: a preserved `[P]` root `plugin.json`, a rendered `[G]` `hooks.json`, and generated `[G]` `rules/`, `skills/` (with body-only workflow phases under `skills/<name>/phases/`), and `agents/` content — with agent and skill frontmatter reduced to `name`+`description`, every `subagent_required_model` rewritten to `inherit`, and no `workflows/` folder and no dot-prefixed config folder.</statement>
  <rationale>The single combined Antigravity plugin is the on-disk surface all three Antigravity products load; this tree is its concrete acceptance surface.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-07-27</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the `core-antigravity` target When: the generator completes generation and its tree is inspected Then: it matches the documented structure, with `plugin.json` preserved and all other content regenerated, and no `workflows/` folder present.</criteria>
    <criteria>Given: a workflow phase and the `core-antigravity` target When: the generator processes the phase Then: its emitted file under `skills/<name>/phases/` has no YAML frontmatter.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>The generated `core-antigravity` structure is unchanged — `skills/`, `rules/`, `agents/`, `configure/`, `hooks.json`, `plugin.json`, and the workflow-derived `skills/INDEX.md` all remain — and its workflow entry now composes the shared `fileWorkflowToSkill`, so emitted phase files carry no YAML frontmatter. Post-index frontmatter reduction to `name` + `description` and the subagent-model rewrite remain Antigravity-only. Tests: `tests/unit/spec/targets-antigravity-output.test.ts`; `tests/e2e/sample.e2e.test.ts`. Verified on real r3 output: the only diff against the committed tree is phase-frontmatter removal plus the four FR-ARCH-0049 prose corrections.</implementationNotes>
  <depends>FR-VAR-0080, FR-VAR-0081, FR-VAR-0082, FR-VAR-0083, FR-COPY-0080, FR-COPY-0081, FR-COPY-0082</depends>
</req>
