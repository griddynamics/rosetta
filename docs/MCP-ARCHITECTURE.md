# MCP Architecture

**Who is this for?** Contributors working on the `ims-mcp` server or diagnosing MCP-mode behavior.

**When should I read this?** After [ARCHITECTURE.md](ARCHITECTURE.md). MCP is the secondary delivery mode — plugins are primary. MCP serves teams that want centrally managed, always-fresh instructions with nothing copied into the repository.

Covers: the `ims-mcp` server, transports (Streamable HTTP + OAuth, STDIO), authentication and OAuth modes, Redis schema migrations, VFS resource paths and auto-tagging (tag-based retrieval), MCP tools and the `rosetta://{path}` resource, document bundling, listings, and context overflow prevention. The [command aliases](ARCHITECTURE.md#command-aliases) themselves are mode-agnostic and documented in Architecture; in MCP mode they are bound to server calls by `mcp-files-mode.md`, and generated shells use `ACQUIRE <path> FROM KB` verbatim.

---

## Rosetta MCP Server

The MCP server is the guiding layer between IDEs and the knowledge base. It exposes guardrails and common best practices, and provides a structured menu of available instructions; the coding agent selects what it needs, and Rosetta delivers only those — preventing context overload. Published on PyPI as `ims-mcp`. Built on [FastMCP v3](https://gofastmcp.com/) (latest stable) with [OAuthProxy](https://gofastmcp.com/servers/auth/oauth-proxy) for authentication and [RAGFlow](https://ragflow.io/) as the document engine backend. Speaks in VFS resource paths, adds context headers describing what information means and how to use it, and controls context size automatically.
MCP changes are validated with `pytest`, `validate-types.sh`, and the end-to-end `verify_mcp.py` integration check.

**Transport options:**
- **Streamable HTTP with OAuth** (default). Stateful: the server holds session state and can issue callbacks to the IDE. Zero local dependencies. Cursor, Claude Code, and Codex connect directly. When scaling to multiple replicas, sticky sessions are required (see [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)).
- **STDIO** for air-gapped environments. Runs `uvx ims-mcp` locally with API key auth.

**Key environment variables:** `ROSETTA_SERVER_URL`, `ROSETTA_API_KEY`, `INSTRUCTION_ROOT_FILTER`, `REDIS_URL`

## Authentication

HTTP uses OAuth 2.1 via FastMCP's proxy layer (supports any provider: Keycloak, GitHub, Google, Azure). STDIO uses `ROSETTA_API_KEY`. Policy-based authorization: `aia-*` read-only, `project-*` configurable. For the two-leg proxy architecture, scope separation, and token lifecycle details, see [AUTHENTICATION.md](AUTHENTICATION.md).

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

## Related Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — system overview, command aliases, bootstrap flow
- [AUTHENTICATION.md](AUTHENTICATION.md) — OAuth proxy details, scope separation, token lifecycle
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) — running the server, scaling, sticky sessions
