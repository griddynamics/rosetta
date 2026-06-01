---
name: qa-flow
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<qa_flow>

<description_and_purpose>

End-to-end backend API test automation from test case input to working automated tests. Uses test case management systems (TestRail, Jira), Swagger/OpenAPI specs, Confluence documentation, and project code to create automated API tests following existing architecture and coding standards.

</description_and_purpose>

<workflow_phases>

- **Phases 0→7 MUST run in order; skipping is permitted only via `<skip_rules>` below.**
- Rosetta prep steps completed
- NO ASSUMPTIONS: Never assume endpoints, payloads, auth mechanisms, or response schemas. Always ask the user if information is missing.
- STATE TRACKING: Update `agents/qa-state.md` after each phase.
- Per-phase cadence: ACQUIRE phase file → execute phase instructions → update `agents/qa-state.md` → move to next phase.
- MUST use todo tasks for tracking progress. Prioritize ACCURACY over SPEED.
<skip_rules>
- **Mandatory order.** Phases **0→7** run sequentially.
- **Skip gate (only exception for phases 0–2).** Treat Phases 0–2 as already done only when all conditions are met: (a) user explicitly says those phases were completed, (b) `agents/qa-state.md` marks them complete, and (c) matching `{IDENTIFIER}` artifacts (at least `raw-data.md` + `api-analysis.md`) exist under `agents/qa/{IDENTIFIER}/`. Independently verify each of (a), (b), (c) by reading `agents/qa-state.md` and listing `agents/qa/{IDENTIFIER}/` artifacts; do not rely solely on user assertion.
- **On verification failure (any of a/b/c not satisfied):** the only correct next action is a one-line announcement of the failing conditions (e.g., `skip-gate refused: (b) agents/qa-state.md absent, (c) artifacts absent → starting at Phase 0`) followed by beginning Phase 0 in the **same turn**, without yielding to user input.
- **At this gate, the agent MUST NOT** (non-exhaustive, applies to all phrasings): call `AskUserQuestion`; present a list / menu / options block; ask the user "how do you want to proceed", "should I start at X", "do you want me to", or any equivalent confirmation request; pause for input before starting Phase 0. The verification result is the decision — there is nothing for the user to confirm.
- The user may later supply the missing state file or artifacts on disk, after which the gate may be re-evaluated. User **instruction** to bypass the gate without supplying the artifacts must be refused with the same one-line announcement and Phase 0 still begins in the same turn.
- **Skip gate example (`agents/qa-state.md`):**
  ```markdown
  - [x] Phase 0: Project Config Loading
  - [x] Phase 1: Data Collection
  - [x] Phase 2: API Spec Analysis
  ```
- **Execution aid.** If the sequencing skill in `<references>` is available, use it for ACQUIRE cadence, todo discipline, and state updates.
</skip_rules>
- If user did not specify preferences, perform all steps except optional.
- User CAN customize: specific phases, already-done phases, specific goals, specific cases — LISTEN and ADOPT.
- USE SKILL `repository-implementation-standards` before implementation or correction work that touches repository test code or shared utilities (if not already loaded: ACQUIRE `repository-implementation-standards` FROM KB).
- **Repository coding standards:** follow `<coding_standards_precedence>`.
- Prefer extending existing test files and utilities over creating new ones.
- **Overall workflow done when:** every phase required for this run is marked complete in `agents/qa-state.md`, expected artifacts for those phases exist under `agents/qa/{IDENTIFIER}/` (and related paths named in phase docs), and the user accepts the last test outcome or explicitly stops the run.

<project_config_loading phase="0" applies="ALL" subagent="discoverer" role="QA project config loader" type="HITL-CONDITIONAL">

1. ACQUIRE `qa-flow-project-config-loading.md` FROM KB
2. Execute phase instructions.
3. Input: user request. Output: project config file, initial data file, session directory at `agents/qa/{IDENTIFIER}/`.
4. **ASK USER FOR PROJECT INFO** if config does not already exist.
5. Recommended skills: see `<references>` (Phase 0)
6. Update `agents/qa-state.md`

</project_config_loading>

<data_collection phase="1" applies="ALL" subagent="discoverer" role="QA data collector">

1. ACQUIRE `qa-flow-data-collection.md` FROM KB
2. Execute phase instructions.
3. Input: project config + initial data. Output: raw data document at `agents/qa/{IDENTIFIER}/raw-data.md` with test cases, documentation, and existing test patterns.
4. Recommended skills: see `<references>` (Phase 1)
5. Update `agents/qa-state.md`

</data_collection>

<api_spec_analysis phase="2" applies="ALL" subagent="discoverer" role="API spec analyst">

1. ACQUIRE `qa-flow-api-spec-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: raw data + project config. Output: API analysis document at `agents/qa/{IDENTIFIER}/api-analysis.md` with endpoint contracts, auth requirements, data dependencies.
4. Recommended skills: see `<references>` (Phase 2)
5. Update `agents/qa-state.md`

</api_spec_analysis>

<gap_and_requirements_clarification phase="3" applies="ALL" subagent="architect" role="API test requirements analyst" type="HITL">

1. ACQUIRE `qa-flow-gap-and-requirements-clarification.md` FROM KB
2. Execute phase instructions.
3. Input: raw data + API analysis. Output: analysis document at `agents/qa/{IDENTIFIER}/analysis.md` with gaps, contradictions, ambiguities resolved.
4. **WAIT FOR USER ANSWERS** before Phase 4.
5. Recommended skills: see `<references>` (Phase 3)
6. Update `agents/qa-state.md`

</gap_and_requirements_clarification>

<test_case_specification phase="4" applies="ALL" subagent="architect" role="API test specification author" type="HITL">

1. ACQUIRE `qa-flow-test-case-specification.md` FROM KB
2. Execute phase instructions.
3. Input: all phase 1-3 outputs. Output: test specifications at `agents/qa/{IDENTIFIER}/test-specs.md` with Given-When-Then scenarios.
4. **WAIT FOR USER APPROVAL** before Phase 5.
5. Recommended skills: see `<references>` (Phase 4)
6. Update `agents/qa-state.md`

</test_case_specification>

<test_implementation phase="5" applies="ALL" subagent="engineer" role="API test automation engineer" type="HITL">

1. ACQUIRE `qa-flow-test-implementation.md` FROM KB
2. Execute phase instructions.
3. Input: approved test specs + existing patterns + API analysis. Output: implemented test files.
4. **STOP AND WAIT** for user to execute tests.
5. Recommended skills: see `<references>` (Phase 5)
6. Update `agents/qa-state.md`

</test_implementation>

<execution_and_report_analysis phase="6" applies="ALL" subagent="engineer" role="API test failure analyst" type="HITL">

1. ACQUIRE `qa-flow-execution-and-report-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: test execution report (user-provided or from `agents/user-instructions/`). Output: execution report at `agents/qa/{IDENTIFIER}/execution-report.md` with failure analysis.
4. **WAIT FOR USER TO PROVIDE TEST EXECUTION RESULTS**.
5. Recommended skills: see `<references>` (Phase 6)
6. Update `agents/qa-state.md`

</execution_and_report_analysis>

<test_corrections phase="7" applies="ALL" subagent="engineer" role="API test correction engineer" type="HITL">

1. ACQUIRE `qa-flow-test-correction.md` FROM KB
2. Execute phase instructions.
3. Input: execution report + test files + test specs. Output: corrected test files.
4. **WAIT FOR USER APPROVAL** before applying changes.
5. Recommended skills: see `<references>` (Phase 7)
6. Update `agents/qa-state.md`

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
