---
name: qa-flow
description: MUST apply for backend API test automation: TestRail/Jira cases → automated tests, HITL gates at spec/impl/exec/correction.
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<qa_flow>

<description_and_purpose>

End-to-end backend API test automation from test case input to working automated tests. (Source-system + tool enumeration owned by the frontmatter `description` field — not restated here.)

**At completion the user has:** corrected, passing API test files in the repository; the per-session artifacts under `agents/qa/{IDENTIFIER}/` (`raw-data.md`, `api-analysis.md`, `analysis.md`, `test-specs.md`, `execution-report.md`); and `agents/qa-state.md` recording phase completion, metrics, and HITL approvals.

</description_and_purpose>

<workflow_phases>

- **Phases 0→7 MUST run in order**; sanctioned skips per `<skip_rules>` only.
- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed.
- NO ASSUMPTIONS: never assume endpoints, payloads, auth mechanisms, or response schemas — ask the user when missing.
- MUST use todo tasks; prioritize ACCURACY over SPEED.
- **Drive loop (owned by this workflow):** execute phases in order — for each: ACQUIRE its phase file FROM KB → execute → update `agents/qa-state.md` → verify the phase-output gate → next; keep todos matched to the active phase; never batch-load future phases; never skip without approval (`<skip_rules>`). When a phase delegates work to subagents, dispatch per `USE SKILL orchestrator-contract`. This workflow specifies only qa-flow-specific deltas in each phase block below.
- **Phase-output gate (verify before advancing):** each phase's mandatory artifact must exist and pass its phase-file completion gate before the next phase starts — notably **Phase 4: every `ATC-NNN` in `test-specs.md` traces to a Phase 3 requirement/source**; also Phase 1 `raw-data.md`, Phase 2 `api-analysis.md`, and Phase 6 `execution-report.md` present and non-placeholder.

<phase_template>
Per-phase block format: phase file path + Input/Output + HITL gate (when present). The ACQUIRE / execute / state-update cadence is the drive loop above, not restated per-phase.
</phase_template>

<skip_rules>

This block owns ONLY the qa-flow-specific skip rules below: a set of **always-in-force carve-outs** plus a single **verification-failure unilateral-start override** (the only no-ask deviation; its preconditions are in the table further down). The carve-outs bind unconditionally; the override is subordinate to them. Gate-execution mechanics (how to run an approval gate, token handling) are owned by `USE SKILL hitl` — defer to it; not restated here.

- **Always-in-force carve-outs** (the override never suppresses these):
  1. Per-phase HITL gates (Phases 3-7 marked `type="HITL"`) — explicit user approval per the `hitl` skill.
  2. NO ASSUMPTIONS rule (above) — every non-skip-gate decision.
  3. Safety / destructive confirmations — file deletion, edits outside `agents/qa/{IDENTIFIER}/`, comparable irreversible actions.

- **Verification-failure unilateral-start override** — subordinate to the `hitl` skill + the carve-outs above; the only no-ask deviation, applies only at this skip-verification gate.

  | Precondition (ALL true, independently verified) | Action |
  |---|---|
  | (a) user asserts Phases 0-2 complete this turn AND (b) `agents/qa-state.md` marks them complete AND (c) `raw-data.md` + `api-analysis.md` exist under `agents/qa/{IDENTIFIER}/` | **Print (a)/(b)/(c) each with its concrete evidence** (user-assertion quote · the qa-state rows · the two artifact paths), then skip Phases 0-2 and resume at Phase 3. Any precondition not showable with concrete evidence → treat as uncertain (last row). |
  | Any of (a)/(b)/(c) false AND user instruction unambiguous | Print failing conditions; begin Phase 0 same turn. |
  | Any precondition uncertain | Fall back to normal HITL ask. **Ambiguity defaults to ASK.** |

</skip_rules>

<execution_policy>
- If user did not specify preferences, perform all steps except optional.
- User CAN customize: specific phases, already-done phases, specific goals, specific cases — LISTEN and ADOPT.
- USE SKILL `coding` before implementation or correction work that touches repository test code or shared utilities (if not already loaded: ACQUIRE `coding` FROM KB).
- **Repository coding standards:** follow `<coding_standards_precedence>`.
- Prefer extending existing test files and utilities over creating new ones.
- **Overall workflow done when:** every phase required for this run is marked complete in `agents/qa-state.md`, expected artifacts for those phases exist under `agents/qa/{IDENTIFIER}/` (and related paths named in phase docs), and the user accepts the last test outcome or explicitly stops the run.
</execution_policy>

<project_config_loading phase="0" applies="ALL" subagent="discoverer" role="QA project config loader" type="HITL-CONDITIONAL">
- Phase file: `qa-flow-project-config-loading.md`
- Input: user request. Output: project config file, initial data file, session directory at `agents/qa/{IDENTIFIER}/`.
- HITL gate: **ASK USER FOR PROJECT INFO** if config does not already exist.
</project_config_loading>

<data_collection phase="1" applies="ALL" subagent="discoverer" role="QA data collector">
- Phase file: `qa-flow-data-collection.md`
- Input: project config + initial data. Output: `agents/qa/{IDENTIFIER}/raw-data.md` (test cases, documentation, existing test patterns).
</data_collection>

<api_spec_analysis phase="2" applies="ALL" subagent="discoverer" role="API spec analyst">
- Phase file: `qa-flow-api-spec-analysis.md`
- Input: raw data + project config. Output: `agents/qa/{IDENTIFIER}/api-analysis.md` (endpoint contracts, auth, data dependencies).
</api_spec_analysis>

<gap_and_requirements_clarification phase="3" applies="ALL" subagent="architect" role="Test requirements analyst" type="HITL">
- Phase file: `qa-flow-gap-and-requirements-clarification.md`
- Input: raw data + API analysis. Output: `agents/qa/{IDENTIFIER}/analysis.md` (gaps, contradictions, ambiguities resolved).
- HITL gate: **WAIT FOR USER ANSWERS** before Phase 4.
</gap_and_requirements_clarification>

<test_case_specification phase="4" applies="ALL" subagent="architect" role="Test specification author" type="HITL">
- Phase file: `qa-flow-test-case-specification.md`
- Input: all phase 1-3 outputs. Output: `agents/qa/{IDENTIFIER}/test-specs.md` (Given-When-Then scenarios).
- HITL gate: **WAIT FOR USER APPROVAL** before Phase 5.
</test_case_specification>

<test_implementation phase="5" applies="ALL" subagent="engineer" role="Test automation engineer" type="HITL">
- Phase file: `qa-flow-test-implementation.md`
- Input: approved test specs + existing patterns + API analysis. Output: implemented test files.
- HITL gate: **STOP AND WAIT** — user must provide actual execution results (output, report path, or pass/fail); confirmation alone does not satisfy this gate.
</test_implementation>

<execution_and_report_analysis phase="6" applies="ALL" subagent="engineer" role="Test failure analyst" type="HITL">
- Phase file: `qa-flow-execution-and-report-analysis.md`
- Input: test execution report (user-provided or from `agents/user-instructions/`). Output: `agents/qa/{IDENTIFIER}/execution-report.md` (failure analysis).
- HITL gate: **WAIT FOR USER TO PROVIDE TEST EXECUTION RESULTS**.
</execution_and_report_analysis>

<test_corrections phase="7" applies="ALL" subagent="engineer" role="Test correction engineer" type="HITL">
- Phase file: `qa-flow-test-correction.md`
- Input: execution report + test files + test specs. Output: corrected test files.
- HITL gate: **WAIT FOR USER APPROVAL** before applying changes.
</test_corrections>

</workflow_phases>

<coding_standards_precedence>
Conflict rule is binary: if guidance from a loaded skill conflicts with repository markdown (`CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`, and `project_description.md` if present) on naming, structure/layout, tooling, or test patterns, repository markdown wins and the conflicting skill snippet is ignored for that decision. If there is no conflict, apply both.
Example: if a skill suggests `/tests/api/` but `ARCHITECTURE.md` requires `/qa/api/tests/`, use `/qa/api/tests/`.
</coding_standards_precedence>

<failure_handling>
- **Zero-doc ACQUIRE** for a required phase workflow: stop, record in `agents/qa-state.md`, ask the user — no undocumented prompts (see also `orchestrator-contract` skill when loaded).
- **Missing prior artifact:** do not fabricate; with user agreement re-run the producing phase, or stop and ask the user to restore it.
- **Unreadable `agents/qa-state.md`:** pause, rebuild minimal phase pointers from `agents/qa/{IDENTIFIER}/` when possible, then ask the user to confirm.
- **State-note example (zero-doc ACQUIRE):** `Phase 5 blocked: ACQUIRE qa-flow-test-implementation.md returned zero documents at 2026-05-25T15:00Z; awaiting user action.`
</failure_handling>

<state_file>

`agents/qa-state.md` carries: header (Last Updated / Current Phase 0-7 / Test Case Source / Feature / IDENTIFIER — matching the Phase 0 stub; `API Base URL` is appended once Phase 2 resolves it) + 8-row `## Phase Completion Status` checklist (one row per phase 0-7) + per-phase append blocks. Each phase file owns its own state-update snippet (the delta it appends after running) — this workflow does not restate the full template.

</state_file>

<references>

Subagents:
- `discoverer` (Lightweight): external MCP data gathering, codebase analysis, API spec extraction
- `architect` (Full): test requirements specification, gap analysis, test case design
- `engineer` (Full): test implementation, debugging, corrections
- `executor` (Lightweight): optional for mechanical actions (builds, installs)

Skills (compact map — phase → comma-separated skill tags; a backticked name is an ACQUIRE tag — `ACQUIRE <name> FROM KB` at that phase's entry step):
- Cross-phase: `orchestrator-contract`, `coding`, `qa-structure` (paths/identifier/state-file), `qa-knowledge` (taxonomies, redaction scope, artifact skeletons).
- Phase 0: config init owned by Phase 0 via `questioning`.
- Phase 1: `discovery`.
- Phase 2: `reverse-engineering`.
- Phase 3: `requirements-use`, `questioning`.
- Phase 4: `scenarios-generation`, `coding`.
- Phase 5: test-implementation done inline by this phase via `coding` + `testing`. Delegation policy: `qa-flow-test-implementation.md` `<execute_implementation step="5.1">`.
- Phase 6: `debugging`, `sensitive-data` (read-only report-analysis triage, done inline).
- Phase 7: `debugging`, `coding`.

**Rosetta KB:** zero-document ACQUIRE → `<failure_handling>`. `debugging` is invoked ad-hoc during Phase 6 (report analysis) and Phase 7 (corrections); no dedicated workflow file.

MCPs:
- `TestRail` — test case management
- `Jira MCP` — Jira issues + Confluence documentation
- MCP names are illustrative; equivalent configured providers are acceptable when mapped in project config.

</references>

</qa_flow>
