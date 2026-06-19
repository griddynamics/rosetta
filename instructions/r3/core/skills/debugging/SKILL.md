---
name: debugging
description: "To investigate errors, test failures, and unexpected behavior — root cause before fix."
license: Apache-2.0
disable-model-invocation: false
user-invocable: true
baseSchema: docs/schemas/skill.md
---

<debugging>

<role>

Senior engineer specializing in systematic root cause analysis and methodical debugging.

</role>

<when_to_use_skill>
Use when encountering errors, test failures, unexpected behavior, or when a previous fix failed and the issue persists. For an automated-test execution report (UI or API), use the test-execution triage mode in `<test_execution_triage>`. Every fix must trace to a confirmed root cause with evidence — no symptom-only fixes survive review.
</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- ALWAYS find root cause before attempting fixes; symptom fixes are failure
- Make implicit become explicit — incorrect assumptions hide root causes
- Evidence label per cause — `Confirmed` (both sides cited) | `Assumption` (partial; state the missing evidence) | `Unknown` (none; state what is needed); the weaker label wins ties
- Redaction of captured logs, requests, responses, or page sources → USE SKILL `sensitive-data` (canonical authority)
- Execute phases sequentially

For each issue provide:

- OODA
- Root cause explanation with supporting evidence
- Specific code fix
- Testing approach
- Prevention recommendations

</core_concepts>

<root_cause_investigation phase="1">

BEFORE attempting ANY fix:

1. Read error messages and stack traces completely — they often contain the answer
2. Reproduce consistently — if not reproducible, gather more data, don't guess
3. Check recent changes — git diff, new dependencies, config changes
4. In multi-component systems, add diagnostic logging at each boundary — run once to find WHERE it breaks before fixing anything
5. Trace data flow backward — where does the bad value originate? Fix at source, not symptom
6. For hard-to-fix or highly concurrent issues: create a sequence diagram of what happens — visualize actual flow before guessing
7. Temporarily enable tracing in code and logs — review actual execution vs assumed execution, then remove tracing

</root_cause_investigation>

<pattern_analysis phase="2">

1. Find similar working code in the same codebase
2. Compare working vs broken — list every difference, however small
3. If implementing a known pattern, read the reference completely — don't skim

</pattern_analysis>

<hypothesis_and_testing phase="3">

1. State one clear hypothesis: "X is the root cause because Y"
2. Make the smallest possible change to test it — one variable at a time
3. If it fails, form a new hypothesis — don't stack fixes

</hypothesis_and_testing>

<implementation phase="4">

1. Create a failing test that reproduces the bug
2. Implement a single fix targeting the root cause
3. Verify: test passes, no regressions, issue resolved
4. If 3+ fixes have failed: stop fixing and question the architecture — this likely isn't a bug, it's a design problem. Is third-party involved? Discuss before continuing.

</implementation>

<test_execution_triage>

Read-only triage of an automated-test execution report. The caller supplies three bindings: the report path, the failure-category taxonomy to use, and the output-artifact contract.

1. Parse the report — per-test status, error message, stack trace, duration, and captured artifacts (screenshots, page source, request/response).
2. Categorize each failure into exactly one category from the supplied taxonomy (most-proximate cause).
3. For element/selector errors analyze the captured page source; for response/assertion errors analyze the captured request/response. No capture available → label the cause `Unknown` and state the capture needed.
4. Identify cross-failure patterns — shared cause, setup cascade, environment-wide, category skew — and prioritize Critical/High/Medium/Low.
5. Label each cause's evidence strength (→ `<core_concepts>`) and write findings into the caller's output artifact, redacted (→ `<core_concepts>`).

GATE: read-only. Proposing or applying fixes is a separate correction phase (`debugging` for root-cause / proposed-change reasoning + `coding` for the edit).

Worked evidence labels:

- `Confirmed` — `report.log:142` shows TimeoutError on the old selector AND this run's page source shows the renamed selector — both sides cited.
- `Assumption` — 30s timeout, no stack/HTTP capture, single run; to upgrade: a stack/HTTP log of backend slowness OR ≥3 reproducing reruns.
- `Unknown` — test failed but the report carries no error message, stack, or captured artifact — nothing to cite; record the cause `Unknown` and state the capture needed (e.g. re-run with screenshot / HAR enabled).

</test_execution_triage>

<validation_checklist>

- Root cause identified with evidence before any fix attempted
- Sequence diagram created for concurrent or hard-to-fix issues
- Temporary tracing removed after investigation
- Fix targets root cause, not symptom
- Failing test reproduces the bug
- No regressions introduced
- Prevention recommendation documented
- Triage mode: every failed test has one taxonomy category, a root cause, and an evidence label; selector/response causes cite captured evidence or are labeled `Unknown`; cross-failure patterns are named or explicitly none; redaction scan ran

</validation_checklist>

<best_practices>

- One hypothesis, one change at a time
- Check recent changes early in investigation
- Use diagnostic logging at component boundaries

</best_practices>

<pitfalls>

- Attempting fixes before tracing the root cause
- Stacking multiple fixes without validating each
- Each fix reveals a new problem elsewhere — likely a design issue, not a bug
- Categorizing failures without populating a root cause and an evidence label

</pitfalls>

</debugging>
