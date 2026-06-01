# Plugins

Rosetta plugins bundle the bootstrap rule, skills, agents, workflows, and other instructions directly into your IDE. The agent loads them locally — no live connection to Rosetta is needed at request time.

Every plugin supports two installation methods:

- **Marketplace** — managed install from a plugin marketplace. Easier; preferred when available.
- **Standalone** — manual zip extraction into your repo. For agents without a marketplace path, or environments that block external marketplaces.

> [!CAUTION]
> You must receive prior approval from your manager and company to use Rosetta.

> [!WARNING]
> Use **Sonnet 4.6**, **GPT-5.3-codex-medium**, **gemini-3.1-pro**, or better. Avoid Auto.

> [!NOTE]
> Plugins are pre-release.

## Step 1: Install Plugin

<details>
<summary><b>Claude Code</b></summary>

### Claude Code

#### Marketplace

```sh
claude plugin marketplace add griddynamics/rosetta
claude plugin install rosetta@rosetta
```
</details>

<details>
<summary><b>Cursor</b></summary>

### Cursor

> [!NOTE]
> Cursor also sees plugins installed via Claude Code. If you've already installed via `claude plugin install`, do **not** install again in Cursor — the same content would be duplicated in Cursor's context.

#### Marketplace

If your organization uses Cursor Team Marketplace, you can publish the Rosetta plugin to your company's internal marketplace and make it available to your team.

For more information, see the Cursor documentation:
https://cursor.com/docs/plugins#team-marketplaces

Rosetta can also be installed in Claude Code. Plugins installed in Claude Code are automatically available in Cursor.

The Rosetta repository provides both a Cursor plugin and marketplace integration:
https://github.com/griddynamics/rosetta

> **Important**
>
> Cursor automatically detects and uses plugins installed in Claude Code. To avoid duplicate tools, commands, and context, install Rosetta in **Claude Code only**. Do not install the same plugin separately in both Claude Code and Cursor.

#### Standalone

1. Download `core-cursor-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest).
2. Extract the archive contents into your repository.
3. Verify you can see a file `.cursor/agents/architect.md`. Ensure there are no `.cursor/.cursor` folders.

</details>

<details>
<summary><b>GitHub Copilot</b></summary>

### GitHub Copilot

Copilot runs in VS Code and JetBrains. The marketplace path is VS Code only; standalone works for both.

#### Marketplace (VS Code)

1. In VS Code settings, add `https://github.com/griddynamics/rosetta` to `chat.plugins.marketplaces`.
2. Open the Copilot chat panel, click the settings gear icon to open agent customizations.
3. Click **Browse Marketplaces**, then **install** for `rosetta`.

<img src="docs/images/vscode-add-marketplaces.png" alt="Add marketplaces to VS Code" width="710"/>

<img src="docs/images/vscode-open-customizations.png" alt="Open agent customizations" width="710"/>

<img src="docs/images/vscode-install-plugins.png" alt="Install plugins" width="710"/>

#### Standalone (VS Code and JetBrains)

Use this option when marketplace installation is unavailable, such as in JetBrains Copilot or VS Code environments.

1. Download `core-copilot-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest).
2. Extract the archive contents into your repository. If `.github/copilot-instructions.md` already exists, merge contents — Rosetta first, then the original content.
3. Verify you can see a file `.github/agents/architect.agent.md`. Ensure there are no `.github/.github` folders.

</details>

<details>
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

It should use Rosetta MCP to retrieve agents, guardrails, and instructions:

<img src="docs/images/Rosetta-ProperResponse1.png" alt="Rosetta proper response" width="355"/> <img src="docs/images/Rosetta-ProperResponse2.png" alt="Rosetta proper response" width="300"/>

## Updating

See [INSTALLATION.md#upgrading](INSTALLATION.md#upgrading) for update instructions per install mode.

## Next Steps

Once the plugin is verified:

- **Run your first session and initialize the repo** — see [QUICKSTART.md](QUICKSTART.md).
- **Explore the workflows** (coding, requirements authoring, modernization, and more) — see [USAGE_GUIDE.md — Workflows](USAGE_GUIDE.md#workflows).
