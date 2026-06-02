---
name: qa-test-debugging
description: Analyze API test execution reports, categorize failures by root cause, propose corrections, and apply approved fixes.
tags: ["qa"]
baseSchema: docs/schemas/skill.md
---

<qa-test-debugging>

<role>API test failure analysis and correction specialist</role>

<when_to_use_skill>
Analyze API test execution results, categorize failures, identify root causes, prepare targeted corrections for approval, and apply approved fixes.

**Part A / Part B usage boundary.** The skill bundles two responsibilities with materially different risk profiles:

- **Part A — Report Analysis** (steps 1–5): **read-only**. Parses the execution report, categorizes failures, identifies root causes, produces `execution-report.md`. No file mutation outside the analysis artifact.
- **Part B — Corrections** (steps 6–8): **writes test source files + runs lint**. Prepares proposed changes, applies them after explicit user approval per `<safety_boundaries>`, validates with linting.

A caller may invoke **Part A only** (analysis without correction mandate) — useful when the calling workflow wants to surface failure categories without authorizing code changes. Part B requires Part A's output as input AND the explicit approval signals enumerated in `<safety_boundaries>`. The parts must not be conflated: a Part-A-only invocation MUST NOT execute steps 6–8.
</when_to_use_skill>

<prerequisites>
- Tests implemented and executed
- Test report or execution output available
- Test specifications and API analysis available for cross-reference
</prerequisites>

<safety_boundaries>

`execution-report.md` is a tracked artifact and may end up in version control, shared review, or downstream prompt contexts. Treat it as **PUBLIC by default**. Failure stack traces and captured request/response data are a common secret-leak vector — redact before writing, not after.

**Targets to redact** (replace with placeholders + describe presence/mechanism in prose, never the literal value):

- **Auth headers** — `Authorization: Bearer <jwt>`, `Authorization: Basic <base64>`, `X-Api-Key: <key>`, `Cookie: session=<id>`, `Set-Cookie` response headers. Replace with `<redacted: bearer token>` / `<redacted: basic credentials>` / `<redacted: api key>` / `<redacted: session cookie>` and add a one-line description (e.g., "Bearer token from `AuthHelper.get_token('admin')`").
- **Credentialed URLs** (`https://user:pass@host/...`) — redact the `user:pass@` portion before recording.
- **Query-string secrets** — `?api_key=...`, `?token=...`, `?access_token=...`, signed-URL signatures (`?X-Amz-Signature=...`, `?sig=...`) — redact the secret-bearing parameter values.
- **Request bodies** containing credentials, tokens, password fields, payment data — redact those fields specifically; keep structural fields (field names, non-sensitive values, schema shape) verbatim.
- **Response bodies** containing tokens (`access_token`, `refresh_token`, `id_token`), session identifiers, PII (real customer emails / names / phone numbers / account IDs / payment data) — redact the sensitive values; keep structural fields verbatim.
- **Stack traces / error messages** sometimes embed credentials (e.g., a logged HTTP request line in a connection-error stack). Scan and redact before pasting.
- **Environment Info** (step 2) — record `auth method = OAuth2 client-credentials` / `JWT Bearer` / `Basic Auth via env var BASIC_AUTH_USER:BASIC_AUTH_PASS` — never the literal token or password. Base URLs are usually safe (e.g., `https://api.staging.example.com`); credentialed base URLs are not.

**Structural content stays verbatim.** Endpoint paths, HTTP methods, status codes, error message templates, field names, schema shapes, response status text are functional and recorded as-is. Redaction targets sensitive **values**, not the structural failure spec.

If a real production value would be the natural example in a failure entry, replace with a clearly-fake placeholder of the same shape — better an obviously-fake example than a leaked real token committed to the repo.

This boundary applies to BOTH Part A (writing `execution-report.md`) AND Part B (any debug logging the agent emits while applying corrections).

</safety_boundaries>

<failure_handling>

Consolidated stop / route behaviors. Inline references in step 1 (locate report) and step 8 (iteration cap) point here.

- **Test report path not provided after step-1 ask** (user does not respond with a path, or explicitly declines to supply one): stop the skill, report `qa-test-debugging: test report path not provided after ask — cannot analyze` to the calling workflow, do NOT fabricate analysis. Acceptable resumption: the user later supplies a path; Part A then restarts at step 1.
- **Report present but unparseable** (binary blob without recognizable text, malformed JSON/XML/JUnit, encoding error): stop Part A at step 2, report the parse error with the file path and parser identifier (e.g., `JUnit XML parse error at line N`), ask the user to verify the report format. Do NOT guess at content.
- **Report present but empty** (file exists with zero bytes OR the parser returns zero per-test results): record this fact in `execution-report.md` Execution Summary as `Tests Executed: 0 — empty report; no analysis possible`. Skip Part B entirely (no failures to correct). Mark the skill complete; surface to the calling workflow that nothing was analyzed.
- **Zero failures found** (report parses cleanly AND every test passed): write `execution-report.md` with the passing summary and `Failures by Category: None — all tests passed`. **Skip Part B** (steps 6–8) — there are no corrections to propose. Mark the skill complete.
- **Iteration cap reached at step 8** (3 iterations with failures remaining): escalate per step 8's policy (stop and ask user; do NOT auto-start a 4th iteration). The skill is complete only after the user provides explicit waiver OR accepts the failures as application defects.
- **API analysis or test specifications missing** (referenced by step 3 for cross-checking expected vs actual): proceed with degraded analysis, record `Cross-reference degraded: test-specs / api-analysis not loaded` in the Failure entry's Notes. Do not stop the whole skill — selector/locator analysis and pattern identification can still run.
- **`execution-report.md` unwritable** at the supplied path (permission denied, disk full): pause, report the filesystem error with the file path. Do not mark complete.

</failure_handling>

<process>

## Part A: Report Analysis

### 1. Locate Test Report

Check `agents/user-instructions/` for report location keywords: "test report", "report location", "test output", "report path".

If not found, ask user for:
- Test report file path
- Test execution output/logs
- Report directory location

### 2. Parse Test Results

Extract:
- **Execution Summary**: total tests, passed, failed, skipped, errored, duration
- **Per-Test Results**: test name and ATC reference, status, duration, error message, stack trace, request/response details (if in logs)
- **Environment Info** (if available): API base URL, auth method, test environment

### 3. Categorize Failures

For each failure, classify:

#### Connection / Environment Issues
- **Symptoms**: ConnectionError, TimeoutError, DNS resolution failure
- **Root Cause**: API server not running, wrong base URL, network issues
- **Action**: Verify environment setup, not a test code issue

#### Authentication Failures
- **Symptoms**: 401 Unauthorized when expecting success, token errors
- **Root Cause**: Auth helper misconfigured, expired credentials, wrong token endpoint
- **Action**: Fix auth setup in test utilities

#### Request Issues
- **Symptoms**: 400/422 on happy path tests, validation errors
- **Root Cause**: Wrong request body, missing required fields, wrong content type, incorrect endpoint path
- **Action**: Fix request construction to match API spec

#### Response Assertion Failures
- **Symptoms**: AssertionError on status code or body, unexpected response structure
- **Root Cause**: Expected values differ from actual API response
- **Subcategories**:
  - Status code mismatch (expects 200, gets 201)
  - Schema mismatch (response body structure differs)
  - Value mismatch (field values differ)
  - Missing fields (expected field not in response)
- **Action**: Fix assertions OR update test specs if API behavior is correct

#### Test Data Issues
- **Symptoms**: 404 on resources that should exist, foreign key violations, duplicate key errors
- **Root Cause**: Precondition data not set up correctly, data from previous test not cleaned up
- **Action**: Fix test data setup/teardown

#### Timing / Race Condition Issues
- **Symptoms**: Intermittent failures, tests pass individually but fail in suite
- **Root Cause**: Async operations not awaited, concurrent test interference
- **Action**: Add proper waits, improve test isolation

#### Application Bug
- **Symptoms**: API returns unexpected error, behavior doesn't match spec
- **Root Cause**: Bug in the API under test, not in test code
- **Action**: Report as application defect, may need test adjustment or skip

Document each failure (apply `<safety_boundaries>` redaction to headers, bodies, URLs, and stack traces BEFORE writing):

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

### 4. Identify Patterns

Look for patterns across failures:
1. **Common root cause**: Multiple tests failing for same reason (e.g., all auth tests fail -> auth helper broken)
2. **Cascading failures**: One setup failure causing downstream test failures
3. **Environment-specific**: All tests fail -> likely environment issue
4. **Category distribution**: Mostly request issues -> spec was incorrect; mostly response issues -> API changed

### 5. Produce Execution Report

Create `agents/qa/{IDENTIFIER}/execution-report.md` with: execution summary, results by priority, results by failure category, failure details, patterns, and recommendations (immediate fixes, application defects, environment issues, deferred improvements).

## Part B: Corrections

### 6. Prepare Proposed Changes

For each issue, document:

```markdown
### Proposed Change [N]: [Issue Description]

**Affected Tests**: [ATC-NNN, ATC-NNN, ...]
**File**: [File path]
**Root Cause**: [From analysis]

**Current Code**:
[Current code snippet]

**Proposed Code**:
[Proposed code snippet]

**Reason**: [Why this change fixes the issue]
**Impact**: [What this change affects]
**Risk**: [Low / Medium / High]
```

Match fixes to root cause categories:
- Auth issues -> update auth helper configuration
- Request issues -> correct request body, fix endpoint paths, add headers
- Assertion failures -> update expected values, fix field names
- Data setup issues -> fix factory methods, correct setup order, add cleanup
- Config issues -> update base URL, fix env var references

Prioritize:
- Pattern fixes (resolve multiple failures) first
- Then critical/high priority individual fixes
- Then medium/low priority

### 7. Apply Approved Changes

After user approval:
1. Apply changes one at a time
2. Verify each change is syntactically correct
3. Follow project coding standards
4. Check linting after each file modification
5. Verify no unintended side effects on passing tests
6. If specs were incorrect, update `test-specs.md`

### 8. Iteration Policy

- If tests pass after corrections -> mark QA flow as COMPLETE
- If tests still fail -> return to Part A with new results
- Maximum recommended iterations: 3 (after that, escalate — likely application issue or fundamental spec mismatch)

</process>

<output_format>

```markdown
## Test Report Analysis

### Execution Summary
- Total: [N] | Passed: [N] | Failed: [N] | Skipped: [N]
- Duration: [time]

### Failures by Category
| Category | Count | Tests Affected |
|----------|-------|----------------|
| [Category] | [N] | [list] |

### Failure Details
[Per-failure analysis]

### Patterns
[Cross-failure patterns]

### Proposed Corrections
[Change list with before/after code]

### Applied Corrections (after approval)
- Files Modified: [list]
- Issues Fixed: [count]
- Status: Ready for re-testing
```

</output_format>

<pitfalls>
- Listing failures without analyzing root causes — not actionable
- Applying changes without user approval
- Making unrelated changes alongside fixes
- Not re-validating linting after corrections
- Changing test intent while fixing implementation
- Not separating test code bugs from application bugs
- Spiraling beyond 3 correction iterations without escalating
- Pasting auth headers (`Authorization: Bearer ...`), cookies, API keys, or PII verbatim into `execution-report.md` — apply `<safety_boundaries>` redaction before writing, not after
- Recording an environment's auth tokens or DB connection strings in the `Environment Info` section instead of `mechanism + source` description
</pitfalls>

<success_criteria>

High-level done-condition. Item-level checks live in `<validation_checklist>` (canonical) — referenced here, not restated.

**Complete when:** Part A's `execution-report.md` is emitted with every `<validation_checklist>` Part-A item satisfied; AND if Part B ran, every `<validation_checklist>` Part-B item is satisfied (including the 3-iteration cap + escalation rule at step 8).

**NOT complete** if any `<validation_checklist>` item is unmet — premature completion declaration is a regression. (Specific failure modes the checklist catches: missing output sections, unlabeled failures, literal credentials/PII in the artifact, applied change without approval, app/product source touched, silent test-intent alteration, iteration 3 without escalation.)

</success_criteria>

<validation_checklist>

Run before declaring the skill complete. Items apply per the part(s) that ran (Part A only, or Part A + Part B).

**Part A (report analysis):**
- `agents/qa/{IDENTIFIER}/execution-report.md` written with all `<output_format>` sections present (Execution Summary, Failures by Category, Failure Details, Patterns, Proposed Corrections, Applied Corrections section as `Pending` until Part B runs).
- **Every failure entry has a Category and Root Cause Analysis populated** — no entry left as `TBD` or with placeholder fields.
- **Every failure entry has a Priority** (Critical / High / Medium / Low) — never blank.
- **Patterns section populated** with either a real cross-failure pattern OR an explicit `No cross-failure patterns identified` line if none — not silently empty.
- **Safety re-scan ran per `<safety_boundaries>`** — `execution-report.md` was grepped for `Bearer `, `Authorization:`, `Cookie:`, `Set-Cookie:`, `api_key=`, JWT shape, `BEGIN PRIVATE KEY`, and obvious PII shapes; any hits were replaced with placeholders before declaring Part A complete.

**Part B (corrections — when applied):**
- **Each applied change was lint-checked** (step 7.4) and the result is recorded in the `Applied Corrections` section.
- **Each applied change was side-effect-verified** (step 7.5) — passing tests were re-checked and no regression was introduced, OR the regression is documented for re-test.
- **Test intent unchanged.** No applied change altered the assertion semantics of an ATC; only implementation was corrected. Spec changes (when API behavior is correct and the test was wrong) were recorded as updates to `test-specs.md`, not silent assertion changes.
- **`test-specs.md` updates recorded** when corrections required spec changes (step 7.6).
- **Iteration count tracked** against the 3-iteration cap (step 8). The current iteration number is recorded in the `Applied Corrections` section; if this is iteration 3 and tests still fail, the escalation note is also recorded.
- **No unrelated changes** — every modified file appears in `Files Modified` and traces to a Proposed Change entry approved in step 6/7.

</validation_checklist>

</qa-test-debugging>
