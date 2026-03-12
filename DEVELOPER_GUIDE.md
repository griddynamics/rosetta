# Developer Guide

**Who is this for?** Active contributors and maintainers.
**When should I read this?** After [CONTRIBUTING.md](CONTRIBUTING.md). Before making your first change.

---

## Repository Layout

```
rosetta/
├── instructions/         ← Prompts: skills, agents, workflows, rules, templates
│   └── r2/
│       ├── core/         ← OSS foundation
│       └── <org>/        ← Organization extensions (e.g., grid/)
├── ims-mcp-server/       ← Rosetta MCP server (PyPI: ims-mcp)
│   ├── ims_mcp/          ← Server source code
│   ├── tests/            ← Unit tests (pytest)
│   └── validation/       ← verify_mcp.py integration test
├── tools/                ← Rosetta CLI (publish, verify, cleanup)
│   ├── commands/         ← CLI command implementations
│   ├── services/         ← Shared service layer
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

Instructions run locally without MCP. Copy them into a target repository and point your IDE at the bootstrap file.

1. Copy the `instructions/` folder into your target repo:
  ```bash
   cp -r instructions/ /path/to/target-repo/instructions/
  ```
2. Copy the `instructions/r2/core/rules/local-files-mode.md` bootstrap file to your IDE config location:

  | IDE                        | Destination                                                           |
  | -------------------------- | --------------------------------------------------------------------- |
  | Cursor                     | `.cursor/rules/local.mdc` (keep YAML frontmatter)                     |
  | Claude Code                | `.claude/claude.md`                                                   |
  | VS Code / GitHub Copilot   | `.github/copilot-instructions.md`                                     |
  | GitHub Copilot (JetBrains) | `.github/copilot-instructions.md`                                     |
  | JetBrains Junie            | `.junie/guidelines.md`                                                |
  | Windsurf                   | `.windsurf/AGENTS.md`                                                 |
  | Antigravity                | `.agent/rules/agents.md` (keep YAML frontmatter, `trigger: always_on`)|
  | OpenCode                   | `AGENTS.md`                                                           |

3. Open your IDE in the target repo. The agent will execute prep steps from local files instead of calling MCP.

No server, no API key, no network. Edit instructions, reload, test.

Alternative source: use the published version from [releases](https://github.com/griddynamics/rosetta/releases/latest). See also [Installation — Offline Installation](INSTALLATION.md#offline-installation-no-mcp).

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
  --env ROSETTA_SERVER_URL=https://ims-dev.evergreen.gcp.griddynamics.net/ \
  --env ROSETTA_API_KEY=ragflow-xxxxx \
  --env VERSION=r2 \
  --env REDIS_URL=redis://localhost:6379/0 \
  -- uvx --prerelease=allow ims-mcp@latest
```

**Codex:**

```bash
codex mcp add Rosetta \
  --env ROSETTA_SERVER_URL=https://ims-dev.evergreen.gcp.griddynamics.net/ \
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
        "ROSETTA_SERVER_URL": "https://ims-dev.evergreen.gcp.griddynamics.net/",
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
        "ROSETTA_SERVER_URL": "https://ims-dev.evergreen.gcp.griddynamics.net/",
        "ROSETTA_API_KEY": "ragflow-xxxxx",
        "VERSION": "r2",
        "REDIS_URL": "redis://localhost:6379/0"
      }
    }
  }
}
```

**API key:** Get yours from the RAGFlow UI. The dataset you test against must be **owned by user of this API key**.

**VERSION:** Set explicitly here for local development testing. In production, do not set `VERSION` — the server controls it (see [INSTALLATION.md — Environment Variables](INSTALLATION.md#environment-variables-reference)). Always test with both `VERSION=r1` and `VERSION=r2`.

**Pre-release builds:** Version suffixes like `b00` trigger automatic pre-release publishing. Use `--prerelease=allow` with uvx to pull these builds.

---

## Local Development: CLI

Use this when changing publish, verify, or cleanup commands.

```bash
cd tools
bash setup.sh           # One-time: creates venv, installs deps
source venv/bin/activate
cp .env.dev .env        # Points at dev RAGFlow instance
python ims_cli.py verify
```

Preview changes without publishing:

```bash
python ims_cli.py publish ../instructions --dry-run
```

The `--dry-run` flag shows what would be published (new, changed, unchanged files) without writing anything to RAGFlow.

---

## Validation

### MCP integration tests

```bash
# From repo root, with tools/venv activated
VERSION=r1 python ims-mcp-server/validation/verify_mcp.py
VERSION=r2 python ims-mcp-server/validation/verify_mcp.py

# With Redis (tests plan_manager with RedisPlanStore)
REDIS_URL="redis://localhost:6379/0" VERSION=r2 python ims-mcp-server/validation/verify_mcp.py
```

Run both r1 and r2. If your change touches Redis-dependent features, run with and without `REDIS_URL`.

### Unit tests

```bash
# MCP server tests
tools/venv/bin/pytest ims-mcp-server/tests

# CLI tests
cd tools && PYTHONPATH=. venv/bin/pytest tests
```

### Type checking

```bash
./validate-types.sh
```

Run this after any Python code change.

---

## Dev Environment: Integration Testing

After local validation passes, test end-to-end against the dev environment.

### 1. Publish instructions to dev

```bash
cd tools
source venv/bin/activate
cp .env.dev .env
python ims_cli.py publish ../instructions
```

This publishes to the dev RAGFlow instance. Only changed files are uploaded (MD5-based change detection). Use `--force` to republish everything.

### 2. Test MCP (STDIO against dev)

Connect your IDE using the STDIO configs from [Local Development: MCP](#local-development-mcp). This validates that your published instructions are served correctly through the MCP layer.

### 3. Test Instructions from MCP (HTTP, default mode)

This is the mode end users run. Connect your IDE to the hosted dev MCP endpoint over HTTP.

**Claude Code:**

```bash
claude mcp add --transport http Rosetta https://ims-dev.evergreen.gcp.griddynamics.net/mcp
```

**Codex:**

```bash
codex mcp add Rosetta --url https://ims-dev.evergreen.gcp.griddynamics.net/mcp
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "Rosetta": {
      "url": "https://ims-dev.evergreen.gcp.griddynamics.net/mcp"
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
      "url": "https://ims-dev.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}
```

Authenticate via OAuth when prompted. Ask the agent: "What can you do, Rosetta?" to verify the full pipeline.

### 4. Test CLI changes

If you changed CLI commands, run them against dev with `--dry-run` first, then without:

```bash
python ims_cli.py publish ../instructions --dry-run
python ims_cli.py publish ../instructions
python ims_cli.py list-collection --collection aia-r2
```

---

## Where to Change What


| Change type            | Location                                              | Validation                                    |
| ---------------------- | ----------------------------------------------------- | --------------------------------------------- |
| New/modified skill     | `instructions/r2/core/skills/<name>/SKILL.md`         | Publish, test via MCP                         |
| New/modified agent     | `instructions/r2/core/agents/<name>.md`               | Publish, test via MCP                         |
| New/modified workflow  | `instructions/r2/core/workflows/<name>.md`            | Publish, test via MCP                         |
| New/modified rule      | `instructions/r2/core/rules/<name>.md`                | Publish, test via MCP                         |
| Organization extension | `instructions/r2/<org>/` (same type structure)        | Publish, test via MCP                         |
| MCP tool or prompt     | `ims-mcp-server/ims_mcp/server.py`, `tool_prompts.py` | verify_mcp.py, pytest, validate-types.sh      |
| CLI command            | `tools/commands/`                                     | pytest, dry-run, publish to dev               |
| Website                | `docs/web/`                                           | Local Jekyll build                            |
| Documentation          | `docs/`, repo root `.md` files                        | Review against [plan/INDEX.md](plan/INDEX.md) |


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

## Related Docs

- [Contributing](CONTRIBUTING.md) — fastest path to a merged PR
- [Architecture](docs/ARCHITECTURE.md) — system structure, components, data flow
- [Quickstart](QUICKSTART.md) — zero to working setup
- [Overview](OVERVIEW.md) — mental model, key concepts
- [Review Standards](REVIEW.md) — what reviewers verify
- [Usage Guide](USAGE_GUIDE.md) — how to use Rosetta flows
- [Deployment Guide](DEPLOYMENT_GUIDE.md) — RAGFlow, MCP, Helm deployment
- [Troubleshooting](TROUBLESHOOTING.md) — symptom-first diagnosis

