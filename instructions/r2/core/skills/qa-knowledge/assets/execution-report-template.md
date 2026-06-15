---
name: execution-report-template
description: QA execution-report.md skeleton — the read-only failure-triage artifact written at Phase 6.
---

<execution-report-template>

`execution-report.md` must be non-empty and contain:

- **Execution Summary** — Total / Passed / Failed / Skipped / duration.
- **Failures by Category** — count + tests affected per the QA failure taxonomy category.
- **Failure Details** — one entry per failed test with: Failure name · Category (one taxonomy category) · Root cause · Evidence label (`Confirmed`/`Assumption`/`Unknown`) · Evidence rationale (one-line citation) · Priority (Critical/High/Medium/Low).
- **Patterns** — cross-failure patterns OR an explicit `No cross-failure patterns identified`.
- **Recommendations** — actionable items for Phase 7 (corrections), application defects, environment issues.

</execution-report-template>
