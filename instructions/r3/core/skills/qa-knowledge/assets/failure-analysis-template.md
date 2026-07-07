# UI-QA failure-analysis template

UI-QA failure-analysis.md skeleton -- per-failed-test fields + Execution Summary + Patterns.

<failure-analysis-template>

**Input:** UI-QA run output (errors + stack traces), UI-QA failure taxonomy, and -- for selector failures -- captured page-source/diff.
**Evidence label `Unknown`:** assign ONLY after page-source capture was attempted and the cause is still unresolvable; if page sources were never captured, escalate via `qa-knowledge/assets/page-source-capture-instructions.md` first.

`ui-qa-<test-name>-failure-analysis.md`, per failed test:

- **ID** -- `F-N` from `F-1` (cited by the correction phase).
- **Failure name** -- test identifier (function, ATC ID, or report row).
- **Error type** -- one UI-QA taxonomy category.
- **Root cause** -- one-line cause (cite Page Source Analysis for selector errors).
- **Evidence label** -- `Confirmed`/`Assumption`/`Unknown`.
- **Evidence rationale** -- one-line citation (log line, page-source diff, repro count).
- **Recommendation** -- one-line remediation (applied downstream, not here).

Plus **Execution Summary** (Total / Passed / Failed / Skipped / duration) and **Patterns** (cross-failure patterns or explicit none).

**Example** (Root cause vs Evidence rationale -- commonly conflated): > **ID:** F-1 · **Failure name:** test_login_submit · **Error type:** Selector / Locator · **Root cause:** `#submit-btn` id removed in the latest deploy · **Evidence label:** Confirmed · **Evidence rationale:** page-source diff line 42 shows the id changed to `data-testid="login-submit"` · **Recommendation:** update the selector to `[data-testid="login-submit"]`.

**Done when** every failed test has exactly one entry with all 7 fields (incl. sequential `F-N`), each Evidence label is `Confirmed`/`Assumption`/`Unknown`, and Execution Summary counts match the run.

</failure-analysis-template>
