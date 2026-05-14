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

Rosetta gives your AI coding agent your team's context — architecture, conventions, business rules — automatically, in every IDE.

After installing it, you type something like *"Add password reset to the customer portal"*. Instead of a generic implementation, you get a spec + plan that already understands your codebase, with explicit approval gates before any code is written.

Works with Claude Code, Cursor, VS Code Copilot, JetBrains, Codex, Windsurf, OpenCode, and any MCP-compatible tool.

## Supported IDEs and Agents

Cursor | Claude Code | VS Code / GitHub Copilot | JetBrains (Copilot, Junie) | Windsurf | Codex | Antigravity | OpenCode | Gemini CLI

Works with any MCP-compatible tool.

## Why use it

- **Plan first, code after approval.** Before any code is written, Rosetta produces a spec + plan you explicitly approve. Same goes before tests run. No autonomous runaway.
- **One config, every IDE.** Add one MCP endpoint (or install the plugin) — same conventions and guardrails apply in Claude Code, Cursor, Copilot, JetBrains, and the rest.
- **Conventions enforced automatically.** Your `CONTEXT.md`, `ARCHITECTURE.md`, and project rules load into every relevant request. The agent stops fabricating patterns and starts following yours.
- **Designed not to see your code.** Rosetta serves instructions only — source code never reaches it. See [How it works](#how-it-works) below for the architectural controls.

*Need cross-repo intelligence (trace flows across services, catch breaking API changes early)? See [Cross-Project Context](USAGE_GUIDE.md#cross-project-context) — opt-in via your Rosetta server.*

## How it works

Rosetta provides a menu of instructions — workflows, guardrails, project conventions. Your AI agent picks only what the current task needs, loads it, and runs. Rosetta never sees your source code or project data.

Two delivery paths, same content:

- **Plugin (preferred — most clients prefer this).** Bundles instructions directly into your IDE or repo. No live connection to Rosetta needed at request time. Available for Claude Code, VS Code Copilot, JetBrains, Codex.
- **MCP server (fallback).** Your IDE connects to Rosetta over HTTP and pulls instructions on demand. Works with any MCP-compatible IDE.

For architectural controls and the threat model, see [SECURITY.md](SECURITY.md).

## Get Started

> **Use a strong model.** Sonnet 4.6, GPT-5.3-codex-medium, gemini-3.1-pro, or better. Avoid Auto — weaker models silently skip Rosetta's tools.

### Option A — Install the plugin (recommended)

| IDE                          | Command                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Claude Code**              | `claude plugin marketplace add griddynamics/rosetta` then `claude plugin install core@rosetta`                      |
| **VS Code / GitHub Copilot** | Install `core-copilot` via VS Code Copilot Plugins                                                                  |
| **JetBrains / Copilot**      | Zip + manual config — see [INSTALLATION.md](INSTALLATION.md#plugin-based-installation)                              |
| **Codex**                    | Zip + `codex features enable codex_hooks` — see [INSTALLATION.md](INSTALLATION.md#plugin-based-installation)        |

### Option B — Connect via MCP (fallback for IDEs without a plugin)

**Claude Code:**

```sh
claude mcp add --transport http Rosetta https://mcp.rosetta.griddynamics.net/mcp
```

Then run `claude`, type `/mcp` → Rosetta → **Authenticate**.

**Cursor / Windsurf** — `~/.cursor/mcp.json`:

```json
{ "mcpServers": { "Rosetta": { "url": "https://mcp.rosetta.griddynamics.net/mcp" } } }
```

**VS Code / Copilot** — `.vscode/mcp.json`:

```json
{ "servers": { "Rosetta": { "url": "https://mcp.rosetta.griddynamics.net/mcp" } } }
```

**Codex:**

```sh
codex mcp add Rosetta --url https://mcp.rosetta.griddynamics.net/mcp && codex mcp login Rosetta
```

Other IDEs and STDIO transport: see [INSTALLATION.md](INSTALLATION.md). Any MCP-compatible tool can connect using the same endpoint.

**Then add the bootstrap rule (MCP mode only).** Some IDEs don't reliably invoke MCP tools on their own. Download [bootstrap.md](https://github.com/griddynamics/rosetta/blob/main/instructions/r2/core/rules/bootstrap.md?plain=1) and place it where your IDE looks for instructions (e.g. `.claude/claude.md`, `.cursor/rules/bootstrap.mdc`, `.github/copilot-instructions.md`). Full path table in [QUICKSTART.md](QUICKSTART.md).

### Verify and initialize

In your IDE, ask:

```text
What can you do, Rosetta?
```

You should see Rosetta's workflow list. Then, once per repo:

```text
Initialize this repository using Rosetta
```

This generates your `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, and friends. Restart the chat after init so the new context loads.

For details and troubleshooting, see [QUICKSTART.md](QUICKSTART.md) and [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Documentation

| I want to... | Read |
|---|---|
| Understand what Rosetta is and how to think about it | [OVERVIEW.md](OVERVIEW.md) |
| See the full setup guide (all IDEs, troubleshooting) | [QUICKSTART.md](QUICKSTART.md) |
| Learn how to use Rosetta workflows | [USAGE_GUIDE.md](USAGE_GUIDE.md) |
| Deploy Rosetta for my organization | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) |
| Understand the system architecture | [ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Navigate the codebase | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) |
| Contribute a change | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Debug a problem | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| Read the security policy | [SECURITY.md](SECURITY.md) |
| See release history | [CHANGELOG.md](CHANGELOG.md) |

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow and expectations.

## Community

- [Website](https://griddynamics.github.io/rosetta/)
- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

## Notice

> [!WARNING]
> Rosetta is intended for legitimate software engineering workflows.
> Users are responsible for ensuring their use complies with applicable laws, regulations, and contractual obligations.

## License

See [LICENSE](LICENSE) for details.
