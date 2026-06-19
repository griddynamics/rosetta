---
name: init-workspace-flow-shells
description: "Phase 2 Shells of init-workspace-flow"
tags: ["init", "workspace", "shells", "phase"]
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_shells>

<description_and_purpose>
Generates shell config files so subsequent sessions can load context and invoke skills. Proof: shell configs exist on disk and state reflects creation status.
</description_and_purpose>

<workflow_context>
- Phase 2 of 9 in init-workspace-flow
- Input: state.mode, state.plugin_active
- Output: shell configs, bootstrap rule, load-context shell
- Prerequisite: Phase 1 complete, state.mode set
</workflow_context>

<phase_steps>
1. Check mode, skip if plugin
2. Execute shell generation
3. Update state with shell status
</phase_steps>

<check_mode step="2.1">
1. Read `agents/init-workspace-flow-state.md`
2. If `state.plugin_active == true`: mark Phase 2 skipped, proceed to Phase 3
3. If upgrade mode: check which shells already exist
</check_mode>

<execute_shells step="2.2">

Act as a shell configuration specialist for IDE/CodingAgent workspace bootstrapping. Shell files delegate logic to KB via ACQUIRE, enabling centralized instruction updates across projects.

In upgrade mode: create missing shells only, preserve existing.

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Shell = frontmatter + single ACQUIRE instruction, zero inline logic
- No absolute paths in generated shells

</core_concepts>

<shells_process>

Internal knowledge about IDE/agent shell configuration is obsolete — LIST and ACQUIRE from KB.

Step 1: Identify Environment

1. LIST `configure` IN KB (to understand supported IDE/CodingAgents)
2. Detect current environment, preselect IDE/CodingAgent
3. MUST ask user to confirm selection and provide multi-choose
4. ACQUIRE <selected configs using TAG> FROM KB
5. If multiple selected, must use common standards to reduce copies

Step 2: Install Base Files

1. ACQUIRE `skills/load-context/SKILL.md` FROM KB — install as SKILL
2. ACQUIRE `rules/bootstrap.md` FROM KB — install as CORE RULE, copy content (no refs/links)

Step 3: MUST Generate Skill Shells

1. LIST `skills` IN KB with XML format
2. ACQUIRE `skill-shell.md` FROM KB
3. Create all skill shells, reuse frontmatter from listing
4. Do not create `init-workspace-*` skills

Step 4: MUST Generate Agent/Subagent Shells

1. LIST `agents` IN KB with XML format
2. ACQUIRE `agent-shell.md` FROM KB
3. Create all agent/subagent shells, reuse frontmatter from listing

Step 5: MUST Generate Workflow/Command Shells

1. LIST `workflows` IN KB with XML format
2. ACQUIRE `workflow-shell.md` FROM KB
3. Create all workflow/command shells, reuse frontmatter from listing
4. Do not create `init-workspace-*` workflows and its phases

Step 6: Verify Shell Integrity

1. Diff each file against its shell schema — zero structural deviations
2. Verify: every file has ACQUIRE, no conditional logic/loops/inline instructions, all paths resolve
3. HITL: present results, confirm with user

</shells_process>

<shells_validation_checklist>

- Every generated file: frontmatter + ACQUIRE only, zero inline logic
- All paths resolve, extensions match IDE config
- User confirmed verification results

</shells_validation_checklist>

</execute_shells>

<update_state step="2.3">
1. Write to `agents/init-workspace-flow-state.md`:
   - Shell configs status (created | updated | skipped)
   - Bootstrap rule status
   - Phase 2 completion timestamp
2. Log gaps for Phase 8
</update_state>

<validation_checklist>
- Plugin mode: phase marked skipped, no shell files modified
- Install mode: all expected shell files exist on disk
- Upgrade mode: only missing shells created, existing preserved
- Bootstrap rule file exists with ACQUIRE instruction for load-context
</validation_checklist>

</init_workspace_flow_shells>
