---
name: aqa-flow
description: MUST apply when an automated QA / UI test-automation task is assigned (e.g. user asks to write automation tests, add E2E coverage, fix failing automation, extend a Playwright/Selenium/Cypress suite, debug a flaky UI test). End-to-end orchestration from requirements gathering through test implementation, execution analysis, and correction.
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<aqa_flow>

<description_and_purpose>

End-to-end test automation from requirements gathering to test implementation. Uses test cases, project documentation to create automated tests following existing architecture and coding standards.

</description_and_purpose>

<workflow_phases>

- Rosetta prep steps completed
- You MUST execute every in-scope phase in strict 1-8 order (never skip without explicit HITL confirmation) using this cadence: ACQUIRE phase file → execute phase instructions → update `agents/aqa-state.md` → next phase; do not start a phase until the previous one is marked done in `agents/aqa-state.md`.
- **Orchestration and escalation:** follow `<orchestration_and_escalation>`.
- NO ASSUMPTIONS: Never assume selectors, flows, or data. Always ask the user if information is missing.
- STATE TRACKING: Update `agents/aqa-state.md` after each phase.
- MUST use todo tasks for tracking progress. Prioritize ACCURACY over SPEED.
- If user did not specify preferences, perform all steps except optional.
- User CAN customize: specific phases, already-done phases, specific goals, specific cases — LISTEN and ADOPT.
- USE SKILL `repository-implementation-standards` before implementation or correction work that touches repository tests, page objects, or shared helpers (ACQUIRE from KB if needed); it is authoritative for conventions and repository docs win on conflicts with skill snippets.
- Default behavior: reuse existing page objects/tests first, and create new files only when no suitable match exists.

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
4. **WAIT FOR USER APPROVAL** before applying changes; authoritative approval tokens and presentation rules are defined in `aqa-flow-test-correction.md` section `<present_for_approval>`.
5. Recommended skills: `debugging`, `coding`, `aqa-test-debugging` (Part B), `user-approved-code-changes`
6. Update `agents/aqa-state.md`

</test_corrections>

</workflow_phases>

<orchestration_and_escalation>
- USE SKILL `sequential-workflow-execution` (ACQUIRE FROM KB when needed) for skip gates, transition prompts, and the **falsified-skip-claim handling** (its step 10 owns trigger / action / forbidden-at-gate / acceptable-input + announcement format — single canonical home; subordinate to `bootstrap-hitl-questioning`). This workflow does NOT restate that logic.
- **AQA-specific binding for step 10:** state file = `agents/aqa-state.md`; verification artifacts = the spot-checks in `<workflow_success_criteria>`; carve-outs that remain in force = **every phase header carrying `type="HITL"` or `type="HITL-CONDITIONAL"`** (canonical source: the `type=` attributes on the `<workflow_phases>` elements — currently Phases 2, 4, 6, 7, 8) + safety/destructive confirmations + zero-document ACQUIRE (stop + record + ask).
- Audit-trail row written to `agents/aqa-state.md` `## Verification-Failure Overrides` per the state-file template below — step 10 of `sequential-workflow-execution` defines when and what to log.
- Any skip outside `sequential-workflow-execution` gates requires explicit user confirmation (HITL).
- Zero-document ACQUIRE for a required dependency: stop, record in `agents/aqa-state.md`, ask the user; never substitute silently.
</orchestration_and_escalation>

<workflow_success_criteria>
- **Overall run complete** when every in-scope phase is marked done in `agents/aqa-state.md` and the artifacts those phases reference exist (e.g. `agents/plans/aqa-<test-name>.md`, `agents/plans/aqa-<test-name>-code-analysis.md` when Phase 3 ran, test file paths after Phase 6, failure analysis before Phase 8), and the user accepts the last test outcome or explicitly stops.
- **In-scope phase** means any phase required by default execution plus user-approved customization/skip decisions under `<orchestration_and_escalation>`.
- **Spot checks:** Phase 1 — plan file exists; Phase 3 — code analysis report path populated with architecture + page object inventory + test location; Phase 6 — test file path + lint-clean per phase doc (example: `tests/e2e/login.spec.ts` exists and lint passes as required by `aqa-flow-test-implementation.md`); Phase 7 — failure analysis recorded; Phase 8 — user-approved edits applied when that phase runs.
- If a required spot-check artifact is missing or partial, that phase is not done: record the gap in `agents/aqa-state.md`, flag uncertainty, and stop for user guidance before continuing.
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

## Verification-Failure Overrides

[Append a row each time the `<orchestration_and_escalation>` verification-failure unilateral-start override fires. If never fired, write: `None — no overrides applied.`]

- **[ISO timestamp]** — User asserted phases complete: `[user's verbatim claim]`. Failing conditions: `[which preconditions were unmet — state row missing / spot-check artifact absent / etc.]`. Phase started: `[earliest incomplete phase id]`.
```

</state_file>

<references>

Logical names only — full descriptions live where each is consumed (subagent contracts in `orchestrator-contract` skill, skill semantics in each skill's `SKILL.md`, MCP setup in workspace config).

**Subagents:** `discoverer` · `architect` · `engineer` · `executor`.

**Skills:** `sequential-workflow-execution` · `repository-implementation-standards` · `automation-test-implementation-handoff` · `automation-test-execution-analysis` · `user-approved-code-changes` · `confluence-source-harvesting` · `questioning` · `coding` · `testing` · `debugging` · `aqa-requirements-elicitation` · `aqa-codebase-analysis` · `aqa-selector-management` · `aqa-test-authoring` · `aqa-test-debugging` · `mcp-testrail-data-collection` · `mcp-confluence-data-collection`.

**MCPs:** Test case management (default: `TestRail`) · Documentation (default: `Atlassian Confluence`) · Browser automation (default: `Playwright`).

</references>

</aqa_flow>
