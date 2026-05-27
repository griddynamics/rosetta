---
name: aqa-test-debugging
description: Analyze test execution reports, identify failure root causes with page source analysis, propose corrections, and apply approved fixes.
tags: []
baseSchema: docs/schemas/skill.md
---

<aqa-test-debugging>

<role>Test failure analysis and correction specialist</role>

<when_to_use_skill>
Analyze test execution results, categorize failures, identify root causes, and prepare targeted corrections for approval.
</when_to_use_skill>

<prerequisites>
- Test implemented and executed
- Test report or execution output available
- Test plan and page sources available for cross-reference
</prerequisites>

<process>

## Part A: Report Analysis

### 1. Locate Test Report

Check `agents/user-instructions/` for report location keywords: "test report", "report location", "test output", "report path".

If not found, ask user for:
- Test report file path
- Test execution output/logs
- Report directory location

### 2. Parse Test Report

Extract:
- Execution status per test (passed/failed/skipped)
- Failure count and error messages
- Stack traces
- Test duration
- Screenshots or artifacts (if available)

### 3. Categorize Failures

For each failure, classify:
- **Selector issues**: element not found, selector incorrect
- **Timing issues**: timeouts, race conditions
- **Assertion failures**: expected vs actual mismatches
- **Setup issues**: preconditions not met, data problems
- **Application issues**: bugs in app under test
- **Test code issues**: logic errors, incorrect implementation

### 4. Analyze Selector/Locator Errors

When error matches patterns: "selector did not become visible", "locator did not become visible", "selector not found", "locator not found", "element not found", "NoSuchElementException", "ElementNotFoundError", "TimeoutException" on element visibility:

1. Locate page source files from `agents/aqa/{TICKET-KEY}/page-sources/`
2. Search for selector in page source
3. Check if element exists with different attributes
4. Verify selector syntax matches actual HTML
5. Check for iframe, shadow DOM, dynamic generation
6. Verify visibility conditions (display:none, hidden)
7. Compare expected vs actual DOM structure

### 5. Identify Patterns and Root Causes

- Common error types across failures
- Related test failures
- Shared problematic selectors
- Recurring timing issues

Prioritize:
- **Critical**: tests completely broken
- **High**: major functionality not working
- **Medium**: partial assertion failures
- **Low**: minor issues, edge cases

### 6. Analyze Performance (if data available)

- Total and per-test execution time
- Unusually slow tests
- Flakiness indicators

## Part B: Corrections

### 7. Prepare Proposed Changes

For each issue, document:

```markdown
### Proposed Change: [Issue]

**File**: [path]
**Current Code**: [snippet]
**Proposed Code**: [snippet]
**Reason**: [why this fixes the issue]
**Impact**: [what this affects]
```

Match fixes to root cause categories:
- Selector issues → update page objects
- Timing issues → add waits or adjust timing
- Assertion failures → fix logic or expected values
- Setup issues → fix preconditions
- Test code issues → fix implementation

### 8. Apply Approved Changes

After user approval:
1. Apply changes one at a time
2. Verify each change is correct
3. Follow project standards
4. Check linting after each file modification
5. Validate changes address root causes

</process>

<output_format>

```markdown
## Test Report Analysis

### Execution Summary
- Total: [N] | Passed: [N] | Failed: [N] | Skipped: [N]
- Duration: [time]

### Failures
#### [Test Name]
- Error Type: [category]
- Error: [message]
- Root Cause: [analysis]
- Page Source Analysis: [if selector error]
- Priority: [level]

### Proposed Corrections
[Change list with before/after code]

### Applied Corrections (after approval)
- Files Modified: [list]
- Issues Fixed: [count]
- Status: Ready for re-testing
```

</output_format>

<pitfalls>
- Listing failures without analyzing root causes
- Skipping page source analysis for selector errors
- Applying changes without user approval
- Making unrelated changes alongside fixes
- Not re-validating linting after corrections
- Changing test intent while fixing implementation
</pitfalls>

</aqa-test-debugging>
