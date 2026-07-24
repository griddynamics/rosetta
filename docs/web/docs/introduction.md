---
layout: docs
title: Introduction
permalink: /docs/introduction/
---

<div align="center">
  <img class="intro-logo intro-logo--dark" src="{{ '/assets/brand/rosetta-logo-full-color-white-text.png' | relative_url }}" alt="Rosetta" width="200">
  <img class="intro-logo intro-logo--light" src="{{ '/assets/brand/rosetta-logo-full-color-black-text.png' | relative_url }}" alt="Rosetta" width="200">
  <p><strong>Engineering governance and context for AI coding agents — shared instructions, architecture, standards, workflows, and guardrails in every session.</strong></p>
  <p>
    <a href="https://pypi.org/project/rosetta-mcp/"><img src="https://img.shields.io/pypi/v/rosetta-mcp.svg" alt="PyPI"></a>
    <a href="https://pypi.org/project/rosetta-mcp/"><img src="https://img.shields.io/pypi/dm/rosetta-mcp.svg" alt="Downloads"></a>
    <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.12+-blue.svg" alt="Python 3.12+"></a>
  </p>
</div>

## What is Rosetta

<table>
  <tr>
    <td width="50%">
      <video src="https://github.com/user-attachments/assets/6df6e217-3e5c-4691-84ed-7440701a87de" controls width="100%"></video>
    </td>
    <td width="50%">
      AI coding agents are powerful, but hard to use consistently across a real team. Rosetta is open-source engineering governance and context for AI coding agents. It works with the tools you already use and loads your team's shared engineering instructions into every session. Everything is versioned in Git and can run inside your perimeter.
    </td>
  </tr>
</table>

Rosetta-guided work follows five phases: **Prepare** (load guardrails and context), **Research** (gather relevant knowledge), **Plan** (produce a reviewable plan), **Act** (execute with full context), and **Validate** (verify with real execution evidence). Read more in the [Usage Guide](/rosetta/docs/usage-guide/#workflows).

## Why use it

- **Context engineering, not prompt hacking.** Agents receive your conventions, architecture, and business rules automatically — structured, versioned, and ready before the first line of code. See [how it fits your workflow](/rosetta/docs/overview/#how-rosetta-fits-into-your-workflow).
- **Write once, run everywhere.** Agent-agnostic design adapts to any IDE and any tech stack. No per-tool maintenance.
- **Guardrails built in.** Approval gates, risk assessment, and data protection ensure consistent AI behavior across teams. See [how Rosetta protects you](/rosetta/docs/usage-guide/#how-rosetta-protects-you).
- **Cross-project intelligence** *(opt-in, self-hosted MCP).* Publish business and technical context from every project into a shared knowledge base. Agents see the system, not just one repo — trace flows across services, catch breaking API changes before they ship, and assess blast radius of any change across the portfolio.
- **One-command onboarding.** New repo, new developer — productive immediately with best practices baked in.
- **Instructions as code.** Prompts version-controlled with release management — single source of truth for all teams.

## How it works

Your IDE loads Rosetta as a plugin — the default, with no server and no live connection needed — or connects to the Rosetta MCP server if your IDE has no plugin or you need centrally-managed instructions. Either way, Rosetta exposes guardrails and common best practices, and provides a menu of available instructions — workflows and coding conventions. The coding agent selects only what it needs for the current task; Rosetta delivers just those, keeping the agent's context lean. By design, no source code or project data reaches Rosetta.

Rosetta is designed to not see your source code or IP. It only serves knowledge and instructions to the agent. The agent loads only what it needs per request (progressive disclosure) and follows your organization's workflows.

## Get Started

| Option                              | Best for                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| **[Plugins](/rosetta/docs/plugins/)** — recommended | Everyone with a supported IDE (Claude Code · Cursor · Copilot · Codex). Files install locally — no server, no live connection needed. |
| **[Hosted MCP](/rosetta/docs/mcps/)** — evaluation only | Try Rosetta with zero setup, or use any other MCP-compatible agent (Devin/Windsurf · Junie · OpenCode). Public demo endpoint — do not point production or sensitive repos at it. |
| **[Self-hosted MCP](/rosetta/docs/deployment/)** — optional | MCP in production: your own MCP server and RAGFlow inside your perimeter. Only needed if you specifically require centrally-managed, always-fresh instructions with nothing copied into repos — most teams don't. |

After installation, ask:

**Greenfield (new repository):**

```
Initialize this repository using the respective Rosetta workflow, this is a new repository, target tech stack: ..., target architecture: ..., business context: ...
```

**Brownfield (existing repository):**

Ask the agent to initialize the repository:

```
Initialize this repository using the respective Rosetta workflow
```

Optionally, add details to that same request. If your workspace contains multiple repositories:

```
Initialize this repository using the respective Rosetta workflow, this is a composite workspace
```

To tell the agent where dead code or existing specs live:

```
Initialize this repository using the respective Rosetta workflow, dead code is in <path>, existing specs are in <path>
```

STDIO transport is available for environments with limited internet access. [All IDEs and detailed setup](/rosetta/docs/installation/). Read more in the [Quick Start](/rosetta/docs/quickstart/).

## Tech Demo

<video src="https://github.com/user-attachments/assets/fc0ef06a-2f9c-49fa-bc05-68001dadd286" controls width="100%"></video>

## Top-5 Common Situations Where Rosetta Helps

- **AI keeps making assumptions and goes too far before checking with you**
  -> use `hitl` skill
  -> the AI asks questions early, stays aligned during the task, and avoids costly rework later

- **AI suggests fixes, but does not really debug the problem**
  -> use `debugging` skill
  -> the AI focuses on evidence, reproduction, and root cause instead of symptom-only patches

- **The task is too large or too complex for one AI agent to handle reliably**
  -> use `orchestration` skill
  -> the AI can delegate work, then review, verify, and reconcile subagent results instead of trusting them blindly

- **You want more than “generate code and hope”**
  -> use `coding-flow` workflow
  -> it adds the parts AI agents usually skip: context first, design before code, approval gates, fresh-context review, and real validation

- **You need to modernize, migrate, or upgrade code without breaking what already works**
  -> use `modernization-flow` workflow
  -> AI agents often struggle with modernization because they rewrite too early and miss cross-project dependencies. This workflow makes them analyze first, map the current system to the target state, and implement in controlled phases

Explore more Rosetta workflows and skills in the [Usage Guide](/rosetta/docs/usage-guide/).

## Supported IDEs and Agents

- Cursor
- Claude Code
- VS Code / GitHub Copilot
- JetBrains (Copilot, Junie)
- Windsurf
- Codex
- Antigravity
- OpenCode

Works with any other IDE too — via a plugin where supported, via MCP otherwise.

## Documentation

| I want to... | Read |
|---|---|
| Understand what Rosetta is and how to think about it | [Overview](/rosetta/docs/overview/) |
| Set up Rosetta | [Quick Start](/rosetta/docs/quickstart/) |
| Learn how to use Rosetta flows | [Usage Guide](/rosetta/docs/usage-guide/) |
| Understand the system architecture | [Architecture](/rosetta/docs/architecture/) |
| Navigate the codebase | [Developer Guide](/rosetta/docs/developer-guide/) |
| Contribute a change | [Contributing](/rosetta/docs/contributing/) |
| Debug a problem | [Troubleshooting](/rosetta/docs/troubleshooting/) |
| Self-host MCP for my organization (optional, rare) | [Deployment](/rosetta/docs/deployment/) |

## Contributing

Contributions welcome. See [Contributing](/rosetta/docs/contributing/) for workflow and expectations.

## Community

- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

## License

See [LICENSE](https://github.com/griddynamics/rosetta/blob/main/LICENSE) for details.
