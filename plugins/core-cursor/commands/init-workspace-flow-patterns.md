---
name: init-workspace-flow-patterns
description: "Phase 5 Patterns of init-workspace-flow"
tags: ["init", "workspace", "patterns", "phase"]
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_patterns>

<description_and_purpose>
Extract recurring code structures into explicit reusable pattern templates. Without them, agents reinvent conventions per task. Proof: docs/PATTERNS/ contains INDEX.md, per-module files, and CHANGES.md referenced by downstream coding tasks. Use workhorse model to handle large amounts of content cheaper and faster.
</description_and_purpose>

<workflow_context>
- Phase 5 of 9 in init-workspace-flow
- Input: CODEMAP, source code
- Output: docs/PATTERNS/ (INDEX.md, per-module files, CHANGES.md)
- Prerequisite: Phase 3 complete (CODEMAP exists)
</workflow_context>

<phase_steps>
1. Read state and CODEMAP
2. Execute multi-agent pattern extraction
3. Update state, log gaps
</phase_steps>

<read_state step="5.1">
1. Read `agents/init-workspace-flow-state.md`
2. Confirm Phase 3 complete and CODEMAP exists
3. Read state.mode for dual-mode behavior
</read_state>

<execute_extraction step="5.2" subagent="built-in" role="Senior pattern analyst extracting reusable conventions" subagent_recommended_model="claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro-preview">

Act as a senior pattern architect — recovers reusable structural conventions from code. Codebases accumulate implicit recurring structures that drift without formal documentation. Extract them into explicit reusable templates so agents and contributors produce consistent code. Requires CODEMAP.md on disk.

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-project-context skill loaded and fully executed
- USE SKILL `reverse-engineering` — apply "Would we rebuild this?" test: pattern = recurring structure surviving a from-scratch rewrite; one-off = historical accident
- Pattern qualifies only if found in 2+ places
- INDEX.md and CHANGES.md must be possible to grep by md headers (top 3 levels). Must not use tables. Instructions ask to grep files to populate list of those items in context.
- Limit OVERALL to 10-15 most important patterns, limit reading samples up to 2 files per pattern.

</core_concepts>

Orchestration: Read CODEMAP, identify distinct modules; spawn built-in subagent per module scope for pattern extraction; merge subagent results into docs/PATTERNS/ structure; deduplicate patterns found across modules.

<extraction_process>

1. Read CODEMAP.md — scope extraction per module
   - if not enough use shell to list recursively all files with minimal output parameters
   - list interesting targets folders/files with extensions, folder filters (excluding caches, builds, noise, etc)
   - this listing itself gives enough information on what is the most common
2. Dual-mode:
   - CHECK-EXISTS: read docs/PATTERNS/ and INDEX.md
   - IDENTIFY-GAPS: compare existing patterns against codebase
   - CREATE-OR-UPDATE: install = create all; upgrade = add missing only
   - PRESERVE-HUMAN: never overwrite human-curated content
   - REPORT-CHANGES: log to CHANGES.md
3. Per pattern file (docs/PATTERNS/*.md):
   - **Name**: short identifier (e.g., "REST Controller Endpoint")
   - **Description**: what it solves, when to use
   - **Template/Example**: generalizable code skeleton with extension-point comments
4. Write docs/PATTERNS/INDEX.md — all patterns with one-line descriptions, one header per each pattern `## Pattern Name - short description`
5. Write docs/PATTERNS/CHANGES.md — created/updated/skipped, one header per each change `## [YYYY-MM-DD] Brief changes made`
6. If state.composite = true, extract per sub-repository; top-level INDEX.md references sub-repo folders

</extraction_process>

<extraction_validation_checklist>
- INDEX.md lists all pattern files
- CHANGES.md tracks all actions taken
- No human-curated content overwritten in upgrade mode
</extraction_validation_checklist>

</execute_extraction>

<update_state step="5.3">
1. Write Phase 5 completion to `agents/init-workspace-flow-state.md`
2. Update PATTERNS row in file inventory
3. Log gaps for Phase 8
</update_state>

<validation_checklist>
- docs/PATTERNS/INDEX.md exists and lists all extracted pattern files
- Every CODEMAP module has pattern coverage or explicit skip reason
- State file shows Phase 5 complete
- Upgrade mode: no human-curated patterns overwritten
</validation_checklist>

<pitfalls>
- Do not extract implementation details as patterns — only recurring structures
- Scope subagents by CODEMAP module boundaries, not arbitrary directory splits
</pitfalls>

</init_workspace_flow_patterns>
