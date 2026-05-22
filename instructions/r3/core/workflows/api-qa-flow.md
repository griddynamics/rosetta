---
name: api-qa-flow
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<api_qa_flow>

<description_and_purpose>

End-to-end backend API test automation from test case input to working automated tests. Uses test case management systems (TestRail, Jira), Swagger/OpenAPI specs, Confluence documentation, and project code to create automated API tests following existing architecture and coding standards.

</description_and_purpose>

<workflow_phases>

- Rosetta prep steps completed
- MUST FOLLOW THIS WORKFLOW ENTIRELY AND FULLY, ALL PHASES ARE SEQUENTIAL.
- ONE PHASE AT A TIME: Acquire phase file, execute, update state, move to next.
- DO NOT SKIP PHASES: Each builds on previous.
- NO ASSUMPTIONS: Never assume endpoints, payloads, auth mechanisms, or response schemas. Always ask the user if information is missing.
- STATE TRACKING: Update `agents/api-qa-state.md` after each phase.
- MUST use todo tasks for tracking progress. Prioritize ACCURACY over SPEED.
- If user did not specify preferences, perform all steps except optional.
- User CAN customize: specific phases, already-done phases, specific goals, specific cases — LISTEN and ADOPT.
- Prefer existing test files and utilities over creating new ones. Use `project_description.md`, `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md` as source of truth for coding standards.

<project_config_loading phase="0" applies="ALL" subagent="discoverer" role="API QA project config loader" type="HITL-CONDITIONAL">

1. ACQUIRE `api-qa-flow-project-config-loading.md` FROM KB
2. Execute phase instructions.
3. Input: user request. Output: project config file, initial data file, session directory at `agents/api-qa/{IDENTIFIER}/`.
4. **ASK USER FOR PROJECT INFO** if config does not already exist.
5. Recommended skills: `api-qa-project-config`
6. Update `agents/api-qa-state.md`

</project_config_loading>

<data_collection phase="1" applies="ALL" subagent="discoverer" role="API QA data collector">

1. ACQUIRE `api-qa-flow-data-collection.md` FROM KB
2. Execute phase instructions.
3. Input: project config + initial data. Output: raw data document at `agents/api-qa/{IDENTIFIER}/raw-data.md` with test cases, documentation, and existing test patterns.
4. Recommended skills: `api-qa-data-collection`
5. Update `agents/api-qa-state.md`

</data_collection>

<api_spec_analysis phase="2" applies="ALL" subagent="discoverer" role="API spec analyst">

1. ACQUIRE `api-qa-flow-api-spec-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: raw data + project config. Output: API analysis document at `agents/api-qa/{IDENTIFIER}/api-analysis.md` with endpoint contracts, auth requirements, data dependencies.
4. Recommended skills: `swagger-contracts-analysis`
5. Update `agents/api-qa-state.md`

</api_spec_analysis>

<gap_and_requirements_clarification phase="3" applies="ALL" subagent="architect" role="API test requirements analyst" type="HITL">

1. ACQUIRE `api-qa-flow-gap-and-requirements-clarification.md` FROM KB
2. Execute phase instructions.
3. Input: raw data + API analysis. Output: analysis document at `agents/api-qa/{IDENTIFIER}/analysis.md` with gaps, contradictions, ambiguities resolved.
4. **WAIT FOR USER ANSWERS** before Phase 4.
5. Recommended skills: `api-qa-gap-analysis`, `gap-and-contradiction-analysis`, `aqa-requirements-elicitation`, `questioning`
6. Update `agents/api-qa-state.md`

</gap_and_requirements_clarification>

<test_case_specification phase="4" applies="ALL" subagent="architect" role="API test specification author" type="HITL">

1. ACQUIRE `api-qa-flow-test-case-specification.md` FROM KB
2. Execute phase instructions.
3. Input: all phase 1-3 outputs. Output: test specifications at `agents/api-qa/{IDENTIFIER}/test-specs.md` with Given-When-Then scenarios.
4. **WAIT FOR USER APPROVAL** before Phase 5.
5. Recommended skills: `api-test-spec-authoring`
6. Update `agents/api-qa-state.md`

</test_case_specification>

<test_implementation phase="5" applies="ALL" subagent="engineer" role="API test automation engineer" type="HITL">

1. ACQUIRE `api-qa-flow-test-implementation.md` FROM KB
2. Execute phase instructions.
3. Input: approved test specs + existing patterns + API analysis. Output: implemented test files.
4. **STOP AND WAIT** for user to execute tests.
5. Recommended skills: `coding`, `testing`, `api-qa-test-implementation`
6. Update `agents/api-qa-state.md`

</test_implementation>

<execution_and_report_analysis phase="6" applies="ALL" subagent="engineer" role="API test failure analyst" type="HITL">

1. ACQUIRE `api-qa-flow-execution-and-report-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: test execution report (user-provided or from `agents/user-instructions/`). Output: execution report at `agents/api-qa/{IDENTIFIER}/execution-report.md` with failure analysis.
4. **WAIT FOR USER TO PROVIDE TEST EXECUTION RESULTS**.
5. Recommended skills: `debugging`, `api-qa-test-debugging` (Part A)
6. Update `agents/api-qa-state.md`

</execution_and_report_analysis>

<test_corrections phase="7" applies="ALL" subagent="engineer" role="API test correction engineer" type="HITL">

1. ACQUIRE `api-qa-flow-test-correction.md` FROM KB
2. Execute phase instructions.
3. Input: execution report + test files + test specs. Output: corrected test files.
4. **WAIT FOR USER APPROVAL** before applying changes.
5. Recommended skills: `debugging`, `coding`, `api-qa-test-debugging` (Part B)
6. Update `agents/api-qa-state.md`

</test_corrections>

</workflow_phases>

<state_file>

Create/update `agents/api-qa-state.md` after each phase:

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
- `api-qa-project-config`, `api-qa-data-collection`, `swagger-contracts-analysis`, `api-qa-gap-analysis`, `api-test-spec-authoring`, `api-qa-test-implementation`, `api-qa-test-debugging`
- `aqa-requirements-elicitation`, `gap-and-contradiction-analysis`

Note: `api-qa-test-debugging` is a standalone ad-hoc skill (no dedicated workflow file). It is invoked on-demand during Phase 6 (failure analysis) and Phase 7 (corrections).

MCPs:
- `TestRail` — test case management
- `Jira MCP` — Jira issues + Confluence documentation

</references>

</api_qa_flow>
