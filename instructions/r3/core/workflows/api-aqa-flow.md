---
name: api-aqa-flow
description: "Workflow for backend API test automation: TMS / Issue Tracker test cases → automated API tests, HITL-gated."
alwaysApply: false
tags: ["workflow"]
user-invocable: true
baseSchema: docs/schemas/workflow.md
---

<api_aqa_flow>

<description_and_purpose>

End-to-end backend API test automation from test case input to working automated tests.

Prerequisite: Rosetta Prep Steps.

**Terminology.** External systems are named by role throughout this workflow and its phases: **Test Management System (TMS)**, **Issue Tracker**, and **Wiki**. TestRail, Jira, and Confluence are canonical examples only — adapt identifiers, URLs, requests, calls, and query syntax to the systems resolved for the current project (from repository-root `gain.json`, explicit user input, recognizable URLs/handles, and available integrations).

**At completion the user has:** corrected, passing API test files in the repository; the per-session artifacts under `plans/api-aqa-{IDENTIFIER}/` (`raw-data.md`, `api-analysis.md`, `analysis.md`, `test-specs.md`, `execution-report.md`); and `agents/TEMP/<FEATURE>/api-aqa-state.md` recording phase completion, metrics, and HITL approvals.

</description_and_purpose>

<workflow_phases>

- **Phases 0→7 MUST run in order**; sanctioned skips per `<skip_rules>` only.
- All Rosetta prep steps MUST be FULLY completed, SKILL `load-project-context` loaded and fully executed.
- NO ASSUMPTIONS: never assume endpoints, payloads, auth mechanisms, or response schemas — ask the user when missing.
- MUST use todo tasks; prioritize ACCURACY over SPEED.
- **Drive loop (owned by this workflow):** execute phases in order — for each: APPLY PHASE its phase file → update `agents/TEMP/<FEATURE>/api-aqa-state.md` → verify the phase-output gate → next; keep todos matched to the active phase; never batch-load future phases; never skip without approval (`<skip_rules>`). When a phase delegates work to subagents, dispatch per USE SKILL `orchestration`.
- **Phase-output gate (verify before advancing):** each phase's mandatory artifact must exist and pass its phase-file completion gate before the next phase starts — notably **Phase 4: every `ATC-NNN` in `test-specs.md` traces to a Phase 3 source** (a `raw-data.md` test case and/or an `analysis.md` `G[N]`/`C[N]`/`A[N]` finding); also Phase 1 `raw-data.md`, Phase 2 `api-analysis.md`, and Phase 6 `execution-report.md` present and non-placeholder.

<skip_rules>

This block owns ONLY the api-aqa-flow-specific skip rules below: a set of **always-in-force carve-outs** plus a single **verification-failure unilateral-start override** (the only no-ask deviation; its preconditions are in the table further down). The carve-outs bind unconditionally; the override is subordinate to them. Gate-execution mechanics (how to run an approval gate, token handling) are owned by USE SKILL `hitl` — defer to it; not restated here.

- **Always-in-force carve-outs** (the override never suppresses these):
  1. Per-phase HITL gates (Phases 3-7 marked `type="HITL"`) — explicit user approval per the `hitl` skill.
  2. NO ASSUMPTIONS rule (above) — every non-skip-gate decision.
  3. Safety / destructive confirmations — file deletion, edits outside `plans/api-aqa-{IDENTIFIER}/`, comparable irreversible actions.

- **Verification-failure unilateral-start override** — subordinate to the `hitl` skill + the carve-outs above; the only no-ask deviation, applies only at this skip-verification gate.

  | Precondition (ALL true, independently verified) | Action |
  |---|---|
  | (a) user asserts Phases 0-2 complete this turn AND (b) `agents/TEMP/<FEATURE>/api-aqa-state.md` marks them complete AND (c) `raw-data.md` + `api-analysis.md` exist under `plans/api-aqa-{IDENTIFIER}/` | **Print (a)/(b)/(c) each with its concrete evidence** (user-assertion quote · the api-aqa-state rows · the two artifact paths), then skip Phases 0-2 and resume at Phase 3. Any precondition not showable with concrete evidence → treat as uncertain (last row). |
  | Any of (a)/(b)/(c) false AND user instruction unambiguous | Print failing conditions; begin Phase 0 same turn. |
  | Any precondition uncertain | Fall back to normal HITL ask. **Ambiguity defaults to ASK.** |

</skip_rules>

<execution_policy>
- If user did not specify preferences, perform all steps except optional.
- User CAN customize: specific phases, already-done phases, specific goals, specific cases — LISTEN and ADOPT.
- USE SKILL `coding` before implementation or correction work that touches repository test code or shared utilities.
- **Repository coding standards:** follow `<coding_standards_precedence>`.
- Prefer extending existing test files and utilities over creating new ones.
- **Overall workflow done when:** every phase required for this run is marked complete in `agents/TEMP/<FEATURE>/api-aqa-state.md`, expected artifacts for those phases exist under `plans/api-aqa-{IDENTIFIER}/` (and related paths named in phase docs), and the user accepts the last test outcome or explicitly stops the run.
</execution_policy>

<project_config_loading phase="0" applies="ALL" subagent="discoverer" role="AQA project config loader" type="HITL-CONDITIONAL">
- APPLY PHASE `api-aqa-flow-project-config-loading.md`
- Input: user request. Output: project config file, initial data file, session directory at `plans/api-aqa-{IDENTIFIER}/`.
- HITL gate: **ASK USER FOR PROJECT INFO** if config does not already exist.
- Required skills: `qa-structure`, `sensitive-data` (redaction at intake)
- Recommended skills: `questioning` (config-missing interview)
- Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; Phase 0 is not complete until its output spot-check passes.
</project_config_loading>

<data_collection phase="1" applies="ALL" subagent="discoverer" role="AQA data collector">
- APPLY PHASE `api-aqa-flow-data-collection.md`
- Input: project config + initial data. Output: `plans/api-aqa-{IDENTIFIER}/raw-data.md` (test cases, documentation, existing test patterns).
- Required skills: `data-collection` (TMS + Wiki collector), `qa-knowledge` (`code_analysis` mode — existing-test + backend-source scan), `reverse-engineering`, `qa-structure`
- Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; Phase 1 is not complete until its output spot-check passes.
</data_collection>

<api_spec_analysis phase="2" applies="ALL" subagent="discoverer" role="API spec analyst">
- APPLY PHASE `api-aqa-flow-api-spec-analysis.md`
- Input: raw data + project config. Output: `plans/api-aqa-{IDENTIFIER}/api-analysis.md` (endpoint contracts, auth, data dependencies).
- Required skills: `qa-knowledge` (`code_analysis` mode — API-contract extraction), `reverse-engineering`, `sensitive-data`, `qa-structure`
- Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; Phase 2 is not complete until its output spot-check passes.
</api_spec_analysis>

<gap_and_requirements_clarification phase="3" applies="ALL" subagent="architect" role="Test requirements analyst" type="HITL">
- APPLY PHASE `api-aqa-flow-gap-and-requirements-clarification.md`
- Input: raw data + API analysis. Output: `plans/api-aqa-{IDENTIFIER}/analysis.md` (gaps, contradictions, ambiguities resolved).
- HITL gate: **WAIT FOR USER ANSWERS** before Phase 4.
- Required skills: `qa-knowledge` (`gap_analysis` mode), `qa-structure`
- Recommended skills: `questioning`
- Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; Phase 3 is not complete until its output spot-check passes.
</gap_and_requirements_clarification>

<test_case_specification phase="4" applies="ALL" subagent="architect" role="Test specification author" type="HITL">
- APPLY PHASE `api-aqa-flow-test-case-specification.md`
- Input: all phase 1-3 outputs. Output: `plans/api-aqa-{IDENTIFIER}/test-specs.md` (Given-When-Then scenarios).
- HITL gate: **WAIT FOR EXPLICIT USER APPROVAL** before Phase 5; comments, questions, suggestions, and review feedback are not approval.
- Required skills: `qa-knowledge` (`scenario_design` mode), `sensitive-data`, `qa-structure`
- Recommended skills: `hitl`
- Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; Phase 4 is not complete until its output spot-check passes.
</test_case_specification>

<test_implementation phase="5" applies="ALL" subagent="engineer" role="Test automation engineer" type="HITL">
- APPLY PHASE `api-aqa-flow-test-implementation.md`
- Input: approved test specs + existing patterns + API analysis. Output: implemented test files.
- HITL gate: **STOP AND WAIT** — user must provide actual execution results (output, report path, or pass/fail); confirmation alone does not satisfy this gate.
- Required skills: `qa-knowledge` (`implementation_modes` — API impl), `qa-structure`
- Recommended skills: `testing`, `coding` (repo conventions)
- Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; Phase 5 is not complete until its output spot-check passes.
</test_implementation>

<execution_and_report_analysis phase="6" applies="ALL" subagent="engineer" role="Test failure analyst" type="HITL">
- APPLY PHASE `api-aqa-flow-execution-and-report-analysis.md`
- Input: test execution report (user-provided or from `agents/user-instructions/`). Output: `plans/api-aqa-{IDENTIFIER}/execution-report.md` (failure analysis).
- HITL gate: **WAIT FOR USER TO PROVIDE TEST EXECUTION RESULTS**.
- Required skills: `qa-knowledge` (`test_execution_triage` mode), `sensitive-data`, `qa-structure`
- Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; Phase 6 is not complete until its output spot-check passes.
</execution_and_report_analysis>

<test_corrections phase="7" applies="ALL" subagent="engineer" role="Test correction engineer" type="HITL">
- APPLY PHASE `api-aqa-flow-test-correction.md`
- Input: execution report + test files + test specs. Output: corrected test files.
- HITL gate: **WAIT FOR EXPLICIT USER APPROVAL** before applying changes; comments, questions, suggestions, and review feedback are not approval.
- Required skills: `qa-knowledge` (`correction` mode), `qa-structure`
- Recommended skills: `coding` (authors the proposed/applied edits), `debugging` (root-cause alignment), `hitl`
- Update `agents/TEMP/<FEATURE>/api-aqa-state.md`; Phase 7 is not complete until its output spot-check passes.
</test_corrections>

</workflow_phases>

<coding_standards_precedence>
Conflict rule is binary: if guidance from a loaded skill conflicts with repository markdown (`docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `agents/IMPLEMENTATION.md` — or the paths `gain.json` configures — and `project_description.md` if present) on naming, structure/layout, tooling, or test patterns, repository markdown wins and the conflicting skill snippet is ignored for that decision. If there is no conflict, apply both. `gain.json` wins for file locations.
Example: if a skill suggests `/tests/api/` but `docs/ARCHITECTURE.md` requires `/qa/api/tests/`, use `/qa/api/tests/`.
</coding_standards_precedence>

<failure_handling>
- **Phase-file load failure** (APPLY PHASE for a required phase returns nothing): retry once, then stop, record in `agents/TEMP/<FEATURE>/api-aqa-state.md`, ask the user — never improvise an undocumented phase.
- **Missing prior artifact:** do not fabricate; with user agreement re-run the producing phase, or stop and ask the user to restore it.
- **Unreadable `agents/TEMP/<FEATURE>/api-aqa-state.md`:** pause, rebuild minimal phase pointers from `plans/api-aqa-{IDENTIFIER}/` when possible, then ask the user to confirm.
- **State-note example (phase-file load failure):** `Phase 5 blocked: APPLY PHASE api-aqa-flow-test-implementation.md returned nothing at 2026-05-25T15:00Z; awaiting user action.`
</failure_handling>

<state_file>

`agents/TEMP/<FEATURE>/api-aqa-state.md` carries: header (Last Updated / Current Phase 0-7 / Test Case Source / Feature / IDENTIFIER — matching the Phase 0 stub; `API Base URL` is appended once Phase 2 resolves it) + 8-row `## Phase Completion Status` checklist (one row per phase 0-7) + per-phase append blocks. Each phase file owns its own state-update snippet (the delta it appends after running) — this workflow does not restate the full template.

</state_file>

<references>

Subagents: `discoverer` · `architect` · `engineer` · `executor` (optional, mechanical actions).

Cross-phase skills: `qa-structure` (paths / identifier / state-file shape) and `qa-knowledge` (modes, taxonomies, artifact skeletons — loads its own assets at point of use).

Integrations: TMS, Issue Tracker, and Wiki per `<description_and_purpose>` Terminology.

</references>

</api_aqa_flow>
