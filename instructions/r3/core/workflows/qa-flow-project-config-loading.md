---
name: qa-flow-project-config-loading
description: Phase 0 of API QA workflow - Project Config Loading (USER INTERACTION CONDITIONALLY REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_project_config_loading>

<description_and_purpose>
Initialize API QA session directory, load existing project config or collect project-specific information from user for backend API test automation.
</description_and_purpose>

<workflow_context>
- Phase 0 of 8 in `qa-flow`
- Input: user request with test case reference (TestRail ID, Jira ticket, or direct description)
- Output: `agents/qa/{IDENTIFIER}/` directory with `initial-data.md` and `qa-project-config.md`; `agents/qa-state.md` initialized
- Prerequisite: starting new API QA flow
- HITL: conditional — only if project config does not already exist
</workflow_context>

<phase_steps>
1. Parse user input and setup session directory
2. Load or create project config
3. Create initial data file and update state
</phase_steps>

<execute_config step="0.1" subagent="discoverer" role="API QA project config loader">
1. USE SKILL `qa-project-config`
2. Verify `agents/qa/{IDENTIFIER}/` directory created
3. Verify `qa-project-config.md` exists with non-empty content
4. **ASK USER** for project info only if config does not already exist
</execute_config>

<update_state step="0.2">
1. Update `agents/qa-state.md`:
   - Test Case Source: [TestRail ID / Jira key / Manual]
   - Config Source: [Existing / User provided / Discovered]
   - Files Created: initial-data.md, qa-state.md
   - Phase 0 completion timestamp
2. Mark Phase 0 complete, Phase 1 current
</update_state>

<validation_checklist>
- `agents/qa/{IDENTIFIER}/` directory exists
- `qa-project-config.md` exists with non-empty content
- `initial-data.md` created with initial prompt and config reference
- `agents/qa-state.md` created with Phase 0 marked complete
</validation_checklist>

</qa_flow_project_config_loading>
