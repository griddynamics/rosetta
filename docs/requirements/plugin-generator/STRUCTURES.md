# plugin-generator — Per-IDE-Target Folder Structures (examples)

Generalized, compressed example of each IDE target's output tree, with provenance. These are the structures the generator must produce. Each tree is a **template parameterized by the plugin set being built**: the output folder is `<set-name>-<ide>` plus the variant's destination suffix (FR-SET-0040), and which of `agents/`, `rules/`, `skills/` and `workflows/` actually appear depends on which folders that set declares (FR-SET-0020) — a set contributing no agents emits no `agents/` folder. The per-IDE shape below is identical for every set. Trees are illustrative (file counts/names abbreviated); exact per-IDE format is owned by the guides (INT-IDE-0002).

**Legend** — `[P]` preserved (committed input, not generated; seeded each run by `pluginCopy`) · `[G]` generated from the instruction source · `← x` = logical provenance (derived from x) · `after y` = produced after step y. All `[G]` outputs are produced by the two-tier processor pipeline (FR-ARCH); provenance notes denote *what feeds what*, not imperative passes — folder moves are a `SpecEntry` `target`, suffix renames are `fileRename()`, in-body reference updates are `pluginRewriteReferences()`, and the standalone extraction-root declaration is `pluginEmitDistributionRoot()`. Standalone trees are generated directly from the instruction source (not derived from a main plugin's output). `.tmpl` files are preserved SOURCE only (under `<preservedFilesSource>/<template>-<ide>/`) — `pluginCopy` collects each into a frame for rendering but never seeds the `.tmpl` itself into the output tree; only the rendered `[G]` sibling (e.g. `hooks.json`) appears below. No output tree contains a `.tmpl` file. No output tree contains an `INDEX.md`: folder-index generation is retained but declared by no set (FR-GEN-0001, dormant). A `hooks/` folder and a `hooks.json` appear only where the building set declares a bootstrap flag or a non-empty hook list, and carry exactly the hooks that list names (FR-SET-0070, FR-HOOK-0020).

## claude — marketplace (bootstrap: session-start hooks)
```
<set>-claude/
  .claude-plugin/plugin.json      [P] manifest; name/description written from the set (DATA-CFG-0007)
  agents/*.md                     [G] ← source agents (model→short names)
  rules/*.md                      [G] ← source rules (excl. bootstrap*, local-files-mode)
  skills/<name>/SKILL.md (+assets,references)  [G] ← source skills
  workflows/*.md                  [G] ← source workflows
  hooks/hooks.json                [G] ← rendered from hooks/hooks.json.tmpl [P]; bootstrap payload injected where the set declares it
  hooks/*.js                      [G] ← the set's declared hook bundles, synced from src/hooks/dist (deterministic-hooks runs only)
```

## cursor — marketplace (bootstrap: session-start hooks)
```
<set>-cursor/
  .cursor-plugin/plugin.json      [P] manifest
  commands/*.md                   [G] ← renamed from workflows/; refs rewritten
  rules/*.mdc                     [G] ← source rules, .md→.mdc
  agents/*.md ; skills/           [G] ← source (model→Cursor map)
  hooks/hooks.json.tmpl           [P] plugin-form template
  hooks.json.tmpl                 [P] standalone-form template (root; consumed by cursor-standalone)
  hooks/hooks.json + hooks/*.js   [G] ← rendered + the set's declared bundles from src/hooks/dist
```

## copilot — marketplace (bootstrap: session-start hooks, bash+PowerShell, dedup lock)

Three `hooks.json` files are produced at distinct paths. `hooks.json` (root) and `.github/plugin/hooks.json` are byte-identical (alternate-name copy; MD5 confirmed in r2 baseline). `hooks/hooks.json` is the standalone-form rendered output (distinct content; `"sessionStart": []`).

```
<set>-copilot/
  .github/plugin/plugin.json      [P] manifest
  .github/plugin/hooks.json.tmpl  [P] plugin-form hook template
  .github/plugin/hooks.json       [G] ← rendered from .github/plugin/hooks.json.tmpl; plugin-form bootstrap payload
  hooks.json                      [G] ← alternate-name copy of .github/plugin/hooks.json (byte-identical); runtime layout for IDE (FR-VAR-0031)
  hooks/hooks.json.tmpl           [P] standalone-form hook template (consumed by copilot-standalone)
  hooks/hooks.json                [G] ← rendered from hooks/hooks.json.tmpl; standalone-form (sessionStart: [])
  hooks/*.js                      [G] ← the set's declared hook bundles, synced from src/hooks/dist (deterministic-hooks runs only)
  agents/*.agent.md               [G] ← source agents, renamed
  commands/*.md                   [G] ← renamed from workflows/
  rules/*.md                      [G] ← source rules (model→Copilot map)
  skills/                         [G] ← source
```

Note: `hooks.json` (root) and `.github/plugin/hooks.json` are produced as an alternate-name duplication (`SpecEntry`, FR-COPY-0033, FR-VAR-0031), not as a `fileRename()`. Both files are present in the output simultaneously.

## codex — marketplace (bootstrap: session-start hooks)
```
<set>-codex/
  .codex-plugin/{plugin.json [P], hooks.json.tmpl [P], hooks.json [G]}
  .codex/agents/*.toml            [G] ← source agents → Codex subagent format; sandbox from readonly flag
  .codex/hooks/{hooks.json,*.js}  [G] ← mirrored hook config + the set's declared bundles from src/hooks/dist
  .agents/rules/*.md              [G] ← source rules
  .agents/skills/<skill>/         [G] ← source skills
  .agents/skills/<workflow>/SKILL.md + phases/*.md
                                  [G] ← source workflows; phase frontmatter removed
```

## cursor-standalone — in-repo extraction (bootstrap: native rules; NO session-start bootstrap hook)
Cursor adaptations under `.cursor/`, generated from the instruction source.
```
<set>-cursor-standalone/
  plugin.json                     [G] ← version from Cursor manifest
  .cursor/
    rules/*.mdc                   [G] ← Cursor rules; bootstrap delivered HERE (native rules);
                                       plugin-root instructions injected into plugin-files-mode.mdc
    commands/*.md                 [G] ← from workflows/ (Cursor rename)
    agents/ ; skills/             [G]
    hooks/hooks.json + hooks/*.js [G] ← standalone-form hooks (.cursor-rooted paths); the set's declared bundles
```

## copilot-standalone — in-repo extraction (bootstrap: auto-loaded instructions; NO session-start bootstrap hook)
Copilot adaptations under `.github/`, generated from the instruction source.
```
<set>-copilot-standalone/
  plugin.json                     [G] ← version from Copilot manifest
  .github/
    instructions/*.instructions.md + plugin-files-mode.instructions.md  [G]
                                       ← bootstrap rules, moved from rules/ after copy, renamed; auto-loaded (applyTo "**");
                                         plugin-root instructions injected into plugin-files-mode.instructions.md
    prompts/*.prompt.md           [G] ← from commands/ (← workflows/), then *.md→*.prompt.md
    rules/*.md                    [G] ← remaining rules (bootstrap rules removed)
    agents/*.agent.md ; skills/   [G]
    hooks/hooks.json + hooks/*.js [G] ← nested standalone-form hooks (.github-rooted paths); the set's declared bundles
```

## antigravity — combined plugin, all three products (bootstrap: always-on rule; NO session-start hook)
One combined plugin (a superset of content). All three Antigravity products (Antigravity, Antigravity CLI, Antigravity IDE) read the root `plugin.json` and consume the components they support. No separate standalone target — in-repo use = extract this plugin (the extra `plugin.json` is ignored). No dot-prefixed config folder.
```
<set>-antigravity/
  plugin.json                     [P] manifest (root; carries a name — satisfies the CLI's required-name rule)
  hooks.json                      [G] ← rendered from hooks.json.tmpl [P]; PreInvocation form; NO bootstrap payload
  rules/*.md                      [G] ← source rules; frontmatter preserved as authored (trigger set by the rule author, NOT the generator); bootstrap rule is authored trigger: always_on
  skills/<skill>/SKILL.md         [G] ← source skills; frontmatter reduced to name+description
  skills/<workflow>/SKILL.md + phases/*.md  [G] ← source workflows (workflow→skill; body-only phases; phase refs → APPLY SKILL FILE `phases/…`); SKILL frontmatter reduced to name+description
  agents/*.md                     [G] ← source agents; frontmatter reduced to name+description only (model/mode/readonly/baseSchema dropped)
  hooks/*.js                      [G] ← the set's declared hook bundles, synced from src/hooks/dist; a set built for this target declares no advisory hook (FR-VAR-0083)
```
Note: for the `antigravity` target, the generator emits no `model:` (FR-COPY-0081), rewrites every `subagent_required_model` to `inherit` (FR-COPY-0082), and emits no `workflows/` folder (FR-VAR-0081). For the `codex` and `antigravity` targets, the generator removes workflow-phase frontmatter (FR-COPY-0080); the remaining adaptations apply only to `antigravity`.

## Requirements

<req id="FR-STRUCT-0010" type="FR" level="System" ticketId="315" classification="technical">
  <title>Marketplace target structures</title>
  <statement>For each marketplace IDE target, the generator shall produce the folder structure documented in that target's section above, preserving the `[P]` config/manifest paths and generating the `[G]` content from the building set's instruction source. The documented tree is a template parameterized by the set: a content folder appears only where the set contributes files to it, and the output folder is named per FR-SET-0040. Which IDE targets are marketplace targets is fixed by DATA-CFG-0003, not enumerated here.</statement>
  <rationale>The per-IDE on-disk layout is what each IDE loads; it is the concrete acceptance surface for generation.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a marketplace IDE target When: the generator completes generation and its tree is inspected Then: it matches the documented structure, with `[P]` paths preserved and `[G]` paths regenerated.</criteria>
    <criteria>Given: the `codex` target When: the generator completes generation and its tree is inspected Then: workflows are skills under `.agents/skills/`, phase files have no frontmatter, and no `.agents/workflows/` folder exists.</criteria>
    <criteria>Given: the `search` set, which contributes only skills, built for `claude` When: its tree is inspected Then: `skills/` is present and no `agents/`, `rules/` or `workflows/` folder is emitted.</criteria>
    <criteria>Given: any marketplace plugin When: its tree is inspected Then: it contains no `INDEX.md` at any path.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: verified by a live generation run (49 output folders, exit 0). search-claude contains only
  .claude-plugin/ and its four solr skills - no agents, rules or workflows folder. core-codex maps
  workflows to .agents/skills/<name>/phases/*.md with no frontmatter, has no .agents/workflows/ folder,
  and retains .codex-plugin/ and .codex/ configuration. A search for INDEX.md across all 49 folders
  returns zero matches. CORRECTION: the earlier note claimed .agents/rules/INDEX.md is retained - no such
  file exists in the shipped output, since index generation is dormant. Tests:
  tests/unit/spec/targets-codex-output.test.ts and tests/e2e/parity.e2e.test.ts.</implementationNotes>
  <depends>FR-VAR-0010, FR-VAR-0020, FR-VAR-0030, FR-VAR-0031, FR-VAR-0041, FR-VAR-0042, FR-SET-0040</depends>
</req>

<req id="FR-STRUCT-0020" type="FR" level="System" ticketId="315" classification="technical">
  <title>Standalone target structures</title>
  <statement>Each standalone IDE target shall produce the folder structure documented in its section above, laid out entirely under the IDE in-repo subfolder, generated from the building set's instruction source. Which IDE targets are standalone is fixed by DATA-CFG-0003, not enumerated here.</statement>
  <rationale>In-repo extraction requires IDE-rooted paths and the IDE's native bootstrap-delivery layout.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a standalone target generated When: inspected Then: all content sits under the IDE subfolder and matches the documented structure.</criteria>
    <criteria>Given: any standalone plugin When: inspected Then: it contains no `INDEX.md` at any path and its auto-loaded file carries no injected index section.</criteria>
    <criteria>Given: a standalone target generated in isolation When: complete Then: its output is complete and matches the documented structure.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: verified by a live generation run - core-cursor-standalone places all content under
  .cursor/{rules,commands,skills} and core-copilot-standalone all under
  .github/{instructions,hooks,rules,prompts,skills}, with nothing outside the IDE subfolder and no
  INDEX.md anywhere in the output tree. Preserved-source seeding for both comes from the parent IDE's
  template folder via familyOf (src/rosettify-plugins/src/spec/targets.ts).</implementationNotes>
  <depends>FR-CLI-0040, FR-VAR-0050, FR-VAR-0051, FR-VAR-0070, FR-VAR-0072, FR-SET-0040</depends>
</req>

<req id="FR-STRUCT-0030" type="FR" level="System" ticketId="138, 315" classification="technical">
  <title>Antigravity target structure</title>
  <statement>For the `antigravity` target, the generator shall produce the folder structure documented in its section above: a preserved `[P]` root `plugin.json`, a `[G]` `hooks.json` rendered where the building set declares a bootstrap flag or a hook list, and generated `[G]` `rules/`, `skills/` (with body-only workflow phases under `skills/<name>/phases/`), and `agents/` content for whichever of those the set contributes — with agent and skill frontmatter reduced to `name`+`description`, every `subagent_required_model` rewritten to `inherit`, no `workflows/` folder, no `INDEX.md`, and no dot-prefixed config folder.</statement>
  <rationale>The single combined Antigravity plugin is the on-disk surface all three Antigravity products load; this tree is its concrete acceptance surface.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the `antigravity` target When: the generator completes generation and its tree is inspected Then: it matches the documented structure, with `plugin.json` preserved and all other content regenerated, and no `workflows/` folder and no `INDEX.md` present.</criteria>
    <criteria>Given: a workflow phase and the `antigravity` target When: the generator processes the phase Then: its emitted file under `skills/<name>/phases/` has no YAML frontmatter.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: verified by a live generation run of core-antigravity - preserved root plugin.json plus a
  generated hooks.json, rules/, skills/ with phase documents carrying no frontmatter, and agents/ per set
  contribution; no workflows folder, no INDEX.md and no dot-prefixed folder. Skill frontmatter is reduced
  to name and description by pluginAntigravityReduceFrontmatter
  (src/rosettify-plugins/src/plugin-processors/plugin-antigravity-reduce-frontmatter.ts). Tests:
  tests/unit/spec/targets-antigravity-output.test.ts and tests/e2e/sample.e2e.test.ts.</implementationNotes>
  <depends>FR-VAR-0080, FR-VAR-0081, FR-VAR-0082, FR-VAR-0083, FR-COPY-0080, FR-COPY-0081, FR-COPY-0082</depends>
</req>
