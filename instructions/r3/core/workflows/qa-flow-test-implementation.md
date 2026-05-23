---
name: qa-flow-test-implementation
description: Phase 5 of API QA workflow - API Test Implementation (USER INTERACTION REQUIRED after implementation)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_test_implementation>

<description_and_purpose>
Implement all approved API test specifications as executable automated tests following project standards. Stops for user to execute tests.
</description_and_purpose>

<workflow_context>
- Phase 5 of 8 in `qa-flow`
- Input: approved test specs + existing patterns + API analysis
- Output: implemented test files, lint-clean
- Prerequisite: Phase 4 complete with user approval
- HITL: must stop and wait for user to execute tests
- Implementation handoff (KB tag): `automation-test-implementation-handoff` — routing in step 5.1 follows `<skill_handoff>`.
</workflow_context>

<skill_handoff>
1. If `automation-test-implementation-handoff` is not already in the loaded skill set: ACQUIRE `automation-test-implementation-handoff` FROM KB. If that ACQUIRE returns **zero** documents: stop Phase 5, record the failure in `agents/qa-state.md`, ask the user to fix Rosetta/KB access — **do not** run `<execute_implementation>` steps after this block.
2. USE SKILL `automation-test-implementation-handoff` only.
3. **Delegation policy:** do not USE SKILL or ACQUIRE `coding`, `testing`, `repository-implementation-standards`, or `qa-test-implementation` from this phase file — the handoff delegates to them internally. Step 5.3 remains user test execution only.
</skill_handoff>

<phase_steps>
1. Execute test implementation
2. Validate implementation
3. Stop for user test execution
4. Update state
</phase_steps>

<execute_implementation step="5.1" subagent="engineer" role="API test automation engineer">
1. Execute **all** numbered steps in `<skill_handoff>` in order (ACQUIRE guard, USE handoff skill, respect delegation policy).
2. Verify test files created and lint-clean.
</execute_implementation>

<validate step="5.2">
1. All assertions from Phase 4 specs implemented
2. Existing project patterns followed
3. Auth setup follows project conventions
4. Test data lifecycle managed (create + cleanup)
5. Linting errors checked and fixed
</validate>

<stop_for_execution step="5.3">
1. Inform user test implementation is complete
2. Provide exact test execution command based on project framework
3. **STOP AND WAIT** for user to execute tests
4. **DO NOT PROCEED** to Phase 6 until user confirms execution complete
</stop_for_execution>

<update_state step="5.4">
1. Update `agents/qa-state.md`:
   - Test File(s): [paths]
   - Tests Implemented: [count]
   - Shared Utilities Created: [list]
   - Status: Ready for execution
   - Phase 5 completion timestamp
2. Mark Phase 5 complete (do NOT mark overall API QA as COMPLETE)
</update_state>

<validation_checklist>
- All approved test specifications implemented
- Shared utilities created (auth, factories, validators)
- Tests follow existing project patterns
- All tests isolated and idempotent
- Project coding standards followed
- Linting passed
- User informed and execution command provided
</validation_checklist>

</qa_flow_test_implementation>
