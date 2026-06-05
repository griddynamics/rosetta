# Templates + Redaction Catalog — api-test-spec-authoring

Loaded on demand from `SKILL.md`:

- **Step 3** loads this file to consult the **ATC template** when writing each Given-When-Then entry.
- **Step 5** loads this file to consult the **Shared Utilities template** when defining reusable elements.
- **`<safety_boundaries>`** points here for the full **redaction targets + placeholder catalog**.

The base `SKILL.md` keeps the process orchestration, GATEs, failure handling, validation checklist, pitfalls, and the per-value honesty rule. The heavier template material and the redaction catalog live here so the resident-prompt cost in `SKILL.md` shrinks while the contracts remain available when authoring.

---

## ATC Template (Given-When-Then) — used by SKILL step 3

Format: one entry per test scenario, written into the test-specs artifact.

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
  - `[ASSUMED: <field_name> = <value>]` — <reason>
  - (If none: write `None — all values derived from endpoint contracts and clarifications.`)
```

---

## Shared Utilities Template — used by SKILL step 5

Written into the test-specs artifact's `## Shared Utilities Required` section.

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

## Redaction Targets + Placeholder Catalog — used by SKILL `<safety_boundaries>`

`test-specs.md` (or whichever path the calling workflow provides) is a tracked artifact that may end up in version control, shared with reviewers, or fed to downstream phases. Treat it as **PUBLIC by default**.

### Auth credentials in spec examples

MUST use placeholder syntax, not real values.

- **Acceptable placeholders:** `{valid_token}`, `{admin_token}`, `{api_key}`, `<bearer-token-for-test-user>`, `<oauth-client-secret>`, `<refresh-token>`.
- **Forbidden:** pasting an actual JWT, real OAuth client secret, real API key, real password, real session cookie, or any production-environment token — regardless of whether it's "expired" or "test-only".

### Test user identities

MUST be synthetic.

- **Emails:** use IETF reserved domains — `test-user-1@example.com`, `qa.smoketest@example.com`.
- **Names:** obviously-fake placeholders (`Test User`, `John Doe — synthetic`).
- **Phone numbers:** IETF reserved range `+1-555-0100` through `+1-555-0199`.
- **Account IDs / customer IDs:** obviously-fake (`acct-test-001`, not real production IDs).
- **Payment card numbers:** official Stripe/PSP test card numbers if a card is needed — document the source in the entry (e.g., `4242 4242 4242 4242 — Stripe test card`). Never use a real card number, even your own.

### Internal credentialed URLs

`https://user:pass@internal.example.com/...` must be redacted to `https://<redacted: credentialed URL>` with the credential location described in prose (env var name, secret-manager path, etc.).

### Connection strings / signed URLs / service-account JSONs / private keys

Never embed in the spec. If a test scenario needs one, describe the **source** (env var name, secret-manager path) and the **mechanism** (Bearer, Basic, OAuth client-credentials flow) — never the literal value.

Examples:

- ❌ `DATABASE_URL=postgres://user:realpw@prod-db.example.com/orders`
- ✅ `DB connection string from env var DATABASE_URL — credential portion redacted; format: postgresql://user:pass@host/db`

### Pure functional content stays verbatim

Endpoint paths, HTTP methods, status codes, error message shapes, header names, schema field names, validation rules (min/max/pattern/enum), feature names are safe to record as-is. Redaction targets sensitive **values**, not the structural spec.

### If a real production value would be the natural example

Replace it with a clearly-fake placeholder of the same shape. Better an obviously-fake example than a leaked real one.
