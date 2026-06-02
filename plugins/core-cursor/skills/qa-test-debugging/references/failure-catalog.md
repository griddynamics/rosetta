# Failure Catalog + Per-Failure Entry Template — qa-test-debugging

Loaded on demand from SKILL.md step 3 ("Categorize Failures") when actively classifying API test failures. The base SKILL.md keeps step 3 as a thin orchestration entry; this file holds the 7-category catalog (Symptoms / Root Cause / Action per category) + the per-failure markdown entry template the agent emits per failure.

Mirrors the same lazy-loading pattern used by `aqa-test-debugging`'s `references/part-b-mechanics.md` and `qa-data-collection`'s sibling references.

---

## 7-category failure catalog (referenced from SKILL.md step 3)

For each failure, assign **exactly one** of the seven categories below. The seven are exhaustive + mutually exclusive — do not introduce variants or rename them; downstream sections (`Failures by Category` table in the output, Part B fix-matching rules) reference these category names by string.

### 1. Connection / Environment Issues

- **Symptoms:** ConnectionError, TimeoutError, DNS resolution failure
- **Root Cause:** API server not running, wrong base URL, network issues
- **Action:** Verify environment setup, not a test code issue

### 2. Authentication Failures

- **Symptoms:** 401 Unauthorized when expecting success, token errors
- **Root Cause:** Auth helper misconfigured, expired credentials, wrong token endpoint
- **Action:** Fix auth setup in test utilities

### 3. Request Issues

- **Symptoms:** 400/422 on happy path tests, validation errors
- **Root Cause:** Wrong request body, missing required fields, wrong content type, incorrect endpoint path
- **Action:** Fix request construction to match API spec

### 4. Response Assertion Failures

- **Symptoms:** AssertionError on status code or body, unexpected response structure
- **Root Cause:** Expected values differ from actual API response
- **Subcategories:**
  - Status code mismatch (expects 200, gets 201)
  - Schema mismatch (response body structure differs)
  - Value mismatch (field values differ)
  - Missing fields (expected field not in response)
- **Action:** Fix assertions OR update test specs if API behavior is correct

### 5. Test Data Issues

- **Symptoms:** 404 on resources that should exist, foreign key violations, duplicate key errors
- **Root Cause:** Precondition data not set up correctly, data from previous test not cleaned up
- **Action:** Fix test data setup/teardown

### 6. Timing / Race Condition Issues

- **Symptoms:** Intermittent failures, tests pass individually but fail in suite
- **Root Cause:** Async operations not awaited, concurrent test interference
- **Action:** Add proper waits, improve test isolation

### 7. Application Bug

- **Symptoms:** API returns unexpected error, behavior doesn't match spec
- **Root Cause:** Bug in the API under test, not in test code
- **Action:** Report as application defect, may need test adjustment or skip

---

## Per-failure entry template (referenced from SKILL.md step 3 + `<output_format>`)

Emit one entry per failure. Apply `<safety_boundaries>` redaction to headers, bodies, URLs, and stack traces BEFORE writing — never after.

```markdown
### Failure: [Test Name] (ATC-[NNN])

**Status**: FAIL / ERROR
**Category**: [Connection / Auth / Request / Response / Data / Timing / App Bug]
**Error Message**: [Full error message — credentials/PII redacted]
**Stack Trace**: [Key lines — credentials/PII redacted]

**Request Sent** (if available):
- Method: [HTTP method]
- URL: [Full URL — query params / credentialed URL portions redacted]
- Headers: [Key headers — `Authorization`, `Cookie`, `X-Api-Key` values replaced with `<redacted: bearer token>` / `<redacted: session cookie>` / `<redacted: api key>`; presence + mechanism described, not literal value]
- Body: [Request body — credentials/tokens/PII fields redacted; structural fields verbatim]

**Response Received** (if available):
- Status: [Status code]
- Body: [Response body or excerpt — `Set-Cookie`, response tokens, PII fields redacted; structural fields verbatim]

**Expected vs Actual**:
- Expected: [What test expected]
- Actual: [What API returned — redacted per the same rules above]

**Root Cause Analysis**: [Why this failed]
**Suggested Fix**: [Specific code change or approach]
**Priority**: Critical / High / Medium / Low
**Affects Other Tests**: [Yes/No — list if yes]
```
