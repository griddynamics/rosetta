---
name: testgen-flow-question-generation
description: Phase 3 of Test Generation - Question generation and user input (HITL gate)
tags: ["testgen", "phase"]
baseSchema: docs/schemas/phase.md
---

<testgen_flow_question_generation>

<description_and_purpose>
Generate specific, actionable clarification questions based on analysis findings, collect user answers, and validate completeness. This is the primary HITL gate — user input is required before proceeding to requirements generation.
</description_and_purpose>

<workflow_context>
- Phase 3 of 7 in `testgen-flow`
- Input: `analysis.md` from Phase 2
- Output: `questions.md` (for user), `answers.md` (structured user responses)
- Skills: `questioning`
- Prerequisite: Phase 0, 1, 2 complete
- **HITL GATE**: MUST WAIT for user to provide answers. Explicit approval required. Do not assume user approved — if user sends questions or suggestions, that is reviewing, not approval.
</workflow_context>

<phase_steps>
1. Load analysis data
2. Generate clarification questions
3. Prioritize and create questions document
4. Wait for user input
5. Validate user answers
6. Create answers document
7. Update state file
</phase_steps>

<generate_questions step="3.1">
1. Read `agents/testgen/{TICKET-KEY}/analysis.md`
2. USE SKILL `questioning` to formulate targeted clarification questions from analysis findings
3. For each **contradiction**: present both conflicting source quotes, ask which is correct, offer options (a/b/c/other)
4. For each **gap**: explain what's missing and why needed, provide examples or options
5. For each **ambiguity**: quote vague statement, ask for specific definition or measurement
6. Related issues can be combined: e.g., `Q5: G3, G4, A2 - User Permissions Model`
7. Quality rules: specific, actionable, includes context, offers options — NOT vague or open-ended

<question_format_for_contradictions>
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
```
</question_format_for_contradictions>
<question_format_for_gaps>
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
```
</question_format_for_gaps>
<question_format_for_ambiguities> 
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
</question_format_for_ambiguities>
<good_questions>
- "Should the authentication use OAuth 2.0, SAML, or Basic Auth?"
- "What is the maximum response time requirement (in milliseconds)?"
- "Should users be able to delete records permanently, or soft-delete only?"
</good_questions>

<poor_questions>
- "How should authentication work?" (too broad)
- "Should it be fast?" (vague)
- "Tell me about the feature." (not specific)
</poor_questions>
</generate_questions>

<create_questions_document step="3.2">
1. Group questions by priority: P0 (Critical, MUST answer), P1 (High), P2 (Medium), P3 (Low)
2. Create `agents/testgen/{TICKET-KEY}/questions.md` using template below
3. Update state to "AWAITING USER INPUT"
4. Notify user with file location and instructions
5. **PAUSE — WAIT FOR USER INPUT**



</create_questions_document>

<validate_answers step="3.3">
1. When user notifies answers are ready, read `questions.md`
2. Verify: all P0 questions answered (not blank), all P1 answered or marked "UNKNOWN"
3. Verify answers are substantive (not just "yes" or "ok")
4. If validation fails: tell user which questions still need answers, wait again
5. If validation passes: proceed to create answers document
</validate_answers>

<create_answers_document step="3.4">
1. Create `agents/testgen/{TICKET-KEY}/answers.md` using template below



<answers_template>
`answers.md` template:
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
**Status**: Resolved

### Q2: [Issue ID] - [Title]
[Same format]

---

## Unresolved Issues (Marked UNKNOWN)

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
</answers_template>
</create_answers_document>

<update_state step="3.5">
1. Update `agents/testgen/{TICKET-KEY}/testgen-state.md` with Phase 3 complete and answer metrics
2. Tell user: "Phase 3 complete. [X] questions answered, [Y] unresolved."
3. If unresolved: "We'll document assumptions for unresolved items."
4. Ask: "Ready to proceed to Phase 4 (Requirements Generation)?"
</update_state>

<validation_checklist>
- `questions.md` created with all questions from analysis
- User provided answers (file modified after creation)
- All P0 questions answered (not blank)
- `answers.md` created with structured answers
- State file updated with Phase 3 complete
</validation_checklist>

<pitfalls>
- Do NOT assume user approved — messages with questions or suggestions mean reviewing, not approval
- User may need time to research answers — be patient
- If user repeatedly cannot answer, suggest involving a different stakeholder
- Always document assumptions for unresolved questions marked UNKNOWN
</pitfalls>

</testgen_flow_question_generation>
