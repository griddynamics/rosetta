---
name: aqa-flow
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<aqa_flow>

<description_and_purpose>

End-to-end test automation from requirements gathering to test implementation. Uses test cases, project documentation to create automated tests following existing architecture and coding standards.

</description_and_purpose>

<workflow_phases>

- Rosetta prep steps completed
- MUST FOLLOW THIS WORKFLOW ENTIRELY AND FULLY, ALL PHASES ARE SEQUENTIAL.
- ONE PHASE AT A TIME: Acquire phase file, execute, update state, move to next.
- DO NOT SKIP PHASES: Each builds on previous.
- NO ASSUMPTIONS: Never assume selectors, flows, or data. Always ask the user if information is missing.
- STATE TRACKING: Update `agents/aqa-state.md` after each phase.
- MUST use todo tasks for tracking progress. Prioritize ACCURACY over SPEED.
- If user did not specify preferences, perform all steps except optional.
- User CAN customize: specific phases, already-done phases, specific goals, specific cases — LISTEN and ADOPT.
- Prefer existing files and page objects over creating new ones. Use `project_description.md`, `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md` as source of truth for coding standards.

<data_collection phase="1" applies="ALL" subagent="discoverer" role="AQA data collector">

1. ACQUIRE `aqa-flow-data-collection.md` FROM KB
2. Execute phase instructions.
3. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md`. Output: test plan file created at `agents/plans/aqa-<test-name>.md`
4. Recommended skills: `mcp-testrail-data-collection`, `mcp-confluence-data-collection`
5. Update `agents/aqa-state.md`

</data_collection>

<requirements_clarification phase="2" applies="ALL" subagent="architect" role="Test requirements analyst" type="HITL">

1. ACQUIRE `aqa-flow-requirements-clarification.md` FROM KB
2. Execute phase instructions.
3. Input: user request + collected data from Phase 1. Output: clarified test requirements and scope in test plan file `agents/plans/aqa-<test-name>.md`
4. Recommended skills: `aqa-requirements-elicitation`, `questioning`
5. Update `agents/aqa-state.md`

</requirements_clarification>

<code_analysis phase="3" applies="ALL" subagent="discoverer" role="Test architecture analyst">

1. ACQUIRE `aqa-flow-code-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md` + test plan file `agents/plans/aqa-<test-name>.md`. Output: code analysis report (architecture patterns, existing page objects, test patterns). [TODO define name of the file?]
4. Recommended skills: `aqa-codebase-analysis`
5. Update `agents/aqa-state.md`

</code_analysis>

<selector_identification phase="4" applies="ALL" subagent="engineer" role="Selector identification specialist" type="HITL-CONDITIONAL">

1. ACQUIRE `aqa-flow-selector-identification.md` FROM KB
2. Execute phase instructions.
3. Input: code analysis report + frontend code (or user-provided page source). Output: identified selectors for test targets.
4. **WAIT FOR USER TO PROVIDE PAGE SOURCE** only if frontend code unavailable or selectors not found.
5. Recommended skills: `aqa-selector-management` (Part A)
6. Update `agents/aqa-state.md`

</selector_identification>

<selector_implementation phase="5" applies="ALL" subagent="engineer" role="Selector implementation specialist">

1. ACQUIRE `aqa-flow-selector-implementation.md` FROM KB
2. Execute phase instructions.
3. Input: identified selectors + existing page objects. Output: implemented/updated page object files with selectors.
4. Recommended skills: `aqa-selector-management` (Part B)
5. Update `agents/aqa-state.md`

</selector_implementation>

<test_implementation phase="6" applies="ALL" subagent="engineer" role="Test automation engineer" type="HITL">

1. ACQUIRE `aqa-flow-test-implementation.md` FROM KB
2. Execute phase instructions.
3. Input: page objects + clarified requirements + code analysis report. Output: implemented test files.
4. **STOP AND WAIT** for user to execute test.
5. Recommended skills: `coding`, `testing`, `aqa-test-authoring`
6. Update `agents/aqa-state.md`

</test_implementation>

<test_report_analysis phase="7" applies="ALL" subagent="engineer" role="Test failure analyst" type="HITL">

1. ACQUIRE `aqa-flow-test-report-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: test execution report (user-provided or from `agents/user-instructions/`). Output: failure analysis with root causes and fix recommendations.
4. **WAIT FOR USER TO PROVIDE TEST REPORT** (if not in `agents/user-instructions/`).
5. Recommended skills: `debugging`, `aqa-test-debugging` (Part A)
6. Update `agents/aqa-state.md`

</test_report_analysis>

<test_corrections phase="8" applies="ALL" subagent="engineer" role="Test correction engineer" type="HITL">

1. ACQUIRE `aqa-flow-test-correction.md` FROM KB
2. Execute phase instructions.
3. Input: failure analysis + test files + page objects. Output: corrected test files and page objects.
4. **WAIT FOR USER APPROVAL** before applying changes.
5. Recommended skills: `debugging`, `coding`, `aqa-test-debugging` (Part B)
6. Update `agents/aqa-state.md`

</test_corrections>

</workflow_phases>

<state_file>

Create/update `agents/aqa-state.md` after each phase:

```markdown
# AQA State - <Test Name>

**Last Updated**: [DateTime]
**Current Phase**: [1-8 or COMPLETE]
**TestRail Case**: [Test Case ID/URL]
**Feature**: [Feature Name]

## Phase Completion Status

- [ ] Phase 1: Data Collection
- [ ] Phase 2: Requirements Clarification
- [ ] Phase 3: Code Analysis
- [ ] Phase 4: Selector Identification
- [ ] Phase 5: Selector Implementation
- [ ] Phase 6: Test Implementation
- [ ] Phase 7: Test Report Analysis
- [ ] Phase 8: Test Corrections
```

</state_file>

<references>

Subagents:
- `discoverer` (Lightweight): external MCP data gathering, codebase analysis
- `architect` (Full): test requirements specification and analysis
- `engineer` (Full): selector management, test implementation, debugging, corrections
- `executor` (Lightweight): optional for mechanical actions (builds, installs)

Skills:
- `questioning`, `reverse-engineering`, `coding`, `testing`, `debugging`
- `aqa-requirements-elicitation`, `aqa-codebase-analysis`, `aqa-selector-management`, `aqa-test-authoring`, `aqa-test-debugging`
- `mcp-testrail-data-collection`, `mcp-confluence-data-collection`

MCPs:
- `TestRail` — test case management
- `Atlassian Confluence` — feature documentation
- `Playwright` — browser-based test execution

</references>

</aqa_flow>
