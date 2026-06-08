---
name: aqa-flow-requirements-clarification
description: Phase 2 of AQA workflow - Requirements Clarification (gap-filling questioning) and Assertion Transcription (derives typed assertions via the requirements-use gap_analysis mode and writes them to the test plan as a mandatory list) — USER INTERACTION REQUIRED
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_requirements_clarification>

<description_and_purpose>
Fill gaps in understanding, clarify unknowns, and transcribe the typed assertion list (derived in step 2.1, written to the test plan in step 2.4 — canonical owner of the typed format + mandatory subsection + None-clause) so Phase 6 has a validatable input.
</description_and_purpose>

<workflow_context>
- Phase 2 of 8 in `aqa-flow`
- Input: test plan file `agents/plans/aqa-<test-name>.md` from Phase 1
- Output: user answers + explicit typed assertion list, written into the test plan
- Prerequisite: Phase 1 complete
- HITL: user answers required before Phase 3
- **Assertion authority chain:** gap analysis (step 2.1, `requirements-use` gap_analysis mode) → transcription per step 2.4 (canonical typed format + mandatory `### Explicit Assertions` subsection + None-clause) → Phase 6 (`testing`) validates implemented OR Uncovered. If transcription is skipped, Phase 6 validation has no anchor and tests may silently under-assert.
</workflow_context>

<phase_steps>
1. Identify gaps in test case understanding → step 2.1
2. Ask user for clarification → step 2.2
3. Wait for user answers → step 2.3
4. Update test plan file `agents/plans/aqa-<test-name>.md` according to user answers → step 2.4
5. Document and update state → step 2.5
</phase_steps>

<identify_gaps step="2.1">
1. USE SKILL `requirements-use` (gap_analysis mode, test-plan variant). The mode is analysis-only; it evaluates all five completeness dimensions (D1 steps clarity / D2 result measurability / D3 test data / D4 edge cases / D5 success criteria) of the Phase 1 test plan and EMITS, per gap, the **gap entry** defined by this phase's `<gap_entry_template>` below — this phase OWNS that template + the question-prep contract; the skill never invents the artifact shape.
2. Per gap, the entry carries a **`Derived assertion (if applicable)` field** — a typed (Presence / State / Content / Behavioral) measurable assertion form, OR blank when no measurable form is derivable from the plan as written (never fabricate). This is the source step 2.4 transcribes from.
3. Prepare the list of unknowns and ambiguities (with Derived assertion populated where applicable) for step 2.2's question generation.

<gap_entry_template>

Each gap is recorded as one entry; if all five dimensions are satisfied, emit the single line `No gaps identified — all five completeness dimensions (D1–D5) satisfied by the Phase 1 plan.`

```markdown
### G-N: [Brief gap title]
- **Dimension:** D1 | D2 | D3 | D4 | D5
- **Priority:** Critical (blocks test design) | Should (impairs quality) | Optional
- **Confidence:** High (clearly a gap) | Low (borderline — flag for prioritization)
- **Context:** [What is unclear/missing; cite section/step number when possible]
- **Derived assertion (if applicable):** [Concrete measurable form, e.g. `response.statusCode == 200` or `page.title == "Order Confirmed"`. Blank if none derivable from the plan as written.]
```

Specificity expectation for the downstream question (exact-text-vs-contains, timing budget, single-decision-per-question) is owned by `questioning` (step 2.2) — e.g. *"After Logout, assert exact text `'Success!'` OR that the message **contains** `'Success'` (case-insensitive)? Acceptable wait window — 2s, 5s, or match existing similar tests?"* Vague *"is the user logged out?"* questions are forbidden.

</gap_entry_template>
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
1. **STOP AND WAIT** for user to provide all answers.

2. **Answer-handling branches** (apply to step 2.4's processing):

   | Case | Action |
   |---|---|
   | All answers received | Proceed to step 2.4. |
   | Partial — some questions left blank or `"I don't know"` | Re-ask **once** for unanswered Critical only; cap at one re-ask round; on still-no-answer, treat that question as declined (next row). Edge / Optional unanswered → record as gaps per None-clause, do not re-ask. |
   | Declines specific Critical questions | Record each as `gap: declined by user — <reason or "no reason given">` under `### Open Questions`; mark its Derived assertion (if any) Uncovered in `### Explicit Assertions`. **Aggregate cap:** if ≥50% of Critical questions are declined (or ≥3 declined when Critical count <6), escalate to the last row — do NOT proceed with majority-declined clarifications. |
   | Declines all / refuses to engage | Stop. Record `Phase 2 blocked: user declined to answer all clarification questions` in `agents/aqa-state.md`, surface to parent workflow, do NOT auto-proceed to Phase 3. |
</wait_for_user>

<update_test_plan step="2.4">
1. Process user answers from step 2.3.
2. **Carry every `Derived assertion` field from step 2.1 into the typed list below.** Zero derived assertions → emit the None-clause from the template; do NOT omit the section.
3. Add the section below to `agents/plans/aqa-<test-name>.md`. `### Explicit Assertions` is **mandatory** — Phase 6 (`testing`) validates that every assertion is implemented OR listed in Uncovered:

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

### Explicit Assertions (mandatory — transcribed from step 2.1 gap analysis)

Each assertion carries a **type** (Presence / State / Content / Behavioral) and a **subject** (UI element or system observable). One bullet per assertion; do NOT collapse multiple assertions into one line.

- **Presence:** [element/observable] is [present | absent | visible | hidden] after [trigger condition].
- **State:** [element] is [enabled | disabled | selected | unselected | loading | settled] after [trigger].
- **Content:** [element] displays/contains [exact value or pattern] after [trigger].
- **Behavioral:** [action] produces [observable result] within [timing constraint, if any].
- (If step 2.1 derived zero assertions: `None — no observable behavior derivable from current clarifications; Phase 6 will surface this as Uncovered`.)
```

**Filled-in worked example** (canonical owner = this phase; one example inline so the format is grounded even if the gap_analysis mode cannot load — the exact-vs-contains specificity distinction is the most error-prone field for this type):

```markdown
- **Content:** `#login-toast` displays exact text `"Login successful"` (not `contains "successful"`) after clicking the **Sign In** button.
- **Content:** `#error-banner` contains substring `"network"` (case-insensitive) after a request timeout (do NOT assert exact text — the upstream service formats the rest of the message).
```

The two bullets illustrate the **exact vs. contains** distinction step 2.1 flags as a clarification trigger. Apply the same shape (typed prefix → subject → exact-or-contains qualifier → trigger) to every assertion.
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
- **`### Explicit Assertions` subsection present per step 2.4** (canonical typed format + per-bullet granularity + None-clause for the zero-assertion case). Absence of the section is not acceptable.
</validation_checklist>

</aqa_flow_requirements_clarification>
