<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/web/assets/brand/rosetta-logo-full-color-white-text.png">
    <img src="docs/web/assets/brand/rosetta-logo-full-color-black-text.png" alt="Rosetta" width="200">
  </picture>
  <p><strong>Control plane for AI coding agents</strong></p>
  <p>
    <a href="https://pypi.org/project/ims-mcp/"><img src="https://img.shields.io/pypi/v/ims-mcp.svg" alt="PyPI"></a>
    <a href="https://pypi.org/project/ims-mcp/"><img src="https://img.shields.io/pypi/dm/ims-mcp.svg" alt="Downloads"></a>
    <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.12+-blue.svg" alt="Python 3.12+"></a>
  </p>
</div>

## What is Rosetta

Rosetta gives AI coding agents access to your organization's rules, conventions, and knowledge. It works across IDEs through the MCP protocol, runs locally, and keeps instructions versioned as code.

Every AI interaction follows four phases: **Prepare** (load guardrails and context), **Research** (search the knowledge base), **Plan** (produce a reviewable plan), **Act** (execute with full context).

## Why use it

- **Agents miss context.** They don't know your conventions, architecture, or business rules. Rosetta delivers that context before the agent starts working.
- **Instructions don't transfer.** Every IDE has different formats. Rosetta is agent-agnostic: write once, use everywhere.
- **No governance at scale.** Organizations have no visibility into how AI agents behave. Rosetta adds guardrails, approval gates, and consistency.
- **Onboarding takes too long.** New developers start from scratch. Rosetta onboards a repository in one command.
- **Knowledge stays in people's heads.** Proven patterns aren't shared. Rosetta makes them searchable and reusable across projects.

## How it works

Your IDE connects to the Rosetta MCP server. The server provides semantic search over a knowledge base containing workflows, guardrails, coding conventions, and project context. The coding agent receives instructions from Rosetta and applies them to your code.

Rosetta never sees your source code. It only serves knowledge and instructions to the agent. The agent loads only what it needs per request (progressive disclosure) and follows your organization's workflows.

## Get Started

**Cursor** — add to `~/.cursor/mcp.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

**Claude Code:**

```sh
claude mcp add --transport http Rosetta https://rosetta.evergreen.gcp.griddynamics.net/mcp
```

**Codex:**

```sh
codex mcp add Rosetta --url https://rosetta.evergreen.gcp.griddynamics.net/mcp
codex mcp login Rosetta
```

Complete the OAuth flow when prompted. Then ask: *"Initialize this repository using Rosetta"*

STDIO transport is available for air-gapped environments. [All IDEs and detailed setup](INSTALLATION.md).

## Supported IDEs and Agents

Cursor | Claude Code | VS Code / GitHub Copilot | JetBrains (Copilot, Junie) | Windsurf | Codex | Antigravity | OpenCode

Works with any MCP-compatible tool.

## Documentation

| I want to... | Read |
|---|---|
| Understand what Rosetta is and how to think about it | [OVERVIEW.md](OVERVIEW.md) |
| Set up Rosetta | [QUICKSTART.md](QUICKSTART.md) |
| Understand the system architecture | [ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Navigate the codebase | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) |
| Contribute a change | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Debug a problem | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow and expectations.

## Community

- [Discord](https://discord.gg/QzZ2cWg36g)
- [Website](https://griddynamics.github.io/rosetta/)
- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

## License

See [LICENSE](LICENSE) for details.
