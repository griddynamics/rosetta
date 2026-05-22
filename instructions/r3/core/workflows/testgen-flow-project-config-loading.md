---
name: testgen-flow-project-config-loading
description: Phase 0 of Test Generation - Load or create project configuration for test generation
tags: ["testgen", "phase"]
baseSchema: docs/schemas/phase.md
---

<testgen_flow_project_config_loading>

<description_and_purpose>
Find or create the project config file, obtain project-specific data retrieval configuration from user, and initialize the ticket output directory.
</description_and_purpose>

<workflow_context>
- Phase 0 of 7 in `testgen-flow`
- Input: user request with Jira ticket key/URL
- Output: `initial-data.md`, project config file, initialized state
- Prerequisite: user provided Jira ticket key or URL
</workflow_context>

<phase_steps>
1. Parse initial user input for ticket key
2. Setup output directory
3. Load or create project config
4. Obtain project info from user (if config is new)
5. Create initial-data file
6. Update state file
</phase_steps>

<parse_input step="0.1">
1. Extract Jira ticket key or URL from user prompt (REQUIRED)
2. Accept formats: "PROJ-123", full Jira URL, "Analyze requirements for PROJ-123"
</parse_input>

<setup_directory step="0.2">
1. Create `agents/testgen/{TICKET-KEY}/`
2. Initialize `testgen-state.md`
</setup_directory>

<load_project_config step="0.3">
1. Search for `testgen-project-config.md` in the repo's agent-specific directory
2. If found and non-empty → skip to step 0.5
3. If not found → create empty file, proceed to step 0.4
</load_project_config>

<obtain_project_info step="0.4">
1. ACQUIRE `questioning/SKILL.md` FROM KB
2. Ask user about knowledge base and data retrieval setup
<example_format_of_question>
```markdown
According to test generation process rules, I require more details related to your project - How should I retrieve the information necessary for test case generation?
As a reference, I provide the default Data Retrieval scheme below:
** Default Setup **
- retrieve Jira ticket fields (summary+description)
- retrieve provided Confluence documents, if any
- search for Confluence pages using keywords extracted from the ticket
- combine all the information as a basis for test case generation

Is the above accurate for your project? 
Please answer YES or NO
- If your answer is NO then please provide details about data retrieval for your project.
- If you have links to any additional documentation or materials that need to be considered, 
you can provide them here as well.
```
</example_format_of_question>




2. Ask user to confirm or customize the data retrieval process
3. Validate answer provides sufficient information
4. Save configuration to `testgen-project-config.md`
</obtain_project_info>

<create_initial_data step="0.5">
1. Create `agents/testgen/{TICKET-KEY}/initial-data.md`:

```markdown
# Initial data - [TICKET-KEY]

**Initial user prompt:** [USER PROMPT]
**Project config file - USE AS REFERENCE FOR THE NEXT PHASE:** [PROJECT CONFIG FILENAME]
```
</create_initial_data>

<update_state step="0.6">
1. Update `agents/testgen/{TICKET-KEY}/testgen-state.md` with Phase 0 complete
2. Tell user: "Phase 0 complete. Project setup ready."
3. Ask: "Ready to proceed to Phase 1 (Data Collection)?"
</update_state>

<validation_checklist>
- `agents/testgen/{TICKET-KEY}/` directory exists
- `testgen-project-config.md` exists with non-empty content
- `initial-data.md` created with user prompt and config reference
- `testgen-state.md` created with Phase 0 marked complete
</validation_checklist>

</testgen_flow_project_config_loading>
