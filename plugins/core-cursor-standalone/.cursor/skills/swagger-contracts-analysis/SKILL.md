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

For each target endpoint, populate every subsection of the `<output_format>` Required-Subsections list (verbatim field shapes in `references/per-endpoint-template.md`). Sources:

- **From Swagger/OpenAPI spec:** path + method + summary, parameters (path/query/header), request body (content-type/schema/example), responses per status code (schema/headers/example), security (auth schemes + scopes), tags.
- **From code (if no Swagger):** parse controller/route files; extract request validation schemas (Joi / Zod / Pydantic / Bean Validation), response DTOs/models, middleware (auth / validation / rate-limit), API-versioning patterns.

## 3. Analyze Auth Requirements

For the API under test, determine: (1) **auth mechanism** (Bearer JWT / OAuth2 / API Key / Basic / Session-cookie / none); (2) **auth endpoints** if token-based (token URL, credentials, format/expiry, refresh); (3) **per-endpoint auth** (which require auth, which are public, role/permission requirements); (4) **test auth strategy** (how existing tests handle auth, test credentials setup, token caching/reuse).

## 4. Identify Data Dependencies

For each endpoint determine: (1) **input data requirements** (required fields + types, validation rules, field relationships, file uploads); (2) **preconditions** (required DB state, entity relationships, ordering); (3) **side effects** (what is created/modified/deleted, cascading effects, idempotency).

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

One contract entry per target endpoint. The calling workflow supplies the destination file path (commonly `agents/qa/{IDENTIFIER}/api-analysis.md`); this skill does NOT decide the path.

**Required subsections** (in this order — every entry MUST include each, populated with real values OR explicit `N/A — <reason>` / `None`):

1. Endpoint Contract header (`<METHOD> <path>`) — 2. Source — 3. Summary — 4. Tags / Groups — 5. Parameters (Path / Query / Header) — 6. Request Body — 7. Responses — 8. Auth — 9. Data Dependencies — 10. Source Citations — 11. Notes / Discrepancies.

**Verbatim markdown template** (subsection field shapes, table layouts, content-type rules, citation formats): [references/per-endpoint-template.md](references/per-endpoint-template.md) — load on demand when authoring entries.

**Canonical worked example** (`Source: hybrid` with a real spec-vs-code discrepancy in Notes): [references/canonical-example.md](references/canonical-example.md) — load on demand when authoring the first entry of a new project or when field-shape questions arise.

</output_format>

<validation_checklist>

8-item pre-emit checklist lives in [references/validation-checklist.md](references/validation-checklist.md) — loaded on demand from `<process>` step 5.3 (the only step that runs the checklist).

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
(Each item is a pointer; the rule lives in the cited section.)
- Trusting Swagger blindly without cross-referencing code → `<process>` step 5.1 reconciliation.
- Skipping code-based analysis when Swagger is available → `<process>` step 2 hybrid branch.
- Missing per-endpoint auth requirements → `<process>` step 3.
- Ignoring data dependencies / creation order → `<process>` step 4.
- Treating GraphQL APIs as REST → `<failure_handling>` "GraphQL API" branch.
- Silent endpoint drop → `<failure_handling>` "Endpoint not found" + `<process>` step 5.2.
- Fabricated schema fields / status codes → `<success_criteria>` (every field must trace to spec/code or be `N/A — <reason>`).
- Empty `Notes / Discrepancies` on hybrid entries → `<success_criteria>` (explicit `None.` required).
- Literal credentials / PII in artifact → `<safety_boundaries>` redact-before-writing.
</pitfalls>

</swagger-contracts-analysis>
