---
name: aqa-flow-test-implementation
description: Phase 6 of AQA workflow - Test Implementation (USER INTERACTION REQUIRED after implementation)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_test_implementation>

<description_and_purpose>
Create automated test integrating all page objects and assertions. Stops for user to execute test.
</description_and_purpose>

<workflow_context>
- Phase 6 of 8 in `aqa-flow`
- Input: complete test plan (all phases), page objects ready
- Output: implemented test file, lint-clean
- Prerequisite: Phases 1-5 complete
- HITL: must stop and wait for user to execute test
</workflow_context>

<phase_steps>
1. Execute test authoring
2. Validate implementation
3. Stop for user test execution
4. Update state
</phase_steps>

<execute_authoring step="6.1" subagent="engineer" role="Test automation engineer">
1. USE SKILL `coding`
2. USE SKILL `testing`
3. ACQUIRE `aqa-test-authoring/SKILL.md` FROM KB and execute
4. Verify test file created and lint-clean
</execute_authoring>

<validate step="6.2">
1. All assertions from Phase 2 implemented
2. Page objects from Phase 5 used correctly
3. User instructions from Phase 3 applied
4. Linting errors checked and fixed
</validate>

<stop_for_execution step="6.3">
1. Inform user test implementation is complete
2. Provide test execution command
3. **STOP AND WAIT** for user to execute test
4. **DO NOT PROCEED** to Phase 7 until user confirms execution complete
</stop_for_execution>

<update_state step="6.4">
1. Update `agents/aqa-state.md`:
   - Test File: [path]
   - Test Name: [name]
   - Assertions Implemented: [count]
   - Page Objects Used: [list]
   - Status: Ready for execution
   - Phase 6 completion timestamp
2. Mark Phase 6 complete (do NOT mark overall AQA as COMPLETE)
</update_state>

<validation_checklist>
- Test file created at determined location
- All assertions from requirements implemented
- Page objects used (no direct selector bypass)
- Project coding standards followed
- Linting passed
- User informed and execution command provided
</validation_checklist>

</aqa_flow_test_implementation>
