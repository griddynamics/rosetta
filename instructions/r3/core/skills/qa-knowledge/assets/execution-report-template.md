---
name: execution-report-template
description: QA execution-report.md skeleton — the read-only failure-triage artifact written at Phase 6.
---

<execution-report-template>

**Required inputs:** the test-runner output (per-test pass/fail/skip + duration) with at least one failure carrying an error message + stack trace.

**Unavailable-metric rule:** if a value cannot be determined (e.g. CI interrupted), emit `N/A — <one-word reason>` (e.g. `duration: N/A — interrupted`) — never leave a metric blank or omit it.

`execution-report.md` must be non-empty and contain:

- **Execution Summary** — Total / Passed / Failed / Skipped / duration.
- **Failures by Category** — count + tests affected per the QA failure taxonomy category.
- **Failure Details** — one entry per failed test with: **ID** (`ERR-N`, sequential from `ERR-1` — the stable id the correction phase cites) · Failure name · Category (one taxonomy category) · Root cause · Evidence label (`Confirmed`/`Assumption`/`Unknown`) · Evidence rationale (one-line citation) · Priority (Critical/High/Medium/Low).
- **Patterns** — cross-failure patterns OR an explicit `No cross-failure patterns identified`.
- **Recommendations** — actionable items for the downstream correction phase, application defects, environment issues.

**Worked example** (Failure Details entry):

> **ID:** ERR-1 · **Failure name:** test_checkout_payment_timeout · **Category:** Timing / Race Condition · **Root cause:** API latency spike on `/payment` · **Evidence label:** Confirmed · **Evidence rationale:** CI log line 847 shows a 30s timeout · **Priority:** High.

**Before writing:** all 5 sections present; the Failure Details entry count equals the `Failed` count in Execution Summary; each entry has a unique sequential `ERR-N` id; each Category is a single taxonomy category. **Done when** all 5 sections exist and every failed test has exactly one Failure Details entry carrying its `ERR-N` id.

</execution-report-template>
