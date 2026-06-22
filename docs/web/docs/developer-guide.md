---
layout: docs
title: Developer Guide
permalink: /docs/developer-guide/
---

# Developer Guide

**Who is this for?** Active contributors and maintainers.

**When should I read this?** After [Contributing](/rosetta/docs/contributing/). Before making your first change.

---

## Overall Development Flow

At a glance — the steps below expand each stage:

```
fork/clone → branch → edit → validate → push → PR
```

1. **Prepare repository.**
   - Fork the repository entirely and work in the `main` branch
   - Clone and create a feature branch from `main` (use descriptive branch names)
   - Rosetta uses `main` as the target branch for every PR
   - Commit messages: short summary line, body if needed. No special format enforced.

2. **Develop using claude code / codex / cursor** or **use the prompting flow.**
   - **Development:** use rosetta plugins to develop rosetta. [TESTING-PLUGINS.md](https://github.com/griddynamics/rosetta/blob/main/docs/TESTING-PLUGINS.md) shows how to install and test plugins locally. Plugins allow contributors to see their in-progress instruction changes reflected almost immediately. End users should use plugins built from `main` or the production MCP endpoints.
   - **Prompting:** use the [`coding-agents-prompting-flow`](/rosetta/docs/usage-guide/#workflows) with the `coding-agents-prompt-authoring` skill to author, design, refactor, harden, and modernize prompt families (agents, skills, workflows, workflow phases, rules). It understands Rosetta internals. Use it with the Opus 4.8 model.

     Example invocations:

     - Run the flow by slash-command (requires the plugin installed — see [Plugins](/rosetta/docs/plugins/#step-1-install-plugin)):

       ```
       /coding-agents-prompting-flow to author a new R3 Rosetta <skill/agent/workflow/rule/prompt family> `<name>`: <description of what it should be>
       ```

     - Refactor an old prompt into the new format using local instructions:

       ```
       MUST FULLY EXECUTE `instructions/r2/core/workflows/coding-agents-prompting-flow.md` to refactor old Rosetta prompt `<prompt full path>` as R3 prompt family in Rosetta.
       ```

     - Author a new prompt using local instructions:

       ```
       MUST FULLY EXECUTE `instructions/r2/core/workflows/coding-agents-prompting-flow.md` to author a new R3 Rosetta <skill/agent/workflow/rule/prompt family> `<name>`: <description of what it should be>
       ```

     - Author a new prompt via Rosetta MCP:

       ```
       MUST ACQUIRE coding-agents-prompting-flow.md FROM KB AND FULLY EXECUTE IT to author a new R3 Rosetta <skill/agent/workflow/rule/prompt family> `<name>`: <description of what it should be>
       ```

     Include in every prompt-change PR: a prompt brief (goal, non-goals, constraints), before/after behavior examples, and validation evidence (attach to the PR description).

     Automated review pipelines run on prompt-change PRs — **static AI review** (structure, quality, correctness, governance) and **scenario comparison** (runs scenarios with the old and new prompts, then validates the behavioral difference). Both must pass before merge.

3. **Check your output.**
   - [General Review Criteria](/rosetta/docs/review/#general-review-criteria)
   - [Core Principles](/rosetta/docs/review/#core-principles)
   - [Code Review Criteria](/rosetta/docs/review/#code-review-criteria)
   - [Instruction Review Criteria](/rosetta/docs/review/#instruction-review-criteria)

4. **Test locally on a target repo.**
   - Set up [Local Instructions Mode](#local-development-instructions) on **target** repository.
   - Test your prompts against a real codebase.

5. **Test on DEV environment.**
   - Uninstall `local-files-mode.md` from target repository
   - [Publish to dev](#dev-environment-integration-testing)
   - Enable Rosetta MCP or follow [Quick Start](/rosetta/docs/quickstart/) to install it
   - Use dev server URL `[rosetta MCP development server URL]`
   - Test end-to-end through the HTTP MCP

6. **Open a PR.**
   - Follow the [Pull Request Checklist](/rosetta/docs/contributing/#pull-request-checklist)
   - Prompting: include a prompt brief, before/after examples, and validation evidence
   - Coding: include tests and validation changes
   - All: update documentation, including web site

7. **Pipelines.**
   - Automated pipelines run on your PR: static AI review and scenario comparison (detailed in step 2 above)
   - Both must pass before merge

---

## Repository Layout

```
rosetta/
├── instructions/         ← Prompts: skills, agents, workflows, rules, templates
│   └── r2/
│       ├── core/         ← Rosetta instruction source
│       └── <org>/        ← Optional organization extensions (e.g., acme/)
├── src/ims-mcp-server/       ← Rosetta MCP server (PyPI: ims-mcp)
│   ├── ims_mcp/          ← Server source code
│   ├── tests/            ← Unit tests (pytest)
│   └── validation/       ← verify_mcp.py integration test
├── src/rosetta-cli/      ← Rosetta CLI package (PyPI: rosetta-cli)
│   ├── rosetta_cli/      ← CLI source package
│   ├── pyproject.toml    ← Package metadata + entrypoints
│   └── tests/            ← CLI unit tests
├── deployment/           ← Helm charts (RAGFlow)
├── plugins/              ← IDE plugin definitions
├── docs/                 ← Deep documentation (Architecture, RAGFlow, Context)
│   └── web/              ← Jekyll website (GitHub Pages)
└── refsrc/               ← Reference sources (read-only, resolves AI stale knowledge)
```

## Prerequisites

- **Python 3.12+**
- **uvx** (included with [uv](https://docs.astral.sh/uv/getting-started/installation/))
- **Podman or Docker** (optional, for Redis, used by full MCP plan_manager tests)

---

## Local Development: Instructions

Use this when editing prompts (skills, agents, workflows, rules, templates).

Instructions run locally without MCP.

Copy them into a target repository and point your IDE using the local-files-mode.md bootstrap file.

Follow [Offline Installation](/rosetta/docs/installation/#offline-installation-no-mcp), except you copy your new instructions files:

```bash
  cp -r instructions/ /path/to/target-repo/instructions/
```

No server, no API key, no network. Edit instructions, reload, test.

---

## Local Development: MCP

Use this when changing MCP server code, tool prompts, or bundler logic.

Run MCP locally in STDIO mode against the dev RAGFlow instance.

### Redis (optional, for plan_manager)

Start a Redis-compatible container:

```bash
# Podman
podman run -d --name rosetta-redis -p 6379:6379 docker.io/valkey/valkey:latest

# Docker
docker run -d --name rosetta-redis -p 6379:6379 valkey/valkey:latest
```

### Connect your IDE to local MCP

**Claude Code:**

```bash
claude mcp add --transport stdio Rosetta \
  --env ROSETTA_SERVER_URL=[RAGFlow production server URL] \
  --env ROSETTA_API_KEY=ragflow-xxxxx \
  --env VERSION=r2 \
  --env REDIS_URL=redis://localhost:6379/0 \
  -- uvx --prerelease=allow ims-mcp@latest
```

**Codex:**

```bash
codex mcp add Rosetta \
  --env ROSETTA_SERVER_URL=[RAGFlow production server URL] \
  --env ROSETTA_API_KEY=ragflow-xxxxx \
  --env VERSION=r2 \
  --env REDIS_URL=redis://localhost:6379/0 \
  -- uvx --prerelease=allow ims-mcp@latest
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "Rosetta": {
      "command": "uvx",
      "args": ["--prerelease=allow", "ims-mcp@latest"],
      "env": {
        "ROSETTA_SERVER_URL": "[RAGFlow production server URL]",
        "ROSETTA_API_KEY": "ragflow-xxxxx",
        "VERSION": "r2",
        "REDIS_URL": "redis://localhost:6379/0"
      }
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "Rosetta": {
      "type": "stdio",
      "command": "uvx",
      "args": ["--prerelease=allow", "ims-mcp@latest"],
      "env": {
        "ROSETTA_SERVER_URL": "[RAGFlow production server URL]",
        "ROSETTA_API_KEY": "ragflow-xxxxx",
        "VERSION": "r2",
        "REDIS_URL": "redis://localhost:6379/0"
      }
    }
  }
}
```

**API key:** Get yours from the RAGFlow UI. The dataset you test against must be **owned by user of this API key**.

**VERSION:** Set explicitly here for local development testing. Always test with both `VERSION=r1` and `VERSION=r2`.

**Pre-release builds:** Version suffixes like `b00` trigger automatic pre-release publishing. Use `--prerelease=allow` with uvx to pull these builds.

Add the bootstrap rule to your IDE as defined in [MCPs Installation — Add Bootstrap Rule](/rosetta/docs/mcps/#step-2-add-bootstrap-rule).

---

## Local Development: CLI

Use this when changing publish, verify, or cleanup commands.

```bash
python3 -m venv venv
venv/bin/pip install -r requirements.txt
cp src/rosetta-cli/.env.dev .env  # Points at dev RAGFlow instance
venv/bin/rosetta-cli verify
```

Preview changes without publishing:

```bash
uvx rosetta-cli@latest publish instructions --dry-run
```

The `--dry-run` flag shows what would be published (new, changed, unchanged files) without writing anything to RAGFlow.

---

## Validation

### MCP integration tests

```bash
# From repo root, with the root venv activated
VERSION=r1 python src/ims-mcp-server/validation/verify_mcp.py
VERSION=r2 python src/ims-mcp-server/validation/verify_mcp.py

# With Redis (tests plan_manager with RedisPlanStore)
REDIS_URL="redis://localhost:6379/0" VERSION=r2 python src/ims-mcp-server/validation/verify_mcp.py
```

Run both r1 and r2. If your change touches Redis-dependent features, run with and without `REDIS_URL`.

### Unit tests

```bash
# MCP server tests
venv/bin/pytest src/ims-mcp-server/tests

# CLI tests
venv/bin/pytest src/rosetta-cli/tests
```

### Type checking

```bash
./validate-types.sh
```

Run this after any Python code change.

---

## Dev Environment: Integration Testing

After local validation passes, test end-to-end against the dev environment.

**Environments (two separate servers):**

- **Rosetta Server (RAGFlow) prod:** `[RAGFlow production server URL]` — document engine backend, dataset management, API keys
- **Rosetta Server (RAGFlow) dev:** `[RAGFlow production server URL]` — used by STDIO MCP and CLI for publishing
- **Rosetta HTTP MCP prod:** `[rosetta MCP production server URL]` — production MCP endpoint for end users
- **Rosetta HTTP MCP dev:** `[rosetta MCP development server URL]` — dev MCP endpoint for integration testing

### 1. Publish instructions to dev

```bash
cp src/rosetta-cli/.env.dev .env
uvx rosetta-cli@latest publish instructions
```

This publishes to the dev RAGFlow instance. Only changed files are uploaded (MD5-based change detection). Use `--force` to republish everything.

### 2. Test MCP (STDIO against dev)

Connect your IDE using the STDIO configs from [Local Development: MCP](#local-development-mcp).
This validates that your published instructions are served correctly through the MCP layer.

### 3. Test Instructions from MCP (HTTP, default mode)

This is the mode end users run. Connect your IDE to the hosted dev MCP endpoint over HTTP.

**Claude Code:**

```bash
claude mcp add --transport http Rosetta [rosetta MCP development server URL]
```

**Codex:**

```bash
codex mcp add Rosetta --url [rosetta MCP development server URL]
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "Rosetta": {
      "url": "[rosetta MCP development server URL]"
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "Rosetta": {
      "type": "http",
      "url": "[rosetta MCP development server URL]"
    }
  }
}
```

Authenticate via OAuth as required.

Add the bootstrap rule to your IDE as defined in [MCPs Installation — Add Bootstrap Rule](/rosetta/docs/mcps/#step-2-add-bootstrap-rule).

### 4. Test CLI changes

If you changed CLI commands, run them against dev with `--dry-run` first, then without:

```bash
uvx rosetta-cli@latest publish instructions --dry-run
uvx rosetta-cli@latest publish instructions
venv/bin/rosetta-cli list-dataset --dataset aia-r2
```

---

## Where to Change What

| Change type            | Location                                              | Validation                               |
| ---------------------- | ----------------------------------------------------- | ---------------------------------------- |
| New/modified skill     | `instructions/r2/core/skills/<name>/SKILL.md`         | Publish, test via MCP                    |
| New/modified agent     | `instructions/r2/core/agents/<name>.md`               | Publish, test via MCP                    |
| New/modified workflow  | `instructions/r2/core/workflows/<name>.md`            | Publish, test via MCP                    |
| New/modified rule      | `instructions/r2/core/rules/<name>.md`                | Publish, test via MCP                    |
| Organization extension | `instructions/r2/<org>/` (same type structure)        | Publish, test via MCP                    |
| MCP tool or prompt     | `src/ims-mcp-server/ims_mcp/server.py`, `tool_prompts.py` | verify_mcp.py, pytest, validate-types.sh |
| CLI command            | `src/rosetta-cli/rosetta_cli/commands/`               | pytest, dry-run, publish to dev          |
| Website                | `docs/web/`                                           | Local Jekyll build                       |
| Documentation          | `docs/`, repo root `.md` files                        | Use AI to check consistency              |

Always publish the **entire** `/instructions` folder. Never subfolders or single files (breaks tag extraction). See [Architecture — Rosetta CLI](/rosetta/docs/architecture/#rosetta-cli) for details on auto-tagging and change detection.

---

## How Documentation Is Organized

The short version:

- **Introduction** — orientation, what and why
- **Quick Start** — zero to working setup
- **Overview** — mental model, terminology
- **Contributing** — PR workflow, checklist
- **Developer Guide** (this doc) — repo navigation, local dev
- **Architecture** — system structure, components, data flow
- **Review Standards** — what reviewers check
- **Usage Guide** — how to use Rosetta flows
- **Deployment** — RAGFlow, MCP, Helm deployment
- **Troubleshooting** — symptom-first diagnosis

---

## Related Docs

- [Contributing](/rosetta/docs/contributing/) — fastest path to a merged PR
- [Architecture](/rosetta/docs/architecture/) — system structure, components, data flow
- [Quick Start](/rosetta/docs/quickstart/) — zero to working setup
- [Overview](/rosetta/docs/overview/) — mental model, key concepts
- [Review Standards](/rosetta/docs/review/) — what reviewers verify
- [Usage Guide](/rosetta/docs/usage-guide/) — how to use Rosetta flows
- [Deployment](/rosetta/docs/deployment/) — RAGFlow, MCP, Helm deployment
- [Troubleshooting](/rosetta/docs/troubleshooting/) — symptom-first diagnosis
