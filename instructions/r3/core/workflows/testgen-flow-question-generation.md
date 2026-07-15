---
name: testgen-flow-question-generation
description: "Phase 3 Question Generation of testgen-flow"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
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
- Recommended skills: `questioning`
- Prerequisite: Phase 0, 1, 2 complete
- **HITL GATE**: MUST WAIT for user to provide answers. Explicit approval required. Do not assume user approved — if user sends questions or suggestions, that is reviewing, not approval.
</workflow_context>

<phase_steps>
1. Generate clarification questions (loads analysis + formats by issue type) → step 3.1
2. Prioritize and create questions document → step 3.2
3. Validate user answers → step 3.3
4. Create answers document → step 3.4
5. Update state file → step 3.5
</phase_steps>

<generate_questions step="3.1">
1. Read `plans/testgen-{TICKET-KEY}/analysis.md`
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
- Ticket states: "[quote]"
- Wiki states: "[quote]"

**Question**: Which statement is correct, or should we use a different approach?
**Options**:
  a) Use the ticket version: [specific value]
  b) Use the Wiki version: [specific value]
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
2. Create `plans/testgen-{TICKET-KEY}/questions.md` using the `questions.md` template defined in `<questions_template>` below
3. Update state to "AWAITING USER INPUT"
4. Notify the user and **direct them to answer IN the file**: give the `questions.md` path and ask them to fill the `[Leave blank for user]` fields there. A short chat summary of the questions is fine for orientation, but the **authoritative answers are collected in `questions.md`** — do NOT run a chat Q&A in its place, and do NOT accept chat replies as a substitute for the file (`validate_answers`, step 3.3, reads the file, not the chat). This keeps every question visible and answerable to the user, instead of only the ones the agent chose to surface in chat.
5. **PAUSE — WAIT FOR USER INPUT**

<questions_template>
`questions.md` template:
````markdown
# Clarification Questions - [TICKET-KEY]

**Created**: [DateTime]
**Phase**: 3 - Question Generation
**Source Analysis**: plans/testgen-[TICKET-KEY]/analysis.md

---

## Summary

- **Total Questions**: [Count]
- **P0 (Critical, MUST answer)**: [Count]
- **P1 (High)**: [Count]
- **P2 (Medium)**: [Count]
- **P3 (Low)**: [Count]

---

## How to Answer

For each question below, replace `[Leave blank for user]` with your answer (or `UNKNOWN — need to research with [stakeholder]` if you cannot answer right now). All **P0** must be answered before Phase 4 proceeds; P1 must be answered or marked UNKNOWN.

---

## P0 Questions (Critical)

[Insert Q-entries here using `<question_format_for_contradictions>` / `<question_format_for_gaps>` / `<question_format_for_ambiguities>` formats above, grouped under this section]

## P1 Questions (High)

[Same; if none, omit the section]

## P2 Questions (Medium)

[Same; optional, may remain blank per `<validate_answers>` rule]

## P3 Questions (Low)

[Same; optional, may remain blank per `<validate_answers>` rule]

---

## Additional Questions or Comments

[If you have information, constraints, edge cases, or context NOT covered by the questions above, add it here. This free-text is the channel for user-volunteered input and is carried into Phase 4 requirements.]

---

## Completion Checklist (tick before notifying the agent)

- [ ] All P0 questions answered (no blanks)
- [ ] P1 answered or marked `UNKNOWN — need to research with [stakeholder]`
- [ ] File saved
- [ ] When complete, tell the agent: "answers ready"
````
</questions_template>
</create_questions_document>

<validate_answers step="3.3">
1. When user notifies answers are ready, read `questions.md`
2. Verify per-priority acceptance criteria:
   - **P0:** every P0 question must be answered with a substantive, factual answer (not blank). **UNKNOWN is rejected outright for P0** — no exceptions: do NOT accept UNKNOWN paired with a "default", "best guess", "placeholder", or "we'll figure out later". The only ways to close a P0 are (a) an actual answer from the user, or (b) the user explicitly authorizing a priority downgrade of the question (which the agent must record as `P0 → P1 (user-authorized downgrade)` in `answers.md` before treating UNKNOWN as acceptable). Phase 3 stays open until every P0 is resolved by (a) or (b).
   - **P1:** every P1 question must be answered OR explicitly marked `UNKNOWN — need to research with [stakeholder]`.
   - **P2 and P3:** may remain blank; proceed regardless. Blank P2/P3 entries are recorded as deferred but do not block Phase 4.
3. Verify answers are substantive (not just "yes" or "ok")
4. If validation fails: tell user which questions still need answers, wait again
5. If validation passes: proceed to create answers document
</validate_answers>

<create_answers_document step="3.4">
1. Create `plans/testgen-{TICKET-KEY}/answers.md` using template below

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
1. Update `plans/testgen-{TICKET-KEY}/testgen-state.md` with Phase 3 complete. **State delta (per `testgen-flow.md` SELF-CHECK):** set the Phase 3 `## Phase Completion Status` row to complete; populate `## Phase Details` (questions generated, P0/P1 answered, unresolved/UNKNOWN counts, files created: `questions.md`, `answers.md`); update `## Metrics`.
2. Tell user: "Phase 3 complete. [X] questions answered, [Y] unresolved."
3. If unresolved: "We'll document assumptions for unresolved items."
4. Ask: "Ready to proceed to Phase 4 (Requirements Generation)?"
5. **STOP AND WAIT for explicit user confirmation. DO NOT PROCEED to Phase 4 until the user confirms.** Treat ambiguous responses (further questions, suggestions, silence) as not confirmed and re-ask — per this flow's per-phase confirmation discipline and the `<workflow_context>` HITL-GATE rule.
</update_state>

<validation_checklist>
- `questions.md` created with all questions from analysis
- User provided answers (file modified after creation)
- All P0 questions answered (not blank)
- `answers.md` created with structured answers
- State file updated with Phase 3 complete
</validation_checklist>

<failure_handling>
- **Missing `analysis.md`:** stop Phase 3, record `Phase 3 blocked: analysis.md missing` in `testgen-state.md`, ask user to rerun Phase 2.
- **Zero questions to generate** (Phase 2 produced no contradictions / gaps / ambiguities): inform the user, mark Phase 3 as `SKIPPED — no questions` in `testgen-state.md`, and advance to Phase 4 directly (do not create an empty `questions.md`).
- **Unparseable user answers** (file structurally broken — missing Q-entries, malformed markdown, answers in wrong fields): tell the user which entries are unparseable, ask them to re-edit the file. Cap at 2 re-asks. After 2 unsuccessful cycles, stop Phase 3, record `Phase 3 blocked: unparseable answers after 2 retries`, and ask the user whether to re-do `questions.md` from scratch or escalate.
- **User explicitly declines to answer** (says "skip", "I don't know any of these", or similar): treat as a stall — do not silently downgrade P0 to UNKNOWN; stop, record `Phase 3 blocked: user-declined-answers on P0`, ask whether to re-open Phase 2 or escalate scope.
</failure_handling>

<pitfalls>
- Do NOT assume user approved — messages with questions or suggestions mean reviewing, not approval
- User may need time to research answers — be patient
- If user repeatedly cannot answer, suggest involving a different stakeholder
- Always document assumptions for unresolved questions marked UNKNOWN
</pitfalls>

</testgen_flow_question_generation>
