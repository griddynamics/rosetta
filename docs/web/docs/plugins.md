---
layout: docs
title: Plugins
permalink: /docs/plugins/
---

# Plugins

Rosetta plugins bundle the bootstrap rule, skills, agents, workflows, and other instructions directly into your IDE. The agent loads them locally — no live connection to Rosetta is needed at request time.

> [!WARNING]
> **Before you start:** get approval from your manager and company. Use **Sonnet 5.5 medium**, **GPT-6-luna-high**, **gemini-3.8-flash-high** or newer models. Avoid Auto model selection. Details: [Before you install](/rosetta/user-guide/install/#before-you-install).

> [!NOTE]
> There will be conflict if you have similar plugins installed: JUXT, Superpowers, GSD, AI-DevKit. Use the ones you have the most experience with.

## Step 1: Install Plugin

Steps for every IDE (Claude Code, Cursor, GitHub Copilot, Codex, Antigravity), including Marketplace and Standalone (zip) methods, live in one place: the [install guide](/rosetta/user-guide/install/).

Screenshots for GitHub Copilot Marketplace install (VS Code):

<img src="/rosetta/assets/images/vscode-add-marketplaces.png" alt="Add marketplaces to VS Code" width="710"/>

<img src="/rosetta/assets/images/vscode-open-customizations.png" alt="Open agent customizations" width="710"/>

<img src="/rosetta/assets/images/vscode-install-plugins.png" alt="Install plugins" width="710"/>

## Step 2: Verify

Ask the agent:

```
What can you do, Rosetta?
```

The agent will follow Rosetta prompts and show Rosetta workflows and execute `help-flow` (see screenshots from different tools below):

**Claude Code:**

<img src="/rosetta/assets/images/Rosetta-ProperResponse.png" alt="Rosetta proper response in Claude Code" width="710"/>

**GitHub Copilot:**

<img src="/rosetta/assets/images/Rosetta-ProperResponse-Copilot.png" alt="Rosetta proper response in GitHub Copilot" width="710"/>

## Upgrading

See [Keeping it up to date](/rosetta/user-guide/install/#keeping-it-up-to-date) and [Installation → Upgrading](/rosetta/docs/installation/#upgrading).

## Next Steps

Once the plugin is verified:

- **Run your first session and initialize the repo** — see [QUICKSTART.md](/rosetta/docs/quickstart/).
- **Explore the workflows** (coding, requirements authoring, modernization, and more) — see [USAGE_GUIDE.md — Workflows](/rosetta/docs/usage-guide/#workflows).
