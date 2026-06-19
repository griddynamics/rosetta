---
name: api-qa-flow-api-spec-analysis
description: Phase 2 of QA workflow - Swagger/OpenAPI Spec Analysis
alwaysApply: false
tags: []
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<api_qa_flow_api_spec_analysis>

<description_and_purpose>
Analyze Swagger/OpenAPI specification or codebase API definitions to extract endpoint contracts, auth requirements, and data dependencies.
</description_and_purpose>

<workflow_context>
- Phase 2 of 8 in `api-qa-flow`
- Input: raw data from Phase 1 + project config (Swagger URL if available)
- Output artifact path (single SSoT — referenced by other sections): `agents/api-qa/{IDENTIFIER}/api-analysis.md` (resolve `{IDENTIFIER}` from `agents/api-qa-state.md`)
- Prerequisite: Phase 1 complete, `raw-data.md` exists with identified endpoints
- Read-only scope: locate spec/source, extract contracts, reconcile, write the analysis artifact. NO edits to backend source or product code.
- Skills: `reverse-engineering` (API-contract extraction mode), `sensitive-data` (redaction), `qa-structure` (`{IDENTIFIER}` + artifact path), `qa-knowledge` (api-analysis skeletons + redaction scope)
</workflow_context>

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

Determine `{backend-source-path}` from Phase 1 raw data "Backend Source Code Analysis" section, or from project config "Backend Source Code" section, or from Rosetta docs at `RefSrc/{project-name}/docs/` (the backend-source scan lives in the data-collection phase's **Backend Source Code Analysis** section, run via `reverse-engineering`). If Rosetta docs exist for the backend project, read `ARCHITECTURE.md` and `CODEMAP.md` from `RefSrc/{project-name}/docs/` to understand API architecture before searching source code.

Determine spec source in order:

1. **Swagger URL from project config** (`api-qa-project-config.md`)
2. **Swagger/OpenAPI in backend source** (if `{backend-source-path}` configured):
   - Search within `{backend-source-path}` for: `swagger.json`, `swagger.yaml`, `openapi.json`, `openapi.yaml`, `api-docs`
   - If `{backend-source-path}` is NOT configured, search entire codebase instead.
3. **API route definitions in backend source** (if `{backend-source-path}` configured):
   - Search within `{backend-source-path}` for framework-specific route patterns
   - If `{backend-source-path}` is NOT configured, search entire codebase instead.
4. **If none found**: Proceed with documentation from Phase 1 only; ask user for endpoint details. **Zero-doc fallback:** if the user is unavailable, refuses, or supplies only partial info: mark each missing template field (request schema, response schema, auth, data dependencies) as `TBD` and add an explicit `## Assumptions` section in `api-analysis.md` listing every unknown field and the reason it is unknown. Flag Phase 2 as `partial — N/M endpoints fully analyzed` in `agents/api-qa-state.md` so downstream phases know not to treat the analysis as authoritative.

Decision point: Swagger available -> full spec analysis. No Swagger -> code-based analysis + user input.

</determine_spec_source>

<execute_analysis step="2.2" subagent="discoverer" role="API spec analyst">

1. **ACQUIRE `qa-knowledge/assets/api-analysis-template.md` and `qa-knowledge/references/redaction-scope.md` FROM KB first** — the bound `reverse-engineering` skill disowns the output shape and the redaction list, so they are load-bearing for the `discoverer`. Then USE SKILL `reverse-engineering` (API-contract extraction mode) with the phase-supplied bindings: target-endpoint list (Phase 1 test cases) + spec source (step 2.1) = `<input_contract>`; per-endpoint output shape + Analysis Summary metrics = the `api-analysis-template` asset; redaction scope = the `redaction-scope` reference; validation = `<validation_checklist>`; output path = `agents/api-qa/{IDENTIFIER}/api-analysis.md`. The skill GATEs on the two required inputs before locating the spec. USE SKILL `sensitive-data` to redact before writing.
2. The skill extracts per endpoint: contracts, auth requirements, data dependencies, and reconciles spec-vs-code when both sources are read.
3. Coverage is mandatory: every target endpoint gets a contract entry OR is flagged back as a gap with reason — no silent drop. Do not fabricate schemas, status codes, or auth requirements without a source.

</execute_analysis>

<produce_output step="2.3">

Create `agents/api-qa/{IDENTIFIER}/api-analysis.md`. The phase owns the document **section list** below; the verbatim per-endpoint contract entry and the Analysis Summary metrics are the asset `qa-knowledge/assets/api-analysis-template.md` (ACQUIRE FROM KB). The skill EMITS into these, the phase ASSERTS them.

**Required section list** (in order; every section must be present-or-`N/A — <reason>`):

1. **Header** — `# API Analysis - [IDENTIFIER]` + Analyzed / Phase / Spec Source.
2. **API Overview** — Base URL, API Version, Auth Mechanism, Content Type.
3. **Endpoints Under Test** — one entry per target endpoint using the asset's per-endpoint contract entry (canonical — single source of truth; other sections reference, do not restate).
4. **Authentication Details** — Auth Mechanism (Token Endpoint, Token Type, Token Location, Header Name) + Auth for Tests (Strategy, Existing Pattern from Phase 1, Setup Required). One block; no per-endpoint restatement.
5. **Data Dependencies** — Preconditions, Creation Order (numbered list), Cleanup Considerations. Document-level only; per-endpoint preconditions live inside each endpoint entry.
6. **Analysis Summary** — the metric block from the asset's "Analysis Summary metrics".

</produce_output>

<redaction_contract>
`api-analysis.md` is **tracked + downstream-fed** (read by test-design / test-implementation / debugging phases) — **PUBLIC by default**. Redact via `sensitive-data` BEFORE writing. **Pre-emit gate (MANDATORY): MUST ACQUIRE `qa-knowledge/references/redaction-scope.md` FROM KB and run its grep list against the rendered artifact — emit is FORBIDDEN until that scan has run. Fail-closed: if that ACQUIRE returns zero documents (KB unavailable), STOP and report — never emit unscanned.** Always-present minimal floor (so a scan can run even if the KB fetch fails) — at minimum grep for: `Bearer `, `Authorization:`, `password:`, `api_key=`, `client_secret`, `eyJ` (JWT), `BEGIN PRIVATE KEY`, `user:pass@`. Record each redaction in the entry's `Notes / Discrepancies`. The full target catalog + shape-preserving placeholders + complete re-scan list are in the reference — Swagger specs and code routinely embed real secrets in `securitySchemes`, example bodies, and citation snippets.
</redaction_contract>

<validate_findings step="2.4">
1. Confirm all endpoints from test cases analyzed
2. Confirm request/response schemas documented
3. Confirm auth requirements identified
4. Confirm data dependencies mapped
</validate_findings>

<update_state step="2.5">
1. Update `agents/api-qa-state.md`:
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
- **Redaction pre-emit gate ran** — `qa-knowledge/references/redaction-scope.md` (ACQUIRE FROM KB) was loaded and its grep list executed against the rendered artifact; no literal credentials/tokens/PII remain
- Request/response schemas, auth requirements, and data dependencies documented (from spec or code)
- Backend source analyzed for route definitions (if path configured)
- `api-analysis.md` created with all `<produce_output>` sections, each endpoint per the `api-analysis-template` asset, plus the Analysis Summary metrics
</validation_checklist>

</api_qa_flow_api_spec_analysis>
