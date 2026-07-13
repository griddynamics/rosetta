---
name: testgen-flow-test-case-generation
description: "Phase 5 Test Case Generation of testgen-flow"
alwaysApply: false
user-invocable: false
baseSchema: docs/schemas/phase.md
---

# Test Generation Phase 5: Test Case Generation

## Prerequisites

- Phase 0 MUST be complete
- Phase 1 MUST be complete
- Phase 2 MUST be complete
- Phase 3 MUST be complete
- Phase 4 MUST be complete
- `agents/testgen/{TICKET-KEY}/requirements.md` exists with validated requirements
- `agents/testgen/{TICKET-KEY}/testgen-state.md` shows Phase 4 complete

## Objective

Generate comprehensive test scenarios in Given-When-Then format from requirements document to enable test automation and quality assurance.

## Requirements

### Step 1: Load Requirements

Read `agents/testgen/{TICKET-KEY}/requirements.md` completely.

Extract:
- All user stories (US-1, US-2, ...)
- All functional requirements (FR-1, FR-2, ...)
- All non-functional requirements (NFR-1, NFR-2, ...)
- Acceptance criteria for each
- Constraints and dependencies

### Step 2: Identify Test Scenario Types

For each requirement, determine test scenario types needed:

**Happy Path**:
- Primary flow, all valid inputs
- Expected normal usage
- All preconditions met

**Edge Cases**:
- Boundary values (min, max, zero, empty)
- Special characters
- Large data sets
- Long strings
- Multiple items

**Negative Tests**:
- Invalid inputs
- Missing required fields
- Unauthorized access
- Network failures
- Timeout scenarios

**Integration Tests**:
- External system interactions
- API calls
- Database operations
- Third-party services

**Performance Tests** (for NFRs):
- Load testing
- Stress testing
- Concurrent users
- Response time verification

**Security Tests** (for security NFRs):
- Authentication failures
- Authorization violations
- SQL injection
- XSS attacks
- CSRF protection

### Step 3: Generate Test Cases (TestRail Format)

For each requirement, create 2-5 test cases covering different types.

**Test Case Template** (TestRail-compatible):
```markdown
### TC-[N]: [Test Case Title]
**Related Requirement**: [US-X / FR-X / NFR-X]
**Type**: Happy Path / Edge Case / Negative / Integration / Performance / Security
**Priority**: P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)

**Preconditions**:
- [Setup requirement 1]
- [Setup requirement 2]
- [For parameterized tests]: Execute this test case [N] times with different parameters (see Test Data)

**Steps**:
1. [Action step 1]
2. [Action step 2]
3. [Action step 3]

**Expected Results**:
- After step 1: [Expected outcome]
- After step 2: [Expected outcome]
- After step 3: [Expected outcome]

**Test Data**:
| Parameter | Value 1 | Value 2 | Value 3 |
|-----------|---------|---------|---------|
| [Param 1] | [Val]   | [Val]   | [Val]   |
| [Param 2] | [Val]   | [Val]   | [Val]   |

**Notes**:
[Additional context, edge cases, or clarifications]
```

**IMPORTANT: Merge Redundant Test Cases**

If multiple test cases have:
- Same steps
- Same expected results
- Only difference is input data or user role

**Merge into ONE test case** with:
- Parameterized test data table
- Precondition stating: "Execute this test case with each parameter set"

**Example - BEFORE (Redundant)**:
```
TC-001: Admin cannot create Job Post
TC-002: Manager cannot create Job Post  
TC-003: Viewer cannot create Job Post
```

**Example - AFTER (Merged)**:
```
TC-001: Unauthorized roles cannot create Job Post

Preconditions:
- User is logged in with one of the unauthorized roles (see Test Data)
- Execute this test case 3 times, once for each role

Test Data:
| Role    | Expected Error Message |
|---------|------------------------|
| Admin   | "Insufficient permissions" |
| Manager | "Insufficient permissions" |
| Viewer  | "Insufficient permissions" |

Steps:
1. Navigate to Job Post creation page
2. Attempt to create a new Job Post
3. Observe system response

Expected Results:
- After step 1: Page loads or access denied based on role
- After step 2: Creation attempt rejected
- After step 3: Error message displayed as per Test Data table
```

### Step 4: Prioritize Test Scenarios

Assign priority based on:

**P0 (Critical)**:
- Core business functionality
- User authentication/authorization
- Data integrity
- Payment/financial transactions
- Security vulnerabilities
- Compliance requirements

**P1 (High)**:
- Major features
- Common user workflows
- Data validation
- Error handling
- Integration points

**P2 (Medium)**:
- Secondary features
- Edge cases
- Nice-to-have functionality
- Performance optimizations
- UI/UX improvements

**P3 (Low)**:
- Minor features
- Rare edge cases
- Future enhancements
- Cosmetic issues

### Step 5: Identify Redundant Test Cases for Merging

**Scan all generated test cases** for redundancy patterns:

**Pattern 1: Same Steps, Different Roles**
- If 3+ test cases have identical steps but different user roles
- Merge into 1 parameterized test case with role as parameter

**Pattern 2: Same Steps, Different Input Values**
- If 3+ test cases test same functionality with different input data
- Merge into 1 parameterized test case with input table

**Pattern 3: Same Steps, Different Error Messages**
- If 3+ test cases test same validation with different invalid inputs
- Merge into 1 parameterized test case with input/error pairs

**Pattern 4: Same Steps, Different Entities**
- If test cases repeat for "Create Job Post", "Edit Job Post", "Delete Job Post"
- Consider if they can share test case with entity type as parameter

**Merging Rules**:
- Only merge if steps are 80%+ identical
- Keep separate if expected results significantly differ
- Keep separate if test complexity increases too much when merged
- Maximum 5 parameter sets per merged test case (split if more)

**After merging**:
- Renumber test cases (TC-001, TC-002, etc.)
- Update coverage matrix
- Reduce total test case count by ~30-50%

### Step 6: Link to Requirements

Create traceability from scenarios back to requirements:

```markdown
**Traceability**:
- **User Story**: US-[N]
- **Acceptance Criterion**: AC[N]
- **Functional Requirement**: FR-[N]
- **Non-Functional Requirement**: NFR-[N] (if applicable)
```

### Step 7: Create Test Cases Document (TestRail Export Ready)

**File**: `agents/testgen/{TICKET-KEY}/test-scenarios.md`

**Format**:
```markdown
# Test Cases - [TICKET-KEY]

**Generated**: [DateTime]
**Phase**: 5 - Test Case Generation
**Jira Ticket**: [KEY] - [Summary]
**Status**: READY FOR TESTRAIL IMPORT
**Format**: TestRail-compatible

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | AI Agent | Initial generation from requirements |

---

## Executive Summary

**Total Test Cases**: [Count]
**Merged/Optimized**: [Original count] → [Final count] (reduced by [%])
**Coverage**:
- User Stories: [X] covered
- Functional Requirements: [Y] covered
- Non-Functional Requirements: [Z] covered

**Priority Breakdown**:
- P0 (Critical): [Count]
- P1 (High): [Count]
- P2 (Medium): [Count]
- P3 (Low): [Count]

**Test Types**:
- Happy Path: [Count]
- Edge Cases: [Count]
- Negative Tests: [Count]
- Integration Tests: [Count]
- Performance Tests: [Count]
- Security Tests: [Count]

**Parameterized Test Cases**: [Count] (tests with multiple parameter sets)

---

## Priority 0 Test Cases (Critical)

[List all P0 test cases]

### TC-001: User Login with Valid Credentials (Happy Path)
**Related Requirement**: US-1, FR-1
**Type**: Happy Path
**Priority**: P0

**Preconditions**:
- User account exists in database
- User is not already logged in
- Login page is accessible

**Steps**:
1. Navigate to login page
2. Enter valid email "user@example.com" in email field
3. Enter valid password "Test1234!" in password field
4. Click "Login" button

**Expected Results**:
- After step 1: Login page displayed with email and password fields
- After step 2: Email field populated
- After step 3: Password field masked
- After step 4: User redirected to dashboard with "Welcome, User" message

**Test Data**:
| Email | Password | Expected Page |
|-------|----------|---------------|
| user@example.com | Test1234! | Dashboard |

**Traceability**:
- **User Story**: US-1 (User Login)
- **Acceptance Criterion**: AC1
- **Functional Requirement**: FR-1 (Authentication)

**Notes**: Primary authentication flow, must work 100%

---

### TC-002: User Login with Invalid Credentials (Negative)
**Related Requirement**: US-1, FR-1
**Type**: Negative
**Priority**: P0

**Preconditions**:
- User account exists in database
- User is not logged in
- Execute this test case 3 times with different invalid credential combinations (see Test Data)

**Steps**:
1. Navigate to login page
2. Enter email from Test Data
3. Enter password from Test Data
4. Click "Login" button
5. Observe error message and page state

**Expected Results**:
- After step 1: Login page displayed
- After step 2-3: Fields populated
- After step 4: Login attempt processed
- After step 5: Error message displayed as per Test Data, user remains on login page

**Test Data**:
| Scenario | Email | Password | Expected Error |
|----------|-------|----------|----------------|
| Invalid password | user@example.com | wrong | "Invalid credentials" |
| Invalid email | wrong@example.com | Test1234! | "Invalid credentials" |
| Both invalid | wrong@example.com | wrong | "Invalid credentials" |

**Traceability**:
- **User Story**: US-1 (User Login)
- **Acceptance Criterion**: AC2
- **Functional Requirement**: FR-1 (Authentication)

**Notes**: Security critical - ensure credentials not revealed in error message

---

[Continue with all P0 test cases]

---

## Priority 1 Test Cases (High)

[List all P1 test cases using same template]

### TC-010: [Test Case Title]
[Full details]

---

## Priority 2 Test Cases (Medium)

[List all P2 test cases]

---

## Priority 3 Test Cases (Low)

[List all P3 test cases]

---

## Coverage Matrix

| Requirement | Test Case IDs | Count | Status |
|-------------|---------------|-------|--------|
| US-1 | TC-001, TC-002, TC-003 | 3 | ✅ Covered |
| US-2 | TC-004, TC-005 | 2 | ✅ Covered |
| FR-1 | TC-001, TC-002, TC-003, TC-006 | 4 | ✅ Covered |
| FR-2 | TC-007, TC-008 | 2 | ✅ Covered |
| NFR-1 | TC-020 | 1 | ✅ Covered |

---

## Test Data Management

### Test Users
| Username | Email | Password | Role | Notes |
|----------|-------|----------|------|-------|
| testuser1 | user1@test.com | Test1234! | User | Standard user |
| testadmin | admin@test.com | Admin1234! | Admin | Full access |

### Test Data Sets
- **Small Dataset**: 10 records
- **Medium Dataset**: 100 records
- **Large Dataset**: 10,000 records

### Environment Requirements
- Test database with seed data
- Mock external APIs
- Test email server (e.g., MailHog)
- Test file storage

---

## TestRail Import Instructions

### CSV Export Format
Test cases are formatted for TestRail CSV import:
- Title: Test case name
- Steps: Numbered action steps
- Expected Results: Outcome after each step
- Preconditions: Setup requirements
- Priority: P0-P3 mapping
- Type: Test type category
- References: Linked requirements

### Import Steps
1. Copy test cases from this document
2. Format as CSV with columns: ID, Title, Priority, Type, Preconditions, Steps, Expected Results, Test Data, References
3. Import to TestRail via CSV import tool
4. Verify links to requirements in TestRail

### Parameterized Test Execution
For test cases with "Execute this test case N times":
1. In TestRail, create test runs for each parameter set
2. OR use TestRail's data-driven testing feature
3. OR execute manually with each data row

---

## Test Execution Roadmap

### Phase 1: P0 Test Cases (Week 1)
- [TC-001] to [TC-009]
- Must pass before production deploy

### Phase 2: P1 Test Cases (Week 2)
- [TC-010] to [TC-020]
- Complete before feature complete

### Phase 3: P2+P3 Test Cases (Week 3)
- [TC-021] onwards
- Complete before release

---

## Appendices

### Appendix A: Test Environment Setup
[Instructions for setting up test environment]

### Appendix B: Known Limitations
[Test cases not covered, why, and alternatives]

### Appendix C: Future Test Cases
[Test cases to add in future iterations]

### Appendix D: Merged Test Cases Log
[Record of redundant test cases that were merged]

**Example**:
| Original IDs | Merged Into | Reason |
|--------------|-------------|--------|
| TC-015, TC-016, TC-017 | TC-015 | Same steps, different roles - now parameterized |
| TC-022, TC-023, TC-024, TC-025 | TC-022 | Same validation, different inputs - now parameterized |

---

## Next Steps

1. Review test scenarios
2. Set up test environment
3. Implement automated tests (can use AQA agent flow)
4. Execute tests and track results
5. Update traceability matrix with test status
```

### Step 8: Update Traceability in Requirements

Update `agents/testgen/{TICKET-KEY}/requirements.md` traceability matrix:

Add test scenario IDs to the matrix:
```markdown
| Requirement ID | Source | User Story | Test Scenario |
|----------------|--------|------------|---------------|
| FR-1 | Jira DESC | US-1 | TS-001, TS-002, TS-003, TS-006 |
| FR-2 | Confluence Page 1 | US-2 | TS-007, TS-008 |
| NFR-1 | User Answer Q5 | - | TS-020 |
```

### Step 9: Update State File (Final)

Update `agents/testgen/{TICKET-KEY}/testgen-state.md`:

```markdown
## Phase Completion Status

- [x] Phase 1: Data Collection - Completed [Date]
- [x] Phase 2: Gap Analysis - Completed [Date]
- [x] Phase 3: Question Generation - Completed [Date]
- [x] Phase 4: Requirements Generation - Completed [Date]
- [x] Phase 5: Test Scenarios - Completed [DateTime]

## Metrics

- Jira Fields Extracted: [Count]
- Confluence Pages Analyzed: [Count]
- Contradictions Found: [Count]
- Gaps Identified: [Count]
- Questions Generated: [Count]
- Questions Answered: [Count]
- User Stories Created: [Count]
- Functional Requirements: [Count]
- Non-Functional Requirements: [Count]
- Test Scenarios: [Count]
- Test Coverage: [X]% of requirements

## Phase Details

[...]

### Phase 5: Test Scenario Generation
- **Completed**: [DateTime]
- **Files Created**: test-scenarios.md
- **Total Scenarios**: [Count]
- **P0 Scenarios**: [Count]
- **P1 Scenarios**: [Count]
- **Requirements Covered**: [X] / [Total]
- **Status**: COMPLETE ✅
- **Notes**: All phases complete, ready for implementation

---

## Requirements Analysis COMPLETE

**Deliverables**:
1. ✅ Raw data extraction
2. ✅ Gap analysis
3. ✅ User clarifications
4. ✅ Requirements document
5. ✅ Test scenarios

**Next Steps**:
1. Review and approve requirements.md
2. Implement based on user stories
3. Implement automated tests using test-scenarios.md
4. Consider using AQA agent for test implementation
```

## Validation

Before completing Phase 5, verify:
- ✅ `test-scenarios.md` created
- ✅ At least 10 test cases defined (typical: 15-40 before merging, 10-25 after)
- ✅ All test cases use TestRail-compatible format (Steps + Expected Results)
- ✅ NO BDD format (Given-When-Then) - use Steps and Expected Results
- ✅ NO "Post-conditions" field
- ✅ NO "Automation" field
- ✅ Redundant test cases merged with parameterized test data
- ✅ Each requirement has at least 1 test case
- ✅ Priority distribution reasonable (more P0/P1 than P2/P3)
- ✅ Coverage matrix shows all requirements covered
- ✅ Traceability back to requirements documented
- ✅ State file updated with Phase 5 complete

## Tools Used

- `read_file()` - Read requirements.md
- `write()` - Create test-scenarios.md, update requirements.md, update testgen-state.md

## Test Case Generation Guidelines

**Good Test Cases** (TestRail Format):
- Specific and actionable steps
- Clear Steps and Expected Results structure (NOT Given-When-Then)
- Includes exact test data in table format
- Specifies expected outcome after each step
- Has clear preconditions (NOT post-conditions)
- Parameterized when testing same flow multiple times

**Poor Test Cases**:
- Vague or ambiguous steps
- Missing test data
- Unclear expected results
- No traceability
- Using BDD format (Given-When-Then)
- Duplicate test cases that should be merged

**Test Case Naming**:
- Use descriptive titles
- Include test type: (Happy Path), (Negative), (Edge Case)
- Reference key entity or action
- For merged tests: Use general title covering all parameter sets

**Examples**:
- ✅ "User Login with Valid Credentials (Happy Path)"
- ✅ "User Login with Invalid Credentials (Negative)" [parameterized with 3 scenarios]
- ✅ "Unauthorized Roles Cannot Create Job Post (Negative)" [parameterized with 3 roles]
- ❌ "Test Login"
- ❌ "Check Search"
- ❌ Creating separate TC-001, TC-002, TC-003 for Admin/Manager/Viewer with same steps

## Common Test Patterns

**CRUD Operations** (4 scenarios minimum):
- Create with valid data (Happy Path)
- Read existing record (Happy Path)
- Update existing record (Happy Path)
- Delete record (Happy Path)
- Create with invalid data (Negative)
- Read non-existent record (Negative)
- Update non-existent record (Negative)
- Delete non-existent record (Negative)

**Authentication** (5 scenarios minimum):
- Login with valid credentials (Happy Path)
- Login with invalid password (Negative)
- Login with non-existent user (Negative)
- Login after account locked (Negative)
- Logout successfully (Happy Path)

**API Calls** (4 scenarios minimum):
- Successful request with valid data (Happy Path)
- Request with invalid data (Negative)
- Request with missing auth token (Negative)
- Request with network timeout (Negative)

## Integration with AQA Agent

Test scenarios from this phase can feed directly into AQA agent:
1. Use test-scenarios.md as input to AQA Phase 1
2. AQA will implement automated tests
3. Maintains traceability from requirements → scenarios → tests

## Completion

Tell user:
```
🎉 Requirements Analysis COMPLETE!

All 5 phases finished successfully:
✅ Phase 1: Data Collection ([X] sources including child pages)
✅ Phase 2: Gap Analysis ([Y] issues found)
✅ Phase 3: User Clarifications ([Z] questions answered)
✅ Phase 4: Requirements ([N] user stories, [M] requirements)
✅ Phase 5: Test Cases ([Q] test cases, [R] merged for efficiency)

**Deliverables**:
📄 agents/testgen/{TICKET-KEY}/requirements.md - Use for implementation
📄 agents/testgen/{TICKET-KEY}/test-scenarios.md - TestRail-ready test cases

**Test Case Summary**:
- Format: TestRail-compatible (Steps + Expected Results)
- Optimized: Redundant tests merged with parameterized data
- Ready for import to TestRail

**Next Steps**:
1. Review and approve requirements document
2. Import test cases to TestRail (CSV format ready)
3. Begin development using user stories
4. Execute test cases in TestRail
5. Link documents to Jira ticket

**TestRail Import**:
Test cases are formatted for direct TestRail CSV import.
Follow instructions in Appendix for import steps.
```

## Notes

- This is the final phase of requirements analysis
- Test cases should be comprehensive but practical
- Format is TestRail-compatible (NOT BDD format)
- Focus on P0/P1 test cases first
- Merge redundant test cases to reduce maintenance overhead
- Can iterate and add more test cases later
- Keep test cases updated as requirements evolve
- Parameterized test data reduces test case count by 30-50%

