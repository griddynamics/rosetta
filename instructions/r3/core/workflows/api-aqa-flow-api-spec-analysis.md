---
name: api-aqa-flow-api-spec-analysis
description: "Phase 2 API Spec Analysis of api-aqa-flow"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<api_aqa_flow_api_spec_analysis>

<description_and_purpose>
Analyze Swagger/OpenAPI spec or codebase API definitions to extract endpoint contracts, auth requirements, and data dependencies.
</description_and_purpose>

<workflow_context>
- Phase 2 of 8 in `api-aqa-flow`
- Input: Phase 1 raw data + project config (API spec URL if available)
- Output: `plans/api-aqa-{IDENTIFIER}/api-analysis.md` (resolve `{IDENTIFIER}` from `agents/TEMP/<FEATURE>/api-aqa-state.md`)
- Prerequisite: Phase 1 complete, `raw-data.md` exists with identified endpoints
- Read-only: locate spec/source, extract contracts, reconcile, write analysis. NO edits to backend source or product code.
- Required skills: `qa-knowledge` (`code_analysis` mode), `reverse-engineering`, `sensitive-data`, `qa-structure`
</workflow_context>

<input_contract>
Two required inputs; skill GATEs on both before any spec-location logic:
- **Target-endpoint list** — non-empty, from Phase 1 test cases or explicit user list. NEVER fabricate. Empty/absent → stop, ask user.
- **Spec/source path** — Swagger/OpenAPI URL, file path, or backend source path (step 2.1). Neither supplied → stop; DO NOT scan whole codebase as silent fallback without explicit user request.
</input_contract>

<phase_steps>
1. Determine API specification source
2. Execute API spec analysis using skill
3. Produce API analysis document
4. Validate and update state
</phase_steps>

<determine_spec_source step="2.1">

`{backend-source-path}` source: Phase 1 "Backend Source Code Analysis", project config "Backend Source Code", or `RefSrc/{project-name}/docs/`. If `RefSrc/{project-name}/docs/` exists, read `ARCHITECTURE.md` and `CODEMAP.md` first.

If `{backend-source-path}` NOT configured, search entire codebase for items 2–3 below.

Determine spec source in order:

1. **Swagger URL from project config** (`api-aqa-project-config.md`)
2. **Swagger/OpenAPI in backend source**: search `{backend-source-path}` for `swagger.json`, `swagger.yaml`, `openapi.json`, `openapi.yaml`, `api-docs`
3. **API route definitions in backend source**: search `{backend-source-path}` for framework-specific route patterns
4. **No source found**: use Phase 1 docs only; ask user for endpoint details.
   - **Zero-source fallback** (user unavailable, refuses, or supplies partial info): mark `request schema`, `response schema`, `auth`, `data dependencies` → `TBD`; add `## Assumptions` section (each unknown + reason); flag Phase 2 as `partial — N/M endpoints fully analyzed` in `agents/TEMP/<FEATURE>/api-aqa-state.md`.

</determine_spec_source>

<execute_analysis step="2.2" subagent="discoverer" role="API spec analyst">

1. USE SKILL `reverse-engineering`, USE SKILL `qa-knowledge` (`code_analysis` mode) with target-endpoint list + spec source (step 2.1); output to `plans/api-aqa-{IDENTIFIER}/api-analysis.md`. Mode GATEs on `<input_contract>` before spec-location. USE SKILL `sensitive-data` before writing.
2. Mode extracts per endpoint: contracts, auth, data deps; reconciles spec-vs-code when both available.
3. Coverage MANDATORY: every endpoint → contract entry OR gap with reason — no silent drop. Never fabricate schemas, status codes, or auth without a source.

</execute_analysis>

<produce_output step="2.3">

Create `plans/api-aqa-{IDENTIFIER}/api-analysis.md`. Per-endpoint contract entry + Analysis Summary metrics use `qa-knowledge`'s api-analysis template.

**Required sections** (ordered; each must be present or `N/A — <reason>`):

1. **Header** — `# API Analysis - [IDENTIFIER]` + Analyzed / Phase / Spec Source.
2. **API Overview** — Base URL, API Version, Auth Mechanism, Content Type.
3. **Endpoints Under Test** — one entry per endpoint per template (canonical SSoT; other sections reference, do not restate).
4. **Authentication Details** — Auth Mechanism (Token Endpoint, Token Type, Token Location, Header Name) + Auth for Tests (Strategy, Existing Pattern from Phase 1, Setup Required). One block; no per-endpoint restatement.
5. **Data Dependencies** — Preconditions, Creation Order (numbered list), Cleanup Considerations. Document-level only; per-endpoint preconditions live inside each endpoint entry.
6. **Analysis Summary** — metric block from the template's "Analysis Summary metrics".

</produce_output>

<redaction_contract>
`api-analysis.md` is **tracked + downstream-fed** — PUBLIC by default. USE SKILL `sensitive-data`: scan rendered artifact BEFORE writing, **fail-closed** (no scan → no emit); record each redaction in `Notes / Discrepancies`. Scan `securitySchemes`, example bodies, citation snippets — specs and code embed real secrets there.
</redaction_contract>

<validate_findings step="2.4">
1. Run `<validation_checklist>` against output.
</validate_findings>

<update_state step="2.5">
1. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`:
   - Endpoints Analyzed: [count]
   - HTTP Methods: [GET/POST/PUT/DELETE/PATCH counts]
   - Auth Required Endpoints: [count]
   - Spec Source: [Swagger / Code / Docs / Combined]
   - Backend Source Path: [path or N/A]
   - Phase 2 completion timestamp
2. Mark Phase 2 complete, Phase 3 current
</update_state>

<validation_checklist>
- **Coverage:** every endpoint → contract entry OR gap with reason; no silent drop
- **Source citations:** every entry ≥1 citation (Swagger JSONPath OR `file:line`); citation-less → gap
- **No fabrication:** every field → spec/code, `N/A — <reason>`, or `Gap: <reason>`; no invented schemas, codes, or auth
- **Reconciliation:** every `Source: hybrid` entry → non-empty `Notes / Discrepancies` (mismatch OR `None.`)
- **Error coverage:** `200`-only requires both sources lack others; else missing `401`/`403`/`404`/`500` → Notes gap
- **N/A discipline:** every `N/A` one-line reason; bare `N/A` forbidden
- **Redaction gate:** `sensitive-data` scan ran against rendered artifact; no credentials/tokens/PII remain
</validation_checklist>

</api_aqa_flow_api_spec_analysis>
