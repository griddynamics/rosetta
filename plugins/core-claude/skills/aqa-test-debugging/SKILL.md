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

### 9. Track Iteration Count and Escalate at the 3-Iteration Cap

This Part A → Part B cycle may loop (Phase 7 analysis → Phase 8 corrections → re-execution → Phase 7 analysis again on still-failing tests). The cycle is **capped at 3 iterations** to prevent runaway diagnose/patch loops that mask deeper application bugs or fundamental spec mismatches.

1. **Read the iteration counter** from the parent workflow state file (default field `Phase 7/8 iteration: N`; counter starts at `1` on the first Part A → Part B pass). If the field is absent, treat as iteration `1` and initialize it.
2. **Increment the counter** when this skill completes Part B (one full apply pass = one iteration) and write it back to the state file.
3. **Cap enforcement.** After the 3rd iteration completes:
   - If the most recent test re-execution shows **all tests pass** → mark the AQA flow as **COMPLETE** in state and stop.
   - If failures still remain → **STOP** the iterate-on-corrections cycle. Record an **escalation note** in the analysis artifact's `## Escalation` section AND in `agents/aqa-state.md`:
     ```
     Escalation: 3-iteration cap reached with N failure(s) remaining.
     Likely cause: application defect under test (Application Bug category dominates) OR fundamental test-spec mismatch (Response Assertion / Request Issue patterns persist across iterations).
     Recommended next steps: <one of>
       - Surface remaining failures as application defects to the product team (do NOT continue patching tests around them).
       - Revisit Phase 2 (Requirements Clarification) to verify the test plan's assertions match current API/UI behavior.
       - User decides whether to continue with a 4th iteration under explicit waiver.
     ```
   - Ask the user how to proceed; **do NOT auto-start a 4th iteration** without an explicit user waiver recorded in the state file.

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

<safety_boundaries>

Part B applies real code changes to the repository's test files. The Part A analysis writes a tracked artifact downstream phases consume. Both halves require explicit boundaries.

**Approval discipline (Part B):**

- **Never apply a code change without an explicit approval signal.** Acceptable signals: the calling workflow's recorded approval token, an explicit user response naming the specific Proposed Change (e.g., `apply Change 2`, `approved: Change 1 and Change 3`), or a workflow state-file row recording the approval. Inferred approval from prose ("looks good", "ok", "go ahead", silence) is **forbidden** — re-ask once, then default to NOT applying if still ambiguous. Apply changes one at a time so each approval maps unambiguously to a single Proposed Change.
- **Stay inside the matched root-cause scope.** Each Proposed Change applies to the file(s) the root-cause analysis named, fixing the cited failure mode. Do NOT make adjacent edits ("while I'm here" cleanups, rename refactors, import reordering, formatting passes) outside that scope. Adjacent issues are recorded as separate Proposed Changes for separate approval.
- **Never alter test intent while fixing implementation.** Implementation can change (selector value, wait strategy, helper call); the assertion semantics of an ATC cannot. If the test plan / spec is wrong (the API or UI actually behaves correctly and the test was wrong), record that as a spec update — do NOT silently flip the assertion.
- **Test-code-only writes.** This skill writes only to test files, page-object files when the root cause is a selector update agreed with the user, and the analysis artifact. It does NOT modify application/product source code under test. If a fix would touch app source, stop and report `aqa-test-debugging: proposed fix is in application source <path>, not test code — escalate to product team / out-of-scope for this skill`. Application bugs surface as Application Bug findings in Part A's category list; Part B does not author them.

**Analysis-artifact discipline (Part A):**

- The Part A output (`execution-report.md` / parent-supplied analysis artifact path) is tracked and downstream-fed. If failure stack traces, request/response captures, or environment info embed credentials / tokens / PII, redact before writing: `Authorization: Bearer <jwt>` → `<redacted: bearer token>`; `X-Api-Key: <key>` → `<redacted: api key>`; real customer emails/names/phone numbers → synthetic placeholders. Structural content (status codes, endpoint paths, error message templates, framework stack frames) stays verbatim.

</safety_boundaries>

<success_criteria>

The skill is complete when **all of** the following hold:

**Part A (always required):**
- Every failed test from the report has a Failure entry with Category + Root Cause populated.
- Every selector-category failure cites page-source evidence OR carries the `Root Cause: Unknown — page sources not available` tag per `<failure_handling>`.
- Execution Summary counts match the body Failure entry count.
- `<safety_boundaries>` redaction was applied to every credential/PII pattern in the artifact.

**Part B (when corrections were applied):**
- Every applied change carries an explicit approval record per `<safety_boundaries>` approval discipline — no inferred-approval applications.
- Every applied change is lint/format clean on the touched file.
- No test intent was silently altered; spec updates (when required) are recorded as such.
- No application/product source file was modified.
- If iterations reached 3 with failures remaining, the escalation note is recorded per Part B step 9.

The skill is **NOT complete** if Part A emits a partial Failure list, a selector failure lacks both evidence and the Unknown tag, Part B applied a change without explicit approval, or Part B touched application source.

</success_criteria>

<validation_checklist>

Run before declaring complete. Items apply per the part(s) that ran.

**Part A (report analysis):**
- Every failed test from the report has a Failure entry — partial coverage of the failure list is a regression.
- Every Failure entry has a Category (Connection / Auth / Request / Response / Data / Timing / App Bug / Selector-Locator / Contract-Mismatch / Unknown) and a Root Cause.
- Every selector-category Failure either cites page-source evidence (`agents/plans/aqa-<test-name>-page-sources/<file>` + the selector lookup) OR carries `Root Cause: Unknown — page sources not available; would need Phase 4 selector identification re-run` per `<failure_handling>` "page sources missing" rule.
- Execution Summary counts (Total / Passed / Failed / Skipped) match the Failure entry count actually emitted.
- Patterns section names cross-failure patterns OR explicitly says `No cross-failure patterns identified`.
- `<safety_boundaries>` redaction scan ran — auth headers, tokens, request/response capture were grepped for credential/PII shapes and replaced with placeholders before writing.

**Part B (corrections — when applied):**
- Every Proposed Change carries File / Current Code / Proposed Code / Reason / Impact / Risk fields populated — no partial entries.
- Every applied change has an explicit approval record (token, named reference, or state-file row) per `<safety_boundaries>` approval discipline — no inferred approval.
- Lint/format was re-run after each modified file; the result is recorded.
- Test intent unchanged — no ATC's assertion semantics were silently altered. If a spec change was required (API behavior is correct, test was wrong), it was recorded as a spec update, not as a silent assertion flip.
- No application/product source files were modified — only test files (and page-object files when the root cause was a selector update agreed with the user).
- Iteration count tracked against the 3-iteration cap; if iteration 3 still left failures, the escalation note is recorded.

</validation_checklist>

<pitfalls>
- Listing failures without analyzing root causes
- Skipping page source analysis for selector errors silently — if page sources are missing, declare it (see `<failure_handling>`); do not pretend the analysis was complete
- Using a `{TICKET-KEY}` path instead of `<test-name>` — `{TICKET-KEY}` is a TestGen convention not present in AQA naming
- Applying changes without user approval — inferred approval from "looks good" / silence is forbidden; see `<safety_boundaries>` approval discipline
- Making unrelated changes alongside fixes — adjacent issues are separate Proposed Changes requiring separate approval
- Not re-validating linting after corrections
- Changing test intent while fixing implementation — spec updates are recorded separately, not silent assertion flips
- Modifying application/product source code instead of test code — escalate and stop, do not author the fix
</pitfalls>

</aqa-test-debugging>
