---
name: qa-flow-api-spec-analysis
description: Phase 2 of QA workflow - Swagger/OpenAPI Spec Analysis
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_api_spec_analysis>

<description_and_purpose>
Analyze Swagger/OpenAPI specification or codebase API definitions to extract endpoint contracts, auth requirements, and data dependencies.
</description_and_purpose>

<workflow_context>
- Phase 2 of 8 in `qa-flow`
- Input: raw data from Phase 1 + project config (Swagger URL if available)
- Output artifact path (single SSoT — referenced by other sections): `agents/qa/{IDENTIFIER}/api-analysis.md` (resolve `{IDENTIFIER}` from `agents/qa-state.md`)
- Prerequisite: Phase 1 complete, `raw-data.md` exists with identified endpoints
- Read-only scope: locate spec/source, extract contracts, reconcile, write the analysis artifact. NO edits to backend source or product code.
</workflow_context>

<recommended_skills>
- `reverse-engineering` (API-contract extraction mode) — locates the spec/route source and extracts per-endpoint contracts, auth, and data dependencies for the phase-supplied target-endpoint list.
- `sensitive-data` — redaction authority for any credential/PII/JWT value before it is written to the artifact.
</recommended_skills>

<input_contract>
The phase supplies the skill two required inputs; the skill GATEs on both before any spec-location logic:
- **Target-endpoint list** — non-empty, derived from Phase 1 test cases (or explicit user list). The skill never fabricates the target set. Empty/absent → stop, report back, ask the user.
- **Spec/source path** — Swagger/OpenAPI URL OR file path OR backend source path with route definitions (determined in step 2.1). Neither supplied → stop; do NOT scan the whole codebase as a silent fallback unless the user explicitly requested it.
</input_contract>

<phase_steps>
1. Determine API specification source
2. Execute API spec analysis using skill
3. Produce API analysis document
4. Validate and update state
</phase_steps>

<determine_spec_source step="2.1">

Determine `{backend-source-path}` from Phase 1 raw data "Backend Source Code Analysis" section, or from project config "Backend Source Code" section, or from Rosetta docs at `refsrc/{project-name}/docs/` (full discovery logic lives in the data-collection phase (`discovery`) "Analyze Backend Source Code" process step). If Rosetta docs exist for the backend project, read `ARCHITECTURE.md` and `CODEMAP.md` from `refsrc/{project-name}/docs/` to understand API architecture before searching source code.

Determine spec source in order:

1. **Swagger URL from project config** (`qa-project-config.md`)
2. **Swagger/OpenAPI in backend source** (if `{backend-source-path}` configured):
   - Search within `{backend-source-path}` for: `swagger.json`, `swagger.yaml`, `openapi.json`, `openapi.yaml`, `api-docs`
   - If `{backend-source-path}` is NOT configured, search entire codebase instead.
3. **API route definitions in backend source** (if `{backend-source-path}` configured):
   - Search within `{backend-source-path}` for framework-specific route patterns
   - If `{backend-source-path}` is NOT configured, search entire codebase instead.
4. **If none found**: Proceed with documentation from Phase 1 only; ask user for endpoint details. **Zero-doc fallback:** if the user is unavailable, refuses, or supplies only partial info: mark each missing template field (request schema, response schema, auth, data dependencies) as `TBD` and add an explicit `## Assumptions` section in `api-analysis.md` listing every unknown field and the reason it is unknown. Flag Phase 2 as `partial — N/M endpoints fully analyzed` in `agents/qa-state.md` so downstream phases know not to treat the analysis as authoritative.

Decision point: Swagger available -> full spec analysis. No Swagger -> code-based analysis + user input.

</determine_spec_source>

<execute_analysis step="2.2" subagent="discoverer" role="API spec analyst">

1. USE SKILL `reverse-engineering` (API-contract extraction mode) with the phase-supplied bindings: target-endpoint list (Phase 1 test cases) + spec source (step 2.1) = `<input_contract>`; per-endpoint output shape, redaction catalog, and validation = `<endpoint_contract_template>`, `<redaction_contract>`, `<validation_checklist>`; output path = `agents/qa/{IDENTIFIER}/api-analysis.md`. The skill GATEs on the two required inputs before locating the spec. USE SKILL `sensitive-data` to redact before writing.
2. The skill extracts per endpoint: contracts, auth requirements, data dependencies, and reconciles spec-vs-code when both sources are read.
3. Coverage is mandatory: every target endpoint gets a contract entry OR is flagged back as a gap with reason — no silent drop. Do not fabricate schemas, status codes, or auth requirements without a source.

</execute_analysis>

<produce_output step="2.3">

Create `agents/qa/{IDENTIFIER}/api-analysis.md`. The phase owns the document **section list**, the **per-endpoint template** (`<endpoint_contract_template>`), the **redaction catalog** (`<redaction_contract>`), and the **Analysis Summary metrics** — this is the full phase contract (the skill EMITS into it, the phase ASSERTS it).

**Required section list** (in order; every section must be present-or-`N/A — <reason>`):

1. **Header** — `# API Analysis - [IDENTIFIER]` + Analyzed / Phase / Spec Source.
2. **API Overview** — Base URL, API Version, Auth Mechanism, Content Type.
3. **Endpoints Under Test** — one entry per target endpoint using the `<endpoint_contract_template>` (canonical — single source of truth; other sections reference, do not restate).
4. **Authentication Details** — Auth Mechanism (Token Endpoint, Token Type, Token Location, Header Name) + Auth for Tests (Strategy, Existing Pattern from Phase 1, Setup Required). One block; no per-endpoint restatement.
5. **Data Dependencies** — Preconditions, Creation Order (numbered list), Cleanup Considerations. Document-level only; per-endpoint preconditions live inside each endpoint entry.
6. **Analysis Summary** (the phase's metric contract — kept inline verbatim):

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

</produce_output>

<endpoint_contract_template>
One contract entry per target endpoint, in this order; every subsection present with real values OR explicit `N/A — <reason>` / `None`. Structural content (paths, methods, status codes, field/schema names, validation rules, citations, auth-mechanism names) is verbatim functional content; redaction (`<redaction_contract>`) targets sensitive **values** only.

````markdown
## Endpoint Contract: <METHOD> <path>

**Source:** swagger | code | hybrid (both used)
**Summary:** [one-line from spec / docstring / N/A]
**Tags / Groups:** [functional grouping or N/A]

### Parameters
**Path parameters:**
| Name | Type | Required | Constraints |
|------|------|----------|-------------|
(or `None`) — **Query parameters:** same shape or `None` — **Header parameters:** same shape or `None`

### Request Body
**Content-Type:** [e.g. `application/json`, or `N/A — no body`]
**Schema:** ```json { ... } ``` — **Example:** ```json { ... } ```

### Responses
| Status | Content-Type | Schema | Example |
|--------|-------------|--------|---------|

### Auth
- **Mechanism:** [Bearer JWT / OAuth2 / API Key / Basic / Session-Cookie / None]
- **Required scopes / permissions:** [list or N/A] — **Public endpoint:** [yes / no]

### Data Dependencies
- **Preconditions:** [required DB state, entity relationships, ordering]
- **Side effects:** [created / modified / deleted] — **Idempotent:** [yes / no + rationale if non-obvious]

### Source Citations
- Swagger: [JSONPath, e.g. `paths./api/v1/orders/{orderId}.get`] or `N/A`
- Code: [file:line for handler + DTO/model] or `N/A`

### Notes / Discrepancies
[Spec-vs-code mismatches, deprecated markers, missing schemas, undocumented status codes. `Source: hybrid` entries MUST have a non-empty Notes — a recorded mismatch OR explicit `None.` confirming reconciliation ran. Also record each applied redaction here.]
````

**Worked entry** (`Source: hybrid` with a real discrepancy — demonstrates code-as-supplement and a recorded gap):

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

**Query parameters:** None — **Header parameters:** `Authorization: Bearer <jwt>` (required); `Accept` defaults `application/json`

### Request Body
**Content-Type:** N/A — no body

### Responses
| Status | Content-Type | Schema | Example |
|--------|--------------|--------|---------|
| 200 | application/json | `Order` | `{"id":"o-123","status":"PAID","customer_id":"c-1","total":42.00}` |
| 401 | application/problem+json | `AuthError` | `{"type":"unauthorized","title":"Missing or invalid token"}` |
| 403 | application/problem+json | `AuthError` | `{"type":"forbidden","title":"Order belongs to another customer"}` |
| 404 | application/problem+json | `NotFound` | `{"type":"not_found","title":"Order o-123 does not exist"}` |

### Auth
- **Mechanism:** Bearer JWT — **Required scopes / permissions:** `orders:read` — **Public endpoint:** no

### Data Dependencies
- **Preconditions:** order exists; `orders.customer_id` matches the caller (else 403).
- **Side effects:** None (read-only). — **Idempotent:** yes (GET).

### Source Citations
- Swagger: `paths./api/v1/orders/{orderId}.get`
- Code: `src/controllers/orders.controller.ts:42` (handler), `src/dto/order.dto.ts` (response model)

### Notes / Discrepancies
Code rejects `orderId` shorter than 36 chars with a 400 before the handler; Swagger declares only 200/401/403/404. Treat 400 as undocumented-but-real.
````
</endpoint_contract_template>

<redaction_contract>
`api-analysis.md` is **tracked + downstream-fed** (read by test-design / test-implementation / debugging phases) — **PUBLIC by default**. Redact via `sensitive-data` BEFORE writing, then re-scan before emit; record each redaction in the entry's `Notes / Discrepancies`. Swagger specs and code routinely embed real secrets in `securitySchemes`, example bodies, and citation snippets.

**Targets to redact → shape-preserving placeholder** (keep the structural shape):
1. **Auth credentials / tokens / keys / passwords / OAuth secrets** (in `Authorization`/`X-Api-Key`/`Cookie` examples, OAuth token-endpoint bodies, Bearer examples) → `<redacted: bearer token>` / `<redacted: api key>` / `<redacted: oauth client secret>` / `<redacted: password>`. Keep the mechanism name (`Bearer JWT`, `OAuth2 client-credentials`) verbatim.
2. **Credentialed URLs** — `https://user:pass@host` → `https://<redacted: credentialed URL>` (host/path verbatim); `?sig=<sig>` → `?sig=<redacted: signed URL signature>`.
3. **Connection strings / service-account JSONs / private keys / certs** — never embed the literal; describe the source (env var / secret-manager path) + format, e.g. `from env DATABASE_URL — credential redacted; format postgresql://user:pass@host/db`.
4. **Real PII in example bodies** — replace with synthetic on IETF reserved ranges: emails `test.user-1@example.com`; phones `+1-555-0100`–`+1-555-0199`; official PSP test cards (cite source). Field names/schema shapes stay verbatim.
5. **JWT example values** (`eyJ...`) → `<redacted: JWT>`; describe carried claims in prose if they affect documented authorization.

**Re-scan grep list** (before emit): `Bearer `, `Authorization:`, `password:`, `api_key=`, `client_secret`, `eyJ` (JWT), `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY`, `postgres://user:pass@`, `mongodb+srv://user:pass@`; plus emails outside `example.com`/`example.org`, phones outside the `+1-555-01xx` reserved range, card-number shapes `\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}`, and real customer names alongside any of the above.
</redaction_contract>

<validate_findings step="2.4">
1. Confirm all endpoints from test cases analyzed
2. Confirm request/response schemas documented
3. Confirm auth requirements identified
4. Confirm data dependencies mapped
</validate_findings>

<update_state step="2.5">
1. Update `agents/qa-state.md`:
   - Endpoints Analyzed: [count]
   - HTTP Methods: [GET/POST/PUT/DELETE/PATCH counts]
   - Auth Required Endpoints: [count]
   - Spec Source: [Swagger / Code / Docs / Combined]
   - Backend Source Path: [path or N/A]
   - Phase 2 completion timestamp
2. Mark Phase 2 complete, Phase 3 current
</update_state>

<validation_checklist>
- **Coverage:** every target endpoint has a contract entry OR is flagged back as a gap with reason — no silent drops
- **Source Citations:** every entry has ≥1 citation (Swagger JSONPath OR code `file:line`); citation-less entries are gaps, not entries
- **No fabricated content:** every field traces to spec, to code, or is `N/A — <reason>` / `Gap: <reason>` — no invented schema fields, status codes, or auth
- **Reconciliation evidence:** every `Source: hybrid` entry has a non-empty `Notes / Discrepancies` (recorded mismatch OR explicit `None.`)
- **Undocumented error responses surfaced:** a `200`-only entry is acceptable only when both sources truly lack other codes; otherwise missing `401`/`403`/`404`/`500` recorded in Notes as a gap
- **N/A discipline:** every `N/A` has a one-line reason; bare `N/A` forbidden
- **Redaction scan ran** per `<redaction_contract>` — no literal credentials/tokens/PII remain
- Request/response schemas, auth requirements, and data dependencies documented (from spec or code)
- Backend source analyzed for route definitions (if path configured)
- `api-analysis.md` created with all `<produce_output>` sections, each endpoint per `<endpoint_contract_template>`, plus the Analysis Summary metrics
</validation_checklist>

</qa_flow_api_spec_analysis>
