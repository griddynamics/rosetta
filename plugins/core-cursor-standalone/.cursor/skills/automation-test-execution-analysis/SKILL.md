---
name: automation-test-execution-analysis
description: "Rosetta phase pattern for obtaining test execution output, running read-only failure triage with debugging, and recording categorized root causes before correction work."
license: Apache-2.0
tags: ["workflow", "test-automation", "debugging"]
baseSchema: docs/schemas/skill.md
---

<automation_test_execution_analysis>

<role>

Test failure analyst who turns raw logs into structured, actionable findings for a follow-up correction phase.

</role>

<when_to_use_skill>

Use after automated tests were executed and the workflow needs execution evidence interpreted (logs, reports, CI artifacts), before proposing code changes.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- **Read-only by contract.** This skill produces a categorized analysis artifact; it does NOT apply code fixes. Any correction work belongs to a separate downstream phase the parent workflow routes to after the artifact is emitted.
- **Domain analysis skill — contracted output only.** The parent workflow names a domain analysis skill (a KB identifier). This skill orchestrates around the domain skill's **read-only output contract** — a categorized analysis artifact — without knowledge of the domain skill's internal structure (no awareness of named sections like "Part A" / "Part B" or other sibling-internal partitioning). The domain skill is invoked under its analysis-only contract: it MUST emit the categorized artifact and MUST NOT mutate source files during this phase.

</core_concepts>

<input_contract>

The parent workflow phase file supplies all bindings below. This skill does not infer them — missing values trigger GATEs in `<process>`.

| Input | Source | Required content / format |
|---|---|---|
| Test execution report | Parent workflow's report path, OR user message, OR file under `agents/user-instructions/` discovered by keyword scan in step 1 | One of: framework HTML/XML report (JUnit XML, Playwright HTML, Cypress JSON, pytest JUnit), CI logs (plain text / Markdown), raw stdout/stderr capture, JSON test result export. The format is detected at step 1; if undetectable, treated as plain text. |
| Domain analysis skill name | Parent workflow phase file (e.g. `aqa-test-debugging`, `qa-test-debugging`) | Exact KB identifier this skill resolves at step 4. Invoked under the read-only domain-skill contract in `<core_concepts>`. Missing or unresolvable → step 5 GATE stops the phase. |
| Output artifact path | Parent workflow phase file | Absolute or workspace-relative path where step 9 writes/updates the analysis artifact. Missing → step 9 cannot complete; stop and ask the parent phase. |
| Output schema (optional) | Parent workflow phase file's `<output_format>` block | If parent supplies a schema, follow it. If absent, this skill's `<output_format>` template is the default. |
| Workflow state file | Parent workflow (e.g. `agents/aqa-state.md`, `agents/qa-state.md`) | Where step 10 records counts, root-cause summary, report path, and timestamp. |
| Run identifier or timestamp | Parent workflow OR derivable from the report | Used to tie the analysis artifact to a single test execution. |

**Flow-type determination** (drives the step 7 category set):

- **UI flow** if the report's framework or test paths match Playwright/Cypress/Selenium/WebdriverIO/TestCafe **OR** any failure stack references a browser driver / selector resolution / page-object call. UI-specific categories become applicable: selector/locator, auth/session (browser auth), flakiness from timing/visibility.
- **API flow** if the report's framework matches pytest+requests / RestAssured / SuperTest / Karate **OR** failures cite HTTP status codes, request/response payloads, or contract validators. API-specific categories become applicable: contract mismatch, auth/session (token-based), infra timeout (HTTP), data.
- **Mixed flow:** if both signals are present, treat as **mixed** and apply UI categories to UI-attributed failures, API categories to API-attributed failures. Record the flow-type decision in the analysis artifact's metadata.
- **Indeterminate:** if neither signal is present after one pass over the report (e.g., a plain failure log with no framework markers), record `flow-type: indeterminate` in the artifact's metadata, ask the parent workflow once to disambiguate, and continue with the unioned category list. Do NOT guess.

</input_contract>

<process>

1. Resolve report location: user message, workflow default path, or `agents/user-instructions/` per parent workflow.
2. GATE: if no report is available, ask once with a concrete file path or paste format; **WAIT** for user input.
3. USE SKILL `debugging` while interpreting failures.
4. Resolve the parent-specified domain analysis skill.
5. GATE: if the parent-specified domain analysis skill cannot be resolved/loaded, stop this phase, record the missing skill/tag in workflow state, and ask the user to fix Rosetta/KB access or provide explicit fallback approval before continuing.
6. USE the resolved domain analysis skill under the read-only contract from `<core_concepts>`. If the domain skill's loaded form does not honor that contract for this phase, stop and report to the parent workflow.
7. Categorize each failure using the canonical category enum from `<output_format>` (`environment | data | product-regression | test-bug | flakiness | infra-timeout | auth-session | selector-locator` (UI flows) `| contract-mismatch` (API flows) `| unknown`). The hyphenated forms in `<output_format>` are the single source of truth — do not introduce variants (e.g. `product regression` vs `product-regression`).
8. For each category, tie to evidence: log lines, stack snippets, or request/response identifiers — distinguish verified facts from hypotheses.

   **Worked example — grounded vs ungrounded finding:**

   ✅ **Grounded (fact, evidence-cited):**
   ```
   Test: test_checkout_submits_with_valid_card
   Category: selector/locator
   Evidence: report.log:142 — "TimeoutError: locator('[data-testid=\"checkout-submit\"]') not found after 30000ms"
   Page source: agents/plans/aqa-checkout-page-sources/checkout.html (captured this run) shows `[data-testid="checkout-confirm"]` — selector was renamed.
   Fact-vs-hypothesis: FACT — the selector value in the test does not match the rendered DOM; both sides are cited.
   Suspected fix owner: tests/checkout/payment.spec.ts (update selector to checkout-confirm)
   ```

   ❌ **Ungrounded (hypothesis without evidence — must be tagged):**
   ```
   Test: test_checkout_submits_with_valid_card
   Category: flakiness
   Evidence: none
   Fact-vs-hypothesis: HYPOTHESIS — "probably a flaky network call; retry should fix it"
   Required to upgrade to FACT: a stack trace or HTTP log showing the actual network failure, OR three reruns reproducing the failure to confirm flakiness.
   ```

   See `<output_format>` note for the canonical "every entry MUST carry a Fact-vs-Hypothesis flag" rule (single source of truth — not restated here).
9. Produce or update the parent workflow's analysis artifact (path and template from phase file).
10. Update workflow state with counts, root-cause summary list, report path, and phase completion timestamp.
11. GATE: confirm recommendations are actionable for a correction phase (owner file, suspected fix type).

</process>

<output_format>

If the parent workflow phase file supplies an `<output_format>` (or analysis-artifact template), follow it verbatim. **Otherwise this is the default template** for the analysis artifact written at step 9:

```markdown
# Test Execution Analysis — <run-id-or-timestamp>

**Generated:** <YYYY-MM-DD HH:MM>
**Report source:** <path or URL>
**Flow type:** UI | API | mixed | indeterminate
**Domain analysis skill applied:** <skill-name> (analysis-only / read-only contract)
**Tests executed:** <count>
**Tests failed:** <count>

## Failures

### F1 — <test-id-or-name>
- **Category:** environment | data | product-regression | test-bug | flakiness | infra-timeout | auth-session | selector-locator | contract-mismatch | unknown
- **Evidence references:** <log-file:line>, <stack-snippet-id>, <request-id>, OR `none — see Fact-vs-Hypothesis flag`
- **Fact-vs-Hypothesis flag:** FACT | HYPOTHESIS | UNKNOWN
  - If HYPOTHESIS: state what evidence would upgrade it to FACT
  - If UNKNOWN: state the next data to collect (rerun, log level, dump)
- **Root cause (one line):** <e.g., "selector renamed from `checkout-submit` to `checkout-confirm` in commit abc1234">
- **Suspected owner file / fix type:** <path> / <fix category, e.g., update-selector | extend-timeout | mock-fix | retry-policy>
- **Affects:** <other test IDs sharing this root cause, OR `only this test`>

### F2 — ...
(repeat per failure; collapse failures sharing one root cause into a single Fn entry with `Affects:` enumerating them)

## Categorized Summary

| Category | Count | Notes |
|---|---|---|
| selector-locator | 3 | All in checkout.spec.ts |
| flakiness | 1 | Hypothesis — needs reruns |
| ... | ... | ... |

## Recommendations for Correction Phase

- <Owner file>: <one-line fix recommendation> (covers F1, F3)
- ...

## Metadata

- **Run identifier:** <id>
- **Parent workflow state file:** <path>
- **Date:** <YYYY-MM-DD>
```

Every failure entry MUST carry a Fact-vs-Hypothesis flag — absent flag is a validation failure. Entries with `FACT` cite at least one evidence reference; `HYPOTHESIS` / `UNKNOWN` cite none but state what would upgrade them.

</output_format>

<safety_boundaries>

The analysis artifact is **tracked, downstream-fed, and PUBLIC by default** — committed to the repo, read by the correction phase, referenced in state files, possibly shared with reviewers. Raw inputs (CI logs, framework reports, stack snippets, request/response bodies) routinely embed real secrets and PII. **Redact before writing into the artifact, not after.**

**Redaction policy** (targets table + canonical grep-pattern list + structural-content rule + re-scan rule) lives in [references/redaction-policy.md](references/redaction-policy.md) — load when the `<validation_checklist>` redaction item runs.

</safety_boundaries>

<validation_checklist>

- Execution input was actually read, not summarized from memory
- Flow type recorded (UI / API / mixed / indeterminate) per `<input_contract>` flow-type determination
- Every failure entry carries a Fact-vs-Hypothesis flag per the `<output_format>` mandatory-flag rule (canonical); FACT entries cite ≥1 evidence reference, HYPOTHESIS/UNKNOWN entries state what would upgrade them
- No code changes were started — this phase is read-only by contract; correction work is the downstream phase's job unless the parent workflow explicitly authorizes a combined phase
- State and analysis artifact both reflect the same run identifier or timestamp
- Analysis artifact follows the parent's `<output_format>` if supplied, OR this skill's default template if not — sections present, no `TBD` placeholders
- User was informed how to proceed (e.g. correction phase) per parent workflow
- **Redaction scan completed** per `<safety_boundaries>` policy in [references/redaction-policy.md](references/redaction-policy.md) (canonical targets + grep-pattern list + structural-content + re-scan rules) — every Failure entry's Evidence references and any inline log/stack/body snippets were grepped; any matches were replaced with placeholders AND the redaction noted inline. No literal credentials, tokens, or real PII remain in the artifact.

</validation_checklist>

<best_practices>

- Prefer stable identifiers (test case name, node id, request id) over page numbers in PDFs
- When multiple failures share one root cause, collapse them to reduce noise

</best_practices>

<pitfalls>

- Treating green CI from a different branch or stale run as current
- Confusing application bugs with outdated tests without evidence

</pitfalls>

<resources>

- skill `debugging` — systematic triage
- skill `hitl` — when user must supply missing logs or approve scope
- Parent workflow phase file — output path and domain skill name

</resources>

</automation_test_execution_analysis>
