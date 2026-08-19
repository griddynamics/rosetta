# API-AQA project-config template

API-AQA project-config markdown skeleton written to plans/api-aqa-{IDENTIFIER}/api-aqa-project-config.md.

<api-aqa-project-config-template>

Write to `plans/api-aqa-{IDENTIFIER}/api-aqa-project-config.md` -- one copy per session (see SKILL anti-pattern). Resolve `{IDENTIFIER}` from `agents/TEMP/<FEATURE>/api-aqa-state.md`; populate each section from the user's answers. **`config-schema.md` is the single authority for required keys and accepted `N/A -- <reason>` forms;** required keys carry `[per config-schema]` placeholders. Mark deferred optional fields `TBD -- <reason>`.

```markdown
# API-AQA Project Config

**Created**: [DateTime]
**Last Updated**: [DateTime]

## Wiki / Document Storage
- **wiki_provider**: [per config-schema]
- **wiki_base_url**: [per config-schema]
- **Location**: [URLs, space keys, paths]

## API Specification
- **swagger_url**: [per config-schema]
- **spec_format**: [per config-schema]

## Backend Source Code
- **backend_source_path**: [per config-schema]
- **Framework**: [Spring / Express / FastAPI / .NET / Other / TBD]

## Test Case Management
- **tms_provider**: [per config-schema]
- **tms_base_url**: [per config-schema]
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

</api-aqa-project-config-template>
