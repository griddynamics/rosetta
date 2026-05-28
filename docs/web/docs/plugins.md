---
layout: docs
title: Plugins
permalink: /docs/plugins/
---

# Plugins

> [!CAUTION]
> You must receive a prior approval from your manager and company to use it.

> [!WARNING]
> Use **Sonnet 4.6**, **GPT-5.4-medium**, **gemini-3.1-pro** or better models. Avoid Auto model selection.

> [!NOTE]
> This is pre-release, but it already works.

## Claude Code Full Plugin Installation

```sh
claude plugin marketplace add griddynamics/rosetta
claude plugin install rosetta@rosetta
```

## Cursor Standalone

1. Download `core-cursor-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest)
2. Extract the archive contents directly into the repository.
3. Verify you can see a file `.cursor/agents/architect.md`. Ensure there are no `.cursor/.cursor` folders.

## Cursor Team Marketplace

If you have respective edition of Cursor you can add it as plugin to your corporate marketplace. See https://cursor.com/docs/plugins#team-marketplaces

You can also install plugin to claude code and it will appear in Cursor :)

`https://github.com/griddynamics/rosetta` provides marketplace and plugin for Cursor.

> [!WARNING]
> Cursor sees and uses all claude code plugins, so you should not install plugins to claude code and cursor, just install to claude code. Otherwise everything will be duplicated in Cursor context!

## VS Code GitHub Copilot

Add marketplace to `chat.plugins.marketplaces` in settings using local files path: `https://github.com/griddynamics/rosetta`.

Go to agent customizations screen (settings gear icon in Copilot chat pane), click `Browse Marketplaces`, click `install` for `rosetta`.

<img src="/rosetta/assets/images/vscode-add-marketplaces.png" alt="Add marketplaces to VS Code" width="710"/>

<img src="/rosetta/assets/images/vscode-open-customizations.png" alt="Open agent customizations" width="710"/>

<img src="/rosetta/assets/images/vscode-install-plugins.png" alt="Install plugins" width="710"/>

## GitHub Copilot Standalone (JetBrains and VS Code)

1. Download `core-copilot-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest)
2. Extract the archive contents directly into the repository. If `.github/copilot-instructions.md` already exists, merge contents: first from Rosetta, then the original content.
3. Verify you can see a file `.github/agents/architect.agent.md`. Ensure there are no `.github/.github` folders.

## Codex Plugins (standalone only)

Codex plugins only allow hooks, MCPs, and skills as of now (Apr 2026).

Download `core-codex-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest), extract on top of the repository, and enable hooks:

```sh
codex features enable hooks
```

## Next Steps

### Onboarding Repository (One-Time Initialization)

```
Initialize this repository using Rosetta
```

The agent will analyze your tech stack, generate documentation (TECHSTACK.md, CODEMAP.md, DEPENDENCIES.md, ARCHITECTURE.md, CONTEXT.md), and ask clarifying questions. Read more about [workspace files](INSTALLATION.md#workspace-files-created) and [all workflows](USAGE_GUIDE.md#workflows).

> [!NOTE]
> **Prefer medium models:** High reasoning and Opus models consume too much token on reasoning.
> **Composite workspaces:** init each repository separately, then init at the workspace level with "This is composite workspace" appended.
> **Dead code or existing specs:** mention their location in the prompt to save time.

### Coding Workflow

**WHAT**: Majority of tasks are actually coding tasks, including unit tests. Just ask exactly what is required.

```
/coding-flow Implement side bar on the home page, ...
```

```
/coding-flow Identify and implement fix, ...
```

### Business and Technical Requirements

**WHY**: Requirements - is the source of truth for code and tests. Going requirements first is the most effective. In brownfield start with extracting.

```
/requirements-authoring-flow extract detailed business and technical requirements from community of ... using subagents. Additionally, ... . Once done spawn subagent to validate and repeat an entire loop until there are no issues detected.
```

```
/requirements-authoring-flow extract high-level business and technical requirements at end-point level for controllers according to glob ... using subagents. Additionally, ... . Once done spawn subagent to validate and repeat an entire loop until there are no issues detected.
```

### Modernization

**FIRST**: Document modernization goals in CONTEXT.md, document target services technical aspects in ARCHITECTURE.md, document where source code should be created, keep refsrc populated with reference code source (old code, new code, reusable libraries, configuration and documentation files, and similar).

**NOTE**: All phases are must. All phases to be implemented one-by-one with proper review. Phase 3: Pre-Modernization Test Coverage is a must (and must include both unit and integration/e2e tests).

```
/modernization-flow Perform modernization phase 1 to reuse library refsrc/... using subagents. 
```

```
/modernization-flow Perform modernization phase 2 to analyze service module ... using subagents. Target microservice name is ... .
```

```
/modernization-flow Perform modernization phase 8 for target service to analyze service module ... using subagents. Must use `coding-flow.md` to actually implement and as the main flow. Once done spawn subagent to validate and repeat an entire loop until there are no issues detected.
```
