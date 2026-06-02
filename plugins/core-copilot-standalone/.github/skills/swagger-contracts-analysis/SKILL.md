---
name: swagger-contracts-analysis
description: Analyze Swagger/OpenAPI specs or codebase API definitions to extract endpoint contracts, auth requirements, and data dependencies.
tags: ["api-qa"]
baseSchema: docs/schemas/skill.md
---

<swagger-contracts-analysis>

<role>API specification analysis and endpoint contract extraction specialist</role>

<when_to_use_skill>
Extract detailed endpoint contracts (request/response schemas, status codes, auth, constraints) from Swagger/OpenAPI specs or codebase route definitions. This is a general-purpose analysis capability — the calling workflow determines which endpoints to analyze, where to read inputs from, and where to write outputs.
</when_to_use_skill>

<prerequisites>
- API spec URL or path, or codebase path with API route definitions
- List of target endpoints to analyze (provided by calling workflow)
</prerequisites>

<process>

## 1. Locate API Specification

Given a spec URL, spec file path, or backend source path, check in order:

1. **Swagger/OpenAPI spec** (if URL or file path provided):
   - Fetch or read the spec directly
2. **Swagger/OpenAPI in source code** (if source path provided):
   - Search within source path for: `swagger.json`, `swagger.yaml`, `openapi.json`, `openapi.yaml`, `api-docs`
   - Search for Swagger configuration in code (e.g., `@ApiOperation`, `@swagger`, Swashbuckle config, SpringDoc config)
3. **API route definitions in source code** (if source path provided):
   - Search for framework-specific patterns:
   - Express/Koa: `router.get()`, `router.post()`, `app.get()`, `app.post()`
   - Spring: `@GetMapping`, `@PostMapping`, `@RequestMapping`
   - FastAPI/Flask: `@app.get()`, `@app.post()`, route decorators
   - .NET: `[HttpGet]`, `[HttpPost]`, controller endpoints
4. **If none found**: Report back to the calling workflow; request user input for endpoint details

Decision point: Swagger available -> full spec analysis. No Swagger -> code-based analysis + user input.

## 2. Extract Endpoint Contracts

For each target endpoint, extract:

### From Swagger/OpenAPI Spec
- **Path**: Full endpoint path (e.g., `/api/v1/users/{id}`)
- **HTTP Method**: GET, POST, PUT, PATCH, DELETE
- **Summary/Description**: What the endpoint does
- **Parameters**:
  - Path parameters (name, type, required)
  - Query parameters (name, type, required, default)
  - Header parameters (name, type, required)
- **Request Body**:
  - Content type (application/json, multipart/form-data, etc.)
  - Schema (fields, types, required fields, constraints)
  - Example request body
- **Responses**:
  - Status codes (200, 201, 400, 401, 403, 404, 500, etc.)
  - Response schema per status code
  - Response headers
  - Example responses
- **Security**:
  - Auth schemes required (Bearer, OAuth2, API Key, etc.)
  - Required scopes/permissions
- **Tags/Groups**: Functional grouping

### From Code Analysis (if no Swagger)

- Parse controller/route files for endpoint definitions
- Extract request validation schemas (Joi, Zod, Pydantic, Bean Validation, etc.)
- Extract response DTOs/models
- Identify middleware (auth, validation, rate limiting)
- Check for API versioning patterns

## 3. Analyze Auth Requirements

For the API under test, determine:

1. **Auth mechanism**: Bearer token (JWT), OAuth2, API Key, Basic Auth, Session/Cookie, or no auth
2. **Auth endpoints** (if token-based): token endpoint URL, required credentials, token format/expiry, refresh mechanism
3. **Per-endpoint auth**: which endpoints require auth, which are public, role/permission requirements
4. **Test auth strategy**: how existing tests handle auth, test credentials setup, token caching/reuse

## 4. Identify Data Dependencies

For each endpoint, determine:

1. **Input data requirements**: required fields and types, validation rules (min/max, patterns, enums), field relationships, file uploads
2. **Data preconditions**: required database state, required entity relationships, ordering dependencies (e.g., create user before order)
3. **Data side effects**: what data is created/modified/deleted, cascading effects, idempotency characteristics

## 5. Reconcile and Validate

After extracting contracts for each target endpoint, before emission:

1. **Spec-vs-code cross-check** (when both are available):
   - For each endpoint, compare the Swagger spec against the code: are the same fields / types / required-flags / status codes / auth requirements present in both?
   - Record every mismatch (additional validation in code not in spec, deprecated markers, missing response shapes, auth differences) in the **Notes / Discrepancies** section of that endpoint's contract entry.
   - Do NOT silently prefer one source over the other — declare the discrepancy explicitly so the calling workflow / reviewer can decide.

2. **Coverage check.** Every endpoint in the target list supplied by the calling workflow must have a contract entry. Endpoints that could not be analyzed (not found in spec/code, ambiguous routing, parsing failure) are flagged back to the calling workflow with the specific reason — NOT silently dropped.

3. **Run `<validation_checklist>`** before emission. Fix any failing item before proceeding.

4. **Emit per `<output_format>`** to the destination supplied by the calling workflow (this skill does NOT decide the destination path).

</process>

<output_format>

One contract entry per target endpoint, written in markdown, using the template below. The calling workflow supplies the destination file path (commonly `agents/qa/{IDENTIFIER}/api-analysis.md`); this skill does NOT decide the path.

**Per-endpoint template:**

````markdown
## Endpoint Contract: <METHOD> <path>

**Source:** swagger | code | hybrid (both used)
**Summary:** [one-line summary from spec / docstring / N/A]
**Tags / Groups:** [functional grouping or N/A]

### Parameters

**Path parameters:**
| Name | Type | Required | Constraints |
|------|------|----------|-------------|
| ...  | ...  | ...      | ...         |

(or `None` if endpoint has no path parameters)

**Query parameters:** (same table shape, or `None`)

**Header parameters:** (same table shape, or `None`)

### Request Body

**Content-Type:** [e.g. `application/json`, `multipart/form-data`, or `N/A — no body`]

**Schema:**
```json
{ ... }
```

**Example:**
```json
{ ... }
```

### Responses

| Status | Content-Type | Schema | Example |
|--------|-------------|--------|---------|
| ...    | ...         | ...    | ...     |

### Auth

- **Mechanism:** [Bearer JWT / OAuth2 / API Key / Basic / Session-Cookie / None]
- **Required scopes / permissions:** [list or N/A]
- **Public endpoint:** [yes / no]

### Data Dependencies

- **Preconditions:** [required DB state, entity relationships, ordering]
- **Side effects:** [what is created / modified / deleted]
- **Idempotent:** [yes / no, with rationale if non-obvious]

### Source Citations

- Swagger: [json/yaml path expression, e.g. `paths./api/v1/orders/{orderId}.get`] or `N/A`
- Code: [file paths + line numbers for handler + DTO/models] or `N/A`

### Notes / Discrepancies

[Spec-vs-code mismatches, deprecated markers, missing field schemas, auth differences between spec and code. If none: `None.`]
````

**Canonical example** (one complete entry):

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

</output_format>

<validation_checklist>

Run as part of step 5 before emission. All items must hold:

- **Coverage:** every endpoint in the calling workflow's target list has a contract entry — OR is explicitly flagged back to the calling workflow as a gap with reason (not found in spec, parsing failed, ambiguous route, etc.). No endpoint silently dropped.
- **Every contract entry has all required sections** from `<output_format>`: Endpoint header (METHOD + path), Source label, Parameters, Request Body, Responses, Auth, Data Dependencies, Source Citations, Notes / Discrepancies. Sections that don't apply are explicitly marked `None` or `N/A — <reason>`, not blank.
- **Every endpoint has a Method + Path** — no entry with placeholder header.
- **Every Response section has at least one status code with schema + example** — `200`-only entries are acceptable when that's truly all the endpoint documents, but the absence of error responses (401/403/404/500) is recorded in Notes as a documentation gap, not silently omitted.
- **Auth section is filled per endpoint** — Mechanism specified (even if "None"); Public-endpoint flag set explicitly.
- **API-level auth strategy identified** — at least one endpoint's Auth section reflects the system-wide mechanism; if mechanism varies per endpoint, that variance is summarized in the calling workflow's hand-off note.
- **Data dependencies recorded** — Preconditions / Side effects / Idempotent fields populated; "None" is acceptable but blank is not.
- **Spec-vs-code reconciliation done** when both sources are available — discrepancies recorded in Notes per endpoint; entries marked `Source: hybrid` show the reconciliation work, entries marked `Source: swagger` or `Source: code` indicate the other source was unavailable.
- **No fabricated content** — every field traces to the spec, the code, or is explicitly marked as "N/A — <reason>" / "Gap: <reason>".
- **Source Citations populated** — every entry has at least one citation (Swagger JSONPath OR code file:line); citation-less entries are gaps.

</validation_checklist>

<pitfalls>
- Trusting Swagger spec blindly without cross-referencing with actual code — spec can be outdated; the reconciliation step exists to catch this
- Skipping code-based analysis when Swagger is available — code may have additional validation not in spec; record the discrepancy in Notes
- Not documenting auth requirements per endpoint — leads to 401/403 failures during testing
- Ignoring data dependencies and creation order — leads to 404s and FK violations in tests
- Not handling GraphQL APIs — adapt analysis to use schema introspection for queries/mutations
- Silently dropping an endpoint the calling workflow asked about because it could not be analyzed — flag it as a gap with reason instead
- Fabricating schema fields or status codes not present in either source — every field must trace to spec or code, or be marked as `N/A — <reason>`
- Leaving the Notes / Discrepancies section blank when both spec and code were consulted but no reconciliation note was recorded — explicit "None." is required, not absence
</pitfalls>

</swagger-contracts-analysis>
