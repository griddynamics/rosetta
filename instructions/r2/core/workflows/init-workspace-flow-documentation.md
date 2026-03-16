---
name: init-workspace-flow-documentation
description: "Phase 6 of init-workspace-flow, contains create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, AGENT MEMORY.md."
tags: ["init", "workspace", "documentation", "phase"]
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_documentation>

<description_and_purpose>
Agents without workspace documentation re-discover facts, repeat mistakes, and make incorrect assumptions every session. This phase creates the shared understanding layer all subsequent agent work depends on. Proof: five doc files exist and every prepped-workspace skill reads them.
</description_and_purpose>

<workflow_context>
- Phase 6 of 8 in init-workspace-flow
- Input: TECHSTACK, CODEMAP, DEPENDENCIES, source code, PATTERNS, state.file_count, state.mode, state.composite
- Output: CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, AGENT MEMORY.md
- Prerequisite: Phases 3 and 5 complete
</workflow_context>

<phase_steps>
1. Read state and prerequisites
2. Acquire documentation skill
3. Execute documentation creation
4. Update state, log gaps
</phase_steps>

<read_state step="6.1">
1. Read `agents/init-workspace-flow-state.md`
2. Confirm Phase 3 complete (TECHSTACK, CODEMAP, DEPENDENCIES exist)
3. Read state.mode, state.composite, state.file_count
</read_state>

<acquire_skills step="6.2">
1. ACQUIRE `init-workspace-documentation/SKILL.md` FROM KB
</acquire_skills>

<execute_documentation step="6.3" subagent="built-in" role="Senior technical writer synthesizing workspace documentation" subagent_recommended_model="claude-opus-4-6,gpt-5.4-high,gemini-3.1-pro-preview">
1. Execute skill with state.mode, state.composite, state.file_count as inputs
</execute_documentation>

<update_state step="6.4">
1. Write Phase 6 completion to `agents/init-workspace-flow-state.md`
2. Update file inventory for CONTEXT, ARCHITECTURE, IMPLEMENTATION, ASSUMPTIONS, AGENT MEMORY
3. Log gaps identified for Phase 7
</update_state>

<validation_checklist>
- All 5 doc files exist and are non-empty
- If composite: top-level docs are registries with sub-repo references
- If upgrade mode: human-added content preserved
- State file shows Phase 6 complete with per-file status
</validation_checklist>

<pitfalls>
- AGENT MEMORY.md is for agent operational notes, not a duplicate of CONTEXT.md
</pitfalls>

</init_workspace_flow_documentation>
