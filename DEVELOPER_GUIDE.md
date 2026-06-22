# Developer Guide

**Who is this for?** Active contributors and maintainers.
**When should I read this?** After [CONTRIBUTING.md](CONTRIBUTING.md). Before making your first change.

---

## Overall Development Flow

At a glance — the steps below expand each stage:

```
fork/clone → branch → edit → validate → push → PR
```

1. **Prepare local Rosetta repository.**
   - Fork the repository entirely and work in the `main` branch
   - Clone and create a feature branch from `main` (use descriptive branch names)
   - Rosetta uses `main` as the target branch for every PR
   - Commit messages: short summary line, body if needed. No special format enforced.

2. **Develop Rosetta using claude code / codex / cursor** or **use the prompting flow.**
   - **Development:** use rosetta plugins to develop rosetta. [TESTING-PLUGINS.md](docs/TESTING-PLUGINS.md) shows how to install/test plugins locally. Plugins allow contributors to see their in-progress instruction changes reflected almost immediately. End users should use plugins built from `main` or the production MCP endpoints.
   - **Prompting:** use the [`coding-agents-prompting-flow`](USAGE_GUIDE.md#workflows) with the `coding-agents-prompt-authoring` skill to author, design, refactor, harden, and modernize prompt families (agents, skills, workflows, workflow phases, rules). It understands Rosetta internals. Use it with the Opus 4.8 model.

     Example invocations:

     - Run the flow by slash-command (requires the plugin installed — see [Plugins](PLUGINS.md#step-1-install-plugin)):

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
   - [General Review Criteria](REVIEW.md#general-review-criteria)
   - [Core Principles](REVIEW.md#core-principles)
   - [Code Review Criteria](REVIEW.md#code-review-criteria)
   - [Instruction Review Criteria](REVIEW.md#instruction-review-criteria)

4. **Test locally on a target repo.**
   - Disable Rosetta MCP
   - Set up [Local Instructions Mode](#local-development-instructions) on **target** repository.
   - Test your prompts against a real codebase.
   - Modify your prompts in `instructions` in **target** repository
   - Restart coding agents or new sessions after changes made
   - Copy back changed files to the Rosetta repository

5. **Test on DEV environment.**
   - Uninstall `local-files-mode.md` from target repository
   - [Publish to dev](#dev-environment-integration-testing)
   - Enable Rosetta MCP or follow [Quick Start Guide](QUICKSTART.md) to install it
   - Use dev server URL `<rosetta MCP development server URL>`
   - Test end-to-end through the HTTP MCP

6. **Open a PR.**
   - Follow the [Pull Request Checklist](CONTRIBUTING.md#pull-request-checklist)
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

Follow [Offline Installation](INSTALLATION.md#offline-installation-no-mcp), except you copy your new instructions files:

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
  --env ROSETTA_SERVER_URL=https://<development server URL>/ \
  --env ROSETTA_API_KEY=ragflow-xxxxx \
  --env VERSION=r2 \
  --env REDIS_URL=redis://localhost:6379/0 \
  -- uvx --prerelease=allow ims-mcp@latest
```

**Codex:**

```bash
codex mcp add Rosetta \
  --env ROSETTA_SERVER_URL=https://<development server URL>/ \
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
        "ROSETTA_SERVER_URL": "https://<development server URL>/",
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
        "ROSETTA_SERVER_URL": "https://<development server URL>/",
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

Add the bootstrap rule to your IDE as defined in [Quick Start — Add Bootstrap Rule](QUICKSTART.md#step-2-add-bootstrap-rule).

---

## Local Development: CLI

Use this when changing publish, verify, or cleanup commands.

```bash
python3 -m venv venv
venv/bin/pip install -r requirements.txt
cp .env.dev .env  # Points at dev RAGFlow instance
venv/bin/rosetta-cli verify
```

Use two stages when developing the CLI: first test your checkout from the repo virtualenv, then test the packaged CLI with `uvx` after push/merge.

Preview changes without publishing:

```bash
cd src/rosetta-cli
../../venv/bin/python -m rosetta_cli version
../../venv/bin/python -m rosetta_cli verify --env dev
../../venv/bin/python -m rosetta_cli publish ../../instructions --dry-run --env dev
```

After the package is published, test the packaged CLI with `uvx`:

```bash
uvx rosetta-cli@latest verify --env dev
uvx rosetta-cli@latest publish ../instructions --dry-run --env dev
```

The `--dry-run` flag shows what would be published (new, changed, unchanged files) without writing anything to RAGFlow.

---

## Validation

### MCP integration tests

```bash
# From repo root, with the root venv activated
cp .env.dev .env && VERSION=r1 venv/bin/python src/ims-mcp-server/validation/verify_mcp.py
cp .env.dev .env && VERSION=r2 venv/bin/python src/ims-mcp-server/validation/verify_mcp.py

# With Redis (tests plan_manager with RedisPlanStore)
cp .env.dev .env && REDIS_URL="redis://localhost:6379/0" VERSION=r2 venv/bin/python src/ims-mcp-server/validation/verify_mcp.py
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

### Git pre-commit hook

The repository ships a native Git pre-commit hook shim in `.githooks/pre-commit`.
It runs the Python entrypoint at `scripts/pre_commit.py`, which first regenerates all plugin payloads (via `npx rosettify-plugins@latest`) and then executes type validation.

Use the root repo virtualenv for hook execution:

```bash
python3 -m venv venv
venv/bin/pip install -r requirements.txt
git config core.hooksPath .githooks
```

Git does not automatically use the repository's `.githooks/` directory.
Each developer must run `git config core.hooksPath .githooks` once in their local clone to enable the native pre-commit hook.

On Windows, use the matching root-venv interpreter and pip executable:

```powershell
py -3 -m venv venv
venv\Scripts\pip.exe install -r requirements.txt
git config core.hooksPath .githooks
```

You can test the hook entrypoint directly:

```bash
venv/bin/python scripts/pre_commit.py
```

---

## Dev Environment: Integration Testing

After local validation passes, test end-to-end against the dev environment.

**Environments (two separate servers):**

- **Rosetta Server (RAGFlow) prod:** `https://<production server URL>/` — document engine backend, dataset management, API keys
- **Rosetta Server (RAGFlow) dev:** `https://<development server URL>/` — used by STDIO MCP and CLI for publishing
- **Rosetta HTTP MCP prod:** `<rosetta MCP production server URL>` — production MCP endpoint for end users
- **Rosetta HTTP MCP dev:** `<rosetta MCP development server URL>` — dev MCP endpoint for integration testing

### 1. Publish instructions to dev

```bash
cp .env.dev .env
uvx rosetta-cli@latest publish instructions
```

This publishes to the dev RAGFlow instance. Only changed files are uploaded (MD5-based change detection). Use `--force` to republish everything.

### 2. Test MCP (STDIO against dev)

Connect your IDE using the STDIO configs from [Local Development: MCP](#local-development-mcp).
This validates that your published instructions are served correctly through the MCP layer.

### 3. Test Instructions from MCP (HTTP, default mode)

This is the mode end users run. Connect your IDE to the hosted dev MCP endpoint over HTTP.

**Claude Code** — the repo's `.mcp.json` already contains this config; no extra setup needed:

```bash
claude mcp add --transport http Rosetta <rosetta MCP development server URL>
```

**Codex:**

```bash
codex mcp add Rosetta --url <rosetta MCP development server URL>
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "Rosetta": {
      "url": "<rosetta MCP development server URL>"
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
      "url": "<rosetta MCP development server URL>"
    }
  }
}
```

Authenticate via OAuth as required.

Add the bootstrap rule to your IDE as defined in [Quick Start — Add Bootstrap Rule](QUICKSTART.md#step-2-add-bootstrap-rule).

### 4. Test CLI changes

If you changed CLI commands, first test the checkout from source with the repo virtualenv:

```bash
cd src/rosetta-cli
../../venv/bin/python -m rosetta_cli publish ../../instructions --dry-run --env dev
../../venv/bin/python -m rosetta_cli publish ../../instructions --env dev
../../venv/bin/python -m rosetta_cli list-dataset --dataset aia-r2 --env dev
```

After push/merge and package publish, repeat the same checks through the published package:

```bash
uvx rosetta-cli@latest publish instructions --dry-run --env dev
uvx rosetta-cli@latest publish instructions --env dev
uvx rosetta-cli@latest list-dataset --dataset aia-r2 --env dev
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

Always publish the **entire** `/instructions` folder. Never subfolders or single files (breaks tag extraction). See [Architecture — Rosetta CLI](docs/ARCHITECTURE.md#rosetta-cli) for details on auto-tagging and change detection.

---

## How Documentation Is Organized

See [plan/INDEX.md](plan/INDEX.md) for the full document routing map. The short version:

- **README** — orientation, what and why
- **QUICKSTART** — zero to working setup
- **OVERVIEW** — mental model, terminology
- **CONTRIBUTING** — PR workflow, checklist
- **DEVELOPER_GUIDE** (this doc) — repo navigation, local dev
- **docs/ARCHITECTURE** — system structure, components, data flow
- **REVIEW** — what reviewers check
- **USAGE_GUIDE** — how to use Rosetta flows
- **DEPLOYMENT_GUIDE** — RAGFlow, MCP, Helm deployment
- **TROUBLESHOOTING** — symptom-first diagnosis

---

## Upgrading workflows from R1 to R2

### Step 1: Move and rename files

Manual recommended; AI-assisted possible but less reliable.

#### R1 structure

```text
agents/instructions/
├── core/r1/
│   ├── workflow_name.md
│   ├── workflow_name-phase1.md
│   ├── workflow_name-phase2.md
│   └── ...
├── advanced/r1/
│   └── (same pattern)
└── common/r1/
    └── (shared rules and utilities)
```

#### R2 target structure

```text
instructions/r2/
├── core/
│   ├── workflows/
│   │   ├── workflow-name-flow.md
│   │   ├── workflow-name-flow-phase1-name.md
│   │   └── workflow-name-flow-phase2-name.md
│   ├── skills/
│   │   └── skill-name/
│   │       └── SKILL.md
│   ├── agents/
│   ├── rules/
│   └── configure/
```

#### Naming conventions

| R1 | R2 |
|---|---|
| `workflow_name.md` | `workflow-name-flow.md` |
| `workflow_name-phaseN.md` | `workflow-name-flow-phase-name.md` |
| (inline in workflow) | `skill-name/SKILL.md` (extracted) |

Key changes:
- Underscores replaced with dashes
- Workflow files get `-flow` suffix
- Phase files include descriptive name instead of just a number
- Skills are extracted into their own folder with a `SKILL.md` entry point
- Scope moved from `agents/instructions/{core,advanced,common}/r1/` to `instructions/r2/core/`

### Step 2: Add YAML frontmatter

Manual recommended; AI-assisted possible but less reliable.

#### For workflow files

Add this frontmatter block at the top of each workflow file:

```yaml
---
name: workflow-name-flow
description: "Rosetta workflow for [brief description of WHEN/HOW to use and WHAT it does]"
tags: ["relevant", "tags"]
baseSchema: docs/schemas/workflow.md
---
```

Full schema reference: [docs/schemas/workflow.md](https://github.com/griddynamics/rosetta/blob/main/docs/schemas/workflow.md)

#### For phase files

Add this frontmatter block at the top of each phase file:

```yaml
---
name: workflow-name-flow-phase-name
description: "Brief description of WHEN/HOW to use this phase and WHAT it does"
tags: ["relevant", "tags"]
baseSchema: docs/schemas/phase.md
---
```

Full schema reference: [docs/schemas/phase.md](https://github.com/griddynamics/rosetta/blob/main/docs/schemas/phase.md)

#### For skill files

Add this frontmatter block at the top of each `SKILL.md`:

```yaml
---
name: skill-name
description: "Rosetta skill for [brief description of WHEN/WHY to use]"
tags: ["relevant", "tags"]
baseSchema: docs/schemas/skill.md
---
```

Full schema reference: [docs/schemas/skill.md](https://github.com/griddynamics/rosetta/blob/main/docs/schemas/skill.md)

### Step 3: Extract reusable skills

AI-assisted only; manual is not practical for this step.

Execute the following prompt to extract reusable skills from workflow phases:

> MUST FULLY EXECUTE `instructions/r2/core/workflows/coding-agents-prompting-flow.md` to refactor skills out of full Rosetta workflow with phases `[workflow_file]` as R2 prompt family.

#### Acceptance criteria

- Skills were identified and extracted for relevant phases
- Refactored files (`SKILL.md`, phase files) were reviewed for correctness
- Main sections use XML tags per schema (`<context>`, `<workflow_phases>`, etc.)

### Step 4: Convert content to R2 XML format

AI-assisted recommended; manual also possible.

Replace markdown sections in workflow and phase files with XML tags (`<context>`, `<critical_requirements>`, `<workflow_phases>`, `<validation_checklist>`, `<pitfalls>`, etc.) as defined by the respective schema.

#### Reference examples

| File type | Schema | Example |
|---|---|---|
| Workflow | `docs/schemas/workflow.md` | `instructions/r2/core/workflows/coding-flow.md` |
| Phase | `docs/schemas/phase.md` | `instructions/r2/core/workflows/testgen-flow-data-collection.md` |
| Skill | `docs/schemas/skill.md` | `instructions/r2/core/skills/coding-agents-prompt-authoring/SKILL.md` |

#### AI-assisted prompt for workflows

> There's an example of the format `instructions/r2/core/workflows/coding-flow.md`. There's a schema for workflows `docs/schemas/workflow.md`. Please use it for reformatting `[workflow_file]`.

#### AI-assisted prompt for phases

> There's an example of the format `instructions/r2/core/workflows/testgen-flow-data-collection.md`. There's a schema for phases `docs/schemas/phase.md`. Please use it for reformatting `[phase_file]`.

#### AI-assisted prompt for skills

> There's a schema for skills `docs/schemas/skill.md`. Please use it for reformatting `[skill_file]`.

### Step 5: Validate the refactored flow

Manual only.

After each step, run the refactored flow end-to-end and verify that output matches the original intent.

### Common pitfalls

Lessons learned from multiple transformation attempts:

- **Missing subagent contracts** — if a subagent is defined in a workflow/phase file, its input and output must be defined as well
- **Unnecessary skill proliferation** — double-check whether new skills are truly needed; reuse existing ones when possible
- **Lost instructions** — refactoring can inadvertently delete content (examples, edge cases); test the refactored flow after each step to confirm output still meets expectations

---

## Related Docs

- [Contributing](CONTRIBUTING.md) — fastest path to a merged PR
- [Architecture](docs/ARCHITECTURE.md) — system structure, components, data flow
- [Quickstart](QUICKSTART.md) — zero to working setup
- [Overview](OVERVIEW.md) — mental model, key concepts
- [Review Standards](REVIEW.md) — what reviewers verify
- [Usage Guide](USAGE_GUIDE.md) — how to use Rosetta flows
- [Deployment Guide](DEPLOYMENT_GUIDE.md) — RAGFlow, MCP, Helm deployment
- [Troubleshooting](TROUBLESHOOTING.md) — symptom-first diagnosis
