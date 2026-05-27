---
name: qa-flow-gap-and-requirements-clarification
description: Phase 3 of API QA workflow - Gap Analysis and Requirements Clarification (USER INTERACTION REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_gap_and_requirements_clarification>

<description_and_purpose>
Cross-reference test cases, documentation, and API spec to identify gaps, contradictions, and ambiguities. Clarify all unknowns with user before test specification.
</description_and_purpose>

<workflow_context>
- Phase 3 of 8 in `qa-flow`
- Input: raw data (Phase 1) + API analysis (Phase 2) + project config
- Output: `agents/qa/{IDENTIFIER}/analysis.md` with gaps resolved, user answers documented
- Prerequisite: Phases 1 and 2 complete
- HITL: user answers required before Phase 4
</workflow_context>

<phase_steps>
1. Execute gap analysis
2. Present questions and wait for user answers
3. Document clarifications and update state
</phase_steps>

<execute_gap_analysis step="3.1" subagent="architect" role="API test requirements analyst">
1. USE SKILL `qa-gap-analysis`
2. USE SKILL `gap-and-contradiction-analysis`
3. USE SKILL `aqa-requirements-elicitation`
4. Prepare prioritized list of gaps, contradictions, ambiguities
</execute_gap_analysis>

<ask_user step="3.2">
1. USE SKILL `questioning`
2. Present structured questions to user (Critical / Important / Optional)
3. **STOP AND WAIT** for user to provide all answers
4. If user doesn't know an answer, mark as assumption and document
</ask_user>

<update_plan step="3.3">
1. Process user answers
2. Update analysis document with questions, answers, and resolved items
3. Verify `agents/qa/{IDENTIFIER}/analysis.md` created
</update_plan>

<update_state step="3.4">
1. Update `agents/qa-state.md`:
   - Gaps Found: [count]
   - Contradictions Found: [count]
   - Questions Asked: [count]
   - Answers Received: [count]
   - Open Assumptions: [count]
   - Phase 3 completion timestamp
2. Mark Phase 3 complete, Phase 4 current
</update_state>

<validation_checklist>
- Cross-reference analysis completed
- All gaps, contradictions, and ambiguities documented
- Questions presented to user
- User answers received and documented
- `analysis.md` created with all sections
</validation_checklist>

</qa_flow_gap_and_requirements_clarification>
