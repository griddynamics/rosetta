# SpecFlow MCP Schema Reference

Quick-lookup reference for session files, version channels, and status enums. Full parameter and response schemas are in the FastMCP tool descriptions received automatically at MCP connection.

Public docs: https://griddynamics.github.io/cto-rnd-gain-mcp/

## Session Files

| File | Owner | Purpose | Commit? |
|------|-------|---------|---------|
| `gain.json`             | User / SpecFlow MCP | Umbrella project context; Rosetta reads it. | Yes |
| `specflow_session.json` | SpecFlow MCP        | Active `generation_id`, project root anchor. | No  |

## Version Channels

| `gain.json` field   | Meaning |
|---------------------|---------|
| `versions.rosetta`  | Required Rosetta version for skill compatibility. |
| `versions.specflow`     | SpecFlow umbrella version. |

## Status Enum

Values for the `status` field — for user-facing meanings READ SKILL FILE `references/specflow-vocabulary.md`.

`pending | analysis | initializing | running | completed | failed`
