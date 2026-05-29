---
name: api-test-spec-authoring
description: Generate detailed Given-When-Then API test specifications with scenario taxonomy, file mapping, and shared utility identification.
tags: ["api-qa"]
baseSchema: docs/schemas/skill.md
---

<api-test-spec-authoring>

<role>API test specification author and scenario designer</role>

<when_to_use_skill>
Convert test cases into detailed, implementation-ready API test specifications using Given-When-Then format with exact request details, expected responses, and explicit assertions. This is a general-purpose authoring capability — the calling workflow determines input/output file paths.
</when_to_use_skill>

<prerequisites>
- Raw test case data available (original test cases and patterns)
- API endpoint contracts available (request/response schemas, auth, status codes)
- Gap analysis and user clarifications completed
</prerequisites>

<process>

## 1. Load All Inputs

Read all input documents provided by the calling workflow:
1. Raw test cases and existing patterns
2. Endpoint contracts (from API analysis)
3. Clarifications and resolved gaps

## 2. Define Test Scenarios per Test Case

For each test case, generate 1-N test scenarios covering:

**Happy Path (P0)**:
- Valid request with all required fields -> expected success response
- Valid request with all optional fields -> expected success response

**Validation / Negative Cases (P1)**:
- Missing required fields -> expected 400/422 error
- Invalid field types -> expected 400/422 error
- Invalid field values (out of range, wrong format) -> expected 400/422 error
- Empty request body when body required -> expected 400 error

**Auth Cases (P1)**:
- No auth token -> expected 401
- Invalid/expired token -> expected 401
- Insufficient permissions -> expected 403 (if applicable)

**Resource Cases (P1-P2)**:
- Resource not found -> expected 404
- Duplicate creation (if applicable) -> expected 409
- Concurrent modification (if applicable) -> expected 409/412

**Edge Cases (P2-P3)**:
- Boundary values (min/max length, min/max numeric)
- Special characters in string fields
- Unicode/internationalization
- Empty strings vs null vs missing
- Large payloads (near limits)

## 3. Write Detailed Test Specifications

Format: Given-When-Then for each test scenario.

```markdown
### ATC-[NNN]: [Test Case Title]

**Source**: [Original test case reference — TC-1234 / PROJ-123 / Manual]
**Priority**: P0 / P1 / P2 / P3
**Type**: Happy Path / Negative / Auth / Edge Case / Error Handling
**Endpoint**: [METHOD] [PATH]

**Given**:
  - [Precondition 1 — e.g., "User exists with ID 42"]
  - [Auth state — e.g., "Valid Bearer token for admin user"]
  - [Test data setup — e.g., "Product with ID 1 exists in database"]

**When**:
  - Send [METHOD] request to [PATH]
  - Headers:
    ```json
    {
      "Authorization": "Bearer {valid_token}",
      "Content-Type": "application/json"
    }
    ```
  - Query Parameters: [key=value pairs or N/A]
  - Request Body:
    ```json
    {
      "field1": "exact test value",
      "field2": 42
    }
    ```

**Then**:
  - Status Code: [Expected status code]
  - Response Body:
    ```json
    {
      "id": "[non-null integer]",
      "field1": "exact test value"
    }
    ```
  - Assertions:
    - Status code equals [code]
    - Response body contains field "id" of type integer
    - Response body field "field1" equals "exact test value"

**Test Data**:
  - Input: [Exact values to send]
  - Expected Output: [Exact values to assert]
  - Precondition Data: [Entities that must exist — how to create them]
  - Cleanup: [What to delete after test]

**Dependencies**:
  - Auth: [Token acquisition method]
  - Fixtures: [Data files or factory methods needed]
  - Setup: [API calls to make before this test]
  - Teardown: [API calls to make after this test]
```

## 4. Determine Test File Mapping

Map test scenarios to test files following project conventions:

```markdown
## Test File Mapping

| Test File | Scenarios | Count |
|-----------|-----------|-------|
| [tests/api/users.test.ts] | ATC-001 to ATC-010 | 10 |
| [tests/api/auth.test.ts] | ATC-011 to ATC-015 | 5 |
```

## 5. Define Shared Test Utilities

Identify reusable elements across test scenarios:

```markdown
## Shared Utilities Required

### Auth Helper
- Purpose: Acquire and cache auth tokens for test users
- Input: User credentials or role
- Output: Valid Bearer token
- Reused by: [List test scenario IDs]

### Test Data Factory
- Purpose: Create test entities via API
- Methods: createUser(overrides), createProduct(overrides), etc.
- Reused by: [List test scenario IDs]

### Response Validators
- Purpose: Common response structure validation
- Methods: validateErrorResponse(), validatePaginatedResponse()
- Reused by: [List test scenario IDs]
```

## 6. Determine Execution Order

1. Auth tests — verify auth mechanism works
2. CRUD happy paths — verify basic operations
3. Validation/negative — verify input handling
4. Edge cases — verify boundary behavior

</process>

<pitfalls>
- Using placeholder values like "valid data" instead of exact test values
- Not covering auth scenarios (401, 403) for protected endpoints
- Skipping negative/validation test cases — they catch most real bugs
- Not specifying exact assertion values — leads to vague tests
- Generating too many scenarios (>50) without prioritization — scope creep
- Missing precondition data setup requirements — leads to 404 failures
</pitfalls>

</api-test-spec-authoring>
