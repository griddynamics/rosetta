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
- Implementation handoff (KB tag): `automation-test-implementation-handoff` — routing in step 6.1 follows `<skill_handoff>`.
</workflow_context>

<skill_handoff>
- **Single routing rule for step 6.1:** ACQUIRE `automation-test-implementation-handoff` FROM KB when it is **not** already in the loaded skill set, then USE SKILL `automation-test-implementation-handoff`. Do not USE SKILL or ACQUIRE `coding`, `testing`, `repository-implementation-standards`, or `aqa-test-authoring` from this phase file — the handoff delegates to them internally.

**Handoff completeness (for the USE SKILL step in 6.1, step 4 below):**
- **Acceptable (minimal positive):** the acquired handoff doc contains explicit orchestration — e.g. numbered `ACQUIRE … FROM KB` / `USE SKILL …` lines, or bullets that name **which** of `coding`, `testing`, `aqa-test-authoring`, or related implementation skills run next and in what order.
- **Unacceptable (negative example):** the file is only narrative (goals, context, marketing) with **no** ACQUIRE/USE/delegation lines pointing at implementation, testing, or authoring skills — treat as missing orchestration sections and run the warning path in that same USE SKILL step (6.1 step 4).
</skill_handoff>

<phase_steps>
1. Execute test authoring
2. Validate implementation
3. Stop for user test execution
4. Update state
</phase_steps>

<execute_authoring step="6.1" subagent="engineer" role="Test automation engineer">
1. Follow `<skill_handoff>` for all implementation routing in this step, then continue with ACQUIRE/USE below.
2. ACQUIRE `automation-test-implementation-handoff` FROM KB.
3. If the ACQUIRE in step 2 returned zero documents: stop Phase 6, record the failure in `agents/aqa-state.md`, ask the user to fix Rosetta/KB — **do not run steps 4–5 below.**
4. USE SKILL `automation-test-implementation-handoff`. If the handoff document from step 2 is missing expected orchestration sections (e.g. no clear delegation to implementation/testing/authoring skills), record a warning in `agents/aqa-state.md`, ask the user whether the KB copy is stale or incomplete, and **do not** treat the gap as silently acceptable.
5. Verify test file created and lint-clean
</execute_authoring>

<validate step="6.2">
1. All assertions from Phase 2 implemented
2. Page objects from Phase 5 used correctly
3. User instructions from Phase 3 applied
4. Linting errors checked and fixed
</validate>

<stop_for_execution step="6.3">
1. This step is **user test execution** only (step 6.1 is authoring and lint verification).
2. Inform user test implementation is complete
3. Provide test execution command
4. **STOP AND WAIT** for user to execute test
5. **DO NOT PROCEED** to Phase 7 until user confirms execution complete
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
