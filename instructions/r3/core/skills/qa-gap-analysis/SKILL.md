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

## 1. Cross-Reference Test Cases vs API Spec

For each test step from the test case, verify against API analysis:

| Check | Question | Impact |
|-------|----------|--------|
| Endpoint exists | Does the endpoint in test case match a real API endpoint? | Blocking if mismatch |
| Method matches | Does the HTTP method match? | Blocking if wrong |
| Request schema | Are test case inputs valid per request schema? | May cause false failures |
| Response schema | Are expected results compatible with response schema? | Wrong assertions |
| Status codes | Are expected status codes correct for each scenario? | Wrong assertions |
| Auth coverage | Does test case cover auth scenarios appropriately? | Missing test coverage |
| Error handling | Does test case cover error responses? | Incomplete coverage |

Document findings:
```markdown
### Cross-Reference: Test Case Step [N] vs API Spec

**Test Step**: [Description from test case]
**API Endpoint**: [METHOD] [PATH]
**Match Status**: [Full match / Partial / Mismatch / Not in spec]
**Gaps**: [List any gaps found]
```

## 2. Identify Gaps

Gap categories for API testing:

### Missing Endpoint Details
- Endpoint path not documented or ambiguous
- HTTP method not specified
- API version unclear
- Base URL unknown

### Missing Request Details
- Required request body fields unknown
- Field types/formats not specified
- Validation rules not documented (min/max, patterns, enums)
- Content-Type not specified
- Required headers not listed

### Missing Response Details
- Expected status codes not defined for all scenarios
- Response body schema not documented
- Error response format unknown
- Response headers not specified

### Missing Auth Details
- Auth mechanism not specified for endpoint
- Test credentials not provided
- Token acquisition flow unclear
- Required permissions/roles unknown

### Missing Test Data Details
- Test data values not specified (what to send)
- Expected response values not specified (what to assert)
- Precondition data not defined (what must exist before test)
- Cleanup requirements not defined

### Missing Edge Cases
- Empty/null required fields behavior
- Values exceeding limits behavior
- Invalid data types behavior
- Duplicate entries behavior
- Concurrent request behavior
- Rate limiting behavior

Document each gap:
```markdown
### G[N]: [Brief Title]
**Type**: Endpoint / Request / Response / Auth / Test Data / Edge Case
**Context**: [Which test step or endpoint this relates to]
**Missing Information**: [What is not specified]
**Impact**: [Why automation is blocked or degraded without this]
**Suggested Question**: [How to ask for this information]
```

## 3. Identify Contradictions

Look for conflicts between:
- Test case expected results vs API spec response schemas
- Test case preconditions vs actual data requirements
- Documentation descriptions vs Swagger definitions
- Different documentation pages giving different information
- Test case HTTP methods vs endpoint definitions

Document each:
```markdown
### C[N]: [Brief Title]
**Source 1**: [Test Case / Swagger / Docs] — "[Quote]"
**Source 2**: [Test Case / Swagger / Docs] — "[Quote]"
**Impact**: [Why this matters for test automation]
**Needs Clarification**: [Specific question]
```

## 4. Identify Ambiguities

Look for vague statements in test cases:
- "Verify the response is correct" (correct how?)
- "Check that the data is saved" (which fields? in which table/store?)
- "Validate error handling" (which errors? what format?)
- "Test with valid data" (what specific values?)
- "Ensure proper authentication" (which auth method? which role?)

Document each:
```markdown
### A[N]: [Brief Title]
**Source**: [Test Case / Docs / Swagger]
**Vague Statement**: "[Quote]"
**Possible Interpretations**:
  1. [Interpretation 1]
  2. [Interpretation 2]
**Clarification Needed**: [Specific question]
```

## 5. Prepare Prioritized Questions

Organize questions by priority:

```markdown
## Critical Questions (Must Answer — blocks test creation)

1. [Question about missing endpoint/request/response details]
   - Why: [Impact on test automation]
   - Default if unknown: [Safe assumption or N/A]

## Important Questions (Should Answer — affects test quality)

2. [Question about edge cases or error scenarios]
   - Why: [Impact on test coverage]
   - Default if unknown: [Safe assumption or N/A]

## Optional Questions (Nice to Have — improves completeness)

3. [Question about non-critical scenarios]
   - Why: [Impact on test comprehensiveness]
   - Default if unknown: [Safe assumption or N/A]
```

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
- **Questions Asked**: [Count — Critical + Important + Optional combined; differs from the `<validation_checklist>` batch-cap denominator which is Critical+Important only]
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

</output_format>

<success_criteria>

The skill is complete when **all of** the following hold:

- **Every test step** from the test case has been cross-referenced against the API spec per step 1 (one Cross-Reference entry per step in `analysis.md`).
- **Every gap / contradiction / ambiguity identified** is documented in `analysis.md` using the exact template format from steps 2–4 (G[N] / C[N] / A[N] entries — no shortcut paraphrase).
- **All Critical questions from step 5 have been resolved.** Resolution is one of:
  - User answered explicitly → recorded under `## Questions & Answers` / `## Resolved Items`.
  - User did not know → recorded under `## Assumptions Made` with the chosen default, the reason, and the impact-if-wrong (per `<pitfalls>` "Assuming answers ... document as assumption" rule).
  - User deferred → still recorded under Assumptions with `Deferred: <reason>` and surfaced to the calling workflow so downstream phases see the gap.
  - **No Critical question may remain in an "open" state** — that's the failure mode `<pitfalls>` "Proceeding to test specification with unresolved critical gaps" guards against.
- Important and Optional questions may remain open (recorded in `## Questions & Answers` with `Status: Open — non-blocking`) without preventing completion.
- `analysis.md` was written with every `<output_format>` section present and the Executive Summary counts match the body.
- `<safety_boundaries>` redaction was applied to every verbatim quote written into `analysis.md`.
- `<validation_checklist>` items all hold.

The skill is **NOT complete** if any Critical question is unresolved, any test step lacks a cross-reference entry, or any verbatim quote in `analysis.md` carries a literal credential/PII without redaction.

</success_criteria>

<safety_boundaries>

`analysis.md` is a tracked artifact and may end up in version control, shared review, or downstream prompt contexts. Treat it as **PUBLIC by default**. Steps 3 and 4 instruct the agent to paste verbatim quotes from sources (test cases, Swagger spec, documentation pages) into Contradiction / Ambiguity entries — those sources can carry credentials / tokens / PII. Redact before writing, not after.

**Targets to redact** (replace with placeholders, never literal value):

- **Auth headers / tokens / API keys / passwords** embedded in source text — `Bearer <jwt>`, `Authorization: Basic <base64>`, `X-Api-Key: <key>`, password values pasted in step descriptions. Replace with `<redacted: bearer token>` / `<redacted: api key>` / `<redacted: password>` and add a one-line note in the entry (e.g., `Source: Swagger /auth/login — Bearer token redacted; see env var API_TOKEN`).
- **Credentialed URLs** (`https://user:pass@host/...`, signed-URL query params) — redact the credential portion. Record the redaction inline.
- **Connection strings / private keys / service-account JSONs** — never paste; describe the source (env var, secret-manager path) and mechanism (Bearer / Basic / OAuth flow) instead.
- **Real PII** in test data examples — customer names, real emails, real phone numbers, real account IDs, real payment card numbers. Replace with synthetic equivalents (`test.user-1@example.com`, `+1-555-0100` from the IETF reserved range, official PSP test card numbers if a card is needed).
- **Test-data fixtures** captured from production logs — redact the sensitive fields; keep structural shape.

**Structural content is safe.** Endpoint paths, HTTP methods, status codes, error message templates, field names, schema shapes, business-rule prose, vague-statement quotes from test cases — recorded verbatim. Redaction targets sensitive **values**, not the structural content of the gap/contradiction/ambiguity description.

This boundary is consistent with `qa-data-collection`'s `<safety_boundaries>` for `raw-data.md` — both artifacts live in `agents/qa/{IDENTIFIER}/` and feed the same downstream chain.

</safety_boundaries>

<failure_handling>

- **`raw-data.md` missing or empty** at `agents/qa/{IDENTIFIER}/raw-data.md`: stop, report `qa-gap-analysis: raw-data.md missing/empty at <path>` to the calling workflow, ask the user to rerun Phase 1 (data collection). Do NOT proceed — step 1's cross-reference has nothing to read from.
- **`api-analysis.md` missing or empty** at `agents/qa/{IDENTIFIER}/api-analysis.md`: stop, report `qa-gap-analysis: api-analysis.md missing/empty at <path>`, ask the user to rerun Phase 2 (API spec analysis). Do NOT invent endpoints to fill the cross-reference table — that's the exact fabrication mode this skill is built to surface.
- **`api-analysis.md` exists but contains zero endpoints** (the artifact was produced but is structurally empty — Phase 2 found no endpoints to record): treat as a **blocking gap**. Record one `G[N]` entry in `analysis.md` of type **Endpoint** with `Missing Information: api-analysis.md has zero endpoints — cross-reference impossible without source-of-truth endpoint inventory` and `Impact: blocks test specification entirely`. Stop step 1, surface as a Critical question to the user (`Should Phase 2 re-run with a different spec source, or proceed with manual endpoint discovery?`), do NOT emit a vacuous Cross-Reference Results section with no entries.
- **`raw-data.md` or `api-analysis.md` unreadable / corrupt** (parse error, permission denied): stop, report the IO/parse error with the file path, ask the user to inspect.
- **Test case has zero test steps to cross-reference** (raw-data.md captures a test case description but the steps section is empty): stop, surface as a Critical question (`Test case provides no steps to cross-reference — please supply the step sequence or confirm the test is intentionally exploratory`). Do not emit an empty Cross-Reference Results section.
- **User does not respond to Critical question prompts** after one re-ask: apply `<success_criteria>` Assumption-with-Deferred-tag rule — record the Critical question's assumption + impact-if-wrong + `Deferred: no user response after re-ask` and surface to the calling workflow so downstream phases see the gap. Do NOT proceed silently.

</failure_handling>

<validation_checklist>

**Grep-proof layer only.** The rules (contracts) live in `<success_criteria>`; items below verify those contracts by grep before emit. Items unique to this checklist (no `<success_criteria>` counterpart) carry no pointer.

- **Cross-Reference grep:** `### Cross-Reference: Test Case Step [N]` entry count in `## Cross-Reference Results` = total test step count from step 1. *(verifies `<success_criteria>` cross-reference rule)*
- **Executive Summary counts grep:** `Gaps Found` = `G[N]` count; `Contradictions Found` = `C[N]` count; `Ambiguities Found` = `A[N]` count; `Questions Asked` = Critical+Important+Optional combined. If counts disagree, fix the count or the body. *(verifies `<success_criteria>` counts-match-body rule)*
- **Assumption-fields grep:** every `A-N` entry has Default + Impact-if-Wrong populated. *(verifies `<success_criteria>` Assumption rule)*
- **Safety re-scan grep** per `<safety_boundaries>` Targets list; hits replaced + noted inline; no-match = no annotation. *(verifies `<success_criteria>` redaction-applied rule)*
- **No fabricated quotes** in Contradiction / Ambiguity entries — every `"[Quote]"` traces verbatim to a real source line; re-grep for paraphrased "the source said X" forms and fail emit on any match. *(unique to checklist — no `<success_criteria>` counterpart)*
- **Question count ≤ 20 per batch** (pitfall 2) — **denominator: Critical + Important only**; Optional questions do **not** count toward this cap. If more than 20 Critical+Important questions surfaced, they are batched; the artifact records the current batch and the deferred batches. **Deliberate scope difference vs the Executive Summary's `Questions Asked` total** (which includes Optional) — the two numbers are expected to differ by the Optional count. *(unique to checklist — no `<success_criteria>` counterpart)*

</validation_checklist>

<pitfalls>
- Not cross-referencing every test step against API spec — leads to missed gaps
- Asking too many questions at once (>20) — batch by priority and group related gaps
- Proceeding to test specification with unresolved critical gaps
- Assuming answers when user doesn't respond — document as assumption instead
- Ignoring contradictions between documentation sources
- Pasting verbatim quotes without applying `<safety_boundaries>` redaction (the target list + grep patterns live there) — redact BEFORE writing into `analysis.md`, not after
- Emitting `analysis.md` with Executive Summary counts that disagree with the body — re-check counts in step 5 before declaring complete
</pitfalls>

</qa-gap-analysis>
