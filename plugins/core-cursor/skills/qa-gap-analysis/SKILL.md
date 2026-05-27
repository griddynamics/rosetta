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

<pitfalls>
- Not cross-referencing every test step against API spec — leads to missed gaps
- Asking too many questions at once (>20) — batch by priority and group related gaps
- Proceeding to test specification with unresolved critical gaps
- Assuming answers when user doesn't respond — document as assumption instead
- Ignoring contradictions between documentation sources
</pitfalls>

</qa-gap-analysis>
