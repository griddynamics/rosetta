# plugin-generator — FR: Bootstrap Context Payloads and Hook Bundles

## Bootstrap context payload assembly

<req id="FR-HOOK-0001" type="FR" level="System" ticketId="315" classification="technical">
  <title>Assemble per-plugin bootstrap context entries</title>
  <statement>For each (set variant × IDE target) pair whose set declares the bootstrap flag, the `pluginAssembleBootstrap()` processor (FR-ARCH-0055) shall build session-start context entries from the bootstrap files present in that plugin, taken in the order of the bootstrap-file manifest (FR-HOOK-0009), reading each file's body from that plugin's own `frames` (the per-file `FileProcessingFrame`s), and shall make these entries available to template rendering. A set whose bootstrap flag is unset shall yield no entries at all. Because the manifest is matched against the files a set actually contains, a set that carries no bootstrap rule produces an empty payload rather than an error. Absent variants are skipped (but logged), not reordered.</statement>
  <rationale>Each plugin injects its own bootstrap rules into the agent's context at session start, in the IDE's hook format. The manifest order is what fixes the payload sequence. The bootstrap flag is declared per set because only the sets that own the always-on rules can meaningfully inject them; a domain set that ships no rule has nothing to assemble.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a plugin containing a subset of bootstrap files When: assembled Then: only present files yield entries, in manifest order; absent variants are skipped.</criteria>
    <criteria>Given: the assembled entries When: rendering Then: they are exposed as that plugin's payload values.</criteria>
    <criteria>Given: a set whose bootstrap flag is unset, such as `qe` When: assembled Then: no session-start entry is produced.</criteria>
    <criteria>Given: the `core` set, which owns the always-on rules When: assembled Then: its payload carries those rules' bodies in manifest order.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/bootstrap/payload.ts walks BOOTSTRAP_MANIFEST_ORDER
  (src/rosettify-plugins/src/spec/bootstrap-manifest.ts) in order, reads each present document's body from
  the plugin's own frames, and skips absent basenames rather than erroring; the per-IDE assemblers
  plugin-assemble-{claude,cursor,copilot,codex}-bootstrap.ts expose the result to rendering. A set whose
  bootstrap flag is unset yields no entries, gated by PluginSpec.bootstrap. NOTE: there is no symbol
  literally named pluginAssembleBootstrap - the work is split across payload.ts and the four per-IDE
  assemblers.</implementationNotes>
  <depends>FR-HOOK-0009, FR-SET-0070</depends>
</req>

<req id="FR-HOOK-0002" type="FR" level="System" ticketId="" classification="technical">
  <title>Strip frontmatter from bootstrap bodies</title>
  <statement>The generator shall embed only the body of each bootstrap document, excluding its frontmatter.</statement>
  <rationale>Frontmatter is authoring metadata, not agent context.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a bootstrap document with frontmatter When: embedded Then: the payload contains only the body.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-HOOK-0003" type="FR" level="System" ticketId="" classification="technical">
  <title>Bootstrap prefix on the designated lead document</title>
  <statement>The generator shall prepend the fixed bootstrap prefix to exactly one designated lead bootstrap document per target — the first bootstrap-classified entry in the ordered bootstrap-file manifest (FR-HOOK-0009) — and the designation shall be explicit, not an accident of list position.</statement>
  <rationale>The prefix instructs the agent to read the full bootstrap context first. The designated lead must be deterministic and explicit (resolving the former order-sensitivity quirk QF-1).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Deprecated</status>
  <approved_by>User</approved_by>
  <changed>2026-07-28</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a target's bootstrap files When: assembled Then: the prefix appears once, on the designated lead document.</criteria>
    <criteria>Given: the manifest When: inspected Then: the lead document is explicitly designated (e.g. `plugin-files-mode` first), not inferred from incidental ordering.</criteria>
  </acceptance>
  <implementation>Removed</implementation>
  <implementationNotes>2026-07-28 (Deprecated): the `BOOTSTRAP_PREFIX` string ("ALWAYS MUST FULLY READ THIS ENTIRE CONTEXT ... Rosetta get_context_instructions:") is obsolete now that session-start hooks are small and `get_context_instructions` is no longer used in this flow. The constant was removed from `src/spec/bootstrap-manifest.ts`; its application in `src/bootstrap/payload.ts` was removed, so every document's body is emitted as-is. The leading-newline strip is retained but now applies UNIFORMLY to every entry, not just the former lead: all bodies come from `stripFrontmatter` (FR-HOOK-0002) and therefore all carried a leading newline, so stripping only the first was arbitrary. With no prefix to place, `payload.ts` holds no lead concept at all; the `isLead` field was removed from `BootstrapEntryRef` (types.ts) and from all 9 `BOOTSTRAP_MANIFEST_ORDER` entries, and FR-HOOK-0009 was updated accordingly. Record kept because FR-HOOK-0009's manifest-order contract survives; only the prefix and the lead designation are gone.</implementationNotes>
  <depends>FR-HOOK-0009</depends>
</req>

<req id="FR-HOOK-0004" type="FR" level="System" ticketId="315" classification="technical">
  <title>Bootstrap payload carries no index entries</title>
  <statement>A bootstrap payload shall carry the bodies of bootstrap rule documents only and shall never carry a folder-index document, in any target. The descriptor shall carry no bootstrap-rule inclusion flag, the payload being assembled uniformly for every target; what decides whether that payload reaches the agent is outside this unit and is owned solely by FR-VAR-0070. It shall retain an index-entry inclusion flag as a RETAINED CAPABILITY: the field exists, defaults to disabled, and no plugin set enables it, so no index entry reaches any payload in any shipped plugin. The requirement is that the capability be present and unused, not that it be deleted.</statement>
  <rationale>An index lists one plugin's own documents, so a payload entry built from it would advertise a table of contents that is wrong the moment a second Rosetta plugin is installed beside it — the failure the index removal exists to prevent. `includeBootstrapRules` was retired because a descriptor flag whose only remaining value is the disabling one is the target name relabeled (FR-ARCH-0005). `includeIndexEntries` is deliberately kept instead of retired: index generation itself is a retained capability (FR-GEN-0001..0004), so the flag that gates index entries in the payload is kept beside it, pinned disabled. Keeping the pair together means re-enabling indexes is a declaration change rather than a re-implementation.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any plugin When: the payload is assembled Then: no entry derives from a folder-index document.</criteria>
    <criteria>Given: the payload assembly When: inspected Then: it is uniform across targets and gated by no per-target bootstrap-rule inclusion flag.</criteria>
    <criteria>Given: the descriptor When: inspected Then: it carries no `includeBootstrapRules` field, and carries `includeIndexEntries` set to the disabling value on every spec.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented against the corrected text: no payload entry derives from a folder-index document - verified
  on a real --release r3 build, zero INDEX.md files anywhere in the generated tree and zero references to
  the __rules_index__/__workflows_index__ basenames in any output. includeBootstrapRules is absent from
  the entire tree.
  includeIndexEntries is RETAINED as a capability: declared on PluginSpec in
  src/rosettify-plugins/src/types.ts, set to false for every spec in
  src/rosettify-plugins/src/spec/targets.ts, and honoured in
  src/rosettify-plugins/src/bootstrap/payload.ts, which skips every __-prefixed manifest entry while the
  flag is unset.</implementationNotes>
  <depends>FR-GEN-0001</depends>
</req>

<req id="FR-HOOK-0005" type="FR" level="System" ticketId="" classification="technical">
  <title>Per-IDE entry shape and escaping</title>
  <statement>The generator shall emit each bootstrap entry in the target IDE's hook schema as documented in that IDE's guide (INT-IDE-0002), applying the escaping required for that IDE's command interpreter so the embedded content is transported intact. This unit governs the entry OBJECT's own form and its escaping only; where that entry is placed — the event key, any matcher, the grouping and the file envelope — is carried as literal text by that target's hook configuration template (FR-GEN-0011) and is not restated here. The per-IDE entry shape shall be produced by a case-specific entry-building unit composed into that target's pipeline (selected by composition) and reusing shared low-level escaping and JSON helpers; it shall not be selected by branching on an identity-discriminant such as `hookEntryShape` (FR-ARCH-0005). This unit governs whether the entry a template receives CONFORMS to the IDE's documented schema and is escaped correctly, not where the template places it.</statement>
  <rationale>Each IDE expects a different hook schema and quoting; the exact schema is owned by the IDE guide, not duplicated here. Because the shapes differ by IDE, each is a case-specific entry builder composed per target rather than a switch on an identity-discriminant (FR-ARCH-0005).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-03</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any target When: assembled Then: each entry conforms to that IDE's session-start hook schema per its guide, with content transported intact.</criteria>
    <criteria>Given: a target whose command interpreter requires it When: assembled Then: entries carry the interpreter-specific command form(s) with correct escaping.</criteria>
    <criteria>Given: claude When: assembled Then: each entry = `{"type":"command","command":"printf '%s' '<json>'","once":true}`, the payload single-quoted for a POSIX shell.</criteria>
    <criteria>Given: codex When: assembled Then: each entry = `{"type":"command","command":"printf '%s' '<json>'","statusMessage":"Loading Rosetta bootstrap","timeout":30}`, carrying no `once` member.</criteria>
    <criteria>Given: copilot When: assembled Then: each entry = `{"type":"command","bash":"printf '%s' '<json>'","powershell":"Write-Output '<json>'"}`, carrying both interpreter forms with their own escaping.</criteria>
    <criteria>Given: copilot's embedded JSON payload When: inspected Then: it is `{"additionalContext":"<body>","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"<body>"}}` — additionalContext at BOTH top-level (honored by Copilot CLI) AND nested in hookSpecificOutput (honored by VS Code); neither placement alone reaches both runtimes (docs/hooks/copilot.md).</criteria>
    <criteria>Given: entries within a payload When: serialized Then: they are joined by `, ` (comma-space) and published as the shared `bootstrap_hooks` context value, which the target's hook configuration template injects raw into its bootstrap placeholder (FR-GEN-0011).</criteria>
    <criteria>Given: the entry-building code When: inspected Then: each IDE's entry shape comes from a case-specific unit composed per spec plus shared low-level helpers, with no branch on an identity-discriminant such as `hookEntryShape` (FR-ARCH-0005).</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/bootstrap/payload.ts (buildClaudeBootstrapEntry, buildCodexBootstrapEntry, buildCopilotBootstrapEntry, buildCursorBootstrapEntry exported; hookEntryShape switch deleted); src/rosettify-plugins/src/escaping/json-string.ts (buildCursorHookPayloadJson, buildCopilotHookPayloadJson added — the latter emits the merged top-level+nested shape); src/rosettify-plugins/src/plugin-processors/plugin-assemble-{claude,cursor,copilot,codex}-bootstrap.ts (per-IDE assemblers compose their own entry builder). Template context key: bootstrap_hooks (one shared key). Join separator: `, `.</implementationNotes>
  <depends>INT-IDE-0002, FR-ARCH-0005, FR-GEN-0011</depends>
</req>

<req id="FR-HOOK-0007" type="FR" level="System" ticketId="315" classification="technical">
  <title>Plugin-path context entry</title>
  <statement>The generator shall append to each session-hook target's bootstrap payload exactly one additional, SEPARATE session-start entry (the final entry) that reports the resolved plugin root path to the agent. This entry is NOT folded into any document's body; it is its own entry appended after all bootstrap-document entries, so the payload entry count = (present bootstrap-manifest documents) + 1. The entry uses the IDE's command shape with a double-quoted `printf` form (to allow runtime env/var expansion), and any instruction-path reference inside it is reference-rewritten per target (FR-HOOK-0008). Hooks generated for all IDEs always, regardless those are used or not. Template engineer decides to include it or solve it differently.</statement>
  <rationale>Agents need the plugin root to resolve instruction file paths at runtime. The entry remains distinct and final. The payload entry count is derived, never fixed: it follows from how many bootstrap-manifest documents the building set actually contains, so it varies by set and moves with the instruction source rather than being asserted as a number.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-03</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any session-hook target When: assembled Then: its payload includes exactly one plugin-root path entry, appended last, in that IDE's shape.</criteria>
    <criteria>Given: any session-hook plugin When: assembled Then: the SessionStart payload entry count equals the number of bootstrap-manifest documents that plugin contains, plus one for the plugin-root entry.</criteria>
    <criteria>Given: the `codex` and `claude` targets of one set When: each payload is assembled Then: both carry the same entry count, since no target omits a manifest document the others include.</criteria>
    <criteria>Given: a set whose bootstrap flag is unset When: assembled Then: no payload is emitted and therefore no plugin-root entry either.</criteria>
    <criteria>Given: the `claude` plugin-root entry When: inspected Then: command = `printf '%s' "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"Rosetta Plugin Path: ${CLAUDE_PLUGIN_ROOT}\"}}"` with `"once": true`.</criteria>
    <criteria>Given: the `codex` plugin-root entry When: inspected Then: it is a workspace-root probe resolving to `$workspace_root/.agents` with `statusMessage`+`timeout`; the `copilot` one is an agentPlugins-base probe (`.github/plugin/plugin.json`) resolving to `$root` with bash+powershell.</criteria>
    <criteria>Given: the `copilot` plugin-root entry When: inspected Then: its embedded JSON is `{"additionalContext":"Rosetta Plugin Path: <root>","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Rosetta Plugin Path: <root>"}}` — same merged top-level+nested requirement as FR-HOOK-0005's doc entries (docs/hooks/copilot.md).</criteria>
    <criteria>Given: `cursor` When: assembled Then: a plugin-root path entry is generated and included in the bootstrap payload, and is not injected into output because the Cursor hook templates carry no bootstrap placeholder (FR-GEN-0011, FR-VAR-0070).</criteria>
    <criteria>Given: a target whose plugin-path entry probes a fixed install location When: that entry is emitted Then: the file it guards on is one every plugin of every set carries at that location — not a document contributed by any particular set's instruction folders.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: COPILOT_PLUGIN_ROOT_BASH and COPILOT_PLUGIN_ROOT_POWERSHELL in
  src/rosettify-plugins/src/spec/bootstrap-manifest.ts guard on .github/plugin/plugin.json, the manifest the
  copilot spec emits for every set; the codex entry is the workspace-root probe in
  src/rosettify-plugins/src/plugin-processors/plugin-assemble-codex-bootstrap.ts; per-IDE command shapes come
  from each target's own hook configuration template. Payload entry count is derived from the bootstrap-manifest
  documents a plugin contains, never fixed. Tests: tests/e2e/bootstrap-session-start.e2e.test.ts and one case in
  each plugin-assemble-{claude,codex,copilot,cursor}-bootstrap.test.ts.</implementationNotes>
  <depends>FR-VAR-0041, FR-HOOK-0004, FR-SET-0070, FR-GEN-0011</depends>
  <notes>The Copilot plugin-path entry's criterion pinned the guard `commands/coding-flow.md`; that
  criterion was corrected on 2026-09-03 and the generator has not yet followed. After the
  #315 set split that document is absent from every `core`-based Copilot plugin — the workflow moved to
  the `workflows` set — so the entry became a permanent no-op there, emitting no plugin-root context in
  either shell, while continuing to work for `rosetta`. The guard is a test of the proposition "a Rosetta
  Copilot plugin is installed at this root", so it must name a file the plugin itself always carries:
  `.github/plugin/plugin.json` is the Copilot marketplace manifest, emitted unconditionally for every
  Copilot spec of every set, and it sits beside the very document the probe lives in. Note it is not at
  the plugin root — a Copilot plugin folder has no root `plugin.json`. Rejected: `rules/bootstrap-alwayson.md`,
  which works for both bootstrap-declaring sets today but couples an install-location probe to
  instruction-source content and would silently re-break on a future bootstrap set without that rule; and
  a bare directory test, which a stale or partially-deleted directory passes. Status moved Approved to
  Draft: a criterion changed and one was added, so the unit awaits re-approval.</notes>
</req>

<req id="FR-HOOK-0008" type="FR" level="System" ticketId="" classification="technical">
  <title>Reference rewriting of payload paths</title>
  <statement>The generator shall apply `pluginRewriteReferences()` semantics (FR-ARCH-0049) — the target's reference-rename map — to the bootstrap payload string values before template rendering, and only to those string values (never to the release template variables).</statement>
  <rationale>Bootstrap text references instruction folders that may be renamed for the target; the same content-only reference rewriting used in document bodies applies to the embedded payload strings. Release variables (release name, deterministic-hooks flag) must not pass through string rewriting.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a Cursor target renaming `workflows`→`commands` When: payloads are rendered Then: payload references read `commands/…`.</criteria>
    <criteria>Given: the release template variables When: rendered Then: they are not subjected to reference rewriting.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0049</depends>
</req>

<req id="FR-HOOK-0009" type="FR" level="System" ticketId="315" classification="technical">
  <title>Explicit, deterministic bootstrap-file order</title>
  <statement>The generator shall assemble bootstrap context from an explicit ordered bootstrap-file manifest, and that order shall be significant and stable: it determines the sequence of entries in the emitted payload. The `plugin-files-mode` document shall lead the manifest, followed by the `bootstrap-*` rule documents. The manifest shall retain its two index-document entries; whether they contribute to a payload is FR-HOOK-0004 and is not restated here. The order shall not depend on filesystem enumeration. No entry shall carry a per-entry lead designation: since the bootstrap prefix was removed (FR-HOOK-0003, Deprecated), no behavior distinguishes the first entry from the rest, and every entry's body is treated identically — including the leading-newline strip applied uniformly to all of them.</statement>
  <rationale>The agent must receive bootstrap context in a deliberate sequence (mode first, then policies). The original relied on the position of the first match in an in-code list (`_BOOTSTRAP_FILES`); the fragility that made this matter (QF-1) was that reordering silently moved the bootstrap prefix. With the prefix gone there is nothing position-sensitive left to protect, so the explicit `isLead` flag was removed rather than kept as a field no behavior reads. Manifest order remains a required contract for payload sequence and determinism.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a target's present bootstrap files When: the payload is assembled Then: entries appear in manifest order with `plugin-files-mode` first.</criteria>
    <criteria>Given: two runs over the same inputs When: compared Then: the entry order is identical and independent of directory listing order.</criteria>
    <criteria>Given: the assembled payload When: inspected Then: no entry is treated differently by virtue of its position, and no manifest entry carries a lead-designation flag.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented against the corrected text: BOOTSTRAP_MANIFEST_ORDER
  (src/rosettify-plugins/src/spec/bootstrap-manifest.ts) is an explicit in-code array, not filesystem
  enumeration, and leads with plugin-files-mode followed by the bootstrap-* rule documents;
  src/rosettify-plugins/src/bootstrap/payload.ts walks it in order and applies the leading-newline strip
  uniformly, holding no lead concept; isLead is absent from the entire tree, as is any per-entry lead
  designation on BootstrapEntryRef. The manifest retains __rules_index__ and __workflows_index__ as its
  last two entries, a dormant capability gated by includeIndexEntries which no spec enables - verified, no
  index document reaches any payload.</implementationNotes>
  <depends>NFR-0002</depends>
</req>

## Hook bundle synchronization

<req id="FR-HOOK-0020" type="FR" level="System" ticketId="315" classification="technical">
  <title>Deterministic-hooks gating over the set's declared bundles</title>
  <statement>Where the effective deterministic-hooks value (FR-CLI-0012) is enabled, the generator shall place into each plugin exactly the hook bundles the building set's declared hook list names (FR-SET-0070), together with the support modules those bundles import and the shared assets they require; it shall place no bundle the list does not name. Where the effective value is disabled, or where the set declares an empty hook list, it shall place no bundle and shall remove any stale hook bundle artifact from preserved hook folders. Which entries the rendered hook configuration carries is FR-SET-0070 and FR-GEN-0011; this unit governs only which bundle files are placed.</statement>
  <rationale>Only deterministic-hook generations ship runtime advisory hook code; other generations must stay lean. Selecting bundles by the declared list rather than by target identity is what lets several sets share one preserved template and still ship different runtime code — under identity-keyed selection every plugin of an IDE receives every bundle, so a set would advertise two hooks and ship every bundle that exists. Support modules travel with the bundle that imports them because a declared hook that loses a transitive import fails at runtime, in the user's IDE, with no build-time signal.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the effective deterministic-hooks value true and a set declaring hooks `dangerous-actions` and `codemap-refresh` When: generated Then: that plugin's hook folder contains those two bundles, their support modules and the shared assets, and no other bundle.</criteria>
    <criteria>Given: a set declaring `read-once` When: generated Then: the `read-once-reset` and `read-once-shared` support modules are present alongside it.</criteria>
    <criteria>Given: the effective deterministic-hooks value false When: generated Then: no compiled bundle artifacts remain in any hook folder.</criteria>
    <criteria>Given: a set declaring an empty hook list When: generated Then: no compiled bundle artifact is placed, whatever the effective deterministic-hooks value.</criteria>
    <criteria>Given: two sets of one IDE declaring different hook lists When: generated Then: each plugin carries only its own set's bundles.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: src/rosettify-plugins/src/plugin-processors/plugin-sync-bundles.ts derives the file list
  from the set's declaration as spec.hookModules.map((m) => `${m}.js`), so a plugin receives exactly the
  bundles its set names plus the support modules resolveHookModules pulled in, and no other. A missing
  bundle directory is now a HARD ERROR naming the directory and the set, where it previously returned
  silently and shipped zero hooks. The non-deterministic-hooks branch removes stale bundle artifacts.
  bundleSource remains in src/rosettify-plugins/src/types.ts, is set in targets.ts, and is read as
  spec.bundleSource ?? spec.name to pick the per-IDE bundle DIRECTORY, while hookModules selects which
  files are taken from it. The statement and criteria never mention bundleSource, so the unit itself is
  satisfied.</implementationNotes>
  <depends>DATA-CFG-0001, FR-CLI-0012, FR-SET-0070, DATA-CFG-0007</depends>
</req>

<req id="FR-HOOK-0021" type="FR" level="System" ticketId="" classification="technical">
  <title>Bundle source presence check</title>
  <statement>If deterministic hooks are required but the compiled hook build output is absent, the generator shall report the missing build and contribute a non-zero exit status.</statement>
  <rationale>Hooks must be built before generation; a clear error guides the operator.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: missing `src/hooks/dist` build output and a deterministic-hooks release When: generated Then: stderr names the missing build and exit status is non-zero.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-HOOK-0022" type="FR" level="System" ticketId="315" classification="technical">
  <title>Preserve unmanaged hook-folder files on sync</title>
  <statement>When placing hook bundles, the generator shall replace only files supplied by the declared bundles, their support modules, and the shared assets, preserving other files already present in the plugin's hook folder. A bundle present in the hook folder that the building set's declared hook list does not name shall be removed rather than preserved, since it is a stale artifact of an earlier declaration and would otherwise persist across regenerations.</statement>
  <rationale>Generated hook configuration and manifests coexist with bundle code in the same folder, so a blanket wipe would delete the rendered configuration. The undeclared-bundle carve-out exists because preservation and staleness point opposite ways for the same file: once bundles are selected per set, a bundle left from a previous declaration looks exactly like an unmanaged file and would ship forever.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-03</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a hook folder with a rendered `hooks.json` When: bundles are synced Then: `hooks.json` remains and bundle files are added/replaced.</criteria>
    <criteria>Given: a hook folder holding a `loose-files` bundle and a set whose declared hook list omits it When: bundles are synced Then: that bundle is removed.</criteria>
    <criteria>Given: a hook folder holding a support module of a declared bundle When: bundles are synced Then: the module is retained.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: pluginSyncBundles
  (src/rosettify-plugins/src/plugin-processors/plugin-sync-bundles.ts) calls sweepUndeclaredBundles
  unconditionally, outside the deterministic-hooks copy branch, so AC2 holds on both branches. The
  helper deletes only a `.js` the set no longer declares that the bundle source knows about; a rendered
  hooks.json, any non-`.js` file and any unrecognised `.js` survive, which is AC1 and AC3. Tests:
  tests/unit/plugin-processors/plugin-sync-bundles.test.ts — `r3: removes a previously-shipped bundle
  that the set has since dropped`, `r3: a set that dropped hooks entirely has its whole bundle set
  swept`, `preserves unmanaged files: a non-bundle .js and a non-.js file both survive`, and `r2:
  sweeps every managed bundle`. Nuance: pluginCleanup runs first in buildPipeline and removes the whole
  destination folder, so in the CLI pipeline the sweep never finds anything left to sweep — it is
  defence-in-depth for callers that drive the processors directly as a library. Cross-run survival of a
  hand-added file in an output hook folder is therefore not a property of the CLI pipeline; this unit is
  scoped `When placing hook bundles` and holds at that scope.</implementationNotes>
  <depends>FR-HOOK-0020, FR-SET-0070</depends>
</req>
