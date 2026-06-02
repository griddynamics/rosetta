---
name: api-test-spec-authoring
description: Generate detailed Given-When-Then API test specifications with scenario taxonomy, file mapping, and shared utility identification.
tags: ["api-qa"]
baseSchema: docs/schemas/skill.md
---

<api-test-spec-authoring>

<role>API test specification author and scenario designer</role>

<when_to_use_skill>
Convert test cases into detailed, implementation-ready API test specifications using Given-When-Then format with exact request details, expected responses, and explicit assertions. This is a general-purpose authoring capability — the calling workflow determines input/output file paths.
</when_to_use_skill>

<prerequisites>
- Raw test case data available (original test cases and patterns)
- API endpoint contracts available (request/response schemas, auth, status codes)
- Gap analysis and user clarifications completed
</prerequisites>

<process>

## 1. Load All Inputs

Read all input documents provided by the calling workflow:
1. Raw test cases and existing patterns
2. Endpoint contracts (from API analysis)
3. Clarifications and resolved gaps

**GATE — input completeness check.** Before proceeding to step 2:
- **Endpoint contracts missing or empty:** stop, report `api-test-spec-authoring: endpoint contracts not loaded — cannot author specs against unknown contracts` to the calling workflow. Do NOT fabricate request/response shapes.
- **Test cases reference endpoints not present in the loaded contracts:** for each unmappable test case, stop and flag it back to the calling workflow with `unmappable: <test-case-id> targets <METHOD> <path> which is not in api-analysis`. Do NOT invent the endpoint or guess at its shape.
- **Gap analysis unresolved** (clarifications missing for items the contracts can't answer): for each unresolved gap that materially affects the spec (auth mechanism unknown, status code semantics ambiguous, required fields contested), stop and ask the calling workflow to complete Phase 3 (gap-and-requirements-clarification) before retrying. Do NOT proceed with assumed answers in step 2.
- **Partial completeness** (some test cases mappable, others not): proceed with the mappable subset, but in the produced spec emit a `## Excluded Test Cases` section listing every excluded test case + the reason — do NOT silently drop them.

## 2. Define Test Scenarios per Test Case

For each test case, generate 1-N test scenarios covering:

**Happy Path (P0)**:
- Valid request with all required fields -> expected success response
- Valid request with all optional fields -> expected success response

**Validation / Negative Cases (P1)**:
- Missing required fields -> expected 400/422 error
- Invalid field types -> expected 400/422 error
- Invalid field values (out of range, wrong format) -> expected 400/422 error
- Empty request body when body required -> expected 400 error

**Auth Cases (P1)**:
- No auth token -> expected 401
- Invalid/expired token -> expected 401
- Insufficient permissions -> expected 403 (if applicable)

**Resource Cases (P1-P2)**:
- Resource not found -> expected 404
- Duplicate creation (if applicable) -> expected 409
- Concurrent modification (if applicable) -> expected 409/412

**Edge Cases (P2-P3)**:
- Boundary values (min/max length, min/max numeric)
- Special characters in string fields
- Unicode/internationalization
- Empty strings vs null vs missing
- Large payloads (near limits)

## 3. Write Detailed Test Specifications

Format: Given-When-Then for each test scenario.

```markdown
### ATC-[NNN]: [Test Case Title]

**Source**: [Original test case reference — TC-1234 / PROJ-123 / Manual]
**Priority**: P0 / P1 / P2 / P3
**Type**: Happy Path / Negative / Auth / Edge Case / Error Handling
**Endpoint**: [METHOD] [PATH]

**Given**:
  - [Precondition 1 — e.g., "User exists with ID 42"]
  - [Auth state — e.g., "Valid Bearer token for admin user"]
  - [Test data setup — e.g., "Product with ID 1 exists in database"]

**When**:
  - Send [METHOD] request to [PATH]
  - Headers:
    ```json
    {
      "Authorization": "Bearer {valid_token}",
      "Content-Type": "application/json"
    }
    ```
  - Query Parameters: [key=value pairs or N/A]
  - Request Body:
    ```json
    {
      "field1": "exact test value",
      "field2": 42
    }
    ```

**Then**:
  - Status Code: [Expected status code]
  - Response Body:
    ```json
    {
      "id": "[non-null integer]",
      "field1": "exact test value"
    }
    ```
  - Assertions:
    - Status code equals [code]
    - Response body contains field "id" of type integer
    - Response body field "field1" equals "exact test value"

**Test Data**:
  - Input: [Exact values to send]
  - Expected Output: [Exact values to assert]
  - Precondition Data: [Entities that must exist — how to create them]
  - Cleanup: [What to delete after test]

**Dependencies**:
  - Auth: [Token acquisition method]
  - Fixtures: [Data files or factory methods needed]
  - Setup: [API calls to make before this test]
  - Teardown: [API calls to make after this test]

**Assumptions** (REQUIRED when any value was not derivable from contracts/clarifications):
  - `[ASSUMED: <field_name> = <value>]` — <one-line reason, e.g., "contract did not specify min length; assumed 8 per common convention">
  - `[ASSUMED: <field_name> = <value>]` — <reason>
  - (If none: write `None — all values derived from endpoint contracts and clarifications.`)
```

**Per-value honesty rule.** Every concrete value in the spec (request body fields, query params, header values, response assertions) must trace to either (a) the loaded endpoint contracts, (b) the user clarifications, or (c) an explicit `[ASSUMED: ...]` entry in the Assumptions block. **Confident fabrication is forbidden** — when a contract leaves a constraint unspecified, the agent's only options are to ask the calling workflow to clarify (preferred) or to record an explicit Assumption (acceptable for non-blocking gaps).

## 4. Determine Test File Mapping

Map test scenarios to test files following project conventions:

```markdown
## Test File Mapping

| Test File | Scenarios | Count |
|-----------|-----------|-------|
| [tests/api/users.test.ts] | ATC-001 to ATC-010 | 10 |
| [tests/api/auth.test.ts] | ATC-011 to ATC-015 | 5 |
```

## 5. Define Shared Test Utilities

Identify reusable elements across test scenarios:

```markdown
## Shared Utilities Required

### Auth Helper
- Purpose: Acquire and cache auth tokens for test users
- Input: User credentials or role
- Output: Valid Bearer token
- Reused by: [List test scenario IDs]

### Test Data Factory
- Purpose: Create test entities via API
- Methods: createUser(overrides), createProduct(overrides), etc.
- Reused by: [List test scenario IDs]

### Response Validators
- Purpose: Common response structure validation
- Methods: validateErrorResponse(), validatePaginatedResponse()
- Reused by: [List test scenario IDs]
```

## 6. Determine Execution Order

1. Auth tests — verify auth mechanism works
2. CRUD happy paths — verify basic operations
3. Validation/negative — verify input handling
4. Edge cases — verify boundary behavior

</process>

<pitfalls>
- Using vague placeholder values like "valid data" instead of exact test values OR explicit `[ASSUMED: ...]` markers
- Not covering auth scenarios (401, 403) for protected endpoints
- Skipping negative/validation test cases — they catch most real bugs
- Not specifying exact assertion values — leads to vague tests
- Generating too many scenarios (>50) without prioritization — scope creep
- Missing precondition data setup requirements — leads to 404 failures
- Embedding real credentials, tokens, passwords, or production PII in the spec artifact — `test-specs.md` is tracked and may be shared
- Confidently emitting an invented field value without marking it as `[ASSUMED: ...]` — epistemic-honesty violation
- Silently dropping unmappable test cases instead of recording them in the `## Excluded Test Cases` section per step 1 GATE
</pitfalls>

<safety_boundaries>

`test-specs.md` (or whichever path the calling workflow provides) is a tracked artifact that may end up in version control, shared with reviewers, or fed to downstream phases. Treat it as **PUBLIC by default**:

- **Auth credentials in spec examples MUST use placeholder syntax**, not real values. Acceptable placeholders: `{valid_token}`, `{admin_token}`, `{api_key}`, `<bearer-token-for-test-user>`. Forbidden: pasting an actual JWT, real OAuth client secret, real API key, real password, real session cookie, or any production-environment token — regardless of whether it's "expired" or "test-only".
- **Test user identities MUST be synthetic.** Use `test-user-1@example.com`, `qa.smoketest@example.com`, fake-name placeholders, synthetic phone numbers (`+1-555-0100` through `+1-555-0199` — the IETF reserved range), and obviously-fake account IDs. Do NOT use real customer emails, real production user IDs, real payment card numbers (use the official Stripe/PSP test card numbers if a card is needed and document the source), or real PII even if it's "your own" data.
- **Internal URLs that embed credentials** (`https://user:pass@internal.example.com/...`) must be redacted to `https://<redacted: credentialed URL>` and the credential location described in prose instead.
- **Database connection strings, signed URLs, service-account JSONs, private keys:** never embed in the spec. If a test scenario needs one, describe the **source** (env var name, secret-manager path) and the **mechanism** (Bearer, Basic, OAuth flow) — never the literal value.
- **Pure functional content** — endpoint paths, HTTP methods, status codes, error message shapes, header names, schema field names — is safe to record verbatim. Redaction targets sensitive *values*, not the structural spec.

If a real production value would be the natural example, replace it with a clearly-fake placeholder of the same shape. Better an obviously-fake example than a leaked real one.

</safety_boundaries>

<failure_handling>

- **Endpoint contracts missing or unloadable** (per step 1 GATE): stop, report to calling workflow, do not author specs.
- **Test cases reference endpoints not present in contracts**: per-test-case `unmappable` flag back to calling workflow; mappable subset still authored.
- **Gap analysis incomplete for material questions**: stop, route to Phase 3 (gap-and-requirements-clarification) before retrying.
- **Test case lacks enough detail to author even one scenario** (no objective, no inputs, no expected outcome): per-test-case `insufficient-detail` flag back; record in `## Excluded Test Cases`.
- **Contract specifies endpoint but with empty / placeholder schemas** (request body declared but schema is `{}`, response schema only declares status code): proceed if the test case's intent is testable against the partial contract; record every inferred field as `[ASSUMED: ...]` per the Assumptions rule. Do not silently fill the empty schema with invented fields.
- **Scenario count exceeds 50 across all test cases**: stop, ask the calling workflow whether to (a) deprioritize P2/P3 scenarios, (b) split the spec across multiple files, or (c) accept the volume. Do NOT auto-prune scenarios — that's a scope decision the calling workflow owns.

</failure_handling>

<validation_checklist>

Run as a final pass before emission. All items must hold:

- **Test-case coverage:** every test case from the input maps to ≥1 ATC entry, OR appears in the `## Excluded Test Cases` section with a reason. No silent drops.
- **ATC completeness:** every ATC has Source, Priority, Type, Endpoint, Given, When, Then, Test Data, Dependencies, Assumptions — none blank.
- **Exact-value rule:** no ATC contains the literal placeholder string `"valid data"`, `"sample input"`, `"normal request"`, `"appropriate value"`, or equivalent vague filler. Every concrete value either traces to a contract/clarification OR is tagged `[ASSUMED: ...]`.
- **Priority and endpoint set on every ATC:** P0/P1/P2/P3 assigned; HTTP method + path filled.
- **Assertion specificity:** every Then block names a concrete status code AND at least one body or header assertion with exact expected value (or `[ASSUMED: ...]` marker).
- **Auth coverage on protected endpoints:** every endpoint requiring auth has at least one auth-failure ATC (401 missing token, 401 invalid token, and 403 insufficient permissions when role-based access applies).
- **File mapping + shared utilities + execution order produced:** all three artifacts in the deliverable, not just the ATC list.
- **Safety re-check per `<safety_boundaries>`:** the produced spec was scanned for literal credentials/tokens/passwords/PII; any found values were replaced with placeholders of the same shape.
- **Excluded test cases recorded:** if step 1 GATE flagged any test cases as unmappable / insufficient-detail, the `## Excluded Test Cases` section is present and lists each with a reason.
- **Assumptions section populated:** every ATC has an `**Assumptions**` block — either listing `[ASSUMED: ...]` entries or the explicit `None — all values derived from endpoint contracts and clarifications.` line.

</validation_checklist>

</api-test-spec-authoring>
