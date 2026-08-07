---
name: api-aqa-flow
description: "Workflow for backend API test automation: TMS / Issue Tracker test cases → automated API tests, HITL-gated."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<api_aqa_flow>

<description_and_purpose>

End-to-end backend API test automation: test cases → automated tests.

Prerequisite: Rosetta Prep Steps.

**Terminology.** **TMS** · **Issue Tracker** · **Wiki** = system roles (TestRail · Jira · Confluence are examples). Adapt identifiers, URLs, requests, calls, query syntax per `gain.json`, user input, visible handles, available integrations.

</description_and_purpose>

<workflow_phases>

- **Phases 0→7 MUST run in order**; sanctioned skips per `<skip_rules>` only.
- All Rosetta prep steps MUST be FULLY completed, SKILL `load-project-context` loaded and fully executed.
- **NO ASSUMPTIONS:** never assume endpoints, payloads, auth, response schemas — ask.
- MUST use todo tasks ledger ASAP. ACCURACY > SPEED. Use tools/MCPs first.
- **Drive loop:** APPLY PHASE → update `agents/TEMP/<FEATURE>/api-aqa-state.md` → verify gate → advance. Keep todos matched to active phase. Never batch-load future phases. Never skip without approval (`<skip_rules>`). Dispatch subagents: USE SKILL `orchestration`.
- **Phase-output gate (verify before advancing):** artifact must exist and pass phase-file completion gate:
  - Phase 4: every `ATC-NNN` in `test-specs.md` → traced to Phase 3 source (`raw-data.md` TC and/or `analysis.md` `G[N]`/`C[N]`/`A[N]`).
  - Phases 1, 2, 6: `raw-data.md`, `api-analysis.md`, `execution-report.md` non-placeholder.
- **Approval (all HITL gates):** comments · questions · suggestions · review feedback ≠ approval.
- Dispatch mechanical sub-tasks to `executor` (optional).

<skip_rules>

**Always-in-force carve-outs** (override never suppresses):
1. Phases 3-7 HITL gates (`type="HITL"`) — explicit approval per `hitl` skill.
2. NO ASSUMPTIONS rule — every non-skip-gate decision.
3. Safety/destructive confirmations — file deletion, edits outside `plans/api-aqa-{IDENTIFIER}/`, or comparable irreversible actions.

**Verification-failure unilateral-start override** — subordinate to `hitl` + carve-outs; the only no-ask deviation, and only at this skip-verification gate.

| Precondition (ALL true, independently verified) | Action |
|---|---|
| (a) user asserts Phases 0-2 complete this turn AND (b) `agents/TEMP/<FEATURE>/api-aqa-state.md` marks them complete AND (c) `raw-data.md` + `api-analysis.md` exist under `plans/api-aqa-{IDENTIFIER}/` | **Print (a)/(b)/(c) each with concrete evidence** (user-assertion quote · api-aqa-state rows · two artifact paths), skip Phases 0-2, resume at Phase 3. Not showable → treat as uncertain (last row). |
| Any of (a)/(b)/(c) false AND user instruction unambiguous | Print failing conditions; begin Phase 0 same turn. |
| Any precondition uncertain | Fall back to HITL ask. **Ambiguity defaults to ASK.** |

</skip_rules>

<execution_policy>
1. Default: MUST execute all steps except optional; user CAN customize phases, goals, cases — ADOPT.
2. USE SKILL `coding` before touching repository test code or shared utilities.
3. Follow `<coding_standards_precedence>`. Extend existing files; avoid creating new.
4. **Done:** required phases complete in `agents/TEMP/<FEATURE>/api-aqa-state.md`; expected artifacts exist under `plans/api-aqa-{IDENTIFIER}/` and at related paths named in phase docs; user accepts outcome or stops.
5. **Deliverables:** corrected passing test files; `plans/api-aqa-{IDENTIFIER}/` artifacts (`raw-data.md`, `api-analysis.md`, `analysis.md`, `test-specs.md`, `execution-report.md`); `agents/TEMP/<FEATURE>/api-aqa-state.md` with completion, metrics, HITL approvals.
</execution_policy>

<project_config_loading phase="0" applies="ALL" subagent="discoverer" role="AQA project config loader" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro, grok-4.5, gpt-5.6-terra" type="HITL-CONDITIONAL">
1. APPLY PHASE `api-aqa-flow-project-config-loading.md`
2. Input: user request. Output: project config, initial data, `plans/api-aqa-{IDENTIFIER}/`.
3. HITL gate: **ASK USER FOR PROJECT INFO** if config missing.
4. Required skills: `qa-structure`, `sensitive-data` (redaction at intake)
5. Recommended skills: `questioning` (config-missing interview)
6. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; phase complete only after spot-check passes.
</project_config_loading>

<data_collection phase="1" applies="ALL" subagent="discoverer" role="AQA data collector" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro, grok-4.5, gpt-5.6-terra">
1. APPLY PHASE `api-aqa-flow-data-collection.md`
2. Input: project config + initial data. Output: `plans/api-aqa-{IDENTIFIER}/raw-data.md`.
3. Required skills: `data-collection` (TMS + Wiki), `qa-knowledge` (`code_analysis` — existing-test + backend scan), `reverse-engineering`, `qa-structure`
4. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; phase complete only after spot-check passes.
</data_collection>

<api_spec_analysis phase="2" applies="ALL" subagent="discoverer" role="API spec analyst" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro, grok-4.5, gpt-5.6-terra">
1. APPLY PHASE `api-aqa-flow-api-spec-analysis.md`
2. Input: raw data + project config. Output: `plans/api-aqa-{IDENTIFIER}/api-analysis.md` (endpoint contracts, auth, data deps).
3. Required skills: `qa-knowledge` (`code_analysis` — API-contract extraction), `reverse-engineering`, `sensitive-data`, `qa-structure`
4. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; phase complete only after spot-check passes.
</api_spec_analysis>

<gap_and_requirements_clarification phase="3" applies="ALL" subagent="architect" role="Test requirements analyst" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol" type="HITL">
1. APPLY PHASE `api-aqa-flow-gap-and-requirements-clarification.md`
2. Input: raw data + API analysis. Output: `plans/api-aqa-{IDENTIFIER}/analysis.md` (gaps, contradictions, ambiguities resolved).
3. HITL gate: **WAIT FOR USER ANSWERS** before Phase 4.
4. Required skills: `qa-knowledge` (`gap_analysis` mode), `qa-structure`
5. Recommended skills: `questioning`
6. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; phase complete only after spot-check passes.
</gap_and_requirements_clarification>

<test_case_specification phase="4" applies="ALL" subagent="architect" role="Test specification author" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol" type="HITL">
1. APPLY PHASE `api-aqa-flow-test-case-specification.md`
2. Input: all phase 1-3 outputs. Output: `plans/api-aqa-{IDENTIFIER}/test-specs.md` (Given-When-Then).
3. HITL gate: **WAIT FOR EXPLICIT USER APPROVAL** before Phase 5.
4. Required skills: `qa-knowledge` (`scenario_design` mode), `sensitive-data`, `qa-structure`
5. Recommended skills: `hitl`
6. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; phase complete only after spot-check passes.
</test_case_specification>

<test_implementation phase="5" applies="ALL" subagent="engineer" role="Test automation engineer" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3-flash, grok-4.5, gpt-5.6-terra" type="HITL">
1. APPLY PHASE `api-aqa-flow-test-implementation.md`
2. Input: approved test specs + existing patterns + API analysis. Output: implemented test files.
3. HITL gate: **STOP AND WAIT** — user must provide actual execution results (output, report path, or pass/fail); confirmation alone does not satisfy this gate.
4. Required skills: `qa-knowledge` (`implementation_modes` — API impl), `qa-structure`
5. Recommended skills: `testing`, `coding` (repo conventions)
6. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; phase complete only after spot-check passes.
</test_implementation>

<execution_and_report_analysis phase="6" applies="ALL" subagent="engineer" role="Test failure analyst" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3-flash, grok-4.5, gpt-5.6-terra" type="HITL">
1. APPLY PHASE `api-aqa-flow-execution-and-report-analysis.md`
2. Input: execution report (user-provided or from `agents/user-instructions/`). Output: `plans/api-aqa-{IDENTIFIER}/execution-report.md`.
3. HITL gate: **WAIT FOR USER TO PROVIDE TEST EXECUTION RESULTS**.
4. Required skills: `qa-knowledge` (`test_execution_triage` mode), `sensitive-data`, `qa-structure`
5. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; phase complete only after spot-check passes.
</execution_and_report_analysis>

<test_corrections phase="7" applies="ALL" subagent="engineer" role="Test correction engineer" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3-flash, grok-4.5, gpt-5.6-terra" type="HITL">
1. APPLY PHASE `api-aqa-flow-test-correction.md`
2. Input: execution report + test files + test specs. Output: corrected test files.
3. HITL gate: **WAIT FOR EXPLICIT USER APPROVAL** before applying changes.
4. Required skills: `qa-knowledge` (`correction` mode), `qa-structure`
5. Recommended skills: `coding` (proposed/applied edits), `debugging` (root-cause alignment), `hitl`
6. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; phase complete only after spot-check passes.
</test_corrections>

</workflow_phases>

<coding_standards_precedence>
If a loaded skill conflicts with repository markdown (`docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `agents/IMPLEMENTATION.md` — or `gain.json`-configured paths — and `project_description.md` if present) on naming, structure/layout, tooling, or test patterns → repository markdown wins; conflicting skill snippet ignored. No conflict → apply both. `gain.json` wins for file locations.
</coding_standards_precedence>

<failure_handling>
1. **Phase-file load failure** (`APPLY PHASE` returns nothing): retry once → record in `agents/TEMP/<FEATURE>/api-aqa-state.md` → ask user; never improvise.
2. **Missing prior artifact:** do not fabricate; re-run producing phase with user agreement, or stop → ask user to restore it.
3. **Unreadable `agents/TEMP/<FEATURE>/api-aqa-state.md`:** pause → rebuild minimal phase pointers from `plans/api-aqa-{IDENTIFIER}/` when possible → ask user to confirm.
4. **Example note (load failure):** `Phase 5 blocked: APPLY PHASE api-aqa-flow-test-implementation.md returned nothing at 2026-05-25T15:00Z; awaiting user action.`
</failure_handling>

<state_file>

`agents/TEMP/<FEATURE>/api-aqa-state.md`: header (Last Updated / Current Phase 0-7 / Test Case Source / Feature / IDENTIFIER; `API Base URL` appended after Phase 2) + 8-row `## Phase Completion Status` checklist + per-phase append blocks. Each phase file owns its state-update snippet.

</state_file>

</api_aqa_flow>
