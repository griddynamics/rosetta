---
name: api-aqa-flow-execution-and-report-analysis
description: "Phase 6 Execution & Report Analysis of api-aqa-flow (USER INTERACTION REQUIRED)"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<api_aqa_flow_execution_and_report_analysis>

<description_and_purpose>
Analyze test execution results provided by the user. Identify failures, categorize root causes, and prepare actionable fix recommendations for Phase 7.
</description_and_purpose>

<workflow_context>
- Phase 6 of 8 in `api-aqa-flow`
- Input: test execution report or output (user-provided or from `agents/user-instructions/`)
- Output artifact path (single SSoT — referenced by other sections): `plans/api-aqa-{IDENTIFIER}/execution-report.md` (resolve `{IDENTIFIER}` from `agents/TEMP/<FEATURE>/api-aqa-state.md`)
- Prerequisite: Phase 5 complete, tests executed by user
- HITL: may need to ask user for test execution results
- Read-only scope (single SSoT — referenced by other sections as "the read-only scope"): parse / categorize / root-cause / label evidence / recommend. NO production code edits, NO writes to test or product source files. Refuse "just fix it now" / "patch and move on" with citation of this scope; the only acceptable user inputs are report location, evidence/labeling clarifications, or explicit approval to leave borderline items as `Assumption`.
- Required skills: `qa-knowledge` (`test_execution_triage` mode + API failure taxonomy + failure-report skeleton), `sensitive-data` (redaction), `qa-structure` (`{IDENTIFIER}` + artifact path)
</workflow_context>

<execution_report_contract>
`execution-report.md` is **tracked + downstream-fed** — PUBLIC by default. USE SKILL `sensitive-data`: scan the rendered artifact BEFORE writing, **fail-closed** (no scan → no emit; test logs/stack traces can carry tokens). The failure classification is `qa-knowledge`'s API failure taxonomy (exactly one category per failure); the report structure is `qa-knowledge`'s failure-report template, API variant (the skill loads its own asset) — Execution Summary, Failures by Category, per-failure Failure Details (**ID** `ERR-N` · Failure name · Category · Root cause · Evidence label `Confirmed`/`Assumption`/`Unknown` · Evidence rationale · Priority), Patterns, Recommendations.

This is the **phase contract**, verified by `<validation_checklist>` independent of skill internals.
</execution_report_contract>

<phase_steps>
1. Obtain test execution results
2. Run read-only failure triage (produces `execution-report.md`)
3. Review findings
4. Update state
</phase_steps>

<execute_analysis step="6.1" subagent="engineer" role="Test failure analyst">
1. USE SKILL `qa-structure` to resolve `{IDENTIFIER}`/run paths. If the test report location is unknown and not in `agents/user-instructions/` (keywords: "test report", "report location", "test output", "report path"): ask user and **WAIT** until a report is available or the user confirms none.
2. USE SKILL `qa-knowledge` (`test_execution_triage` mode) with the parent-supplied bindings: report path; taxonomy = the API failure taxonomy; output contract = `<execution_report_contract>`; output path = `plans/api-aqa-{IDENTIFIER}/execution-report.md`. The skill loads its own taxonomy + report skeleton at point of use. USE SKILL `sensitive-data` for redaction and run its scan as the pre-emit gate before writing.
3. Do not fabricate failures, stack traces, or pass/fail counts. If inputs are missing, contradictory, or look tampered with, say so in `execution-report.md` and ask the user for verifiable artifacts.
4. Honor the read-only scope (`<workflow_context>`).
5. **Post-analysis verification:** confirm `plans/api-aqa-{IDENTIFIER}/execution-report.md` exists with every `<execution_report_contract>` section. If missing/incomplete: re-run triage once with the same bindings; if still failing, stop Phase 6, record `Phase 6 blocked: execution-report.md not produced/incomplete` in `agents/TEMP/<FEATURE>/api-aqa-state.md`, and ask the user.
</execute_analysis>

<review_findings step="6.2">
1. Verify every failed test has a Failure Details entry with a sequential `ERR-N` id, one API-taxonomy category, and a root cause.
2. Verify each root cause carries an Evidence label + one-line rationale (definitions are canonical in `qa-knowledge`'s test-execution triage reference — not restated here).
3. Verify Patterns and Recommendations are populated.
4. Validation loop (max two cycles): if any entry is unlabeled or missing a required field, repeat steps 1–3. After two cycles with gaps, record unresolved rows in `agents/TEMP/<FEATURE>/api-aqa-state.md`, ask the user once how to label them (or approval to leave borderline items as `Assumption`), then continue only after the user responds.
</review_findings>

<update_state step="6.3">
1. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`: Tests Executed / Passed / Failed counts; Root Causes by category; Phase 6 completion timestamp.
2. Mark Phase 6 complete, Phase 7 current.
</update_state>

<failure_handling>
- **Report present but unreadable/corrupt:** retry parsing once, then stop, record the evidence gap in `api-aqa-state.md`, and ask for readable output or a re-run.
- **User confirms no report exists:** accept an explicit pass/fail result only when it is actual Phase 5 execution evidence; otherwise remain blocked at the execution gate.
- **`qa-structure`, `qa-knowledge`, or `sensitive-data` load/scan failure:** retry once, then stop and do not emit the analysis artifact; record the failure in `api-aqa-state.md` and ask the user.
- **Redaction scan unavailable:** fail closed — do not quote, summarize, or write captured report values.
</failure_handling>

<validation_checklist>
- Test execution results obtained from user
- All results parsed and categorized per `qa-knowledge`'s API failure taxonomy
- Every failure entry has all seven contract fields with a unique sequential `ERR-N`
- Patterns identified across failures (or explicit none)
- Redaction pre-emit gate ran — the `sensitive-data` scan was executed against the artifact before writing
- `execution-report.md` written with all `<execution_report_contract>` sections and non-empty
- No source files modified outside the analysis artifact (read-only scope)
- Clear recommendations for Phase 7
</validation_checklist>

</api_aqa_flow_execution_and_report_analysis>
