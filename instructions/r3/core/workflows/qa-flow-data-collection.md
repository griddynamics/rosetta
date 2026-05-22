---
name: qa-flow-data-collection
description: Phase 1 of API QA workflow - Data Collection from test cases, documentation, and codebase
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_data_collection>

<description_and_purpose>
Gather test case details from TMS, search documentation, and discover existing API test patterns in the codebase to establish baseline for automation.
</description_and_purpose>

<workflow_context>
- Phase 1 of 8 in `qa-flow`
- Input: project config + initial data from Phase 0
- Output: `agents/qa/{IDENTIFIER}/raw-data.md` with test cases, documentation, and existing test patterns
- Prerequisite: Phase 0 complete, `qa-project-config.md` and `initial-data.md` exist
</workflow_context>

<phase_steps>
1. Confirm data sources from project config
2. Execute data collection
3. Validate and update state
</phase_steps>

<confirm_inputs step="1.1">
1. Verify project config loaded with data source information
2. Verify initial data file exists with test case reference
3. Identify TMS, documentation, and codebase sources to query
</confirm_inputs>

<execute_collection step="1.2" subagent="discoverer" role="API QA data collector">
1. USE SKILL `qa-data-collection`
2. Verify raw data file created at `agents/qa/{IDENTIFIER}/raw-data.md`
</execute_collection>

<update_state step="1.3">
1. Update `agents/qa-state.md`:
   - Test Cases Retrieved: [count]
   - Documentation Pages Found: [count]
   - API Endpoints Identified: [count]
   - Existing Test Files Found: [count]
   - Test Framework: [name]
   - Backend Source: [path or N/A]
   - Phase 1 completion timestamp
2. Mark Phase 1 complete, Phase 2 current
</update_state>

<validation_checklist>
- Test case data retrieved and documented
- Documentation searched (results found OR user confirmed skip)
- Existing test patterns analyzed
- Backend source code searched (if path configured in project config)
- `raw-data.md` created with all sections populated
- API endpoints identified from test cases
</validation_checklist>

</qa_flow_data_collection>
