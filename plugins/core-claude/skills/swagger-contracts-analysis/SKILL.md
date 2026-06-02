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

**Canonical example.** Load `references/canonical-example.md` on demand to see one complete worked entry — covers the `Source: hybrid` path with a real spec-vs-code discrepancy in the Notes section. Use it when authoring the first contract entry of a new project, or when the template above leaves field-shape questions ambiguous. The example is **one entry**, not the schema; the per-endpoint template above remains authoritative.

</output_format>

<validation_checklist>

Run as part of step 5 before emission. Proof-oriented items only — section-presence is enforced by `<output_format>` itself; this checklist verifies things the template can't.

- **Coverage:** every endpoint in the calling workflow's target list has a contract entry OR is flagged back as a gap with reason. No silent drops.
- **Source Citations populated:** every entry has at least one citation (Swagger JSONPath OR code file:line). Citation-less entries are gaps, not entries.
- **No fabricated content:** every field traces to the spec, to the code, or is explicitly marked `N/A — <reason>` / `Gap: <reason>`. No invented schema fields, no invented status codes, no inferred auth requirements without source.
- **Reconciliation evidence:** entries marked `Source: hybrid` have a non-empty Notes / Discrepancies section (either a recorded mismatch OR an explicit `None.` confirming reconciliation ran). Empty Notes on a hybrid entry means the reconciliation step was skipped.
- **API-level auth strategy summarized:** if endpoints share one mechanism, state it once in the handoff note; if mechanism varies per endpoint, summarize the variance for the calling workflow.
- **Undocumented error responses surfaced as gaps:** a `200`-only entry is acceptable only when both sources truly lack other status codes; otherwise the absence of `401`/`403`/`404`/`500` is recorded in Notes as a documentation gap, not silently omitted.
- **N/A discipline:** every `N/A` in any field has a one-line reason; bare `N/A` is forbidden.
- **Redaction scan ran per `<safety_boundaries>`:** the assembled artifact was grepped for credential-shaped patterns (`Bearer `, `Authorization:`, `password:`, `api_key=`, `client_secret`, JWT shape `eyJ...`, `BEGIN PRIVATE KEY`, `postgres://user:pass@`) and PII-shaped patterns; every match was replaced with a placeholder AND the redaction is recorded inline in the entry's `Notes / Discrepancies` section. No literal credentials, tokens, or real PII remain in the artifact.

</validation_checklist>

<safety_boundaries>

The contract artifact this skill produces (commonly `agents/qa/{IDENTIFIER}/api-analysis.md`) is **tracked + downstream-fed** — committed to the repo, read by test-design / test-implementation / debugging phases, and may be shared with reviewers. Treat it as **PUBLIC by default**. Swagger specs and code routinely embed real secrets in `securitySchemes`, example bodies, header constraints, and source-citation snippets; redact before writing, not after.

**Targets to redact** (replace concrete secret values with shape-preserving placeholders; keep the structural shape verbatim):

- **Auth credentials / tokens / API keys / passwords / OAuth client secrets** — in the `Auth` block's `Required scopes / permissions`, in example `Authorization` / `X-Api-Key` / `Cookie` header values, in OAuth token-endpoint example bodies (`client_id`, `client_secret`, `refresh_token`), in Bearer example values. Replace with `<redacted: bearer token>` / `<redacted: api key>` / `<redacted: oauth client secret>` / `<redacted: password>`. Keep the mechanism name (`Bearer JWT`, `OAuth2 client-credentials`, `API Key in header`) — that's structural, not sensitive.
- **Credentialed URLs** (`https://user:pass@host/...`, signed/presigned URLs with `?X-Amz-Signature=`, `?sig=`, `?token=` query parameters) — redact the credential portion to `https://<redacted: credentialed URL>` or `?sig=<redacted: signed URL signature>`. The base URL and path remain verbatim.
- **Database connection strings, signed service URLs, service-account JSONs, private keys, certificates** appearing in code citations or spec examples — never embed the literal value. Describe the source (env var name, secret-manager path) and mechanism instead (e.g., `DB connection string from env var DATABASE_URL — credential portion redacted; format: postgresql://user:pass@host/db`).
- **Real PII in example request/response bodies** (real customer names, real emails, real phone numbers, real account IDs, real payment data, government IDs) — replace with synthetic equivalents on IETF reserved domains (`test.user-1@example.com`), `+1-555-0100`–`+1-555-0199` phone range, or official PSP test card numbers (document the source). Keep the schema shape and field names verbatim.
- **JWT example values** (`eyJ...` patterns) in spec examples or stack-snippet citations — redact to `<redacted: JWT>` and describe what the JWT carries (claims, audience, expiry) in prose if relevant.

**Structural content stays verbatim** — endpoint paths, HTTP methods, status codes, content types, field names, schema shapes, validation rules (min/max/pattern/enum), header names, response codes, JSONPath citations, code file:line citations, auth-mechanism names. Redaction targets sensitive **values**, not the structural contract spec.

**Re-scan before emit.** As part of step 5's `<validation_checklist>`, re-grep the assembled artifact for credential-shaped patterns (`Bearer `, `Authorization:`, `password:`, `api_key=`, `client_secret`, JWT shape `eyJ...`, `BEGIN PRIVATE KEY`, `postgres://user:pass@`) and PII-shaped patterns before declaring complete; any hits were replaced with placeholders. Record the redaction inline in the `Notes / Discrepancies` section so reviewers know what was hidden.

If a real production value would be the natural example in the contract, replace it with a clearly-fake placeholder of the same shape — better an obviously-fake placeholder than a leaked real one committed alongside the api-analysis artifact and propagated to test-spec, test-implementation, and debug phases.

</safety_boundaries>

<pitfalls>
- Trusting Swagger spec blindly without cross-referencing with actual code — spec can be outdated; the reconciliation step exists to catch this
- Skipping code-based analysis when Swagger is available — code may have additional validation not in spec; record the discrepancy in Notes
- Not documenting auth requirements per endpoint — leads to 401/403 failures during testing
- Ignoring data dependencies and creation order — leads to 404s and FK violations in tests
- Not handling GraphQL APIs — adapt analysis to use schema introspection for queries/mutations
- Silently dropping an endpoint the calling workflow asked about because it could not be analyzed — flag it as a gap with reason instead
- Fabricating schema fields or status codes not present in either source — every field must trace to spec or code, or be marked as `N/A — <reason>`
- Leaving the Notes / Discrepancies section blank when both spec and code were consulted but no reconciliation note was recorded — explicit "None." is required, not absence
- Copying literal Bearer tokens / API keys / OAuth client secrets / passwords / signed URLs / real PII from Swagger examples or code citations into the contract artifact — apply `<safety_boundaries>` redaction before writing; the artifact propagates to every downstream test phase
</pitfalls>

</swagger-contracts-analysis>
