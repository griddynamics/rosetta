---
layout: docs
title: Quick Start
permalink: /docs/quickstart/
---

# Overview

Rosetta gives your AI coding agent your team's context, standards, and guardrails — across any IDE.

You install Rosetta in your IDE, ask the agent "Initialize this repository using Rosetta", and it produces a plan + code + tests with the conventions of your codebase, not generic ones.

> **Use a strong model.** Sonnet 4.6, GPT-5.3-codex-medium, gemini-3.1-pro, or better. Avoid Auto. Weaker models silently skip Rosetta's tools.

---

## 1. Install

Two options. **Pick A if your IDE supports a plugin** — it's the recommended path. Otherwise use B.

### Option A — Plugin (recommended)

A plugin bundles Rosetta's bootstrap rule, skills, agents, and workflows directly into your IDE. No MCP wiring, no manual bootstrap file.

| IDE                          | Install                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Claude Code**              | `claude plugin marketplace add griddynamics/rosetta` then `claude plugin install core@rosetta`                                              |
| **VS Code / GitHub Copilot** | Install `core-copilot` via VS Code Copilot Plugins                                                                                          |
| **JetBrains / Copilot**      | Zip + manual config — see [Installation](/rosetta/docs/installation/#plugin-based-installation)                                             |
| **Codex**                    | Zip + `codex features enable codex_hooks` — see [Installation](/rosetta/docs/installation/#plugin-based-installation)                       |

> Plugins are the recommended install path — clients prefer them over MCP, and the install bundles everything you need (bootstrap rule, skills, agents, workflows). If a plugin isn't available for your IDE yet, use Option B.

Done with Option A → skip to **[Verify](#2-verify)**.

### Option B — MCP + bootstrap (fallback)

Use this when your IDE doesn't have a plugin yet, or your environment requires it.

**B.1 — Connect Rosetta MCP**

<details markdown="1" open>
<summary><b>Claude Code</b></summary>

```sh
claude mcp add --transport http Rosetta https://mcp.rosetta.griddynamics.net/mcp
```

Then start `claude` and, inside the session, type `/mcp` → select **Rosetta** → **Authenticate** to complete OAuth.
</details>

<details markdown="1">
<summary><b>Cursor / Windsurf</b></summary>

`~/.cursor/mcp.json` (or project-local `.cursor/mcp.json`):

```json
{ "mcpServers": { "Rosetta": { "url": "https://mcp.rosetta.griddynamics.net/mcp" } } }
```
</details>

<details markdown="1">
<summary><b>VS Code / GitHub Copilot</b></summary>

`.vscode/mcp.json` or `~/.mcp.json`:

```json
{ "servers": { "Rosetta": { "url": "https://mcp.rosetta.griddynamics.net/mcp" } } }
```
</details>

<details markdown="1">
<summary><b>Codex / JetBrains / Antigravity / OpenCode</b></summary>

```sh
# Codex
codex mcp add Rosetta --url https://mcp.rosetta.griddynamics.net/mcp && codex mcp login Rosetta
```

JetBrains Junie: `Settings → Tools → Junie → MCP Settings → + Add → As JSON`, use the Cursor JSON above.
GitHub Copilot (JetBrains): `Settings → Tools → GitHub Copilot → MCP Settings`, edit `~/.config/github-copilot/intellij/mcp.json` with the VS Code JSON above.
Antigravity / OpenCode: see [Installation](/rosetta/docs/installation/).
</details>

> For the full list of IDEs, see [Installation](/rosetta/docs/installation/).

**B.2 — Add the bootstrap rule (mandatory for MCP mode)**

MCP alone doesn't reliably trigger Rosetta on every request. You must drop a small markdown file (`bootstrap.md`) into your IDE's instructions so the agent calls Rosetta before doing anything.

Download [bootstrap.md](https://github.com/griddynamics/rosetta/blob/main/instructions/r2/core/rules/bootstrap.md?plain=1) and place it at the path for your IDE:

| IDE                            | Path                              |
| ------------------------------ | --------------------------------- |
| Cursor                         | `.cursor/rules/bootstrap.mdc`     |
| Claude Code                    | `.claude/claude.md`               |
| VS Code / Copilot (any)        | `.github/copilot-instructions.md` |
| JetBrains Junie                | `.junie/guidelines.md`            |
| Windsurf                       | `.windsurf/rules/bootstrap.md`    |
| Antigravity                    | `.agent/rules/bootstrap.md`       |
| OpenCode                       | `AGENTS.md`                       |

Keep the file's YAML frontmatter intact.

## 2. Verify

```
What can you do, Rosetta?
```

The agent should list Rosetta's workflows and capabilities. If it doesn't, jump to [Setup issues](#setup-issues).

## 3. Initialize your repo

```
Initialize this repository using Rosetta
```

Rosetta scans your stack, generates `docs/TECHSTACK.md`, `docs/CODEMAP.md`, `docs/DEPENDENCIES.md`, `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, and asks you to fill the gaps. **Restart your chat session afterward** so the new context loads.

Run once per repo. For composite workspaces, init each repo first, then run init at workspace level with "This is composite workspace" appended.

---

## A real example

> *A **workflow** is what Rosetta runs to do the work — coding, init, requirements, etc. Rosetta picks the workflow from your request automatically.*

```
You: "Add password reset support to the customer portal.
      I want to review the plan first."

Rosetta loads the coding workflow:

  • Discovery        – discoverer subagent gathers affected code,
                       dependencies, constraints
  • Tech plan        – architect writes <FEATURE>-SPECS.md (the what)
                       and <FEATURE>-PLAN.md (the how) in the feature
                       plan folder (e.g. plans/PASSWORD-RESET/)
  • Review plan      – reviewer inspects them against your request
  → Your approval    – say "Yes, I reviewed the plan"
  • Implementation   – engineer codes only the approved scope;
                       build must pass (tests are separate)
  • Review code      – reviewer inspects the diff against the specs
  • Validation       – validator checks spec coverage and gaps
  → Your approval    – say "Yes, I approve the implementation"
  • Tests            – engineer writes and runs isolated tests
  • Review tests     – reviewer checks coverage and scenarios
  • Final validation – end-to-end dependency check
```

Phases scale by task size: small tasks handle discovery, reviews, and validation inline, and may combine the two approval gates into one. Approval is still always explicit. See [Coding Flow](/rosetta/docs/coding-flow/) for the full canonical phase list with scaling rules.

## Common requests

Plain language. Rosetta picks the workflow.

| Say this                                              | What runs              |
| ----------------------------------------------------- | ---------------------- |
| "Add / fix / change \<feature\>"                      | Coding workflow        |
| "Initialize this repository"                          | Init workflow          |
| "Explain how \<module\> works"                        | Code analysis          |
| "Define requirements for \<feature\>"                 | Requirements authoring |
| "Ad-hoc: \<small or weird task\>"                     | Composed flow          |
| "What can you do, Rosetta?" / "What workflows exist?" | Self-help              |

Pro workflows (Research, Modernization, Test Generation, Automated QA, External Library, Prompting) need the enterprise edition — see [Usage Guide](/rosetta/docs/usage-guide/#workflows).

## Setup issues

| Symptom                          | Fix                                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OAuth prompt never appears       | Restart IDE. In Claude Code, run `claude`, then in-session: `/mcp` → Rosetta → Authenticate.                                                                  |
| Agent ignores Rosetta tools      | **MCP mode:** confirm `bootstrap.md` is in place (Step B.2) and the MCP server shows connected. **Plugin mode:** confirm plugin installed via `claude plugin list`. |
| Agent worked, then stopped       | OAuth token expired. Re-authenticate. Tools still appear but instructions stop loading.                                                                       |
| Inconsistent / shallow output    | Wrong model. Switch off Auto and use Sonnet 4.6 / GPT-5.3-codex-medium / gemini-3.1-pro.                                                                       |
| Slow or empty replies            | Check network reaches `mcp.rosetta.griddynamics.net`. First-time init on large repos is slow — that's expected.                                              |

Full diagnostics: [Troubleshooting](/rosetta/docs/troubleshooting/).

## Customize (optional)

Three ways to make Rosetta work better for your project, ordered by impact: improve your context files, add project-specific rules, and add helper MCPs. None are required — start with the first when Rosetta begins asking the same questions repeatedly.

See [Customize](/rosetta/docs/customize/) for the full how-to with real example rule files and configs.

---

## Going deeper

- [Usage Guide](/rosetta/docs/usage-guide/) — every workflow, skill, and agent in detail
- [Architecture](/rosetta/docs/architecture/) — how Rosetta works under the hood
- [Installation](/rosetta/docs/installation/) — STDIO, plugins, air-gapped, env vars
- [Deployment](/rosetta/docs/deployment/) — running Rosetta org-wide
- [Contributing](/rosetta/docs/contributing/) — submit a PR

Stuck? [Discord](https://discord.gg/QzZ2cWg36g) · [Issues](https://github.com/griddynamics/rosetta/issues) · rosetta-support@griddynamics.com

> Rosetta is designed to never see your data or IP — it provides a "menu" of instructions to your agent, not the other way around. Get manager/company approval before using it on real codebases.
