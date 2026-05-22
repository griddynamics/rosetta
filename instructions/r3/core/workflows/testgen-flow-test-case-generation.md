---
name: testgen-flow-test-case-generation
description: Phase 5 of testgen-flow - Generate test cases from requirements document
tags: ["testgen", "phase"]
baseSchema: docs/schemas/phase.md
---

<testgen_flow_test_case_generation>

<description_and_purpose>
Generate comprehensive test cases from the requirements document, covering all requirement types with appropriate test scenarios. Merge redundant cases via parameterization, build coverage matrix.
</description_and_purpose>

<workflow_context>
- Phase 5 of 7 in `testgen-flow`
- Input: `requirements.md` from Phase 4
- Output: `test-scenarios.md` — test cases 
- Skills: `testrail-test-case-authoring`, `testing`
- Prerequisite: Phase 0-4 complete with validated requirements
</workflow_context>

<phase_steps>
1. Load requirements
2. Identify test scenario types per requirement
3. Generate test cases in TestRail format
4. Prioritize test cases
5. Merge redundant test cases
6. Build traceability and coverage
7. Create test cases document
8. Update traceability in requirements
9. Update state file
</phase_steps>

<load_requirements step="5.1">
1. Read `agents/testgen/{TICKET-KEY}/requirements.md`
2. Extract all user stories (US-N), functional requirements (FR-N), non-functional requirements (NFR-N) with acceptance criteria
3. Extract constraints and dependencies that affect test design
</load_requirements>

<identify_test_types step="5.2">
For each requirement, determine test scenario types needed:

- **Happy Path**: primary flow, all valid inputs, all preconditions met
- **Edge Cases**: boundary values (min, max, zero, empty), special characters, large data sets
- **Negative Tests**: invalid inputs, missing required fields, unauthorized access, timeouts
- **Integration Tests**: external system interactions, API calls, database operations
- **Performance Tests** (for NFRs): load, stress, concurrent users, response time
- **Security Tests** (for security NFRs): auth failures, authorization violations, injection, XSS

Common patterns for minimum coverage:

**CRUD Operations** (4+ scenarios):
- Create with valid data (Happy Path)
- Read existing record (Happy Path)
- Update existing record (Happy Path)
- Delete record (Happy Path)
- Create with invalid data (Negative)
- Read/Update/Delete non-existent record (Negative)

**Authentication** (5+ scenarios):
- Login with valid credentials (Happy Path)
- Login with invalid password (Negative)
- Login with non-existent user (Negative)
- Login after account locked (Negative)
- Logout successfully (Happy Path)

**API Calls** (4+ scenarios):
- Successful request with valid data (Happy Path)
- Request with invalid data (Negative)
- Request with missing auth token (Negative)
- Request with network timeout (Negative)
</identify_test_types>

<generate_test_cases step="5.3" subagent="engineer" role="Test case design engineer">
1. USE SKILL `testrail-test-case-authoring` for test case format
2. Create 2-5 test cases per requirement covering different test types from step 5.2
</generate_test_cases>

<prioritize step="5.4">
Assign priority to each test case:

- **P0 (Critical)**: core business functionality, auth/authorization, data integrity, payments, security, compliance
- **P1 (High)**: major features, common workflows, data validation, error handling, integration points
- **P2 (Medium)**: secondary features, edge cases, performance optimizations, UI/UX
- **P3 (Low)**: minor features, rare edge cases, cosmetic issues
</prioritize>

<merge_redundant step="5.5">
Scan all test cases for redundancy and merge to reduce maintenance.

**Pattern 1: Same Steps, Different Roles**
- 3+ test cases with identical steps but different user roles
- Merge into 1 parameterized test case with role as parameter

**Pattern 2: Same Steps, Different Input Values**
- 3+ test cases testing same functionality with different input data
- Merge into 1 parameterized test case with input table

**Pattern 3: Same Steps, Different Error Messages**
- 3+ test cases testing same validation with different invalid inputs
- Merge into 1 parameterized test case with input/error pairs

**Pattern 4: Same Steps, Different Entities**
- Test cases repeating for "Create X", "Edit X", "Delete X"
- Consider entity type as parameter if steps are similar

**Merging rules**:
- Only merge if steps are 80%+ identical
- Keep separate if expected results significantly differ
- Keep separate if complexity increases too much when merged
- Maximum 5 parameter sets per merged test case (split if more)

**After merging**: renumber test cases (TC-001, TC-002...), update coverage matrix
**Target reduction**: ~30-50% fewer test cases

**Before (redundant)**:
```
TC-001: Admin cannot create Job Post
TC-002: Manager cannot create Job Post
TC-003: Viewer cannot create Job Post
```
**After (merged)**: single TC-001 with role as parameter (see `testrail-test-case-authoring` skill for format example)
</merge_redundant>

<build_traceability step="5.6">
1. Link every test case back to its source requirement (US-N, FR-N, NFR-N)
2. Build coverage matrix: every requirement must have at least 1 test case
3. Flag any requirements without test coverage

```markdown
## Coverage Matrix

| Requirement | Test Case IDs | Count | Status |
|-------------|---------------|-------|--------|
| US-1 | TC-001, TC-002, TC-003 | 3 | Covered |
| FR-1 | TC-001, TC-002, TC-003, TC-006 | 4 | Covered |
| NFR-1 | TC-020 | 1 | Covered |
```
</build_traceability>

<create_test_document step="5.7">
1. Create `agents/testgen/{TICKET-KEY}/test-scenarios.md` with this structure:

```markdown
# Test Cases - [TICKET-KEY]

**Generated**: [DateTime]
**Phase**: 5 - Test Case Generation
**Jira Ticket**: [KEY] - [Summary]
---

## Executive Summary

**Total Test Cases**: [Count]
**Merged/Optimized**: [Original count] → [Final count] (reduced by [%])
**Coverage**: [X] user stories, [Y] FRs, [Z] NFRs covered

**Priority Breakdown**:
- P0 (Critical): [Count]
- P1 (High): [Count]
- P2 (Medium): [Count]
- P3 (Low): [Count]

**Test Types**:
- Happy Path: [Count]
- Edge Cases: [Count]
- Negative Tests: [Count]
- Integration: [Count]
- Performance: [Count]
- Security: [Count]

**Parameterized Test Cases**: [Count]

---

## Priority 0 Test Cases (Critical)
[TC entries using testrail-test-case-authoring format]

## Priority 1 Test Cases (High)
[TC entries]

## Priority 2 Test Cases (Medium)
[TC entries]

## Priority 3 Test Cases (Low)
[TC entries]

---

## Coverage Matrix
[Table from step 5.6]

## Appendices
- Merged Test Cases Log (original IDs → merged ID → reason)
- Known Limitations
```
</create_test_document>

<update_traceability step="5.8">
1. Update `agents/testgen/{TICKET-KEY}/requirements.md` traceability matrix with test case IDs
</update_traceability>

<update_state step="5.9">
1. Update `agents/testgen/{TICKET-KEY}/testgen-state.md` with Phase 5 complete and metrics (total test cases, merged count, priority breakdown, coverage)
2. Tell user: "Phase 5 complete. Generated [X] test cases ([Y] merged for efficiency). All requirements covered."
3. Ask: "Ready to proceed to Phase 6 (TestRail Export)?"
</update_state>

<validation_checklist>
- `test-scenarios.md` created
- At least 10 test cases defined (typical: 15-40 before merging, 10-25 after)
- Redundant test cases merged with parameterized test data
- Each requirement has at least 1 test case
- Priority distribution reasonable (more P0/P1 than P2/P3)
- Coverage matrix shows all requirements covered
- Traceability matrix in requirements.md updated with test IDs
- State file updated with Phase 5 complete
</validation_checklist>

<pitfalls>
- Don't generate test cases without covering all requirement types (happy path alone is insufficient)
- Don't skip merging — duplicate test cases with same steps but different inputs must be parameterized
- Ensure every requirement has at least 1 test case — check coverage matrix before completing
</pitfalls>

</testgen_flow_test_case_generation>
