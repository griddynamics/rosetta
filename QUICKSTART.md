# Quick Start

[README](README.md)

**Who is this for?** New users: install Rosetta, set up your repository once, run your first task. Already set up? Jump to [example prompts](#next-steps) or [Upgrading](#upgrading).

---

> [!CAUTION]
> If you use Rosetta on company code, **get approval** from your manager and company.
> <sub>Your company may have rules for AI tools working on its code, and using Rosetta without approval may violate them.</sub>

> [!WARNING]
>
> - **Use Sonnet 5.5 medium, GPT-6-luna-high, gemini-3.8-flash-high or newer models. Avoid Auto model selection.**<br><sub>Higher effort burns time and tokens on needless reasoning, because Rosetta already switches models per step.<br>"Auto" can silently drop to a weaker model mid-task, and weaker models skip tool calls and ignore Rosetta's rules.</sub>
> - **Remove similar plugins** (JUXT, Superpowers, GSD, AI-DevKit), or keep only the one you know best.<br><sub>They bring their own rules, skills, and workflows, so the agent gets mixed context and the two sets compete.<br>This makes Rosetta load the wrong instructions or lose its own, and the results get worse.</sub>

> [!NOTE]
> Rosetta is designed to never use or see data or IP.
>
> Instead it uses inversion of control, by providing a "menu" to AI coding agents.
>
> There will be conflict if you have similar plugins installed: JUXT, Superpowers, GSD, AI-DevKit. Use the ones you have the most experience with.

## Step 1: Install Rosetta

| Option                              | Best for                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| **[Plugins](PLUGINS.md)** — recommended | Everyone with a supported IDE (Claude Code · Cursor · Copilot · Codex · Antigravity). Files install locally — no server, no live connection needed. |
| **[Hosted MCP](MCPs.md)** — evaluation only | Try Rosetta with zero setup, or use any other MCP-compatible agent (Devin/Windsurf · Junie · OpenCode). Public demo endpoint — do not point production or sensitive repos at it. |
| **[Self-hosted MCP](docs/mcp/DEPLOYMENT_GUIDE.md)** — optional | MCP in production: your own MCP server and RAGFlow inside your perimeter. Only needed if you specifically require centrally-managed, always-fresh instructions with nothing copied into repos — most teams don't. |

## Step 2: Initialize your repository (once)

Required before your first task. Type one of these as a plain sentence (it is not a slash command).

**Existing repository:**

```text
Initialize this repository using the respective Rosetta workflow
```

**New repository:**

```text
Initialize this repository using the respective Rosetta workflow, this is a new repository, target tech stack: ..., target architecture: ..., business context: ...
```

**Several repositories in one workspace (composite):** initialize each repository separately, then run this at the workspace level:

```text
Initialize this repository using the respective Rosetta workflow, this is a composite workspace
```

**Dead code or existing specs:** mention where they are to save time:

```text
Initialize this repository using the respective Rosetta workflow, dead code is in <path>, existing specs are in <path>
```

The agent studies your code, asks a few questions, and writes context files (`docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, and others). Review and commit them, then start a **new session**: the agent loads these files only at session start. More: [Set up your repository](user-guide/03-initialize-your-repository.md), [workspace files](INSTALLATION.md#workspace-files-created).

> [!NOTE]
> **Prefer medium models:** High reasoning and Opus models consume too much token on reasoning.
>
> **Composite workspaces:** init each repository separately, then run the Brownfield form at the workspace level.
>
> **Dead code or existing specs:** mention their location in the prompt to save time.

## Step 3: Run your first task

```text
/coding-flow Add password reset to the auth service
```

Not sure what to run? Ask `/help-flow What can you do?` or see all [workflows and skills](docs/CATALOG.md). In Codex, use `$` instead of `/`.

## Next Steps

All workflows and skills in one list: [Workflows and skills](docs/CATALOG.md).

To properly set up an entire workspace, refer to [CONFIGURATION.md](CONFIGURATION.md).

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

### Automated QA

**WHAT**: Helps user go from a test case in Test Management System to a working test in the automation framework. Give it a test case, it gathers what it needs from your code and ticket system (for example, Jira) and AQA implements the automated test, asks questions when it sees contradictions, and helps fix the test until it passes.

```
/ui-aqa-flow Automate the test case for the checkout flow, ...
```

```
/api-aqa-flow Implement automation for the API test cases in suite ..., ...
```

```
/ui-aqa-flow Fix the failing automated test for ..., ...
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

### Save Tokens (Optional)

A one-line instruction cuts output tokens: [Tips → Lowering your token bill](user-guide/05-tips-and-troubleshooting.md#lowering-your-token-bill).

To explore all workflows (coding, requirements authoring, modernization, and more), refer to [USAGE_GUIDE.md — Workflows](USAGE_GUIDE.md#workflows).

## Links

- [Usage Guide](USAGE_GUIDE.md) — see all Rosetta workflows
- [Overview](OVERVIEW.md) — mental model and terminology
- [Contributing](CONTRIBUTING.md) — make your first contribution
- [Architecture](docs/ARCHITECTURE.md) — system internals
- [Deployment Guide](docs/mcp/DEPLOYMENT_GUIDE.md) — self-hosted MCP (optional, rarely needed)

## Video Tutorials

- [Install without MCP](https://vimeo.com/1174124213/c50179147c?fl=ml&fe=ec) — limited internet access
- [Install Using MCP](https://vimeo.com/1174124251/f38e017d8d?fl=ml&fe=ec) — step-by-step setup
- [Initialize with Antigravity](https://vimeo.com/1174124165/8f5fbd7775?fl=ml&fe=ec) — project initialization
- [Subagents and Workflows in Claude Code](https://vimeo.com/1174124272/96056d5cc5?fl=ml&fe=ec) — advanced configuration

## Upgrading

**Existing workspace, from Rosetta R2 to R3:**

```
Upgrade this repository from Rosetta R2 to R3
```

**Plugin or MCP update:** see [Installation → Upgrading](INSTALLATION.md#upgrading).

**Rosetta MCP says it runs in "legacy compatibility mode":** switch to HTTP mode ([MCPs Installation](MCPs.md)) or install the plugin ([install guide](user-guide/02-install.md)).
