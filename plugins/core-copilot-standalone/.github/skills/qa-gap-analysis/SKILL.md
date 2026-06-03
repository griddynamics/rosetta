---
name: qa-gap-analysis
description: Cross-reference test cases vs API spec, identify gaps/contradictions/ambiguities, prepare prioritized questions for user clarification.
tags: ["qa"]
baseSchema: docs/schemas/skill.md
---

<qa-gap-analysis>

<role>API test gap analysis and requirements clarification specialist</role>

<when_to_use_skill>
Systematically compare test cases against API specifications to find missing information, contradictions, and ambiguities before test specification.
</when_to_use_skill>

<prerequisites>
- Raw data document exists (`agents/qa/{IDENTIFIER}/raw-data.md`)
- API analysis document exists (`agents/qa/{IDENTIFIER}/api-analysis.md`)
- Project config loaded
</prerequisites>

<process>

All step-N entry templates + gap-category catalogs + vague-statement examples live in [references/entry-templates.md](references/entry-templates.md) — load on demand at the relevant write step. The base process below is orchestration only.

## 1. Cross-Reference Test Cases vs API Spec

For each test step from the test case, verify against API analysis using this check table:

| Check | Question | Impact |
|-------|----------|--------|
| Endpoint exists | Does the endpoint in test case match a real API endpoint? | Blocking if mismatch |
| Method matches | Does the HTTP method match? | Blocking if wrong |
| Request schema | Are test case inputs valid per request schema? | May cause false failures |
| Response schema | Are expected results compatible with response schema? | Wrong assertions |
| Status codes | Are expected status codes correct for each scenario? | Wrong assertions |
| Auth coverage | Does test case cover auth scenarios appropriately? | Missing test coverage |
| Error handling | Does test case cover error responses? | Incomplete coverage |

Document findings per the Cross-Reference entry template in [references/entry-templates.md](references/entry-templates.md#step-1--cross-reference-entry-template).

## 2. Identify Gaps

Scan against the 6 gap categories (Endpoint / Request / Response / Auth / Test Data / Edge Case) enumerated in [references/entry-templates.md](references/entry-templates.md#step-2--gap-categories-what-to-scan-for). Emit one `G[N]` entry per missing data point per the G[N] template in the same reference. Do not paraphrase the template — its field set drives `<validation_checklist>` greps.

## 3. Identify Contradictions

Look for conflicts between sources per the catalog in [references/entry-templates.md](references/entry-templates.md#step-3--contradiction-conflict-sources--cn-template). Emit one `C[N]` entry per contradiction per the C[N] template in the same reference. Apply `<safety_boundaries>` redaction to each quoted source line **before** writing it into the entry.

## 4. Identify Ambiguities

Scan for vague statements per the examples in [references/entry-templates.md](references/entry-templates.md#step-4--vague-statement-examples--an-template). Emit one `A[N]` entry per ambiguity per the A[N] template in the same reference.

## 5. Prepare Prioritized Questions

Organize questions by priority (Critical / Important / Optional) using the template in [references/entry-templates.md](references/entry-templates.md#step-5--prioritized-questions-template). Question-count semantics (cap denominator vs Executive Summary total) live in `<output_format>` — `<validation_checklist>` and `<success_criteria>` reference that single definition.

</process>

<output_format>

Create `agents/qa/{IDENTIFIER}/analysis.md`:

```markdown
# QA Analysis - [IDENTIFIER]

**Analyzed**: [DateTime]
**Phase**: 3 - Gap & Requirements Clarification

---

## Executive Summary

- **Gaps Found**: [Count]
- **Contradictions Found**: [Count]
- **Ambiguities Found**: [Count]
- **Questions Asked**: [Count — Critical + Important + Optional combined]
- **Answers Received**: [Count]
- **Open Assumptions**: [Count]

---

## Cross-Reference Results
[From Step 1]

## Gaps
[From Step 2]

## Contradictions
[From Step 3]

## Ambiguities
[From Step 4]

## Questions & Answers
[From Step 5, including user responses]

## Assumptions Made
[List assumptions where user didn't know the answer]

## Resolved Items
[Items clarified through user answers]
```

**Question-count semantics** (canonical definition — other sections reference, do not restate):

- **`Questions Asked` (Executive Summary)** = Critical + Important + Optional combined.
- **Per-batch cap** (`<validation_checklist>`) = Critical + Important only; Optional questions do **not** count toward the cap. The two numbers are expected to differ by the Optional count.

</output_format>

<success_criteria>

Complete when **all of** the following hold:

- **Every test step** has been cross-referenced against the API spec per step 1 (one Cross-Reference entry per step).
- **Every gap / contradiction / ambiguity identified** is documented using the exact `G[N]` / `C[N]` / `A[N]` templates from [references/entry-templates.md](references/entry-templates.md) — no shortcut paraphrase.
- **All Critical questions from step 5 resolved.** Resolution = explicit answer (recorded under Questions & Answers / Resolved Items) OR `Assumptions Made` entry with chosen default + reason + impact-if-wrong OR `Deferred: <reason>` Assumption surfaced to the calling workflow. **No Critical question may remain `open`.**
- Important and Optional questions may remain `Status: Open — non-blocking`.
- `analysis.md` was written with every `<output_format>` section present; Executive Summary counts match the body (Question-count semantics per `<output_format>`).
- `<safety_boundaries>` redaction was applied to every verbatim quote.
- `<validation_checklist>` items all hold.

NOT complete if any Critical question is unresolved, any test step lacks a cross-reference entry, or any verbatim quote carries literal credentials/PII.

</success_criteria>

<safety_boundaries>

`analysis.md` is **PUBLIC by default** (tracked, shared review, downstream prompt contexts). Steps 3 and 4 instruct the agent to paste verbatim quotes from sources (test cases, Swagger spec, documentation pages) into Contradiction / Ambiguity entries — those sources can carry credentials / tokens / PII. **Redact before writing, not after.**

**Targets to redact** (replace with placeholders, never literal value):

- **Auth headers / tokens / API keys / passwords** embedded in source text — `Bearer <jwt>`, `Authorization: Basic <base64>`, `X-Api-Key: <key>`, password values in step descriptions. Replace with `<redacted: bearer token>` / `<redacted: api key>` / `<redacted: password>` + one-line inline note (e.g., `Source: Swagger /auth/login — Bearer token redacted; see env var API_TOKEN`).
- **Credentialed URLs** (`https://user:pass@host/...`, signed-URL query params) — redact the credential portion; record the redaction inline.
- **Connection strings / private keys / service-account JSONs** — never paste; describe source (env var, secret-manager path) + mechanism (Bearer / Basic / OAuth flow).
- **Real PII** in test data examples — customer names, real emails, real phone numbers, real account IDs, real payment card numbers. Replace with synthetic equivalents (`test.user-1@example.com`, `+1-555-0100` IETF reserved range, official PSP test card numbers).
- **Test-data fixtures captured from production logs** — redact sensitive fields; keep structural shape.

**Structural content is safe** — endpoint paths, HTTP methods, status codes, error message templates, field names, schema shapes, business-rule prose, vague-statement quotes. Redaction targets sensitive **values**, not structural content.

Consistent with `qa-data-collection`'s `<safety_boundaries>` for `raw-data.md`.

</safety_boundaries>

<failure_handling>

- **`raw-data.md` or `api-analysis.md` missing/empty** at the expected paths: stop, report the missing path, ask the user to rerun the corresponding upstream phase (Phase 1 / Phase 2). Do NOT invent endpoints or test steps.
- **`api-analysis.md` exists but contains zero endpoints** (structurally empty): treat as a **blocking gap**. Emit one `G[N]` entry of type **Endpoint** with `Missing Information: api-analysis.md has zero endpoints — cross-reference impossible without source-of-truth endpoint inventory` + `Impact: blocks test specification entirely`. Stop step 1, surface as a Critical question (`Should Phase 2 re-run with a different spec source, or proceed with manual endpoint discovery?`). Do NOT emit a vacuous Cross-Reference Results section.
- **`raw-data.md` or `api-analysis.md` unreadable / corrupt** (parse error, permission denied): stop, report the IO/parse error with the file path, ask the user to inspect.
- **Test case has zero test steps**: stop, surface as a Critical question (`Test case provides no steps to cross-reference — please supply the step sequence or confirm the test is intentionally exploratory`). Do NOT emit an empty Cross-Reference Results section.
- **User does not respond to Critical question prompts** after one re-ask: apply `<success_criteria>` Deferred-Assumption rule — record assumption + impact-if-wrong + `Deferred: no user response after re-ask` and surface to the calling workflow. Do NOT proceed silently.

</failure_handling>

<validation_checklist>

**Grep-proof layer only.** Rules live in `<success_criteria>` + `<output_format>`; items below verify those contracts by grep before emit. Items unique to this checklist carry no pointer.

- **Cross-Reference grep:** `### Cross-Reference: Test Case Step [N]` entry count in `## Cross-Reference Results` = total test step count. *(verifies `<success_criteria>` cross-reference rule)*
- **Executive Summary counts grep:** `Gaps Found` = `G[N]` count; `Contradictions Found` = `C[N]` count; `Ambiguities Found` = `A[N]` count; `Questions Asked` = the Executive-Summary denominator defined in `<output_format>`. If counts disagree, fix the count or the body. *(verifies `<success_criteria>` counts-match-body rule)*
- **Assumption-fields grep:** every `A-N` entry has Default + Impact-if-Wrong populated. *(verifies `<success_criteria>` Assumption rule)*
- **Safety re-scan grep** per `<safety_boundaries>` Targets list; hits replaced + noted inline; no-match = no annotation. *(verifies `<success_criteria>` redaction-applied rule)*
- **No fabricated quotes** in Contradiction / Ambiguity entries — every `"[Quote]"` traces verbatim to a real source line; re-grep for paraphrased "the source said X" forms and fail emit on any match. *(unique to checklist)*
- **Question count ≤ 20 per batch** — denominator per `<output_format>` Question-count semantics (Critical + Important only). If more than 20 surfaced, batch by priority; record current batch + deferred batches. *(unique to checklist)*

</validation_checklist>

<pitfalls>
(Each item is a pointer; the rule lives in the cited section.)
- Not cross-referencing every test step → `<process>` step 1.
- Asking >20 questions at once → `<validation_checklist>` per-batch cap (denominator per `<output_format>`).
- Proceeding to test specification with unresolved Critical gaps → `<success_criteria>` Critical-resolution rule.
- Assuming answers when user doesn't respond → `<failure_handling>` Deferred-Assumption rule.
- Ignoring contradictions between documentation sources → `<process>` step 3 catalog.
- Verbatim quotes without `<safety_boundaries>` redaction (redact BEFORE writing).
- Executive Summary counts disagree with body → `<validation_checklist>` counts grep.
</pitfalls>

</qa-gap-analysis>
