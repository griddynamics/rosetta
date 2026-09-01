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
Convert test cases into detailed, implementation-ready API test specifications using Given-When-Then format. User approval required before implementation.
</description_and_purpose>

<workflow_context>
- Phase 4 of 8 in `api-aqa-flow`
- Input: all phase 1-3 outputs (raw data, API analysis, gap analysis)
- Output: `plans/api-aqa-{IDENTIFIER}/test-specs.md` with Given-When-Then scenarios, file mapping, shared utilities
- Prerequisite: Phase 3 complete, all user clarifications received
- HITL: explicit user approval required before Phase 5
- Required skills: `qa-knowledge` (`scenario_design` mode + test-specs skeleton + ATC conventions), `sensitive-data` (redaction), `qa-structure` (`{IDENTIFIER}` + artifact path)
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
1. `plans/api-aqa-{IDENTIFIER}/raw-data.md` — original test cases and patterns
2. `plans/api-aqa-{IDENTIFIER}/api-analysis.md` — endpoint contracts
3. `plans/api-aqa-{IDENTIFIER}/analysis.md` — clarifications and resolved gaps

</load_inputs>

<execute_authoring step="4.2" subagent="architect" role="Test specification author">

1. USE SKILL `qa-knowledge` (`scenario_design` mode) with all loaded inputs from step 4.1. This phase OWNS the output contract — the spec artifact shape is `qa-knowledge`'s test-spec template (the skill loads its own asset) plus the file-mapping / shared-utilities / execution-order sections; the mode EMITS Given-When-Then ATC entries into them per its GWT-spec taxonomy and process.
2. Redact any captured credentials, tokens, PII, or credentialed URLs in the emitted spec → USE SKILL `sensitive-data`.
3. The mode produces: test scenarios, GWT specs, file mapping, shared utilities, execution order.

</execute_authoring>

<produce_output step="4.3">

**Before presenting:** every item in `<validation_checklist>` below must be satisfied for the produced file. Items that are not yet verifiable at this step (e.g., user approval) are checked at step 4.5.

Create `plans/api-aqa-{IDENTIFIER}/test-specs.md` per `qa-knowledge`'s test-spec template — it carries the full skeleton: Summary, Test Scenarios (per-endpoint `ATC-NNN` Given-When-Then with a worked example), Test File Mapping, Shared Utilities, Execution Order, Assumptions.

</produce_output>

<present_for_approval step="4.4">
1. Present summary to user: total scenarios, priority breakdown, endpoints covered.
2. **Approval gate:** USE SKILL `qa-knowledge` to run its shared approval gate; USE SKILL `hitl`. Approval = an exact token from the closed list `approved` / `approve` / `yes` (case-insensitive), scoped to the presented specs — no `"or equivalent"` / `"or similar"` phrasing extends it. Comments, questions, suggestions, edits, and partial review are REVIEW, not approval. Bindings: re-present step = 4.3; full-reject revisit target = Phase 3. Treat partial approve as a change request that drops the rejected scenarios.
3. **DO NOT PROCEED** to Phase 5 without explicit approval.
</present_for_approval>

<update_state step="4.5">
1. **GATE — before marking complete:** re-run `<validation_checklist>` and confirm every item is checked off — **in particular that every `ATC-NNN` traces to a Phase 3 source** (`test-specs.md` is Phase 5's contract; an untraceable ATC means Phase 5 implements unverifiable tests). Report `Phase 4 checklist: N/N items satisfied` in chat. Do NOT mark complete if any item fails.
2. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`:
   - Test Cases Specified: [count]
   - Priority Breakdown: P0: [N], P1: [N], P2: [N], P3: [N]
   - Endpoints Covered: [count]
   - User Approval: [datetime + exact approval statement]
   - Phase 4 completion timestamp
3. Mark Phase 4 complete, Phase 5 current
</update_state>

<validation_checklist>
- All source test cases converted to detailed specifications
- Given-When-Then format used for every scenario
- **Every `ATC-NNN` traces to a Phase 3 source** — its `**Source:**` line cites a `raw-data.md` test case (`TC-NNN`) and/or an `analysis.md` finding (`G[N]`/`C[N]`/`A[N]`); no untraceable ATC
- Exact request values specified (no placeholders)
- Exact response assertions defined
- Auth and error scenarios covered
- Test file mapping defined
- Shared utilities identified
- Explicit user approval received (comments, questions, or suggestions are not approval)
</validation_checklist>

<failure_handling>
- **Missing input file** (`raw-data.md`, `api-analysis.md`, or `analysis.md` absent or empty): stop Phase 4, record `Phase 4 blocked: missing [artifact]` in `agents/TEMP/<FEATURE>/api-aqa-state.md`, ask user to re-run the producing phase.
- **Unresolved Phase 3 gaps** (analysis.md still has `BLOCKING ASSUMPTION` entries): stop, record `Phase 4 blocked: Phase 3 has open Critical questions`, send user back to Phase 3.
- **Mode produces zero scenarios** (`qa-knowledge` scenario_design returns empty): stop, record the failure, ask user to verify inputs and re-run.
- **Repeated rejection cycle:** after the 3rd cycle of reject-and-re-present per `<present_for_approval>` step 3, stop and ask the user whether to re-open Phase 3 or escalate scope.
</failure_handling>

</api_aqa_flow_test_case_specification>
