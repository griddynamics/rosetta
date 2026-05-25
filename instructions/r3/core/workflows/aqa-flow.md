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
- Per-phase cadence: ACQUIRE phase file → execute phase instructions → update `agents/aqa-state.md` → next phase.
- Phases **1–8** run in strict order; do not start a phase until the previous one is marked done in `agents/aqa-state.md`.
- **Orchestration:** when loaded, USE SKILL `sequential-workflow-execution` (ACQUIRE FROM KB when needed) for skip gates and transition prompts; any other skip needs explicit user confirmation (HITL).
- **Missing KB document:** zero-document ACQUIRE for a required dependency → stop, record in `agents/aqa-state.md`, ask the user — do not substitute silently.
- NO ASSUMPTIONS: Never assume selectors, flows, or data. Always ask the user if information is missing.
- STATE TRACKING: Update `agents/aqa-state.md` after each phase.
- MUST use todo tasks for tracking progress. Prioritize ACCURACY over SPEED.
- If user did not specify preferences, perform all steps except optional.
- User CAN customize: specific phases, already-done phases, specific goals, specific cases — LISTEN and ADOPT.
- USE SKILL `repository-implementation-standards` before implementation or correction work that touches repository tests, page objects, or shared helpers (ACQUIRE from KB if needed); it is authoritative for conventions and repository docs win on conflicts with skill snippets.

<data_collection phase="1" applies="ALL" subagent="discoverer" role="AQA data collector">

1. ACQUIRE `aqa-flow-data-collection.md` FROM KB
2. Execute phase instructions.
3. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md`. Output: test plan file created at `agents/plans/aqa-<test-name>.md`
4. Recommended skills: `mcp-testrail-data-collection`, `mcp-confluence-data-collection`, `confluence-source-harvesting`
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
3. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md` + test plan file `agents/plans/aqa-<test-name>.md`. Output: code analysis report at `agents/plans/aqa-<test-name>-code-analysis.md` (architecture patterns, existing page objects, test patterns).
4. Recommended skills: `aqa-codebase-analysis`
5. Update `agents/aqa-state.md`

</code_analysis>

<selector_identification phase="4" applies="ALL" subagent="engineer" role="Selector identification specialist" type="HITL-CONDITIONAL">

1. ACQUIRE `aqa-flow-selector-identification.md` FROM KB
2. Execute phase instructions.
3. Input: code analysis report `agents/plans/aqa-<test-name>-code-analysis.md` + frontend code (or user-provided page source). Output: identified selectors for test targets.
4. **WAIT FOR USER TO PROVIDE PAGE SOURCE** only if frontend code unavailable or selectors not found.
5. Recommended skills: `aqa-selector-management` (Part A)
6. Update `agents/aqa-state.md`

</selector_identification>

<selector_implementation phase="5" applies="ALL" subagent="engineer" role="Selector implementation specialist">

1. ACQUIRE `aqa-flow-selector-implementation.md` FROM KB
2. Execute phase instructions.
3. Input: identified selectors + existing page objects. Output: implemented/updated page object files with selectors.
4. Recommended skills: `aqa-selector-management` (Part B), `repository-implementation-standards`
5. Update `agents/aqa-state.md`

</selector_implementation>

<test_implementation phase="6" applies="ALL" subagent="engineer" role="Test automation engineer" type="HITL">

1. ACQUIRE `aqa-flow-test-implementation.md` FROM KB
2. Execute phase instructions.
3. Input: page objects + clarified requirements + code analysis report `agents/plans/aqa-<test-name>-code-analysis.md`. Output: implemented test files.
4. **STOP AND WAIT** for user to execute test.
5. Recommended skills: `coding`, `testing`, `aqa-test-authoring`, `automation-test-implementation-handoff`
6. Update `agents/aqa-state.md`

</test_implementation>

<test_report_analysis phase="7" applies="ALL" subagent="engineer" role="Test failure analyst" type="HITL">

1. ACQUIRE `aqa-flow-test-report-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: test execution report (user-provided or from `agents/user-instructions/`). Output: failure analysis with root causes and fix recommendations.
4. **WAIT FOR USER TO PROVIDE TEST REPORT** (if not in `agents/user-instructions/`).
5. Recommended skills: `debugging`, `aqa-test-debugging` (Part A), `automation-test-execution-analysis`
6. Update `agents/aqa-state.md`

</test_report_analysis>

<test_corrections phase="8" applies="ALL" subagent="engineer" role="Test correction engineer" type="HITL">

1. ACQUIRE `aqa-flow-test-correction.md` FROM KB
2. Execute phase instructions.
3. Input: failure analysis + test files + page objects. Output: corrected test files and page objects.
4. **WAIT FOR USER APPROVAL** before applying changes. Authoritative approval tokens and presentation rules live in `aqa-flow-test-correction.md` step **8.2**; the tokens listed here are illustrative only, not exhaustive. (Current examples: user must type `approved` or `yes`; emoji-only, silence, off-topic replies, and paraphrases like `ok` / `lgtm` / `go ahead` / `no objections` are not approval unless step 8.2 explicitly allows them.)
5. Recommended skills: `debugging`, `coding`, `aqa-test-debugging` (Part B), `user-approved-code-changes`
6. Update `agents/aqa-state.md`

</test_corrections>

</workflow_phases>

<workflow_success_criteria>
- **Overall run complete** when every negotiated phase is marked done in `agents/aqa-state.md` and the artifacts those phases reference exist (e.g. `agents/plans/aqa-<test-name>.md`, `agents/plans/aqa-<test-name>-code-analysis.md` when Phase 3 ran, test file paths after Phase 6, failure analysis before Phase 8), and the user accepts the last test outcome or explicitly stops.
- **Spot checks:** Phase 1 — plan file exists; Phase 3 — code analysis report path populated with architecture + page object inventory + test location; Phase 6 — test file path + lint-clean per phase doc; Phase 7 — failure analysis recorded; Phase 8 — user-approved edits applied when that phase runs.
</workflow_success_criteria>

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
- **Workflow KB tags (ACQUIRE / USE SKILL by these names):** `sequential-workflow-execution`, `repository-implementation-standards`, `automation-test-implementation-handoff`, `automation-test-execution-analysis`, `user-approved-code-changes`, `confluence-source-harvesting`
- **`sequential-workflow-execution`:** phase ordering, skip/customization gates, and transition prompts for multi-phase runs.
- **`repository-implementation-standards`:** project coding conventions for tests, page objects, and shared helpers — derived from repo docs (`project_description.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`); on conflict, repo docs win.
- `questioning`, `reverse-engineering`, `coding`, `testing`, `debugging`
- `aqa-requirements-elicitation`, `aqa-codebase-analysis`, `aqa-selector-management`, `aqa-test-authoring`, `aqa-test-debugging`
- `mcp-testrail-data-collection`, `mcp-confluence-data-collection`

MCPs:
- `TestRail` — test case management
- `Atlassian Confluence` — feature documentation
- `Playwright` — browser-based test execution

</references>

</aqa_flow>
