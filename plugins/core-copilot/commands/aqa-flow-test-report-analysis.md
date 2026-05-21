---
name: modernization-flow-reuse
description: Phase 7 of AQA workflow - Test Report Analysis
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Phase 7: Test Report Analysis

## Objective

Analyze test execution reports to identify failures, errors, and areas for improvement. This phase requires **USER INTERACTION** if test report location is not specified in user instructions.

## Prerequisites

- Phase 6 completed
- Test executed by user
- Test report generated (or test execution output available)

## Phase Tasks

### Task 1: Determine Test Report Location

**Actions**:
1. Check if `agents/user-instructions/` directory exists
2. If directory exists:
   - Read all files in `agents/user-instructions/` directory
   - Extract test report location/path from user instructions (check all files)
   - Look for keywords: "test report", "report location", "test output", "report path", "test results"
   - Document found location and which file(s) contained it
3. If directory does NOT exist OR location not found in user instructions:
   - **ASK USER** for test report location:
     ```
     I need to analyze the test execution report. Please provide:
     
     - Test report file path (if report was saved to file)
     - OR test execution output/logs
     - OR directory where test reports are stored
     
     Common locations:
     - Test framework output directories (e.g., test-results/, reports/, coverage/)
     - CI/CD artifact locations
     - Console output/logs
     ```
   - **WAIT** for user to provide test report location
   - Document provided location
4. Verify report location exists and is accessible

**Expected Output**: Test report location determined and verified.

### Task 2: Read Test Report

**Actions**:
1. Read test report file(s) from determined location:
   - Use Read tool for text-based reports
   - Use appropriate tool for JSON/XML/HTML reports
   - If multiple files, read all relevant reports
2. If report is in console/log format:
   - Ask user to provide test execution output
   - Or read from log files if available
3. Extract key information:
   - Test execution status (passed/failed/skipped)
   - Number of tests executed
   - Number of failures
   - Error messages and stack traces
   - Test duration
   - Screenshots or artifacts (if available)
   - Coverage information (if available)

**Expected Output**: Complete test report data extracted and ready for analysis.

### Task 3: Analyze Test Failures

**Actions**:
1. Identify all failed tests:
   - Test names that failed
   - Failure reasons
   - Error types (assertion failures, timeouts, element not found, etc.)
2. Categorize failures:
   - **Selector Issues**: Element not found, selector incorrect
   - **Timing Issues**: Timeouts, race conditions, waits needed
   - **Assertion Failures**: Expected vs actual mismatches
   - **Setup Issues**: Preconditions not met, test data issues
   - **Application Issues**: Bugs in application under test
   - **Test Code Issues**: Logic errors, incorrect implementation
3. **For selector/locator errors, analyze page sources**:
   - If error message contains patterns like:
     - "selector did not become visible"
     - "locator did not become visible"
     - "selector not found"
     - "locator not found"
     - "element not found"
     - "NoSuchElementException"
     - "ElementNotFoundError"
     - "TimeoutException" (when waiting for element visibility)
   - **MUST analyze page source**:
     1. Locate page source files from Phase 4 (`agents/aqa/{TICKET-KEY}/page-sources/`)
     2. Read relevant page source file(s) for the failing test
     3. Search for the selector/locator in page source:
        - Check if element exists with different attributes
        - Verify selector syntax matches actual HTML structure
        - Identify if element is in iframe or shadow DOM
        - Check if element is dynamically generated
        - Verify element visibility conditions (display:none, visibility:hidden, etc.)
     4. Compare expected selector with actual DOM structure
     5. Identify potential fixes:
        - Correct selector if syntax is wrong
        - Use different locator strategy if element exists but selector is incorrect
        - Add waits if element loads dynamically
        - Handle iframe/shadow DOM if applicable
        - Check for element state (hidden, disabled, etc.)
   - Document page source analysis findings
4. For each failure, document:
   ```markdown
   ### Failure: [Test Name]
   
   **Error Type**: [Category]
   **Error Message**: [Full error message]
   **Stack Trace**: [If available]
   **Likely Cause**: [Analysis of root cause]
   **Page Source Analysis**: [If selector/locator error]
     - Page Source File: [Path]
     - Selector Used: [Selector from test]
     - Element Found in DOM: [Yes/No/Partial]
     - Actual Element Structure: [If found, describe]
     - Visibility State: [Visible/Hidden/Not rendered]
     - Suggested Selector Fix: [If applicable]
   **Suggested Fix**: [Initial suggestion]
   **Priority**: [High/Medium/Low]
   ```

**Expected Output**: Categorized list of all failures with analysis, including page source analysis for selector/locator errors.

### Task 4: Analyze Test Performance

**Actions**:
1. Review test execution time:
   - Total execution time
   - Individual test durations
   - Slow tests (if duration data available)
2. Identify performance issues:
   - Tests taking unusually long
   - Potential flakiness indicators
   - Resource-intensive operations
3. Document performance findings:
   ```markdown
   ### Performance Analysis
   
   - Total Execution Time: [Duration]
   - Average Test Duration: [Duration]
   - Slowest Tests: [List]
   - Performance Concerns: [List]
   ```

**Expected Output**: Performance analysis documented.

### Task 5: Identify Patterns and Root Causes

**Actions**:
1. Look for patterns across failures:
   - Multiple failures with same error type
   - Failures in related tests
   - Common selectors causing issues
   - Recurring timing problems
2. Determine root causes:
   - Is it a selector problem? (Phase 4/5 issue)
     - **If selector/locator errors**: Use page source analysis from Task 3 to verify if selector matches actual DOM structure
     - Check if page source shows element exists but selector is incorrect
     - Verify if element structure changed since Phase 4/5
   - Is it a test implementation problem? (Phase 6 issue)
   - Is it an application bug? (not test issue)
   - Is it a test data problem? (Phase 2 issue)
   - Is it an environment issue? (infrastructure)
3. Prioritize issues:
   - **Critical**: Tests completely broken, blocking
   - **High**: Major functionality not working
   - **Medium**: Some assertions failing, partial functionality
   - **Low**: Minor issues, edge cases

**Expected Output**: Root cause analysis with prioritized issues.

### Task 6: Update Test Plan with Analysis

**Actions**:
1. Add Phase 7 section to test plan:
   ```markdown
   ## Phase 7: Test Report Analysis
   
   ### Test Execution Summary
   - Execution Date: [DateTime]
   - Total Tests: [Count]
   - Passed: [Count]
   - Failed: [Count]
   - Skipped: [Count]
   - Execution Time: [Duration]
   
   ### Test Report Location
   - Source: [agents/user-instructions/ files / User provided]
   - Files Checked: [List of files checked]
   - Path: [Report file path]
   
   ### Failures Identified
   [List of all failures from Task 3]
   
   ### Root Cause Analysis
   [Analysis from Task 5]
   
   ### Performance Analysis
   [Findings from Task 4]
   
   ### Recommended Actions
   - [Action 1 with priority]
   - [Action 2 with priority]
   - [Action 3 with priority]
   
   ### Next Steps
   - Proceed to Phase 8 to correct identified issues
   ```

**Expected Output**: Test plan updated with comprehensive analysis.

## Completion Criteria

- [ ] Test report location determined (from agents/user-instructions/ files or user provided)
- [ ] Test report read and parsed
- [ ] All failures identified and categorized
- [ ] Root causes analyzed
- [ ] Performance issues identified (if applicable)
- [ ] Test plan updated with Phase 7 analysis
- [ ] `agents/aqa-state.md` updated with Phase 7 completion

## Update State File

After completing Phase 7, update `agents/aqa-state.md`:

```markdown
### Phase 7: Test Report Analysis
- Completed: [DateTime]
- Test Report Location: [Path or source]
- Report Source: [agents/user-instructions/ files / User provided]
- Files Checked: [List of files checked]
- Tests Executed: [Count]
- Tests Passed: [Count]
- Tests Failed: [Count]
- Critical Issues: [Count]
- Root Causes Identified: [List]
```

Mark Phase 7 as completed and Phase 8 as current.

## Next Phase

After analysis is complete, proceed to **Phase 8: Test Corrections** by executing:
```
ACQUIRE aqa-phase8-md FROM KB
```

## Important Notes

- **Report Location Priority**: Always check all files in agents/user-instructions/ directory first, then ask user if not found
- **Comprehensive Analysis**: Don't just list failures - analyze root causes
- **Page Source Analysis**: **MUST** analyze page sources when encountering selector/locator errors (element not found, selector not visible, etc.) to identify actual DOM structure and suggest correct selectors
- **Pattern Recognition**: Look for common issues across multiple failures
- **User Context**: Consider user's test execution environment when analyzing failures
- **Actionable Insights**: Provide clear, actionable recommendations for fixes
