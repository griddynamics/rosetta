---
layout: docs
title: Introduction
permalink: /docs/introduction/
---

<div align="center">
  <img class="intro-logo intro-logo--dark" src="{{ '/assets/brand/rosetta-logo-full-color-white-text.png' | relative_url }}" alt="Rosetta" width="200">
  <img class="intro-logo intro-logo--light" src="{{ '/assets/brand/rosetta-logo-full-color-black-text.png' | relative_url }}" alt="Rosetta" width="200">
  <p><strong>Consulting control plane for AI coding agents</strong></p>
  <p>
    <a href="https://pypi.org/project/ims-mcp/"><img src="https://img.shields.io/pypi/v/ims-mcp.svg" alt="PyPI"></a>
    <a href="https://pypi.org/project/ims-mcp/"><img src="https://img.shields.io/pypi/dm/ims-mcp.svg" alt="Downloads"></a>
    <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.12+-blue.svg" alt="Python 3.12+"></a>
  </p>
</div>

## What is Rosetta

Rosetta is a consulting control plane for AI coding agents. It consults them with versioned, expert-prepared instructions so every agent follows your organization's rules, conventions, and knowledge. Works across IDEs, runs locally, and keeps instructions versioned as code.

Every AI interaction follows four phases: **Prepare** (load guardrails and context), **Research** (search the knowledge base), **Plan** (produce a reviewable plan), **Act** (execute with full context). Read more in the [Usage Guide](/docs/usage-guide/#workflows).

## Why use it

- **Context engineering, not prompt hacking.** Agents receive your conventions, architecture, and business rules automatically — structured, versioned, and ready before the first line of code. See [how it fits your workflow](/docs/overview/#how-rosetta-fits-into-your-workflow).
- **Write once, run everywhere.** Agent-agnostic design adapts to any IDE and any tech stack. No per-tool maintenance.
- **Guardrails built in.** Approval gates, risk assessment, and data protection ensure consistent AI behavior across teams. See [how Rosetta protects you](/docs/usage-guide/#how-rosetta-protects-you).
- **Cross-project intelligence.** Publish business and technical context from every project into a shared knowledge base. Agents see the system, not just one repo — trace flows across services, catch breaking API changes before they ship, and assess blast radius of any change across the portfolio.
- **One-command onboarding.** New repo, new developer — productive immediately with best practices baked in.
- **Instructions as code.** Prompts version-controlled with release management — single source of truth for all teams.

## How it works

Your IDE connects to the Rosetta MCP server. The server transforms, bundles, and contextualizes knowledge from workflows, guardrails, coding conventions, and project context. The coding agent receives structured instructions from Rosetta and applies them to your code.

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

STDIO transport is available for air-gapped environments. [All IDEs and detailed setup](/docs/installation/). Read more in the [Quickstart](/docs/quickstart/).

## Supported IDEs and Agents

- Cursor
- Claude Code
- VS Code / GitHub Copilot
- JetBrains (Copilot, Junie)
- Windsurf
- Codex
- Antigravity
- OpenCode

Works with any MCP-compatible tool.

## Documentation

| I want to... | Read |
|---|---|
| Understand what Rosetta is and how to think about it | [Overview](/docs/overview/) |
| Set up Rosetta | [Quick Start](/docs/quickstart/) |
| Learn how to use Rosetta flows | [Usage Guide](/docs/usage-guide/) |
| Deploy Rosetta for my organization | [Deployment](/docs/deployment/) |
| Understand the system architecture | [Architecture](/docs/architecture/) |
| Navigate the codebase | [Developer Guide](/docs/developer-guide/) |
| Contribute a change | [Contributing](/docs/contributing/) |
| Debug a problem | [Troubleshooting](/docs/troubleshooting/) |

## Contributing

Contributions welcome. See [Contributing](/docs/contributing/) for workflow and expectations.

## Community

- [Discord](https://discord.gg/QzZ2cWg36g)
- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

## License

See [LICENSE](https://github.com/griddynamics/rosetta/blob/main/LICENSE) for details.
