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

<success_criteria>
A test case is complete when **all of** the following hold:
- Every required template field is either populated with a real value sourced from inputs OR explicitly marked as a gap per `<epistemic_honesty>` (no fabricated IDs, ACs, or requirement references).
- Every `<format_rules>` MUST / MUST NOT rule holds (Steps + Expected Results format; no BDD; no Post-conditions; no Automation field; sequential numbering; expected results reference their step).
- The title includes the test type in parentheses per `<naming_conventions>`.
- For parameterized cases: `<format_rules>` parameterization requirements hold (preconditions state execution count + reference Test Data); max 5 parameter sets per case.
- No literal credentials / tokens / real PII appear in the case body per `<safety_boundaries>` — placeholders only.
The case is NOT complete if any required field carries an inferred value to "fill" the template, BDD phrasing is used, or a literal credential appears in Test Data / Steps / Expected Results.
</success_criteria>

<input_contract>

The skill expects the calling workflow / upstream phase to supply:

| Input | Required? | Drives which template fields |
|---|---|---|
| Scenario / test case intent | **required** | TC title, Type, Steps, Expected Results, Preconditions |
| Requirements document (with `US-N`, `FR-N`, `NFR-N` IDs) OR explicit "no requirements traced" signal | **required** (one of) | `Related Requirement`, Traceability `User Story` / `Functional Requirement` / `Non-Functional Requirement` |
| Acceptance criteria list (`AC1` / `AC2` / ... per user story) OR explicit "no AC traced" signal | recommended | Traceability `Acceptance Criterion` |
| Priority signal (P0-P3) from upstream | recommended | `Priority` field |
| Parameterization decision (single vs parameterized vs split) | derived during authoring; capped at 5 parameter sets per case | `Preconditions` execution-count clause + `Test Data` table |

If requirements / ACs are not supplied (either as documents or as an explicit "no traceability available" signal), apply `<failure_handling>` "no requirement/AC mapping available" — do NOT invent IDs. If the scenario intent itself is missing, the skill cannot produce a case — stop and ask the calling workflow.

</input_contract>

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
- Inventing requirement / user-story / acceptance-criterion IDs to fill the template when none were supplied — fabrication. Mark as a gap per `<epistemic_honesty>` instead.
- Pasting literal real-account passwords, API keys, or production PII into Steps / Expected Results / Test Data — apply `<safety_boundaries>` placeholders. The TestRail content downstream (`testrail-test-case-export`) writes this verbatim to an external shared system.
</pitfalls>

<epistemic_honesty>

When a template field cannot be sourced from inputs, **leave a visible gap marker** — do NOT invent a plausible value. The marker carries the reason so reviewers can fix it.

Markers per field:

- `Related Requirement`: write `gap: no requirement traced — <reason>` (e.g., "scenario sourced from manual exploratory pass, no formal requirement exists") instead of inventing `FR-X`.
- `Traceability — User Story`: write `gap: no user story traced — <reason>` instead of inventing `US-X`.
- `Traceability — Acceptance Criterion`: write `gap: AC unknown — not in source` if the requirements document doesn't list ACs for this story, or `gap: AC not provided` if upstream simply didn't pass them.
- `Traceability — Functional Requirement` / `Non-Functional Requirement`: same pattern — `gap: FR not in source` / `gap: not applicable — <reason>`.
- `Priority`: write `gap: priority not supplied — defaulting to P2 pending review` AND set the Priority field to P2 (the explicit-default fallback) — this is the one field where a flagged default is acceptable because every TestRail case requires a priority, but the gap marker forces a reviewer pass.

A test case carrying gap markers is still complete per `<success_criteria>` — the gaps are visible and reviewable. A test case carrying a fabricated `FR-99` is not — it presents false traceability.

</epistemic_honesty>

<safety_boundaries>

Test cases authored here are written verbatim into a tracked artifact (and pushed to TestRail by `testrail-test-case-export`, an external shared system visible to every project user). Treat the case body as **PUBLIC by default** — no literal credentials, no real PII.

**Targets to placeholder, never literal:**

- **Passwords / tokens / API keys** in Steps or Test Data — use `<valid test password>`, `<deliberately-wrong test password>`, `<valid bearer token>`, `<expired bearer token>`, `<valid api key>`. Never paste a real production-account password, even if marked "test". TestRail content is reused, exported, and read by humans who may copy it.
- **Real customer emails / names / phone numbers / account IDs / payment card numbers** in Test Data — use synthetic equivalents on IETF reserved domains: `test.user-1@example.com`, `qa.smoketest@example.com`; phone shapes from the `+1-555-0100`–`+1-555-0199` reserved range; PSP-published test card numbers if a card is needed (document the source in Notes).
- **Internal credentialed URLs** (`https://admin:pw@internal.example.com/...`) — redact the credential portion to `https://<redacted: credentialed URL>` and describe the resource in prose.
- **Real database connection strings, signed URLs, service-account JSONs, private keys** — never embed; describe the source (env var name, secret-manager path) and mechanism instead.

**Structural content stays verbatim.** Endpoint paths, HTTP methods, status codes, error message templates ("Invalid credentials" — that's a UI string, not a secret), field names, and feature names are functional and recorded as-is. Redaction targets sensitive **values**, not the structural test description.

If a real production value would be the natural example, replace it with a clearly-fake placeholder of the same shape — better an obviously-fake placeholder in TestRail than a leaked real one that downstream phases or human testers act on.

</safety_boundaries>

<failure_handling>

- **No requirement / AC mapping available** for a scenario (upstream did not supply a requirements doc OR the doc has no entry for this scenario): apply `<epistemic_honesty>` gap markers in the Traceability fields. Do NOT invent `FR-X` / `US-X` / `AC[N]` IDs. The case is still emitted; the gap is visible.
- **Parameter sets exceed the 5-set cap:** split into multiple test cases per the `<pitfalls>` rule. Number sequentially (TC-A, TC-B, TC-C, ...) and reuse the same Related Requirement / Traceability set across the split unless the parameter-group semantics genuinely differ. Note in each split case's Notes: `Split from <N>-set parameterization (1 of M, 2 of M, ...)`.
- **Scenario intent ambiguous** (the calling workflow supplied a vague "test the login flow" without happy/negative/edge specification): stop, ask the calling workflow / user to specify the test type (Happy Path / Negative / Edge Case / Integration / Performance / Security). Do NOT pick a default — naming includes the test type per `<naming_conventions>` and guessing the wrong type pollutes the suite organization.
- **Step decomposition impossible from intent** (a high-level scenario "user pays for cart" with no detail on the cart, the payment method, or the success criterion): stop, ask the calling workflow for the underlying action sequence. Do NOT invent steps to fill the template — fabricated steps fail at execution.
- **Priority signal missing:** apply the `<epistemic_honesty>` Priority fallback — set P2 with a gap marker. This is the one field where a flagged default is acceptable.

</failure_handling>

<validation_checklist>

Run as a pre-completion pass on every authored case. All items must hold:

- **Format compliance:** Steps + Expected Results format used; no BDD `Given/When/Then` phrasing; no `Post-conditions` field; no `Automation` field. (Re-grep the case body for `Given `, `When `, `Then `, `Post-conditions`, `Automation` before declaring complete.)
- **Step / expected-result discipline:** steps numbered sequentially (1, 2, 3, ...); every expected result line references its step (`After step N: ...`); no expected result orphaned from a step; no step containing multiple actions joined by "and" or commas.
- **Naming:** title includes the test type in parentheses (e.g., `(Happy Path)`, `(Negative)`, `(Edge Case)`); descriptive about action or entity, not "Test X" / "Check Y" / "TC for Z".
- **Parameterization:** if Test Data table is present, Preconditions states the execution count (`Execute this test case N times ...`) AND references Test Data; parameter set count ≤ 5 (else split per `<failure_handling>`).
- **Traceability honesty:** every Traceability field is either populated from supplied requirements/ACs OR carries a `<epistemic_honesty>` gap marker. No inferred `FR-X` / `US-X` / `AC[N]` IDs.
- **Safety re-scan:** Steps, Expected Results, Test Data, and Preconditions were scanned for literal credentials (`Bearer `, `password:`, real-looking password strings with mixed case + digits + symbols), real PII (real-looking emails NOT on `example.com`/`example.org`, real phone numbers outside the `555-0100`–`555-0199` reserved range, real card numbers), and credentialed URLs. Any matches were replaced with placeholders per `<safety_boundaries>`.
- **Required field populated or gap-marked:** Related Requirement, Type, Priority, Preconditions, Steps, Expected Results, Traceability — each is either real or carries a gap marker per `<epistemic_honesty>`. No silently blank required field.
- **Notes accurate:** if the case was split from a >5-parameter authoring, the Notes section says so; if Priority was defaulted to P2 via the gap fallback, the gap marker in Traceability/Priority section is visible.

</validation_checklist>

</testrail-test-case-authoring>
