---
name: init-workspace-flow-context
description: "Phase 1 of init-workspace-flow, contains detect workspace mode, composite status, and existing file inventory."
tags: ["init", "workspace", "context", "phase"]
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_context>

<description_and_purpose>
Determines workspace state before any changes occur. Without accurate mode detection, subsequent phases cannot decide whether to create, update, or skip files.
</description_and_purpose>

<workflow_context>
- Phase 1 of 8 in init-workspace-flow
- Input: filesystem, LLM context (bootstrap markers)
- Output: state.mode, state.plugin_active, state.composite, state.existing_files
- Prerequisite: state file created by workflow orchestrator (empty template)
</workflow_context>

<phase_steps>
1. Validate state file exists
2. Acquire and execute detection skill
3. Write detection results to state
4. Report mode to user
</phase_steps>

<read_state step="1.1">
1. Read `agents/init-workspace-flow-state.md`
2. If state file missing, halt — workflow orchestrator must create it first
</read_state>

<detect step="1.2">
1. ACQUIRE `init-workspace-context/SKILL.md` FROM KB and EXECUTE
2. Write detection results to `agents/init-workspace-flow-state.md` per output contract
3. Log gaps identified for Phase 7
</detect>

<report_mode step="1.3">
1. Tell user: detected mode, composite status, file inventory summary
2. No HITL gate — proceed to Phase 2 automatically
</report_mode>

<validation_checklist>
- State file contains non-empty `mode` field
- `composite` flag is explicitly set (not left blank)
- Every file per `bootstrap_rosetta_files` has a status entry in the inventory
</validation_checklist>

<pitfalls>
- Plugin mode is a context-sentence check, not filesystem detection
- `rosetta@rosetta` is not a plugin; any other plugin type falls into plugin mode
- Do not assume install if state file is fresh — files may exist on disk
- Composite requires sub-repository docs, not just multiple directories
</pitfalls>

</init_workspace_flow_context>
