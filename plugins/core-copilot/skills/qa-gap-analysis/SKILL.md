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
- **Questions Asked**: [Count]
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

<validation_checklist>

Run before declaring the skill complete. All items must hold:

- **`analysis.md` written** at `agents/qa/{IDENTIFIER}/analysis.md` with every `<output_format>` section present (Executive Summary, Cross-Reference Results, Gaps, Contradictions, Ambiguities, Questions & Answers, Assumptions Made, Resolved Items). No section omitted; empty sections explicitly say `None — <reason>` rather than left blank.
- **Every test step from step 1 has a Cross-Reference entry** in the `## Cross-Reference Results` section — partial coverage of the test case is a regression (pitfall 1).
- **Executive Summary counts match the body** — `Gaps Found` count equals the number of `G[N]` entries; same for Contradictions (`C[N]`) and Ambiguities (`A[N]`). `Questions Asked` matches the number of Critical + Important + Optional entries combined. If counts disagree, fix the count or the body before emitting.
- **Every Critical question is resolved** per `<success_criteria>` — answered, recorded as Assumption with default + impact-if-wrong, or recorded as Deferred with reason. No "Open" / "Pending" status on a Critical question.
- **Every Assumption has Default + Impact-if-Wrong** — no Assumption entry with those fields blank; this is the contract the calling workflow consumes.
- **Safety re-scan ran per `<safety_boundaries>`** — `analysis.md` was grepped for credential-shaped patterns (`Bearer `, `Authorization:`, `password:`, `api_key=`, JWT shape, `BEGIN PRIVATE KEY`) and PII-shaped patterns before declaring complete; any hits were replaced with placeholders AND the redaction was noted inline.
- **No fabricated quotes** in Contradiction / Ambiguity entries — every `"[Quote]"` traces verbatim to a real source (with redaction where sensitive); paraphrased "the source said X" without the quote is not acceptable.
- **Question count ≤ 20 per batch** (pitfall 2). If more than 20 Critical+Important questions surfaced, they are batched into multiple rounds; the artifact records the current batch and the deferred batches.

</validation_checklist>

<pitfalls>
- Not cross-referencing every test step against API spec — leads to missed gaps
- Asking too many questions at once (>20) — batch by priority and group related gaps
- Proceeding to test specification with unresolved critical gaps
- Assuming answers when user doesn't respond — document as assumption instead
- Ignoring contradictions between documentation sources
- Pasting verbatim quotes from test cases / Swagger / docs without scanning for credentials / tokens / PII — apply `<safety_boundaries>` redaction BEFORE writing into `analysis.md`
- Emitting `analysis.md` with Executive Summary counts that disagree with the body — re-check counts in step 5 before declaring complete
</pitfalls>

</qa-gap-analysis>
