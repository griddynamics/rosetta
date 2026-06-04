---
name: aqa-test-debugging
description: Analyze test execution reports, identify failure root causes with page source analysis, propose corrections, and apply approved fixes.
tags: ["aqa", "test-debugging", "report-analysis", "corrections"]
baseSchema: docs/schemas/skill.md
---

<aqa-test-debugging>

<role>Test failure analysis and correction specialist</role>

<when_to_use_skill>
Analyze test execution results, categorize failures, identify root causes, and prepare targeted corrections for approval.

**Part A / Part B usage boundary.** The skill bundles two responsibilities with materially different risk profiles:

- **Part A — Report Analysis** (steps 1–6): **read-only**. Parses the report, categorizes failures, identifies root causes, produces the analysis artifact.
- **Part B — Corrections** (steps 7–9): **writes test source files + runs lint + tracks iteration count**. Prepares proposed changes, applies them after explicit user approval per `<safety_boundaries>`, validates with linting.

A caller may invoke **Part A only** (analysis without correction mandate). Part B requires Part A's output AND the explicit approval signals enumerated in `<safety_boundaries>`. A Part-A-only invocation MUST NOT execute steps 7–9.

**Load-split convention** (stated once; later blocks omit the qualifier): Part A halves of `<safety_boundaries>`, `<validation_checklist>`, `<pitfalls>` are inline. Part B halves live in [references/part-b-mechanics.md](references/part-b-mechanics.md) and load only when Part B runs. Later blocks use bare `see [references/...]` pointers without re-explaining the split.
</when_to_use_skill>

<prerequisites>
- Test implemented and executed by the user (this skill runs as the report-analysis phase, after the implementation + execution phases)
- Test report or execution output available — see `<input_contract>` for canonical paths
- Test plan and page sources available for cross-reference — see `<input_contract>`
- `<test-name>` slug resolved per the AQA workflow's naming convention (parsed from the test plan filename or read from `agents/aqa-state.md`)
</prerequisites>

<input_contract>

All input paths use the AQA workflow's canonical `<test-name>` slug — **not** `{TICKET-KEY}`, which is a TestGen convention and does not exist in the AQA naming scheme.

| Input | Canonical path | Required by | Producing phase (logical) |
|---|---|---|---|
| Test plan | `agents/plans/aqa-<test-name>.md` | Cross-reference during failure categorization | the data-collection phase |
| Code analysis report | `agents/plans/aqa-<test-name>-code-analysis.md` | Cross-reference for selector / page-object context | the code-analysis phase |
| Page sources directory | `agents/plans/aqa-<test-name>-page-sources/` | Part A step 4 (selector-error analysis) | the selector-identification phase |
| State file | `agents/aqa-state.md` | Slug resolution + state updates | initialized at workflow start |
| Test report | User-supplied path, OR file under `agents/user-instructions/` discovered by keyword scan in Part A step 1 | Part A step 1 | User (after the test-implementation phase's stop-for-execution) |

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

**Canonical taxonomy.** Assign **exactly one** category per failure; the seven are exhaustive + mutually exclusive (pick the most proximate cause):

1. **Selector / Locator** — element not found, selector incorrect, element-not-visible (patterns in step 4)
2. **Timing / Visibility** — timeouts, race conditions, animation not settled, wait too short
3. **Assertion failure** — expected vs actual mismatch (status / content / count / attribute)
4. **Setup / Data** — preconditions / fixtures / test data / session not established
5. **Application bug** — defect in app under test (escalates per `<safety_boundaries>`)
6. **Test code** — logic error, wrong helper API, missing await/async
7. **Unknown** — failure occurred but no usable evidence (explicit catch-all per `<failure_handling>`)

Downstream sections reference this list by name — do not introduce additional categories or rename them.

### 4. Analyze Selector/Locator Errors

When error matches patterns: "selector did not become visible", "locator did not become visible", "selector not found", "locator not found", "element not found", "NoSuchElementException", "ElementNotFoundError", "TimeoutException" on element visibility:

0. **Validate page-sources directory exists** at the canonical path `agents/plans/aqa-<test-name>-page-sources/` (per `<input_contract>` — same `<test-name>` slug used by the test plan filename and the selector-identification phase's page-sources directory). If missing, apply the `<failure_handling>` "page sources missing" rule — do **not** silently degrade to non-page-source analysis.
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

## Part B: Corrections (steps 7–9)

Part B step-by-step orchestration (step 7 Prepare Proposed Changes, step 8 Apply Approved Changes, step 9 Iteration cap + escalation) lives in [references/part-b-mechanics.md](references/part-b-mechanics.md#part-b-step-orchestration-steps-79--referenced-from-skillmd-process) — load on demand only when Part B runs. Part-A-only invocations MUST NOT load this section.

**Canonical guard (always inline):** the 3-iteration cap is hard — do NOT auto-start a 4th iteration without an explicit user waiver recorded in the state file. The escalation template lives in [references/escalation-template.md](references/escalation-template.md).

</process>

<output_format>

**Part A artifact (always emitted):**

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
```

**Part B artifact (only when Part B runs)** — `### Proposed Corrections` + `### Applied Corrections` subsections appended to the Part A artifact. Verbatim template + 6-field Proposed Change shape in [references/part-b-mechanics.md](references/part-b-mechanics.md#part-b-output_format-template-referenced-from-skillmd-output_format).

</output_format>

<failure_handling>

- **Test report missing** (no file in `agents/user-instructions/`, user does not supply path after one ask): stop Part A, record `aqa-test-debugging: test report not provided` in the parent workflow state, do not proceed.
- **Test report unparseable** (binary, corrupted, unknown format): stop, report the parse error with the file path, ask the user for an alternative format.
- **Page sources missing** (`agents/plans/aqa-<test-name>-page-sources/` does not exist when Part A step 4 needs it): do **not** silently skip selector analysis. Record `aqa-test-debugging: page sources missing — selector-error root causes degraded to "evidence missing"` in the workflow state, and tag every selector-category failure entry with `Root Cause: Unknown — page sources not available; would need the selector-identification phase re-run`. Continue with the remaining failure categories that don't depend on page sources.
- **`<test-name>` unresolved or ambiguous:** stop, ask the parent phase to resolve the slug per the AQA workflow's naming convention, do not guess at the page-sources path.
- **Test plan or code-analysis report missing** (used for cross-reference only): record the absence in the analysis output, proceed with degraded cross-reference (the test report alone can still drive categorization and selector analysis).

</failure_handling>

<safety_boundaries>

**HITL governance** — user-approval gating (Part B step 8 "After user approval", the Approval-discipline rule in `references/part-b-mechanics.md`, every approval-signal check) is governed by the `hitl` skill (the workspace-wide HITL authority — single source of truth for ask-before-action, full-automation opt-out, re-ask protocol). The Part B Approval-discipline rule's named approval signals (recorded workflow token, explicit `apply Change N` response, workflow state-file row) are a **domain-specific specialization** of the `hitl` contract, not a parallel mechanism — when `hitl` is loaded, its defaults govern; the signal taxonomy below adds Part-B-specific shape, it does not override.

**Part B (write-path) boundaries:** see [references/part-b-mechanics.md](references/part-b-mechanics.md#part-b-safety_boundaries-referenced-from-skillmd-safety_boundaries) — approval discipline (specialization of `hitl`), stay-inside-scope, never-alter-test-intent, test-code-only writes.

**Part A analysis-artifact redaction:** The Part A output (`execution-report.md` / parent-supplied analysis artifact path) is tracked and downstream-fed. If failure stack traces, request/response captures, or environment info embed credentials / tokens / PII, redact before writing: `Authorization: Bearer <jwt>` → `<redacted: bearer token>`; `X-Api-Key: <key>` → `<redacted: api key>`; real customer emails/names/phone numbers → synthetic placeholders. Structural content (status codes, endpoint paths, error message templates, framework stack frames) stays verbatim.

</safety_boundaries>

<success_criteria>

High-level done-condition. Item-level checks: `<validation_checklist>`.

**Complete when:** Part A's analysis artifact has been emitted with every `<validation_checklist>` Part-A item satisfied; AND if Part B ran, every Part-B item is satisfied; AND if iteration 3 left failures, the verbatim escalation template from [references/escalation-template.md](references/escalation-template.md) was written per step 9.

**NOT complete** if any `<validation_checklist>` item is unmet.

</success_criteria>

<validation_checklist>

Run before declaring complete. Items apply per the part(s) that ran.

**Part A (report analysis):**
- Every failed test from the report has a Failure entry — partial coverage of the failure list is a regression.
- Every Failure entry has a Category picked from the canonical taxonomy in step 3 AND a Root Cause.
- Every selector-category Failure either cites page-source evidence OR carries the Unknown tag per `<failure_handling>` "page sources missing" rule.
- Execution Summary counts (Total / Passed / Failed / Skipped) match the Failure entry count actually emitted.
- Patterns section names cross-failure patterns OR explicitly says `No cross-failure patterns identified`.
- Redaction scan completed per `<safety_boundaries>` Part A clause.

**Part B (corrections — when applied):** see [references/part-b-mechanics.md](references/part-b-mechanics.md#part-b-validation_checklist-referenced-from-skillmd-validation_checklist).

</validation_checklist>

<pitfalls>

**Part A pitfalls:**
- Listing failures without analyzing root causes
- Silently skipping page-source analysis when page sources are missing (see `<failure_handling>` "page sources missing")
- Using a `{TICKET-KEY}` path instead of `<test-name>` — `{TICKET-KEY}` is a TestGen convention not present in AQA naming

**Part B pitfalls:** see [references/part-b-mechanics.md](references/part-b-mechanics.md#part-b-pitfalls-referenced-from-skillmd-pitfalls).

</pitfalls>

</aqa-test-debugging>
