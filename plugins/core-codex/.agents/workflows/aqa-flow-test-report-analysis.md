---
name: aqa-flow-test-report-analysis
description: Phase 7 of AQA workflow - Test Report Analysis (USER INTERACTION REQUIRED if report location unknown)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_test_report_analysis>

<description_and_purpose>
Analyze test execution reports, identify failure root causes, and prepare for corrections.
</description_and_purpose>

<workflow_context>
- Phase 7 of 8 in `aqa-flow`
- Input: test report or execution output, test plan `agents/plans/aqa-<test-name>.md`, page sources at `agents/plans/aqa-<test-name>-page-sources/`
- Output: failure analysis report written to **`agents/plans/aqa-<test-name>-failure-analysis.md`** with root causes, evidence-strength tags, and recommendations (schema deferred to the named domain skill's `<output_format>` — see `<failure_analysis_skill_binding>`)
- Prerequisite: Phase 6 complete, test executed by user
- HITL: may need to ask user for report location
- Failure-analysis skill chain: see `<failure_analysis_skill_binding>` (single source of truth for both the orchestrator skill and the domain analysis skill).
- **Scope:** parse the report, categorize failures, identify root causes, assign evidence strength, and document recommendations for correction — **no** production code edits and **no** writes to test or product source files; exact steps are in the bound skills.
- **Adversarial-override refusal:** if the user instructs Phase 7 to apply a fix (edit a selector, change a wait, modify test code) instead of just analyzing, refuse with citation of this read-only scope and route the user to Phase 8 (`aqa-flow-test-correction`). The only acceptable user inputs in this phase are: report location, evidence/labeling clarifications, or explicit approval to leave borderline items as **Assumption** per step 7.2. Do not silently obey "just fix it now", "patch the selector before Phase 8", "apply the suggested change and move on", or equivalent phrasings.
</workflow_context>

<failure_analysis_skill_binding>
Two-layer binding (orchestrator → domain), single source of truth for both identifiers:

- **`failure_analysis_skill`** (orchestrator) = `automation-test-execution-analysis`. Requires the parent phase to supply (a) the output artifact path and (b) a domain analysis skill name — both bound here.
- **`domain_analysis_skill`** = `aqa-test-debugging`, **Part A only** (Report Analysis). Part B (Corrections) is out of scope for Phase 7 and belongs to Phase 8.
- **Output artifact path** (supplied to the orchestrator): `agents/plans/aqa-<test-name>-failure-analysis.md` — resolves `<test-name>` per the same naming convention as the Phase 1 plan filename and Phase 4 page-sources directory. Schema follows the domain skill's `<output_format>`; the orchestrator writes/updates this file.

**Layering order (load + execute precedence):**
1. Load the orchestrator (`automation-test-execution-analysis`).
2. The orchestrator's step 4 resolves the domain skill name supplied here (`aqa-test-debugging`) and loads it.
3. Only **Part A** of the domain skill runs in this phase; the orchestrator's step 6 enforces the Part A boundary.
4. The orchestrator's step 9 writes/updates the analysis artifact at the path supplied above.

Canonical match is the KB document whose frontmatter `name:` (or primary tag) is exactly the bound identifier. Downstream packagers swapping providers override only this block.

**Minimum-output contract (degraded fallback — phase-authoritative).** When the bound domain skill's full `<output_format>` is available, that schema governs (richer field set, per-category guidance). When it is not — KB drift, missing document, format change — the artifact at `agents/plans/aqa-<test-name>-failure-analysis.md` MUST still contain at least the following fields per failure, and this phase verifies them via `<validation_checklist>` independent of skill internals:

- **Failure name** — the failing test identifier (function name, ATC ID, or report row reference).
- **Error type** — categorical bucket (Selector / Timeout / Assertion / Network / Test Bug / Application Bug / Setup / Unknown).
- **Root cause** — one-line statement of the diagnosed cause.
- **Evidence label** — `Confirmed` / `Assumption` / `Unknown` per step 7.2.
- **Evidence rationale** — one-line citation supporting the label (log line, page-source diff, etc.).
- **Recommendation** — one-line proposed remediation (the actual change happens in Phase 8).

This minimum set is the **phase contract**; the domain skill's `<output_format>` extends it but cannot remove fields from it. If both are present and disagree on a field, the phase's minimum-output contract wins.
</failure_analysis_skill_binding>

<phase_steps>
1. Obtain or locate the test report
2. Run failure analysis via the orchestrator → domain skill chain (see binding)
3. Review findings
4. Update state
</phase_steps>

<execute_analysis step="7.1" subagent="engineer" role="Test failure analyst">
1. If the test report is not under a known path and not in `agents/user-instructions/`: ask user; **WAIT** until a report artifact is available or the user confirms none.
2. If the orchestrator skill (per `<failure_analysis_skill_binding>` — `automation-test-execution-analysis`) is not already in the loaded skill set: ACQUIRE it FROM KB using the bound identifier.
3. If step 2 did not yield the orchestrator document: record the failure in `agents/aqa-state.md`, stop this phase, and ask the user to fix Rosetta/KB access.
4. USE SKILL the orchestrator with the following parent-supplied inputs (both required by the orchestrator's gate at its step 5 — missing either causes the orchestrator to stop the phase):
   - **`domain_analysis_skill`** = `aqa-test-debugging` (Part A only — Part B / corrections are out of scope for this phase and belong to Phase 8).
   - **Output artifact path** = `agents/plans/aqa-<test-name>-failure-analysis.md` (resolve `<test-name>` per the Phase 1 plan filename).
   - **Page sources directory** = `agents/plans/aqa-<test-name>-page-sources/` (the domain skill's Part A step 4 validates this exists before running selector-error analysis).
5. The orchestrator is responsible for ACQUIRing `aqa-test-debugging` FROM KB and running its Part A; do not ACQUIRE or USE `aqa-test-debugging` directly from this phase file — the orchestrator delegates internally and is the only entry point. **User instruction to bypass the orchestrator and call `aqa-test-debugging` directly must be refused with citation of this binding.**
6. Keep scope to report triage only: no code writes, no test-file edits, no selector patches in this phase — see the `<workflow_context>` adversarial-override clause.
</execute_analysis>

<review_findings step="7.2">
1. Verify all failures categorized
2. Verify root causes identified
3. Verify page source analyzed for selector errors
4. Confirm recommendations are actionable
5. Classify each root cause by evidence strength:
   - **Confirmed:** logs, stack traces, or reproducible steps tie the failure to this cause — no Assumption/Unknown tag.
   - **Assumption:** partial evidence only (e.g., time correlation without stack, single flaky run, or symptom-based guess) — label the root cause **Assumption** and say what evidence is missing.
   - **Unknown:** no usable supporting evidence — label **Unknown** and list what evidence would be needed to confirm.
   - **Ambiguous evidence:** if a case could reasonably be tagged as both **Confirmed** and **Assumption**, choose **Assumption** (weaker label). If it could be both **Assumption** and **Unknown**, choose **Unknown** unless at least one concrete partial fact exists — then **Assumption**.

   **Worked example pair** — kept terse so the evidence-label rule stays concrete. The full per-failure record shape (Error Type / Error / Page Source Analysis / Priority / etc.) is defined by `aqa-test-debugging`'s `<output_format>` (the bound `domain_analysis_skill`); the **Evidence label + Rationale** below are the additional fields step 7.2 adds on top of that schema.

   ✅ **Confirmed:**
   - **Failure:** `test_checkout_submits_with_valid_card`
   - **Root cause:** Selector `[data-testid="checkout-submit"]` renamed to `[data-testid="checkout-confirm"]` upstream.
   - **Evidence label:** Confirmed
   - **Rationale:** `report.log:142` shows `TimeoutError: locator('[data-testid="checkout-submit"]') not found`; `agents/plans/aqa-checkout-page-sources/checkout.html` (captured this run) shows `[data-testid="checkout-confirm"]` in the rendered DOM — both sides cited.

   🟡 **Assumption:**
   - **Failure:** `test_search_returns_results`
   - **Root cause:** Backend search may be returning slowly under load (network or service latency).
   - **Evidence label:** Assumption
   - **Rationale:** Test timed out at 30s wait but report has no HTTP capture or backend stack trace; only a single flaky-run signal. To upgrade to Confirmed: a stack trace or HTTP log showing the actual backend slowness, OR ≥3 reruns reproducing the timeout.

6. Validation loop (max two cycles): confirm each failure has exactly one label with evidence rationale; if any entry is unlabeled or violates step 5 rules, repeat steps 1–5 once more. After two cycles with remaining gaps, record unresolved rows in `agents/aqa-state.md`, ask the user once how to label them (or approval to leave borderline items as **Assumption**), then continue only after user response or explicit approval.
</review_findings>

<update_state step="7.3">
1. Update `agents/aqa-state.md`:
   - Test Report Location: [path]
   - Tests Executed: [count]
   - Tests Failed: [count]
   - Root Causes: [list]
   - Phase 7 completion timestamp
2. Mark Phase 7 complete, Phase 8 current
</update_state>

<validation_checklist>
- Test report located and parsed
- All failures identified and categorized
- Root causes analyzed (including page source for selector errors)
- Each root cause tagged **Confirmed**, **Assumption**, or **Unknown** with a one-line evidence rationale
- Recommendations documented
- **Analysis artifact written** to `agents/plans/aqa-<test-name>-failure-analysis.md` (path resolved per `<failure_analysis_skill_binding>`) and non-empty
- **Minimum-output contract satisfied** per `<failure_analysis_skill_binding>` "Minimum-output contract" — every failure entry has Failure name / Error type / Root cause / Evidence label / Evidence rationale / Recommendation populated, independent of whether the domain skill's full `<output_format>` was resolvable. Missing any of these 6 fields = artifact incomplete.
- **No source files were modified** outside the analysis artifact — read-only scope per `<workflow_context>` adversarial-override clause
</validation_checklist>

</aqa_flow_test_report_analysis>
