---
name: aqa-flow-requirements-clarification
description: "Phase 2 Requirements Clarification of aqa-flow"
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Phase 2: Requirements Clarification

## Objective

Fill gaps in understanding, clarify unknowns, and define explicit assertions before implementation. This phase requires **USER INTERACTION**.

## Prerequisites

- Phase 1 completed
- Test plan file created with TestRail and Confluence data
- Initial understanding of test requirements

## Phase Tasks

### Task 1: Review Gathered Information for Gaps

**Actions**:
1. Read the test plan file from Phase 1
2. Analyze information for completeness:
   - Are test steps clear and unambiguous?
   - Are expected results specific and measurable?
   - Is test data defined?
   - Are edge cases identified?
   - Are success criteria explicit?
3. Create list of unknowns and ambiguities
4. Identify areas requiring clarification

**Expected Output**: List of gaps and questions that need user input.

### Task 2: Define Explicit Assertions

**Actions**:
1. For each test step, define what will be verified:
   - UI element states (visible, enabled, disabled, checked)
   - Text content (exact match, contains, pattern)
   - Data values (equals, greater than, within range)
   - Navigation (URL, page title, breadcrumbs)
   - Error messages or success notifications
2. Specify assertion types:
   - Presence assertions (element exists)
   - State assertions (element state matches expected)
   - Content assertions (text/value matches expected)
   - Behavioral assertions (action triggers expected response)
3. Document all assertions in test plan

**Expected Output**: Complete list of explicit, measurable assertions for each test step.

### Task 3: Prepare Questions for User

**Actions**:
1. Formulate specific questions about:
   - **Test Coverage**: What exactly should be tested? Are there specific scenarios?
   - **Success Criteria**: How do we know the test passed? What defines success?
   - **Edge Cases**: What unusual conditions should be covered? What can go wrong?
   - **Test Data**: What specific data should be used? Any special values?
   - **Expected Behavior**: What should happen in each step? Any timing considerations?
   - **Out of Scope**: What should NOT be tested in this test case?
2. Group questions logically
3. Prioritize questions (critical vs. nice-to-have)

**Example Questions**:
```
Critical Questions:
1. When clicking [Button X], should we verify only [Element Y] appears, 
   or also check that [Element Z] disappears?
2. For the success message, should we match exact text "Success!" 
   or just verify message contains "Success"?
3. What test data should be used for [Field A]? Any specific format?

Edge Cases:
4. What should happen if [Condition X] occurs during the test?
5. Should we test with empty/invalid data, or only valid data?

Test Flow:
6. Are there any timing dependencies (waits, delays)?
7. Should this test clean up data after execution?
```

**Expected Output**: Organized list of specific questions for user.

### Task 4: Ask User and Wait for Answers

**Actions**:
1. Present questions to user in clear, organized format
2. Explain why each question is important
3. **WAIT** for user to provide all answers
4. **DO NOT PROCEED** to Phase 3 until answers received
5. Document user responses in test plan

**User Interaction Format**:
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

**Expected Output**: Complete answers from user to all questions.

### Task 5: Update Test Plan with Clarifications

**Actions**:
1. Add new section to test plan:
   ```markdown
   ## Phase 2: Requirements Clarification
   
   ### Questions Asked
   [List of questions]
   
   ### User Responses
   [Documented answers]
   
   ### Defined Assertions
   #### Step 1: [Action]
   - Assert: [Explicit assertion]
   - Verification: [How to verify]
   
   #### Step 2: [Action]
   - Assert: [Explicit assertion]
   - Verification: [How to verify]
   ...
   
   ### Edge Cases to Cover
   - [Edge case 1]
   - [Edge case 2]
   ...
   
   ### Test Data Requirements
   - [Data requirement 1]
   - [Data requirement 2]
   ...
   ```
2. Update test steps with explicit assertions
3. Add edge case scenarios if applicable
4. Document test data requirements

**Expected Output**: Enhanced test plan with all clarifications and explicit assertions documented.

## Completion Criteria

- [ ] All gaps in understanding identified
- [ ] Explicit assertions defined for each test step
- [ ] Questions prepared and presented to user
- [ ] **User answers received and documented**
- [ ] Test plan updated with Phase 2 information
- [ ] Edge cases identified and documented
- [ ] Test data requirements specified
- [ ] `agents/aqa-state.md` updated with Phase 2 completion

## Update State File

After completing Phase 2, update `agents/aqa-state.md`:

```markdown
### Phase 2: Requirements Clarification
- Completed: [DateTime]
- Questions Asked: [Count]
- Assertions Defined: [Count]
- Edge Cases: [List]
- User Responses: Documented in test plan
```

Mark Phase 2 as completed and Phase 3 as current.

## Next Phase

After user provides all answers, proceed to **Phase 3: Code Analysis** by executing:
```
ACQUIRE aqa-flow-code-analysis.md FROM KB
```

## Important Notes

- **CRITICAL**: DO NOT proceed to Phase 3 without user answers
- **No Assumptions**: Never assume answers - always ask user
- **Explicit Over Implicit**: Every assertion must be measurable and verifiable
- **User Authority**: User has final say on requirements and expected behavior
- **Document Everything**: Record all questions and answers for traceability
