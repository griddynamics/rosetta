---
layout: user-guide
title: Install Rosetta
permalink: /user-guide/install/
---

# Install Rosetta
*[← What is Rosetta?](/rosetta/user-guide/what-is-rosetta/) · [Back to the guide](/rosetta/user-guide/) · Next: [Set up your repository →](/rosetta/user-guide/initialize/)*

Installing Rosetta means adding a **plugin** to your IDE. The plugin bundles everything the agent needs and runs locally — no server, no live connection, no source code leaving your machine.

> This guide covers the plugin path, which is what almost everyone should use. There are advanced hosted/self-hosted options for special cases; if you think you need one, see the developer [INSTALLATION guide](/rosetta/docs/installation/).

## Before you install

- **Get approval.** Confirm with your manager and company that you're allowed to use Rosetta.
- **Choose a medium model.** Use **Sonnet 5 (medium)**, **GPT-5.6-terra-medium**, **gemini-3.7-flash-high**, or newer. Avoid "Auto" selection — it tends to downgrade mid-task and waste tokens. More on this in [Tips → Choosing a model](/rosetta/user-guide/tips/#choosing-a-model).
- **Avoid conflicting plugins.** JUXT, Superpowers, GSD, and AI-DevKit can clash with Rosetta. Use only the one you're most comfortable with.

## Which plugin

Rosetta ships as seven plugins. `rosetta` has everything and is what this guide installs (`rosetta-light` is the same content on smaller models). The other five (`core`, `workflows`, `qe`, `search`, `modernization`) are domain slices for people who want a smaller footprint. Install the combo or the slices, never both, or you get everything twice. Details in [PLUGINS.md](/rosetta/docs/plugins/#which-plugin-do-i-install).

## Install for your IDE

Pick your tool below.

### Claude Code

Run these two commands:

```sh
claude plugin marketplace add griddynamics/rosetta
claude plugin install rosetta@rosetta
```

That's it. Marketplace plugins update themselves over time.

### Cursor

**Easiest option:** if you already have Rosetta installed in Claude Code, Cursor picks it up automatically — you don't need to install it again. (To avoid duplicates, don't install it separately in both.) To stop Cursor picking them up at all, turn off **Include third-party Plugins, Skills, and other configs** in Cursor Settings → Rules, Skills, Subagents.

**Team/Enterprise marketplace:** on a Cursor Teams or Enterprise plan, import the repository `https://github.com/griddynamics/rosetta` into your internal marketplace. Follow Cursor's guide at <https://cursor.com/docs/plugins#team-marketplaces>.

**Standalone (no marketplace):**

1. Download `rosetta-cursor-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest).
2. Extract the contents into your repository.
3. Confirm the file `.cursor/agents/architect.md` exists, and that there's no nested `.cursor/.cursor` folder.

### GitHub Copilot (VS Code and JetBrains)

**Marketplace:**

1. In VS Code settings, add `https://github.com/griddynamics/rosetta` to `chat.plugins.marketplaces`. In JetBrains, add the same URL under the Copilot plugin's marketplace setting.
2. Open the Copilot chat panel and click the settings gear to open agent customizations.
3. Click **Browse Marketplaces**, then **Install** for `rosetta`.

**Standalone (fallback):**

1. Download `rosetta-copilot-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest).
2. Extract into your repository. If `.github/copilot-instructions.md` already exists, merge — put Rosetta's content first, then your original content.
3. Confirm `.github/agents/architect.agent.md` exists, and that there's no nested `.github/.github` folder.

> Note: VS Code also detects the standalone install, so don't use both marketplace and standalone at once — you'll get duplicate tools and context.

### Codex

*(As of August 2026, Codex plugins do not support subagents. In Codex, invoke a workflow as `$coding-flow` rather than `/coding-flow`.)*

1. Download `rosetta-codex-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest).
2. Extract into your repository.
3. Enable hooks:

   ```sh
   codex features enable hooks
   ```

### Antigravity

One plugin serves Antigravity 2.0, the CLI, and the IDE.

1. Download `rosetta-antigravity-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest).
2. Create the folder `.agents/plugins/rosetta/` at your workspace root.
3. Extract the archive contents into it.
4. Confirm `.agents/plugins/rosetta/plugin.json` exists, and that there's no nested `rosetta-antigravity` folder inside.

To enable it for *all* workspaces instead of just one, extract into `~/.gemini/config/plugins/rosetta/` instead.

## Confirm it works

Start a chat with your agent and ask:

```text
What can you do, Rosetta?
```

If it's working, the agent recognizes Rosetta and lists the available workflows (it runs the built-in `help-flow` to do this). If it just answers like a generic assistant with no mention of Rosetta workflows, see [Tips → The agent isn't using Rosetta](/rosetta/user-guide/tips/#the-agent-isnt-using-rosetta).

## Keeping it up to date

- **Marketplace installs** usually update automatically. To force it: `claude plugin marketplace update rosetta` then `claude plugin update rosetta@rosetta`. To remove it: `claude plugin uninstall rosetta@rosetta`.
- **Standalone installs** don't — to upgrade, re-download the latest zip and replace the files (install again). To remove it, delete the extracted files.

## Next step

Rosetta is installed, but it doesn't know your codebase yet. Do that once per repository in [Set up your repository →](/rosetta/user-guide/initialize/).

