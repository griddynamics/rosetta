---
name: api-aqa-flow-gap-and-requirements-clarification
description: "Phase 3 Gap & Requirements Clarification of api-aqa-flow (USER INTERACTION REQUIRED)"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<api_aqa_flow_gap_and_requirements_clarification>

<description_and_purpose>
Cross-reference test cases, documentation, and API spec to identify gaps, contradictions, and ambiguities. Clarify all unknowns with user before test specification.
</description_and_purpose>

<workflow_context>
- Phase 3 of 8 in `api-aqa-flow`
- Input: raw data (Phase 1) + API analysis (Phase 2) + project config
- Output: `plans/api-aqa-{IDENTIFIER}/analysis.md` with gaps resolved, user answers documented
- Prerequisite: Phases 1 and 2 complete
- HITL: user answers required before Phase 4
- Required skills: `qa-knowledge` (`gap_analysis` mode + G/C/A finding forms), `qa-structure` (`{IDENTIFIER}` + analysis path)
- Recommended skills: `questioning` (clarification batch)
</workflow_context>

<phase_steps>
1. Execute gap analysis
2. Present questions and wait for user answers
3. Document clarifications and update state
</phase_steps>

<execute_gap_analysis step="3.1" subagent="architect" role="Test requirements analyst">

1. USE SKILL `qa-knowledge` (`gap_analysis` mode). Run all three variants; EMIT findings into `<analysis_md_contract>` sections:
   - **Test-cases-vs-API-spec variant** → **Gaps** (`G[N]` entries; test step vs API analysis cross-reference).
   - **General multi-source variant** → **Contradictions** (`C[N]`; cross-source: raw-data · api-analysis · docs) + **Ambiguities** (`A[N]`; vague statements).
2. Multi-bucket finding → record once (primary G/C/A section) + cross-ref; no duplication.
3. Prepare prioritized list for step 3.2.

</execute_gap_analysis>

<ask_user step="3.2">
1. USE SKILL `questioning`
2. Present structured questions (Critical / Important / Optional)
3. **STOP AND WAIT** for user to provide all answers
4. **Unknown-answer branches by priority:**
   - **Critical unknown:** mark as `BLOCKING ASSUMPTION` in `analysis.md`; stop Phase 3; do not advance to Phase 4 until user answers or explicitly approves the assumption.
   - **Important unknown:** mark as `ASSUMPTION` with rationale; flag in `agents/TEMP/<FEATURE>/api-aqa-state.md` under Open Assumptions; proceed.
   - **Optional unknown:** mark as `SKIPPED` with reason; proceed.
   - **Partial answer:** record answered portion; treat remainder per matching priority branch.
   - **User defers / marks out-of-scope:** record `DEFERRED — user out-of-scope`; treat as Optional → proceed.
</ask_user>

<update_plan step="3.3">
1. Update `plans/api-aqa-{IDENTIFIER}/analysis.md` with questions, answers, resolutions.
2. Verify all required sections per `<analysis_md_contract>`.
</update_plan>

<analysis_md_contract>
`analysis.md` required sections in order; missing/empty → fail validation:

1. **Gaps** — uncovered items; one bullet/gap; source cited
2. **Contradictions** — raw-data/api-analysis disagreements; both sources cited
3. **Ambiguities** — vague wording or behavior
4. **Questions** — structured; tagged Critical/Important/Optional
5. **Answers** — per answer: ANSWERED/ASSUMPTION/BLOCKING ASSUMPTION/SKIPPED/DEFERRED (→ `<ask_user>` step 4)
6. **Resolutions** — per G/C/A: resolved / assumption / deferred
7. **Open Assumptions** — unresolved items carried forward; count matches `agents/TEMP/<FEATURE>/api-aqa-state.md`
</analysis_md_contract>

<update_state step="3.4">
1. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`:
   - Gaps Found: [count]
   - Contradictions Found: [count]
   - Questions Asked: [count]
   - Answers Received: [count]
   - Open Assumptions: [count]
   - Skipped: [count]
   - Deferred: [count]
   - Phase 3 completion timestamp
2. Mark Phase 3 complete, Phase 4 current
</update_state>

<validation_checklist>
- `analysis.md` exists with all 7 sections per `<analysis_md_contract>`
- **Completion invariants (all must hold):** `Questions Asked == Answers Received + Open Assumptions + Skipped + Deferred`; **no Critical question remains in BLOCKING ASSUMPTION state** (any Critical-blocker forces Phase 3 to stay open); `Open Assumptions` count matches the size of the Open Assumptions section in `analysis.md`.
</validation_checklist>

<failure_handling>
- **Missing prerequisite** (`raw-data.md` or `api-analysis.md` absent/empty): stop Phase 3, record `Phase 3 blocked: missing [artifact]` in `agents/TEMP/<FEATURE>/api-aqa-state.md` → ask user to re-run producing phase.
- **Skill load failure** (`qa-knowledge`, `questioning`): apply `api-aqa-flow.md` `<failure_handling>` load-failure rule.
- **HITL stall** (user unresponsive / refuses Critical): do **not** auto-promote to assumption. Record `Phase 3 blocked: user-unresponsive on Critical question(s)` in `agents/TEMP/<FEATURE>/api-aqa-state.md`; pause. Resume only after: user answers, explicitly approves BLOCKING ASSUMPTION, or downgrades.
</failure_handling>

</api_aqa_flow_gap_and_requirements_clarification>
