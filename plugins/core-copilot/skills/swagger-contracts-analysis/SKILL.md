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
- **Redaction scan ran** per `<safety_boundaries>` — no literal credentials/tokens/PII remain in the artifact.

</validation_checklist>

<safety_boundaries>

The contract artifact this skill produces (commonly `agents/qa/{IDENTIFIER}/api-analysis.md`) is **tracked + downstream-fed** — committed to the repo, read by test-design / test-implementation / debugging phases, and may be shared with reviewers. Treat it as **PUBLIC by default**.

**Operational rules** (decision-time guidance an agent needs without lazy-loading):

- **Redact before writing, not after.** Swagger specs and code routinely embed real secrets in `securitySchemes`, example bodies, header constraints, and source-citation snippets.
- **Structural content stays verbatim.** Endpoint paths, HTTP methods, status codes, field names, schema shapes, validation rules, JSONPath citations, code `file:line` citations, and auth-mechanism names are functional content. Redaction targets sensitive **values**, not the structural spec.
- **Re-scan before emit.** `<validation_checklist>`'s redaction item re-greps the assembled artifact; record each redaction inline in `Notes / Discrepancies` so reviewers know what was hidden.

**Catalog moved to references** (load on demand when actively applying redaction): the **5-category targets-to-redact table** (auth credentials, credentialed URLs, connection strings / service-account JSONs / private keys, PII, JWT example values), the **placeholder vocabulary**, and the **canonical grep pattern list** all live in [references/redaction-catalog.md](references/redaction-catalog.md) — the single source of truth for what to scan and how to replace it. Mirrors the sibling `api-test-spec-authoring` lazy-loading pattern.

</safety_boundaries>

<success_criteria>

High-level done-condition. Item-level checks live in `<validation_checklist>` (single source of truth — referenced here, not restated).

**Complete when:** every endpoint in the calling workflow's target list has a contract entry OR is flagged back as a gap with reason; every entry has ≥1 citation (Swagger JSONPath OR code `file:line`); every entry marked `Source: hybrid` has a non-empty `Notes / Discrepancies` section (either a recorded mismatch OR explicit `None.`); every `<validation_checklist>` item holds (the redaction scan is one of them — not separately restated here).

**NOT complete** if any target endpoint is silently dropped (must be flagged as a gap with reason — see `<failure_handling>`); any entry lacks a citation; any hybrid entry has empty `Notes / Discrepancies`; literal credentials/PII remain in the artifact; any `N/A` is bare (without one-line reason).

</success_criteria>

<failure_handling>

Consolidated stop/ask/route behaviors. Common branches inline; rarely-hit edge cases lazy-loaded.

**Common branches (always-loaded — these are the high-frequency stops):**

- **Endpoint not found in spec OR code** (step 1 exhausted Swagger spec, code-based route definitions, and Swagger-in-source patterns; the target endpoint is in neither): flag the endpoint back to the calling workflow with reason `not-found-in-spec-or-code` AND request user input for endpoint details (per step 1.4). Do NOT fabricate an entry. Do NOT silently drop — record it in the coverage gap list per step 5.2.
- **Ambiguous routing** (the spec or code returns multiple candidate routes for one logical endpoint — e.g., overlapping path prefixes, versioned duplicates, conflicting method handlers): flag back with reason `ambiguous-routing: <candidate-1> | <candidate-2>` and ask the calling workflow which route is the intended target. Do NOT pick one silently — record both candidates.
- **Parsing failure** (Swagger spec file is malformed JSON/YAML, OR a code file can't be parsed for route definitions): flag back with reason `parse-failure: <path> — <parser error>`. Continue with the remaining endpoints; the failed endpoint is recorded as a gap. Do NOT guess at contents.

**Edge-case branches (load on demand):** the three lower-frequency conditions below only fire on specific invocations — full rules + resolution discipline live in [references/failure-handling-edge-cases.md](references/failure-handling-edge-cases.md). Load when the trigger applies.

- **Spec-vs-code reconciliation conflict beyond Notes** — when discrepancies exceed what `Notes / Discrepancies` can reasonably hold (method differs, required-field set differs >50%, status-code success semantics disagree, schemas structurally incompatible). See [references file](references/failure-handling-edge-cases.md#spec-vs-code-reconciliation-conflict-beyond-notes) for the both-sides + `Reconciliation: unresolved` + Critical-follow-up rule.
- **GraphQL API** — when the target is a GraphQL schema, not REST. See [references file](references/failure-handling-edge-cases.md#graphql-api) for the schema-introspection adaptation + per-operation entry rules using the REST template's structural fields.
- **Citation source unavailable** — when an entry would be `Source: hybrid` but only one source is intentionally consulted (closed-source code, scoped audit). See [references file](references/failure-handling-edge-cases.md#citation-source-unavailable) for the `Source: swagger` / `Source: code` single-source labeling + Notes-scope-decision rule.

</failure_handling>

<pitfalls>
- Trusting Swagger spec blindly without cross-referencing with actual code — spec can be outdated; the reconciliation step exists to catch this
- Skipping code-based analysis when Swagger is available — code may have additional validation not in spec; record the discrepancy in Notes
- Not documenting auth requirements per endpoint — leads to 401/403 failures during testing
- Ignoring data dependencies and creation order — leads to 404s and FK violations in tests
- Treating GraphQL APIs as plain REST without switching to the GraphQL branch — see `<failure_handling>` "GraphQL API" for the handled adaptation
- Silently dropping an endpoint the calling workflow asked about because it could not be analyzed — flag it as a gap with reason instead
- Fabricating schema fields or status codes not present in either source — every field must trace to spec or code, or be marked as `N/A — <reason>`
- Leaving the Notes / Discrepancies section blank when both spec and code were consulted but no reconciliation note was recorded — explicit "None." is required, not absence
- Copying literal credentials or PII from Swagger examples / code citations into the contract artifact — apply `<safety_boundaries>` redaction before writing (the artifact propagates to every downstream test phase)
</pitfalls>

</swagger-contracts-analysis>
