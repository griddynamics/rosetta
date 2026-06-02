# Worked Examples + Redaction Catalog — testrail-test-case-authoring

Loaded on demand from SKILL.md when actively authoring a non-obvious case shape (field-shape questions) or applying redaction (sensitive value at write time). The base SKILL.md keeps the template + format_rules + success_criteria + gap-marker rules + the operational safety-boundaries rules inline; this file holds the worked examples and the detailed redaction catalog.

Mirrors the same lazy-loading pattern the sibling `swagger-contracts-analysis` skill uses (`references/redaction-catalog.md` + `references/canonical-example.md`).

---

## Worked Examples (referenced from `<examples>`)

Three canonical worked entries showing how `<test_case_template>` fills in for the most common case shapes. Use as field-shape reference; do not copy values verbatim — synthetic placeholders are illustrative.

### Happy Path

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

**Test Data** (use synthetic emails on `example.com` / `example.org` IETF reserved domain; passwords as placeholders, NOT literal values that could match real accounts):

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

## Redaction Catalog (referenced from `<safety_boundaries>`)

The detailed catalog the operational `<safety_boundaries>` rules apply. Loaded on demand when actively replacing a sensitive value with a placeholder.

### Targets to placeholder, never literal

**1. Passwords / tokens / API keys** in Steps or Test Data:

| Placeholder | When to use |
|---|---|
| `<valid test password>` | Login happy-path steps that need a working password |
| `<deliberately-wrong test password>` | Negative tests where the wrong password is the trigger |
| `<valid bearer token>` | Authenticated API-style steps inside a UI test |
| `<expired bearer token>` | Token-expiry negative tests |
| `<valid api key>` | API-key-authenticated steps |

**Never paste a real production-account password, even if marked "test".** TestRail content is reused, exported, and read by humans who may copy it.

**2. Real customer emails / names / phone numbers / account IDs / payment card numbers** in Test Data:

| Field type | Placeholder source |
|---|---|
| Email | IETF reserved domains: `test.user-1@example.com`, `qa.smoketest@example.com` |
| Name | Obviously synthetic: `Test User Alpha`, `QA Smoketest User` |
| Phone number | IETF reserved range: `+1-555-0100` through `+1-555-0199` |
| Account ID | Format-matching synthetic: `ACCT-TEST-0001` |
| Payment card | PSP-published test card numbers (Stripe / Adyen / PayPal); document the source in Notes |

**3. Internal credentialed URLs** (e.g. `https://admin:pw@internal.example.com/...`):

Redact the credential portion to `https://<redacted: credentialed URL>` and describe the resource in prose (e.g., "the internal admin dashboard reachable via the credentialed URL above").

**4. Real database connection strings, signed URLs, service-account JSONs, private keys:**

Never embed in the case body. Describe the source (env var name, secret-manager path) and the mechanism (Bearer / Basic / OAuth flow) instead — e.g., *"the test environment's database connection string is sourced from env var `TEST_DB_URL`; tests should NOT include the literal string in steps."*

### Structural-content rule (canonical)

Endpoint paths, HTTP methods, status codes, error message templates (e.g., `"Invalid credentials"` — that's a UI string, not a secret), field names, and feature names are functional content and recorded **as-is**. Redaction targets sensitive **values**, not the structural test description.

If a real production value would be the natural example, replace it with a clearly-fake placeholder of the same shape — better an obviously-fake placeholder in TestRail than a leaked real one that downstream phases or human testers act on.

### Safety re-scan grep targets (referenced from `<validation_checklist>` "Safety re-scan")

Before declaring a case complete, scan Steps + Expected Results + Test Data + Preconditions for:

- `Bearer `
- `password:`
- Real-looking password strings (mixed case + digits + symbols matching a production-account password shape)
- Real-looking emails NOT on `example.com` / `example.org`
- Phone numbers outside `+1-555-0100`–`+1-555-0199`
- Card-number shapes (`\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}`)
- Credentialed URLs (`user:pass@` segments)

Any matches → replace with the placeholders above; record the redaction in Notes.
