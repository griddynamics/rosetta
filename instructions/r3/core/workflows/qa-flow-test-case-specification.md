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

<execute_authoring step="4.2" subagent="architect" role="API test specification author">

1. USE SKILL `api-test-spec-authoring` with all loaded inputs from step 4.1
2. The skill generates: test scenarios, GWT specs, file mapping, shared utilities, execution order

</execute_authoring>

<produce_output step="4.3">

**Before presenting:** every item in `<validation_checklist>` below must be satisfied for the produced file. Items that are not yet verifiable at this step (e.g., user approval) are checked at step 4.5.

Create `agents/qa/{IDENTIFIER}/test-specs.md` using the following template (outer fence uses 4 backticks so the inner `markdown` example with 3 backticks does not terminate it):

````markdown
# QA Test Specifications - [IDENTIFIER]

**Created**: [DateTime]
**Phase**: 4 - Test Case Specification
**Source Test Cases**: [List source references]

---

## Summary

- **Total Test Scenarios**: [Count]
- **Priority Breakdown**: P0: [N], P1: [N], P2: [N], P3: [N]
- **Type Breakdown**: Happy Path: [N], Negative: [N], Auth: [N], Edge Case: [N]
- **Endpoints Covered**: [Count]
- **Test Files Planned**: [Count]

---

## Test Scenarios

### Endpoint: [METHOD] [PATH]

[All ATC-NNN specifications for this endpoint — one per scenario]

**ATC-NNN naming:** `ATC` = API Test Case, `NNN` = zero-padded sequence (`ATC-001`, `ATC-002`, …). Use a continuous sequence across all endpoints in this file.

**Worked example of one ATC-NNN GWT specification:**

```markdown
#### ATC-001: GET /api/v1/orders/{orderId} returns order when ID exists

**Priority:** P0  **Type:** Happy Path  **Source:** TC-42 (raw-data.md), FR-7 (analysis.md)

**Given:**
- Authenticated user with role `customer`
- Order `o-12345` exists in the system with status `PAID`, customer_id matches authenticated user

**When:**
- `GET /api/v1/orders/o-12345`
- Headers: `Authorization: Bearer <token>`, `Accept: application/json`
- Body: (none)

**Then:**
- Status: `200 OK`
- Response body matches schema `Order` (per api-analysis.md)
- `body.id == "o-12345"`
- `body.status == "PAID"`
- `body.customer_id == <authenticated user id>`
- Response time < 500ms (NFR target from analysis.md)
```

---

## Test File Mapping
**Required content:** for each ATC-NNN, the planned target test file (e.g., `tests/api/orders.test.js`), the test name (function/describe block), and any reusable fixtures. One row per ATC-NNN.

## Shared Utilities
**Required content:** auth helpers, request builders, response validators, data factories, and teardown utilities to be created or reused. List each with its purpose and target file path.

## Execution Order
**Required content:** ordered list of test groups including any dependencies (e.g., create-then-read flows must run sequentially). Mark each as independent / sequential / setup-required.

## Assumptions
List any assumptions from Phase 3 that affect these specs **plus any new assumptions introduced during specification** (e.g., guessed boundary values, default headers, fixture sizes). Cite source for each.
````

</produce_output>

<present_for_approval step="4.4">
1. Present summary to user: total scenarios, priority breakdown, endpoints covered
2. **WAIT FOR USER APPROVAL** — "Yes", "Approve", or similar
3. **User response branches** (mutually exclusive; classify the user's response into exactly one):
   - **Full approve:** user types an exact approval token (per the strict-token rule shared with step 7.2). Proceed to step 4.5.
   - **Full reject:** user rejects the entire plan with no path to fix in-place. Record rationale in `agents/qa-state.md`, return to Phase 3 to revisit gap analysis.
   - **Change request** (covers all in-place changes — modify wording, add scenarios, drop scenarios, partial scope narrowing): collect every requested change in one batch, update specs, re-present from step 4.3. Treat partial approve as a change request that drops the rejected scenarios.
   - **Repeated change-request cycle (≥3 cycles on overlapping scope):** stop, ask user whether to re-open Phase 3 or escalate scope to a project decision.
4. **DO NOT PROCEED** to Phase 5 without explicit approval.
</present_for_approval>

<update_state step="4.5">
1. **Before marking complete:** re-run `<validation_checklist>` and confirm every item is checked off (the agent must report `Phase 4 checklist: N/N items satisfied` in chat output).
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
- **Skill produces zero scenarios** (api-test-spec-authoring returns empty): stop, record skill failure, ask user to verify inputs and re-run.
- **Repeated rejection cycle:** after the 3rd cycle of reject-and-re-present per `<present_for_approval>` step 3, stop and ask the user whether to re-open Phase 3 or escalate scope.
</failure_handling>

</qa_flow_test_case_specification>
