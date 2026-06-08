# GWT Spec — Scenario Taxonomy + Templates

Loaded on demand by the `<gwt_spec>` mode of `scenarios-generation/SKILL.md`:

- **Step 2** loads the scenario-taxonomy catalog when designing coverage.
- **Step 3** loads the **ATC template** when writing each Given-When-Then entry.
- **Step 4** loads the **Shared Utilities template** when identifying reusable elements.

Redaction is NOT restated here — apply `sensitive-data` per SKILL `<core_concepts>` to every value written. The SKILL keeps the GATE, per-value honesty rule, coverage rule, and validation; this file holds the heavier taxonomy + template material so the resident prompt stays lean.

---

## Scenario Taxonomy Catalog — used by SKILL step 2

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

**Execution order** (emit in step 4): auth tests → CRUD happy paths → validation/negative → edge cases. Establish auth works before everything else; verify boundaries last.

**Scenario-count guardrail:** if total scenarios exceed ~50, do NOT auto-prune — ask the calling phase whether to deprioritize P2/P3, split the spec across files, or accept the volume. Scope is the phase's decision.

---

## ATC Template (Given-When-Then) — used by SKILL step 3

One entry per scenario, written into the phase's spec artifact.

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

**Assumptions** (REQUIRED when any value was not derivable from contracts/clarifications):
  - `[ASSUMED: <field_name> = <value>]` — <one-line reason, e.g., "contract did not specify min length; assumed 8 per common convention">
  - (If none: write `None — all values derived from endpoint contracts and clarifications.`)
```

---

## Shared Utilities Template — used by SKILL step 4

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
