# API-QA execution-report template

QA execution-report.md skeleton -- read-only failure-triage artifact, Phase 6.

<execution-report-template>

**Input:** test-runner output (per-test pass/fail/skip + duration), ≥1 failure with error message + stack trace.
**Unavailable metric:** emit `N/A -- <reason>` (e.g. `duration: N/A -- interrupted`), never blank.

`execution-report.md`, non-empty, sections:

- **Execution Summary** -- Total / Passed / Failed / Skipped / duration.
- **Failures by Category** -- count + tests affected, per taxonomy category.
- **Failure Details** -- one entry per failed test: **ID** (`ERR-N` from `ERR-1`, cited by the correction phase) · Failure name · Category (one taxonomy category) · Root cause · Evidence label (`Confirmed`/`Assumption`/`Unknown`) · Evidence rationale (one-line citation) · Priority (Critical/High/Medium/Low).
- **Patterns** -- cross-failure patterns, or `No cross-failure patterns identified`.
- **Recommendations** -- actionable items for the correction phase.

**Example:** > **ID:** ERR-1 · **Failure name:** test_checkout_payment_timeout · **Category:** Timing / Race Condition · **Root cause:** API latency spike on `/payment` · **Evidence label:** Confirmed · **Evidence rationale:** CI log line 847 shows a 30s timeout · **Priority:** High.

**Done when** all 5 sections present, Failure Details count = `Failed` count, each entry has a unique sequential `ERR-N` and one taxonomy Category.

</execution-report-template>
