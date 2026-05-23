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
- Optional **documentation MCP** when `qa-project-config.md` scopes it — procedure only in `<execute_collection>` step **1.2b**. **Config binding:** use the **literal field values** in `qa-project-config.md` and Phase 0 artifacts for documentation URLs/spaces and for **which Rosetta ACQUIRE tag** runs MCP collection (field names are defined in the acquired `qa-flow-documentation-mcp-subflow.md` fragment — do not invent keys here).
</workflow_context>

<phase_steps>
1. Confirm data sources from project config
2. Execute data collection — see `<execute_collection>`: **1.2a** core `qa-data-collection`, **1.2b** optional documentation MCP when scoped
3. Validate and update state
</phase_steps>

<confirm_inputs step="1.1">
1. Verify project config loaded with data source information
2. Verify initial data file exists with test case reference
3. Identify TMS, documentation, and codebase sources to query
</confirm_inputs>

<execute_collection step="1.2" subagent="discoverer" role="API QA data collector">

<verify_primary_raw_data step="1.2a">
1. USE SKILL `qa-data-collection`
2. Verify `agents/qa/{IDENTIFIER}/raw-data.md` exists after step 1. If it is missing, follow remediation from `qa-data-collection` or stop Phase 1, record the gap in `agents/qa-state.md`, and notify the user — **do not** run `<documentation_mcp_optional>` until the primary raw-data artifact exists.
</verify_primary_raw_data>

<documentation_mcp_optional step="1.2b">
1.2b.1. If documentation MCP collection is **not** in scope per `qa-project-config.md`, skip this entire sub-block.
1.2b.2. ACQUIRE `qa-flow-documentation-mcp-subflow.md` FROM KB (once per session if not already loaded).
1.2b.3. If the ACQUIRE in **1.2b.2** returned **zero** documents:
   - Skip the documentation MCP subflow for this run.
   - Record the failure and KB tag in `agents/qa-state.md`.
   - Notify the user the subflow document is missing from Rosetta/KB.
   - Under `## Documentation / Confluence` in `agents/qa/{IDENTIFIER}/raw-data.md`, write `**Outcome:** skipped — ACQUIRE failed` plus the subflow filename and a short error summary.
   - **Continue** Phase 1 (core collection in 1.2a already completed).
1.2b.4. If the ACQUIRE in **1.2b.2** returned **one or more** documents: (a) **Verify** the acquired markdown defines an `<execute_documentation_mcp>` block containing at least one numbered step. (b) If verification **fails**, apply the **same** record / notify / `raw-data` outcome bullets as **1.2b.3**, then continue Phase 1. (c) If verification **passes**, execute **all** numbered steps inside `<execute_documentation_mcp>` in document order.
</documentation_mcp_optional>

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
- `agents/qa/{IDENTIFIER}/raw-data.md` exists (verified in step 1.2a) with core collection sections populated per `qa-data-collection`
- Documentation searched (results found OR user confirmed skip)
- Documentation MCP subsection in `raw-data.md` verified per `qa-flow-documentation-mcp-subflow.md` when that subflow ran, **or** documented `**Outcome:** skipped — ACQUIRE failed` / same outcome path when the subflow doc was missing from KB **or** the acquired fragment failed **1.2b.4** verification
- Existing test patterns analyzed
- Backend source code searched (if path configured in project config)
- API endpoints identified from test cases
</validation_checklist>

</qa_flow_data_collection>
