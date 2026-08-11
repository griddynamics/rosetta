<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/web/assets/brand/rosetta-logo-full-color-white-text.png">
    <img src="docs/web/assets/brand/rosetta-logo-full-color-black-text.png" alt="Rosetta" width="200">
  </picture>
  <p><strong>Engineering governance and context for AI coding agents — shared instructions, architecture, standards, workflows, and guardrails in every session.</strong></p>
  <p>
    <a href="https://pypi.org/project/rosetta-mcp/"><img src="https://img.shields.io/pypi/v/rosetta-mcp.svg" alt="MCP"></a>
    <a href="https://pypi.org/project/rosetta-mcp/"><img src="https://img.shields.io/pypi/dm/rosetta-mcp.svg" alt="Downloads"></a>
    <a href="https://pypi.org/project/rosetta-cli/"><img src="https://img.shields.io/pypi/v/rosetta-cli.svg" alt="CLI"></a>
    <a href="https://pypi.org/project/rosetta-cli/"><img src="https://img.shields.io/pypi/dm/rosetta-cli.svg" alt="Downloads"></a>
    <a href="https://github.com/griddynamics/rosetta/actions/workflows/publish-instructions.yml"><img src="https://github.com/griddynamics/rosetta/actions/workflows/publish-instructions.yml/badge.svg" alt="Instructions"></a>
    <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.12+-blue.svg" alt="Python 3.12+"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License: Apache-2.0"></a>
  </p>
</div>

**Your team's engineering discipline, loaded into every agent session — not another agent, and not another set of IDE rules.**

Rosetta is open-source governance and context for the coding agents you already use: Claude Code, Cursor, Copilot, Codex, Antigravity, and anything else that speaks MCP. It loads your architecture, conventions and constraints before the agent starts, gates the risky steps behind your approval, and keeps all of it versioned in Git inside your perimeter.

**Teach agents how to think, not what to do.** The model already knows Python and React. What it lacks is how your team decides things.

> [!NOTE]
> If you are already writing your own skills and managing agents with processes that work, you probably don't need Rosetta. It earns its place when several people have to get consistent results from the same codebase.

https://github.com/user-attachments/assets/6df6e217-3e5c-4691-84ed-7440701a87de

## Install (10 minutes to your first workflow)

Pick **one** installation path. Installing more than one leaves you with duplicate tools, commands and context, which is worse than not installing at all.

| Path | Best for |
| --- | --- |
| **[Plugins](PLUGINS.md)** — recommended | Anyone on a supported IDE. Files install locally: no server, no live connection |
| **[Hosted MCP](MCPs.md)** — evaluation only | Trying Rosetta with zero setup, or an agent with no plugin. A public demo endpoint — do not point production or sensitive repositories at it |
| **[Self-hosted MCP](docs/mcp/DEPLOYMENT_GUIDE.md)** | Centrally-managed always-fresh instructions with nothing copied into repos. Most teams do not need this |

**1. Install the plugin.** For Claude Code:

```sh
claude plugin marketplace add griddynamics/rosetta
claude plugin install rosetta@rosetta
```

Other IDEs, and the standalone path for environments that block marketplaces: **[PLUGINS.md](PLUGINS.md)**.

**2. Initialize the repository.** Once per repo, then commit the result. Ask your agent:

```
Initialize this repository using the respective Rosetta workflow
```

It reads your stack and writes `TECHSTACK.md`, `CODEMAP.md`, `DEPENDENCIES.md`, `ARCHITECTURE.md` and `CONTEXT.md`, asking you questions as it goes. Add context to that same message to save a round trip — target stack for a new repo, where dead code lives, whether the workspace holds several repositories. **[Setup guide](QUICKSTART.md#step-2-initialize-once-per-repository-and-commit)**.

**3. Restart your session** so the agent picks up the new files, then start a workflow:

```
/coding-flow Add password reset to the auth service
```

**You know it worked when** the agent opens by stating what it understood about your architecture and asks for approval before making changes — instead of editing files immediately.

Before you begin, two things worth knowing. Use a *medium* reasoning model rather than "Auto" — it changes both quality and cost substantially. And if you already run JUXT, Superpowers, GSD or AI-DevKit, they conflict with Rosetta; stay with the one you know.

## Why this exists

### #1: Everyone on the team prompts differently

**The problem.** Each developer builds their own prompts and instructions. The good ones live in someone's scratch file, the rest are reinvented weekly, and nothing survives a person leaving. Two engineers ask the same agent for the same thing and get work that does not look like it came from the same company.

**The fix.** Instructions live in the repository, versioned in Git, loaded into every session automatically. Improving how the agent works becomes a pull request that everyone gets, instead of a tip someone shares in a channel. See **[OVERVIEW.md](OVERVIEW.md)**.

### #2: The agent doesn't know your architecture

**The problem.** An agent handed a task sees a handful of open files. It cannot see the module nobody may import, the service that owns this data, or the convention your team settled on eighteen months ago after getting it wrong. So it infers a plausible design from what is in front of it and implements it confidently.

**The fix.** Initialization writes your architecture, code map, dependencies and domain context into the repository, and Rosetta loads them before work starts. Workflows begin by reading them rather than by guessing — `/code-analysis-flow` builds this understanding for an existing codebase, `/requirements-authoring-flow` pins down what to build before anything is built.

### #3: It does the risky thing without asking

**The problem.** The failures that cost real time are not bad lines of code. They are a migration that ran, a dependency that was swapped, a refactor that spread across forty files — decisions taken silently, discovered at review.

**The fix.** Every workflow follows the same five phases — **Prepare → Research → Plan → Act → Validate** — with approval gates at the points where a decision becomes expensive to reverse. You see the plan before the work, not the diff after it. Guardrails and the gate model: **[USAGE_GUIDE.md](USAGE_GUIDE.md#workflows)**.

### #4: Your setup is locked to one tool

**The problem.** Rules written in one IDE's format do not move. Change tools, or hire someone who uses a different one, and the accumulated knowledge stays behind.

**The fix.** One set of instructions, delivered through plugins or MCP to every supported agent. The instructions are plain files in your repository — you can read them, review them, and take them with you. Nothing about Rosetta requires a live connection to us.

### In short

Shared instructions instead of private prompts, your architecture loaded instead of inferred, approval gates where reversal gets expensive, and none of it tied to one vendor.

## Reference

Workflows split on one axis — **what you are trying to do**. Start any of them by typing the command to your agent.

Before any of them, `/init-workspace-flow` runs once per repository, as in [Install](#install-10-minutes-to-your-first-workflow) above. Everything below assumes it has already run.

### Build and change

| I want to… | Command |
| --- | --- |
| Write a feature, fix a bug, add tests | `/coding-flow` |
| Define what to build before building it | `/requirements-authoring-flow` |
| Handle a small or unusual task | `/adhoc-flow` |

### Test and QA

| I want to… | Command |
| --- | --- |
| Design test cases from a ticket | `/testgen-flow` |
| Automate a UI test | `/ui-aqa-flow` |
| Automate an API test | `/api-aqa-flow` |

### Understand

| I want to… | Command |
| --- | --- |
| Understand an existing codebase | `/code-analysis-flow` |
| Investigate options or compare technologies | `/research-flow` |

### Transform

| I want to… | Command |
| --- | --- |
| Migrate or upgrade a system in phases | `/modernization-flow` |
| Teach the agent an external or private library | `/external-lib-flow` |

### Govern quality

| I want to… | Command |
| --- | --- |
| Run a security review | `/security-flow` |
| Author or adapt agent prompts | `/coding-agents-prompting-flow` |

### When you are stuck

| I want to… | Command |
| --- | --- |
| Find the right workflow | `/help-flow` |
| Diagnose a run that went wrong | `/post-mortem` |

Full descriptions, what each produces, and what you will be asked to approve: **[USAGE_GUIDE.md](USAGE_GUIDE.md#workflows)**.

## Documentation

<details>
<summary><b>Every document, and when to read it</b></summary>

| Read this | When |
| --- | --- |
| **[QUICKSTART.md](QUICKSTART.md)** | You are installing it now |
| **[PLUGINS.md](PLUGINS.md)** · **[MCPs.md](MCPs.md)** | You are picking a delivery mode, or installing one |
| **[INSTALLATION.md](INSTALLATION.md)** | You need every install mode and transport, and every file initialization creates |
| **[CONFIGURATION.md](CONFIGURATION.md)** | You are wiring it to your tools and MCPs |
| **[USAGE_GUIDE.md](USAGE_GUIDE.md)** | You are using it day to day |
| **[OVERVIEW.md](OVERVIEW.md)** | You want the mental model and the design principles |
| **[docs/CONTEXT.md](docs/CONTEXT.md)** | You want why it exists and who it serves, with no technical detail |
| **[ELEVATOR_PITCH.md](ELEVATOR_PITCH.md)** | You are explaining Rosetta to someone else |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** · **[FAQ.md](FAQ.md)** | Something is not working |
| **[CHANGELOG.md](CHANGELOG.md)** | You want to know what changed between releases |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** · **[docs/MCP-ARCHITECTURE.md](docs/MCP-ARCHITECTURE.md)** | You want to know how it is built |
| **[docs/mcp/DEPLOYMENT_GUIDE.md](docs/mcp/DEPLOYMENT_GUIDE.md)** | You are self-hosting MCP and RAGFlow |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** · **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** | You are contributing |
| **[REVIEW.md](REVIEW.md)** | You want the standards a change is evaluated against |
| **[SECURITY.md](SECURITY.md)** | You are reporting a vulnerability, or reviewing our posture |

</details>

## Community and support

- Ask your agent: `/help-flow What can Rosetta help me with?`
- Email: [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)
- Website: <https://griddynamics.github.io/rosetta/>
- Issues and discussions: [github.com/griddynamics/rosetta](https://github.com/griddynamics/rosetta/issues)

## For AI agents

Machine-readable instruction bundle: [`llms-full.txt`](llms-full.txt).

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
