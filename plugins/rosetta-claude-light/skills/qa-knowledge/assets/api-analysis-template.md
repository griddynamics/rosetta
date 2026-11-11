# API analysis template

QA api-analysis.md output skeletons: per-endpoint contract entry + Analysis Summary metrics block.

<api-analysis-template>

Skeletons for `plans/api-aqa-{IDENTIFIER}/api-analysis.md`. Phase defines sections. Asset = endpoint contracts + Analysis Summary metrics. Preserve verbatim: paths, methods, status codes, field/schema names, validation rules, citations, auth names. Redact sensitive **values** only, via `sensitive-data`.

## Per-endpoint contract entry

One entry per target endpoint, in this order; every subsection present with real values OR explicit `N/A -- <reason>` / `None`.

````markdown
## Endpoint Contract: <METHOD> <path>

**Source:** swagger | code | hybrid (both used)
**Summary:** [one-line from spec / docstring / N/A]
**Tags / Groups:** [functional grouping or N/A]

### Parameters
**Path parameters:**
| Name | Type | Required | Constraints |
|------|------|----------|-------------|
(or `None`) -- **Query parameters:** same shape or `None` -- **Header parameters:** same shape or `None`

### Request Body
**Content-Type:** [e.g. `application/json`, or `N/A -- no body`]
**Schema:** ```json { ... } ``` -- **Example:** ```json { ... } ```

### Responses
| Status | Content-Type | Schema | Example |
|--------|-------------|--------|---------|

### Auth
- **Mechanism:** [Bearer JWT / OAuth2 / API Key / Basic / Session-Cookie / None]
- **Required scopes / permissions:** [list or N/A] -- **Public endpoint:** [yes / no]

### Data Dependencies
- **Preconditions:** [required DB state, entity relationships, ordering]
- **Side effects:** [created / modified / deleted] -- **Idempotent:** [yes / no + rationale if non-obvious]

### Source Citations
- Swagger: [JSONPath, e.g. `paths./api/v1/orders/{orderId}.get`] or `N/A`
- Code: [file:line for handler + DTO/model] or `N/A`

### Notes / Discrepancies
[Spec-vs-code mismatches, deprecated markers, missing schemas, undocumented status codes. `Source: hybrid` entries MUST have a non-empty Notes: a recorded mismatch OR explicit `None.` confirming reconciliation ran. Also record each applied redaction here.]
````

**Worked entry** (`Source: hybrid` with a real discrepancy -- demonstrates code-as-supplement and a recorded gap):

````markdown
## Endpoint Contract: GET /api/v1/orders/{orderId}

**Source:** hybrid
**Summary:** Retrieve a single order by ID for the authenticated user.
**Tags / Groups:** Orders

### Parameters
**Path parameters:**
| Name | Type | Required | Constraints |
|------|------|----------|-------------|
| orderId | string | yes | UUID v4; pattern `[0-9a-f-]{36}` |

**Query parameters:** None -- **Header parameters:** `Authorization: Bearer <jwt>` (required); `Accept` defaults `application/json`

### Request Body
**Content-Type:** N/A -- no body

### Responses
| Status | Content-Type | Schema | Example |
|--------|--------------|--------|---------|
| 200 | application/json | `Order` | `{"id":"o-123","status":"PAID","customer_id":"c-1","total":42.00}` |
| 401 | application/problem+json | `AuthError` | `{"type":"unauthorized","title":"Missing or invalid token"}` |
| 403 | application/problem+json | `AuthError` | `{"type":"forbidden","title":"Order belongs to another customer"}` |
| 404 | application/problem+json | `NotFound` | `{"type":"not_found","title":"Order o-123 does not exist"}` |

### Auth
- **Mechanism:** Bearer JWT -- **Required scopes / permissions:** `orders:read` -- **Public endpoint:** no

### Data Dependencies
- **Preconditions:** order exists; `orders.customer_id` matches the caller (else 403).
- **Side effects:** None (read-only). -- **Idempotent:** yes (GET).

### Source Citations
- Swagger: `paths./api/v1/orders/{orderId}.get`
- Code: `src/controllers/orders.controller.ts:42` (handler), `src/dto/order.dto.ts` (response model)

### Notes / Discrepancies
Code rejects `orderId` shorter than 36 chars with a 400 before the handler; Swagger declares only 200/401/403/404. Treat 400 as undocumented-but-real.
````

## Analysis Summary metrics

```markdown
## Analysis Summary

- **Endpoints Analyzed**: [Count]
- **HTTP Methods**: GET: [N], POST: [N], PUT: [N], DELETE: [N], PATCH: [N]
- **Auth Required Endpoints**: [Count]
- **Public Endpoints**: [Count]
- **Request Schemas Extracted**: [Count]
- **Response Schemas Extracted**: [Count]
- **Data Dependencies Found**: [Count]
- **Spec Coverage**: [% of test case endpoints covered by spec]
```

</api-analysis-template>
