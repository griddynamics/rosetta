---
layout: docs
title: MCP Architecture
permalink: /docs/mcp-architecture/
---

# MCP Architecture

**Who is this for?** Contributors working on the `ims-mcp` server, RAGFlow, the Rosetta CLI, or diagnosing MCP-mode behavior.

**When should I read this?** After [Architecture](/rosetta/docs/architecture/). MCP is the secondary, optional delivery mode — plugins are primary and most teams don't need MCP. MCP serves teams that want centrally managed, always-fresh instructions with nothing copied into the repository.

Covers: the full MCP pipeline (Instructions Repo → CLI → RAGFlow → `ims-mcp` server → IDE), environments, RAGFlow (datasets, processing pipeline), Rosetta CLI (publish/parse/verify commands, auto-tagging), transports (Streamable HTTP + OAuth, STDIO), authentication, VFS resource paths and auto-tagging (tag-based retrieval), MCP tools and the `rosetta://{path}` resource, document bundling, listings, and context overflow prevention. The [command aliases](/rosetta/docs/architecture/#command-aliases) themselves are mode-agnostic and documented in Architecture; in MCP mode they are bound to server calls by `mcp-files-mode.md`, and generated shells use `ACQUIRE <path> FROM KB` verbatim.

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
              │  /instructions/r3/  │
              │                     │
              │  core/ · <org>/     │
              │  skills · agents    │
              │  workflows · rules  │
              └─────────────────────┘
```

Instructions flow up: files are published by the CLI into RAGFlow, served by Rosetta MCP to IDEs. Rosetta does not see or process your source code — by design, it only delivers knowledge and instructions.

Plugins have their own, separate delivery pipeline (generator, not CLI/RAGFlow) — see [Architecture — System Overview](/rosetta/docs/architecture/#system-overview) and [Plugin Delivery Flow](/rosetta/docs/architecture/#plugin-delivery-flow).

---

## Rosetta MCP Server

The MCP server is the guiding layer between IDEs and the knowledge base. It exposes guardrails and common best practices, and provides a structured menu of available instructions; the coding agent selects what it needs, and Rosetta delivers only those — preventing context overload. Published on PyPI as `ims-mcp`. Built on [FastMCP v3](https://gofastmcp.com/) (latest stable) with [OAuthProxy](https://gofastmcp.com/servers/auth/oauth-proxy) for authentication and [RAGFlow](https://ragflow.io/) as the document engine backend. Speaks in VFS resource paths, adds context headers describing what information means and how to use it, and controls context size automatically.

**Transport options:**
- **Streamable HTTP with OAuth** (default). Stateful: the server holds session state and can issue callbacks to the IDE. Zero local dependencies. Cursor, Claude Code, and Codex connect directly. When scaling to multiple replicas, sticky sessions are required (see [Deployment](/rosetta/docs/deployment/)).
- **STDIO** for environments with limited internet access. Runs `uvx ims-mcp` locally with API key auth.

**Authentication:** HTTP uses OAuth 2.1 via [OAuthProxy](https://gofastmcp.com/servers/auth/oauth-proxy) (supports any provider: Keycloak, GitHub, Google, Azure). Cached token introspection. STDIO uses `ROSETTA_API_KEY`. Policy-based authorization: `aia-*` read-only, `project-*` configurable.

**Key environment variables:** `ROSETTA_SERVER_URL`, `ROSETTA_API_KEY`, `INSTRUCTION_ROOT_FILTER`, `REDIS_URL`

For MCP setup across all IDEs, see [Get Started](https://griddynamics.github.io/rosetta/#quick-start).

## Environments

- **Rosetta Server (RAGFlow) prod:** `[RAGFlow production server URL]` — document engine backend, dataset management, API keys
- **Rosetta Server (RAGFlow) dev:** `[RAGFlow development server URL]` — dev instance for testing publishes
- **Rosetta HTTP MCP prod:** `[rosetta MCP production server URL]` — production MCP endpoint for end users
- **Rosetta HTTP MCP dev:** `[rosetta MCP development server URL]` — dev MCP endpoint for integration testing

> **Note:** The repo's `.mcp.json` (Claude Code contributor config) intentionally points to the **dev** MCP endpoint. Contributors developing Rosetta connect to dev so their in-progress instruction changes are reflected immediately. End users should connect to the production endpoint — see [MCPs Installation](/rosetta/docs/mcps/).

## RAGFlow (Rosetta Server)

RAGFlow is the document storage and retrieval engine. Rosetta uses it for ingestion, parsing, embedding, and search. Not exposed to end users directly.

**Deployment:** Local via Docker Compose at `http://localhost:80` (development) or hosted instance (production).

**Processing pipeline:** Upload (upsert by deterministic UUID) → Parse (server-side) → Chunk → Embed → Index. Repeated publishes are idempotent.

**Datasets:**

| Dataset | Purpose |
|---|---|
| `aia` | Base fallback (files without a release) |
| `aia-r1` | R1 release (out of support) |
| `aia-r2` | R2 release (previous; backports only) |
| `aia-r3` | R3 release (current) |
| `project-*` | Per-repository collections in target repos (per OAuth policy) |

Instruction dataset names auto-generated from template `aia-{release}`.

All prefixes are internal only, it must not be exposed or received. This prevents cross-dataset security issues. Any user of MCP must not be aware of those existence.

**Metadata per document:** tags, domain, release, content_hash (MD5), resource_path, sort_order, frontmatter, original_path, line_count.

## Rosetta CLI

The CLI (`rosetta-cli`, published on PyPI) publishes instructions from the instructions repository into RAGFlow. It handles change detection, metadata extraction, frontmatter parsing, and auto-tagging.

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

For deployment details, see [Deployment](/rosetta/docs/deployment/).

## VFS and Tags

Everything MCP works with is VFS (virtual file system) resource paths. The CLI strips instruction root prefixes during publishing, so `core/skills/planning/SKILL.md` becomes `skills/planning/SKILL.md`. Files at the same resource path get bundled together.

**Tags are the primary access mechanism.** Typed load aliases (`USE SKILL`, `READ RULE`, `APPLY PHASE`, ...) query by tags, which provides the most direct and fastest access. The CLI's auto-tagging was designed specifically for this: every folder name, filename, and composite pair/triple becomes a tag, so agents can request exactly what they need. Keyword search (`query_instructions(query=...)`) remains an MCP-level fallback for discovery.

## MCP Tools

Three tools and one resource are exposed to agents.

| Tool | Purpose |
|---|---|
| `get_context_instructions` | MCP bootstrap gate: loads `bootstrap-alwayson.md` |
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

Plugin mode has no runtime Bundler — the generator merges core and organization layers at build time instead. See [Architecture — Instruction Structure](/rosetta/docs/architecture/#instruction-structure).

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

Runtime behavior after instructions are loaded — prepare, route, execute — is identical across delivery modes; see [Architecture — Bootstrap Flow](/rosetta/docs/architecture/#bootstrap-flow). Plugins have their own, separate delivery flow (generate once, ship, load locally) — see [Architecture — Plugin Delivery Flow](/rosetta/docs/architecture/#plugin-delivery-flow).

---

## Development

### Publishing Instructions

Publish instructions to remote IMS server:

```bash
cp .env.dev .env
uvx rosetta-cli@latest publish instructions
```

---

## Tradeoffs

- **RAGFlow as the knowledge layer.** Chunking, embedding, and search out of the box. Adds a deployment dependency (Docker or hosted). STDIO transport partially mitigates this.
- **Tags as primary access, not search.** Loading by tag is faster and more precise than keyword search. But requires the auto-tagging scheme to produce useful tags from folder structure.
- **XML bundling with threshold.** Structured `<rosetta:file>` output with metadata attributes. The threshold of 5 prevents context overflow by switching to listing mode. Requires agents to make follow-up requests for specific files. Plus `<rosetta:folder>`
- **Full-folder publishing only.** Prevents broken metadata extraction. Change detection keeps incremental publishes fast.
- **Copy-paste shells for native IDE features.** Coding agents expect subagents, skills, and commands in a specific format at a specific location in the repository. Copying real content there would make it stale against the instructions repo. MCP mode instead creates small proxy shells with proper frontmatter; each proxy's body is a raw `ACQUIRE <path> FROM KB` command that loads the actual content live. Shells stay in sync automatically; only the proxy is committed. (Plugins avoid this problem entirely — see [Architecture — Tradeoffs](/rosetta/docs/architecture/#tradeoffs).)
- **Single API key as dataset owner.** `ROSETTA_API_KEY` must belong to the owner of all datasets. Simplifies access control (one key sees everything), but that key is a high-value secret. Rotate it through your secrets manager.
- **Server-controlled VERSION.** `VERSION` is not set by clients. The server decides which release (r2, r3) to serve. Enables managed rollouts and prevents version drift across teams.
- **Streamable HTTP as default transport.** Stateful connections allow server-to-IDE callbacks and richer interaction. Requires sticky sessions when scaling horizontally. STDIO remains the escape hatch for limited-connectivity or single-user setups.
- **OAuthProxy over direct provider integration.** Bridges any OAuth provider to MCP's Dynamic Client Registration expectation. Adds a layer, but avoids coupling to a specific identity provider. `offline_access` scope enables authenticate-once behavior via refresh tokens.
- **FERNET_KEY for token encryption at rest.** OAuth tokens in Redis are encrypted, not stored plain. Adds a required secret for production, but prevents token theft if Redis is compromised.
- **Default model provisioning in RAGFlow.** Model API keys configured server-side via `local.service_conf.yaml`. Users get working models out of the box without individual setup. Centralizes API key management but means the server holds all provider credentials.

Mode-agnostic tradeoffs (release-based versioning, layered customization, command aliases, native plugin format) are documented in [Architecture — Tradeoffs](/rosetta/docs/architecture/#tradeoffs).

---

## Related Docs

- [Architecture](/rosetta/docs/architecture/) — system overview, plugin delivery flow, command aliases, bootstrap flow
- [MCPs Installation](/rosetta/docs/mcps/) — connecting IDEs to the MCP endpoint
- [Deployment](/rosetta/docs/deployment/) — running the server, scaling, sticky sessions
