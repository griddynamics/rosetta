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

Rosetta is an open-source instruction-management system for AI coding agents. It plugs into your IDE and delivers your team's context — architecture, conventions, business rules, workflows, guardrails — automatically, on every request.

After installing it, you type something like *"Add password reset to the customer portal"*. Instead of a generic implementation, the agent:

1. Drafts a **spec** at `plans/password-reset/password-reset-SPECS.md` describing what to build: which files change, the APIs and data involved, and how you'll know it's done — using your team's architecture and conventions, not generic patterns.
2. Drafts a **plan** at `plans/password-reset/password-reset-PLAN.md` describing how to build it: ordered steps and review checkpoints.
3. Stops at each **approval gate** and waits for explicit confirmation. Say `"Yes, I reviewed the plan"` to start implementation, `"Yes, I approve the implementation"` to finalize.

## Supported coding agents

| Coding agent | Plugin | MCP |
|---|---|---|
| Claude Code | ✓ | ✓ |
| Cursor | ✓ | ✓ |
| GitHub Copilot | ✓ | ✓ |
| Junie | ✓ | ✓ |
| Codex | ✓ | ✓ |
| Windsurf | — | ✓ |
| Antigravity | — | ✓ |
| OpenCode | — | ✓ |
| Gemini CLI | — | ✓ |
| AWS Code | — | ✓ |

> [!NOTE]
> Plugin is bundled locally, no live connection needed. 
> MCP connects to Rosetta over HTTP on each request. 
> Any other MCP-compatible tool can connect using the same endpoint.

## Who is Rosetta for

Mid-level, senior engineers and team-leads working in a multi-user environment with enterprise codebases. Team size doesn't matter — 1 person or 10+. What matters is that the codebase is large enough that one person can't hold all of it, and you ship to real environments where mistakes have real consequences.

You've used AI coding agents but haven't built your own harness of skills, workflows, and guardrails around them. You want to ship product, not maintain your own prompts.

## Why use it

- **Plan first, code after approval.** Before any code is written, Rosetta produces a spec + plan you explicitly approve. Same goes before tests run. No autonomous runaway.
- **One config, every agent.** Add one MCP endpoint (or install the plugin) — same conventions and guardrails apply in Claude Code, Cursor, Copilot, Junie, Codex, and the rest.
- **Conventions enforced automatically.** Your team's architecture, patterns, and project rules load into every relevant request. The agent stops fabricating patterns and starts following yours.
- **Designed not to see your code.** Rosetta serves instructions only — source code never reaches it. See How it works below for the architectural controls.

*Need cross-repo intelligence (trace flows across services, catch breaking API changes early)? See [USAGE_GUIDE.md](USAGE_GUIDE.md) — opt-in via your Rosetta server.*

## How it works

Rosetta provides a menu of instructions — workflows, guardrails, project conventions. Your AI agent picks only what the current task needs, loads it, and runs. Rosetta never sees your source code or project data.

Two delivery paths, same content:

- **Plugin (preferred).** Bundles instructions directly into your IDE or repo. No live connection to Rosetta needed at request time. Available for Claude Code, Cursor, GitHub Copilot, Junie, and Codex.
- **MCP server (fallback).** Your client connects to Rosetta over HTTP and pulls instructions on demand. Works with any MCP-compatible client.

For architectural controls and the threat model, see [SECURITY.md](SECURITY.md).

## Get started

1. **Install** — plugin is recommended ([PLUGINS.md](PLUGINS.md)). For MCP, STDIO, and offline modes, refer to [INSTALLATION.md](INSTALLATION.md).
2. **First session** — to verify Rosetta loaded, initialize the repo, and complete a task, refer to [QUICKSTART.md](QUICKSTART.md).
3. **Contribute** — to make your first contribution, refer to [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

| I want to... | Read |
|---|---|
| Understand what Rosetta is and how to think about it | [OVERVIEW.md](OVERVIEW.md) |
| Read the business case (why Rosetta exists, value per role) | [CONTEXT.md](docs/CONTEXT.md) |
| Look up a Rosetta-specific term | [TERMINOLOGY.md](TERMINOLOGY.md) |
| Run my first session (verify, init, first task) | [QUICKSTART.md](QUICKSTART.md) |
| Learn how to use Rosetta workflows | [USAGE_GUIDE.md](USAGE_GUIDE.md) |
| Deploy Rosetta for my organization | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) |
| Understand the system architecture | [ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Navigate the codebase | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) |
| Contribute a change | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Get answers to common questions | [FAQ.md](FAQ.md) |
| Debug a problem | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| Read the security policy | [SECURITY.md](SECURITY.md) |
| See release history | [CHANGELOG.md](CHANGELOG.md) |

## Community

- [Website](https://griddynamics.github.io/rosetta/)
- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

## Notice

> [!WARNING]
> Rosetta is intended for legitimate software engineering workflows.
> Users are responsible for ensuring their use complies with applicable laws, regulations, and contractual obligations.

## License

See [LICENSE](LICENSE) for details.
