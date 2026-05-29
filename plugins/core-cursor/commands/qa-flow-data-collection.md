---
name: qa-flow-data-collection
description: Phase 1 of QA workflow - Data Collection from test cases, documentation, and codebase
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
- Optional **documentation MCP** when `qa-project-config.md` scopes it — binding note in `<config_binding>`; procedure in `<execute_collection>` step **1.2b**.
</workflow_context>

<config_binding>
Documentation MCP scope comes from **`qa-project-config.md`** and Phase 0 only.
**Subflow ACQUIRE tag (exact string):** `qa-flow-documentation-mcp-subflow`. The acquired fragment is the single source of truth for collection-skill key precedence, in-scope signals, branch rules, and `<execute_documentation_mcp>` steps.
</config_binding>

<phase_steps>
1. Confirm data sources from project config
2. Execute data collection — see `<execute_collection>`: **1.2a** core `qa-data-collection`, **1.2b** optional documentation MCP when scoped
3. Validate and update state
</phase_steps>

<confirm_inputs step="1.1">
1. Verify project config loaded with data source information
2. Verify initial data file exists with test case reference
3. Identify TMS, documentation, and codebase sources to query
4. **Failure path:** if (1) or (2) is missing, stop Phase 1, record `Phase 1 blocked: missing prerequisite [config | initial-data]` in `agents/qa-state.md`, and ask the user to re-run Phase 0. If (3) finds no usable sources, record the gap and ask the user to confirm proceeding with empty data sources before continuing.
</confirm_inputs>

<execute_collection step="1.2" subagent="discoverer" role="QA data collector">

<verify_primary_raw_data step="1.2a">
1. USE SKILL `qa-data-collection`
2. Verify `agents/qa/{IDENTIFIER}/raw-data.md` exists after step 1. If it is missing: **first** attempt the remediation path defined inside `qa-data-collection`. **If remediation still produces no `raw-data.md`** after one attempt, stop Phase 1, record the gap in `agents/qa-state.md`, and notify the user — **do not** run `<documentation_mcp_optional>` until the primary raw-data artifact exists.
</verify_primary_raw_data>

<documentation_mcp_optional step="1.2b">
1.2b.1. If documentation MCP collection is **not** in scope per `qa-project-config.md`, skip this entire sub-block.
1.2b.2. ACQUIRE `qa-flow-documentation-mcp-subflow.md` FROM KB (once per session if not already loaded).
1.2b.3. If ACQUIRE returned **zero** documents, or the acquired markdown does not define `<execute_documentation_mcp>` with at least one numbered step: apply `<documentation_mcp_skip_path>`.
1.2b.4. Otherwise execute **all** numbered steps inside `<execute_documentation_mcp>` in document order.
</documentation_mcp_optional>

<documentation_mcp_skip_path>
- Skip the documentation MCP subflow for this run.
- Record failure + KB tag in `agents/qa-state.md`, then notify the user.
- Under `## Documentation / Confluence` in `agents/qa/{IDENTIFIER}/raw-data.md`, write `**Outcome:** skipped — ACQUIRE failed` plus subflow filename + short error.
- Continue Phase 1 (`1.2a` already completed).
</documentation_mcp_skip_path>

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
3. **Failure path:** if `agents/qa-state.md` cannot be written (permission denied, disk full, file locked), do not mark Phase 1 complete; record the write error in chat output, ask the user to resolve the filesystem issue, and pause before Phase 2.
</update_state>

<validation_checklist>
- Test case data retrieved and documented
- `agents/qa/{IDENTIFIER}/raw-data.md` exists (verified in step 1.2a) with core collection sections populated per `qa-data-collection`
- Documentation searched (results found OR user confirmed skip)
- Documentation MCP outcome in `raw-data.md` matches **successful 1.2b.4** execution **or** `<documentation_mcp_skip_path>`
- Existing test patterns analyzed
- Backend source code searched (if path configured in project config)
- API endpoints identified from test cases
</validation_checklist>

</qa_flow_data_collection>
