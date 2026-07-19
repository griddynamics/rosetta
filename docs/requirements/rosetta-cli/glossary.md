# Glossary

| Term | Definition |
|------|-----------|
| **Rosetta CLI** | The npm package (`rosetta` on npmjs.com) providing `npx -y rosetta@latest <command>` operations. `configure` is the first command. |
| **Rosetta MCP** | The MCP server package (`rosetta-mcp` on PyPI) that AI agents connect to. |
| **Rosetta Server** | The backend system storing instructions and datasets. |
| **IMS (Instructions Management System)** | The precursor name to Rosetta. Retained as a **backend-neutral alias** for the instruction/knowledge backend (currently [RAGFlow](https://github.com/infiniflow/ragflow)) so that swapping the backend later does not churn naming. This is why identifiers such as `ims_doc_id` (persisted document metadata key), the `ims-dev`/`ims-prod` environments, and assorted internal `IMS` references are kept deliberately — they name the backend concept, not the old product. User-facing naming is always **Rosetta**. |
| **Target** | An IDE or tool that Rosetta CLI configures (e.g., `claudecode`, `windsurf`). |
| **Application profile** | A built-in definition for a target IDE specifying: MCP configuration method, MCP config file path, MCP config JSON schema, command line templates, bootstrap file path, and bootstrap formatting rules. |
| **MCP preset** | A named set of transport configuration and connection parameters for the Rosetta MCP server. Built-in presets: `stdio` (default), `http`. |
| **Stdio MCP preset** | MCP preset using stdio transport with `uvx rosetta-mcp@latest`, configured via environment variables (`RAGFLOW_API_KEY`, `RAGFLOW_BASE_URL`, `RAGFLOW_DATASET_DEFAULT`). |
| **HTTP MCP preset** | MCP preset using HTTP transport with OAuth 2.1 parameters (provider URL, client ID, redirect URI). |
| **MCP config file** | IDE-specific JSON file declaring MCP server connections. |
| **Bootstrap file** | IDE-specific rules/instruction file containing Rosetta prep steps. |
| **Workspace** | The current working directory where `npx -y rosetta@latest` is executed. Treated as the project root. |
| **rosetta.json** | Version-controllable configuration file in the workspace root storing targets, MCP preset, and non-secret parameter overrides. |
