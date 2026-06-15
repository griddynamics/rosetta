---
name: failure-analysis-template
description: AQA failure-analysis.md skeleton — per-failed-test fields plus Execution Summary and Patterns.
---

<failure-analysis-template>

`aqa-<test-name>-failure-analysis.md` must contain, per failed test:

- **Failure name** — failing test identifier (function name, ATC ID, or report row).
- **Error type** — one category from the AQA failure taxonomy.
- **Root cause** — one-line diagnosed cause (Page Source Analysis cited for selector errors).
- **Evidence label** — `Confirmed` / `Assumption` / `Unknown`.
- **Evidence rationale** — one-line citation supporting the label (log line, page-source diff, repro count).
- **Recommendation** — one-line proposed remediation (the actual change happens in Phase 8).

Plus an **Execution Summary** (Total / Passed / Failed / Skipped / duration) and a **Patterns** section (cross-failure patterns or explicit none).

</failure-analysis-template>
