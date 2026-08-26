# QA failure-report template

Shared failure-triage report skeleton. API-AQA emits `execution-report.md`; UI-AQA emits `plans/ui-aqa-<test-name>/failure-analysis.md`. Same record spine + two variant deltas.

<failure-report-template>

**Inputs required:** the test run output (per-test pass/fail/skip + duration; ≥1 failure with error message + stack trace) and the flow's failure taxonomy. UI selector failures also need the captured page-source/diff.
**Unavailable metric:** emit `N/A -- <reason>` (e.g. `duration: N/A -- interrupted`), never blank.
**Evidence label `Unknown` (UI):** use when required evidence is unavailable or remains inconclusive after the feasible capture path. If page-source capture was never attempted and remains feasible, APPLY SKILL FILE `assets/page-source-capture-instructions.md` and escalate first; if capture is impossible, state why and name the evidence needed.

Non-empty report, sections:

- **Execution Summary** -- Total / Passed / Failed / Skipped / duration.
- **Failure Details** -- one entry per failed test: **ID** (sequential, cited by the correction phase) · Failure name · Category (one taxonomy category) · Root cause · Evidence label (`Confirmed`/`Assumption`/`Unknown`) · Evidence rationale (one-line citation) · final field (per variant).
- **Patterns** -- cross-failure patterns, or `No cross-failure patterns identified`.

**Variant deltas:**
- **API-AQA (`execution-report.md`):** ID prefix `ERR-N` (from `ERR-1`); final field **Priority** (Critical/High/Medium/Low); also emit **Failures by Category** (count + tests affected, per taxonomy category) and **Recommendations** (actionable items for the correction phase).
- **UI-AQA (`plans/ui-aqa-<test-name>/failure-analysis.md`):** ID prefix `F-N` (from `F-1`); the Category field is labelled **Error type**; final field **Recommendation** (one-line remediation, applied downstream); Root cause cites Page Source Analysis for selector errors.

**Examples** (Root cause vs Evidence rationale -- commonly conflated):
> API · **ID:** ERR-1 · **Failure name:** test_checkout_payment_timeout · **Category:** Timing / Race Condition · **Root cause:** API latency spike on `/payment` · **Evidence label:** Confirmed · **Evidence rationale:** CI log line 847 shows a 30s timeout · **Priority:** High.
> UI · **ID:** F-1 · **Failure name:** test_login_submit · **Error type:** Selector / Locator · **Root cause:** `#submit-btn` id removed in the latest deploy · **Evidence label:** Confirmed · **Evidence rationale:** page-source diff line 42 shows the id changed to `data-testid="login-submit"` · **Recommendation:** update the selector to `[data-testid="login-submit"]`.

**Done when** every failed test has exactly one Failure Details entry with all fields (its sequential ID + the variant's final field), each Evidence label is `Confirmed`/`Assumption`/`Unknown`, Execution Summary counts match the run, and Patterns is present. **API also:** Failures-by-Category + Recommendations present.

</failure-report-template>
