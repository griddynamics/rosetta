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

Complete when: every test step has a Cross-Reference entry (step 1); every G/C/A finding uses the verbatim template (`references/entry-templates.md`); all Critical questions resolved (explicit answer OR `Assumptions Made` entry with default + reason + impact OR `Deferred: <reason>` surfaced — no Critical may remain open); Important/Optional may remain `Status: Open — non-blocking`; every `<output_format>` section present; Executive Summary counts match body per `<output_format>` Question-count semantics; `<safety_boundaries>` redaction applied; `<validation_checklist>` greps pass.

NOT complete if any Critical is unresolved, any test step lacks a Cross-Reference entry, or any verbatim quote carries literal credentials/PII.

</success_criteria>

<safety_boundaries>

`analysis.md` is **PUBLIC by default** (tracked, shared review, downstream prompt contexts). Steps 3 + 4 paste verbatim source quotes that may carry credentials / tokens / PII. **Redact before writing, not after.**

**Target categories** (5 buckets — per-category examples + placeholder vocabulary in [references/entry-templates.md "Redaction examples"](references/entry-templates.md#redaction-examples-referenced-from-skillmd-safety_boundaries), loaded at steps 3 + 4):

1. Auth headers / tokens / API keys / passwords
2. Credentialed URLs (user:pass@ form, signed URLs)
3. Connection strings / private keys / service-account JSONs
4. Real PII (customer names / emails / phones / account IDs / payment cards)
5. Test-data fixtures captured from production logs

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

**Grep-proof layer only** — rules live in `<success_criteria>` + `<output_format>` + `<safety_boundaries>`; items below are per-case grep checks. No rule is restated here.

- **Cross-Reference count grep:** `### Cross-Reference` entry count = total test step count.
- **Summary counts grep:** `Gaps Found` = `G[N]` count; `Contradictions Found` = `C[N]` count; `Ambiguities Found` = `A[N]` count; `Questions Asked` per `<output_format>` Question-count semantics.
- **Assumption-fields grep:** every `A-N` entry has Default + Impact-if-Wrong.
- **Safety re-scan grep** per `<safety_boundaries>` 5 target categories.
- **No fabricated quotes** — every `"[Quote]"` traces verbatim to a real source; "the source said X" paraphrase forms fail the grep.
- **Per-batch question cap (≤ 20)** — denominator per `<output_format>` Question-count semantics (Critical + Important only). Above 20 → batch by priority, record current + deferred batches.

</validation_checklist>

<pitfalls>

Only **genuinely additive** failure modes (rules already enforced by `<process>` / `<success_criteria>` / `<validation_checklist>` / `<safety_boundaries>` are NOT restated here):

- **Paraphrasing source text instead of quoting verbatim** in Contradiction / Ambiguity entries — `<validation_checklist>` greps for `"[Quote]"` shape but cannot catch "the source said X" forms beyond the no-fabricated-quote rule. Quote verbatim or use `gap: source phrasing unclear — paraphrase recorded`; never silently paraphrase.
- **Conflating cross-source contradiction with intra-source ambiguity** — a single Swagger field with vague description is `A[N]`, NOT `C[N]`. Two sources that genuinely disagree are `C[N]`. Mis-classification skips the wrong-category template's required fields.

</pitfalls>

</qa-gap-analysis>
