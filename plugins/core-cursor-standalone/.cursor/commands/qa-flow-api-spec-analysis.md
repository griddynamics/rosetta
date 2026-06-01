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
- Output: `agents/qa/{IDENTIFIER}/api-analysis.md` with endpoint contracts, auth details, data dependencies
- Prerequisite: Phase 1 complete, `raw-data.md` exists with identified endpoints
</workflow_context>

<phase_steps>
1. Determine API specification source
2. Execute API spec analysis using skill
3. Produce API analysis document
4. Validate and update state
</phase_steps>

<determine_spec_source step="2.1">

Determine `{backend-source-path}` from Phase 1 raw data "Backend Source Code Analysis" section, or from project config "Backend Source Code" section, or from Rosetta docs at `RefSrc/{project-name}/docs/` (see `qa-data-collection` skill, step 4 for full discovery logic). If Rosetta docs exist for the backend project, read `ARCHITECTURE.md` and `CODEMAP.md` from `RefSrc/{project-name}/docs/` to understand API architecture before searching source code.

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

1. USE SKILL `swagger-contracts-analysis` with spec source determined in step 2.1 and target endpoints identified in Phase 1 test cases
2. The skill extracts: endpoint contracts, auth requirements, data dependencies

</execute_analysis>

<produce_output step="2.3">

Create `agents/qa/{IDENTIFIER}/api-analysis.md` using the following template:

```markdown
# API Analysis - [IDENTIFIER]

**Analyzed**: [DateTime]
**Phase**: 2 - API Spec Analysis
**Spec Source**: [Swagger URL / Code Analysis / Documentation / Combined]

---

## API Overview

- **Base URL**: [Base URL or env variable]
- **API Version**: [v1, v2, etc.]
- **Auth Mechanism**: [Type]
- **Content Type**: [application/json, etc.]

---

## Endpoints Under Test

### Endpoint 1: [METHOD] [PATH]

**Summary**: [What it does]
**Tags**: [API group/category]

#### Request
- **Content-Type**: [Type]
- **Auth Required**: [Yes/No — scheme name]
- **Path Parameters**:
  | Name | Type | Required | Description |
  |------|------|----------|-------------|
  | [name] | [type] | [Yes/No] | [desc] |

- **Query Parameters**:
  | Name | Type | Required | Default | Description |
  |------|------|----------|---------|-------------|
  | [name] | [type] | [Yes/No] | [value] | [desc] |

- **Request Body Schema**:
  ```json
  {
    "field1": "string (required, max 255)",
    "field2": "integer (optional, min 0)"
  }
  ```

- **Example Request**:
  ```json
  {
    "field1": "example value",
    "field2": 42
  }
  ```

#### Responses

| Status | Description | Schema |
|--------|-------------|--------|
| 200 | Success | `{ id, field1, field2, createdAt }` |
| 400 | Validation error | `{ error, message, details[] }` |
| 401 | Unauthorized | `{ error, message }` |
| 404 | Not found | `{ error, message }` |
| 500 | Server error | `{ error, message }` |

#### Constraints
- [Rate limiting, max payload size, required permissions]

---

[Repeat for each endpoint]

---

## Authentication Details

### Auth Mechanism: [Type]
- **Token Endpoint**: [URL if applicable]
- **Token Type**: [Bearer / API Key / etc.]
- **Token Location**: [Header / Query / Cookie]
- **Header Name**: [Authorization / X-API-Key / etc.]

### Auth for Tests
- **Strategy**: [Test credentials / Mock auth / Service account]
- **Existing Pattern**: [How current tests do it — from Phase 1]
- **Setup Required**: [Token acquisition steps]

---

## Data Dependencies

### Preconditions
- [Entity 1 must exist before endpoint X can be tested]

### Creation Order
1. [Create entity A first]
2. [Create entity B (depends on A)]
3. [Test target endpoint (depends on A and B)]

### Cleanup Considerations
- [Data created by tests should be cleaned up]
- [Cascade delete behavior]

---

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
- All endpoints from test cases analyzed
- Request/response schemas documented (from spec or code)
- Auth requirements identified
- Data dependencies mapped
- Backend source code analyzed for route definitions (if path configured)
- `api-analysis.md` created with all sections
</validation_checklist>

</qa_flow_api_spec_analysis>
