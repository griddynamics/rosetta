---
layout: docs
title: Plugins
permalink: /docs/plugins/
---

# Plugins

Rosetta plugins bundle the bootstrap rule, skills, agents, workflows, and other instructions directly into your IDE. The agent loads them locally — no live connection to Rosetta is needed at request time.

Every plugin supports two installation methods:

- **Marketplace** — managed install from a plugin marketplace. Easier; preferred when available.
- **Standalone** — manual zip extraction into your repo. For agents without a marketplace path, or environments that block external marketplaces.

> [!CAUTION]
> You must receive prior approval from your manager and company to use Rosetta.

> [!WARNING]
> Use **Sonnet 5**, **GPT-5.4-medium**, **gemini-3.1-pro** or better models. Avoid Auto model selection.

> [!NOTE]
> This is pre-release, but it already works.
> There will be conflict if you have similar plugins installed: JUXT, Superpowers, GSD, AI-DevKit. Use the ones you have the most experience with.

## Step 1: Install Plugin

<details markdown="1">
<summary><b>Claude Code</b></summary>

### Claude Code

#### Marketplace

```sh
claude plugin marketplace add griddynamics/rosetta
claude plugin install rosetta@rosetta
```
</details>

<details markdown="1">
<summary><b>Cursor</b></summary>

### Cursor

#### Marketplace

> [!NOTE]
> To add the plugin you need to have the appropriate Cursor plans, such as Teams and Enterprise.

To Import the Rosetta github repository to your team/compnay internal marketplace:
* Use the following repository: https://github.com/griddynamics/rosetta

For detailed setup instructions, see the Cursor documentation:
* https://cursor.com/docs/plugins#team-marketplaces

**ALTERNATIVE**: Plugins installed in Claude Code are automatically available in Cursor.

> [!WARNING]
> Cursor automatically detects and uses Claude Code plugins. To avoid duplicate tools, commands, and context, do not install the same plugin separately in both Claude Code and Cursor. If you don't want Cursor to pick up Claude Code plugins at all, go to **Cursor Settings → Rules, Skills, Subagents** and turn off **Include third-party Plugins, Skills, and other configs**.

#### Standalone

1. Download `core-cursor-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest).
2. Extract the archive contents into your repository.
3. Verify you can see a file `.cursor/agents/architect.md`. Ensure there are no `.cursor/.cursor` folders.

</details>

<details markdown="1">
<summary><b>GitHub Copilot</b></summary>

### GitHub Copilot

GitHub Copilot runs in VS Code and JetBrains. Use **Marketplace** install in VS Code, or **Standalone** in either IDE.

#### Marketplace (VS Code)

1. In VS Code settings, add `https://github.com/griddynamics/rosetta` to `chat.plugins.marketplaces`.
2. Open the Copilot chat panel, click the settings gear icon to open agent customizations.
3. Click **Browse Marketplaces**, then **install** for `rosetta`.

<img src="/rosetta/assets/images/vscode-add-marketplaces.png" alt="Add marketplaces to VS Code" width="710"/>

<img src="/rosetta/assets/images/vscode-open-customizations.png" alt="Open agent customizations" width="710"/>

<img src="/rosetta/assets/images/vscode-install-plugins.png" alt="Install plugins" width="710"/>

#### Standalone (VS Code and JetBrains)

For JetBrains IDEs, use the standalone installation package.
> [!NOTE]
> The standalone installation is also detected by VS Code, so installing Rosetta through the standalone and marketplace methods will result in duplicate tools, commands, and context.

1. Download `core-copilot-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest).
2. Extract the archive contents into your repository. If `.github/copilot-instructions.md` already exists, merge contents — Rosetta first, then the original content.
3. Verify you can see a file `.github/agents/architect.agent.md`. Ensure there are no `.github/.github` folders.

</details>

<details markdown="1">
<summary><b>Codex</b></summary>

### Codex

> [!NOTE]
> Codex plugins currently support hooks, MCPs, and skills only (as of April 2026).

#### Standalone

1. Download `core-codex-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest).
2. Extract the archive contents into your repository.
3. Enable hooks:

   ```sh
   codex features enable hooks
   ```

</details>

## Step 2: Verify

Ask the agent:

```
What can you do, Rosetta?
```

The agent will follow Rosetta prompts and show Rosetta workflows and execute `self-help-flow` (see screenshots from different tools below):

**Claude Code:**

<img src="/rosetta/assets/images/Rosetta-ProperResponse.png" alt="Rosetta proper response in Claude Code" width="710"/>

**GitHub Copilot:**

<img src="/rosetta/assets/images/Rosetta-ProperResponse-Copilot.png" alt="Rosetta proper response in GitHub Copilot" width="710"/>

## Upgrading

- Standalone upgrades require to redownload and replace files (install again).
- Marketplace plugins usually automatically upgrade.

See [INSTALLATION.md#upgrading](/rosetta/docs/installation/#upgrading) for upgrade instructions for your installation method.

## Next Steps

Once the plugin is verified:

- **Run your first session and initialize the repo** — see [QUICKSTART.md](/rosetta/docs/quickstart/).
- **Explore the workflows** (coding, requirements authoring, modernization, and more) — see [USAGE_GUIDE.md — Workflows](/rosetta/docs/usage-guide/#workflows).
