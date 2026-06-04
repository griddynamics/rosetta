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

`execution-report.md` is **PUBLIC by default** (tracked, shared review, downstream prompt contexts). Failure stack traces and captured request/response data are a common secret-leak vector — **redact before writing, not after**. Applies to BOTH Part A (`execution-report.md`) AND Part B (any debug logging during corrections).

**Target categories** (7 buckets — per-target enumeration + placeholder vocabulary + grep patterns in [references/redaction-targets.md](references/redaction-targets.md#per-target-redaction-targets--placeholder-vocabulary-referenced-from-skillmd-safety_boundaries), loaded at steps 2 + 3 when writing entries):

1. Auth headers (Authorization / X-Api-Key / Cookie)
2. Credentialed URLs (user:pass@ form)
3. Query-string secrets (api_key / token / signed-URL signatures)
4. Request bodies (credentials / payment data)
5. Response bodies (tokens / session IDs / PII)
6. Stack traces / error messages (embedded credentials)
7. Environment Info (mechanism + source description only — never literal values)

**Structural content stays verbatim** — endpoint paths, HTTP methods, status codes, error message templates, field names, schema shapes. Redaction targets sensitive **values**, not the structural failure spec.

**Part B (write-path) boundaries** — approval discipline, stay-inside-scope, never-alter-test-intent, test-code-only writes: see [references/part-b-mechanics.md](references/part-b-mechanics.md#part-b-safety_boundaries-referenced-from-skillmd-safety_boundaries).

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

**Canonical 7-category taxonomy.** Assign **exactly one** category per failure; the seven are exhaustive + mutually exclusive: **Connection / Environment**, **Authentication**, **Request**, **Response Assertion**, **Test Data**, **Timing / Race Condition**, **Application Bug**. Full catalog (Symptoms / Root Cause / Action per category) + the per-failure entry template the agent emits live in [references/failure-catalog.md](references/failure-catalog.md) — load when actively classifying failures.

Apply `<safety_boundaries>` redaction BEFORE writing each entry.

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

Emit one Proposed Change entry per issue using the **canonical Proposed Change template** in [references/part-b-mechanics.md](references/part-b-mechanics.md#proposed-change-template-referenced-from-skillmd-step-6). Required fields: **Affected Tests, File, Root Cause, Current Code, Proposed Code, Reason, Impact, Risk**. The reference also holds the per-category fix-matching mapping + prioritization order.

### 7. Apply Approved Changes

After explicit user approval per `<safety_boundaries>`: apply changes one at a time, verify syntax, follow project standards, lint after each modification, verify no regressions on passing tests, update `test-specs.md` when a correction required a spec change. Step-by-step mechanics in [references/part-b-mechanics.md](references/part-b-mechanics.md#step-7--apply-approved-changes-referenced-from-skillmd-step-7).

### 8. Iteration Policy

The Part A → Part B cycle is **capped at 3 iterations**. Counter mechanics + state-file field schema + cap-enforcement protocol (read counter → increment after Part B → branch on re-execution → escalate at iteration 3) live in [references/part-b-mechanics.md](references/part-b-mechanics.md#step-8--iteration-cap-referenced-from-skillmd-step-8).

**Governance (canonical):** Do NOT auto-start a 4th iteration without an explicit user waiver recorded in the state file. When the cap is reached with failures remaining, the escalation is recorded in `execution-report.md`'s `## Escalation` section + the workflow state file.

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

**Part A pitfalls** (only **genuinely additive** failure modes; `<safety_boundaries>` and `<failure_handling>` rules NOT restated):

- **Failure listing without root cause analysis** — categorization alone is not actionable; every entry needs a Root Cause field populated to drive Part B fix-matching. The validation_checklist greps for this; this pitfall covers the upstream "I'll just categorize and move on" temptation.

**Part B pitfalls:** see [references/part-b-mechanics.md](references/part-b-mechanics.md#part-b-pitfalls-referenced-from-skillmd-pitfalls).

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
- **Safety re-scan ran** per `<safety_boundaries>` 7 target categories + the grep patterns in `references/redaction-targets.md` (single SSoT — not restated here); any hits replaced with placeholders before Part A complete.

**Part B (corrections — when applied):** see [references/part-b-mechanics.md](references/part-b-mechanics.md#part-b-validation_checklist-referenced-from-skillmd-validation_checklist).

</validation_checklist>

</qa-test-debugging>
