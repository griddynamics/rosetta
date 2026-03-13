---
layout: docs
title: Quick Start
permalink: /docs/quickstart/
---

# Quick Start

**Who is this for?** New users setting up Rosetta for the first time.

**When should I read this?** When you want to go from zero to a working setup.

---

## Step 1: Connect Rosetta MCP

> [!WARNING]
> Use **Sonnet 4.6**, **GPT-5.3-codex-medium**, **gemini-3.1-pro** or better models. Avoid Auto model selection.

Rosetta uses HTTP MCP transport with OAuth. Pick your IDE and add the configuration.

<details markdown="1">
<summary><b>Cursor</b></summary>

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

</details>

<details markdown="1">
<summary><b>Claude Code</b></summary>

```sh
claude mcp add --transport http Rosetta https://rosetta.evergreen.gcp.griddynamics.net/mcp
```

Authenticate inside a claude session with `/mcp`, select Rosetta, Authenticate, and complete the OAuth flow.

</details>

<details markdown="1">
<summary><b>Codex</b></summary>

```sh
codex mcp add Rosetta --url https://rosetta.evergreen.gcp.griddynamics.net/mcp
codex mcp login Rosetta
```

</details>

<details markdown="1">
<summary><b>VS Code / GitHub Copilot</b></summary>

Add to `.vscode/mcp.json` or `~/.mcp.json`:

```json
{
  "servers": {
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

</details>

<details markdown="1">
<summary><b>GitHub Copilot (JetBrains)</b></summary>

`Settings` > `Tools` > `GitHub Copilot` > `MCP Settings`. Add to `~/.config/github-copilot/intellij/mcp.json`:

```json
{
  "servers": {
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

Restart IDE after changes.

</details>

<details markdown="1">
<summary><b>JetBrains Junie</b></summary>

`Settings` > `Tools` > `Junie` > `MCP Settings` > `+ Add` > `As JSON`:

```json
{
  "mcpServers": {
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

</details>

<details markdown="1">
<summary><b>Windsurf</b></summary>

Add to your Windsurf MCP config:

```json
{
  "mcpServers": {
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

</details>

<details markdown="1">
<summary><b>Antigravity</b></summary>

Add to your Antigravity MCP config:

```json
{
  "mcpServers": {
    "Rosetta": {
      "serverUrl": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

</details>

<details markdown="1">
<summary><b>OpenCode</b></summary>

Add to `opencode.json`:

```json
{
  "mcp": {
    "Rosetta": {
      "type": "http",
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp",
      "enabled": true
    }
  }
}
```

</details>

Any MCP client that supports HTTP transport can connect using the endpoint URL. Complete the OAuth flow when prompted.

STDIO transport is available for air-gapped environments. See [Installation](/docs/installation/).

## Step 2: Add Bootstrap Rule

Download [bootstrap.md](https://github.com/griddynamics/rosetta/blob/main/instructions/r2/core/rules/bootstrap.md?plain=1) and add it to your IDE's instruction file (keep entire contents, including YAML frontmatter):

| IDE                        | Destination                       |
| -------------------------- | --------------------------------- |
| Cursor                     | `.cursor/rules/bootstrap.mdc`     |
| Claude Code                | `.claude/claude.md`               |
| VS Code / GitHub Copilot   | `.github/copilot-instructions.md` |
| GitHub Copilot (JetBrains) | `.github/copilot-instructions.md` |
| JetBrains Junie            | `.junie/guidelines.md`            |
| Windsurf                   | `.windsurf/rules/bootstrap.md`    |
| Antigravity                | `.agent/rules/bootstrap.md`       |
| OpenCode                   | `AGENTS.md`                       |

## Step 3: Verify

Ask the agent:

```
What can you do, Rosetta?
```

It should use Rosetta MCP to retrieve agents, guardrails, and instructions.

## Step 4: Initialize (once per repository)

Ask the agent:

```
Initialize this repository using Rosetta
```

The agent will analyze your tech stack, generate documentation (TECHSTACK.md, CODEMAP.md, DEPENDENCIES.md, ARCHITECTURE.md, CONTEXT.md), and ask clarifying questions. Read more about [workspace files](/docs/installation/#workspace-files-created) and [all workflows](/docs/usage-guide/#workflows).

> [!NOTE]
> **Composite workspaces:** init each repository separately, then init at the workspace level with "This is composite workspace" appended.
> **Dead code or existing specs:** mention their location in the prompt to save time.

## Common Issues

- **OAuth prompt does not appear:** restart your IDE and retry the connection. Read more in [Troubleshooting — Connection & Authentication](/docs/troubleshooting/#connection--authentication).
- **Agent ignores Rosetta tools:** confirm the MCP server shows as connected in your IDE's MCP settings. Add a [bootstrap rule](/docs/installation/) if the agent still skips Rosetta. Read more in [Troubleshooting — Agent Not Using Rosetta](/docs/troubleshooting/#agent-not-using-rosetta).
- **Slow or empty responses:** check your network can reach `rosetta.evergreen.gcp.griddynamics.net`. See [Troubleshooting](/docs/troubleshooting/#slow-or-empty-responses).

## Next Steps

- [Usage Guide](/docs/usage-guide/) — how to use Rosetta flows
- [Overview](/docs/overview/) — mental model and terminology
- [Deployment](/docs/deployment/) — org-wide deployment
- [Contributing](/docs/contributing/) — make your first contribution
- [Architecture](/docs/architecture/) — system internals

## Video Tutorials

- [Install Using MCP](https://drive.google.com/file/d/16N2h5R_0JYMiE_PhfPVRcaCcH_52_qvG/view?usp=drive_link) — step-by-step setup
- [Install without MCP](https://drive.google.com/file/d/1ClktG-QxZJr3nkCVHJ815ZJ1esp2WI6F/view?usp=drive_link) — air-gapped environments
- [Initialize with Antigravity](https://drive.google.com/file/d/1BcloxAXzrvdY1Uc5rNF6b_g1MzePLYpn/view?usp=drive_link) — project initialization
- [Subagents and Workflows in Claude Code](https://drive.google.com/file/d/1GnFLr6ljAV29e4lHPDj0u6qYNQat0CDk/view?usp=drive_link) — advanced configuration
