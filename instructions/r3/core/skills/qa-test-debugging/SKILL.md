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
</when_to_use_skill>

<prerequisites>
- Tests implemented and executed
- Test report or execution output available
- Test specifications and API analysis available for cross-reference
</prerequisites>

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

Document each failure:
```markdown
### Failure: [Test Name] (ATC-[NNN])

**Status**: FAIL / ERROR
**Category**: [Connection / Auth / Request / Response / Data / Timing / App Bug]
**Error Message**: [Full error message]
**Stack Trace**: [Key lines]

**Request Sent** (if available):
- Method: [HTTP method]
- URL: [Full URL]
- Headers: [Key headers]
- Body: [Request body]

**Response Received** (if available):
- Status: [Status code]
- Body: [Response body or excerpt]

**Expected vs Actual**:
- Expected: [What test expected]
- Actual: [What API returned]

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
</pitfalls>

</qa-test-debugging>
