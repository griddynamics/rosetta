---
layout: docs
title: Quick Start
permalink: /docs/quickstart/
---

# Quick Start

**Who is this for?** New users setting up Rosetta for the first time.
**When should I read this?** When you want to go from zero to a working setup.

---

> [!CAUTION]
> You must receive a prior approval from your manager and company to use it.

> [!WARNING]
> Use **Sonnet 5 medium**, **GPT-5.4-medium**, **gemini-3.1-pro** or newer models. Please use **medium** reasoning effort or it will take 30 minutes in useless reasoning. Avoid Auto model selection. 

> [!NOTE]
> Rosetta is designed to never use or see data or IP.
>
> Instead it uses inversion of control, by providing a "menu" to AI coding agents.
>
> There will be conflict if you have similar plugins installed: JUXT, Superpowers, GSD, AI-DevKit. Use the ones you have the most experience with.


## Step 1: Install Rosetta

We recommend installing Rosetta using [Plugins](/rosetta/docs/plugins/):
Claude Code · Cursor · GitHub Copilot (VS Code + JetBrains) · Codex

If your IDE does not have a Rosetta plugin, use [MCPs](/rosetta/docs/mcps/):
Windsurf · JetBrains Junie · Antigravity · OpenCode · any MCP-compatible agent

## Step 2: Initialize (once per repository and commit)

Ask the agent:

**Greenfield (new repository):**
```
Initialize this repository using the respective Rosetta workflow, this is a new repository, target tech stack: ..., target architecture: ..., business context: ...
```

**Brownfield (existing repository):**
```
Initialize this repository using the respective Rosetta workflow[, this is a composite workspace][, additional information]
```

The agent will analyze your tech stack, generate documentation (TECHSTACK.md, CODEMAP.md, DEPENDENCIES.md, ARCHITECTURE.md, CONTEXT.md), and ask clarifying questions. Read more about [workspace files](/rosetta/docs/installation/#workspace-files-created) and [all workflows](/rosetta/docs/usage-guide/#workflows).

> [!NOTE]
> **Prefer medium models:** High reasoning and Opus models consume too much token on reasoning.
>
> **Composite workspaces:** init each repository separately, then run the Brownfield form at the workspace level.
>
> **Dead code or existing specs:** mention their location in the prompt to save time.

## Next Steps

To properly set up an entire workspace, refer to [CONFIGURATION.md](/rosetta/docs/configuration/).

### Coding Workflow

**WHAT**: Majority of tasks are actually coding tasks, including unit tests. Just ask exactly what is required.

```
/coding-flow Implement side bar on the home page, ...
```

```
/coding-flow Identify and implement fix, ...
```

```
/coding-flow Improve unit tests coverage to 85% for ...
```

### Business and Technical Requirements

**WHY**: Requirements - is the source of truth for code and tests. Going requirements first is the most effective. In brownfield start with extracting.

```
/requirements-authoring-flow extract detailed business and technical requirements from community of ... using subagents. Additionally, ... . Once done spawn subagent to validate and repeat an entire loop until there are no issues detected.
```

```
/requirements-authoring-flow extract high-level business and technical requirements at end-point level for controllers according to glob ... using subagents. Additionally, ... . Once done spawn subagent to validate and repeat an entire loop until there are no issues detected.
```

```
/requirements-authoring-flow update existing requirements for <component name> so that it <does new behavior/supports new capability>. Additionally, ... . Once done spawn subagent to validate and repeat an entire loop until there are no issues detected.
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

To explore all workflows (coding, requirements authoring, modernization, and more), refer to [USAGE_GUIDE.md — Workflows](/rosetta/docs/usage-guide/#workflows).

## Links

- [Usage Guide](/rosetta/docs/usage-guide/) — see all Rosetta workflows
- [Overview](/rosetta/docs/overview/) — mental model and terminology
- [Deployment Guide](/rosetta/docs/deployment/) — org-wide deployment
- [Contributing](/rosetta/docs/contributing/) — make your first contribution
- [Architecture](/rosetta/docs/architecture/) — system internals

## Video Tutorials

- [Install Using MCP](https://vimeo.com/1174124251/f38e017d8d?fl=ml&fe=ec) — step-by-step setup
- [Install without MCP](https://vimeo.com/1174124213/c50179147c?fl=ml&fe=ec) — air-gapped environments
- [Initialize with Antigravity](https://vimeo.com/1174124165/8f5fbd7775?fl=ml&fe=ec) — project initialization
- [Subagents and Workflows in Claude Code](https://vimeo.com/1174124272/96056d5cc5?fl=ml&fe=ec) — advanced configuration
