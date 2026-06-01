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

</process>

<pitfalls>
- Trusting Swagger spec blindly without cross-referencing with actual code — spec can be outdated
- Skipping code-based analysis when Swagger is available — code may have additional validation not in spec
- Not documenting auth requirements per endpoint — leads to 401/403 failures during testing
- Ignoring data dependencies and creation order — leads to 404s and FK violations in tests
- Not handling GraphQL APIs — adapt analysis to use schema introspection for queries/mutations
</pitfalls>

</swagger-contracts-analysis>
