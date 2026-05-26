# Plugins

Rosetta plugins bundle the bootstrap rule, skills, agents, workflows, and other instructions directly into your IDE. The agent loads them locally — no live connection to Rosetta is needed at request time.

Available plugins: **Claude Code**, **Cursor**, **GitHub Copilot**, **Codex**.

Two install modes per plugin:

- **Marketplace** — managed install from a plugin marketplace. Easier; preferred when available.
- **Standalone** — manual zip extraction into your repo. For agents without a marketplace path, or environments that block external marketplaces.

> [!CAUTION]
> You must receive prior approval from your manager and company to use Rosetta.

> [!WARNING]
> Use **Sonnet 4.6**, **GPT-5.3-codex-medium**, **gemini-3.1-pro**, or better. Avoid Auto.

> [!NOTE]
> Plugins are pre-release.

## Claude Code

### Marketplace

```sh
claude plugin marketplace add griddynamics/rosetta
claude plugin install rosetta@rosetta
```

## Cursor

> [!NOTE]
> Cursor also sees plugins installed via Claude Code. If you've already installed via `claude plugin install`, do **not** install again in Cursor — the same content would be duplicated in Cursor's context.

### Marketplace

1. Confirm your Cursor edition supports plugins. See <https://cursor.com/docs/plugins#team-marketplaces> for the setup steps on the Cursor side.
2. Add `https://github.com/griddynamics/rosetta` to your team marketplace.

### Standalone

1. Download `core-cursor-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest).
2. Extract the archive contents into your repository.
3. Verify `.cursor/agents/architect.md` exists. Ensure there is no nested `.cursor/.cursor/` folder.

## GitHub Copilot

Copilot runs in VS Code and JetBrains. The marketplace path is VS Code only; standalone works for both.

### Marketplace (VS Code)

1. In VS Code settings, add `https://github.com/griddynamics/rosetta` to `chat.plugins.marketplaces`.
2. Open the Copilot chat panel, click the settings gear icon to open agent customizations.
3. Click **Browse Marketplaces**, then **install** for `rosetta`.

<img src="docs/images/vscode-add-marketplaces.png" alt="Add marketplaces to VS Code" width="710"/>

<img src="docs/images/vscode-open-customizations.png" alt="Open agent customizations" width="710"/>

<img src="docs/images/vscode-install-plugins.png" alt="Install plugins" width="710"/>

### Standalone (VS Code and JetBrains)

Use this when the marketplace path isn't available — JetBrains Copilot (no marketplace), or VS Code environments that block external marketplaces.

1. Download `core-copilot-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest).
2. Extract the archive contents into your repository. If `.github/copilot-instructions.md` already exists, merge contents — Rosetta first, then the original content.
3. Verify `.github/agents/architect.agent.md` exists. Ensure there is no nested `.github/.github/` folder.

## Codex

> [!NOTE]
> Codex plugins currently support hooks, MCPs, and skills only (as of April 2026).

### Standalone

1. Download `core-codex-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest).
2. Extract the archive contents into your repository.
3. Enable hooks:

   ```sh
   codex features enable hooks
   ```

## Updating

See [INSTALLATION.md#upgrading](INSTALLATION.md#upgrading) for update instructions per install mode.

## Next Steps

Once the plugin is installed:

- **Run your first session and initialize the repo** — see [QUICKSTART.md](QUICKSTART.md).
- **Explore the workflows** (coding, requirements authoring, modernization, and more) — see [USAGE_GUIDE.md — Workflows](USAGE_GUIDE.md#workflows).
