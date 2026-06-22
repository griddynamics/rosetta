# plugin-generator — FR: Bootstrap Context Payloads and Hook Bundles

## Bootstrap context payload assembly

<req id="FR-HOOK-0001" type="FR" level="System" ticketId="" classification="technical">
  <title>Assemble per-target bootstrap context entries</title>
  <statement>For each target, the `pluginAssembleBootstrap()` processor (FR-ARCH-0055) shall build session-start context entries from the target's present bootstrap files, taken in the order of the bootstrap-file manifest (FR-HOOK-0009), reading each file's body from the target's own `frames` (the per-file `FileProcessingFrame`s), and shall make these entries available to template rendering. Absent variants are skipped (but logged), not reordered.</statement>
  <rationale>Each plugin injects the bootstrap rules into the agent's context at session start, in the IDE's hook format. The manifest order is what fixes the payload sequence and the prefix placement.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a target containing a subset of bootstrap files When: assembled Then: only present files yield entries, in manifest order; absent variants are skipped.</criteria>
    <criteria>Given: the assembled entries When: rendering Then: they are exposed as per-target payload values.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-HOOK-0009</depends>
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
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a target's bootstrap files When: assembled Then: the prefix appears once, on the designated lead document.</criteria>
    <criteria>Given: the manifest When: inspected Then: the lead document is explicitly designated (e.g. `plugin-files-mode` first), not inferred from incidental ordering.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-HOOK-0009</depends>
</req>

<req id="FR-HOOK-0004" type="FR" level="System" ticketId="" classification="technical">
  <title>Index-entry inclusion flag (bootstrap-rule delivery is template-driven)</title>
  <statement>The generator shall include index entries in a target's bootstrap payload only where that target enables index inclusion. Bootstrap-rule delivery shall not be gated by a per-target inclusion flag: the bootstrap payload is assembled uniformly, and whether it reaches the agent (via hooks) or is omitted is decided by the target's preserved templates/rules (FR-VAR-0070), not a generator field. The descriptor shall carry no bootstrap-rule inclusion flag.</statement>
  <rationale>Index entries are optional per target — some targets inject their index into an auto-loaded rule instead of the hook payload (FR-ARCH-0051, FR-VAR-0072) — so an index-inclusion flag is a genuine per-target behavior flag. Bootstrap-rule delivery, by contrast, was reconciled to a property of the preserved templates (FR-VAR-0070, RECONCILIATION-8); the former `includeBootstrapRules` descriptor field was never consumed and is removed.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-11</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a target with index inclusion disabled When: the payload is assembled Then: no index entries are produced.</criteria>
    <criteria>Given: any target When: bootstrap-rule delivery is determined Then: it follows the preserved templates/rules (placeholder present or not, FR-VAR-0070), not a per-target bootstrap-rule inclusion flag.</criteria>
    <criteria>Given: the descriptor When: inspected Then: it carries no `includeBootstrapRules` field (index inclusion uses `includeIndexEntries`).</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/types.ts (includeBootstrapRules removed); src/rosettify-plugins/src/spec/targets.ts (removed from all 6 specs). includeIndexEntries retained.</implementationNotes>
  <depends>FR-VAR-0070</depends>
</req>

<req id="FR-HOOK-0005" type="FR" level="System" ticketId="" classification="technical">
  <title>Per-IDE entry shape and escaping</title>
  <statement>The generator shall emit each bootstrap entry in the target IDE's hook schema as documented in that IDE's guide (INT-IDE-0002), applying the escaping required for that IDE's command interpreter so the embedded content is transported intact. The per-IDE entry shape shall be produced by a case-specific entry-building unit composed into that target's pipeline (selected by composition) and reusing shared low-level escaping and JSON helpers; it shall not be selected by branching on an identity-discriminant such as `hookEntryShape` (FR-ARCH-0005).</statement>
  <rationale>Each IDE expects a different hook schema and quoting; the exact schema is owned by the IDE guide, not duplicated here. Because the shapes differ by IDE, each is a case-specific entry builder composed per target rather than a switch on an identity-discriminant (FR-ARCH-0005).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-11</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any target When: assembled Then: each entry conforms to that IDE's session-start hook schema per its guide, with content transported intact.</criteria>
    <criteria>Given: a target whose command interpreter requires it When: assembled Then: entries carry the interpreter-specific command form(s) with correct escaping.</criteria>
    <criteria>Given: claude When: assembled Then: each entry = `{"type":"command","command":"printf '%s' '<json>'","once":true}` under `SessionStart[0]` with `matcher:"startup"`.</criteria>
    <criteria>Given: codex When: assembled Then: each entry = `{"type":"command","command":"printf '%s' '<json>'","statusMessage":"Loading Rosetta bootstrap","timeout":30}` (no `once`) under `SessionStart[0]` with `matcher:"startup|resume"`.</criteria>
    <criteria>Given: copilot When: assembled Then: each entry = `{"type":"command","bash":"<lock+printf>","powershell":"<lock+Write-Output>"}` under lowercase `sessionStart` (no matcher, `version:1`); the lock key carries a 0-based entry index.</criteria>
    <criteria>Given: entries within a payload When: serialized Then: they are joined by `, ` (comma-space) and inserted raw into the template's `{{{bootstrap_hooks}}}` placeholder.</criteria>
    <criteria>Given: the entry-building code When: inspected Then: each IDE's entry shape comes from a case-specific unit composed per spec plus shared low-level helpers, with no branch on an identity-discriminant such as `hookEntryShape` (FR-ARCH-0005).</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/bootstrap/payload.ts (buildClaudeBootstrapEntry, buildCodexBootstrapEntry, buildCopilotBootstrapEntry, buildCursorBootstrapEntry exported; hookEntryShape switch deleted); src/rosettify-plugins/src/escaping/json-string.ts (buildCursorHookPayloadJson added); src/rosettify-plugins/src/plugin-processors/plugin-assemble-{claude,cursor,copilot,codex}-bootstrap.ts (per-IDE assemblers compose their own entry builder). Template context key: bootstrap_hooks (one shared key). Join separator: `, `.</implementationNotes>
  <depends>INT-IDE-0002, FR-ARCH-0005</depends>
</req>

<req id="FR-HOOK-0006" type="FR" level="System" ticketId="" classification="technical">
  <title>Once-per-session delivery</title>
  <statement>The generator shall ensure each bootstrap entry takes effect at most once per session, using the IDE's native deduplication where available and a generated per-entry guard for IDEs that lack it.</statement>
  <rationale>Repeated bootstrap injection wastes context; Copilot fires hooks twice.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: Claude When: assembled Then: entries carry the native once flag.</criteria>
    <criteria>Given: an IDE lacking native deduplication When: assembled Then: entries carry a per-entry session guard.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-HOOK-0007" type="FR" level="System" ticketId="" classification="technical">
  <title>Plugin-path context entry</title>
  <statement>The generator shall append to each session-hook target's bootstrap payload exactly one additional, SEPARATE session-start entry (the final entry) that reports the resolved plugin root path to the agent. This entry is NOT folded into the lead document's body; it is its own entry appended after all bootstrap-document entries, so the payload entry count = (present bootstrap-manifest documents) + 1. The entry uses the IDE's command shape with a double-quoted `printf` form (to allow runtime env/var expansion), and any instruction-path reference inside it is reference-rewritten per target (FR-HOOK-0008). Hooks generated for all IDEs always, regardless those are used or not. Template engineer decides to include it or solve it differently.</statement>
  <rationale>Agents need the plugin root to resolve instruction file paths at runtime. Baseline confirms it is a distinct trailing entry, not merged into the lead — claude/codex/copilot/cursor each emit 9 entries for r2 and 8 for r3 (= present docs + 1 plugin-root entry).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-11</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any session-hook target When: assembled Then: its payload includes exactly one plugin-root path entry, appended last, in that IDE's shape.</criteria>
    <criteria>Given: claude/codex/copilot for r2 When: assembled Then: the SessionStart payload has 9 entries (8 docs + 1 plugin-root); for r3, 8 entries.</criteria>
    <criteria>Given: the claude plugin-root entry When: inspected Then: command = `printf '%s' "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"Rosetta Plugin Path: ${CLAUDE_PLUGIN_ROOT}\"}}"` with `"once": true`.</criteria>
    <criteria>Given: the codex plugin-root entry When: inspected Then: it is a workspace-root probe resolving to `$workspace_root/.agents` with `statusMessage`+`timeout`; the copilot one is an agentPlugins-base probe (`commands/coding-flow.md`) resolving to `$root` with bash+powershell.</criteria>
    <criteria>Given: cursor When: assembled Then: a plugin-root path entry is generated and included in the bootstrap payload; whether it is injected into output is decided by whether the cursor template includes the `{{{bootstrap_hooks}}}` placeholder.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>src/rosettify-plugins/src/spec/bootstrap-manifest.ts (CURSOR_PLUGIN_ROOT_ENTRY added); src/rosettify-plugins/src/bootstrap/payload.ts (buildRootEntry callback; all 4 IDEs including cursor generate plugin-root entry). Cursor previously dropped via default:return null — fixed. Plugin-root is always the final separate entry; delivery to agent is template decision (FR-VAR-0070).</implementationNotes>
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

<req id="FR-HOOK-0009" type="FR" level="System" ticketId="" classification="technical">
  <title>Explicit, deterministic bootstrap-file order</title>
  <statement>The generator shall assemble bootstrap context from an explicit ordered bootstrap-file manifest, and that order shall be significant and stable: it determines both the sequence of entries in the emitted payload and which document is the designated lead receiving the bootstrap prefix (FR-HOOK-0003). The `plugin-files-mode` document shall lead the manifest, followed by the `bootstrap-*` rule documents, followed by the index documents. The order shall not depend on filesystem enumeration.</statement>
  <rationale>The agent must receive bootstrap context in a deliberate sequence (mode first, then policies, then indexes), and the prefix must land on the intended lead. The original relied on the position of the first match in an in-code list (`_BOOTSTRAP_FILES`), which silently moved the prefix if reordered — a fragility (QF-1) this unit removes by making the order an explicit, required contract.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a target's present bootstrap files When: the payload is assembled Then: entries appear in manifest order with `plugin-files-mode` first.</criteria>
    <criteria>Given: two runs over the same inputs When: compared Then: the entry order is identical and independent of directory listing order.</criteria>
    <criteria>Given: the designated lead document When: assembled Then: it is the one that carries the bootstrap prefix.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>NFR-0002</depends>
</req>

## Hook bundle synchronization

<req id="FR-HOOK-0020" type="FR" level="System" ticketId="" classification="technical">
  <title>Deterministic-hooks gating</title>
  <statement>Where the selected release enables deterministic hooks, the generator shall place hook bundles into each target; otherwise it shall remove any stale hook bundle artifacts from preserved hook folders.</statement>
  <rationale>Only deterministic-hook releases ship runtime advisory hook code; other releases must stay lean.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: release r3 When: generated Then: each target's hook folder contains the compiled bundles and shared assets.</criteria>
    <criteria>Given: release r2 When: generated Then: no compiled bundle artifacts remain in hook folders.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>DATA-CFG-0001</depends>
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
  <depends>AC-3</depends>
</req>

<req id="FR-HOOK-0022" type="FR" level="System" ticketId="" classification="technical">
  <title>Preserve unmanaged hook-folder files on sync</title>
  <statement>When placing hook bundles, the generator shall replace only files supplied by the bundle and shared assets, preserving other files already present in the target's hook folder.</statement>
  <rationale>Generated hook configuration and manifests coexist with bundle code in the same folder.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a hook folder with a rendered `hooks.json` When: bundles are synced Then: `hooks.json` remains and bundle files are added/replaced.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>
