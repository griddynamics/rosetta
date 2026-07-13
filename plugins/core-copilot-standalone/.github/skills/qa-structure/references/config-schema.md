# QA project-config key schema 

Schema with required keys, the phase that consumes each, and accepted N/A forms.
---

<config-schema>

The project-config-loading phase completes only when every required key below holds a real value or explicit `N/A -- <reason>` (or `TBD -- <next-step>` where noted). Carrying asset: READ SKILL FILE `assets/api-qa-project-config-template.md`.

**Required keys (consumed by later phases -- vendor resolution downstream binds to these by exact name):**

| Section / Key | Consumed by | Required value or accepted N/A reason |
|---|---|---|
| `Document Storage` -- `documentation_type` | data-collection phase | One of: `confluence` / `google-drive` / `local` / `none`. `N/A` only when `none`. |
| `Document Storage` -- `documentation_mcp_collection_skill` | data-collection phase (resolved vendor binding) | Vendor binding (e.g. the `data-collection` confluence binding) or `N/A -- documentation_type: none` |
| `Document Storage` -- `confluence_base_url` / `documentation_base_url` | data-collection phase (scope detection) | Base URL or `N/A -- documentation_type: <non-confluence-value>` |
| `API Specification` -- `swagger_url` (or path) | api-spec-analysis phase | URL/path, or `N/A -- no Swagger spec available; code-based analysis will run` |
| `API Specification` -- `spec_format` | api-spec-analysis phase | One of: `OpenAPI 3.x` / `Swagger 2.0` / `N/A` |
| `Backend Source Code` -- `backend_source_path` | data-collection phase, api-spec-analysis phase | Path (e.g. `RefSrc/my-backend/` or `src/`) or `N/A -- work from Swagger/docs only` |
| `Test Case Management` -- `system` | data-collection phase (branch selector) | One of: `testrail` / `jira` / `confluence` / `manual` / `other` |
| `Test Case Management` -- `testrail_base_url` | data-collection phase (vendor resolution when system is `testrail`) | Base URL or `N/A -- system: <non-testrail-value>` |
| `Test Case Management` -- `jira_base_url` | data-collection phase (vendor resolution when system is `jira`) | Base URL or `N/A -- system: <non-jira-value>` |
| `Test Case Management` -- `testcase_mcp_collection_skill` | data-collection phase (resolved vendor binding) | Vendor binding (e.g. the `data-collection` testrail binding) or `N/A -- system: manual` |
| `Test Case Management` -- `project_id` / `suite_id` | data-collection phase (when system is `testrail`) | IDs, or `N/A -- system: <non-testrail-value>` |
| `Test Framework` -- `framework` | data-collection phase (validates discovery) | Name (`pytest` / `Jest` / etc.) or `TBD -- will discover from codebase` |
| `Authentication` -- `mechanism` | api-spec-analysis phase (cross-check) | One of: `oauth2` / `jwt` / `api-key` / `basic` / `none` / `TBD -- will discover from spec/code` |

**Empty-field rule.** If a key's value is unknown or absent, write `N/A -- <reason>` -- never leave the key absent: a later grep by key name silently misses it and degrades analysis without flagging the gap.

</config-schema>
