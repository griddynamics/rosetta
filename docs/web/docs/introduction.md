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
    <a href="https://github.com/griddynamics/rosetta/releases/latest"><img src="https://img.shields.io/github/v/release/griddynamics/rosetta" alt="Latest release"></a>
    <a href="https://github.com/griddynamics/rosetta/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License: Apache-2.0"></a>
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

**Teach agents how to think, not what to do.** The model already knows every programming language. What it lacks is your engineering discipline. That is what Rosetta encodes. Rosetta itself does not see your source code (your agent and its model provider still do): [Security posture](https://github.com/griddynamics/rosetta/blob/main/docs/SecurityOnePager.md).

> [!NOTE]
> Rosetta pays off when a team wants one consistent way of working. More: [Why Rosetta](/rosetta/docs/why/).

For example, you ask: "Add rate limiting to the checkout API".

| Without Rosetta | With Rosetta |
| --- | --- |
| Jumps straight into editing the handler | Reads `ARCHITECTURE.md` and your existing conventions first |
| Misses the shared middleware, duplicates the Redis client | Reuses the shared rate-limiter and Redis layer |
| No plan, no checkpoint | Proposes a plan and asks for approval |
| Ships without running tests | Runs the integration tests, then a fresh-context reviewer validates |

## [Quick Start](/rosetta/docs/quickstart/)

On company code? Get approval from your manager and company first.

Up and running in three steps:

**1. Install** the plugin. In your terminal (Claude Code):

```sh
claude plugin marketplace add griddynamics/rosetta
claude plugin install rosetta@rosetta
```

**2. Initialize** your repository (once). Type this in your agent's chat as a plain sentence:

```text
Initialize this repository using the respective Rosetta workflow
```

Then start a new session.

**3. Run** your first task:

```text
/coding-flow Add password reset to the auth service
```

**[Open the full Quick Start](/rosetta/docs/quickstart/)**

## How it works

```text
Install  →  Initialize your repo (once)  →  Run a workflow: /coding-flow <your task>

Every workflow:   Prepare → Research → Plan → Act → Validate
                                         ↑
                           you approve the plan before any code is written
```

Instructions are layered: Rosetta core, then your organization, then your project. Teams customize without forking. Terminology and design principles: [Overview](/rosetta/docs/overview/).

## [User Guide](/rosetta/user-guide/)

Rosetta-guided work follows five phases — **Prepare → Research → Plan → Act → Validate** — with approval gates at the key decision points.

Read more in the [User Guide](/rosetta/user-guide/).

## Tech Demo: Init and Coding

<video src="https://github.com/user-attachments/assets/fc0ef06a-2f9c-49fa-bc05-68001dadd286" controls width="100%"></video>

## Tech Demo: Frontend Migration

<video src="https://github.com/user-attachments/assets/8a48ce2e-a8f6-4d80-a208-4e808ab502df" controls width="100%"></video>

## Supported IDEs and Agents

- Cursor
- Claude Code
- VS Code / GitHub Copilot
- JetBrains (Copilot, Junie)
- Windsurf
- Codex
- Antigravity
- OpenCode

Works with any other IDE too: via a plugin where supported, via MCP otherwise.

## Documentation

- **Use Rosetta:** [User Guide](/rosetta/user-guide/) · [Workflows and skills](/rosetta/docs/catalog/) · [Example prompts](/rosetta/docs/quickstart/) · [Usage Guide](/rosetta/docs/usage-guide/) · [Configuration](/rosetta/docs/configuration/)
- **Install other ways:** [Plugins](/rosetta/docs/plugins/) · [MCP (optional)](/rosetta/docs/mcps/) · [Installation reference](/rosetta/docs/installation/) (MCP, offline)
- **Understand:** [Overview](/rosetta/docs/overview/) · [Why Rosetta](/rosetta/docs/why/) · [Architecture](/rosetta/docs/architecture/)
- **Something went wrong:** [Troubleshooting](/rosetta/docs/troubleshooting/) · [FAQ](/rosetta/docs/faq/) · run `/post-mortem` in your agent
- **Contribute:** [Contributing](/rosetta/docs/contributing/) · [Developer Guide](/rosetta/docs/developer-guide/) · [Review standards](/rosetta/docs/review/). Tip: use the Rosetta plugins to develop Rosetta.
- **Organizations:** [Security](https://github.com/griddynamics/rosetta/blob/main/SECURITY.md) · [Security posture](https://github.com/griddynamics/rosetta/blob/main/docs/SecurityOnePager.md) · [Self-hosted MCP](/rosetta/docs/deployment/) (optional, rare)
- **Releases:** [Changelog](https://github.com/griddynamics/rosetta/blob/main/CHANGELOG.md)

Questions: [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com) · [issues](https://github.com/griddynamics/rosetta/issues)

Licensed under Apache-2.0 ([LICENSE](https://github.com/griddynamics/rosetta/blob/main/LICENSE)).
