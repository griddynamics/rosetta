---
name: init-workspace-flow-rules
description: "Phase 4 of init-workspace-flow, contains create local agent rules for IDE/OS/project. Optional phase, disabled by default — runs only when explicitly enabled."
tags: ["init", "workspace", "rules", "phase", "optional"]
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_rules>

<description_and_purpose>
Creates IDE-specific and tech-specific rule files that customize agent behavior for the workspace. Optional, disabled by default — runs only when explicitly enabled by user.
</description_and_purpose>

<workflow_context>
- Phase 4 of 8 in init-workspace-flow
- Input: TECHSTACK (from P3), state.mode, IDE/OS detection
- Output: core agents file, tech-specific rule files
- Prerequisite: Phase 3 complete (TECHSTACK exists on disk)
</workflow_context>

<phase_steps>
1. Check if rules phase enabled
2. If disabled, mark skipped and proceed to Phase 5
3. Read state and TECHSTACK
4. Execute rules skill
5. Update state
</phase_steps>

<check_enabled step="4.1">
1. Read `agents/init-workspace-flow-state.md`
2. If rules phase NOT enabled: mark Phase 4 skipped in state, proceed to Phase 5
3. Autonomous decision based on enable flag — no user prompting
</check_enabled>

<read_inputs step="4.2" condition="enabled">
1. Read state.mode for dual-mode behavior
2. Read TECHSTACK from disk
3. Detect IDE and OS from environment
</read_inputs>

<execute_rules step="4.3" condition="enabled">
1. ACQUIRE `init-workspace-rules/SKILL.md` FROM KB and EXECUTE with state.mode and TECHSTACK as inputs
</execute_rules>

<update_state step="4.4">
1. Write to `agents/init-workspace-flow-state.md`:
   - Rule files status (created | updated | skipped | disabled)
   - Phase 4 completion timestamp
2. Log gaps identified for Phase 7
</update_state>

<validation_checklist>
- Disabled: state shows "skipped: disabled by default", no rule files modified
- Enabled: core agents file and tech rules exist on disk, consistent with TECHSTACK
</validation_checklist>

<pitfalls>
- Halt if TECHSTACK missing — dependency failure, do not generate rules
</pitfalls>

</init_workspace_flow_rules>
