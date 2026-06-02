---
name: aqa-flow-requirements-clarification
description: Phase 2 of AQA workflow - Requirements Clarification (gap-filling questioning) and Assertion Transcription (derives typed assertions via the bound elicitation skill and writes them to the test plan as a mandatory list) — USER INTERACTION REQUIRED
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_requirements_clarification>

<description_and_purpose>
Fill gaps in understanding, clarify unknowns, AND transcribe the typed assertion list produced by `aqa-requirements-elicitation` into the test plan as the mandatory `### Explicit Assertions` subsection so downstream authoring (Phase 6) has a complete, validatable input. Assertion derivation happens inside the bound skill at step 2.1; this phase's step 2.4 is responsible for the transcription.
</description_and_purpose>

<workflow_context>
- Phase 2 of 8 in `aqa-flow`
- Input: test plan file `agents/plans/aqa-<test-name>.md` from Phase 1
- Output: user answers + explicit typed assertion list, written into the test plan
- Prerequisite: Phase 1 complete
- HITL: user answers required before Phase 3
- **Assertion authority chain:** `aqa-requirements-elicitation` derives assertions (typed: presence / state / content / behavioral) → step 2.4 transcribes them into the test plan's `### Explicit Assertions` subsection → Phase 6 (`aqa-test-authoring`) validates that every transcribed assertion is implemented OR listed as Uncovered. If transcription is skipped, Phase 6 validation has no anchor and tests may silently under-assert.
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
1. Process user answers from step 2.3.
2. **Collect every assertion the `aqa-requirements-elicitation` skill derived in step 2.1** — including its `Derived assertion (if applicable)` field on each elicited item — and assemble the typed assertion list. Every derived assertion MUST be carried forward; if the elicitation skill produced zero derived assertions, record `None — no observable behavior derivable from current clarifications; Phase 6 will surface this as Uncovered` rather than omitting the section.
3. Add the section below to the test plan `agents/plans/aqa-<test-name>.md`. The `### Explicit Assertions` subsection is **mandatory** — Phase 6 (`aqa-test-authoring`) validates that every assertion here is implemented OR listed in Uncovered:

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

### Explicit Assertions (mandatory — transcribed from `aqa-requirements-elicitation`)

Each assertion carries a **type** (Presence / State / Content / Behavioral) and a **subject** (UI element or system observable). One bullet per assertion; do NOT collapse multiple assertions into one line.

- **Presence:** [element/observable] is [present | absent | visible | hidden] after [trigger condition].
- **State:** [element] is [enabled | disabled | selected | unselected | loading | settled] after [trigger].
- **Content:** [element] displays/contains [exact value or pattern] after [trigger].
- **Behavioral:** [action] produces [observable result] within [timing constraint, if any].
- (If the elicitation skill derived zero assertions: `None — no observable behavior derivable from current clarifications; Phase 6 will surface this as Uncovered`.)
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
- **`### Explicit Assertions` subsection present** in the test plan under `## Phase 2: Requirements Clarification`, with every assertion derived by `aqa-requirements-elicitation` transcribed verbatim — typed (Presence / State / Content / Behavioral) with the subject + trigger. If the elicitation skill produced no derivable assertions, the section explicitly says so per step 2.4's None-clause; absence of the section is not acceptable.
- **Per-assertion granularity:** each assertion is one bullet — no `A AND B` composite assertions; multiple observables are split into separate bullets so Phase 6's per-assertion implementation tracking works.
</validation_checklist>

</aqa_flow_requirements_clarification>
