---
name: qa-flow-gap-and-requirements-clarification
description: Phase 3 of QA workflow - Gap Analysis and Requirements Clarification (USER INTERACTION REQUIRED)
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

1. USE SKILL `requirements-use` (gap_analysis mode). Run all three variants against the inputs and EMIT findings into the phase-owned sections of `<analysis_md_contract>`; the mode is analysis-only and never invents the artifact shape:
   - **Test-cases-vs-API-spec variant** → **Gaps** (`G[N]` entries; test step vs API analysis cross-reference).
   - **General multi-source variant** → **Contradictions** (`C[N]`; cross-source disagreements between raw-data, api-analysis, docs) + **Ambiguities** (`A[N]`; vague statements).
2. Finding-entry shapes (`G[N]` / `C[N]` / `A[N]`, each with verbatim source quote + citation + impact + suggested question) are owned by this phase's `<finding_entry_templates>` below.
3. If a finding fits more than one bucket, record it once under the section that owns its emit shape (G/C/A) and add a cross-reference note rather than duplicating.
4. Prepare a prioritized list of gaps, contradictions, ambiguities for step 3.2.

<finding_entry_templates>

```markdown
### G[N]: [Brief Title]
**Type**: Endpoint / Request / Response / Auth / Test Data / Edge Case
**Context**: [Which test step or endpoint]
**Missing Information**: [What is not specified]
**Impact**: [Why automation is blocked or degraded]
**Suggested Question**: [How to ask for this]

### C[N]: [Brief Title]
**Source 1**: [Test Case / Swagger / Docs] — "[Quote]"
**Source 2**: [Test Case / Swagger / Docs] — "[Quote]"
**Impact**: [Why this matters for test automation]
**Needs Clarification**: [Specific question]

### A[N]: [Brief Title]
**Source**: [Test Case / Docs / Swagger]
**Vague Statement**: "[Quote]"
**Possible Interpretations**: 1. [...] 2. [...]
**Clarification Needed**: [Specific question]
```

Quote source text verbatim; redact credentials/PII in any quoted line before writing it (the gap_analysis mode applies `sensitive-data`).

</finding_entry_templates>
</execute_gap_analysis>

<ask_user step="3.2">
1. USE SKILL `questioning`
2. Present structured questions to user (Critical / Important / Optional)
3. **STOP AND WAIT** for user to provide all answers
4. **Unknown-answer branches by priority:**
   - **Critical unknown:** mark as `BLOCKING ASSUMPTION` in `analysis.md`, stop Phase 3, do not advance to Phase 4 until the user provides an answer or explicitly approves proceeding with the assumption.
   - **Important unknown:** mark as `ASSUMPTION` with rationale, flag in `agents/qa-state.md` under Open Assumptions, proceed.
   - **Optional unknown:** mark as `SKIPPED` with reason, proceed.
   - **Partial answer:** record what was answered; treat the unanswered portion per the matching priority branch above.
   - **User defers / marks out-of-scope:** record as `DEFERRED — user out-of-scope` and treat as Optional (proceed).
</ask_user>

<update_plan step="3.3">
1. Process user answers
2. Update analysis document with questions, answers, and resolved items
3. Verify `agents/qa/{IDENTIFIER}/analysis.md` created with **all required sections** (see `<analysis_md_contract>` below)
</update_plan>

<analysis_md_contract>
`analysis.md` must include these sections in order; missing or empty sections fail validation:

1. **Gaps** — items not covered by raw-data or API analysis (one bullet per gap, with source citation)
2. **Contradictions** — places where raw-data and api-analysis disagree (with both sources cited)
3. **Ambiguities** — wording or behavior open to interpretation
4. **Questions** — full list of structured questions asked (with priority tag: Critical / Important / Optional)
5. **Answers** — user responses; for each, indicate ANSWERED / ASSUMPTION / BLOCKING ASSUMPTION / SKIPPED / DEFERRED per `<ask_user>` step 4
6. **Resolutions** — final disposition for each gap/contradiction/ambiguity (resolved, accepted as assumption, deferred to a later phase)
7. **Open Assumptions** — explicit list of every unresolved item carried forward (mirrors the count in `qa-state.md`)
</analysis_md_contract>

<update_state step="3.4">
1. Update `agents/qa-state.md`:
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
- Cross-reference analysis completed
- All gaps, contradictions, and ambiguities documented
- Questions presented to user
- User answers received and documented
- `analysis.md` created with all 7 sections per `<analysis_md_contract>`
- **Completion invariants (all must hold):** `Questions Asked == Answers Received + Open Assumptions + Skipped + Deferred`; **no Critical question remains in BLOCKING ASSUMPTION state** (any Critical-blocker forces Phase 3 to stay open); `Open Assumptions` count matches the size of the Open Assumptions section in `analysis.md`.
</validation_checklist>

<failure_handling>
- **Missing prerequisite artifact** (`raw-data.md` or `api-analysis.md` absent or empty): stop Phase 3, record `Phase 3 blocked: missing [artifact]` in `agents/qa-state.md`, and ask the user to re-run the producing phase.
- **Zero-doc ACQUIRE** for any of `requirements-use`, `questioning`: apply the parent `qa-flow.md` `<failure_handling>` zero-doc rule (stop, record, ask user).
- **HITL stall** (user unresponsive after Critical question, or refuses to answer a Critical): do **not** auto-promote to assumption. Record `Phase 3 blocked: user-unresponsive on Critical question(s)` in `agents/qa-state.md` and pause; the agent must not advance to Phase 4 silently. Resume only after the user answers, explicitly approves proceeding with a BLOCKING ASSUMPTION, or downgrades the question.
</failure_handling>

</qa_flow_gap_and_requirements_clarification>
