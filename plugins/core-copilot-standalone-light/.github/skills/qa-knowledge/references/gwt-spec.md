# GWT Spec

Heavier taxonomy + templates.

## Scenario Taxonomy Catalog -- used when designing scenario coverage

For each test case, generate 1-N scenarios across these categories (priority defaults in parentheses):

**Happy Path (P0)**
- Valid request with all required fields → expected success response
- Valid request with all optional fields → expected success response

**Validation / Negative (P1)**
- Missing required fields → 400/422
- Invalid field types → 400/422
- Invalid field values (out of range, wrong format) → 400/422
- Empty request body when body required → 400

**Auth (P1)**
- No auth token → 401
- Invalid / expired token → 401
- Insufficient permissions → 403 (if role-based access applies)

**Resource (P1-P2)**
- Resource not found → 404
- Duplicate creation (if applicable) → 409
- Concurrent modification (if applicable) → 409/412

**Edge / Boundary (P2-P3)**
- Boundary values (min/max length, min/max numeric)
- Special characters in string fields
- Unicode / internationalization
- Empty strings vs null vs missing
- Large payloads (near limits)

**Execution order** (emit when mapping scenarios to files + utilities): auth tests → CRUD happy paths → validation/negative → edge cases. Auth first, boundaries last.

**Scenario-count guardrail:** if total scenarios exceed ~50, do NOT auto-prune -- ask the calling phase whether to deprioritize P2/P3, split the spec across files, or accept the volume.

---

## Process (authoring a GWT spec)

1. **Validate inputs** -- raw test cases + endpoint contracts + resolved clarifications. Contracts missing/empty → stop (never fabricate request/response shapes). A case targeting an endpoint absent from the loaded contracts → flag `unmappable: <id>` and record it in `## Excluded Test Cases`; never invent the endpoint.
2. **Generate coverage** -- 1-N scenarios per case across the taxonomy above (priority defaults per bucket).
3. **Author** -- one ATC entry per scenario using the ATC template; apply per-value honesty to every value.
4. **Map + order** -- map scenarios to test files, identify shared utilities, order auth → CRUD happy → negative → edge.
5. **Coverage check** -- every input case is an ATC entry OR listed in `## Excluded Test Cases`; no silent drop.

## Decision rules -- apply while filling the ATC template

- **Partial endpoint contract** (some fields known, some absent): author the mappable parts; mark each unknown value `[ASSUMED: …]` (per-value honesty rule); if a *core* field stays unresolved, flag the case in `## Excluded Test Cases`.
- **Structurally incomplete ATC** -- a required *structural* field (`Endpoint`, `Type`, `Priority`) cannot be determined (e.g. the test case names no API path): write `gap: <field> — <reason>` in that field AND record the ATC in `## Excluded Test Cases` with the missing field listed. Never author it silently or fabricate the field.
- **Source field** (traceability): if no source reference is traceable, write `gap: no source reference — <reason>` -- never invent a TC / ticket number.
- **Duplicate test cases** (same endpoint + intent across the input list): emit ONE ATC, list the merged source ids in `**Source**` -- do not emit near-identical duplicates.
- **Inapplicable test type** for an endpoint (e.g. no Auth category on a public endpoint): omit that category and record the omission + reason in `## Excluded Test Cases` -- do not invent an auth scenario.

---

## ATC Template (Given-When-Then) -- used when authoring ATC entries

One entry per scenario, written into the phase's spec artifact.

```markdown
### ATC-[NNN]: [Test Case Title]

**Source**: [Original test case reference — TC-1234 / PROJ-123 / Manual]
**Priority**: P0 / P1 / P2 / P3
**Type**: Happy Path / Negative / Auth / Resource / Edge Case
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

**Assumptions** (REQUIRED when any value was not derivable from contracts/clarifications):
  - `[ASSUMED: <field_name> = <value>]` — <one-line reason, e.g., "contract did not specify min length; assumed 8 per common convention">
  - (If none: write `None — all values derived from endpoint contracts and clarifications.`)
```

---

## Shared Utilities Template -- used when identifying shared utilities

Written into the spec artifact's `## Shared Utilities Required` section.

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

---

## Worked ATC example (one entry, fully filled)

```markdown
### ATC-001: GET /api/v1/orders/{orderId} returns order when ID exists

**Source**: TC-42 (raw test cases), FR-7 (clarifications)
**Priority**: P0
**Type**: Happy Path
**Endpoint**: GET /api/v1/orders/{orderId}

**Given**:
  - Authenticated user with role `customer`
  - Order `o-12345` exists with status `PAID`, customer_id matches the authenticated user

**When**:
  - Send GET request to /api/v1/orders/o-12345
  - Headers: `Authorization: Bearer {valid_token}`, `Accept: application/json`
  - Query Parameters: N/A
  - Request Body: (none)

**Then**:
  - Status Code: 200
  - Assertions:
    - Status code equals 200
    - Response body matches schema `Order`
    - `body.id == "o-12345"`
    - `body.status == "PAID"`
    - `body.customer_id == <authenticated user id>`

**Test Data**:
  - Input: orderId = `o-12345`
  - Expected Output: order object with status `PAID`
  - Precondition Data: order `o-12345` created via test data factory
  - Cleanup: delete order `o-12345`

**Dependencies**:
  - Auth: token from Auth Helper for a `customer` user
  - Setup: create order `o-12345` before test
  - Teardown: delete order after test

**Assumptions**:
  - None — all values derived from endpoint contracts and clarifications.
```

---

## Worked examples -- Auth failure + Boundary (structural contrast vs Happy Path)

Auth failure -- `Given` = no token; `Then` = 401 with **no resource-body assertion**:

```markdown
### ATC-014: GET /api/v1/orders/{orderId} rejects an unauthenticated request
**Source**: TC-42 · **Priority**: P1 · **Type**: Auth · **Endpoint**: GET /api/v1/orders/{orderId}
**Given**: no `Authorization` header present
**When**: send GET /api/v1/orders/o-12345 with no auth header
**Then**: Status Code 401; assert error code `unauthorized`; **no resource body asserted**
**Assumptions**: None — 401 derived from the endpoint's auth contract.
```

Edge/Boundary -- value at the limit; `Then` asserts boundary handling, not a happy body:

```markdown
### ATC-022: GET /api/v1/orders/{orderId} handles a max-length order id
**Source**: TC-42 · **Priority**: P3 · **Type**: Edge Case · **Endpoint**: GET /api/v1/orders/{orderId}
**Given**: orderId at the documented max length
**When**: send GET with the max-length id
**Then**: Status Code 200 or 404 (valid-but-absent); assert no truncation error; assert id echoed unchanged
**Assumptions**: `[ASSUMED: max id length = 64 — contract did not specify]`
```
