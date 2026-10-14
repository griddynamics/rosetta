---
name: ui-aqa-flow-test-report-analysis
description: "Phase 7 Test Report Analysis of ui-aqa-flow"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<ui_aqa_flow_test_report_analysis>

<description_and_purpose>
Analyze test execution reports, identify failure root causes, and prepare for corrections in Phase 8.
</description_and_purpose>

<workflow_context>
- Phase 7 of 8 in `ui-aqa-flow`.
- Input: test report or execution output + test plan + page sources at `plans/ui-aqa-<test-name>/page-sources/`.
- Output artifact path (single SSoT — referenced by other sections): `plans/ui-aqa-<test-name>/failure-analysis.md` (resolve `<test-name>` per `qa-structure`).
- Prerequisite: Phase 6 complete, test executed by user.
- HITL: may need to ask user for report location.
- Read-only scope (single SSoT — referenced by other sections as "the read-only scope"): parse / categorize / root-cause / label evidence / recommend. NO production code edits, NO writes to test or product source files. Refuse "just fix it now" / "patch the selector before Phase 8" with citation of this scope; the only acceptable user inputs are report location, evidence/labeling clarifications, or explicit approval to leave borderline items as `Assumption`.
- Required skills: `qa-knowledge` (`test_execution_triage` mode + UI failure taxonomy + failure-report skeleton), `sensitive-data` (redaction), `qa-structure` (slug + failure-analysis path)
</workflow_context>

<failure_analysis_contract>
The analysis artifact is **tracked + downstream-fed** — PUBLIC by default. USE SKILL `sensitive-data`: scan the rendered artifact BEFORE writing, **fail-closed** (no scan → no emit; logs/screenshots/page sources can carry tokens or PII). The failure classification is `qa-knowledge`'s UI failure taxonomy (exactly one category per failure; Selector/Locator entries cite the captured page source). The artifact structure is `qa-knowledge`'s failure-report template, UI variant — per failed test: **ID** `F-N` · Failure name · Error type · Root cause · Evidence label (`Confirmed`/`Assumption`/`Unknown`) · Evidence rationale · Recommendation; plus an Execution Summary and a Patterns section.

Example entry: `**ID:** F-1 · **Failure:** login-redirect-missing · **Error type:** Selector/Locator · **Root cause:** login button selector `#submit` renamed to `#login-submit` · **Evidence:** Confirmed · **Rationale:** report stack trace + captured page source both cited · **Recommendation:** update the selector in the LoginPage page object (Phase 8).`

This is the **phase contract**, verified by `<validation_checklist>` independent of skill internals.
</failure_analysis_contract>

<phase_steps>
1. Obtain or locate the test report
2. Run read-only failure triage
3. Review findings
4. Update state
</phase_steps>

<execute_analysis step="7.1" subagent="engineer" role="Test failure analyst">
1. USE SKILL `qa-structure` to resolve run paths/state. If the test report is not under a known path and not in `agents/user-instructions/`: ask user; **WAIT** until a report artifact is available or the user confirms none.
2. USE SKILL `sensitive-data` and run the fail-closed scan before reading or recording report values. Parse the sanitized execution summary first. With 0 failures, skip failure triage and continue directly to the zero-failures branch in step 7.3.
3. With one or more failures, USE SKILL `qa-knowledge` (`test_execution_triage` mode) with the parent-supplied bindings: report path; taxonomy = the UI failure taxonomy; output contract = `<failure_analysis_contract>`; output path = `plans/ui-aqa-<test-name>/failure-analysis.md`; page-sources directory = `plans/ui-aqa-<test-name>/page-sources/`. The skill loads its own taxonomy + report skeleton at point of use. USE SKILL `sensitive-data` for redaction and run its scan as the pre-emit gate before writing.
4. Honor the read-only scope (`<workflow_context>`).
5. **Post-analysis verification when failures exist:** confirm `plans/ui-aqa-<test-name>/failure-analysis.md` exists with every `<failure_analysis_contract>` section. If missing/incomplete: re-run triage once with the same bindings; if still failing, stop Phase 7, record `Phase 7 blocked: failure-analysis.md not produced/incomplete` in `agents/TEMP/<FEATURE>/ui-aqa-state.md`, and ask the user.
</execute_analysis>

<review_findings step="7.2">
Apply this block only when the execution summary reports one or more failures.

1. Verify all failures are categorized per `qa-knowledge`'s UI failure taxonomy, with root causes, and page source analyzed for selector errors.
2. Classify each root cause with an Evidence label `Confirmed` / `Assumption` / `Unknown` (definitions + ambiguity tiebreaks are canonical in `qa-knowledge`'s test-execution triage reference — not restated here).
3. Validation loop (max two cycles): confirm each failure has exactly one label + rationale + recommendation; if any entry is unlabeled or incomplete, repeat step 1. After two cycles with gaps, record unresolved rows in `agents/TEMP/<FEATURE>/ui-aqa-state.md`, ask the user once how to label them (or approval to leave borderline items as `Assumption`), then continue only after the user responds.
4. **Performance & flakiness pass:** parse total + per-test execution times; flag tests above the project's slow-test threshold (configured in `gain.json` or repository test configuration, or a sensible default if unspecified) and note flakiness indicators (intermittent pass/fail, retries consumed, timeouts not attributable to a selector/assertion cause). Record these in the artifact's Patterns section. If the report carries no timing data, record `performance data not available in report` — do not fabricate.
</review_findings>

<update_state step="7.3">
1. Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`: Test Report Location; Tests Executed / Failed counts; Root Causes list; Phase 7 completion timestamp.
2. **Zero-failures branch:** if the executed run reported **0 failures**, do NOT emit `plans/ui-aqa-<test-name>/failure-analysis.md` (there is nothing to analyze). Instead reconcile `ui-aqa-state.md`'s `## Key Artifacts & Facts`: set `Failure analysis (Phase 7)` = `N/A — 0 failures` and `Root causes (Phase 7)` = `None`, and record the Execution Summary (tests executed / passed) in `ui-aqa-state.md`. Never leave the seeded `failure-analysis.md` path referenced while no such file exists — a dangling reference fails the parent's run-completion rule. When ≥1 failure occurred, the `<failure_analysis_contract>` artifact and its post-analysis verification (step 7.1, item 5) apply as written.
3. When failures exist, mark Phase 7 complete and Phase 8 current. With 0 failures, mark Phase 7 complete, record Phase 8 as `N/A — no corrections`, and return to the parent workflow for final user acceptance.
</update_state>

<failure_handling>
- Report present but unreadable/corrupt: retry parsing once, then stop, record the evidence gap in `ui-aqa-state.md`, and ask for readable output or a re-run.
- User confirms no report exists: accept an explicit pass/fail result only when it is actual Phase 6 execution evidence; otherwise remain blocked at the execution gate.
- `qa-structure`, `qa-knowledge`, or `sensitive-data` load/scan failure: retry once, then stop and do not emit the analysis artifact; record the failure in `ui-aqa-state.md` and ask the user.
- Redaction scan unavailable: fail closed — do not quote, summarize, or write captured report/page-source values.
</failure_handling>

<validation_checklist>
- Test report located and parsed
- With failures: all failures categorized per `qa-knowledge`'s UI failure taxonomy; selector errors cite page-source evidence or are tagged `Unknown` per that taxonomy
- With failures: every failure entry has all seven contract fields with a unique sequential `F-N`
- With failures: Patterns section populated (or explicit none), including the performance/flakiness pass — slow tests flagged + flakiness noted, or `performance data not available in report` recorded
- The `sensitive-data` fail-closed scan ran before report values were read or written; with failures, the rendered analysis artifact was also scanned before emit
- With failures: analysis artifact written to the `<workflow_context>` output path and non-empty; with 0 failures: `ui-aqa-state.md` contains execution evidence plus `Failure analysis (Phase 7) = N/A — 0 failures` and `Root causes (Phase 7) = None`
- No source files modified outside the analysis artifact (read-only scope)
</validation_checklist>

</ui_aqa_flow_test_report_analysis>
