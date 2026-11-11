<test-execution-triage>

Read-only triage of an automated-test execution report: categorize each failure and record the findings.

1. Analyze the report — per-test status, error message, stack trace, duration, and captured artifacts (screenshots, page source, request/response).
2. Categorize each failure into exactly one category from the provided failure taxonomy (most-proximate cause).
3. Analyze source data. For element/selector errors, inspect the captured DOM/page source for iframe boundaries, shadow roots, dynamic element generation, stale identifiers/classes, uniqueness, and visibility/enabled state. For response/assertion errors, inspect the captured request/response. No usable source/capture → label the cause `Unknown` and state the exact evidence needed.
4. Identify cross-failure patterns — shared cause, setup cascade, environment-wide, category skew — and prioritize Critical/High/Medium/Low.
5. Label each cause's evidence strength -- `Confirmed` (both sides cited) | `Assumption` (partial; state the missing evidence) | `Unknown` (none; state what is needed); the weaker label wins ties -- and write findings into the provided findings artifact, redacting captured logs / requests / responses / page-sources first (→ USE SKILL `sensitive-data`).

Worked evidence labels examples:

- `Confirmed` — `report.log:142` shows TimeoutError on the old selector AND this run's page source shows the renamed selector — both sides cited.
- `Assumption` — 30s timeout, no stack/HTTP capture, single run; to upgrade: a stack/HTTP log of backend slowness OR ≥3 reproducing reruns.
- `Unknown` — test failed but the report carries no error message, stack, or captured artifact — nothing to cite; record the cause `Unknown` and state the capture needed (e.g. re-run with screenshot / HAR enabled).

</test-execution-triage>
