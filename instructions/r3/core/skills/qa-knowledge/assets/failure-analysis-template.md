---
name: failure-analysis-template
description: UI-QA failure-analysis.md skeleton — per-failed-test fields plus Execution Summary and Patterns.
---

<failure-analysis-template>

**Required inputs:** the UI-QA test-run output (per-test error messages + stack traces), the UI-QA failure taxonomy loaded, and — for selector-class failures — the captured page-source / diff.

**Evidence-label rule:** assign `Unknown` ONLY after page-source capture has been attempted and the cause is still unresolvable. If page sources were never captured, escalate via `qa-knowledge/assets/page-source-capture-instructions.md` before assigning `Unknown` — do not short-circuit the diagnosis.

`aqa-<test-name>-failure-analysis.md` must contain, per failed test:

- **ID** — `F-N` (sequential from `F-1`; the stable id the correction phase cites).
- **Failure name** — failing test identifier (function name, ATC ID, or report row).
- **Error type** — one category from the UI-QA failure taxonomy.
- **Root cause** — one-line diagnosed cause (Page Source Analysis cited for selector errors).
- **Evidence label** — `Confirmed` / `Assumption` / `Unknown`.
- **Evidence rationale** — one-line citation supporting the label (log line, page-source diff, repro count).
- **Recommendation** — one-line proposed remediation (the actual change happens in the downstream correction step).

Plus an **Execution Summary** (Total / Passed / Failed / Skipped / duration) and a **Patterns** section (cross-failure patterns or explicit none).

**Worked example** (resolves the Root-cause vs Evidence-rationale distinction agents conflate):

> **ID:** F-1 · **Failure name:** test_login_submit · **Error type:** Selector / Locator · **Root cause:** `#submit-btn` id removed in the latest deploy · **Evidence label:** Confirmed · **Evidence rationale:** page-source diff line 42 shows the id changed to `data-testid="login-submit"` · **Recommendation:** update the selector to `[data-testid="login-submit"]`.

**Before writing:** every failed test from the run has exactly one entry; each `Evidence label` is one of `Confirmed`/`Assumption`/`Unknown`; Execution Summary counts are consistent with the run. **Done when** all of the above hold and every entry has all 7 fields populated (incl. its sequential `F-N` id).

</failure-analysis-template>
