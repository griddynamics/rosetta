---
name: aqa-flow-test-report-analysis
description: "Phase 7 Test Report Analysis of aqa-flow"
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
- Input: test report or execution output + test plan + page sources at `plans/aqa-<test-name>-page-sources/`.
- Output artifact path (single SSoT — referenced by other sections): `plans/aqa-<test-name>-failure-analysis.md` (resolve `<test-name>` per `qa-structure` `aqa-layout`).
- Prerequisite: Phase 6 complete, test executed by user.
- HITL: may need to ask user for report location.
- Read-only scope (single SSoT — referenced by other sections as "the read-only scope"): parse / categorize / root-cause / label evidence / recommend. NO production code edits, NO writes to test or product source files. Refuse "just fix it now" / "patch the selector before Phase 8" with citation of this scope; the only acceptable user inputs are report location, evidence/labeling clarifications, or explicit approval to leave borderline items as `Assumption`.
- Skills: `debugging` (read-only root-cause analysis), `sensitive-data` (redaction), `qa-structure` (slug + failure-analysis path), `qa-knowledge` (failure classification + artifact shape + redaction scope)
</workflow_context>

<failure_analysis_contract>
The analysis artifact is **PUBLIC by default** — redact BEFORE writing per `qa-knowledge/references/redaction-scope.md`, not after. **MUST ACQUIRE that reference and run its grep list against the rendered artifact as the pre-emit gate; emit FORBIDDEN until it has run** (logs/screenshots/page sources can carry tokens or PII). The failure classification is `qa-knowledge/references/aqa-failure-taxonomy.md` (assign exactly one category per failure; Selector/Locator entries cite the captured page source). The required artifact structure is the asset `qa-knowledge/assets/failure-analysis-template.md` (ACQUIRE FROM KB) — per failed test: Failure name · Error type · Root cause · Evidence label (`Confirmed`/`Assumption`/`Unknown`) · Evidence rationale · Recommendation; plus an Execution Summary and a Patterns section.

Example entry (grounding, independent of the external asset): `**Failure:** login-redirect-missing · **Error type:** Selector/Locator · **Root cause:** login button selector `#submit` renamed to `#login-submit` · **Evidence:** Confirmed · **Rationale:** report stack trace + captured page source both cited · **Recommendation:** update the selector in the LoginPage page object (Phase 8).`

This is the **phase contract**, verified by `<validation_checklist>` independent of skill internals.
</failure_analysis_contract>

<phase_steps>
1. Obtain or locate the test report
2. Run read-only failure triage
3. Review findings
4. Update state
</phase_steps>

<execute_analysis step="7.1" subagent="engineer" role="Test failure analyst">
1. If the test report is not under a known path and not in `agents/user-instructions/`: ask user; **WAIT** until a report artifact is available or the user confirms none.
2. **ACQUIRE `qa-knowledge/references/aqa-failure-taxonomy.md`, `qa-knowledge/assets/failure-analysis-template.md`, and `qa-knowledge/references/redaction-scope.md` FROM KB first** — load-bearing for the `engineer`. Then USE SKILL `debugging` (test-execution triage mode) with the parent-supplied bindings: report path; taxonomy = the `aqa-failure-taxonomy` reference; output contract = `<failure_analysis_contract>`; output path = `plans/aqa-<test-name>-failure-analysis.md`; page-sources directory = `plans/aqa-<test-name>-page-sources/`. USE SKILL `sensitive-data` for redaction, then run the `redaction-scope` grep list as the pre-emit gate before writing.
3. Honor the read-only scope (`<workflow_context>`).
</execute_analysis>

<review_findings step="7.2">
1. Verify all failures are categorized per `qa-knowledge/references/aqa-failure-taxonomy.md`, with root causes, and page source analyzed for selector errors.
2. Classify each root cause with an Evidence label `Confirmed` / `Assumption` / `Unknown` (definitions + ambiguity tiebreaks are canonical in the `debugging` skill `<core_concepts>` — not restated here).
3. Validation loop (max two cycles): confirm each failure has exactly one label + rationale + recommendation; if any entry is unlabeled or incomplete, repeat step 1. After two cycles with gaps, record unresolved rows in `agents/aqa-state.md`, ask the user once how to label them (or approval to leave borderline items as `Assumption`), then continue only after the user responds.
4. **Performance & flakiness pass:** from the report, parse total + per-test execution times; flag tests above the project's slow-test threshold (or a sensible default if unspecified) and note flakiness indicators (intermittent pass/fail, retries consumed, timeouts not attributable to a selector/assertion cause). Record these in the artifact's Patterns section. If the report carries no timing data, record `performance data not available in report` — do not fabricate.
</review_findings>

<update_state step="7.3">
1. Update `agents/aqa-state.md`: Test Report Location; Tests Executed / Failed counts; Root Causes list; Phase 7 completion timestamp.
2. Mark Phase 7 complete, Phase 8 current.
</update_state>

<validation_checklist>
- Test report located and parsed
- All failures categorized per `qa-knowledge/references/aqa-failure-taxonomy.md`; selector errors cite page-source evidence or are tagged `Unknown` per that taxonomy
- Every failure entry has all six fields (Failure name / Error type / Root cause / Evidence label / Evidence rationale / Recommendation)
- Patterns section populated (or explicit none), including the performance/flakiness pass — slow tests flagged + flakiness noted, or `performance data not available in report` recorded
- Redaction pre-emit gate ran — the `qa-knowledge/references/redaction-scope.md` grep list was executed against the artifact before writing
- Analysis artifact written to the `<workflow_context>` output path and non-empty
- No source files modified outside the analysis artifact (read-only scope)
</validation_checklist>

</aqa_flow_test_report_analysis>
