# Application Profiles: Rosetta CLI

<req id="FR-0023" type="FR" level="System" ticketId="" classification="technical">
  <title>Application profile registry</title>
  <statement>The Rosetta CLI shall maintain a built-in registry of application profiles, where each profile defines the target IDE's MCP configuration method, MCP configuration file path, MCP configuration JSON schema, bootstrap file path, bootstrap formatting rules, and command line templates for native CLI targets.</statement>
  <rationale>Centralizes per-IDE configuration knowledge in one place, enabling consistent behavior across all targets and simplifying addition of new targets.</rationale>
  <source>User request</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-02-16</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>
      Given the application profile for `claudecode` When inspected Then it defines: MCP configuration method as native CLI, command line template as `claude mcp add --transport stdio Rosetta --env ... -- uvx ims-mcp@latest`, bootstrap file path as `.claude/claude.md`, and bootstrap formatting as plain Markdown.
      Given the application profile for `cursor` When inspected Then it defines: MCP configuration method as JSON file write, MCP configuration file path as `~/.cursor/mcp.json`, MCP configuration JSON schema with `mcpServers.Rosetta` key, bootstrap file path as `.cursor/rules/bootstrap.mdc`, and bootstrap formatting as YAML frontmatter.
      Given the application profile for `codex` When inspected Then it defines: MCP configuration method as native CLI, command line template as `codex mcp add Rosetta --env ... -- uvx ims-mcp@latest`.
      Given the application profile for `vscode` When inspected Then it defines: MCP configuration method as JSON file write, MCP configuration file path as `.vscode/mcp.json`, MCP configuration JSON schema with `servers.Rosetta` key and `type: "stdio"`, bootstrap file path as `.github/copilot-instructions.md`, and bootstrap formatting as plain Markdown.
      Given the application profile for `copilot-vscode` When inspected Then it defines: MCP configuration method as JSON file write, MCP configuration file path as `.vscode/mcp.json`, MCP configuration JSON schema with `servers.Rosetta` key and `type: "stdio"`, bootstrap file path as `.github/copilot-instructions.md`, and bootstrap formatting as plain Markdown.
      Given the application profile for `copilot-jetbrains` When inspected Then it defines: MCP configuration method as JSON file write, MCP configuration file path as `~/.config/github-copilot/intellij/mcp.json`, MCP configuration JSON schema with `servers.Rosetta` key, bootstrap file path as `.github/copilot-instructions.md`, and bootstrap formatting as plain Markdown without frontmatter.
      Given the application profile for `junie` When inspected Then it defines: MCP configuration method as JSON file write, MCP configuration JSON schema with `mcpServers.Rosetta` key, bootstrap file path as `.junie/guidelines.md`, and bootstrap formatting as plain Markdown without frontmatter.
      Given the application profile for `antigravity` When inspected Then it defines: MCP configuration method as JSON file write, MCP configuration JSON schema with `mcpServers.Rosetta` key, bootstrap file path as `.agent/rules/agents.md`, and bootstrap formatting as YAML frontmatter with `trigger: always_on`.
      Given the application profile for `opencode` When inspected Then it defines: MCP configuration method as native CLI if available otherwise JSON file write to `opencode.json`, MCP configuration JSON schema with `mcp.Rosetta` key, bootstrap file path as `AGENTS.md`, and bootstrap formatting as plain Markdown.
      Given the application profile for `windsurf` When inspected Then it defines: MCP configuration method, MCP configuration file path, MCP configuration JSON schema, bootstrap file path, and bootstrap formatting for the Windsurf MCP integration.
    </criteria>
  </acceptance>
  <notes>Windsurf and Codex bootstrap paths remain to be finalized. Application profiles are built-in to the CLI package, not user-configurable.</notes>
</req>
