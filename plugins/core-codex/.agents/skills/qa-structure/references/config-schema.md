# API-AQA per-run project-config key schema

Schema with required API-AQA run keys, the phase that consumes each, and accepted N/A forms. Repository-wide SDLC providers remain defined by root `gain.json.sdlc`; a run artifact may add API-AQA-specific details without replacing that source.
---

<config-schema>

The project-config-loading phase completes only when every required key below holds a real value or explicit `N/A -- <reason>` (or `TBD -- <next-step>` where noted). Carrying asset: READ SKILL FILE `assets/api-aqa-project-config-template.md`. Phase 0 prefills provider keys from `gain.json` `sdlc.*` (`test_management(_project)`, `wiki(_project)`, `issue_tracker(_project)`) merged with explicit user input and recognizable provider URLs; the interview covers only still-unresolved keys.

**Required keys (consumed by later phases -- provider resolution downstream binds to these by exact name). Provider values are role-based; the named vendors are canonical examples, not a closed list:**

| Section / Key | Consumed by | Required value or accepted N/A reason |
|---|---|---|
| `Wiki / Document Storage` -- `wiki_provider` | data-collection phase (Wiki scope) | Provider name (e.g. `confluence` / `google-drive` / `local`) or `none`. `N/A` only when `none`. |
| `Wiki / Document Storage` -- `wiki_base_url` | data-collection phase (scope detection + access) | Base URL or `N/A -- wiki_provider: <none/local>` |
| `API Specification` -- `swagger_url` (or path) | api-spec-analysis phase | URL/path, or `N/A -- no Swagger spec available; code-based analysis will run` |
| `API Specification` -- `spec_format` | api-spec-analysis phase | One of: `OpenAPI 3.x` / `Swagger 2.0` / `N/A` |
| `Backend Source Code` -- `backend_source_path` | data-collection phase, api-spec-analysis phase | Path (e.g. `RefSrc/my-backend/` or `src/`) or `N/A -- work from Swagger/docs only` |
| `Test Case Management` -- `tms_provider` | data-collection phase (branch selector) | Provider name (e.g. `testrail` / `jira` / `confluence`) or `manual` / `other` |
| `Test Case Management` -- `tms_base_url` | data-collection phase (provider access) | Base URL or `N/A -- tms_provider: manual` |
| `Test Case Management` -- `project_id` / `suite_id` | data-collection phase (provider-specific run identifiers; TestRail project/suite is the canonical example) | IDs, or `N/A -- tms_provider: <value without project/suite IDs>` |
| `Test Framework` -- `framework` | data-collection phase (validates discovery) | Name (`pytest` / `Jest` / etc.) or `TBD -- will discover from codebase` |
| `Authentication` -- `mechanism` | api-spec-analysis phase (cross-check) | One of: `oauth2` / `jwt` / `api-key` / `basic` / `none` / `TBD -- will discover from spec/code` |

**Empty-field rule.** If a key's value is unknown or absent, write `N/A -- <reason>` -- never leave the key absent: a later grep by key name silently misses it and degrades analysis without flagging the gap.

</config-schema>
