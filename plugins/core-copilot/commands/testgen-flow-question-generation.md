---
name: testgen-flow-question-generation
description: Phase 3 of Test Generation - Question Generation
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Test Generation Phase 3: Question Generation 

## Prerequisites

- Phase 0 MUST be complete
- Phase 1 MUST be complete
- Phase 2 MUST be complete
- `agents/testgen/{TICKET-KEY}/analysis.md` exists with identified issues
- `agents/testgen/{TICKET-KEY}/testgen-state.md` shows Phase 2 complete

## Objective

Generate specific, actionable clarification questions based on analysis findings, collect user answers, and validate completeness before proceeding to requirements generation.

⭐ **HITL GATE**: This phase requires human input. MUST WAIT for user to provide answers before Phase 4. Explicit user approval required. Do not assume user approved. User must type "yes" or "approved". If user asks questions or provides suggestions it is not approval, it means user is reviewing it!

## Requirements

### Step 1: Load Analysis Data

Read `agents/testgen/{TICKET-KEY}/analysis.md` completely.

Extract:
- All contradictions (C1, C2, ...)
- All gaps (G1, G2, ...)
- All ambiguities (A1, A2, ...)
- Risk assessments

### Step 2: Generate Clarification Questions

For each issue, create specific, actionable question.

**Question Quality Rules**:
- ✅ Specific and actionable
- ✅ Includes context from sources
- ✅ Offers multiple choice when possible
- ✅ References issue ID
- ❌ Not vague or open-ended
- ❌ Not asking multiple things in one question

**Question Format**:

**For Contradictions**:
```markdown
### Q[N]: [Issue ID] - [Brief Title]
**Issue Type**: Contradiction
**Context**: 
- Jira states: "[quote]"
- Confluence states: "[quote]"

**Question**: Which statement is correct, or should we use a different approach?
**Options**:
  a) Use Jira version: [specific value]
  b) Use Confluence version: [specific value]
  c) Use alternative: [specify]
  d) Other (please specify)

**Your Answer**: 
[Leave blank for user]

**Follow-up (if needed)**: 
[Leave blank for user]
```

**For Gaps**:
```markdown
### Q[N]: [Issue ID] - [Brief Title]
**Issue Type**: Gap (Functional/Non-Functional/Data/Business Logic/Dependency)
**Context**: [Where this is needed in implementation]

**Question**: [Specific question about missing information]
**Examples/Options** (if applicable):
  - Option 1: [example]
  - Option 2: [example]
  - Other: [allow free text]

**Your Answer**: 
[Leave blank for user]

**Additional Details** (optional): 
[Leave blank for user]
```

**For Ambiguities**:
```markdown
### Q[N]: [Issue ID] - [Brief Title]
**Issue Type**: Ambiguity
**Vague Statement**: "[quote from source]"

**Question**: Can you clarify what "[vague term]" means specifically?
**Need to Know**:
  - [Specific aspect 1]
  - [Specific aspect 2]

**Your Answer**: 
[Leave blank for user]
```

### Step 3: Prioritize Questions

Group by priority (based on risk from Phase 2):

**Priority 0 (Critical)**: Blocks implementation
**Priority 1 (High)**: Significant quality impact  
**Priority 2 (Medium)**: Affects approach
**Priority 3 (Low)**: Minor clarification

### Step 4: Create Questions Document

**File**: `agents/testgen/{TICKET-KEY}/questions.md`

**Format**:
```markdown
# Clarification Questions - [TICKET-KEY]

**Generated**: [DateTime]
**Phase**: 3 - Question Generation
**Total Questions**: [Count]
**Status**: AWAITING USER INPUT ⏳

---

## Instructions for User

Please answer each question below. For each question:
1. Fill in the **Your Answer** field
2. Optionally provide additional details in **Follow-up** or **Additional Details**
3. If you don't know the answer, write "UNKNOWN - need to research"
4. After completing all questions, save this file and notify the AI agent

**Important**: All P0 (Critical) questions MUST be answered to proceed.

---

## Summary

- **Total Questions**: [Count]
- **P0 (Critical)**: [Count] - MUST answer
- **P1 (High)**: [Count] - Should answer
- **P2 (Medium)**: [Count] - Recommended
- **P3 (Low)**: [Count] - Optional

---

## Priority 0 Questions (Critical - MUST Answer)

[List P0 questions using format from Step 2]

### Q1: C1 - [Title]
[Full question]

### Q2: G5 - [Title]
[Full question]

---

## Priority 1 Questions (High - Should Answer)

[List P1 questions]

---

## Priority 2 Questions (Medium - Recommended)

[List P2 questions]

---

## Priority 3 Questions (Low - Optional)

[List P3 questions]

---

## Additional Questions or Comments

If you have additional information, concerns, or questions not covered above, please add them here:

**Your Additional Input**:
[Leave blank for user]

---

## Completion Checklist

Before notifying the AI agent, verify:
- [ ] All P0 questions answered
- [ ] All P1 questions answered (or marked UNKNOWN)
- [ ] P2/P3 questions reviewed
- [ ] File saved

**When complete, tell AI**: "Questions answered" or "I've filled in the answers"
```

### Step 5: Update State and Wait for User

Update `agents/testgen/{TICKET-KEY}/testgen-state.md`:

```markdown
## Phase Completion Status

- [x] Phase 1: Data Collection - Completed [Date]
- [x] Phase 2: Gap Analysis - Completed [Date]
- [⏳] Phase 3: Question Generation - AWAITING USER INPUT
- [ ] Phase 4: Requirements Generation - Not Started
- [ ] Phase 5: Test Scenarios - Not Started

## Metrics

[...]
- Questions Generated: [Count]
- Questions Answered: 0
[...]

## Phase Details

[...]

### Phase 3: Question Generation & User Input
- **Questions Generated**: [DateTime]
- **Files Created**: questions.md
- **Total Questions**: [Count]
- **P0 Questions**: [Count]
- **P1 Questions**: [Count]
- **Status**: Awaiting user input ⏳
- **Notes**: User notified, waiting for answers
```

**Notify User**:
```
Phase 3 complete. Generated [N] clarification questions ([X] critical, [Y] high priority).

Please review and answer questions in: agents/testgen/{TICKET-KEY}/questions.md

Instructions:
1. Open questions.md
2. Fill in "Your Answer" for each question
3. Save the file
4. Tell me: "Questions answered"

I'll wait for your input before proceeding to Phase 4 (Requirements Generation).
```

**⏸️ PAUSE HERE - WAIT FOR USER INPUT**

### Step 6: Validate User Answers (When User Notifies)

When user says "questions answered" or similar:

1. Read `agents/testgen/{TICKET-KEY}/questions.md`
2. Check for filled "Your Answer" fields
3. Validate:
   - ✅ All P0 questions have answers (not blank)
   - ✅ All P1 questions have answers or "UNKNOWN"
   - ✅ Answers are substantive (not just "yes" or "ok")

**If validation fails**:
```
I checked questions.md and found:
- [X] P0 questions still unanswered
- [Y] P1 questions incomplete

Please complete the missing answers and let me know when done.
```

**If validation passes**, proceed to Step 7.

### Step 7: Create Answers Document

**File**: `agents/testgen/{TICKET-KEY}/answers.md`

Extract and structure all user answers.

**Format**:
```markdown
# User Answers - [TICKET-KEY]

**Answered**: [DateTime]
**Phase**: 3 - User Input
**Total Answers**: [Count answered questions]

---

## Summary

- **Questions Answered**: [Count] / [Total]
- **P0 Answered**: [Count] / [Total P0]
- **P1 Answered**: [Count] / [Total P1]
- **Unknowns**: [Count marked UNKNOWN]

---

## Resolved Issues

### Q1: [Issue ID] - [Title]
**Question**: [Original question summary]
**Answer**: [User's answer]
**Follow-up**: [If provided]
**Status**: ✅ Resolved / ⚠️ Needs Research (if UNKNOWN)

### Q2: [Issue ID] - [Title]
[Same format]

---

## Unresolved Issues (Marked UNKNOWN)

[List questions user marked as needing research]

### Q[N]: [Issue ID] - [Title]
**Question**: [Summary]
**Status**: Need to research with [stakeholder/team]
**Impact**: [From original analysis]
**Recommendation**: [How to proceed without this info, if possible]

---

## Additional User Input

[Include any additional comments user provided]

---

## Next Steps

1. Proceed to Phase 4: Requirements Generation
2. Incorporate all resolved answers
3. Document assumptions for unresolved issues
4. Flag unresolved issues in requirements document
```

### Step 8: Finalize Phase 3

Update `agents/testgen/{TICKET-KEY}/testgen-state.md`:

```markdown
## Phase Completion Status

- [x] Phase 1: Data Collection - Completed [Date]
- [x] Phase 2: Gap Analysis - Completed [Date]
- [x] Phase 3: Question Generation - Completed [DateTime]
- [ ] Phase 4: Requirements Generation - Not Started
- [ ] Phase 5: Test Scenarios - Not Started

## Metrics

[...]
- Questions Generated: [Count]
- Questions Answered: [Count]
- Questions Unresolved: [Count marked UNKNOWN]
[...]

## Phase Details

[...]

### Phase 3: Question Generation & User Input
- **Questions Generated**: [DateTime]
- **User Answers Received**: [DateTime]
- **Files Created**: questions.md, answers.md
- **Total Questions**: [Count]
- **Answered**: [Count]
- **Unresolved**: [Count]
- **Notes**: Ready for Phase 4
```

## Validation

Before completing Phase 3, verify:
- ✅ `questions.md` created with all questions
- ✅ User provided answers (file modified after creation)
- ✅ All P0 questions answered (not blank)
- ✅ `answers.md` created with structured answers
- ✅ State file updated with Phase 3 complete
- ✅ User notified to proceed to Phase 4

## Tools Used

- `read_file()` - Read agents/testgen/{TICKET-KEY}/analysis.md, agents/testgen/{TICKET-KEY}/questions.md
- `write()` - Create agents/testgen/{TICKET-KEY}/questions.md, agents/testgen/{TICKET-KEY}/answers.md, update agents/testgen/{TICKET-KEY}/testgen-state.md

## Question Generation Tips

**Good Questions**:
- "Should the authentication use OAuth 2.0, SAML, or Basic Auth?"
- "What is the maximum response time requirement (in milliseconds)?"
- "Should users be able to delete records permanently, or soft-delete only?"

**Poor Questions**:
- "How should authentication work?" (too broad)
- "Should it be fast?" (vague)
- "Tell me about the feature." (not specific)

**Multiple Issues, One Question**:
If related issues can be resolved by one answer, combine them:
```
### Q5: G3, G4, A2 - User Permissions Model
[Combined question addressing all three issues]
```

## Common Patterns

**Contradiction Question**:
- Present both conflicting sources
- Ask which to use or suggest compromise
- Offer specific options

**Gap Question**:
- Explain what's missing
- Why it's needed
- Provide examples or options

**Ambiguity Question**:
- Quote vague statement
- Ask for specific measurement or definition
- Give examples of what you need to know

## Next Phase

After Phase 3 completion:
1. Tell user: "Phase 3 complete. [X] questions answered, [Y] unresolved."
2. If unresolved: "We'll document assumptions for unresolved items."
3. Ask: "Ready to proceed to Phase 4 (Requirements Generation)?"
4. Wait for confirmation
5. Load Phase 4: ACQUIRE testgen-phase4-md FROM KB

## Notes

- This is the ONLY HITL gate in the flow - critical to get user input here
- Be patient - user may need time to research answers
- If user repeatedly cannot answer, consider involving different stakeholder
- Document all assumptions made for unresolved questions

