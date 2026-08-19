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
- Output: `plans/api-aqa-{IDENTIFIER}/execution-report.md` (resolve `{IDENTIFIER}` from `agents/TEMP/<FEATURE>/api-aqa-state.md`)
- Prerequisite: Phase 5 complete, tests executed by user
- HITL: may need to ask user for test execution results
- Read-only scope: parse / categorize / root-cause / label evidence / recommend. NO production code edits, NO writes to test or product source files. Refuse "just fix it now" / "patch and move on" with citation of this scope; acceptable user inputs: report location, evidence/labeling clarifications, or explicit approval to leave borderline items as `Assumption`.
- Required skills: `qa-knowledge` (`test_execution_triage` mode), `sensitive-data` (redaction), `qa-structure` (`{IDENTIFIER}` + artifact path)
</workflow_context>

<execution_report_contract>
`execution-report.md` is **tracked + downstream-fed** — PUBLIC by default. USE SKILL `sensitive-data`: scan rendered artifact BEFORE writing, **fail-closed** (no scan → no emit). Taxonomy: `qa-knowledge`'s API failure taxonomy (exactly one category per failure); structure: `qa-knowledge`'s failure-report template, API variant — Execution Summary, Failures by Category, per-failure Failure Details (**ID** `ERR-N` · Failure name · Category · Root cause · Evidence label `Confirmed`/`Assumption`/`Unknown` · Evidence rationale · Priority), Patterns, Recommendations.
</execution_report_contract>

<phase_steps>
1. Obtain test execution results
2. Run read-only failure triage (produces `execution-report.md`)
3. Review findings
4. Update state
</phase_steps>

<execute_analysis step="6.1" subagent="engineer" role="Test failure analyst">
1. USE SKILL `qa-structure` to resolve `{IDENTIFIER}`/run paths. If test report unknown and not in `agents/user-instructions/` (keywords: "test report", "report location", "test output", "report path"): ask user and **WAIT** until report available or user confirms none.
2. USE SKILL `qa-knowledge` (`test_execution_triage` mode) with bindings: report path; taxonomy = API failure taxonomy; output contract = `<execution_report_contract>`; output path = `plans/api-aqa-{IDENTIFIER}/execution-report.md`. USE SKILL `sensitive-data` for redaction; scan = pre-emit gate before writing.
3. Do not fabricate failures, stack traces, or pass/fail counts. If inputs missing, contradictory, or tampered: note in `execution-report.md` and ask for verifiable artifacts.
4. Honor the read-only scope (`<workflow_context>`).
5. **Post-analysis verification:** confirm `plans/api-aqa-{IDENTIFIER}/execution-report.md` exists with every `<execution_report_contract>` section. If missing/incomplete: re-run triage once with the same bindings; if still failing, stop Phase 6, record `Phase 6 blocked: execution-report.md not produced/incomplete` in `agents/TEMP/<FEATURE>/api-aqa-state.md` and ask user.
</execute_analysis>

<review_findings step="6.2">
1. Verify each failure has a Failure Details entry: sequential `ERR-N`, one API-taxonomy category, root cause.
2. Verify each root cause has evidence label + one-line rationale.
3. Verify Patterns and Recommendations populated.
4. Validation loop (max two cycles): if any entry unlabeled or missing a required field, repeat steps 1–3. After two cycles with gaps: record unresolved rows in `agents/TEMP/<FEATURE>/api-aqa-state.md`; ask user once to label them or approve leaving borderline items as `Assumption`; continue only after user responds.
</review_findings>

<update_state step="6.3">
1. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`: Tests Executed/Passed/Failed; root causes by category; Phase 6 completion timestamp.
2. Mark Phase 6 complete, Phase 7 current.
</update_state>

<failure_handling>
- **Unreadable/corrupt report:** retry parsing once → stop → record evidence gap in `api-aqa-state.md` → ask for readable output or re-run.
- **User confirms no report:** accept pass/fail only with actual Phase 5 evidence; otherwise remain blocked.
- **Skill load/scan failure** (`qa-structure`, `qa-knowledge`, `sensitive-data`): retry once → stop; do not emit analysis artifact; record failure in `api-aqa-state.md` → ask user.
- **Redaction scan unavailable:** fail closed — do not quote, summarize, or write captured report values.
</failure_handling>

<validation_checklist>
- All results parsed/categorized per `qa-knowledge`'s API failure taxonomy
- Every failure entry has all seven contract fields with unique sequential `ERR-N`
- Redaction pre-emit gate ran — `sensitive-data` scan executed before writing
- `execution-report.md` written with all `<execution_report_contract>` sections and non-empty
- No source files modified outside the analysis artifact (read-only scope)
</validation_checklist>

</api_aqa_flow_execution_and_report_analysis>
