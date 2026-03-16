---
name: init-workspace-flow-shells
description: "Phase 2 of init-workspace-flow, contains generate shell files for IDE/CodingAgent from KB schemas. Skipped in plugin mode."
tags: ["init", "workspace", "shells", "phase"]
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_shells>

<description_and_purpose>
Generates shell config files so subsequent sessions can load context and invoke skills. Proof: shell configs exist on disk and state reflects creation status.
</description_and_purpose>

<workflow_context>
- Phase 2 of 8 in init-workspace-flow
- Input: state.mode, state.plugin_active
- Output: shell configs, bootstrap rule, load-context shell
- Prerequisite: Phase 1 complete, state.mode set
</workflow_context>

<phase_steps>
1. Check mode, skip if plugin
2. ACQUIRE and execute shell generation skill
3. Update state with shell status
</phase_steps>

<check_mode step="2.1">
1. Read `agents/init-workspace-flow-state.md`
2. If `state.plugin_active == true`: mark Phase 2 skipped, proceed to Phase 3
3. If upgrade mode: check which shells already exist
</check_mode>

<execute_shells step="2.2">
1. ACQUIRE `init-workspace-shells/SKILL.md` FROM KB
2. Execute shell generation per skill logic
3. In upgrade mode: create missing shells only, preserve existing
</execute_shells>

<update_state step="2.3">
1. Write to `agents/init-workspace-flow-state.md`:
   - Shell configs status (created | updated | skipped)
   - Bootstrap rule status
   - Phase 2 completion timestamp
2. Log gaps for Phase 7
</update_state>

<validation_checklist>
- Plugin mode: phase marked skipped, no shell files modified
- Install mode: all expected shell files exist on disk
- Upgrade mode: only missing shells created, existing preserved
- Bootstrap rule file exists with ACQUIRE instruction for load-context
</validation_checklist>

</init_workspace_flow_shells>
