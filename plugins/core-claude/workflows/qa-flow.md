---
name: qa-flow
description: MUST apply when a backend API test-automation task is assigned (e.g. user asks to write API tests, automate endpoints from a TestRail / Jira test case, add coverage for a REST/GraphQL service, extend a pytest / Jest / JUnit / RestAssured / SuperTest API suite, debug or correct failing API tests). End-to-end backend API test automation from test case input through API-spec analysis, requirements clarification, test specification, implementation, execution, and corrections — uses TestRail / Jira test cases, Swagger/OpenAPI specs, Confluence documentation, and project code to produce automated tests aligned with existing architecture and standards.
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<qa_flow>

<description_and_purpose>

End-to-end backend API test automation from test case input to working automated tests. (Source-system + tool enumeration owned by the frontmatter `description` field — not restated here.)

</description_and_purpose>

<workflow_phases>

- **Phases 0→7 MUST run in order** (single source of truth for the ordering rule; `<skip_rules>` references this, does not restate). Skipping is permitted only via `<skip_rules>` below.
- Rosetta prep steps completed
- NO ASSUMPTIONS: Never assume endpoints, payloads, auth mechanisms, or response schemas. Always ask the user if information is missing.
- STATE TRACKING: Update `agents/qa-state.md` after each phase.
- MUST use todo tasks for tracking progress. Prioritize ACCURACY over SPEED.

<phase_template>
Every phase block below follows this cadence (read once; each block specifies only its deltas):

1. ACQUIRE the named phase file FROM KB
2. Execute phase instructions
3. Apply the Input / Output paths declared in the per-phase block
4. Honor any HITL gate declared in the per-phase block (text + timing)
5. Recommended skills: see `<references>` (Phase N)
6. Update `agents/qa-state.md`

If a block omits a row (e.g. no HITL gate), the corresponding template step is skipped for that phase.
</phase_template>

<skip_rules>

- Ordering rule per `<workflow_phases>` preamble (sequential 0→7); this block governs sanctioned skips only.

- **Always-in-force carve-outs** (the override below NEVER suppresses these, read once):
  1. **Per-phase HITL gates** (Phases 3, 4, 5, 6, 7 marked `type="HITL"`) require explicit user approval per `bootstrap-hitl-questioning` at their normal trigger points.
  2. **NO ASSUMPTIONS rule** (above) governs every decision that is not this skip-verification gate.
  3. **Safety / destructive confirmations** — file deletion, repository edits outside `agents/qa/{IDENTIFIER}/`, comparable irreversible actions.

- **Verification-failure unilateral-start override** — subordinate to `bootstrap-hitl-questioning` policy + the carve-outs above; the only sanctioned no-ask deviation from per-phase HITL, applies only at this skip-verification gate.

  | Precondition (ALL must be true, independently verified — not user assertion alone) | Action |
  |---|---|
  | (a) user asserts Phases 0–2 complete this turn **AND** (b) `agents/qa-state.md` marks them complete **AND** (c) matching `{IDENTIFIER}` artifacts (at least `raw-data.md` + `api-analysis.md`) exist under `agents/qa/{IDENTIFIER}/` | Skip Phases 0–2, resume at Phase 3. |
  | Any of (a)/(b)/(c) is false AND the user's instruction was unambiguous | Print one line naming the failing conditions (e.g., `skip-gate refused: (b) state absent, (c) artifacts absent → starting at Phase 0`); begin Phase 0 in the **same turn**. (Evidence-driven start, not refusing the user — verification result IS the decision; asking again would loop until artifacts exist.) |
  | Any precondition is uncertain or partial (state partial, assertion ambiguous, artifacts stale) | Fall back to normal HITL ask. **Ambiguity defaults to ASK.** |

- **Execution aid.** If the sequencing skill in `<references>` is available, use it for ACQUIRE cadence, todo discipline, and state updates.

</skip_rules>
- If user did not specify preferences, perform all steps except optional.
- User CAN customize: specific phases, already-done phases, specific goals, specific cases — LISTEN and ADOPT.
- USE SKILL `repository-implementation-standards` before implementation or correction work that touches repository test code or shared utilities (if not already loaded: ACQUIRE `repository-implementation-standards` FROM KB).
- **Repository coding standards:** follow `<coding_standards_precedence>`.
- Prefer extending existing test files and utilities over creating new ones.
- **Overall workflow done when:** every phase required for this run is marked complete in `agents/qa-state.md`, expected artifacts for those phases exist under `agents/qa/{IDENTIFIER}/` (and related paths named in phase docs), and the user accepts the last test outcome or explicitly stops the run.

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

<gap_and_requirements_clarification phase="3" applies="ALL" subagent="architect" role="API test requirements analyst" type="HITL">
- Phase file: `qa-flow-gap-and-requirements-clarification.md`
- Input: raw data + API analysis. Output: `agents/qa/{IDENTIFIER}/analysis.md` (gaps, contradictions, ambiguities resolved).
- HITL gate: **WAIT FOR USER ANSWERS** before Phase 4.
</gap_and_requirements_clarification>

<test_case_specification phase="4" applies="ALL" subagent="architect" role="API test specification author" type="HITL">
- Phase file: `qa-flow-test-case-specification.md`
- Input: all phase 1-3 outputs. Output: `agents/qa/{IDENTIFIER}/test-specs.md` (Given-When-Then scenarios).
- HITL gate: **WAIT FOR USER APPROVAL** before Phase 5.
</test_case_specification>

<test_implementation phase="5" applies="ALL" subagent="engineer" role="API test automation engineer" type="HITL">
- Phase file: `qa-flow-test-implementation.md`
- Input: approved test specs + existing patterns + API analysis. Output: implemented test files.
- HITL gate: **STOP AND WAIT** for user to execute tests.
</test_implementation>

<execution_and_report_analysis phase="6" applies="ALL" subagent="engineer" role="API test failure analyst" type="HITL">
- Phase file: `qa-flow-execution-and-report-analysis.md`
- Input: test execution report (user-provided or from `agents/user-instructions/`). Output: `agents/qa/{IDENTIFIER}/execution-report.md` (failure analysis).
- HITL gate: **WAIT FOR USER TO PROVIDE TEST EXECUTION RESULTS**.
</execution_and_report_analysis>

<test_corrections phase="7" applies="ALL" subagent="engineer" role="API test correction engineer" type="HITL">
- Phase file: `qa-flow-test-correction.md`
- Input: execution report + test files + test specs. Output: corrected test files.
- HITL gate: **WAIT FOR USER APPROVAL** before applying changes.
</test_corrections>

</workflow_phases>

<coding_standards_precedence>
Conflict rule is binary: if guidance from a loaded skill conflicts with repository markdown (`project_description.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`) on naming, structure/layout, tooling, or test patterns, repository markdown wins and the conflicting skill snippet is ignored for that decision. If there is no conflict, apply both.
Example: if a skill suggests `/tests/api/` but `ARCHITECTURE.md` requires `/qa/api/tests/`, use `/qa/api/tests/`.
</coding_standards_precedence>

<failure_handling>
- **Zero-doc ACQUIRE** for a required phase workflow: stop, record in `agents/qa-state.md`, ask the user — no undocumented prompts (see also `sequential-workflow-execution` skill when loaded).
- **Missing prior artifact:** do not fabricate; with user agreement re-run the producing phase, or stop and ask the user to restore it.
- **Unreadable `agents/qa-state.md`:** pause, rebuild minimal phase pointers from `agents/qa/{IDENTIFIER}/` when possible, then ask the user to confirm.
- **State-note example (zero-doc ACQUIRE):** `Phase 5 blocked: ACQUIRE automation-test-implementation-handoff returned zero documents at 2026-05-25T15:00Z; awaiting user action.`
</failure_handling>

<state_file>

Create/update `agents/qa-state.md` after each phase:

```markdown
# QA State - <Test Name / Feature>

**Last Updated**: [DateTime]
**Current Phase**: [0-7 or COMPLETE]
**Test Case Source**: [TestRail ID / Jira Ticket / Manual]
**Feature**: [Feature Name]
**API Base URL**: [Base URL if known]

## Phase Completion Status

- [ ] Phase 0: Project Config Loading
- [ ] Phase 1: Data Collection
- [ ] Phase 2: API Spec Analysis
- [ ] Phase 3: Gap & Requirements Clarification
- [ ] Phase 4: Test Case Specification
- [ ] Phase 5: Test Implementation
- [ ] Phase 6: Execution & Report Analysis
- [ ] Phase 7: Test Corrections
```

</state_file>

<references>

Subagents:
- `discoverer` (Lightweight): external MCP data gathering, codebase analysis, API spec extraction
- `architect` (Full): test requirements specification, gap analysis, test case design
- `engineer` (Full): test implementation, debugging, corrections
- `executor` (Lightweight): optional for mechanical actions (builds, installs)

Skills:
- Cross-phase orchestration: `sequential-workflow-execution`
- Repository standards: `repository-implementation-standards`
- Phase-recommended skills (canonical list):
  - Phase 0: `qa-project-config`
  - Phase 1: `qa-data-collection`, `confluence-source-harvesting` (when documentation MCP is in scope)
  - Phase 2: `swagger-contracts-analysis`
  - Phase 3: `qa-gap-analysis`, `gap-and-contradiction-analysis`, `aqa-requirements-elicitation`, `questioning`
  - Phase 4: `api-test-spec-authoring`, `repository-implementation-standards`
  - Phase 5: `automation-test-implementation-handoff` (primary entrypoint). Reachable only via the handoff (do not ACQUIRE/USE directly from the phase file): `coding`, `testing`, `qa-test-implementation`. See `qa-flow-test-implementation.md` step 5.1.4 delegation policy.
  - Phase 6: `debugging`, `qa-test-debugging` (Part A), `automation-test-execution-analysis`
  - Phase 7: `debugging`, `coding`, `qa-test-debugging` (Part B), `user-approved-code-changes`

**Rosetta KB:** Backticked names are ACQUIRE tags; if ACQUIRE returns zero documents, follow `<failure_handling>`.
All backticked skill names in this file are expected to resolve as valid KB tags at runtime.

Note: `qa-test-debugging` is a standalone ad-hoc skill (no dedicated workflow file). It is invoked on-demand during Phase 6 (failure analysis) and Phase 7 (corrections).

MCPs:
- `TestRail` — test case management
- `Jira MCP` — Jira issues + Confluence documentation
- MCP names are illustrative; equivalent configured providers are acceptable when mapped in project config.

</references>

</qa_flow>
