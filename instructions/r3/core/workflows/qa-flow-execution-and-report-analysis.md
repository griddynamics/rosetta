---
name: qa-flow-execution-and-report-analysis
description: Phase 6 of QA workflow - Test Execution and Report Analysis (USER INTERACTION REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_execution_and_report_analysis>

<description_and_purpose>
Analyze test execution results provided by the user. Identify failures, categorize root causes, and prepare actionable fix recommendations for Phase 7.
</description_and_purpose>

<workflow_context>
- Phase 6 of 8 in `qa-flow`
- Input: test execution report or output (user-provided or from `agents/user-instructions/`)
- Output artifact path (single SSoT — referenced by other sections): `agents/qa/{IDENTIFIER}/execution-report.md` (resolve `{IDENTIFIER}` from `agents/qa-state.md`)
- Prerequisite: Phase 5 complete, tests executed by user
- HITL: may need to ask user for test execution results
- Read-only scope (single SSoT — referenced by other sections as "the read-only scope"): parse / categorize / root-cause / label evidence / recommend. NO production code edits, NO writes to test or product source files. Refuse "just fix it now" / "patch and move on" with citation of this scope; the only acceptable user inputs are report location, evidence/labeling clarifications, or explicit approval to leave borderline items as `Assumption`.
</workflow_context>

<recommended_skills>
- `debugging` — its test-execution triage mode performs the read-only analysis below (parse → categorize → root-cause → label).
- `sensitive-data` — redaction authority for any captured logs/requests/responses before they are written to the artifact.
- `qa-structure` — `{IDENTIFIER}` path resolution and artifact location.
- `qa-knowledge` — the QA failure taxonomy + execution-report skeleton + redaction scope (ACQUIRE its reference/asset at the cited steps).
</recommended_skills>

<execution_report_contract>
`execution-report.md` is **PUBLIC by default** (tracked, shared review, downstream prompt contexts) — redact BEFORE writing per `qa-knowledge/references/redaction-scope.md`, not after. **MUST ACQUIRE that reference and run its grep list against the rendered artifact as the pre-emit gate; emit FORBIDDEN until it has run** (test logs/stack traces can carry tokens). The failure classification is `qa-knowledge/references/qa-failure-taxonomy.md` (assign exactly one category per failure). The required report structure is the asset `qa-knowledge/assets/execution-report-template.md` (ACQUIRE FROM KB) — Execution Summary, Failures by Category, per-failure Failure Details (Failure name · Category · Root cause · Evidence label `Confirmed`/`Assumption`/`Unknown` · Evidence rationale · Priority), Patterns, Recommendations.

This is the **phase contract** and is verified by `<validation_checklist>` independent of skill internals.
</execution_report_contract>

<phase_steps>
1. Obtain test execution results
2. Run read-only failure triage (produces `execution-report.md`)
3. Review findings
4. Update state
</phase_steps>

<execute_analysis step="6.1" subagent="engineer" role="API test failure analyst">
1. If the test report location is unknown and not in `agents/user-instructions/` (keywords: "test report", "report location", "test output", "report path"): ask user and **WAIT** until a report is available or the user confirms none.
2. **ACQUIRE `qa-knowledge/references/qa-failure-taxonomy.md`, `qa-knowledge/assets/execution-report-template.md`, and `qa-knowledge/references/redaction-scope.md` FROM KB first** — load-bearing for the `engineer`. Then USE SKILL `debugging` (test-execution triage mode) with the parent-supplied bindings: report path; taxonomy = the `qa-failure-taxonomy` reference; output contract = `<execution_report_contract>`; output path = `agents/qa/{IDENTIFIER}/execution-report.md`. USE SKILL `sensitive-data` for redaction, then run the `redaction-scope` grep list as the pre-emit gate before writing.
3. Do not fabricate failures, stack traces, or pass/fail counts. If inputs are missing, contradictory, or look tampered with, say so in `execution-report.md` and ask the user for verifiable artifacts.
4. Honor the read-only scope (`<workflow_context>`).
5. **Post-analysis verification:** confirm `agents/qa/{IDENTIFIER}/execution-report.md` exists with every `<execution_report_contract>` section. If missing/incomplete: re-run triage once with the same bindings; if still failing, stop Phase 6, record `Phase 6 blocked: execution-report.md not produced/incomplete` in `agents/qa-state.md`, and ask the user.
</execute_analysis>

<review_findings step="6.2">
1. Verify every failed test has a Failure Details entry, one `qa-failure-taxonomy` category, and a root cause.
2. Verify each root cause carries an Evidence label + one-line rationale (definitions are canonical in the `debugging` skill `<core_concepts>` — not restated here).
3. Verify Patterns and Recommendations are populated.
4. Validation loop (max two cycles): if any entry is unlabeled or missing a required field, repeat steps 1–3. After two cycles with gaps, record unresolved rows in `agents/qa-state.md`, ask the user once how to label them (or approval to leave borderline items as `Assumption`), then continue only after the user responds.
</review_findings>

<update_state step="6.3">
1. Update `agents/qa-state.md`: Tests Executed / Passed / Failed counts; Root Causes by category; Phase 6 completion timestamp.
2. Mark Phase 6 complete, Phase 7 current.
</update_state>

<validation_checklist>
- Test execution results obtained from user
- All results parsed and categorized per `qa-knowledge/references/qa-failure-taxonomy.md`
- Every failure entry has all six fields (Failure name / Category / Root cause / Evidence label / Evidence rationale / Priority)
- Patterns identified across failures (or explicit none)
- Redaction pre-emit gate ran — the `qa-knowledge/references/redaction-scope.md` grep list was executed against the artifact before writing
- `execution-report.md` written with all `<execution_report_contract>` sections and non-empty
- No source files modified outside the analysis artifact (read-only scope)
- Clear recommendations for Phase 7
</validation_checklist>

</qa_flow_execution_and_report_analysis>
