<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/web/assets/brand/rosetta-logo-full-color-white-text.png">
    <img src="docs/web/assets/brand/rosetta-logo-full-color-black-text.png" alt="Rosetta" width="200">
  </picture>
  <p><strong>Meta-prompting, context engineering, and centralized instructions management for AI coding agents</strong></p>
  <p>
    <a href="https://pypi.org/project/ims-mcp/"><img src="https://img.shields.io/pypi/v/ims-mcp.svg" alt="MCP"></a>
    <a href="https://pypi.org/project/ims-mcp/"><img src="https://img.shields.io/pypi/dm/ims-mcp.svg" alt="Downloads"></a>
    <a href="https://pypi.org/project/rosetta-cli/"><img src="https://img.shields.io/pypi/v/rosetta-cli.svg" alt="CLI"></a>
    <a href="https://pypi.org/project/rosetta-cli/"><img src="https://img.shields.io/pypi/dm/rosetta-cli.svg" alt="Downloads"></a>
    <a href="https://github.com/griddynamics/rosetta/actions/workflows/publish-ims-mcp.yml"><img src="https://github.com/griddynamics/rosetta/actions/workflows/publish-ims-mcp.yml/badge.svg" alt="Rosetta MCP"></a>
    <a href="https://github.com/griddynamics/rosetta/actions/workflows/publish-rosetta-cli.yml"><img src="https://github.com/griddynamics/rosetta/actions/workflows/publish-rosetta-cli.yml/badge.svg" alt="Rosetta CLI"></a>
    <a href="https://github.com/griddynamics/rosetta/actions/workflows/publish-instructions.yml"><img src="https://github.com/griddynamics/rosetta/actions/workflows/publish-instructions.yml/badge.svg" alt="Instructions"></a>
    <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.12+-blue.svg" alt="Python 3.12+"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License: Apache-2.0"></a>
  </p>
</div>

## What is Rosetta

Rosetta is a meta-prompting, context engineering, and centralized knowledge management for AI coding agents. It provides structured context - rules, skills, workflows, and sub-agents - guiding AI systems to operate with a deep understanding of system architecture, domain constraints, and engineering standards. Rosetta also accelerates project onboarding by reverse-engineering architecture and domain context, improving the reliability and consistency of AI-generated code.

Every AI interaction follows four phases: **Prepare** (load guardrails and context), **Research** (search the knowledge base), **Plan** (produce a reviewable plan), **Act** (execute with full context). Read more in the [Usage Guide](USAGE_GUIDE.md#workflows).

## Why use it

- **Context engineering, not prompt hacking.** Agents receive your conventions, architecture, and business rules automatically — structured, versioned, and ready before the first line of code. See [how it fits your workflow](OVERVIEW.md#how-rosetta-fits-into-your-workflow).
- **Write once, run everywhere.** Agent-agnostic design adapts to any IDE and any tech stack. No per-tool maintenance.
- **Guardrails built in.** Approval gates, risk assessment, and data protection ensure consistent AI behavior across teams. See [how Rosetta protects you](USAGE_GUIDE.md#how-rosetta-protects-you).
- **Cross-project intelligence** *(opt-in).* Publish business and technical context from every project into a shared knowledge base. Agents see the system, not just one repo — trace flows across services, catch breaking API changes before they ship, and assess blast radius of any change across the portfolio.
- **One-command onboarding.** New repo, new developer — productive immediately with best practices baked in.
- **Instructions as code.** Prompts version-controlled with release management — single source of truth for all teams.

## How it works

Your IDE connects to the Rosetta MCP server. The server exposes guardrails and common best practices, and provides a menu of available instructions — workflows and coding conventions. The coding agent selects only what it needs for the current task; Rosetta delivers just those, keeping the agent's context lean. By design, no source code or project data reaches Rosetta.

Rosetta is designed to not see your source code. It only serves knowledge and instructions to the agent. The agent loads only what it needs per request (progressive disclosure) and follows your organization's workflows.

Rosetta is engineered to prevent the unintentional transmission of sensitive data through the following architectural controls:
- **Deterministic Instruction Serving**: Instructions are delivered as MCP resources in a strictly deterministic manner. By eliminating the need for semantic search, coding agents are never required to transmit source code or sensitive context to Rosetta to retrieve instructions.
- **Read-Only Default State**: "Write" mode is disabled and hidden by default. Enabling write capabilities requires an explicit, intentional configuration at deployment, ensuring that data persistence remains entirely outside of the end-user's control.
- **Schema-Strict Input Validation**: All MCP tool inputs undergo rigorous validation against predefined schemas. This ensures the system rejects any unexpected payloads or "over-sharing" of data that does not match the required parameters.

## Get Started

**Cursor** — add to `~/.cursor/mcp.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "Rosetta": {
      "url": "<rosetta MCP production server URL>"
    }
  }
}
```

**Claude Code:**

```sh
claude mcp add --transport http Rosetta <rosetta MCP production server URL>
```

**Codex:**

```sh
codex mcp add Rosetta --url <rosetta MCP production server URL>
codex mcp login Rosetta
```

Complete the OAuth flow when prompted. Then ask: *"Initialize this repository using Rosetta"*

STDIO transport is available for air-gapped environments. [All IDEs and detailed setup](INSTALLATION.md). Read more in the [Quickstart](QUICKSTART.md).

## Supported IDEs and Agents

Cursor | Claude Code | VS Code / GitHub Copilot | JetBrains (Copilot, Junie) | Windsurf | Codex | Antigravity | OpenCode

Works with any MCP-compatible tool.

## Documentation

| I want to... | Read |
|---|---|
| Understand what Rosetta is and how to think about it | [OVERVIEW.md](OVERVIEW.md) |
| Set up Rosetta | [QUICKSTART.md](QUICKSTART.md) |
| Learn how to use Rosetta flows | [USAGE_GUIDE.md](USAGE_GUIDE.md) |
| Deploy Rosetta for my organization | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) |
| Understand the system architecture | [ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Navigate the codebase | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) |
| Contribute a change | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Debug a problem | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| See release history | [CHANGELOG.md](CHANGELOG.md) |
| Security Policy | [SECURITY.md](SECURITY.md) |

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow and expectations.

## Community

- [Discord](https://discord.gg/QzZ2cWg36g)
- [Website](https://griddynamics.github.io/rosetta/)
- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

## Notice

> [!WARNING]
> Rosetta is intended for legitimate software engineering workflows.
> Users are responsible for ensuring their use complies with applicable laws, regulations, and contractual obligations.

## License

See [LICENSE](LICENSE) for details.
