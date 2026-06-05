# Entry Templates and Category Catalogs — qa-gap-analysis

Loaded on demand from SKILL.md when actively writing entries into `analysis.md`. The base SKILL.md keeps the process flow + cross-reference check table + `<safety_boundaries>` + `<success_criteria>` + `<failure_handling>` inline (decision-time content); this file holds the illustrative templates and the gap-category catalogs the agent fills in at write time.

Same lazy-loading pattern as `qa-data-collection/references/output-template.md`.

---

## Step 1 — Cross-Reference entry template

```markdown
### Cross-Reference: Test Case Step [N] vs API Spec

**Test Step**: [Description from test case]
**API Endpoint**: [METHOD] [PATH]
**Match Status**: [Full match / Partial / Mismatch / Not in spec]
**Gaps**: [List any gaps found]
```

---

## Step 2 — Gap categories (what to scan for)

The agent uses these categories to drive identification during step 2. Each bullet is a probe; if a probe matches a missing data point, emit one `G[N]` entry per matched item.

### Missing Endpoint Details
- Endpoint path not documented or ambiguous
- HTTP method not specified
- API version unclear
- Base URL unknown

### Missing Request Details
- Required request body fields unknown
- Field types/formats not specified
- Validation rules not documented (min/max, patterns, enums)
- Content-Type not specified
- Required headers not listed

### Missing Response Details
- Expected status codes not defined for all scenarios
- Response body schema not documented
- Error response format unknown
- Response headers not specified

### Missing Auth Details
- Auth mechanism not specified for endpoint
- Test credentials not provided
- Token acquisition flow unclear
- Required permissions/roles unknown

### Missing Test Data Details
- Test data values not specified (what to send)
- Expected response values not specified (what to assert)
- Precondition data not defined (what must exist before test)
- Cleanup requirements not defined

### Missing Edge Cases
- Empty/null required fields behavior
- Values exceeding limits behavior
- Invalid data types behavior
- Duplicate entries behavior
- Concurrent request behavior
- Rate limiting behavior

### G[N] entry template

```markdown
### G[N]: [Brief Title]
**Type**: Endpoint / Request / Response / Auth / Test Data / Edge Case
**Context**: [Which test step or endpoint this relates to]
**Missing Information**: [What is not specified]
**Impact**: [Why automation is blocked or degraded without this]
**Suggested Question**: [How to ask for this information]
```

---

## Step 3 — Contradiction conflict sources + C[N] template

Look for conflicts between:
- Test case expected results vs API spec response schemas
- Test case preconditions vs actual data requirements
- Documentation descriptions vs Swagger definitions
- Different documentation pages giving different information
- Test case HTTP methods vs endpoint definitions

```markdown
### C[N]: [Brief Title]
**Source 1**: [Test Case / Swagger / Docs] — "[Quote]"
**Source 2**: [Test Case / Swagger / Docs] — "[Quote]"
**Impact**: [Why this matters for test automation]
**Needs Clarification**: [Specific question]
```

---

## Step 4 — Vague-statement examples + A[N] template

Look for vague statements in test cases:
- "Verify the response is correct" (correct how?)
- "Check that the data is saved" (which fields? in which table/store?)
- "Validate error handling" (which errors? what format?)
- "Test with valid data" (what specific values?)
- "Ensure proper authentication" (which auth method? which role?)

```markdown
### A[N]: [Brief Title]
**Source**: [Test Case / Docs / Swagger]
**Vague Statement**: "[Quote]"
**Possible Interpretations**:
  1. [Interpretation 1]
  2. [Interpretation 2]
**Clarification Needed**: [Specific question]
```

---

## Step 5 — Prioritized-questions template

```markdown
## Critical Questions (Must Answer — blocks test creation)

1. [Question about missing endpoint/request/response details]
   - Why: [Impact on test automation]
   - Default if unknown: [Safe assumption or N/A]

## Important Questions (Should Answer — affects test quality)

2. [Question about edge cases or error scenarios]
   - Why: [Impact on test coverage]
   - Default if unknown: [Safe assumption or N/A]

## Optional Questions (Nice to Have — improves completeness)

3. [Question about non-critical scenarios]
   - Why: [Impact on test comprehensiveness]
   - Default if unknown: [Safe assumption or N/A]
```

---

## Redaction examples (referenced from SKILL.md `<safety_boundaries>`)

The operational rule + structural-content rule + targets categories live inline in SKILL.md `<safety_boundaries>`. The per-target examples below are illustrative — loaded on demand at steps 3 + 4 when authoring Contradiction / Ambiguity entries that may include quoted source text.

- **Auth headers / tokens / API keys / passwords** in source text — `Bearer <jwt>`, `Authorization: Basic <base64>`, `X-Api-Key: <key>`, password values in step descriptions. Replace with `<redacted: bearer token>` / `<redacted: api key>` / `<redacted: password>` + one-line inline note (e.g., `Source: Swagger /auth/login — Bearer token redacted; see env var API_TOKEN`).
- **Credentialed URLs** (`https://user:pass@host/...`, signed-URL query params) — redact the credential portion; record the redaction inline.
- **Connection strings / private keys / service-account JSONs** — never paste; describe source (env var, secret-manager path) + mechanism (Bearer / Basic / OAuth flow).
- **Real PII** in test data examples — customer names, real emails, real phone numbers, real account IDs, real payment card numbers. Replace with synthetic equivalents (`test.user-1@example.com`, `+1-555-0100` IETF reserved range, official PSP test card numbers).
- **Test-data fixtures captured from production logs** — redact sensitive fields; keep structural shape.
