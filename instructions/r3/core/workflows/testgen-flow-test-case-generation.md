---
name: testgen-flow-test-case-generation
description: "Phase 5 Test Case Generation of testgen-flow"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
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
- Required skills: `qa-knowledge` (`scenario_design` mode + config-resolved TMS FORMAT binding)
- Recommended skills: `coding` (for any tracked write outside the ticket folder; read repo standards as authority)
- Prerequisite: Phase 0-4 complete with validated requirements
</workflow_context>

<phase_steps>
1. Load requirements
2. Identify test scenario types per requirement
3. Generate test cases in TMS format
4. Prioritize test cases
5. Merge redundant test cases
6. Build traceability and coverage
7. Create test cases document
8. Update traceability in requirements
9. Update state file
</phase_steps>

<load_requirements step="5.1">
1. Read `plans/testgen-{TICKET-KEY}/requirements.md`
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

**Scope guard:** generate **Performance** and **Security** test types ONLY when the requirements / NFRs specify a constraint in that category — never invent injection / XSS / load tests without a source requirement (mirrors the Phase 4 NFR coverage-discipline: cover only what the sources specify, do not pad).

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

**Resolve the TMS FORMAT provider first** (merge evidence — do NOT hardcode the vendor): read the TMS provider from `plans/testgen-{TICKET-KEY}/testgen-project-config.md` (data sources / provider fields written by Phase 0, prefilled from `gain.json` `sdlc.test_management(_project)`), explicit user input (wins for this run), or a recognizable TMS URL/handle; conflicting evidence → ask about the TMS only. The resolved provider (e.g. `testrail`, the canonical example) is passed to `qa-knowledge` (`scenario_design` mode) for the vendor-specific case format (the skill loads its own `<vendor>-format` binding internally). If no provider resolves but a TMS is clearly in scope, re-read config; if still absent, fall back to the inline `<tc_schema>` template below (record the fallback per `<failure_handling>`).

1. USE SKILL `qa-knowledge` (`scenario_design` mode) passing the resolved TMS provider for the test case format.
2. Create 2-5 test cases per requirement covering different test types from step 5.2.
3. Apply `<format_rules>` (forbidden fields), `<tc_schema>` (field-level template), and `<title_quality>` (naming) sub-blocks below.

<format_rules>
**Single source of truth for TMS-compatibility constraints** — referenced by `<tc_schema>` Notes, `<validation_checklist>`, and `<pitfalls>`; do not restate elsewhere.

Test cases MUST use the **`Steps + Expected Result`** shape so they map cleanly to the TMS's separated steps/expected fields used by Phase 6 export (TestRail's `custom_steps_separated` / `custom_expected` are the canonical example).

**NOT permitted** (each breaks Phase 6 export — re-grep `test-scenarios.md` per `<validation_checklist>`):
- BDD / Gherkin / Given-When-Then format — `Given `, `When `, `Then ` step shapes
- `Post-conditions` field — encode teardown into the test framework or note residual side effects in Expected Result
- `Automation` field — automation status is TMS metadata or framework concern, not part of the case body

The `qa-knowledge` scenario_design FORMAT binding enforces these on the normal path; the rules are restated here once so they survive when the skill cannot load.
</format_rules>

<tc_schema>
Every test case (TC-NNN) MUST have these fields, in this order. If the `qa-knowledge` scenario_design mode (or its resolved FORMAT binding) is unavailable or returns an incompatible shape, use this template so Phase 5 output is self-contained:

```markdown
### TC-NNN: [Concise test case title]

**Priority:** P0 | P1 | P2 | P3
**Type:** Happy Path | Edge Case | Negative | Integration | Performance | Security
**Source Requirement(s):** US-N, FR-N, NFR-N (one or more)

**Preconditions:**
- [Precondition 1]
- [Precondition 2]

**Test Data:**
| Field | Value | Notes |
|-------|-------|-------|
| [field] | [value] | [optional notes] |

**Steps:**
1. [Action] → [observable system response]
2. [Action] → [observable system response]
3. [Action] → [observable system response]

**Expected Result:**
- [Specific, observable, testable outcome — concrete values, not "works correctly"]

**Tags / Suite:** [optional taxonomy hooks for TMS]
```

**Notes:**
- `TC-NNN` is a continuous zero-padded sequence across the whole `test-scenarios.md` file (`TC-001`, `TC-002`, …).
- "Steps" must be observable user/system actions paired with observable responses — not paraphrased intent.
- "Expected Result" must be objectively verifiable; avoid "should work", "as expected", "appropriate response".
- Forbidden fields + step shapes: see `<format_rules>` (single SSoT).
</tc_schema>

<title_quality>
Titles must be specific enough that a reader can guess scope without opening the case:

| Good (specific) | Bad (vague) |
|---|---|
| `User Login with Valid Credentials (Happy Path)` | `Test Login` |
| `User Login Fails on 6th Wrong Password (Lockout)` | `Check Login` |
| `Search Returns Results for Partial Match` | `Check Search` |
| `Create Order with Out-of-Stock Item (Negative)` | `Test Order` |

**Anti-pattern:** multiple TCs with identical steps differing only by role or input value → merge per step 5.5 (role/input becomes a parameter), do not split into separate TCs.
</title_quality>
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
**After (merged)**: single TC-001 with role as parameter (see the `qa-knowledge` scenario_design FORMAT binding for the parameterized format example)
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
**Write scope:** default outputs stay under `plans/testgen-{TICKET-KEY}/` (`test-scenarios.md` here, the `requirements.md` traceability update in step 5.8) — no `coding` activation needed; record `coding: skipped — writes scoped to plans/testgen-{TICKET-KEY}/` in `testgen-state.md`. Any write outside that folder → USE SKILL `coding` first, per `testgen-flow.md` `<phase_5_6_standards_gate>`.

1. Create `plans/testgen-{TICKET-KEY}/test-scenarios.md` with this structure:

```markdown
# Test Cases - [TICKET-KEY]

**Generated**: [DateTime]
**Phase**: 5 - Test Case Generation
**Ticket**: [KEY] - [Summary]
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
[TC entries per `<tc_schema>` — or the resolved FORMAT-binding case format when the `qa-knowledge` scenario_design mode loaded; `<tc_schema>` is the normative fallback shape]

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
1. Update `plans/testgen-{TICKET-KEY}/requirements.md` traceability matrix with test case IDs
</update_traceability>

<update_state step="5.9">
1. Update `plans/testgen-{TICKET-KEY}/testgen-state.md` with Phase 5 complete and metrics (total test cases, merged count, priority breakdown, coverage)
2. Tell user: "Phase 5 complete. Generated [X] test cases ([Y] merged for efficiency). All requirements covered."
3. Ask: "Please review `test-scenarios.md`. Ready to proceed to Phase 6 (TMS Export)?"
4. **STOP AND WAIT for explicit user confirmation. DO NOT PROCEED to Phase 6 until the user confirms.** Only an exact confirmation token (`yes` / `proceed`) unblocks Phase 6 — no `"or equivalent"` / `"or similar"` phrasing extends it; treat ambiguous responses (questions, suggestions, silence) as not confirmed and re-ask. This is a **priority-(3) per-phase confirmation** per `testgen-flow.md` `<orchestration_and_escalation>`.
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
- **Format compliance** per `<format_rules>` — re-grep `test-scenarios.md` for `Given `/`When `/`Then `/`**Post-conditions**:`/`**Automation**:`; any hit is a Phase-6-breaking defect.
- **Title quality** per `<title_quality>` — no vague titles (`Test X` / `Check Y` / `Verify Z`). Spot-check P2/P3 cases where vague titles tend to slip in.
</validation_checklist>

<failure_handling>
- **`requirements.md` unusable** (absent / empty / no `## ` section headings / unreadable / zero `US-N`-`FR-N`-`NFR-N` entries): stop Phase 5 and record the specific reason in `testgen-state.md` (`Phase 5 blocked: requirements.md <missing|empty|unreadable|zero testable requirements> at <path>`). Route: missing/empty/unreadable → ask the user to rerun Phase 4 (or inspect the file on an IO/parse error); zero testable requirements → surface as a Critical question (`No requirements to generate test cases from — should Phase 4 re-run, or is the ticket genuinely out-of-scope for test coverage?`). Do NOT fabricate test cases from raw-data.md / analysis.md / answers.md (upstream inputs, not Phase 5's authoritative source) and do NOT emit a `test-scenarios.md` with zero TCs and call the phase done.
- **Skill execution failure** (the `qa-knowledge` scenario_design mode / its resolved FORMAT binding errors, returns empty, or returns an incompatible shape; OR no FORMAT vendor resolvable from config): fall back to the inline `<tc_schema>` template in step 5.3. Record `Phase 5 note: scenario_design fallback applied — used inline tc_schema` in `testgen-state.md`. Continue Phase 5.
- **Output write failure** (`test-scenarios.md` unwritable — permission denied, disk full): pause, report the filesystem error with the file path, do NOT mark Phase 5 complete.
- **Coverage gap surfaced by step 5.6** (some requirement has zero test cases after step 5.3 + step 5.5): per step 5.6 — flag in the coverage matrix and surface to the user, do NOT silently skip the requirement.
</failure_handling>

<pitfalls>
- Happy-path-only coverage → `<identify_test_types>` step 5.2 minimum-coverage patterns.
- Skipping the merge pass → `<merge_redundant>` step 5.5.
- Requirement without a TC → `<build_traceability>` step 5.6 coverage matrix.
- BDD / Given-When-Then or forbidden fields (`Post-conditions` / `Automation`) → `<format_rules>` (single SSoT).
- Vague TC titles → `<title_quality>` good-vs-bad table.
</pitfalls>

</testgen_flow_test_case_generation>
