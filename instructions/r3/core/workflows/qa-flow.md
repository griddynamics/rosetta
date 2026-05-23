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

- Rosetta prep steps completed
- USE SKILL `sequential-workflow-execution` — enforce one phase at a time, ACQUIRE each phase doc before work, update `agents/qa-state.md` and todos; see skill for skip/customization gates.
- MUST FOLLOW THIS WORKFLOW ENTIRELY AND FULLY, ALL PHASES ARE SEQUENTIAL.
- ONE PHASE AT A TIME: Acquire phase file, execute, update state, move to next.
- DO NOT SKIP PHASES: Each builds on previous.
<skip_rules>
- **Skip / customization:** only through gates documented in `sequential-workflow-execution` (ACQUIRE from KB if needed).
- **Allowed:** user says Phases 0–2 were done earlier and `agents/qa-state.md` plus `agents/qa/{IDENTIFIER}/` artifacts back it up — then honor that skill’s skip rules only.
- **Forbidden:** skipping Phase 3 (gap/spec) to save time without user agreement and without those gates.
</skip_rules>
- NO ASSUMPTIONS: Never assume endpoints, payloads, auth mechanisms, or response schemas. Always ask the user if information is missing.
- STATE TRACKING: Update `agents/qa-state.md` after each phase.
- MUST use todo tasks for tracking progress. Prioritize ACCURACY over SPEED.
- If user did not specify preferences, perform all steps except optional.
- User CAN customize: specific phases, already-done phases, specific goals, specific cases — LISTEN and ADOPT.
- USE SKILL `repository-implementation-standards` before implementation or correction work that touches repository test code or shared utilities (ACQUIRE from KB if needed).
- Treat `project_description.md`, `CONTEXT.md`, `ARCHITECTURE.md`, and `IMPLEMENTATION.md` as source of truth for coding standards together with `repository-implementation-standards`.
<coding_standards_precedence>
- **On conflict:** repository documents win; use `repository-implementation-standards` to apply conventions, never to contradict those files.
- **Example:** `IMPLEMENTATION.md` mandates an error shape → follow it over a looser generic pattern from the skill.
- **Forbidden:** changing an explicit `ARCHITECTURE.md` auth flow because a generic skill snippet is shorter.
</coding_standards_precedence>
- Prefer extending existing test files and utilities over creating new ones.
- **Overall workflow done when:** every phase required for this run is marked complete in `agents/qa-state.md`, expected artifacts for those phases exist under `agents/qa/{IDENTIFIER}/` (and related paths named in phase docs), and the user accepts the last test outcome or explicitly stops the run.
<failure_handling>
- If ACQUIRE for a required phase instruction returns **zero** documents: stop, record the gap in `agents/qa-state.md`, ask the user to fix Rosetta/KB — do not substitute an undocumented prompt.
- If a **prior-phase artifact** is missing when a later phase needs it (e.g. `raw-data.md`, `api-analysis.md`, `test-specs.md`): do not fabricate it; with user agreement re-run the producing phase, or stop and ask the user to restore or generate the file.
- If `agents/qa-state.md` is **missing or unreadable**: pause, rebuild minimal phase pointers from existing files under `agents/qa/{IDENTIFIER}/` when possible, then ask the user to confirm before continuing.
</failure_handling>

<project_config_loading phase="0" applies="ALL" subagent="discoverer" role="API QA project config loader" type="HITL-CONDITIONAL">

1. ACQUIRE `qa-flow-project-config-loading.md` FROM KB
2. Execute phase instructions.
3. Input: user request. Output: project config file, initial data file, session directory at `agents/qa/{IDENTIFIER}/`.
4. **ASK USER FOR PROJECT INFO** if config does not already exist.
5. Recommended skills: `qa-project-config`
6. Update `agents/qa-state.md`

</project_config_loading>

<data_collection phase="1" applies="ALL" subagent="discoverer" role="API QA data collector">

1. ACQUIRE `qa-flow-data-collection.md` FROM KB
2. Execute phase instructions.
3. Input: project config + initial data. Output: raw data document at `agents/qa/{IDENTIFIER}/raw-data.md` with test cases, documentation, and existing test patterns.
4. Recommended skills: `qa-data-collection`, `confluence-source-harvesting` (when a documentation MCP path is collected per project config)
5. Update `agents/qa-state.md`

</data_collection>

<api_spec_analysis phase="2" applies="ALL" subagent="discoverer" role="API spec analyst">

1. ACQUIRE `qa-flow-api-spec-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: raw data + project config. Output: API analysis document at `agents/qa/{IDENTIFIER}/api-analysis.md` with endpoint contracts, auth requirements, data dependencies.
4. Recommended skills: `swagger-contracts-analysis`
5. Update `agents/qa-state.md`

</api_spec_analysis>

<gap_and_requirements_clarification phase="3" applies="ALL" subagent="architect" role="API test requirements analyst" type="HITL">

1. ACQUIRE `qa-flow-gap-and-requirements-clarification.md` FROM KB
2. Execute phase instructions.
3. Input: raw data + API analysis. Output: analysis document at `agents/qa/{IDENTIFIER}/analysis.md` with gaps, contradictions, ambiguities resolved.
4. **WAIT FOR USER ANSWERS** before Phase 4.
5. Recommended skills: `qa-gap-analysis`, `gap-and-contradiction-analysis`, `aqa-requirements-elicitation`, `questioning`
6. Update `agents/qa-state.md`

</gap_and_requirements_clarification>

<test_case_specification phase="4" applies="ALL" subagent="architect" role="API test specification author" type="HITL">

1. ACQUIRE `qa-flow-test-case-specification.md` FROM KB
2. Execute phase instructions.
3. Input: all phase 1-3 outputs. Output: test specifications at `agents/qa/{IDENTIFIER}/test-specs.md` with Given-When-Then scenarios.
4. **WAIT FOR USER APPROVAL** before Phase 5.
5. Recommended skills: `api-test-spec-authoring`, `repository-implementation-standards`
6. Update `agents/qa-state.md`

</test_case_specification>

<test_implementation phase="5" applies="ALL" subagent="engineer" role="API test automation engineer" type="HITL">

1. ACQUIRE `qa-flow-test-implementation.md` FROM KB
2. Execute phase instructions.
3. Input: approved test specs + existing patterns + API analysis. Output: implemented test files.
4. **STOP AND WAIT** for user to execute tests.
5. Recommended skills: `coding`, `testing`, `qa-test-implementation`, `automation-test-implementation-handoff`
6. Update `agents/qa-state.md`

</test_implementation>

<execution_and_report_analysis phase="6" applies="ALL" subagent="engineer" role="API test failure analyst" type="HITL">

1. ACQUIRE `qa-flow-execution-and-report-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: test execution report (user-provided or from `agents/user-instructions/`). Output: execution report at `agents/qa/{IDENTIFIER}/execution-report.md` with failure analysis.
4. **WAIT FOR USER TO PROVIDE TEST EXECUTION RESULTS**.
5. Recommended skills: `debugging`, `qa-test-debugging` (Part A), `automation-test-execution-analysis`
6. Update `agents/qa-state.md`

</execution_and_report_analysis>

<test_corrections phase="7" applies="ALL" subagent="engineer" role="API test correction engineer" type="HITL">

1. ACQUIRE `qa-flow-test-correction.md` FROM KB
2. Execute phase instructions.
3. Input: execution report + test files + test specs. Output: corrected test files.
4. **WAIT FOR USER APPROVAL** before applying changes.
5. Recommended skills: `debugging`, `coding`, `qa-test-debugging` (Part B), `user-approved-code-changes`
6. Update `agents/qa-state.md`

</test_corrections>

</workflow_phases>

<state_file>

Create/update `agents/qa-state.md` after each phase:

```markdown
# API QA State - <Test Name / Feature>

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
- `questioning`, `coding`, `testing`, `debugging`
- `sequential-workflow-execution`, `repository-implementation-standards`, `automation-test-implementation-handoff`, `automation-test-execution-analysis`, `user-approved-code-changes`, `confluence-source-harvesting`
- `qa-project-config`, `qa-data-collection`, `swagger-contracts-analysis`, `qa-gap-analysis`, `api-test-spec-authoring`, `qa-test-implementation`, `qa-test-debugging`
- `aqa-requirements-elicitation`, `gap-and-contradiction-analysis`

**Rosetta KB:** Each backticked name is a KB ACQUIRE tag (`ACQUIRE <name> FROM KB`) for the canonical skill document shipped with Rosetta for this release. If ACQUIRE returns zero documents, follow `<failure_handling>` in `<workflow_phases>` — do not substitute an undocumented skill.

Note: `qa-test-debugging` is a standalone ad-hoc skill (no dedicated workflow file). It is invoked on-demand during Phase 6 (failure analysis) and Phase 7 (corrections).

MCPs:
- `TestRail` — test case management
- `Jira MCP` — Jira issues + Confluence documentation

</references>

</qa_flow>
