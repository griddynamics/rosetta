---
name: config-schema
description: QA project-config key schema — required keys, the phase that consumes each, and accepted N/A forms.
---

<config-schema>

SSoT for the QA project-config field schema. Phase 0 is not complete until every required key below is populated with a real value or explicitly marked `N/A — <reason>` (or `TBD — <next-step>` where noted). The markdown shape that carries these keys is the asset `qa-structure/assets/qa-project-config-template.md`.

**Required keys (consumed by later phases — vendor resolution downstream binds to these by exact name):**

| Section / Key | Consumed by | Required value or accepted N/A reason |
|---|---|---|
| `Document Storage` — `documentation_type` | `qa-flow-documentation-mcp-subflow.md` (Phase 1) | One of: `confluence` / `google-drive` / `local` / `none`. `N/A` only when `none`. |
| `Document Storage` — `documentation_mcp_collection_skill` | documentation subflow step 1 (resolved vendor binding) | Vendor binding (e.g. the `discovery` confluence binding) or `N/A — documentation_type: none` |
| `Document Storage` — `confluence_base_url` / `documentation_base_url` | documentation subflow scope detection | Base URL or `N/A — documentation_type: <non-confluence-value>` |
| `API Specification` — `swagger_url` (or path) | `qa-flow-api-spec-analysis.md` step 2.1 | URL/path, or `N/A — no Swagger spec available; code-based analysis will run` |
| `API Specification` — `spec_format` | `qa-flow-api-spec-analysis.md` step 2.1 | One of: `OpenAPI 3.x` / `Swagger 2.0` / `N/A` |
| `Backend Source Code` — `backend_source_path` | data-collection phase, `qa-flow-api-spec-analysis.md` step 2.1 | Path (e.g. `RefSrc/my-backend/` or `src/`) or `N/A — work from Swagger/docs only` |
| `Test Case Management` — `system` | data-collection phase (branch selector) | One of: `testrail` / `jira` / `confluence` / `manual` / `other` |
| `Test Case Management` — `testrail_base_url` | data-collection phase (vendor resolution when system is `testrail`) | Base URL or `N/A — system: <non-testrail-value>` |
| `Test Case Management` — `jira_base_url` | data-collection phase (vendor resolution when system is `jira`) | Base URL or `N/A — system: <non-jira-value>` |
| `Test Case Management` — `testcase_mcp_collection_skill` | data-collection phase (resolved vendor binding) | Vendor binding (e.g. the `discovery` testrail binding) or `N/A — system: manual` |
| `Test Case Management` — `project_id` / `suite_id` | data-collection phase (when system is `testrail`) | IDs, or `N/A — system: <non-testrail-value>` |
| `Test Framework` — `framework` | data-collection phase (validates discovery) | Name (`pytest` / `Jest` / etc.) or `TBD — will discover from codebase` |
| `Authentication` — `mechanism` | `qa-flow-api-spec-analysis.md` step 3 cross-check | One of: `oauth2` / `jwt` / `api-key` / `basic` / `none` / `TBD — will discover from spec/code` |

**Empty-field rule.** If the user is unsure or the project genuinely lacks one of the optional inputs, write `N/A — <reason>` for that key. Do NOT leave the key absent — Phase 1 grepping for the key by name will silently miss it and degrade analysis without flagging the gap.

</config-schema>
