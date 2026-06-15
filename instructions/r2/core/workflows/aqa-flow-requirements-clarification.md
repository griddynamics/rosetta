---
name: aqa-flow-requirements-clarification
description: "Phase 2 Requirements Clarification of aqa-flow"
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

<recommended_skills>
- `requirements-use` (gap_analysis mode, test-plan variant) — emits the typed gap entries across the five completeness dimensions.
- `questioning` — the structured Critical / Edge / Optional clarification batch.
- `qa-structure` — `<test-name>` paths and the AQA state-file shape (`aqa-layout`).
- `qa-knowledge` — the Phase 2 templates: gap entry, clarification questions message, and the test-plan clarification section with the typed Explicit Assertions format (ACQUIRE its asset at the cited steps).
</recommended_skills>

<phase_steps>
1. Identify gaps in test case understanding → step 2.1
2. Ask user for clarification → step 2.2
3. Wait for user answers → step 2.3
4. Update the test plan + write the **mandatory** typed `### Explicit Assertions` list → step 2.4
5. Document and update state → step 2.5
</phase_steps>

<identify_gaps step="2.1">
1. USE SKILL `requirements-use` (gap_analysis mode, test-plan variant). The mode is analysis-only; it evaluates all five completeness dimensions (D1 steps clarity / D2 result measurability / D3 test data / D4 edge cases / D5 success criteria) of the Phase 1 test plan and EMITS, per gap, the **gap entry** from the asset `qa-knowledge/assets/aqa-clarification-templates.md` ("Gap entry" section; ACQUIRE FROM KB) — this phase OWNS that template + the question-prep contract; the skill never invents the artifact shape.
2. Per gap, the entry carries a **`Derived assertion (if applicable)` field** — a typed (Presence / State / Content / Behavioral) measurable assertion form, OR blank when no measurable form is derivable from the plan as written (never fabricate). This is the source step 2.4 transcribes from.
3. Prepare the list of unknowns and ambiguities (with Derived assertion populated where applicable) for step 2.2's question generation.
</identify_gaps>

<ask_questions step="2.2">
1. USE SKILL `questioning`
2. Present structured questions to user using the "Clarification questions message" template in the asset `qa-knowledge/assets/aqa-clarification-templates.md` (ACQUIRE FROM KB).
</ask_questions>

<wait_for_user step="2.3">
1. **STOP AND WAIT** for user to provide all answers.

2. **Answer-handling branches** (apply to step 2.4's processing):

   | Case | Action |
   |---|---|
   | All answers received | Proceed to step 2.4. |
   | Partial — some questions left blank or `"I don't know"` | Re-ask **once** for unanswered Critical only; cap at one re-ask round; on still-no-answer, treat that question as declined (next row). Edge / Optional unanswered → record under `### Open Questions`, do not re-ask. |
   | Declines specific Critical questions | Record each under `### Open Questions` as `declined by user — <reason or "no reason given">`; keep any Derived assertion as a normal `### Explicit Assertions` bullet (Phase 6 decides implemented-or-Uncovered — Phase 2 writes no status). **Aggregate cap:** if ≥50% of Critical questions are declined (or ≥3 declined when Critical count <6), escalate to the last row — do NOT proceed with majority-declined clarifications. |
   | Declines all / refuses to engage | Stop. Record `Phase 2 blocked: user declined to answer all clarification questions` in `agents/aqa-state.md`, surface to parent workflow, do NOT auto-proceed to Phase 3. |
</wait_for_user>

<update_test_plan step="2.4">
1. Process user answers from step 2.3.
2. **Carry every `Derived assertion` field from step 2.1 into the typed list.** Zero derived assertions → emit the None-clause; do NOT omit the section.
3. Add the **Phase 2 clarification section** to `agents/plans/aqa-<test-name>.md` per the asset `qa-knowledge/assets/aqa-clarification-templates.md` ("Test-plan clarification section"; ACQUIRE FROM KB) — Questions Asked, User Responses, Edge Cases, Test Data Requirements, Open Questions, and the **mandatory** typed `### Explicit Assertions` (with the worked exact-vs-contains example). Phase 6 (`testing`) validates that every assertion is implemented OR listed in Uncovered.
</update_test_plan>

<update_state step="2.5">
1. **GATE — do NOT mark Phase 2 complete or advance to Phase 3 until** `agents/plans/aqa-<test-name>.md` contains the step-2.4 `### Explicit Assertions` subsection with **at least one typed bullet** (Presence / State / Content / Behavioral) **OR** the explicit None-clause. If it is absent, return to step 2.4 and write it first — a Phase 2 marked complete without this subsection is a defect (Phase 6 loses its validation anchor and tests silently under-assert).
2. Update `agents/aqa-state.md`:
   - Questions Asked: [count]
   - User Responses: Documented in test plan file
   - Explicit Assertions: [count of typed bullets, or `None-clause`]
3. Mark Phase 2 complete, Phase 3 current.
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
