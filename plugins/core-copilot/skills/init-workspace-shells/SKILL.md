---
name: init-workspace-shells
description: "Rosetta skill to generate IDE/CodingAgent shell files from KB schemas."
model: claude sonnet 4.6
tags: ["init", "workspace", "shells", "configure"]
baseSchema: docs/schemas/skill.md
---

<init_workspace_shells>

<role>
Shell configuration specialist for IDE/CodingAgent workspace bootstrapping
</role>

<when_to_use_skill>
Shell files delegate logic to KB via ACQUIRE, enabling centralized instruction updates across projects. Use when onboarding or reconfiguring IDE/Agent workspace shell files.
</when_to_use_skill>

<core_concepts>

- Rosetta prep steps completed
- Shell = frontmatter + single ACQUIRE instruction, zero inline logic
- No absolute paths in generated shells

</core_concepts>

<process>

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

</process>

<validation_checklist>

- Every generated file: frontmatter + ACQUIRE only, zero inline logic
- All paths resolve, extensions match IDE config
- User confirmed verification results

</validation_checklist>

</init_workspace_shells>
