---
layout: docs
title: MCP Architecture
permalink: /docs/mcp-architecture/
---

# MCP Architecture

**Who is this for?** Contributors working on the `ims-mcp` server or diagnosing MCP-mode behavior.

**When should I read this?** After [Architecture](/rosetta/docs/architecture/). MCP is the secondary delivery mode — plugins are primary. MCP serves teams that want centrally managed, always-fresh instructions with nothing copied into the repository.

Covers: the `ims-mcp` server, transports (Streamable HTTP + OAuth, STDIO), authentication, VFS resource paths and auto-tagging (tag-based retrieval), MCP tools and the `rosetta://{path}` resource, document bundling, listings, and context overflow prevention. The [command aliases](/rosetta/docs/architecture/#command-aliases) themselves are mode-agnostic and documented in Architecture; in MCP mode they are bound to server calls by `mcp-files-mode.md`, and generated shells use `ACQUIRE <path> FROM KB` verbatim.

---

## Rosetta MCP Server

The MCP server is the guiding layer between IDEs and the knowledge base. It exposes guardrails and common best practices, and provides a structured menu of available instructions; the coding agent selects what it needs, and Rosetta delivers only those — preventing context overload. Published on PyPI as `ims-mcp`. Built on [FastMCP v3](https://gofastmcp.com/) (latest stable) with [OAuthProxy](https://gofastmcp.com/servers/auth/oauth-proxy) for authentication and [RAGFlow](https://ragflow.io/) as the document engine backend. Speaks in VFS resource paths, adds context headers describing what information means and how to use it, and controls context size automatically.

**Transport options:**
- **Streamable HTTP with OAuth** (default). Stateful: the server holds session state and can issue callbacks to the IDE. Zero local dependencies. Cursor, Claude Code, and Codex connect directly. When scaling to multiple replicas, sticky sessions are required (see [Deployment](/rosetta/docs/deployment/)).
- **STDIO** for air-gapped environments. Runs `uvx ims-mcp` locally with API key auth.

**Authentication:** HTTP uses OAuth 2.1 via [OAuthProxy](https://gofastmcp.com/servers/auth/oauth-proxy) (supports any provider: Keycloak, GitHub, Google, Azure). Cached token introspection. STDIO uses `ROSETTA_API_KEY`. Policy-based authorization: `aia-*` read-only, `project-*` configurable.

**Key environment variables:** `ROSETTA_SERVER_URL`, `ROSETTA_API_KEY`, `INSTRUCTION_ROOT_FILTER`, `REDIS_URL`

For MCP setup across all IDEs, see [Get Started](https://griddynamics.github.io/rosetta/#quick-start).

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

- [Architecture](/rosetta/docs/architecture/) — system overview, command aliases, bootstrap flow
- [MCPs Installation](/rosetta/docs/mcps/) — connecting IDEs to the MCP endpoint
- [Deployment](/rosetta/docs/deployment/) — running the server, scaling, sticky sessions
