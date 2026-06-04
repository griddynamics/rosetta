# Output Template + Worked Examples — automation-test-execution-analysis

Loaded on demand from SKILL.md when actively writing the analysis artifact (step 8 evidence-citation pass + step 9 emit). The base SKILL.md keeps the canonical category enum + the mandatory Fact-vs-Hypothesis rule + flow-type determination + 11 process steps inline; this file holds the verbatim markdown template the agent fills in at write time and the grounded/ungrounded paired example.

Mirrors the same lazy-loading pattern `redaction-policy.md` already uses for the safety-boundaries detail.

---

## Default analysis-artifact template (referenced from SKILL.md `<output_format>`)

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

---

## Worked example — grounded vs ungrounded finding (referenced from SKILL.md `<process>` step 8)

The Fact-vs-Hypothesis rule is canonical in SKILL.md `<output_format>` ("every failure entry MUST carry a Fact-vs-Hypothesis flag"). The paired example below shows the rule applied to one test in both shapes so the field-shape is concrete at authoring time.

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

Apply the same shape to every Fn entry: state the category (from the canonical enum), cite or explicitly disclaim evidence, set the Fact-vs-Hypothesis flag, name a one-line root cause + owner file when FACT, or state what data would upgrade HYPOTHESIS / UNKNOWN to FACT.

---

## Flow-type determination (referenced from SKILL.md `<input_contract>`)

The base SKILL.md keeps the input-contract table inline (decision-time — agents need the input shape every call); this section holds the flow-type detection rules loaded only when actually triaging a report.

The flow type drives the step-7 category set:

- **UI flow** if the report's framework or test paths match Playwright / Cypress / Selenium / WebdriverIO / TestCafe **OR** any failure stack references a browser driver / selector resolution / page-object call. UI-specific categories become applicable: selector/locator, auth/session (browser auth), flakiness from timing/visibility.
- **API flow** if the report's framework matches pytest+requests / RestAssured / SuperTest / Karate **OR** failures cite HTTP status codes, request/response payloads, or contract validators. API-specific categories become applicable: contract mismatch, auth/session (token-based), infra timeout (HTTP), data.
- **Mixed flow:** if both signals are present, treat as **mixed** and apply UI categories to UI-attributed failures, API categories to API-attributed failures. Record the flow-type decision in the analysis artifact's metadata.
- **Indeterminate:** if neither signal is present after one pass over the report (e.g., a plain failure log with no framework markers), record `flow-type: indeterminate` in the artifact's metadata, ask the parent workflow once to disambiguate, and continue with the unioned category list. Do NOT guess.

---

## Best practices + pitfalls (referenced from SKILL.md `<best_practices>` + `<pitfalls>`)

Loaded on demand during report triage / artifact authoring. The base SKILL.md keeps decision-time content (process / GATEs / safety / output_format) inline; this section holds the recommendation + anti-pattern catalogs.

### Best practices

- Prefer stable identifiers (test case name, node id, request id) over page numbers in PDFs.
- When multiple failures share one root cause, collapse them to reduce noise (use `Affects:` to enumerate the test IDs sharing the root cause in a single Fn entry rather than emitting Fn-1, Fn-2, Fn-3 for the same cause).

### Pitfalls

- Treating green CI from a different branch or stale run as current — verify the run identifier matches the execution under analysis.
- Confusing application bugs with outdated tests without evidence — `product-regression` (app bug) vs `test-bug` (outdated test) is exactly the call the Fact-vs-Hypothesis flag exists to make traceable. When both could explain the failure, set the flag to `HYPOTHESIS` until a stack / request trace / spec diff decides it.
