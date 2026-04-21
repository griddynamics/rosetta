---
layout: docs
title: Introduction
permalink: /docs/introduction/
---

<div align="center">
  <img class="intro-logo intro-logo--dark" src="{{ '/assets/brand/rosetta-logo-full-color-white-text.png' | relative_url }}" alt="Rosetta" width="200">
  <img class="intro-logo intro-logo--light" src="{{ '/assets/brand/rosetta-logo-full-color-black-text.png' | relative_url }}" alt="Rosetta" width="200">
  <p><strong>Meta-prompting, context engineering, and centralized instructions management for AI coding agents</strong></p>
  <p>
    <a href="https://pypi.org/project/ims-mcp/"><img src="https://img.shields.io/pypi/v/ims-mcp.svg" alt="PyPI"></a>
    <a href="https://pypi.org/project/ims-mcp/"><img src="https://img.shields.io/pypi/dm/ims-mcp.svg" alt="Downloads"></a>
    <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.12+-blue.svg" alt="Python 3.12+"></a>
  </p>
</div>

## What is Rosetta

Rosetta is a meta-prompting, context engineering, and centralized knowledge management for AI coding agents. It provides structured context - rules, skills, workflows, and sub-agents - guiding AI systems to operate with a deep understanding of system architecture, domain constraints, and engineering standards. Rosetta also accelerates project onboarding by reverse-engineering architecture and domain context, improving the reliability and consistency of AI-generated code.

Every AI interaction follows four phases: **Prepare** (load guardrails and context), **Research** (search the knowledge base), **Plan** (produce a reviewable plan), **Act** (execute with full context). Read more in the [Usage Guide](/rosetta/docs/usage-guide/#workflows).

## Why use it

- **Context engineering, not prompt hacking.** Agents receive your conventions, architecture, and business rules automatically — structured, versioned, and ready before the first line of code. See [how it fits your workflow](/rosetta/docs/overview/#how-rosetta-fits-into-your-workflow).
- **Write once, run everywhere.** Agent-agnostic design adapts to any IDE and any tech stack. No per-tool maintenance.
- **Guardrails built in.** Approval gates, risk assessment, and data protection ensure consistent AI behavior across teams. See [how Rosetta protects you](/rosetta/docs/usage-guide/#how-rosetta-protects-you).
- **Cross-project intelligence** *(opt-in).* Publish business and technical context from every project into a shared knowledge base. Agents see the system, not just one repo — trace flows across services, catch breaking API changes before they ship, and assess blast radius of any change across the portfolio.
- **One-command onboarding.** New repo, new developer — productive immediately with best practices baked in.
- **Instructions as code.** Prompts version-controlled with release management — single source of truth for all teams.

## How it works

Your IDE connects to the Rosetta MCP server. The server exposes guardrails and common best practices, and provides a menu of available instructions — workflows and coding conventions. The coding agent selects only what it needs for the current task; Rosetta delivers just those, keeping the agent's context lean. By design, no source code or project data reaches Rosetta.

Rosetta is designed to not see your source code or IP. It only serves knowledge and instructions to the agent. The agent loads only what it needs per request (progressive disclosure) and follows your organization's workflows.

## Get Started

**Cursor** — add to `~/.cursor/mcp.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "Rosetta": {
      "url": "[rosetta MCP production server URL]"
    }
  }
}
```

**Claude Code:**

```sh
claude mcp add --transport http Rosetta [rosetta MCP production server URL]
```

**Codex:**

```sh
codex mcp add Rosetta --url [rosetta MCP production server URL]
codex mcp login Rosetta
```

Complete the OAuth flow when prompted. Then ask: *"Initialize this repository using Rosetta"*

STDIO transport is available for air-gapped environments. [All IDEs and detailed setup](/rosetta/docs/installation/). Read more in the [Quickstart](/rosetta/docs/quickstart/).

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
| Understand what Rosetta is and how to think about it | [Overview](/rosetta/docs/overview/) |
| Set up Rosetta | [Quick Start](/rosetta/docs/quickstart/) |
| Learn how to use Rosetta flows | [Usage Guide](/rosetta/docs/usage-guide/) |
| Deploy Rosetta for my organization | [Deployment](/rosetta/docs/deployment/) |
| Understand the system architecture | [Architecture](/rosetta/docs/architecture/) |
| Navigate the codebase | [Developer Guide](/rosetta/docs/developer-guide/) |
| Contribute a change | [Contributing](/rosetta/docs/contributing/) |
| Debug a problem | [Troubleshooting](/rosetta/docs/troubleshooting/) |

## Contributing

Contributions welcome. See [Contributing](/rosetta/docs/contributing/) for workflow and expectations.

## Community

- [Discord](https://discord.gg/QzZ2cWg36g)
- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

## License

See [LICENSE](https://github.com/griddynamics/rosetta/blob/main/LICENSE) for details.
