---
name: aqa-flow-requirements-clarification
description: Phase 2 of AQA workflow - Requirements Clarification and Assertion Definition (USER INTERACTION REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_requirements_clarification>

<description_and_purpose>
Fill gaps in understanding, clarify unknowns. Requires user interaction.
</description_and_purpose>

<workflow_context>
- Phase 2 of 8 in `aqa-flow`
- Input: test plan file `agents/plans/aqa-<test-name>.md` from Phase 1
- Output: user answers, updated test plan
- Prerequisite: Phase 1 complete
- HITL: user answers required before Phase 3
</workflow_context>

<phase_steps>
1. Identify gaps in test case understanding → step 2.1
2. Ask user for clarification → step 2.2
3. Wait for user answers → step 2.3
4. Update test plan file `agents/plans/aqa-<test-name>.md` according to user answers → step 2.4
5. Document and update state → step 2.5
</phase_steps>

<identify_gaps step="2.1">
1. USE SKILL `aqa-requirements-elicitation`
2. Prepare a list of unknowns and ambiguities
</identify_gaps>

<ask_questions step="2.2">
1. USE SKILL `questioning`
2. Present structured questions to user

<user_interaction_format>
```
I need clarification on the following to ensure accurate test implementation:

## Critical Questions (Must Answer)
1. [Question]
2. [Question]
...

## Edge Cases (Should Answer)
1. [Question]
2. [Question]
...

## Optional Details (Nice to Have)
1. [Question]
2. [Question]
...

Please provide answers so I can proceed with test implementation.
```
</user_interaction_format>
</ask_questions>


<wait_for_user step="2.3">
1. **STOP AND WAIT** for user to provide all answers
</wait_for_user>

<update_test_plan step="2.4">
1. Process user answers
2. Add new section to test plan file `agents/plans/aqa-<test-name>.md` according to clarifications from user according to the format:
```markdown
   ## Phase 2: Requirements Clarification
   
   ### Questions Asked
   [List of questions]
   
   ### User Responses
   [Documented answers]
   
   ### Edge Cases to Cover
   - [Edge case 1]
   - [Edge case 2]
   ...
   
   ### Test Data Requirements
   - [Data requirement 1]
   - [Data requirement 2]
   ...
   ```
</update_test_plan>

<update_state step="2.5">
1. Update `agents/aqa-state.md`:
   - Questions Asked: [count]
   - User Responses: Documented in test plan file
2. Mark Phase 2 complete, Phase 3 current
</update_state>

<validation_checklist>
- All gaps identified and questions prepared
- User answers received and documented
- Test plan updated with clarifications
- Edge cases identified
- Test data requirements specified
</validation_checklist>

</aqa_flow_requirements_clarification>
