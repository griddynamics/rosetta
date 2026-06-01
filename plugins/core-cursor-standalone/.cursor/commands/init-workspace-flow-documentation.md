---
name: init-workspace-flow-documentation
description: "Phase 7 of init-workspace-flow, contains create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, AGENT MEMORY.md."
tags: ["init", "workspace", "documentation", "phase"]
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_documentation>

<description_and_purpose>
Agents without workspace documentation re-discover facts, repeat mistakes, and make incorrect assumptions every session. This phase creates the shared understanding layer all subsequent agent work depends on. Proof: five doc files exist and every prepped-workspace skill reads them. Use top tier model, as this documentation will be loaded every signle time in every single user session with AI.
</description_and_purpose>

<workflow_context>
- Phase 7 of 9 in init-workspace-flow
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

<read_state step="7.1">
1. Read `agents/init-workspace-flow-state.md`
2. Confirm Phase 3 complete (TECHSTACK, CODEMAP, DEPENDENCIES exist)
3. Read state.mode, state.composite, state.file_count
</read_state>

<acquire_skills step="7.2">
1. ACQUIRE `init-workspace-documentation/SKILL.md` FROM KB
</acquire_skills>

<execute_documentation step="7.3" subagent="built-in" role="Senior technical writer synthesizing workspace documentation" subagent_recommended_model="claude-opus-4-8,gpt-5.5-high,gemini-3.1-pro-preview">
1. Look around for any additional documentation and verify findings
2. Execute skill with state.mode, state.composite, state.file_count as inputs
</execute_documentation>

<update_state step="7.4">
1. Write Phase 7 completion to `agents/init-workspace-flow-state.md`
2. Update file inventory for CONTEXT, ARCHITECTURE, IMPLEMENTATION, ASSUMPTIONS, AGENT MEMORY
3. Log gaps identified for Phase 8
</update_state>

<validation_checklist>
- All 7 doc files exist and are non-empty
- If composite: top-level docs are registries with sub-repo references
- If upgrade mode: human-added content preserved
- State file shows Phase 7 complete with per-file status
</validation_checklist>

<pitfalls>
- AGENT MEMORY.md is for agent operational notes, not a duplicate of CONTEXT.md
</pitfalls>

</init_workspace_flow_documentation>
