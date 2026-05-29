---
name: testrail-test-case-authoring
description: TestRail-compatible test case format — template, field rules, naming conventions, and examples.
tags: ["testing", "testrail", "format"]
baseSchema: docs/schemas/skill.md
---

<testrail-test-case-authoring>

<role>TestRail test case format specialist</role>

<when_to_use_skill>
Use when test cases must be written in TestRail-compatible format. Provides the template, field rules, naming conventions, and examples.
</when_to_use_skill>

<format_rules>

- **MUST** use Steps + Expected Results format
- **MUST NOT** use BDD Given-When-Then format
- **MUST NOT** include "Post-conditions" field
- **MUST NOT** include "Automation" field
- Each step is a single user action; each expected result states the observable outcome after that step
- Steps must be numbered sequentially
- Expected results must reference which step they follow

</format_rules>

<test_case_template>

```markdown
### TC-[N]: [Test Case Title]
**Related Requirement**: [US-X / FR-X / NFR-X]
**Type**: Happy Path / Edge Case / Negative / Integration / Performance / Security
**Priority**: P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)

**Preconditions**:
- [Setup requirement 1]
- [Setup requirement 2]
- [For parameterized]: Execute this test case [N] times with different parameters (see Test Data)

**Steps**:
1. [Action step 1]
2. [Action step 2]
3. [Action step 3]

**Expected Results**:
- After step 1: [Expected outcome]
- After step 2: [Expected outcome]
- After step 3: [Expected outcome]

**Test Data** (if parameterized):
| Parameter | Value 1 | Value 2 | Value 3 |
|-----------|---------|---------|---------|
| [Param 1] | [Val]   | [Val]   | [Val]   |

**Traceability**:
- **User Story**: US-[N]
- **Acceptance Criterion**: AC[N]
- **Functional Requirement**: FR-[N]
- **Non-Functional Requirement**: NFR-[N] (if applicable)

**Notes**: [Additional context]
```

</test_case_template>

<naming_conventions>

Include test type in parentheses. Use descriptive titles referencing the key action or entity.

**Good names**:
- "User Login with Valid Credentials (Happy Path)"
- "User Login with Invalid Credentials (Negative)"
- "Unauthorized Roles Cannot Create Job Post (Negative)"
- "Search with Empty Query Returns All Results (Edge Case)"

**Poor names**:
- "Test Login"
- "Check Search"
- "TC for Admin"

</naming_conventions>

<examples>

**Happy Path**:
```markdown
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

**Traceability**:
- **User Story**: US-1 (User Login)
- **Acceptance Criterion**: AC1
- **Functional Requirement**: FR-1 (Authentication)
```

**Negative with parameterized test data**:
```markdown
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

**Notes**: Security critical — ensure credentials not revealed in error message
```

**Role-based parameterized (merged)**:
```markdown
### TC-003: Unauthorized Roles Cannot Create Job Post (Negative)
**Related Requirement**: US-5, FR-12
**Type**: Negative
**Priority**: P0

**Preconditions**:
- User is logged in with one of the unauthorized roles (see Test Data)
- Execute this test case 3 times, once for each role

**Steps**:
1. Navigate to Job Post creation page
2. Attempt to create a new Job Post
3. Observe system response

**Expected Results**:
- After step 1: Page loads or access denied based on role
- After step 2: Creation attempt rejected
- After step 3: Error message displayed as per Test Data table

**Test Data**:
| Role    | Expected Error Message |
|---------|------------------------|
| Admin   | "Insufficient permissions" |
| Manager | "Insufficient permissions" |
| Viewer  | "Insufficient permissions" |

**Traceability**:
- **User Story**: US-5 (Job Post Access Control)
- **Functional Requirement**: FR-12 (Role-Based Permissions)
```

</examples>

<pitfalls>
- Do NOT use BDD Given-When-Then format — TestRail uses Steps + Expected Results
- Each step must be a single action, not multiple actions combined
- Expected results must be observable and verifiable, not vague
- For parameterized tests, preconditions must state how many times to execute and reference Test Data
- Maximum 5 parameter sets per test case — split into multiple test cases if more
</pitfalls>

</testrail-test-case-authoring>
