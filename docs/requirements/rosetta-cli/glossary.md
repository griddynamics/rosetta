# Glossary

| Term | Definition |
|------|-----------|
| **Rosetta CLI** | The npm package (`rosetta` on npmjs.com) providing `npx -y rosetta@latest <command>` operations. `configure` is the first command. |
| **Rosetta MCP** | The MCP server package (`ims-mcp` on PyPI) that AI agents connect to. |
| **Rosetta Server** | The backend system storing instructions and datasets. |
| **Target** | An IDE or tool that Rosetta CLI configures (e.g., `claudecode`, `windsurf`). |
| **Application profile** | A built-in definition for a target IDE specifying: MCP configuration method, MCP config file path, MCP config JSON schema, command line templates, bootstrap file path, and bootstrap formatting rules. |
| **MCP preset** | A named set of transport configuration and connection parameters for the Rosetta MCP server. Built-in presets: `stdio` (default), `http`. |
| **Stdio MCP preset** | MCP preset using stdio transport with `uvx ims-mcp@latest`, configured via environment variables (`RAGFLOW_API_KEY`, `RAGFLOW_BASE_URL`, `RAGFLOW_DATASET_DEFAULT`). |
| **HTTP MCP preset** | MCP preset using HTTP transport with OAuth 2.1 parameters (provider URL, client ID, redirect URI). |
| **MCP config file** | IDE-specific JSON file declaring MCP server connections. |
| **Bootstrap file** | IDE-specific rules/instruction file containing Rosetta prep steps. |
| **Workspace** | The current working directory where `npx -y rosetta@latest` is executed. Treated as the project root. |
| **rosetta.json** | Version-controllable configuration file in the workspace root storing targets, MCP preset, and non-secret parameter overrides. |
