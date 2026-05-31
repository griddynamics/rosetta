---
name: init-workspace-flow-discovery
description: "Phase 3 of init-workspace-flow, contains analyze tech stack and produce TECHSTACK, CODEMAP, DEPENDENCIES files."
tags: ["init", "workspace", "discovery", "phase"]
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_discovery>

<description_and_purpose>
Produces foundational technical documentation (TECHSTACK, CODEMAP, DEPENDENCIES) that all subsequent phases depend on.
</description_and_purpose>

<workflow_context>
- Phase 3 of 8 in init-workspace-flow
- Input: filesystem, state.mode, state.composite
- Output: TECHSTACK, CODEMAP, DEPENDENCIES on disk
- Prerequisite: Phase 1 complete (mode known), Phase 2 complete or skipped
</workflow_context>

<phase_steps>
1. Read state and confirm mode
2. Acquire and execute discovery
3. Update state
</phase_steps>

<check_mode step="3.1">
1. Read `agents/init-workspace-flow-state.md`
2. Confirm Phase 1 complete and mode is set
3. If upgrade mode: note which discovery files already exist
</check_mode>

<execute_discovery step="3.2">
1. ACQUIRE `init-workspace-discovery/SKILL.md` FROM KB and execute
2. If state.composite: create registry-style top-level docs referencing sub-repo versions
</execute_discovery>

<update_state step="3.3">
1. Write to `agents/init-workspace-flow-state.md`:
   - TECHSTACK status (created | updated | skipped)
   - CODEMAP status (created | updated | skipped)
   - DEPENDENCIES status (created | updated | skipped)
   - Phase 3 completion timestamp
2. Log gaps for Phase 7
</update_state>

<validation_checklist>
- TECHSTACK exists with language/framework entries
- CODEMAP exists with shell-output-style tree
- DEPENDENCIES exists
- If composite: registry-style top-level docs reference sub-repos; each sub-repo has its own set of docs
</validation_checklist>

</init_workspace_flow_discovery>
