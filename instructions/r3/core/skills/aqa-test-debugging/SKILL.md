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
- Test implemented (Phase 6 complete) and executed by the user (Phase 7 prerequisite)
- Test report or execution output available — see `<input_contract>` for canonical paths
- Test plan and page sources available for cross-reference — see `<input_contract>`
- `<test-name>` slug resolved per `aqa-flow-code-analysis.md` `<naming_convention>` (parsed from Phase 1 plan filename or read from `agents/aqa-state.md`)
</prerequisites>

<input_contract>

All input paths use the AQA workflow's canonical `<test-name>` slug — **not** `{TICKET-KEY}`, which is a TestGen convention and does not exist in the AQA naming scheme.

| Input | Canonical path | Required by | Producing phase / step |
|---|---|---|---|
| Test plan | `agents/plans/aqa-<test-name>.md` | Cross-reference during failure categorization | Phase 1 (data collection) |
| Code analysis report | `agents/plans/aqa-<test-name>-code-analysis.md` | Cross-reference for selector / page-object context | Phase 3 (code analysis) |
| Page sources directory | `agents/plans/aqa-<test-name>-page-sources/` | Part A step 4 (selector-error analysis) | Phase 4 (selector identification), step 4.2 of `aqa-flow-selector-identification.md` |
| State file | `agents/aqa-state.md` | Slug resolution + state updates | Phase 0 onward |
| Test report | User-supplied path, OR file under `agents/user-instructions/` discovered by keyword scan in Part A step 1 | Part A step 1 | User (after Phase 6 stop-for-execution) |

**Existence validation** happens at the point of use:
- Test plan + code analysis report: opportunistic — used for cross-reference; absence degrades but does not block.
- **Page sources directory: MUST be validated to exist before Part A step 4 runs.** If missing, do not silently skip selector-error analysis — apply the `<failure_handling>` "page sources missing" rule.
- Test report: validated in Part A step 1 (keyword scan + ask-user fallback).

</input_contract>

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

0. **Validate page-sources directory exists** at the canonical path `agents/plans/aqa-<test-name>-page-sources/` (per `<input_contract>` — same `<test-name>` slug used by the Phase 1 plan filename and Phase 4 selector-identification step 4.2). If missing, apply the `<failure_handling>` "page sources missing" rule — do **not** silently degrade to non-page-source analysis.
1. Locate page source files in `agents/plans/aqa-<test-name>-page-sources/`
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

<failure_handling>

- **Test report missing** (no file in `agents/user-instructions/`, user does not supply path after one ask): stop Part A, record `aqa-test-debugging: test report not provided` in the parent workflow state, do not proceed.
- **Test report unparseable** (binary, corrupted, unknown format): stop, report the parse error with the file path, ask the user for an alternative format.
- **Page sources missing** (`agents/plans/aqa-<test-name>-page-sources/` does not exist when Part A step 4 needs it): do **not** silently skip selector analysis. Record `aqa-test-debugging: page sources missing — selector-error root causes degraded to "evidence missing"` in the workflow state, and tag every selector-category failure entry with `Root Cause: Unknown — page sources not available; would need Phase 4 selector identification re-run`. Continue with the remaining failure categories that don't depend on page sources.
- **`<test-name>` unresolved or ambiguous:** stop, ask the parent phase to resolve the slug per `aqa-flow-code-analysis.md` `<naming_convention>`, do not guess at the page-sources path.
- **Test plan or code-analysis report missing** (used for cross-reference only): record the absence in the analysis output, proceed with degraded cross-reference (the test report alone can still drive categorization and selector analysis).

</failure_handling>

<pitfalls>
- Listing failures without analyzing root causes
- Skipping page source analysis for selector errors silently — if page sources are missing, declare it (see `<failure_handling>`); do not pretend the analysis was complete
- Using a `{TICKET-KEY}` path instead of `<test-name>` — `{TICKET-KEY}` is a TestGen convention not present in AQA naming
- Applying changes without user approval
- Making unrelated changes alongside fixes
- Not re-validating linting after corrections
- Changing test intent while fixing implementation
</pitfalls>

</aqa-test-debugging>
