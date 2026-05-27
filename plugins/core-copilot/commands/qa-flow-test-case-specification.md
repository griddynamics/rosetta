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

Create `agents/qa/{IDENTIFIER}/test-specs.md` using the following template:

```markdown
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

[All ATC-NNN specifications for this endpoint]

---

## Test File Mapping
[From skill step 4]

## Shared Utilities
[From skill step 5]

## Execution Order
[From skill step 6]

## Assumptions
[List any assumptions from Phase 3 that affect these specs]
```

</produce_output>

<present_for_approval step="4.4">
1. Present summary to user: total scenarios, priority breakdown, endpoints covered
2. **WAIT FOR USER APPROVAL** — "Yes", "Approve", or similar
3. If user requests modifications: update specs and re-present
4. **DO NOT PROCEED** to Phase 5 without explicit approval
</present_for_approval>

<update_state step="4.5">
1. Update `agents/qa-state.md`:
   - Test Cases Specified: [count]
   - Priority Breakdown: P0: [N], P1: [N], P2: [N], P3: [N]
   - Endpoints Covered: [count]
   - User Approval: [datetime]
   - Phase 4 completion timestamp
2. Mark Phase 4 complete, Phase 5 current
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

</qa_flow_test_case_specification>
