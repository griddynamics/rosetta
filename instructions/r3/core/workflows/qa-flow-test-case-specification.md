---
name: qa-flow-test-case-specification
description: Phase 4 of QA workflow - Detailed API Test Case Specification (HITL APPROVAL GATE)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_test_case_specification>

<description_and_purpose>
Convert test cases into detailed, implementation-ready API test specifications using Given-When-Then format. User approval required before implementation.
</description_and_purpose>

<workflow_context>
- Phase 4 of 8 in `qa-flow`
- Input: all phase 1-3 outputs (raw data, API analysis, gap analysis)
- Output: `agents/qa/{IDENTIFIER}/test-specs.md` with Given-When-Then scenarios, file mapping, shared utilities
- Prerequisite: Phase 3 complete, all user clarifications received
- HITL: explicit user approval required before Phase 5
- Skills: `scenarios-generation` (gwt_spec mode), `sensitive-data` (redaction), `qa-structure` (`{IDENTIFIER}` + artifact path), `qa-knowledge` (test-specs skeleton + ATC conventions)
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
1. `agents/qa/{IDENTIFIER}/raw-data.md` — original test cases and patterns
2. `agents/qa/{IDENTIFIER}/api-analysis.md` — endpoint contracts
3. `agents/qa/{IDENTIFIER}/analysis.md` — clarifications and resolved gaps

</load_inputs>

<execute_authoring step="4.2" subagent="architect" role="Test specification author">

1. **ACQUIRE `qa-knowledge/assets/test-spec-template.md` FROM KB first** — the `architect` subagent must load the skeleton it emits into. Then USE SKILL `scenarios-generation` (gwt_spec mode) with all loaded inputs from step 4.1. This phase OWNS the output contract — the spec artifact section list (the `qa-knowledge/assets/test-spec-template.md` asset) and the file-mapping / shared-utilities / execution-order sections — and the scenario taxonomy; the skill EMITS Given-When-Then ATC entries into them.
2. Redact any captured credentials, tokens, PII, or credentialed URLs in the emitted spec → USE SKILL `sensitive-data`.
3. The skill produces: test scenarios, GWT specs, file mapping, shared utilities, execution order.

</execute_authoring>

<produce_output step="4.3">

**Before presenting:** every item in `<validation_checklist>` below must be satisfied for the produced file. Items that are not yet verifiable at this step (e.g., user approval) are checked at step 4.5.

Create `agents/qa/{IDENTIFIER}/test-specs.md` per the asset `qa-knowledge/assets/test-spec-template.md` (ACQUIRE FROM KB) — it carries the full skeleton: Summary, Test Scenarios (per-endpoint `ATC-NNN` Given-When-Then with a worked example), Test File Mapping, Shared Utilities, Execution Order, Assumptions.

</produce_output>

<present_for_approval step="4.4">
1. Present summary to user: total scenarios, priority breakdown, endpoints covered.
2. **Approval gate:** ACQUIRE `qa-knowledge/assets/approval-gate.md` FROM KB and apply it (closed-token discipline · loose-phrasing rejection · max-retry escalation · partial approval · change/reject handling). Bindings: closed token list = `approved` / `approve` / `yes`; re-present step = 4.3; full-reject revisit target = Phase 3 (revisit gap analysis). Treat partial approve as a change request that drops the rejected scenarios. Proceed to step 4.5 only on an exact token match; the token list is this phase's authoritative specialization.
3. **DO NOT PROCEED** to Phase 5 without an exact approval token.
</present_for_approval>

<update_state step="4.5">
1. **GATE — before marking complete:** re-run `<validation_checklist>` and confirm every item is checked off — **in particular that every `ATC-NNN` traces to a Phase 3 requirement/source** (`test-specs.md` is Phase 5's contract; an untraceable ATC means Phase 5 implements unverifiable tests). Report `Phase 4 checklist: N/N items satisfied` in chat. Do NOT mark complete if any item fails.
2. Update `agents/qa-state.md`:
   - Test Cases Specified: [count]
   - Priority Breakdown: P0: [N], P1: [N], P2: [N], P3: [N]
   - Endpoints Covered: [count]
   - User Approval: [datetime]
   - Phase 4 completion timestamp
3. Mark Phase 4 complete, Phase 5 current
</update_state>

<validation_checklist>
- All source test cases converted to detailed specifications
- Given-When-Then format used for every scenario
- **Every `ATC-NNN` traces to a Phase 3 requirement/source** — its `**Source:**` line cites a `raw-data.md` test case and/or an `analysis.md` requirement ID; no untraceable ATC
- Exact request values specified (no placeholders)
- Exact response assertions defined
- Auth and error scenarios covered
- Test file mapping defined
- Shared utilities identified
- User approval received
</validation_checklist>

<failure_handling>
- **Missing input file** (`raw-data.md`, `api-analysis.md`, or `analysis.md` absent or empty): stop Phase 4, record `Phase 4 blocked: missing [artifact]` in `agents/qa-state.md`, ask user to re-run the producing phase.
- **Unresolved Phase 3 gaps** (analysis.md still has `BLOCKING ASSUMPTION` entries): stop, record `Phase 4 blocked: Phase 3 has open Critical questions`, send user back to Phase 3.
- **Skill produces zero scenarios** (`scenarios-generation` returns empty): stop, record skill failure, ask user to verify inputs and re-run.
- **Repeated rejection cycle:** after the 3rd cycle of reject-and-re-present per `<present_for_approval>` step 3, stop and ask the user whether to re-open Phase 3 or escalate scope.
</failure_handling>

</qa_flow_test_case_specification>
