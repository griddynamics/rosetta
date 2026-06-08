---
name: aqa-flow-test-report-analysis
description: Phase 7 of AQA workflow - Test Report Analysis (USER INTERACTION REQUIRED if report location unknown)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_test_report_analysis>

<description_and_purpose>
Analyze test execution reports, identify failure root causes, and prepare for corrections in Phase 8.
</description_and_purpose>

<workflow_context>
- Phase 7 of 8 in `aqa-flow`.
- Input: test report or execution output + test plan + page sources at `agents/plans/aqa-<test-name>-page-sources/`.
- Output artifact path (single SSoT — referenced by other sections): `agents/plans/aqa-<test-name>-failure-analysis.md` (resolve `<test-name>` per the Phase 1 plan filename and Phase 4 page-sources directory).
- Prerequisite: Phase 6 complete, test executed by user.
- HITL: may need to ask user for report location.
- Read-only scope (single SSoT — referenced by other sections as "the read-only scope"): parse / categorize / root-cause / label evidence / recommend. NO production code edits, NO writes to test or product source files. Refuse "just fix it now" / "patch the selector before Phase 8" with citation of this scope; the only acceptable user inputs are report location, evidence/labeling clarifications, or explicit approval to leave borderline items as `Assumption`.
</workflow_context>

<recommended_skills>
- `debugging` — its test-execution triage mode performs the read-only analysis below; selector/element errors use the captured page source as evidence.
- `sensitive-data` — redaction authority for any captured logs/screenshots/page sources before they are written to the artifact.
</recommended_skills>

<failure_taxonomy>
Phase-authoritative UI failure taxonomy. Assign **exactly one** category per failure (exhaustive + mutually exclusive; pick the most-proximate cause):

1. **Selector / Locator** — element not found, selector incorrect, element-not-visible
2. **Timing / Visibility** — timeouts, race conditions, animation not settled, wait too short
3. **Assertion failure** — expected vs actual mismatch (status / content / count / attribute)
4. **Setup / Data** — preconditions / fixtures / test data / session not established
5. **Application bug** — defect in the app under test
6. **Test code** — logic error, wrong helper API, missing await/async
7. **Unknown** — failure occurred but no usable evidence (explicit catch-all)

Selector/Locator entries MUST analyze the captured page source under `agents/plans/aqa-<test-name>-page-sources/`. If that directory is missing, do not silently skip — tag the entry `Unknown — page sources not available; would need the selector-identification phase re-run`.
</failure_taxonomy>

<failure_analysis_contract>
The analysis artifact is **PUBLIC by default** — redact via `sensitive-data` BEFORE writing, not after. Structural content (status codes, endpoint paths, error-message templates, framework stack frames) stays verbatim; redaction targets sensitive **values** only.

The artifact MUST contain, per failed test:

- **Failure name** — failing test identifier (function name, ATC ID, or report row).
- **Error type** — one category from `<failure_taxonomy>`.
- **Root cause** — one-line diagnosed cause (Page Source Analysis cited for selector errors).
- **Evidence label** — `Confirmed` / `Assumption` / `Unknown`.
- **Evidence rationale** — one-line citation supporting the label (log line, page-source diff, repro count).
- **Recommendation** — one-line proposed remediation (the actual change happens in Phase 8).

Plus an **Execution Summary** (Total / Passed / Failed / Skipped / duration) and a **Patterns** section (cross-failure patterns or explicit none). This is the **phase contract**, verified by `<validation_checklist>` independent of skill internals.
</failure_analysis_contract>

<phase_steps>
1. Obtain or locate the test report
2. Run read-only failure triage
3. Review findings
4. Update state
</phase_steps>

<execute_analysis step="7.1" subagent="engineer" role="Test failure analyst">
1. If the test report is not under a known path and not in `agents/user-instructions/`: ask user; **WAIT** until a report artifact is available or the user confirms none.
2. USE SKILL `debugging` (test-execution triage mode) with the parent-supplied bindings: report path; taxonomy = `<failure_taxonomy>`; output contract = `<failure_analysis_contract>`; output path = `agents/plans/aqa-<test-name>-failure-analysis.md`; page-sources directory = `agents/plans/aqa-<test-name>-page-sources/`. USE SKILL `sensitive-data` for redaction before writing.
3. Honor the read-only scope (`<workflow_context>`).
</execute_analysis>

<review_findings step="7.2">
1. Verify all failures are categorized into `<failure_taxonomy>`, with root causes, and page source analyzed for selector errors.
2. Classify each root cause with an Evidence label `Confirmed` / `Assumption` / `Unknown` (definitions + ambiguity tiebreaks are canonical in the `debugging` skill `<core_concepts>` — not restated here).
3. Validation loop (max two cycles): confirm each failure has exactly one label + rationale + recommendation; if any entry is unlabeled or incomplete, repeat step 1. After two cycles with gaps, record unresolved rows in `agents/aqa-state.md`, ask the user once how to label them (or approval to leave borderline items as `Assumption`), then continue only after the user responds.
</review_findings>

<update_state step="7.3">
1. Update `agents/aqa-state.md`: Test Report Location; Tests Executed / Failed counts; Root Causes list; Phase 7 completion timestamp.
2. Mark Phase 7 complete, Phase 8 current.
</update_state>

<validation_checklist>
- Test report located and parsed
- All failures categorized into `<failure_taxonomy>`; selector errors cite page-source evidence or are tagged `Unknown` per `<failure_taxonomy>`
- Every failure entry has all six fields (Failure name / Error type / Root cause / Evidence label / Evidence rationale / Recommendation)
- Patterns section populated (or explicit none)
- Redaction scan ran via `sensitive-data` before writing
- Analysis artifact written to the `<workflow_context>` output path and non-empty
- No source files modified outside the analysis artifact (read-only scope)
</validation_checklist>

</aqa_flow_test_report_analysis>
