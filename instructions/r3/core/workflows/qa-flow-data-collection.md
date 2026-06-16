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
- Collection skill: `discovery` (single canonical collector for TMS + documentation MCP sources). Existing-test-pattern scan: `reverse-engineering` (test-automation architecture analysis mode). This phase OWNS the raw-data aggregation contract (`<raw_data_contract>`) — `discovery` and `reverse-engineering` EMIT into the sections this phase asserts.
- **Config-resolved vendors (NOT hardcoded).** Resolve from `qa-project-config.md` / Phase 0:
  - **TMS vendor** — first non-empty key (stop at first hit): `tms_collection_skill`, `test_case_management.mcp_collection_skill`, `mcp_test_case_collection_skill`. In-scope signal: `testrail_base_url` → binding = `testrail`; `jira_base_url` → binding = `jira`.
  - **Documentation vendor** — see `<config_binding>` (precedence + in-scope signals owned by the documentation MCP subflow).
- Optional **documentation MCP** when `qa-project-config.md` scopes it — binding note in `<config_binding>`; procedure in `<execute_collection>` step **1.2b**.
- Skills: `discovery` (TMS + documentation MCP collector), `reverse-engineering` (existing-test + backend-source scan), `qa-structure` (`{IDENTIFIER}` + raw-data path)
</workflow_context>

<config_binding>
Documentation MCP scope comes from **`qa-project-config.md`** and Phase 0 only.
**Subflow ACQUIRE tag (exact string):** `qa-flow-documentation-mcp-subflow`. The acquired fragment is the single source of truth for collection-vendor key precedence, in-scope signals, branch rules, and `<execute_documentation_mcp>` steps. The subflow resolves the documentation vendor binding (`confluence`) and invokes `USE SKILL discovery` with it.
</config_binding>

<raw_data_contract>
This phase owns the raw-data aggregation artifact `agents/qa/{IDENTIFIER}/raw-data.md` and its sections — `discovery` and `reverse-engineering` emit into these, they do not define them. Required sections (empty → `N/A — <reason>`, never blank):
- **Test Case Data** — from `discovery` (resolved TMS vendor binding); ≥1 test-case source required.
- **Documentation / Confluence** — from the documentation MCP subflow (`discovery`, `confluence` binding) when scoped; else the subflow's `SKIPPED_NO_CONFIG` outcome row.
- **Existing Test Patterns** — from `reverse-engineering` (test-automation architecture analysis); framework, HTTP client, structure/assertion/auth conventions, reusable utilities. Record env-file **path + variable names only**, never literal values.
- **Backend Source Code Analysis** — backend path from config or discoverable `RefSrc/` docs; framework, route patterns, key dirs (or `N/A` when no path).
- **API Endpoints Identified** — every row has Method + Source populated; partial rows tagged as gaps.
- **Data Collection Summary** — counts + gap notes; a delegated-skill stop is recorded verbatim as `Gap: <skill> stopped — <message>`, never fabricated over.

Redaction of every captured value runs inside `discovery` via `sensitive-data` before write (redaction scope owned by the vendor binding loaded inside `discovery`); `raw-data.md` is PUBLIC by default.
</raw_data_contract>

<phase_steps>
1. Confirm data sources from project config
2. Execute data collection — see `<execute_collection>`: **1.2a** core collection (`discovery` TMS binding + `reverse-engineering` existing-test scan → `<raw_data_contract>`), **1.2b** optional documentation MCP when scoped
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
1. Resolve the **TMS vendor binding** per `<workflow_context>` (`testrail` or `jira` per the in-scope signal). If no TMS source is resolvable, ask the user once; if still missing, stop Phase 1 and record `Phase 1 blocked: no resolvable test-case source` in `agents/qa-state.md` — do NOT invent an ID.
2. ACQUIRE `discovery` and `reverse-engineering` FROM KB if not already loaded.
3. USE SKILL `discovery` with the resolved TMS vendor binding, passing the test-case input handle and the **Test Case Data** + **API Endpoints Identified** sections of `<raw_data_contract>`; `discovery` loads `references/<vendor>-binding.md`. A delegated stop is recorded verbatim per `<raw_data_contract>`; if the failed source was the only test-case source, stop the phase.
4. USE SKILL `reverse-engineering` (test-automation architecture analysis mode) over the existing test project to populate the **Existing Test Patterns** (and **Backend Source Code Analysis** where backend source is discoverable) sections of `<raw_data_contract>` — read-only scan of framework, HTTP client, structure/assertion/auth conventions, reusable utilities; env-file path + var names only.
5. Assemble `agents/qa/{IDENTIFIER}/raw-data.md` per `<raw_data_contract>` from the emitted sections. Verify it exists. If missing, **re-run steps 3–5 once**; if still missing, stop Phase 1, record the gap in `agents/qa-state.md`, and notify the user — **do not** run `<documentation_mcp_optional>` until the primary raw-data artifact exists.
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
- `agents/qa/{IDENTIFIER}/raw-data.md` exists (verified in step 1.2a) with core collection sections populated per `<raw_data_contract>`
- Documentation searched (results found OR user confirmed skip)
- Documentation MCP outcome in `raw-data.md` matches **successful 1.2b.4** execution **or** `<documentation_mcp_skip_path>`
- Existing test patterns analyzed
- Backend source code searched (if path configured in project config)
- API endpoints identified from test cases
</validation_checklist>

</qa_flow_data_collection>
