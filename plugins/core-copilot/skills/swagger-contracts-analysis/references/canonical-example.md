# Canonical Example — Endpoint Contract

A complete worked example of one contract entry produced by `swagger-contracts-analysis`. Load this reference when authoring the first entry of a new project, or when the inline template in `SKILL.md` `<output_format>` leaves field-shape questions ambiguous.

This is **one example, not the schema** — the authoritative shape is the per-endpoint template in `SKILL.md` `<output_format>`. The example demonstrates how a populated entry looks when both Swagger and code were consulted (the `Source: hybrid` path) and a real spec-vs-code discrepancy was found (Notes section).

---

````markdown
## Endpoint Contract: GET /api/v1/orders/{orderId}

**Source:** hybrid
**Summary:** Retrieve a single order by ID for the authenticated user.
**Tags / Groups:** Orders

### Parameters

**Path parameters:**
| Name    | Type   | Required | Constraints                     |
|---------|--------|----------|---------------------------------|
| orderId | string | yes      | UUID v4; pattern `[0-9a-f-]{36}` |

**Query parameters:** None

**Header parameters:**
| Name          | Type   | Required | Constraints                |
|---------------|--------|----------|----------------------------|
| Authorization | string | yes      | `Bearer <jwt>`             |
| Accept        | string | no       | defaults to `application/json` |

### Request Body

**Content-Type:** N/A — no body

### Responses

| Status | Content-Type                  | Schema      | Example                                                                 |
|--------|-------------------------------|-------------|-------------------------------------------------------------------------|
| 200    | application/json              | `Order`     | `{"id":"o-123","status":"PAID","customer_id":"c-1","total":42.00}`     |
| 401    | application/problem+json      | `AuthError` | `{"type":"unauthorized","title":"Missing or invalid token"}`            |
| 403    | application/problem+json      | `AuthError` | `{"type":"forbidden","title":"Order belongs to another customer"}`     |
| 404    | application/problem+json      | `NotFound`  | `{"type":"not_found","title":"Order o-123 does not exist"}`            |

### Auth

- **Mechanism:** Bearer JWT
- **Required scopes / permissions:** `orders:read`
- **Public endpoint:** no

### Data Dependencies

- **Preconditions:** Order with `orderId` exists in `orders` table; `orders.customer_id` matches the authenticated user's `customer_id` (otherwise 403).
- **Side effects:** None — GET is read-only.
- **Idempotent:** yes (GET semantics).

### Source Citations

- Swagger: `paths./api/v1/orders/{orderId}.get`
- Code: `src/controllers/orders.controller.ts:42` (handler), `src/dto/order.dto.ts` (response model)

### Notes / Discrepancies

Code rejects `orderId` shorter than 36 chars with a 400 before reaching the handler; Swagger declares only the 200/401/403/404 responses. Treat 400 as undocumented-but-real.
````

---

**Why this example is non-trivial:**

- `Source: hybrid` shows both Swagger and code were consulted.
- Path-parameter constraint includes a regex pattern that's typically only in the code, not the Swagger summary — demonstrates code-as-supplement.
- Response table covers all four status codes the endpoint emits, not just the happy path.
- Data Dependencies explains the 403 path (`customer_id` mismatch) — a behavior that lives in handler code, not in the Swagger spec.
- Source Citations name the exact JSONPath into the Swagger doc AND the file:line of the handler — both kinds of trace.
- Notes / Discrepancies records a real spec-vs-code gap (an undocumented 400 status) instead of an empty `None.` — demonstrates the reconciliation step's purpose.
