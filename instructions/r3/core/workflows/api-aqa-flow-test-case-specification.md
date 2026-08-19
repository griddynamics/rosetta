---
name: api-aqa-flow-test-case-specification
description: "Phase 4 Test Case Specification of api-aqa-flow (HITL APPROVAL GATE)"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<api_aqa_flow_test_case_specification>

<description_and_purpose>
Convert test cases to implementation-ready Given-When-Then API test specs. User approval required before implementation.
</description_and_purpose>

<workflow_context>
- Phase 4 of 8 in `api-aqa-flow`
- Input: phase 1-3 outputs (raw data, API analysis, gap analysis)
- Output: `plans/api-aqa-{IDENTIFIER}/test-specs.md` with Given-When-Then scenarios, file mapping, shared utilities
- Prerequisite: Phase 3 complete, clarifications received
- HITL: explicit user approval required before Phase 5
- Required skills: `qa-knowledge` (`scenario_design`·test-specs skeleton·ATC conventions), `sensitive-data` (redaction), `qa-structure` (`{IDENTIFIER}`·artifact path)
- Recommended skills: `hitl` (explicit approval)
</workflow_context>

<phase_steps>
1. Load all previous phase outputs
2. Execute test specification authoring
3. Produce test specs document
4. Present for user approval
5. Update state
</phase_steps>

<load_inputs step="4.1">

Read completely:
1. `plans/api-aqa-{IDENTIFIER}/raw-data.md` — test cases & patterns
2. `plans/api-aqa-{IDENTIFIER}/api-analysis.md` — endpoint contracts
3. `plans/api-aqa-{IDENTIFIER}/analysis.md` — clarifications & resolved gaps

</load_inputs>

<execute_authoring step="4.2" subagent="architect" role="Test specification author">

1. USE SKILL `qa-knowledge` (`scenario_design`); all inputs from step 4.1.
2. Redact credentials, tokens, PII, credentialed URLs → USE SKILL `sensitive-data`.

</execute_authoring>

<produce_output step="4.3">

Create `plans/api-aqa-{IDENTIFIER}/test-specs.md` per `qa-knowledge`'s test-spec template.
Sections: Summary · Test Scenarios · Test File Mapping · Shared Utilities · Execution Order · Assumptions.

</produce_output>

<present_for_approval step="4.4">
1. Present summary: total scenarios, priority breakdown, endpoints covered.
2. **Approval gate:** USE SKILL `qa-knowledge` (approval gate); USE SKILL `hitl`.
   Approval = exact token: `approved` / `approve` / `yes` (case-insensitive), scoped to specs.
   No `"or equivalent"` / `"or similar"` extends it.
   Comments, questions, suggestions, edits, partial review = REVIEW ≠ approval.
   Bindings: re-present step = 4.3; full-reject revisit target = Phase 3.
   Partial approve = change request; drop rejected scenarios.
3. **DO NOT PROCEED** to Phase 5 without explicit approval.
</present_for_approval>

<update_state step="4.5">
1. **GATE — before marking complete:**
   Re-run `<validation_checklist>`; confirm every item passes.
   **Every `ATC-NNN` traces to a Phase 3 source.**
   Report `Phase 4 checklist: N/N items satisfied` in chat.
   Do NOT mark complete if any item fails.
2. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`:
   - Test Cases Specified: [count]
   - Priority Breakdown: P0: [N], P1: [N], P2: [N], P3: [N]
   - Endpoints Covered: [count]
   - User Approval: [datetime + exact approval statement]
   - Phase 4 completion timestamp
3. Mark Phase 4 complete, Phase 5 current
</update_state>

<validation_checklist>
- **Every `ATC-NNN` traces to a Phase 3 source** — its `**Source:**` line cites a `raw-data.md` test case (`TC-NNN`) and/or an `analysis.md` finding (`G[N]`/`C[N]`/`A[N]`); no untraceable ATC
- Exact request values specified (no placeholders)
- Exact response assertions defined
- Auth and error scenarios covered
- Explicit user approval received (comments, questions, or suggestions are not approval)
</validation_checklist>

<failure_handling>
- **Missing input** (`raw-data.md`, `api-analysis.md`, `analysis.md` absent/empty):
  record `Phase 4 blocked: missing [artifact]` → `agents/TEMP/<FEATURE>/api-aqa-state.md`; stop, ask re-run producing phase.
- **Unresolved Phase 3 gaps** (`BLOCKING ASSUMPTION` in analysis.md):
  record `Phase 4 blocked: Phase 3 has open Critical questions`; send user to Phase 3.
- **Zero scenarios** (`qa-knowledge` `scenario_design` empty):
  record failure; stop, ask verify inputs, re-run.
- **Repeated rejection (3rd cycle):**
  stop → ask: re-open Phase 3 or escalate scope.
</failure_handling>

</api_aqa_flow_test_case_specification>
