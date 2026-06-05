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
1. Search for `testgen-project-config.md` at the canonical path `agents/testgen/testgen-project-config.md` (project-wide, **not** per-ticket — the same config is shared across all tickets).
2. **Branches (exhaustive):**
   - **File exists AND non-empty:** skip to step 0.5.
   - **File missing OR exists but empty:** proceed to step 0.4 (do NOT create an empty placeholder file — step 0.4 will write the populated file).
</load_project_config>

<obtain_project_info step="0.4">

Contiguous 1–5 sequence. The `<example_format_of_question>` block below is the verbatim question text used by step 2 — it is **not** a numbered step and the sequence does not restart after it.

1. ACQUIRE `questioning/SKILL.md` FROM KB.
2. Ask the user about knowledge base and data retrieval setup using the verbatim question text in `<example_format_of_question>` below.
3. Process the user's answer — confirm the default scheme OR capture their customization.
4. **Validate the answer provides sufficient information.** Minimum required fields:
   - **Data sources** (which of: Jira, Confluence, attached docs, other URLs)
   - **Retrieval method** per source (MCP-based / direct URL / search-by-keywords)
   - **Auth assumptions** (MCP already configured / token in env / requires per-call OAuth)

   **Validation failure paths:**
   - If user said YES to default but the default cannot run in the environment (no MCP, no auth): re-ask for the missing field(s), naming exactly which are absent.
   - If user said NO but did not name source / method / auth: re-prompt up to 2 times naming the missing fields explicitly. After 2 unsuccessful re-prompts, stop Phase 0, record `Phase 0 blocked: incomplete config answer` in `testgen-state.md`, and ask the user to supply a complete answer before continuing.
5. Save the validated configuration to `agents/testgen/testgen-project-config.md` (canonical path per step 0.3).

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
4. **STOP and wait for explicit user confirmation** before the parent flow advances to Phase 1. Do NOT auto-proceed on inferred approval or silence; treat ambiguous responses as "not confirmed" and re-ask.
</update_state>

<validation_checklist>
- `agents/testgen/{TICKET-KEY}/` directory exists
- `agents/testgen/testgen-project-config.md` (project-wide, not per-ticket) exists with non-empty content covering data sources, retrieval method, and auth assumptions
- `agents/testgen/{TICKET-KEY}/initial-data.md` created with user prompt and config reference
- `agents/testgen/{TICKET-KEY}/testgen-state.md` created with Phase 0 marked complete
</validation_checklist>

</testgen_flow_project_config_loading>
