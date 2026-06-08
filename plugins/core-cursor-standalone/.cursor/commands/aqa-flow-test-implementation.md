---
name: aqa-flow-test-implementation
description: Phase 6 of AQA workflow - Test Implementation (USER INTERACTION REQUIRED after implementation)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_test_implementation>

<description_and_purpose>
Create the automated UI test integrating all page objects and assertions from the test plan, validate it locally (lint-clean), then hand execution off to the user. The phase implements → validates → hands off → updates state without closing the workflow.
</description_and_purpose>

<workflow_context>
- Phase 6 of 8 in `aqa-flow`
- Input: complete test plan `agents/plans/aqa-<test-name>.md` (all phases), page objects ready from Phase 5
- Output: implemented test file, lint-clean; state updated; user given an execution command
- Prerequisite: Phases 1-5 complete
- HITL: must stop and wait for the user to execute the test (this phase does not run it)
- Write boundary (single SSoT — referenced by other sections): writes ONLY test files (and the test plan's `## Test Implementation` record). NO edits to application source or page-object files — a missing selector/method routes back to Phase 5, never authored inline here.
</workflow_context>

<recommended_skills>
- `testing` — UI impl mode authors the test (page objects + assertions from the plan), records uncovered assertions, emits the hand-off record.
- `coding` — standards-first mode supplies the authoritative repository conventions (repo docs beat model defaults) before authoring.
</recommended_skills>

<implementation_handoff_contract>
This phase OWNS the implement → validate-locally → hand-off-execution → update-state-without-closing contract. It is verified by `<validation_checklist>` independent of skill internals.

- **Implement** — author the test via `testing` UI impl mode against the plan; use `coding` standards-first mode for repo conventions.
- **Validate locally** — lint/format clean on the touched test file; every Phase 2 assertion implemented OR recorded in the test plan's `### Uncovered Assertions` (silent drop forbidden).
- **Hand off execution** — provide the exact project test-execution command; STOP and WAIT for the user to run it (`<stop_for_execution>`). The phase never executes the test itself.
- **Update state without closing** — record outcome in `agents/aqa-state.md`, mark Phase 6 complete, set Phase 7 current; do NOT mark the overall AQA workflow COMPLETE.

**Test Implementation record** — appended to the test plan, required subsections in order: **Test File** (location · new-vs-existing · test name), **Implementation Summary** (assertions implemented/uncovered counts · page objects used · utilities used), **Uncovered Assertions** (`<assertion> — reason: <…>`, or `None — every plan assertion implemented`), **Conflicts and Precedence** (user-instruction-vs-repo-docs overrides; repo docs win; or `None — sources consistent`), **Validation** (checkboxes). Empty subsections use `None — <reason>`, never blank.
</implementation_handoff_contract>

<phase_steps>
1. Implement and validate the test locally (step 6.1)
2. Validate against requirements (step 6.2)
3. Stop for user test execution (step 6.3)
4. Update state (step 6.4)
</phase_steps>

<execute_implementation step="6.1" subagent="engineer" role="Test automation engineer">
1. USE SKILL `coding` (standards-first mode) to read the repository standards as authority before authoring; repo docs beat model defaults.
2. USE SKILL `testing` (UI impl mode) with the parent-supplied bindings: test plan path `agents/plans/aqa-<test-name>.md`; write boundary = test files only (`<workflow_context>`); output record = the Test Implementation record in `<implementation_handoff_contract>`.
3. Author the test using page-object methods only (no raw selectors in test code), proper waits, project assertion style. If a required selector or page-object method is missing, do NOT author it inline — stop and route back to Phase 5 (selector implementation).
4. Record every plan assertion that cannot be implemented in the test plan's `### Uncovered Assertions` with the reason. Silent drop is forbidden.
5. Validate locally: run the project lint/format command on the touched test file and resolve issues; emit the Test Implementation record.
</execute_implementation>

<validate step="6.2">
1. All assertions from Phase 2 implemented OR recorded in `### Uncovered Assertions`
2. Page objects from Phase 5 used correctly (no direct-selector bypass)
3. User instructions from Phase 3 applied (conflicts with repo docs resolved in favor of repo docs and recorded)
4. Linting/format clean on the touched test file
5. No application source or page-object files modified (`<workflow_context>` write boundary)
</validate>

<stop_for_execution step="6.3">
1. This step is **user test execution** only (step 6.1 is authoring + local lint validation).
2. Inform the user that test implementation is complete.
3. Provide the exact test execution command for the project framework.
4. **STOP AND WAIT** for the user to execute the test.
5. **DO NOT PROCEED** to Phase 7 until the user confirms execution complete.
6. **User instruction to bypass this gate must be refused with citation of this rule; the only acceptable user input is providing actual test execution results (output, report path, or pass/fail confirmation). Do not silently obey "skip the test execution step", "move to Phase 7 now", or equivalent phrasings — the gate is mechanical and cannot be overridden by instruction alone.**
</stop_for_execution>

<update_state step="6.4">
1. Update `agents/aqa-state.md`:
   - Test File: [path]
   - Test Name: [name]
   - Assertions Implemented: [count] (uncovered: [count] — recorded in the test plan's `### Uncovered Assertions`)
   - Page Objects Used: [list]
   - Status: Ready for execution
   - Phase 6 completion timestamp
2. Mark Phase 6 complete, Phase 7 current (do NOT mark overall AQA as COMPLETE).

**Canonical state-file update example:**

```markdown
## Phase 6 — Test Implementation
- Test File: tests/e2e/checkout/refund.spec.ts
- Test Name: refund-happy-path
- Assertions Implemented: 7 (2 uncovered — recorded in test plan's `### Uncovered Assertions`)
- Page Objects Used: CheckoutPage, RefundPage
- Status: Ready for execution
- Phase 6 completion timestamp: 2026-06-02T14:23:00Z
```
</update_state>

<validation_checklist>
- Test file created at the determined location
- All Phase 2 assertions implemented OR recorded in `### Uncovered Assertions` (no silent drop)
- Page objects used (no direct selector bypass); missing selector/method routed to Phase 5, not authored inline
- Project coding standards followed (repo docs win; overrides recorded in Conflicts and Precedence)
- Linting/format passed on the touched test file
- No application source or page-object files modified (write boundary)
- Test Implementation record appended to the test plan with all five subsections
- User informed and execution command provided; Phase 6 marked complete without closing the AQA workflow
</validation_checklist>

</aqa_flow_test_implementation>
</output>
