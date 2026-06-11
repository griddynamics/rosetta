# plugin-generator — Per-Target Folder Structures (examples)

Generalized, compressed example of each target's output tree, with provenance. These are the structures the generator must produce. Trees are illustrative (file counts/names abbreviated); exact per-IDE format is owned by the guides (INT-IDE-0002).

**Legend** — `[P]` preserved (committed input, not generated; seeded each run by `pluginCopy`) · `[G]` generated from the instruction source · `← x` = logical provenance (derived from x) · `after y` = produced after step y. All `[G]` outputs are produced by the two-tier processor pipeline (FR-ARCH); provenance notes denote *what feeds what*, not imperative passes — folder moves are a `SpecEntry` `target`, suffix renames are `fileRename()`, in-body reference updates are `pluginRewriteReferences()`, and section insertions are `pluginInjectSections()`. Standalone trees are generated directly from the instruction source (not derived from a main plugin's output).

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
  hooks/*.js                      [G] ← synced from hooks/dist (deterministic-hooks releases only)
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
  hooks/hooks.json + hooks/*.js   [G] ← rendered + hooks/dist
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
  hooks/*.js                      [G] ← synced from hooks/dist (deterministic-hooks releases only)
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
  .codex/hooks/{hooks.json,*.js}  [G] ← mirrored hook config + hooks/dist
  .agents/{rules,skills,workflows,configure,templates}/ + INDEX.md  [G] ← instruction folders moved under .agents (model→gpt-*+effort)
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

## Requirements

<req id="FR-STRUCT-0010" type="FR" level="System" ticketId="" classification="technical">
  <title>Marketplace target structures</title>
  <statement>Each marketplace target (core-claude, core-cursor, core-copilot, core-codex) shall produce the folder structure documented in its section above, preserving the `[P]` config/manifest paths and generating the `[G]` content from the instruction source.</statement>
  <rationale>The per-IDE on-disk layout is what each IDE loads; it is the concrete acceptance surface for generation.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a marketplace target generated When: its tree is inspected Then: it matches the documented structure, with `[P]` paths preserved and `[G]` paths regenerated.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-VAR-0010, FR-VAR-0020, FR-VAR-0030, FR-VAR-0031, FR-VAR-0041</depends>
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
