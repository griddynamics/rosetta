# TestRail FORMAT Binding -- qa-knowledge (scenario_design)

Holds the TestRail-compatible case template, field rules, naming conventions, and worked examples.

---

## Format rules

- **MUST** use Steps + Expected Results format (maps to TestRail `custom_steps_separated` / `custom_expected`)
- **MUST NOT** use BDD Given-When-Then format
- **MUST NOT** include a `Post-conditions` field -- encode teardown into the framework or note residual side effects in Expected Results
- **MUST NOT** include an `Automation` field -- that is TMS metadata, not case body
- Each step is a single user action; each expected result states the observable outcome after that step
- Steps numbered sequentially; expected results reference which step they follow

## Case template

```markdown
### TC-[N]: [Test Case Title]
**Related Requirement**: [US-X / FR-X / NFR-X]
**Type**: Happy Path / Edge Case / Negative / Integration / Performance / Security
**Priority**: P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)

**Preconditions**:
- [Setup requirement 1]
- [For parameterized]: Execute this test case [N] times with different parameters (see Test Data)

**Steps**:
1. [Action step 1]
2. [Action step 2]

**Expected Results**:
- After step 1: [Expected outcome]
- After step 2: [Expected outcome]

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

## Naming conventions

Include the test type in parentheses; use descriptive titles naming the key action or entity.

- Good: "User Login with Valid Credentials (Happy Path)", "Unauthorized Roles Cannot Create Job Post (Negative)", "Search with Empty Query Returns All Results (Edge Case)"
- Poor: "Test Login", "Check Search", "TC for Admin"

## Gap-marker discipline (per-value honesty for TestRail fields)

When a field cannot be sourced from inputs, leave a visible `gap: <reason>` marker -- never invent a value:

- `Related Requirement` → `gap: no requirement traced — <reason>` (do not invent `FR-X`)
- `Traceability — User Story` → `gap: no user story traced — <reason>` (do not invent `US-X`)
- `Traceability — Acceptance Criterion` → `gap: AC unknown — not in source` or `gap: AC not provided`
- `Traceability — Functional / Non-Functional Requirement` → `gap: FR not in source` / `gap: not applicable — <reason>`
- `Priority` → `gap: priority not supplied — defaulting to P2 pending review` AND set Priority to P2. This is the one field where a flagged default is acceptable (every TestRail case requires a priority); the marker forces a reviewer pass.

A case with gap markers is still complete -- the gaps are visible. One with a fabricated `FR-99` is not -- it presents false traceability.

## Parameterization

Cap at 5 parameter sets per case. If more, split into multiple cases (TC-A, TC-B, ...), reuse the same Related Requirement / Traceability set unless the parameter-group semantics genuinely differ, and note in each split case's Notes: `Split from <N>-set parameterization (1 of M, ...)`.

## Failure handling

- **Scenario intent ambiguous** (vague "test the login flow" without happy/negative/edge): stop, ask for the test type -- naming requires it; guessing pollutes suite organization.
- **Step decomposition impossible** (high-level "user pays for cart" with no detail): stop, ask the phase for the action sequence. Do NOT invent steps -- fabricated steps fail at execution.

---

## Worked examples

### Happy Path

```markdown
### TC-001: User Login with Valid Credentials (Happy Path)
**Related Requirement**: US-1, FR-1
**Type**: Happy Path
**Priority**: P0

**Preconditions**:
- User account exists in database
- User is not already logged in

**Steps**:
1. Navigate to login page
2. Enter valid synthetic email (e.g. `test.user-1@example.com`) in email field
3. Enter valid password placeholder `<valid test password>` in password field
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

### Negative with parameterized test data

```markdown
### TC-002: User Login with Invalid Credentials (Negative)
**Related Requirement**: US-1, FR-1
**Type**: Negative
**Priority**: P0

**Preconditions**:
- User account exists in database
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

**Test Data** (synthetic emails on IETF reserved domains; passwords as placeholders, never literal):
| Scenario | Email | Password | Expected Error |
|----------|-------|----------|----------------|
| Invalid password | `test.user-1@example.com` | `<deliberately-wrong test password>` | "Invalid credentials" |
| Invalid email | `nonexistent@example.com` | `<valid test password>` | "Invalid credentials" |
| Both invalid | `nonexistent@example.com` | `<deliberately-wrong test password>` | "Invalid credentials" |

**Traceability**:
- **User Story**: US-1 (User Login)
- **Acceptance Criterion**: AC2
- **Functional Requirement**: FR-1 (Authentication)

**Notes**: Security critical — ensure credentials not revealed in error message
```

### Role-based parameterized (merged)

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

---

## Pre-emit validation greps (TestRail format)

- **Format compliance** -- grep the case body for `Given `, `When `, `Then `, `Post-conditions`, `Automation`. None must appear.
- **Step / expected-result discipline** -- steps numbered sequentially; every expected result references its step (`After step N: ...`); no multi-action steps joined by `and` / commas.
- **Naming** -- parenthesized type label present.
- **Parameterization** -- Test Data table present ⇒ Preconditions states execution count and references Test Data; set count ≤ 5 (else split).
- **Gap markers** -- every traceability + required field is real OR carries a gap marker; no fabrication.
- **Redaction re-scan** -- per `sensitive-data`: scan Steps + Expected Results + Test Data + Preconditions for `Bearer `, real-looking passwords, emails not on `example.com`/`example.org`, phone numbers outside `+1-555-0100`–`+1-555-0199`, card-number shapes, and `user:pass@` credentialed URLs.

---

## Swapping to another TMS vendor

The case template, rules, naming, gap-marker discipline, and validation greps above are vendor-agnostic. The only TestRail-specific binding is the **Steps + Expected Results field mapping** (`custom_steps_separated` / `custom_expected`, per Format rules). To target another TMS (Zephyr / Xray / qTest / Polarion): READ SKILL FILE `references/vendor-fork-guide.md`, copy this file to `references/<vendor>-format.md`, and rebind that field mapping per the guide's Rebind table (`Step / precond fields` row) -- keeping the template shape, gap-marker discipline, and redaction greps verbatim.
