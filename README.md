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

**Teach agents how to think, not what to do.** The model already knows Python and React. What it lacks is how your team decides things. Rosetta ships with 40 preloaded skills (guardrails, questioning, reasoning, security, debugging, and more) and 14 multi-phase workflows that cover everything from coding to requirements authoring to security reviews — tested patterns from real projects, ready to use.

> [!NOTE]
> If you are already writing your own skills and managing agents with processes that work, you probably don't need Rosetta. It earns its place when several people have to get consistent results from the same codebase.

https://github.com/user-attachments/assets/6df6e217-3e5c-4691-84ed-7440701a87de

## Install (10 minutes to your first workflow)

**1. Install the plugin.** Files install locally — no server, no live connection at request time. Install for **one** agent only: two installations leave you with duplicate tools, commands and context, which is worse than not installing at all.

<details>
<summary><b>Claude Code</b> — marketplace</summary>

```sh
claude plugin marketplace add griddynamics/rosetta
claude plugin install rosetta@rosetta
```

</details>

<details>
<summary><b>Cursor</b> — marketplace or standalone</summary>

Cursor detects Claude Code plugins automatically. If you already installed there, you are done — do not install again here.

**Marketplace** (needs a Teams or Enterprise plan): import `https://github.com/griddynamics/rosetta` into your team marketplace, following [Cursor's team marketplace docs](https://cursor.com/docs/plugins#team-marketplaces).

**Standalone:** download `core-cursor-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest), extract it into your repository, then check that `.cursor/agents/architect.md` exists and that there is no `.cursor/.cursor` folder.

</details>

<details>
<summary><b>GitHub Copilot</b> (VS Code, JetBrains) — marketplace or standalone</summary>

**Marketplace:** add `https://github.com/griddynamics/rosetta` to `chat.plugins.marketplaces` in VS Code settings, or to the same setting under the Copilot plugin in JetBrains. Then open the Copilot chat panel → gear icon → **Browse Marketplaces** → install `rosetta`.

**Standalone:** download `core-copilot-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest) and extract it into your repository. If `.github/copilot-instructions.md` already exists, merge rather than overwrite — Rosetta first, your original content after. Then check that `.github/agents/architect.agent.md` exists and that there is no `.github/.github` folder.

Do not combine the two: VS Code detects the standalone install as well, and you get everything twice.

</details>

<details>
<summary><b>Codex</b> — standalone only</summary>

Download `core-codex-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest), extract it into your repository, then enable hooks:

```sh
codex features enable hooks
```

Codex plugins currently support hooks, MCPs and skills only.

</details>

<details>
<summary><b>Antigravity</b> (2.0, CLI, IDE) — standalone only</summary>

One plugin serves all three surfaces. Download `core-antigravity-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest), create `.agents/plugins/rosetta/` at your workspace root, and extract the archive into it. Then check that `.agents/plugins/rosetta/plugin.json` exists and that there is no nested `core-antigravity` folder.

For every workspace instead of one, extract into `~/.gemini/config/plugins/rosetta/` — same contents.

</details>

**2. Initialize the repository.** Once per repo, then commit the result. Ask your agent:

```
Initialize this repository using the respective Rosetta workflow
```

It reads your stack and writes `TECHSTACK.md`, `CODEMAP.md`, `DEPENDENCIES.md`, `ARCHITECTURE.md` and `CONTEXT.md`, asking you questions as it goes. Add context to that same message to save a round trip — target stack for a new repo, where dead code lives, whether the workspace holds several repositories.

**3. Restart your session** so the agent picks up the new files, then start a workflow. A few examples:

```
/coding-flow Add password reset to the auth service
/requirements-authoring-flow Extract detailed requirements from the ticket
/security-flow Run a security review of the auth module
```

See the **[Workflows](#workflows)** section below for the full reference.

**You know it worked when** the agent opens by stating what it understood about your architecture and asks for approval before making changes — instead of editing files immediately.

> [!TIP]
> **Before you begin:** Pick the model deliberately — Sonnet 5 medium, GPT-5.4-medium, gemini-3.1-pro or newer, and avoid Auto selection; it changes both quality and cost substantially. And if you already run JUXT, Superpowers, GSD or AI-DevKit, they conflict with Rosetta; stay with the one you know.

## Workflows

Workflows split on one axis — **what you are trying to do**. Start any of them by typing the command to your agent.

**Build and change**

| I want to… | Command |
| --- | --- |
| Write a feature, fix a bug, add tests | `/coding-flow` |
| Define what to build before building it | `/requirements-authoring-flow` |
| Handle a small or unusual task | `/adhoc-flow` |

**Test and QA**

| I want to… | Command |
| --- | --- |
| Design test cases from a ticket | `/testgen-flow` |
| Automate a UI test | `/ui-aqa-flow` |
| Automate an API test | `/api-aqa-flow` |

**Understand**

| I want to… | Command |
| --- | --- |
| Understand an existing codebase | `/code-analysis-flow` |
| Investigate options or compare technologies | `/research-flow` |

**Transform**

| I want to… | Command |
| --- | --- |
| Migrate or upgrade a system in phases | `/modernization-flow` |
| Teach the agent an external or private library | `/external-lib-flow` |

**Govern quality**

| I want to… | Command |
| --- | --- |
| Run a security review | `/security-flow` |
| Author or adapt agent prompts | `/coding-agents-prompting-flow` |

**When you are stuck**

| I want to… | Entry point |
| --- | --- |
| Find the right workflow | `/help-flow` |
| Diagnose a run that went wrong | the `post-mortem` skill |

Full descriptions, what each produces, and what you will be asked to approve: **[USAGE_GUIDE.md](USAGE_GUIDE.md#workflows)**.

## Skills

Workflows are what you type. Skills are what Rosetta brings in on its own, and the split matters: a skill declares the conditions under which it must activate, so it engages when the situation matches rather than when someone remembers it exists. That is why the guardrails hold on a Friday evening.

Six you will actually notice, because they interrupt you:

| Skill | Activates when |
| --- | --- |
| **[hitl](instructions/r3/core/skills/hitl/SKILL.md)** | Always. It owns the approval gates and the questioning rounds — the reason the agent asks before acting |
| **[sensitive-data](instructions/r3/core/skills/sensitive-data/SKILL.md)** | Anything that might be a secret, credential or PII is about to be read, written or echoed |
| **[dangerous-actions](instructions/r3/core/skills/dangerous-actions/SKILL.md)** | An action, or its consequence, could be destructive or irreversible |
| **[risk-assessment](instructions/r3/core/skills/risk-assessment/SKILL.md)** | The environment can reach databases, cloud services, or anything above local |
| **[deviation](instructions/r3/core/skills/deviation/SKILL.md)** | Intent is unclear, something came as a surprise, or you asked to undo |
| **[self-learning](instructions/r3/core/skills/self-learning/SKILL.md)** | A run failed, or produced something other than what you asked for |

A few are meant to be invoked deliberately: **[post-mortem](instructions/r3/core/skills/post-mortem/SKILL.md)** root-causes a run that disappointed you and can file a sanitized issue with your approval, **[reasoning](instructions/r3/core/skills/reasoning/SKILL.md)** forces structured thinking on a hard problem and runs on explicit request only, **[codemap](instructions/r3/core/skills/codemap/SKILL.md)** builds and uses a code map, **[coding-agents-farm](instructions/r3/core/skills/coding-agents-farm/SKILL.md)** runs parallel coding agents on isolated git worktrees, and the `solr-*` set covers Solr schema, query, extension and semantic-search work.

All 40 live in [instructions/r3/core/skills/](instructions/r3/core/skills) — one folder each, and every `SKILL.md` states its own activation rule in the first lines.

## Why this exists

| The problem | What Rosetta does about it |
| --- | --- |
| **Everyone prompts differently.** Each developer builds their own prompts. The good ones live in someone's scratch file, the rest are reinvented weekly, and nothing survives a person leaving | Instructions live in the repository, versioned in Git, loaded every session. Improving how the agent works becomes a pull request everyone gets, not a tip in a channel |
| **The agent doesn't know your architecture.** Handed a task, it sees a handful of open files — not the module nobody may import, nor the convention your team settled on after getting it wrong. So it infers a plausible design and implements it confidently | Initialization writes your architecture, code map, dependencies and domain context into the repo, and Rosetta loads them before work starts. `/code-analysis-flow` builds that understanding for an existing codebase |
| **It does the risky thing without asking.** The failures that cost real time are a migration that ran, a dependency swapped, a refactor across forty files — decided silently, discovered at review | Every workflow runs **Prepare → Research → Plan → Act → Validate** with approval gates where a decision becomes expensive to reverse. You see the plan before the work, not the diff after it |
| **Your setup is locked to one tool.** Rules in one IDE's format do not move. Change tools and the accumulated knowledge stays behind | One instruction set, delivered to every supported agent. The instructions are plain files in your repository — readable, reviewable, portable. Nothing requires a live connection to us |

In short: shared instructions instead of private prompts, your architecture loaded instead of inferred, approval gates where reversal gets expensive, and none of it tied to one vendor.

The mental model and design principles are in **[OVERVIEW.md](OVERVIEW.md)**; the business case and who it serves in **[docs/CONTEXT.md](docs/CONTEXT.md)**.

---

## Working on Rosetta itself

This repository is the **instructions repository**: it defines how agents behave, and nothing in it runs against your product code. Agents do the work in a *target repository* — that is where `docs/CONTEXT.md`, `agents/IMPLEMENTATION.md` and the rest get written.

| Read this | For |
| --- | --- |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | What contributions are welcome, the PR checklist, DCO sign-off |
| **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** | Repository layout, local development, validation commands, where to change what |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Components, the plugin generation pipeline, bootstrap flow |
| **[REVIEW.md](REVIEW.md)** | The standards a change is evaluated against |

One thing to know before your first change: [plugins/](plugins) is generated output that happens to be committed. Edit [instructions/r3/core/](instructions/r3/core) and regenerate — never edit `plugins/` by hand.

## Documentation

<details>
<summary><b>Every document, and when to read it</b></summary>

| Read this | When |
| --- | --- |
| **[user-guide/](user-guide/README.md)** | You are learning to use Rosetta, task by task |
| **[QUICKSTART.md](QUICKSTART.md)** | You are installing it now |
| **[PLUGINS.md](PLUGINS.md)** · **[MCPs.md](MCPs.md)** | You are picking a delivery mode, or installing one |
| **[INSTALLATION.md](INSTALLATION.md)** | You need every install mode and transport, and every file initialization creates |
| **[CONFIGURATION.md](CONFIGURATION.md)** | You are wiring it to your tools and MCPs |
| **[USAGE_GUIDE.md](USAGE_GUIDE.md)** | You need the full reference: every workflow phase by phase |
| **[OVERVIEW.md](OVERVIEW.md)** | You want the mental model and the design principles |
| **[docs/CONTEXT.md](docs/CONTEXT.md)** | You want why it exists and who it serves, with no technical detail |
| **[ELEVATOR_PITCH.md](ELEVATOR_PITCH.md)** | You are explaining Rosetta to someone else |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** · **[FAQ.md](FAQ.md)** | Something is not working |
| **[CHANGELOG.md](CHANGELOG.md)** | You want to know what changed between releases |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** · **[docs/MCP-ARCHITECTURE.md](docs/MCP-ARCHITECTURE.md)** | You want to know how it is built |
| **[docs/AUTOMATION-ARCHITECTURE.md](docs/AUTOMATION-ARCHITECTURE.md)** | You are touching this repo's own GitHub automation |
| **[docs/TESTING-PLUGINS.md](docs/TESTING-PLUGINS.md)** | You are testing a generated plugin |
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

## Tech Demo

<details>
<summary><b>Init and Coding</b></summary>

https://github.com/user-attachments/assets/fc0ef06a-2f9c-49fa-bc05-68001dadd286

</details>

<details>
<summary><b>Frontend Migration</b></summary>

https://github.com/user-attachments/assets/8a48ce2e-a8f6-4d80-a208-4e808ab502df

</details>

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
