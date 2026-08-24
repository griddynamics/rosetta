# MCP Architecture

**Who is this for?** Contributors working on the `rosetta-mcp` server, RAGFlow, the Rosetta CLI, or diagnosing MCP-mode behavior.

**When should I read this?** After [ARCHITECTURE.md](ARCHITECTURE.md). MCP is the secondary, optional delivery mode — plugins are primary and most teams don't need MCP. MCP serves teams that want centrally managed, always-fresh instructions with nothing copied into the repository.

Covers: the full MCP pipeline (Instructions Repo → CLI → RAGFlow → `rosetta-mcp` server → IDE), environments, RAGFlow (datasets, processing pipeline), Rosetta CLI (publish/parse/verify commands, auto-tagging), transports (Streamable HTTP + OAuth 2.1, STDIO), authentication and OAuth modes, Redis schema migrations, VFS resource paths and auto-tagging (tag-based retrieval), the MCP tools (`get_context_instructions`, `query_instructions`, `list_instructions`) and the `rosetta://{path}` resource, document bundling (core + organization overlays, `sort_order`, `INSTRUCTION_ROOT_FILTER`), XML/flat listings, context overflow prevention, MCP server development and validation, and MCP-specific tradeoffs. The [command aliases](ARCHITECTURE.md#command-aliases) themselves are mode-agnostic and documented in Architecture; in MCP mode they are bound to server calls by `mcp-files-mode.md`, and generated shells use `ACQUIRE <path> FROM KB` verbatim.

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│              Target Repository + IDE                    │
│  Cursor · Claude Code · VS Code · JetBrains · Codex     │
│  Windsurf · Antigravity · OpenCode                      │
│  (MCP integration; native hooks vary by IDE)            │
│                         │                               │
│                    MCP Protocol                         │
│             (Streamable HTTP + OAuth)                   │
└────────────────────────┬────────────────────────────────┘
                         │ PULL
              ┌──────────▼──────────┐
              │    Rosetta MCP      │
              │   (rosetta-mcp on PyPI) │
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
              │  /instructions/r3/  │
              │                     │
              │  core/ · <org>/     │
              │  skills · agents    │
              │  workflows · rules  │
              └─────────────────────┘
```

Instructions flow up: files are published by the CLI into RAGFlow, served by Rosetta MCP to IDEs. Rosetta does not see or process your source code — by design, it only delivers knowledge and instructions.

Plugins have their own, separate delivery pipeline (generator, not CLI/RAGFlow) — see [ARCHITECTURE.md — System Overview](ARCHITECTURE.md#system-overview) and [Plugin Delivery Flow](ARCHITECTURE.md#plugin-delivery-flow).

---

## Rosetta MCP Server

The MCP server is the guiding layer between IDEs and the knowledge base. It exposes guardrails and common best practices, and provides a structured menu of available instructions; the coding agent selects what it needs, and Rosetta delivers only those — preventing context overload. Published on PyPI as `rosetta-mcp`. Built on [FastMCP v3](https://gofastmcp.com/) (latest stable) with [OAuthProxy](https://gofastmcp.com/servers/auth/oauth-proxy) for authentication and [RAGFlow](https://ragflow.io/) as the document engine backend. Speaks in VFS resource paths, adds context headers describing what information means and how to use it, and controls context size automatically.
MCP changes are validated with `pytest`, `src/validate-types.sh`, and the end-to-end `verify_mcp.py` integration check.

**Transport options:**
- **Streamable HTTP with OAuth** (default). Stateful: the server holds session state and can issue callbacks to the IDE. Zero local dependencies. Cursor, Claude Code, and Codex connect directly. When scaling to multiple replicas, sticky sessions are required (see [DEPLOYMENT_GUIDE.md](mcp/DEPLOYMENT_GUIDE.md)).
- **STDIO** for environments with limited internet access. Runs `uvx rosetta-mcp` locally with API key auth.

**Key environment variables:** `ROSETTA_SERVER_URL`, `ROSETTA_API_KEY`, `INSTRUCTION_ROOT_FILTER`, `REDIS_URL`

## Environments

- **Rosetta Server (RAGFlow) prod:** `https://<production server URL>/` — document engine backend, dataset management, API keys
- **Rosetta Server (RAGFlow) dev:** `https://<development server URL>/` — dev instance for testing publishes
- **Rosetta HTTP MCP prod:** `<rosetta MCP production server URL>` — production MCP endpoint for end users
- **Rosetta HTTP MCP dev:** `<rosetta MCP development server URL>` — dev MCP endpoint for integration testing

> **Note:** The repo's `.mcp.json` (Claude Code contributor config) intentionally points to the **dev** MCP endpoint. Contributors developing Rosetta connect to dev so their in-progress instruction changes are reflected immediately. End users should connect to the production endpoint — see [MCPs.md](../MCPs.md).

## RAGFlow (Rosetta Server)

RAGFlow is the document storage and retrieval engine. Rosetta uses it for ingestion, parsing, embedding, and search. Not exposed to end users directly.

**Deployment:** Local via Docker Compose at `http://localhost:80`, Development at https://<development server URL>, or hosted production.

**Processing pipeline:** Upload (upsert by deterministic UUID) → Parse (server-side) → Chunk → Embed → Index. Repeated publishes are idempotent.

**Datasets:**

| Dataset | Purpose |
|---|---|
| `aia` | Base fallback (files without a release) |
| `aia-r3` | R3 release (current) |
| `aia-r2` | R2 release (previous; backports only) |
| `aia-r1` | R1 release (out of support) |
| `project-*` | Per-repository collections in target repos (per OAuth policy) |

Instruction dataset names auto-generated from template `aia-{release}`.

All prefixes are internal only, it must not be exposed or received. This prevents cross-dataset security issues. Any user of MCP must not be aware of those existence.

**Metadata per document:** tags, domain, release, content_hash (MD5), resource_path, sort_order, frontmatter, original_path, line_count.

RAGFlow is constantly updating and AI knowledge of it goes stale fast. For RAGFlow internals and known issues, see [RAGFLOW.md](mcp/RAGFLOW.md) — grep its TOC, read it, and keep it updated whenever a CLI or MCP change involves RAGFlow.

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
| `list-dataset --dataset aia-r3` | List documents in a dataset |
| `cleanup-dataset --dataset aia-r3` | Delete documents from a dataset |

**Critical rule:** Always publish the entire `/instructions` folder. Never subfolders or single files (breaks tag extraction).

**Change detection:** MD5 hash of content. Only modified files publish (~77% time savings). Use `--force` to bypass.

**Auto-tagging and metadata extraction.** The CLI reads each file during publishing and extracts everything MCP needs to serve it efficiently:
- **Tags:** all folder names + filename + composite pairs/triples (`core/skills`, `r3/core/skills`, etc.). These are what the typed load aliases query against.
- **Frontmatter:** parsed from file content, saved as metadata. Exposed later in `<rosetta:file>` attributes so agents see document structure without loading full content.
- **Resource path:** `skills/planning/SKILL.md` (org prefix stripped). This is the VFS path used everywhere in MCP.
- **Domain** (`core`), **release** (`r3`), **collection** (`aia-r3`): derived from folder structure.
- **Title:** `[r3][core][skills][planning] SKILL.md` (tag-in-title format).

**Environment:** `.env.dev` (dev RAGFlow) or `.env.prod` (production). Switch with `cp .env.dev .env`.

For local testing use the repo virtualenv and run from `src/rosetta-cli/` the module directly, for example: `../../venv/bin/python -m rosetta_cli version`, `../../venv/bin/python -m rosetta_cli verify --env dev`, `../../venv/bin/python -m rosetta_cli publish ../../instructions --dry-run --env dev`, or `../../venv/bin/python -m rosetta_cli parse --dataset aia-r3 --dry-run --env dev`.

For deployment details, see [DEPLOYMENT_GUIDE.md](mcp/DEPLOYMENT_GUIDE.md).

## Authentication

HTTP uses OAuth 2.1 via FastMCP's proxy layer (supports any provider: Keycloak, GitHub, Google, Azure). STDIO uses `ROSETTA_API_KEY`. Policy-based authorization: `aia-*` read-only, `project-*` configurable. For the two-leg proxy architecture, scope separation, and token lifecycle details, see [AUTHENTICATION.md](mcp/AUTHENTICATION.md).

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

## Redis Schema Migrations

`rosetta_mcp/migrations.py` runs sequential schema migrations against Redis on every server startup via the FastMCP lifespan hook. Migrations are numbered methods (`_migrate_to_N`); only those ahead of the stored version run.

**Key details:**
- Version tracked in `rosetta:redis-schema-version` (plain integer)
- Distributed lock (`rosetta:migration-lock`, 60 s TTL) deduplicates runs across pods on rolling deploys. Best-effort, not a guarantee: the TTL is never extended, so a run that outlives it loses the lock while still working. Release is fenced by a per-run token, so a run that lost the lock cannot delete another pod's fresh one
- What actually makes multi-replica deploys safe is that every migration is idempotent and the version is re-read under the lock before any migration runs — not the lock itself. A migration may therefore run more than once
- All migration activity logged at `INFO` level under `rosetta_mcp.migrations`

**Current migrations:**

| Version | What it does |
|---|---|
| 1 | Baseline no-op — marks pre-migration deployments as version 1 |
| 2 | Flushes `mcp-oauth-proxy-clients:*` keys so DCR/CIMD clients re-register with correct `required_scopes` |

**Adding a migration:** add `_migrate_to_N`, bump `LATEST_REDIS_SCHEMA_VERSION = N`, deploy. Every `_migrate_to_N` MUST be idempotent — the lock cannot guarantee a single execution, so re-running a migration must be harmless.

## VFS and Tags

Everything MCP works with is VFS (virtual file system) resource paths. The CLI strips instruction root prefixes during publishing, so `core/skills/planning/SKILL.md` becomes `skills/planning/SKILL.md`. Files at the same resource path get bundled together.

**Tags are the primary access mechanism.** Typed load aliases (`USE SKILL`, `READ RULE`, `APPLY PHASE`, ...) query by tags, which provides the most direct and fastest access. The CLI's auto-tagging was designed specifically for this: every folder name, filename, and composite pair/triple becomes a tag, so agents can request exactly what they need. Keyword search (`query_instructions(query=...)`) remains an MCP-level fallback for discovery.

## MCP Tools

Three tools and one resource are exposed to agents.

| Tool | Purpose |
|---|---|
| `get_context_instructions` | MCP bootstrap gate: load `bootstrap-alwayson.md` |
| `query_instructions` | Fetch instruction docs by tags (primary) or keyword search (fallback) |
| `list_instructions` | Browse the VFS hierarchy (flat listing of immediate children) |

**Resource:** `rosetta://{path}` reads bundled instruction documents by VFS resource path.

## Bundler

The Bundler merges multiple documents at the same VFS resource path into a single XML response. When an agent loads a skill (`USE SKILL`), core and organization files at that path are concatenated into one payload:

```xml
<rosetta:file id="..." dataset="..." path="skills/planning/SKILL.md" name="..." tags="..." frontmatter="...">
  [document content from core]
</rosetta:file>
<rosetta:file id="..." dataset="..." path="skills/planning/SKILL.md" name="..." tags="..." frontmatter="...">
  [document content from organization overlay]
</rosetta:file>
```

Documents sorted by `sort_order` (default: 1000000), then by name. `INSTRUCTION_ROOT_FILTER` controls which layers are included (e.g., `CORE,GRID`).

Plugin mode has no runtime Bundler — the generator merges core and organization layers at build time instead. See [ARCHITECTURE.md — Instruction Structure](ARCHITECTURE.md#instruction-structure).

## Listing

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

## Context Overflow Prevention

MCP manages context size through two mechanisms:

- **Query list threshold (5).** When `query_instructions` matches 5 or fewer documents, MCP returns full bundled content. When more than 5 match, it returns a listing instead, with a header guiding the agent to load specific files by their unique tags. This keeps responses bounded regardless of knowledge base size.
- **Context headers.** Every MCP response includes a descriptive header explaining what the returned information is and how to act on it.

---

## MCP Delivery Flow

```
Instructions Repo ──► CLI (publish) ──► RAGFlow ──► Rosetta MCP ──► Target Repo + IDE
```

1. **Publish.** CLI reads `.md` files from instructions repo, extracts tags + frontmatter + metadata, generates deterministic UUID, upserts into dataset.
2. **Index.** RAGFlow parses, chunks, embeds, indexes for full-text and semantic search.
3. **Serve.** The agent calls `get_context_instructions` once per session (MCP bootstrap gate), then loads instructions on demand via `query_instructions`/`list_instructions` by tag; `mcp-files-mode.md` binds the typed command aliases to these calls.

Runtime behavior after instructions are loaded — prepare, route, execute — is identical across delivery modes; see [ARCHITECTURE.md — Bootstrap Flow](ARCHITECTURE.md#bootstrap-flow). Plugins have their own, separate delivery flow (generate once, ship, load locally) — see [ARCHITECTURE.md — Plugin Delivery Flow](ARCHITECTURE.md#plugin-delivery-flow).

---

## Development

### Prerequisites

MUST use the same venv as the rest of the repo: `venv/`.
There are `.env.dev` and `.env.prod`.
MUST not read any .env files.

### Publishing Instructions

Publish instructions to remote IMS server:

```bash
cp .env.dev .env
uvx rosetta-cli@latest publish instructions
```

Additional publish examples:
- `cp .env.dev .env && PYTHONPATH=src/rosetta-cli venv/bin/python -m rosetta_cli publish ./instructions --dry-run`
- `cp .env.dev .env && PYTHONPATH=src/rosetta-cli venv/bin/python -m rosetta_cli publish ./instructions`
- DO NOT FILTER OUT THE OUTPUT AS YOU WILL MISS IMPORTANT INFORMATION

### Validation

MUST validate MCP changes using `.env.dev` and `src/rosetta-mcp-server/validation/verify_mcp.py` (testing harness of MCP itself).
Integrate new features to this testing harness if needed and easy.
MUST execute `venv/bin/python scripts/pre_commit.py` from repository root. Never filter/grep/tail its output.
Entire `verify_mcp.py` and ALL tests must work.
Always run `verify_mcp.py`: with R3 only. When backporting a change to R2, also run it with `VERSION=r2`.
If REDIS-dependent feature is affected RUN verify_mcp.py with and without REDIS_URL (example: `execution_controller` tool).
Must run `src/validate-types.sh` if code was changed.
Do not tail or limit output of `verify_mcp.py`, it is short already.
Read first 100 lines of `verify_mcp.py` to get instructions ON HOW exactly it should all be done.

Validation command examples:
- `cp .env.dev .env && VERSION=r3 venv/bin/python src/rosetta-mcp-server/validation/verify_mcp.py`
- `cp .env.dev .env && REDIS_URL="redis://localhost:6379/0" VERSION=r3 venv/bin/python src/rosetta-mcp-server/validation/verify_mcp.py`

Validation notes discovered during real runs:
- MCP unit tests: `cd src/rosetta-mcp-server && PYTHONPATH=. ../venv/bin/pytest tests/` or `PYTHONPATH=src/rosetta-mcp-server venv/bin/pytest src/rosetta-mcp-server/tests`
- CLI unit tests: `cd src/rosetta-cli && PYTHONPATH=. ../../venv/bin/pytest tests/` or `PYTHONPATH=src/rosetta-cli venv/bin/pytest src/rosetta-cli/tests`
- `verify_mcp.py` flat-list validation must allow plain filenames for `r1` and hierarchical paths for `r2`/`r3`.

Must read `docs/mcp/RAGFLOW.md` fully to understand RAGFlow actual implementation and known issues if CLI or MCP changes involve RAGFlow.

### Reference Sources (readonly, packages currently used)

`refsrc/fastmcp-3.3.1` contains source code of FastMCP v3. Use `https://gofastmcp.com/llms.txt` - fastmcp index of all dev docs. There is also `https://gofastmcp.com/llms-full.txt` but it is extremely large, it will not fit entirely your context window at all.
`refsrc/python-sdk-1.26.0` contains source code of MCP Python SDK.
`refsrc/ragflow-0.25.1` contains source code of RAGFlow Python SDK (v0.25.1+).

This is for reference purposes only: do not change, do not copy.

---

## Tradeoffs

- **RAGFlow as the knowledge layer.** Chunking, embedding, and search out of the box. Adds a deployment dependency (Docker or hosted). STDIO transport partially mitigates this.
- **Tags as primary access, not search.** Loading by tag is faster and more precise than keyword search. But requires the auto-tagging scheme to produce useful tags from folder structure.
- **XML bundling with threshold.** Structured `<rosetta:file>` output with metadata attributes. The threshold of 5 prevents context overflow by switching to listing mode. Requires agents to make follow-up requests for specific files. Plus `<rosetta:folder>`
- **Full-folder publishing only.** Prevents broken metadata extraction. Change detection keeps incremental publishes fast.
- **Copy-paste shells for native IDE features.** Coding agents expect subagents, skills, and commands in a specific format at a specific location in the repository. Copying real content there would make it stale against the instructions repo. MCP mode instead creates small proxy shells with proper frontmatter; each proxy's body is a raw `ACQUIRE <path> FROM KB` command that loads the actual content live. Shells stay in sync automatically; only the proxy is committed. (Plugins avoid this problem entirely — see [ARCHITECTURE.md — Tradeoffs](ARCHITECTURE.md#tradeoffs).)
- **Single API key as dataset owner.** `ROSETTA_API_KEY` must belong to the owner of all datasets. Simplifies access control (one key sees everything), but that key is a high-value secret. Rotate it through your secrets manager.
- **Server-controlled VERSION.** `VERSION` is not set by clients. The server decides which release (r2, r3) to serve. Enables managed rollouts and prevents version drift across teams.
- **Streamable HTTP as default transport.** Stateful connections allow server-to-IDE callbacks and richer interaction. Requires sticky sessions when scaling horizontally. STDIO remains the escape hatch for limited-connectivity or single-user setups.
- **OAuthProxy over direct provider integration.** Bridges any OAuth provider to MCP's Dynamic Client Registration expectation. Adds a layer, but avoids coupling to a specific identity provider. `offline_access` scope enables authenticate-once behavior via refresh tokens.
- **FERNET_KEY for token encryption at rest.** OAuth tokens in Redis are encrypted, not stored plain. Adds a required secret for production, but prevents token theft if Redis is compromised.
- **Default model provisioning in RAGFlow.** Model API keys configured server-side via `local.service_conf.yaml`. Users get working models out of the box without individual setup. Centralizes API key management but means the server holds all provider credentials.

Mode-agnostic tradeoffs (release-based versioning, layered customization, command aliases, native plugin format) are documented in [ARCHITECTURE.md — Tradeoffs](ARCHITECTURE.md#tradeoffs).

---

## Related Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — system overview, plugin delivery flow, command aliases, bootstrap flow
- [AUTHENTICATION.md](mcp/AUTHENTICATION.md) — OAuth proxy details, scope separation, token lifecycle
- [DEPLOYMENT_GUIDE.md](mcp/DEPLOYMENT_GUIDE.md) — running the server, scaling, sticky sessions
- [MCPs](../MCPs.md) — install and verify Rosetta MCP
