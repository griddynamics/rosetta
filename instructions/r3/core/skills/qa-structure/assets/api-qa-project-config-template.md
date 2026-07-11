# API-QA project-config template

API-QA project-config markdown skeleton written to plans/api-qa-{IDENTIFIER}/api-qa-project-config.md.

<api-qa-project-config-template>

Write to `plans/api-qa-{IDENTIFIER}/api-qa-project-config.md` -- one copy per session (see SKILL anti-pattern). Resolve `{IDENTIFIER}` from `agents/TEMP/<FEATURE>/api-qa-state.md`; populate each section from the user's answers. **`config-schema.md` is the single authority for required keys and accepted `N/A -- <reason>` forms;** required keys carry `[per config-schema]` placeholders. Mark deferred optional fields `TBD -- <reason>`.

```markdown
# API-QA Project Config

**Created**: [DateTime]
**Last Updated**: [DateTime]

## Document Storage
- **documentation_type**: [per config-schema]
- **documentation_mcp_collection_skill**: [per config-schema]
- **confluence_base_url / documentation_base_url**: [per config-schema]
- **Location**: [URLs, space keys, paths]

## API Specification
- **swagger_url**: [per config-schema]
- **spec_format**: [per config-schema]

## Backend Source Code
- **backend_source_path**: [per config-schema]
- **Framework**: [Spring / Express / FastAPI / .NET / Other / TBD]

## Test Case Management
- **system**: [per config-schema]
- **testrail_base_url**: [per config-schema]
- **jira_base_url**: [per config-schema]
- **testcase_mcp_collection_skill**: [per config-schema]
- **project_id / suite_id**: [per config-schema]
- **Access**: [MCP-managed / env var <NAME> / manual]

## Test Framework
- **framework**: [per config-schema]
- **Test Location**: [Directory path or TBD]
- **Existing API Tests**: [Yes / No / TBD]

## Authentication
- **mechanism**: [per config-schema]
- **Test Auth Strategy**: [strategy + source, e.g. Bearer JWT from AuthHelper; creds in env vars — never literal values]

## Additional Notes
- [Any project-specific details, constraints, or preferences]
- [If Redaction-at-intake was applied: `Original auth answer included a literal <kind> — redacted; agent should request mechanism+source description from user if env var name is unknown.`]
```

</api-qa-project-config-template>
