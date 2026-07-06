# Architecture

**Who is this for?** Contributors who need to understand how Rosetta works before changing it.

**When should I read this?** After [OVERVIEW.md](../OVERVIEW.md). Before touching MCP tools, CLI publishing, instruction content, or folder structure.

For terminology (workflow, skill, rule, subagent, bootstrap, etc.), see [OVERVIEW.md — Key Concepts](../OVERVIEW.md#key-concepts).

---

## Two Repositories

Rosetta operates across two distinct repository types:

**Instructions repository** (this repo). Where common instructions are defined: skills, agents, workflows, rules, templates. Published to RAGFlow via the CLI. Maintained by instruction authors.

**Target repository** (any project). Where Rosetta is applied. The coding agent runs here, receives instructions from Rosetta MCP, and maintains workspace files (`docs/CONTEXT.md`, `agents/IMPLEMENTATION.md`, etc.). Maintained by developers using AI coding agents.

The instructions repo defines *how agents should behave*. The target repo is *where agents do the work*.

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│              Target Repository + IDE                    │
│  Cursor · Claude Code · VS Code · JetBrains · Codex     │
│  Windsurf · Antigravity · OpenCode                      │
│                         │                               │
│                    MCP Protocol                         │
│             (Streamable HTTP + OAuth)                   │
└────────────────────────┬────────────────────────────────┘
                         │ PULL
              ┌──────────▼──────────┐
              │    Rosetta MCP      │
              │   (ims-mcp on PyPI) │
              │                     │
              │  VFS resource paths │
              │  Bundler · Tags     │
              │  Context headers    │
              └──────────┬──────────┘
                         │ PULL
              ┌──────────▼──────────┐
              │   RAGFlow (Server)  │
              │  (document engine)  │
              │                     │
              │  parse · chunk      │
              │  embed · retrieve   │
              └──────────▲──────────┘
                         │ PUSH
              ┌──────────┴──────────┐
              │    Rosetta CLI      │
              │ (rosetta-cli PyPI)  │
              │                     │
              │  publish · parse    │
              │  verify · cleanup   │
              └──────────▲──────────┘
                         │ PUSH
              ┌──────────┴──────────┐
              │  Instructions Repo  │
              │  /instructions/r2/  │
              │                     │
              │  core/ · <org>/     │
              │  skills · agents    │
              │  workflows · rules  │
              └─────────────────────┘
```

Instructions flow up: files are published by the CLI into RAGFlow, served by Rosetta MCP to IDEs. Rosetta does not see or process your source code — by design, it only delivers knowledge and instructions.

---

## Key Principles

**Inversion of control.** Rosetta is designed to not see or process source code or project data. It exposes guardrails, common best practices, and a menu of available instructions. The coding agent selects only what it needs; Rosetta delivers just those — keeping context lean and IP protected.

---

## Environments

- **Rosetta Server (RAGFlow) prod:** `https://<production server URL>/` — document engine backend, dataset management, API keys
- **Rosetta Server (RAGFlow) dev:** `https://<development server URL>/` — dev instance for testing publishes
- **Rosetta HTTP MCP prod:** `<rosetta MCP production server URL>` — production MCP endpoint for end users
- **Rosetta HTTP MCP dev:** `<rosetta MCP development server URL>` — dev MCP endpoint for integration testing

> **Note:** The repo's `.mcp.json` (Claude Code contributor config) intentionally points to the **dev** MCP endpoint. Contributors developing Rosetta connect to dev so their in-progress instruction changes are reflected immediately. End users should connect to the production endpoint — see [Installation](../INSTALLATION.md) and [Quickstart](../QUICKSTART.md).

---

## Rosetta MCP

The MCP server is the guiding layer between IDEs and the knowledge base. It exposes guardrails and common best practices, and provides a structured menu of available instructions; the coding agent selects what it needs, and Rosetta delivers only those — preventing context overload. Published on PyPI as `ims-mcp`. Built on [FastMCP v3](https://gofastmcp.com/) (latest stable) with [OAuthProxy](https://gofastmcp.com/servers/auth/oauth-proxy) for authentication and [RAGFlow](https://ragflow.io/) as the document engine backend. Speaks in VFS resource paths, adds context headers describing what information means and how to use it, and controls context size automatically.
MCP changes are validated with `pytest`, `validate-types.sh`, and the end-to-end `verify_mcp.py` integration check.

**Transport options:**
- **Streamable HTTP with OAuth** (default). Stateful: the server holds session state and can issue callbacks to the IDE. Zero local dependencies. Cursor, Claude Code, and Codex connect directly. When scaling to multiple replicas, sticky sessions are required (see [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)).
- **STDIO** for air-gapped environments. Runs `uvx ims-mcp` locally with API key auth.

**Authentication:** HTTP uses OAuth 2.1 via FastMCP's proxy layer (supports any provider: Keycloak, GitHub, Google, Azure). STDIO uses `ROSETTA_API_KEY`. Policy-based authorization: `aia-*` read-only, `project-*` configurable. For the two-leg proxy architecture, scope separation, and token lifecycle details, see [AUTHENTICATION.md](AUTHENTICATION.md).

Three OAuth modes controlled by `ROSETTA_OAUTH_MODE`:

**`oauth` mode** (default) — generic OAuth 2.0 with token introspection:

| Env var | Purpose |
|---|---|
| `ROSETTA_OAUTH_AUTHORIZATION_ENDPOINT` | Upstream IdP authorization URL |
| `ROSETTA_OAUTH_TOKEN_ENDPOINT` | Upstream IdP token URL |
| `ROSETTA_OAUTH_INTROSPECTION_ENDPOINT` | Upstream IdP introspection URL |
| `ROSETTA_OAUTH_CLIENT_ID` | Pre-registered IdP client ID |
| `ROSETTA_OAUTH_CLIENT_SECRET` | IdP client secret |
| `ROSETTA_OAUTH_BASE_URL` | Public URL of Rosetta MCP |
| `ROSETTA_JWT_SIGNING_KEY` | Secret for signing FastMCP JWTs |
| `ROSETTA_OAUTH_REVOCATION_ENDPOINT` | *(optional)* Token revocation URL |
| `ROSETTA_OAUTH_CALLBACK_PATH` | *(optional)* Callback path (default: `/auth/callback`) |
| `ROSETTA_OAUTH_REQUIRED_SCOPES` | *(optional)* Scopes required on tokens |
| `ROSETTA_OAUTH_VALID_SCOPES` | *(optional)* Scopes advertised in `.well-known` |
| `ROSETTA_OAUTH_EXTRA_SCOPES` | *(optional)* Scopes forwarded to IdP authorize endpoint |

Upstream IdP issues opaque tokens; Rosetta introspects them on each request via `IntrospectionTokenVerifier`. Cached 15 min.

**`oidc` mode** — OIDC auto-discovery with local JWT verification:

| Env var | Purpose |
|---|---|
| `ROSETTA_OAUTH_OIDC_CONFIG_URL` | IdP OIDC discovery URL (`.well-known/openid-configuration`) |
| `ROSETTA_OAUTH_CLIENT_ID` | Pre-registered IdP client ID |
| `ROSETTA_OAUTH_CLIENT_SECRET` | IdP client secret |
| `ROSETTA_OAUTH_BASE_URL` | Public URL of Rosetta MCP |
| `ROSETTA_JWT_SIGNING_KEY` | Secret for signing FastMCP JWTs |
| `ROSETTA_OAUTH_CALLBACK_PATH` | *(optional)* Callback path (default: `/auth/callback`) |
| `ROSETTA_OAUTH_REQUIRED_SCOPES` | *(optional)* Scopes required on tokens |
| `ROSETTA_OAUTH_EXTRA_SCOPES` | *(optional)* Scopes forwarded to IdP authorize endpoint |

Rosetta fetches IdP endpoints automatically from the discovery doc; tokens are JWTs verified locally via JWKS. No per-request introspection calls.

**`github` mode** — GitHub OAuth via [GitHubProvider](https://gofastmcp.com/integrations/github):

| Env var | Purpose |
|---|---|
| `ROSETTA_OAUTH_CLIENT_ID` | GitHub OAuth App Client ID |
| `ROSETTA_OAUTH_CLIENT_SECRET` | GitHub OAuth App Client Secret |
| `ROSETTA_OAUTH_BASE_URL` | Public URL of Rosetta MCP (HTTPS required in production) |
| `ROSETTA_JWT_SIGNING_KEY` | Secret for signing FastMCP JWTs |
| `ROSETTA_OAUTH_CALLBACK_PATH` | *(optional)* Callback path (default: `/auth/callback`) |
| `ROSETTA_OAUTH_REQUIRED_SCOPES` | *(optional)* Required GitHub scopes (default: `user`) |

GitHub endpoints are hardcoded. Tokens are validated via the GitHub API (`https://api.github.com/user`). User identity is extracted from GitHub profile (login, name, email).

All three modes issue FastMCP JWTs to MCP clients and store upstream tokens in Redis (encrypted with `FERNET_KEY`). MCP clients never see IdP tokens; the IdP never sees FastMCP JWTs.

### Redis Schema Migrations

`ims_mcp/migrations.py` runs sequential schema migrations against Redis on every server startup via the FastMCP lifespan hook. Migrations are numbered methods (`_migrate_to_N`); only those ahead of the stored version run.

**Key details:**
- Version tracked in `rosetta:redis-schema-version` (plain integer)
- Distributed lock (`rosetta:migration-lock`, 60 s TTL) prevents concurrent runs across pods on rolling deploys
- Each migration runs exactly once; safe to deploy to multiple replicas simultaneously
- All migration activity logged at `INFO` level under `ims_mcp.migrations`

**Current migrations:**

| Version | What it does |
|---|---|
| 1 | Baseline no-op — marks pre-migration deployments as version 1 |
| 2 | Flushes `mcp-oauth-proxy-clients:*` keys so DCR/CIMD clients re-register with correct `required_scopes` |

**Adding a migration:** add `_migrate_to_N`, bump `LATEST_REDIS_SCHEMA_VERSION = N`, deploy.

### VFS and Tags

Everything MCP works with is VFS (virtual file system) resource paths. The CLI strips instruction root prefixes during publishing, so `core/skills/planning/SKILL.md` becomes `skills/planning/SKILL.md`. Files at the same resource path get bundled together.

**Tags are the primary access mechanism.** `ACQUIRE <path> FROM KB` queries by tags, which provides the most direct and fastest access. The CLI's auto-tagging was designed specifically for this: every folder name, filename, and composite pair/triple becomes a tag, so agents can request exactly what they need. Keyword search via `SEARCH` is the fallback for discovery.

### MCP Tools

Three tools and one resource are currently exposed to agents. Five write-data tools are implemented but disabled (`@mcp.tool` registration commented out in `server.py`; the feature is retired but the code is kept in case it's needed again):

| Tool | Purpose |
|---|---|
| `get_context_instructions` | Bootstrap: load all rules and guardrails bundled (prep step 1 to 3)  |
| `query_instructions` | Fetch instruction docs by tags (primary) or keyword search (fallback) |
| `list_instructions` | Browse the VFS hierarchy (flat listing of immediate children) |
| `query_project_context` *(disabled)* | Search project-specific docs in a target repo dataset |
| `store_project_context` *(disabled)* | Create or update a document in a project dataset |
| `discover_projects` *(disabled)* | List readable project datasets |
| `plan_manager` *(disabled)* | Manage execution plans with phases, steps, dependencies, status. Has a `help` command for plan creators (subagents don't need it). Stores plan in REDIS. |
| `submit_feedback` *(disabled)* | Auto-submit structured feedback on agent sessions |

**Resource:** `rosetta://{path}` reads bundled instruction documents by VFS resource path.

### Bundler

The Bundler merges multiple documents at the same VFS resource path into a single XML response. When an agent ACQUIREs a skill, core and organization files at that path are concatenated into one payload:

```xml
<rosetta:file id="..." dataset="..." path="skills/planning/SKILL.md" name="..." tags="..." frontmatter="...">
  [document content from core]
</rosetta:file>
<rosetta:file id="..." dataset="..." path="skills/planning/SKILL.md" name="..." tags="..." frontmatter="...">
  [document content from organization overlay]
</rosetta:file>
```

Documents sorted by `sort_order` (default: 1000000), then by name. `INSTRUCTION_ROOT_FILTER` controls which layers are included (e.g., `CORE,GRID`).

### Listing

Listing shows what exists in the VFS without loading content. Implemented by `list_instructions` to browse the instruction hierarchy. Two formats:

**XML format** (default) includes metadata attributes:
```xml
<rosetta:folder dataset="..." path="skills/" />
<rosetta:folder dataset="..." path="rules/" />
<rosetta:file id="..." path="skills/planning/SKILL.md" name="..." tag="skills/planning/SKILL.md" frontmatter="..." />
```

**Flat format** returns resource paths only:
```
skills/planning/SKILL.md
skills/coding/SKILL.md
rules/guardrails.md
```

A full instruction suite listing is ~400 tokens. Frontmatter attributes (extracted by CLI during publishing) let agents understand document purpose from the listing alone, without follow-up reads.

### Context Overflow Prevention

MCP manages context size through two mechanisms:

- **Query list threshold (5).** When `query_instructions` matches 5 or fewer documents, MCP returns full bundled content. When more than 5 match, it returns a listing instead, with a header guiding the agent to ACQUIRE specific files by their unique tags. This keeps responses bounded regardless of knowledge base size.
- **Context headers.** Every MCP response includes a descriptive header explaining what the returned information is and how to act on it.

### Command Aliases

Command aliases are used exclusively for Rosetta MCP resources (instructions, knowledge base, project datasets). Workspace files in the target repository (`docs/CONTEXT.md`, `agents/IMPLEMENTATION.md`, etc.) are read directly from the filesystem. This boundary is intentional: when an agent sees `ACQUIRE ... FROM KB`, it knows it is calling Rosetta MCP; when it reads a file, it knows it is working with target repository files.

Instructions never call MCP tools directly. Rosetta defines command aliases that work across all IDEs and coding agents. This serves three purposes:

- **Portability.** Same instructions work in Cursor, Claude Code, VS Code, JetBrains, Codex, and any MCP-compatible tool.
- **Decoupling.** Instruction content is independent of MCP API changes.
- **Authoring.** Workflows, skills, and rules reference each other through aliases, not tool calls.

| Alias | Maps to |
|---|---|
| `GET PREP STEPS` | `get_context_instructions()` |
| `ACQUIRE <path> FROM KB` | `query_instructions(tags="<path>")` |
| `SEARCH <keywords> IN KB` | `query_instructions(query="<keywords>")` |
| `LIST <folder> IN KB` | `list_instructions(full_path_from_root="<folder>")` |
| `USE SKILL <name>` | Load skill (fetches `SKILL.md` internally) |
| `INVOKE SUBAGENT <name>` | Call subagent (fetches `agents/<name>.md`) |
| `USE FLOW <name>` | Use workflow or command |
| `ACQUIRE <file> ABOUT <project>` | `query_project_context(repository_name, tags)` |
| `QUERY <keywords> IN <project>` | `query_project_context(repository_name, query)` |
| `STORE <file> TO <project>` | `store_project_context(repository_name, ...)` |
| `/rosetta` | Engage only the Rosetta flow |

ACQUIRE expects a VFS resource path: filename, parent/filename, or grandparent/parent/filename. LIST preferred over SEARCH when the folder is known.

### Bootstrap Flow

One `get_context_instructions` call returns all bootstrap rules bundled (core policy, execution policy, guardrails, HITL, rosetta files description). Three prep steps guide the agent on what to do next:

```
1. Agent connects to Rosetta MCP

2. Server + tool instructions enforce: "call get_context_instructions first"

3. Prep Step 1 — get_context_instructions
   └── Returns bundled bootstrap-* rules: core policy, execution policy,
       guardrails, HITL questioning, workspace file definitions

4. Prep Step 2 — Load project context (direct file reads from target repository)
   └── Read CONTEXT.md, ARCHITECTURE.md; grep headers of other workspace files

5. Prep Step 3 — Classify and route
   └── LIST workflows IN KB; ACQUIRE matching workflows
       Agent now has: bootstrap rules + project context + workflow instructions

6. Agent executes the workflow
   ├── Follows phases (Prepare → Research → Plan → Act → Validate)
   ├── Uses ACQUIRE/USE SKILL/INVOKE SUBAGENT to load instructions progressively
   ├── Delegates to subagents, tracks progress via built-in todo tasks (r3 adds the operation-manager skill, backed by `rosettify`, for larger multi-phase work)
   └── Applies guardrails and HITL gates throughout
```

All three prep steps are mandatory regardless of task size. The agent calls `get_context_instructions` exactly once per session.

**Key environment variables:** `ROSETTA_SERVER_URL`, `ROSETTA_API_KEY`, `INSTRUCTION_ROOT_FILTER`, `REDIS_URL`

For MCP setup across all IDEs, see [Get Started](https://griddynamics.github.io/rosetta/#quick-start).

---

## RAGFlow (Rosetta Server)

RAGFlow is the document storage and retrieval engine. Rosetta uses it for ingestion, parsing, embedding, and search. Not exposed to end users directly.

**Deployment:** Local via Docker Compose at `http://localhost:80`, Development at https://<development server URL>, or hosted production.

**Processing pipeline:** Upload (upsert by deterministic UUID) → Parse (server-side) → Chunk → Embed → Index. Repeated publishes are idempotent.

**Datasets:**

| Dataset | Purpose |
|---|---|
| `aia` | Base fallback (files without a release) |
| `aia-r1` | R1 release (stable) |
| `aia-r2` | R2 release (current) |
| `project-*` | Per-repository collections in target repos (per OAuth policy) |

Instruction dataset names auto-generated from template `aia-{release}`.

All prefixes are internal only, it must not be exposed or received. This prevents cross-dataset security issues. Any user of MCP must not be aware of those existence.

**Metadata per document:** tags, domain, release, content_hash (MD5), resource_path, sort_order, frontmatter, original_path, line_count.

For RAGFlow internals, see [RAGFLOW.md](RAGFLOW.md).

---

## Rosetta CLI

The CLI (`rosetta-cli`, published on PyPI) publishes instructions from the instructions repository into RAGFlow. It handles change detection, metadata extraction, frontmatter parsing, and auto-tagging.

**Requirements-first:** spec-before-code from `docs/requirements/rosetta-cli/` (authoritative; code follows).

**Core commands:**

| Command | What it does |
|---|---|
| `uvx rosetta-cli@latest publish instructions` | Publish changed files (incremental, MD5-based) |
| `uvx rosetta-cli@latest publish instructions --force` | Republish all files regardless of changes |
| `uvx rosetta-cli@latest publish instructions --dry-run` | Preview what would be published |
| `parse` | Trigger server-side document parsing |
| `verify` | Test connection and health |
| `list-dataset --dataset aia-r2` | List documents in a dataset |
| `cleanup-dataset --dataset aia-r2` | Delete documents from a dataset |

**Critical rule:** Always publish the entire `/instructions` folder. Never subfolders or single files (breaks tag extraction).

**Change detection:** MD5 hash of content. Only modified files publish (~77% time savings). Use `--force` to bypass.

**Auto-tagging and metadata extraction.** The CLI reads each file during publishing and extracts everything MCP needs to serve it efficiently:
- **Tags:** all folder names + filename + composite pairs/triples (`core/skills`, `r2/core/skills`, etc.). These are what `ACQUIRE FROM KB` queries against.
- **Frontmatter:** parsed from file content, saved as metadata. Exposed later in `<rosetta:file>` attributes so agents see document structure without loading full content.
- **Resource path:** `skills/planning/SKILL.md` (org prefix stripped). This is the VFS path used everywhere in MCP.
- **Domain** (`core`), **release** (`r2`), **collection** (`aia-r2`): derived from folder structure.
- **Title:** `[r2][core][skills][planning] SKILL.md` (tag-in-title format).

**Environment:** `.env.dev` (dev RAGFlow) or `.env.prod` (production). Switch with `cp .env.dev .env`.

For local testing use the repo virtualenv and run from `src/rosetta-cli/` the module directly, for example: `../../venv/bin/python -m rosetta_cli version`, `../../venv/bin/python -m rosetta_cli verify --env dev`, `../../venv/bin/python -m rosetta_cli publish ../../instructions --dry-run --env dev`, or `../../venv/bin/python -m rosetta_cli parse --dataset aia-r2 --dry-run --env dev`.

For deployment details, see [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md).

---

## Rosettify

Local CLI/MCP utility for AI coding agents and users. Purpose: deterministic local AI coding workflow execution and single entry point for Rosetta tooling in any project. All data and IP stays local — zero network calls during operation.

Published on npm as `rosettify`. Invoked via `npx -y rosettify@latest <command> [subcommand] [args]` or as a local MCP server (`rosettify --mcp`) over stdio.

**Requirements-first:** spec-before-code from `docs/requirements/rosettify/` (authoritative; code follows).

**Key points:**
- **Dual frontend.** One CLI and one MCP server backed by the same run delegates. Identical behavior in both modes.
- **Plan management** (current feature). `npx -y rosettify@latest plan <subcommand> <plan_file>` — create, track, and advance execution plans as local JSON files. Subcommands: `create`, `next`, `update_status`, `show_status`, `query`, `upsert`, `create-with-template`, `upsert-with-template`, `list-templates`.
- **Atomic write cycle with backup chain.** Every plan mutation uses a rename-as-guard cycle: rename the plan file to `<file>.bakNNN` as the atomic lock, then write the new content. The plan's `previous_version` field tracks the prior backup path. Up to 5 backups retained; bounded to 50 retries.
- **Template registry.** Two compiled-in template kinds (`create`, `upsert`) with strict bidirectional placeholder matching. Seed templates ship with the package.
- **Sequential phase enforcement.** `next` returns work from the earliest incomplete phase only; later phases are blocked until all earlier phases are done.
- **Static tool registry.** Each command is a `ToolDef` with name, description, input/output schema, CLI and MCP flags, and a typed run delegate.
- **No network calls.** All data stays local — safe for IP-sensitive projects.

Validated with `npm run typecheck`, `npm run test` (vitest, 90% line + branch coverage). Published via `.github/workflows/publish-rosettify.yml`. Version managed via `scripts/bump_versions.sh`.

---

## Rosettify Prompts

`rosettify-prompts` (npm; `src/rosettify-prompts/`) — prompt A/B/N bench against the Anthropic API. Runs N conversation variants ×`repetitions` concurrently; compares input/output/thinking tokens, cost, latency, stability. Dev/eval tool only — not shipped to end users, not in the runtime path. Config-driven (`evals.json`); needs `ANTHROPIC_API_KEY`.

---

## Curiocity

`curiocity` (npm; `src/curiocity/`) — evals/testing harness that drives interactive coding-agent CLIs (Claude Code, Codex) through a prompt over a real PTY, reads each CLI's native on-disk transcript as the source of truth, auto-answers the agent's genuine questions via LLM, then scores every run with deterministic checks + an LLM judge and gates CI on the aggregate. Used for CI/CD regression of the Rosetta plugin and for benchmarking agents. Case-driven (`--source <dir>` of `prompt.md`/`config.json`/`qna.md`/`evaluation.md`/`src.zip` folders); full design in [`src/curiocity/docs/architecture.md`](../src/curiocity/docs/architecture.md).

---

## Instruction Structure

Instructions live in `/instructions/r2/` in the instructions repository, using a layered folder structure.

```
/instructions/r2/
├── core/                  ← Rosetta instruction source
│   ├── skills/
│   │   └── <name>/
│   │       ├── SKILL.md
│   │       ├── references/
│   │       └── assets/
│   ├── agents/
│   │   └── <name>.md
│   ├── workflows/
│   │   ├── <name>.md
│   │   └── <name>-<phase>.md
│   ├── rules/
│   │   └── <name>.md
│   └── commands/
│
└── <org>/                 ← Optional organization extensions (e.g., acme/)
    ├── skills/
    ├── agents/
    ├── workflows/
    ├── rules/
    └── commands/
```

**Layered customization.** Core provides the universal foundation. Organization folders extend or override it. Files at the same VFS resource path get **bundled together** by the Bundler. `INSTRUCTION_ROOT_FILTER` controls which layers are included (e.g., `CORE,GRID`).

**Component relationships.** Workflows invoke subagents. Subagents use skills. All reference rules. Templates live inside skills. Guardrails are rules. See [Overview — Key Concepts](../OVERVIEW.md#key-concepts) for definitions.

**Naming.** Lowercase, dash-separated, globally unique filenames. Entry points: `SKILL.md` for skills, `<name>.md` for agents, workflows, and rules.

---

## Workspace Files

Rosetta initializes and maintains a standard file structure in **target repositories**. These files are how the agent tracks project context, implementation state, and execution plans. All are SRP, DRY, MECE, concise, with grep-friendly topical headers.

**Project documentation (`docs/`):**
- `CONTEXT.md` — business context, target state (no technical details, no changelog)
- `ARCHITECTURE.md` — architecture, technical requirements, modules, workspace structure
- `TODO.md` — improvements, feature requests, large TODOs
- `ASSUMPTIONS.md` — assumptions and unknowns
- `TECHSTACK.md` — tech stack of all modules
- `DEPENDENCIES.md` — dependencies of all modules
- `CODEMAP.md` — code map of the workspace
- `REQUIREMENTS/*` — original requirements with `INDEX.md` and `CHANGES.md`
- `PATTERNS/*` — coding and architectural patterns with `INDEX.md`

**Agent state (`agents/`):**
- `IMPLEMENTATION.md` — current implementation state (the only changelog)
- `MEMORY.md` — root causes of errors, actions tried, lessons learned

**Execution (`plans/`):**
- `<FEATURE>/<FEATURE>-PLAN.md` — execution plan
- `<FEATURE>/<FEATURE>-SPECS.md` — tech specs
- `<FEATURE>/*` — supporting implementation files

**Other:**
- `gain.json` — general SDLC setup and Rosetta file locations (wins in conflicts)
- `refsrc/*` — reference source code for knowledge only (excluded from SCM except `refsrc/INDEX.md`)
- `agents/TEMP/<FEATURE>` — temporary files during implementation (excluded from SCM)

Prep step 2 loads `CONTEXT.md` and `ARCHITECTURE.md` from the target repository. The agent updates `IMPLEMENTATION.md` and `MEMORY.md` as it works. See [Installation — Workspace Files Created](../INSTALLATION.md#workspace-files-created) for the full list of committed and excluded files.

**State management and recovery.** For medium and large tasks, workflows create plan, spec, and state files in `plans/` and `agents/`. These files persist execution state to disk, so if a failure occurs (context loss, crash, timeout), the agent or a new session can resume from the last recorded state rather than starting over.

---

## Data Flow

```
Instructions Repo ──► CLI (publish) ──► RAGFlow ──► Rosetta MCP ──► Target Repo + IDE
```

1. **Publish.** CLI reads `.md` files from instructions repo, extracts tags + frontmatter + metadata, generates deterministic UUID, upserts into dataset
2. **Index.** RAGFlow parses, chunks, embeds, indexes for full-text and semantic search
3. **Bootstrap.** Agent calls `get_context_instructions` via MCP (prep step 1), reads workspace files directly from the target repo (step 2), classifies request via MCP (step 3)
4. **Load.** Agent uses ACQUIRE/SEARCH/LIST aliases. MCP queries by tags, bundles matching VFS paths into XML with context headers. Progressive disclosure: only what the workflow needs
5. **Execute.** Workflow phases (Prepare → Research → Plan → Act → Validate), subagent delegation, built-in todo tracking (or the r3 operation-manager skill for larger work), guardrails and HITL gates.

---

## Development

### Prerequisites

- Python 3.12 (virtual environment at repo root: `venv/`)
- Pre-commit hook exists

### MCP and Server

MUST use the same venv in both cases: `venv/`.
There are `.env.dev` and `.env.prod`.
MUST not read any .env files.

### Publishing Instructions

Publish instructions to remote IMS server:

```bash
cp .env.dev .env
uvx rosetta-cli@latest publish instructions
```

### Plugins (pre-release)

Instructions to `plugins` folder content must be regenerated with `venv/bin/python scripts/pre_commit.py` (which calls `npx -y rosettify-plugins@latest` internally).
Pre-commit hook is also created, but we must not rely on it.
Do not directly modify instructions in `plugins` folder instead edit original files in `instructions` and use script to copy/adapt.

Claude Code Plugin: only Anthropic `sonnet`/`opus`/`haiku` models are supported.
Codex Plugin: only OpenAI `gpt-*` models are supported.

Plugins are an alternative delivery mechanism to MCP. They deliver instructions directly to the user's profile or repository — no MCP connection or server needed. Instructions are copied at install time, so the agent works entirely from local files.

Each plugin contains core instructions: 36 skills, 7 agents, 12 workflows, and bootstrap rules. The content is identical across plugins — only the format differs per IDE.

| Plugin | IDE | Mode |
|---|---|---|
| `core-claude` | Claude Code | Plugin marketplace |
| `core-cursor` | Cursor | Plugin marketplace |
| `core-copilot` | VS Code Copilot, JetBrains Copilot | Plugin marketplace |
| `core-codex` | Codex | Plugin marketplace |
| `core-cursor-standalone` | Cursor | Direct extraction into repo (`.cursor/`) |
| `core-copilot-standalone` | VS Code Copilot, JetBrains Copilot | Direct extraction into repo (`.github/`) |

All plugins are generated from the **release-selected** source tree (`instructions/<release>/core/`) by the plugin generator (`rosettify-plugins`, `npx -y rosettify-plugins@latest`). **Requirements-first:** spec-before-code from `docs/requirements/plugin-generator/` (authoritative FRs/NFRs; code follows). The release is chosen by `--release` (default **r2**, matching ims-mcp's `DEFAULT_VERSION`; r3 is opt-in); r2 uses SessionStart bootstrap only, r3 adds full advisory hooks. The generator builds main plugins then derives standalone variants. `.tmpl` files are Handlebars templates rendered by the generator.

**Run it standalone:** `npx -y rosettify-plugins@latest [--release r2|r3] [--output DIR] [--source DIR]` — `--release` selects the instructions source (default `r2`), `--output` redirects generated plugins (default `<source>/plugins`), `--source` sets the repo root (default: current directory). `pre_commit.py` invokes it with no args (→ r2, output defaults to `<repo-root>/plugins`). The generator copies core instructions and adapts them for the target coding agent:

- **Model rewriting** — selects the first model from the frontmatter `model:` comma-separated list and normalizes it to the platform's format. Cursor normalizes to short IDs (e.g. `claude-sonnet-5`, `gpt-5.4`); Copilot to display names (e.g. `Claude Sonnet 5`, `GPT-5.4`); Claude Code to full model IDs (`claude-sonnet-5`, `claude-opus-4-8`, `claude-haiku-4-5`).
- **Agent file format** — converts agent markdown to the IDE's expected format (`.agent.md` for Copilot, `.toml` for Codex)
- **Directory layout** — restructures output to match IDE conventions (`.agents/` and `.codex/` for Codex, runtime configs at root for Copilot). Cursor uses `commands/` instead of `workflows/` for workflow files; Copilot uses `prompts/` with files renamed from `*.md` to `*.prompt.md`. Content references are rewritten using precise full-path replacement (`workflows/coding-flow.md` → `commands/coding-flow.md` / `prompts/coding-flow.prompt.md`) to avoid accidental partial-word matches.
- **Index generation** — produces `rules/INDEX.md` and `workflows/INDEX.md` (or `commands/INDEX.md` for Cursor, `prompts/INDEX.md` for Copilot) listings. Only files with `tags: ["workflow"]` appear in the workflow index; phase files are excluded. All three folder names use the heading `# Rosetta Workflows Index`.
- **Template processing** — `.tmpl` files render to a sibling file (same path, `.tmpl` suffix removed) with platform placeholders substituted. Cursor and Copilot each ship **two** templates: a plugin-marketplace form (paths resolve under plugin install dir) and a standalone form (paths resolve from a user's project root). Both forms render into the main plugin tree; the standalone generator picks the right one for extraction.
- **Copilot session locking** — Copilot has no native hook deduplication, so the generated hooks include a file-based lock ensuring each bootstrap entry fires exactly once per session. Other platforms use IDE-native mechanisms (Claude Code: `"once": true`; Codex and Cursor: built-in deduplication).

Each standard plugin has a preserved config folder (`.claude-plugin/`, `.cursor-plugin/`, `.github/`, `.codex-plugin/`) holding the IDE manifest (`plugin.json`) and static configs. `hooks/` is also preserved for Claude, Cursor, and Copilot (carries the plugin-form `hooks.json.tmpl`); Cursor additionally preserves a root-level `hooks.json.tmpl` (standalone-form). Everything outside preserved paths is wiped and regenerated per sync. Bootstrap payloads are embedded in Claude/Codex hook templates; Cursor and Copilot rely on rules and instructions instead.

**Standalone plugins** (`core-cursor-standalone`, `core-copilot-standalone`) are a second-pass derivative built from the already-synced main plugins (including their hook bundles) and placed entirely under the IDE's expected subfolder (`.cursor/` or `.github/`). Wiped and recreated per sync. Each IDE expects hooks at a different relative path, so the templates and cleanup differ:

| | Cursor standalone | Copilot standalone |
|---|---|---|
| Standalone hooks.json path | `.cursor/hooks.json` (top) | `.github/hooks/hooks.json` (nested) |
| Standalone-form template lives at | `<plugin>/hooks.json.tmpl` (root) | `<plugin>/hooks/hooks.json.tmpl` |
| Bundles after extraction | `.cursor/hooks/*.js` | `.github/hooks/*.js` |
| Path style in hooks.json | `node .cursor/hooks/<file>.js` | `node ".github/hooks/<file>.js"` |
| Bootstrap delivery | Native Cursor rules (`rules/*.mdc`) | Auto-loaded `instructions/*.instructions.md` |

When the source plugin contains a directory whose name matches the standalone's `subfolder` (e.g. cursor's bulk-copy would otherwise produce `.cursor/.cursor/`), the generator merges its contents directly into the subfolder to avoid nesting. Each standalone also runs IDE-specific transforms: Cursor injects `commands/INDEX.md` into `rules/plugin-files-mode.mdc`; Copilot moves `rules/bootstrap-*.md` and `rules/plugin-files-mode.md` to `instructions/*.instructions.md` (auto-loaded via `applyTo: "**"`), renames `commands/` → `prompts/` and `*.md` → `*.prompt.md`, rewrites cross-references by exact-string pass, and strips the plugin-marketplace `hooks.json`/`.mcp.json`/`templates/`. `plugin.json` for each standalone is regenerated with the source plugin's version.

### Hooks Runtime

Hooks are lightweight scripts that run in response to IDE tool calls (PostToolUse, PreToolUse). They inject advisory context into the AI's context window — nothing is displayed directly to the user.

**Hook contracts — source of truth:** `docs/hooks/<ide>.md` (`claude-code`/`codex`/`cursor`/`copilot`/`windsurf`) — empirically verified per-IDE I/O, exit codes, matchers. Adapters + `instructions/*/configure/*.md` reconcile TO these specs, never the reverse; protocol in `docs/hooks-verify.md`.

Source lives in `src/hooks/` and is compiled per-IDE before sync:

| Folder | Contents |
|---|---|
| `src/hooks/src/` | TypeScript source — adapter, lock, debug-log, hook implementations |
| `src/hooks/tests/` | Vitest unit tests + fixtures, and a log-driven E2E suite (`tests/e2e/`) that replays REAL captured wire payloads (`docs/hooks/<ide>-logs.txt`) through the full pipeline (no adapter mocks) to catch canonical-mapping regressions |
| `src/hooks/scripts/` | esbuild bundler (`build-bundles.mjs`) |
| `src/hooks/dist/bundles/` | Compiled per-IDE bundles (generated, not committed) |

Each hook is bundled separately per IDE via esbuild so each bundle contains only its adapter code. To add a new hook: create the `.ts` source in `src/hooks/src/hooks/`, then add its filename to the `HOOK_SOURCES` array in `src/hooks/scripts/build-bundles.mjs`.

**Active hooks (the same five bundles ship with every plugin and standalone):**

| Hook | Event | Purpose |
|---|---|---|
| `dangerous-actions.js` | PreToolUse | Two-tier deny on dangerous shell/edit/MCP patterns; `# Rosetta-AI-reviewed` marker allows retry on `reconsider` policy; `hard-deny` patterns (e.g. `curl \| sh`) require human review |
| `loose-files.js` | PostToolUse (Write) | Nudges agent when `.py`/`.js` files are created without a module marker (`__init__.py` / `package.json`) |
| `md-file-advisory.js` | PostToolUse (Write\|Edit) | Advises on markdown formatting/placement after `.md` edits |
| `lint-format-advisory.js` | PostToolUse (Write\|Edit) | Suggests a syntax/type/lint/format check step after code edits |
| `codemap-refresh.js` | PostToolUse (Write\|Edit) | Refreshes the active code-map backend when source files change. Detects GitNexus (`.gitnexus/` marker, runs `npx -y gitnexus@latest analyze --force`) and Graphify (`graphify-out/graph.json` marker, runs `graphify update .`); no-op when neither is installed. When both are present, each backend gets an independent debounced refresh. Manager must review the GitNexus license before use; Graphify is the MIT-licensed alternative. |

**`hooks.json` locations and forms per plugin variant** (each form references the bundles using paths appropriate to its runtime):

| Plugin/standalone | hooks.json read by IDE at | Form | Path style |
|---|---|---|---|
| `core-claude` (marketplace) | `<plugin>/hooks/hooks.json` (referenced from `plugin.json`) | plugin-form | `node hooks/<file>.js` |
| `core-cursor` (marketplace) | `<plugin>/hooks/hooks.json` (referenced from `plugin.json`) | plugin-form | `node hooks/<file>.js` |
| `core-copilot` (marketplace) | `<plugin>/hooks.json` (root, copied from `.github/plugin/hooks.json` at sync time) | plugin-form | env-var lookup to plugin install root |
| `core-codex` (marketplace) | `<plugin>/.codex-plugin/hooks.json` (also mirrored to `<plugin>/.codex/hooks.json` at sync time) | plugin-form | `node <abs-path>/hooks/<file>.js` via shell lookup |
| `core-cursor-standalone` | `.cursor/hooks.json` (top of extracted subfolder) | standalone-form | `node .cursor/hooks/<file>.js` |
| `core-copilot-standalone` | `.github/hooks/hooks.json` (nested inside extracted subfolder) | standalone-form | `node ".github/hooks/<file>.js"` |

Cursor and Copilot are the only plugins that need two distinct templates because they have distinct standalone distributions. Templates: cursor — `hooks/hooks.json.tmpl` (plugin) + `hooks.json.tmpl` at root (standalone); copilot — `.github/plugin/hooks.json.tmpl` (plugin) + `hooks/hooks.json.tmpl` (standalone). Both are rendered during sync; the standalone generator's bulk-copy lands each at the right path inside the standalone subfolder.

- **IDE normalization** — `src/adapter.ts` detects the IDE (env signature first, then stdin shape: codex > cursor > claude-code > windsurf > copilot) and normalizes to a canonical `NormalizedInput`, which MUST be fully mapped: a field is empty only when the value is genuinely absent from the raw input AND not derivable from the event name, another field, or the IDE's documented tool/event vocabulary
- **Per-IDE output** — each adapter's `formatOutput` converts canonical output back to the IDE's expected JSON schema

`scripts/pre_commit.py` builds and tests hook bundles, then runs `npx -y rosettify-plugins@latest`, which syncs bundles into each main plugin's hooks directory (`plugins/core-{claude,cursor,copilot}/hooks/`, `plugins/core-codex/.codex/hooks/`) before deriving the standalones. Do not edit those bundle locations directly — edit `src/hooks/src/` and re-run the script.

### Reference Sources (readonly, packages currently used)

`refsrc/fastmcp-3.3.1` contains source code of FastMCP v3. Use `https://gofastmcp.com/llms.txt` - fastmcp index of all dev docs. There is also `https://gofastmcp.com/llms-full.txt` but it is extremely large, it will not fit entirely your context window at all.
`refsrc/python-sdk-1.26.0` contains source code of MCP Python SDK.
`refsrc/ragflow-0.25.1` contains source code of RAGFlow Python SDK (v0.25.1+).

This is for reference purposes only: do not change, do not copy.

# Rosetta MCP (IMS MCP) and Rosetta CLI

MUST validate MCP changes using `.env.dev` and `src/ims-mcp-server/validation/verify_mcp.py` (testing harness of MCP itself).
Integrate new features to this testing harness if needed and easy.
MUST execute `venv/bin/python scripts/pre_commit.py` from repository root. Never filter/grep/tail its output.
Entire `verify_mcp.py` and ALL tests must work.
Always run `verify_mcp.py`: with R2 only.
If REDIS-dependent feature is affected RUN verify_mcp.py with and without REDIS_URL (example: `plan_manager` tool).
Must run `validate-types.sh` (repo root) if code was changed.
Do not tail or limit output of `verify_mcp.py`, it is short already.
Read first 100 lines of `verify_mcp.py` to get instructions ON HOW exactly it should all be done.

Validation command examples:
- `cp .env.dev .env && VERSION=r1 venv/bin/python src/ims-mcp-server/validation/verify_mcp.py`
- `cp .env.dev .env && VERSION=r2 venv/bin/python src/ims-mcp-server/validation/verify_mcp.py`
- `cp .env.dev .env && REDIS_URL="redis://localhost:6379/0" VERSION=r2 venv/bin/python src/ims-mcp-server/validation/verify_mcp.py`

Validation notes discovered during real runs:
- MCP unit tests: `cd src/ims-mcp-server && PYTHONPATH=. ../venv/bin/pytest tests/` or `PYTHONPATH=src/ims-mcp-server venv/bin/pytest src/ims-mcp-server/tests`
- CLI unit tests: `cd src/rosetta-cli && PYTHONPATH=. ../../venv/bin/pytest tests/` or `PYTHONPATH=src/rosetta-cli venv/bin/pytest src/rosetta-cli/tests`
- `verify_mcp.py` flat-list validation must allow plain filenames for `r1` and hierarchical paths for `r2`.

Publishing instructions:
- `cp .env.dev .env && PYTHONPATH=src/rosetta-cli venv/bin/python -m rosetta_cli publish ./instructions --dry-run`
- `cp .env.dev .env && PYTHONPATH=src/rosetta-cli venv/bin/python -m rosetta_cli publish ./instructions`
- DO NOT FILTER OUT THE OUTPUT AS YOU WILL MISS IMPORTANT INFORMATION 

Must read `docs/RAGFLOW.md` fully to understand RAGFlow actual implementation and known issues if CLI or MCP changes involve RAGFlow.

# RAGFlow

RAGFlow is constantly updating, AI knowledge is stale.
Grep TOC, read, and keep updated `docs/RAGFLOW.md` if task involves coding for it.

---

## Pipelines

We use `.github/workflows` pipelines to build and release: MCP PyPi package, Docker Image, Publish Instructions, Publish website.
Triggers on push to `main` or manual dispatch.

Website: builds the Jekyll website from `docs/web/`, deploys to GitHub Pages.

**Plugin distribution (pre-release).** The publish-instructions pipeline zips each plugin folder and attaches the archives to a GitHub Release alongside `instructions.zip`. See [Plugins](#plugins-pre-release) for how plugin files are generated.

---

## Extension Points

Where contributors add or change things:

- **New skill:** Add `instructions/r3/core/skills/<name>/SKILL.md` (or under an org folder; backport to `r2` if stable)
- **New agent:** Add `instructions/r3/core/agents/<name>.md`
- **New workflow:** Add `instructions/r3/core/workflows/<name>.md` (and phase files)
- **New rule:** Add `instructions/r3/core/rules/<name>.md`
- **Organization layer:** Create `instructions/r3/<org>/` with the same type structure
- **MCP tools:** Modify `src/ims-mcp-server/ims_mcp/server.py`
- **Tool prompts:** Modify `src/ims-mcp-server/ims_mcp/tool_prompts.py`
- **CLI commands:** Add to `src/rosetta-cli/rosetta_cli/commands/`
- **Website:** Edit pages in `docs/web/`

After adding or changing instructions, publish with the CLI to make them available via MCP. See the [Developer Guide — Where to Change What](../DEVELOPER_GUIDE.md#where-to-change-what) for the validation steps per change type.

---

## Tradeoffs

- **Release-based versioning over branch-based.** Releases (r1, r2) coexist in the same repo. Enables A/B testing and rollback, but folder structure carries the version.
- **RAGFlow as the knowledge layer.** Chunking, embedding, and search out of the box. Adds a deployment dependency (Docker or hosted). STDIO transport partially mitigates this.
- **Tags as primary access, not search.** ACQUIRE by tag is faster and more precise than keyword search. But requires the auto-tagging scheme to produce useful tags from folder structure.
- **XML bundling with threshold.** Structured `<rosetta:file>` output with metadata attributes. The threshold of 5 prevents context overflow by switching to listing mode. Requires agents to make follow-up requests for specific files. Plus `<rosetta:folder>`
- **Command aliases over direct tool calls.** Portable across IDEs, decoupled from MCP API changes. An indirection layer contributors must learn.
- **Full-folder publishing only.** Prevents broken metadata extraction. Change detection keeps incremental publishes fast.
- **Layered customization over multi-tenancy.** Org folders extend core, not replace it. Requires unique filenames across the tree.
- **Subagent/Skills/Commands Shells.** Create small proxies with proper frontmatters. Proxies use `ACQUIRE FROM KB` commands to load actual content. Coding agents expect Subagents/Skills/Commands in specific format in specific locations in the repository. Copying to repo make them stale. Not copying - native features of coding agents don't work. Shells resolve that. Plugins resolve this issue as well, but it only works in claude code.
- **Single API key as dataset owner.** `ROSETTA_API_KEY` must belong to the owner of all datasets. Simplifies access control (one key sees everything), but that key is a high-value secret. Rotate it through your secrets manager.
- **Server-controlled VERSION.** `VERSION` is not set by clients. The server decides which release (r1, r2) to serve. Enables managed rollouts and prevents version drift across teams.
- **Streamable HTTP as default transport.** Stateful connections allow server-to-IDE callbacks and richer interaction. Requires sticky sessions when scaling horizontally. STDIO remains the escape hatch for air-gapped or single-user setups.
- **OAuthProxy over direct provider integration.** Bridges any OAuth provider to MCP's Dynamic Client Registration expectation. Adds a layer, but avoids coupling to a specific identity provider. `offline_access` scope enables authenticate-once behavior via refresh tokens.
- **FERNET_KEY for token encryption at rest.** OAuth tokens in Redis are encrypted, not stored plain. Adds a required secret for production, but prevents token theft if Redis is compromised.
- **Default model provisioning in RAGFlow.** Model API keys configured server-side via `local.service_conf.yaml`. Users get working models out of the box without individual setup. Centralizes API key management but means the server holds all provider credentials.

---

## Related Docs

- [Authentication](AUTHENTICATION.md) — two-leg OAuth proxy, scope architecture, token lifecycle, WARNING: very large document
- [Developer Guide](../DEVELOPER_GUIDE.md) — repo navigation, where to change what
- [Contributing](../CONTRIBUTING.md) — fastest path to a merged PR
- [Usage Guide](../USAGE_GUIDE.md) — how to use Rosetta flows
- [Deployment Guide](../DEPLOYMENT_GUIDE.md) — RAGFlow, MCP, Helm deployment
- [Troubleshooting](../TROUBLESHOOTING.md) — symptom-first diagnosis
