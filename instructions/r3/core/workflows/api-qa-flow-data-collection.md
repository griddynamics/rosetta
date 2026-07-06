---
name: api-qa-flow-data-collection
description: Phase 1 of QA workflow - Data Collection from test cases, documentation, and codebase
alwaysApply: false
tags: []
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<api_qa_flow_data_collection>

<description_and_purpose>
Gather test case details from TMS, search documentation, and discover existing API test patterns in the codebase to establish baseline for automation.
</description_and_purpose>

<workflow_context>
- Phase 1 of 8 in `api-qa-flow`
- Input: project config + initial data from Phase 0
- Output: `plans/api-qa-{IDENTIFIER}/raw-data.md` with test cases, documentation, and existing test patterns
- Prerequisite: Phase 0 complete, `api-qa-project-config.md` and `initial-data.md` exist
- Collection skill: `data-collection` (single canonical collector for TMS + documentation MCP sources). Existing-test-pattern scan: `reverse-engineering` (test-automation architecture analysis mode). This phase OWNS the raw-data aggregation contract (`<raw_data_contract>`) — `data-collection` and `reverse-engineering` EMIT into the sections this phase asserts.
- **Config-resolved vendors (NOT hardcoded).** Resolve from `api-qa-project-config.md` / Phase 0:
  - **TMS vendor** — first non-empty key (stop at first hit): `testcase_mcp_collection_skill`, `test_case_management.mcp_collection_skill`, `mcp_test_case_collection_skill`, `tms_collection_skill` (`testcase_mcp_collection_skill` is the `config-schema` canonical key written by Phase 0). In-scope signal: `testrail_base_url` → binding = `testrail`; `jira_base_url` → binding = `jira`.
  - **Documentation vendor** — see `<config_binding>` (precedence + in-scope signals).
- Optional **documentation MCP** when `api-qa-project-config.md` scopes it — binding note in `<config_binding>`; procedure in `<execute_collection>` step **1.2b**.
- Skills: `data-collection` (TMS + documentation MCP collector), `reverse-engineering` (existing-test + backend-source scan), `qa-structure` (`{IDENTIFIER}` + raw-data path)
</workflow_context>

<config_binding>
Documentation MCP scope comes from **`api-qa-project-config.md`** and Phase 0 only. This phase OWNS the resolution + collection inline (step 1.2b) — there is no separate sub-flow.
- **Config keys (read literally; first non-empty wins, stop at first hit):** `documentation_mcp_collection_skill`, `documentation.mcp_collection_skill`, `mcp_documentation_collection_skill`, `confluence_mcp_collection_skill`. The resolved value maps to a `data-collection` vendor binding (Confluence backend → binding `confluence` — the canonical example; other documentation backends, e.g. a wiki/Notion/SharePoint MCP, map to their own `data-collection` binding the same way); the collection skill is ALWAYS `data-collection` (which resolves + loads its own vendor binding internally).
- **In-scope signals ("is documentation MCP in scope?"):** `documentation_type`, `type` (when its value implies a documentation backend), `confluence_base_url`, `confluence_space`, `documentation_base_url`, `documentation_mcp_server`, or any field the `api-qa-project-config` template documents for documentation MCP — treat absent values as absent.
- **Raw-data heading (fixed):** `## Documentation / Confluence` under `plans/api-qa-{IDENTIFIER}/raw-data.md`. Do not invent a different heading unless `api-qa-project-config.md` explicitly instructs a rename (then write under the configured heading and note the mapping once).
</config_binding>

<raw_data_contract>
This phase owns the raw-data aggregation artifact `plans/api-qa-{IDENTIFIER}/raw-data.md` and its sections — `data-collection` and `reverse-engineering` emit into these, they do not define them. Required sections (empty → `N/A — <reason>`, never blank):
- **Test Case Data** — from `data-collection` (resolved TMS vendor binding); ≥1 test-case source required.
- **Documentation / Confluence** — from `data-collection` (resolved documentation vendor binding, e.g. `confluence`) via step 1.2b when scoped; else the `SKIPPED_NO_CONFIG` outcome row (per `<documentation_mcp_outcomes>`).
- **Existing Test Patterns** — from `reverse-engineering` (test-automation architecture analysis); framework, HTTP client, structure/assertion/auth conventions, reusable utilities. Record env-file **path + variable names only**, never literal values.
- **Backend Source Code Analysis** — backend path from config or discoverable `RefSrc/` docs; framework, route patterns, key dirs (or `N/A` when no path).
- **API Endpoints Identified** — every row has Method + Source populated; partial rows tagged as gaps.
- **Data Collection Summary** — counts + gap notes; a delegated-skill stop is recorded verbatim as `Gap: <skill> stopped — <message>`, never fabricated over.

Redaction of every captured value runs inside `data-collection` via `sensitive-data` before write (redaction scope owned by the vendor binding loaded inside `data-collection`); `raw-data.md` is PUBLIC by default.
</raw_data_contract>

<phase_steps>
1. Confirm data sources from project config
2. Execute data collection — see `<execute_collection>`: **1.2a** core collection (`data-collection` TMS binding + `reverse-engineering` existing-test scan → `<raw_data_contract>`), **1.2b** optional documentation MCP when scoped
3. Validate and update state
</phase_steps>

<confirm_inputs step="1.1">
1. Verify project config loaded with data source information
2. Verify initial data file exists with test case reference
3. Identify TMS, documentation, and codebase sources to query
4. **Failure path:** if (1) or (2) is missing, stop Phase 1, record `Phase 1 blocked: missing prerequisite [config | initial-data]` in `agents/api-qa-state.md`, and ask the user to re-run Phase 0. If (3) finds no usable sources, record the gap and ask the user to confirm proceeding with empty data sources before continuing.
</confirm_inputs>

<execute_collection step="1.2" subagent="discoverer" role="QA data collector">

<verify_primary_raw_data step="1.2a">
1. Resolve the **TMS vendor binding** per `<workflow_context>` (`testrail` or `jira` per the in-scope signal). If no TMS source is resolvable, ask the user once; if still missing, stop Phase 1 and record `Phase 1 blocked: no resolvable test-case source` in `agents/api-qa-state.md` — do NOT invent an ID.
2. ACQUIRE `data-collection` and `reverse-engineering` FROM KB if not already loaded.
3. USE SKILL `data-collection` with the resolved TMS vendor binding, passing the test-case input handle and the **Test Case Data** + **API Endpoints Identified** sections of `<raw_data_contract>`; `data-collection` loads `references/tms-vendor-binding.md`. A delegated stop is recorded verbatim per `<raw_data_contract>`; if the failed source was the only test-case source, stop the phase.
4. USE SKILL `reverse-engineering` (test-automation architecture analysis mode) over the existing test project to populate the **Existing Test Patterns** (and **Backend Source Code Analysis** where backend source is discoverable) sections of `<raw_data_contract>` — read-only scan of framework, HTTP client, structure/assertion/auth conventions, reusable utilities; env-file path + var names only.
5. Assemble `plans/api-qa-{IDENTIFIER}/raw-data.md` per `<raw_data_contract>` from the emitted sections. Verify it exists. If missing, **re-run steps 3–5 once**; if still missing, stop Phase 1, record the gap in `agents/api-qa-state.md`, and notify the user — **do not** run `<documentation_mcp_optional>` until the primary raw-data artifact exists.
</verify_primary_raw_data>

<documentation_mcp_optional step="1.2b">
This phase runs the documentation-MCP collection **inline** (no sub-flow). Binding resolution + in-scope signals per `<config_binding>`; record **exactly one** outcome line per `<documentation_mcp_outcomes>`.

1.2b.1. **Scope check.** If no in-scope documentation-MCP signal is present (per `<config_binding>`), apply **SKIPPED_NO_CONFIG** and skip the rest of this sub-block.
1.2b.2. **Resolve the binding.** Pick the documentation vendor binding from the first non-empty config key (per `<config_binding>`; Confluence backend → `confluence`). If in-scope signals are active but no key is set, re-read `api-qa-project-config.md` + Phase 0 for a default; if still none, apply **SKIPPED_NO_CONFIG** and skip.
1.2b.3. **Collect.** ACQUIRE `data-collection` FROM KB if not loaded — zero documents → apply **ACQUIRE_FAILED** (skill = `data-collection`) and skip. Otherwise USE SKILL `data-collection` with the resolved documentation vendor binding, passing the binding's input handle(s) and the fixed `## Documentation / Confluence` heading as the output target; `data-collection` loads `references/documentation-vendor-binding.md` and runs harvest → redact (via `sensitive-data`) → write internally. No harvestable sources after search + user fallback → apply **EMPTY_HARVEST**; otherwise apply **COMPLETED**.
1.2b.4. **Verify.** Confirm the `## Documentation / Confluence` heading holds **exactly one** outcome line matching the branch taken (per `<documentation_mcp_outcomes>`). On mismatch: zero rows → append the branch row; duplicate rows → keep only the most recent (latest by `agents/api-qa-state.md` Phase 1 timestamp); heading missing → create it, then append. After three failed re-verifies, stop and record `Phase 1 blocked: documentation-MCP verification failed after remediation` in `agents/api-qa-state.md`; ask the user to inspect `raw-data.md`.
</documentation_mcp_optional>

<documentation_mcp_outcomes>
The `## Documentation / Confluence` heading carries **exactly one** outcome line (starts with `**Outcome:**`; no extra trailing `**`):
| Branch | Trigger | Outcome line |
| --- | --- | --- |
| **SKIPPED_NO_CONFIG** | no documentation-MCP config / no resolvable collection skill | `**Outcome:** skipped — no documentation MCP configuration` + one-line reason |
| **ACQUIRE_FAILED** | ACQUIRE returned zero docs for `data-collection` | `**Outcome:** skipped — ACQUIRE failed` + skill name + short error |
| **EMPTY_HARVEST** | harvesting ran but found no fetchable sources | `**Outcome:** no documentation sources after harvesting` + what was searched |
| **COMPLETED** | `data-collection` ran the resolved binding | `**Outcome:** collected via data-collection (<binding>) — <page/URL count>` |

Literal examples: `**Outcome:** collected via data-collection (confluence) — 12 pages fetched`; `**Outcome:** no documentation sources after harvesting — searched 3 spaces, 0 pages returned`.
</documentation_mcp_outcomes>

</execute_collection>

<update_state step="1.3">
1. Update `agents/api-qa-state.md`:
   - Test Cases Retrieved: [count]
   - Documentation Pages Found: [count]
   - API Endpoints Identified: [count]
   - Existing Test Files Found: [count]
   - Test Framework: [name]
   - Backend Source: [path or N/A]
   - Phase 1 completion timestamp
2. Mark Phase 1 complete, Phase 2 current
3. **Failure path:** if `agents/api-qa-state.md` cannot be written (permission denied, disk full, file locked), do not mark Phase 1 complete; record the write error in chat output, ask the user to resolve the filesystem issue, and pause before Phase 2.
</update_state>

<validation_checklist>
- Test case data retrieved and documented
- `plans/api-qa-{IDENTIFIER}/raw-data.md` exists (verified in step 1.2a) with core collection sections populated per `<raw_data_contract>`
- Documentation searched (results found OR user confirmed skip)
- Documentation MCP outcome in `raw-data.md` is exactly one `<documentation_mcp_outcomes>` branch matching the path taken in step 1.2b
- Existing test patterns analyzed
- Backend source code searched (if path configured in project config)
- API endpoints identified from test cases
</validation_checklist>

</api_qa_flow_data_collection>
