# ims-mcp

**Model Context Protocol (MCP) server for Rosetta (Enterprise Engineering Governance and Instructions Management System)**

*Powered by [RAGFlow](https://github.com/infiniflow/ragflow) for advanced RAG capabilities*

This package provides a FastMCP server that connects to Rosetta servers for advanced retrieval-augmented generation (RAG) capabilities. It enables AI assistants like Claude Desktop, Cursor, and other MCP clients to search, retrieve, and manage documents in Rosetta knowledge bases.

## Community

- [Discord](https://discord.gg/QzZ2cWg36g)
- [Website](https://griddynamics.github.io/rosetta/)
- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

## Features

- 🧭 **Context Bootstrap** - `get_context_instructions` loads bootstrap rules for agent setup
- 📚 **Instruction Retrieval** - `query_instructions` fetches docs by keyword or tags
- 🗂️ **Instruction Browsing** - `list_instructions` lists folders/files by virtual path prefix
- 🗂️ **Project Context Management** - discover, query, and store project datasets
- 📝 **Feedback Capture** - structured `submit_feedback` for workflow learning loops
- 📋 **Execution Plans** - `plan_manager` stores and manages AI execution plans
- 🔗 **Instruction Resources** - `rosetta://{path*}` resource template for bundled reads
- 🌐 **Environment-Based Config** - Zero configuration, reads from environment variables
- 🔐 **STDIO + HTTP OAuth** - API-key runtime plus OAuth proxy support for HTTP transports
- 📊 **Usage Analytics** - Built-in PostHog integration for tracking feature adoption (enabled by default, opt-out)

## Installation

### Using uvx (recommended)

The easiest way to use ims-mcp is with `uvx`, which automatically handles installation:

```bash
uvx ims-mcp@latest
```

### Using pip

Install globally or in a virtual environment:

```bash
pip install ims-mcp
```

Then run:

```bash
ims-mcp
```

### As a Python Module

You can also run it as a module:

```bash
python -m ims_mcp
```

## Configuration

Rosetta MCP supports two runtime modes:

1. `STDIO` (default) for MCP clients that launch a local process (`command` + `args`)
2. `HTTP` for remote/server deployment behind OAuth

### Complete Environment Variable Reference

| Variable | Scope | Default | Notes |
|----------|-------|---------|-------|
| `ROSETTA_SERVER_URL` | Runtime (all modes) | `https://<production server URL>/` | Rosetta Server base URL |
| `ROSETTA_API_KEY` | Runtime (all modes) | Empty | Required for Rosetta Server access |
| `VERSION` | Runtime (all modes) | `r2` | Used for instruction dataset resolution (`aia-{version}`) |
| `ROSETTA_TRANSPORT` | Runtime (all modes) | `stdio` | `stdio` or `http` |
| `ROSETTA_HTTP_HOST` | Runtime (HTTP) | `0.0.0.0` | HTTP bind host |
| `ROSETTA_HTTP_PORT` | Runtime (HTTP) | `8000` | HTTP bind port |
| `REDIS_URL` | Runtime (HTTP) | Empty | Optional Redis session store; empty uses in-memory store |
| `ROSETTA_ALLOWED_SCOPES` | Runtime (STDIO env / HTTP request header) | Empty | Comma-separated scopes. `allow_write_data` is required for `discover_projects`, `query_project_context`, `store_project_context`, `plan_manager`, and `submit_feedback` |
| `ROSETTA_ALLOWED_ORIGINS` | Runtime (HTTP) | Empty | Comma-separated `Origin` allowlist |
| `ROSETTA_OAUTH_MODE` | Runtime (HTTP OAuth) | `oauth` | `oauth` (introspection), `oidc` (JWT via discovery doc), or `github` (GitHub OAuth) |
| `ROSETTA_OAUTH_OIDC_CONFIG_URL` | Runtime (HTTP OAuth, oidc) | Empty | IdP OIDC discovery URL (e.g. `https://keycloak.host/realms/x/.well-known/openid-configuration`) |
| `ROSETTA_OAUTH_AUTHORIZATION_ENDPOINT` | Runtime (HTTP OAuth, oauth) | Empty | IdP authorize endpoint |
| `ROSETTA_OAUTH_TOKEN_ENDPOINT` | Runtime (HTTP OAuth, oauth) | Empty | IdP token endpoint |
| `ROSETTA_OAUTH_INTROSPECTION_ENDPOINT` | Runtime (HTTP OAuth, oauth) | Empty | IdP token introspection endpoint |
| `ROSETTA_OAUTH_REVOCATION_ENDPOINT` | Runtime (HTTP OAuth) | Empty | IdP token revocation endpoint (optional) |
| `ROSETTA_OAUTH_CLIENT_ID` | Runtime (HTTP OAuth) | Empty | Client ID registered with the IdP |
| `ROSETTA_OAUTH_CLIENT_SECRET` | Runtime (HTTP OAuth) | Empty | Client secret registered with the IdP |
| `ROSETTA_OAUTH_BASE_URL` | Runtime (HTTP OAuth) | Empty | Our public MCP URL for OAuth callbacks; fallback is `http://{ROSETTA_HTTP_HOST}:{ROSETTA_HTTP_PORT}` |
| `ROSETTA_OAUTH_CALLBACK_PATH` | Runtime (HTTP OAuth) | `/auth/callback` | OAuth callback path mounted by Rosetta MCP |
| `ROSETTA_OAUTH_REQUIRED_SCOPES` | Runtime (HTTP OAuth) | Empty | Space-separated scopes required on tokens (e.g. `offline_access`) |
| `ROSETTA_OAUTH_VALID_SCOPES` | Runtime (HTTP OAuth, oauth) | Empty | Space-separated scopes advertised in `.well-known`; empty = derived from required scopes |
| `ROSETTA_OAUTH_EXTRA_SCOPES` | Runtime (HTTP OAuth) | Empty | Space-separated scopes forwarded to IdP authorize endpoint (e.g. `openid email offline_access`) |
| `ROSETTA_JWT_SIGNING_KEY` | Runtime (HTTP OAuth) | Empty | Secret for signing FastMCP JWTs; if unset, derived from client secret |
| `FERNET_KEY` | Runtime (HTTP OAuth) | Empty | Fernet key for encrypting OAuth token storage in Redis |
| `ROSETTA_READ_POLICY` | Runtime (authz) | `all` | `all`, `team`, `none` for project dataset reads |
| `ROSETTA_WRITE_POLICY` | Runtime (authz) | `all` | `all`, `team`, `none` for project dataset writes/creates |
| `ROSETTA_USER_EMAIL` | Runtime (authz) | `rosetta@example.com` | STDIO identity and HTTP fallback identity |
| `ROSETTA_INVITE_EMAILS` | Runtime (authz) | Empty | Comma-separated invite list for project dataset creation flow |
| `ROSETTA_MODE` | Runtime (prompts) | `HARD` | Prompt mode selection: `HARD` or `SOFT` |
| `ROSETTA_PLAN_TTL_DAYS` | Runtime (plan manager) | `5` | Plan expiry in days |
| `INSTRUCTION_ROOT_FILTER` | Runtime (instructions query) | Empty | Comma-separated root tags filter |
| `IMS_DEBUG` | Runtime (debug) | Disabled | Enable debug logs (`1`, `true`, `yes`, `on`) |
| `FASTMCP_LOG_LEVEL` | Runtime (debug) | `INFO` | Set to `DEBUG` alongside `IMS_DEBUG=1` for full FastMCP internals (auth, middleware) |
| `FASTMCP_ENABLE_RICH_LOGGING` | Runtime (debug) | `true` | Set to `false` to disable Rich formatting — use in production/Grafana to prevent multiline log splitting |
| `POSTHOG_API_KEY` | Runtime (analytics) | Disabled | Your PostHog project API key (opt-in, set to enable) |
| `POSTHOG_HOST` | Runtime (analytics) | `https://eu.i.posthog.com` | PostHog endpoint |
| `USER` | Runtime (analytics context) | OS-dependent | Username source (priority 1) |
| `USERNAME` | Runtime (analytics context) | OS-dependent | Username source (priority 2) |
| `LOGNAME` | Runtime (analytics context) | OS-dependent | Username source (priority 3) |

### Shared Variables (Both Modes)

| Variable | Description | Default |
|----------|-------------|---------|
| `ROSETTA_SERVER_URL` | Rosetta Server base URL | `https://<production server URL>/` |
| `ROSETTA_API_KEY` | API key used by Rosetta MCP to access Rosetta Server | Required |
| `VERSION` | Instruction release used for instruction dataset resolution (`aia-{version}`) | `r2` |
| `IMS_DEBUG` | Enable debug logging to stderr (`1/true/yes/on`) | Disabled |
| `FASTMCP_LOG_LEVEL` | Set to `DEBUG` alongside `IMS_DEBUG=1` for full FastMCP internals | `INFO` |
| `FASTMCP_ENABLE_RICH_LOGGING` | Set to `false` to disable Rich formatting (use in production/Grafana) | `true` |
| `POSTHOG_API_KEY` | Your PostHog project API key (opt-in, disabled by default) | Disabled |
| `POSTHOG_HOST` | PostHog host | `https://eu.i.posthog.com` |

### STDIO Mode (Default)

Set:

```bash
ROSETTA_TRANSPORT=stdio
```

STDIO keeps API-key access and does not use OAuth. User identity for authorization checks comes from:

```bash
ROSETTA_USER_EMAIL=rosetta@example.com
```

Project-data tools are additionally gated by:

```bash
ROSETTA_ALLOWED_SCOPES=allow_write_data
```

### HTTP Mode

Set:

```bash
ROSETTA_TRANSPORT=http
ROSETTA_HTTP_HOST=0.0.0.0
ROSETTA_HTTP_PORT=8000
```

Optional HTTP runtime settings:

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Shared session store for multi-instance deployments | In-memory store |
| `ROSETTA_ALLOWED_ORIGINS` | Comma-separated allowlist for `Origin` header validation | No restriction |

Project-data tools in HTTP mode read scopes from the `ROSETTA_ALLOWED_SCOPES` request header.
The header must include `allow_write_data` for `discover_projects`, `query_project_context`,
`store_project_context`, `plan_manager`, and `submit_feedback`.

OAuth variables for HTTP mode:

| Variable | Mode | Description |
|----------|------|-------------|
| `ROSETTA_OAUTH_MODE` | all | `oauth` (default), `oidc`, or `github` |
| `ROSETTA_OAUTH_OIDC_CONFIG_URL` | oidc | IdP OIDC discovery URL |
| `ROSETTA_OAUTH_AUTHORIZATION_ENDPOINT` | oauth | IdP authorize URL |
| `ROSETTA_OAUTH_TOKEN_ENDPOINT` | oauth | IdP token URL |
| `ROSETTA_OAUTH_INTROSPECTION_ENDPOINT` | oauth | IdP introspection URL |
| `ROSETTA_OAUTH_REVOCATION_ENDPOINT` | oauth | IdP revocation URL (optional) |
| `ROSETTA_OAUTH_CLIENT_ID` | all | Client ID (IdP or GitHub OAuth App) |
| `ROSETTA_OAUTH_CLIENT_SECRET` | all | Client secret (IdP or GitHub OAuth App) |
| `ROSETTA_OAUTH_BASE_URL` | all | Our public MCP URL for OAuth callbacks |
| `ROSETTA_OAUTH_CALLBACK_PATH` | all | Callback path (default `/auth/callback`) |
| `ROSETTA_OAUTH_REQUIRED_SCOPES` | all | Space-separated scopes required on tokens (github default: `user`) |
| `ROSETTA_OAUTH_VALID_SCOPES` | oauth | Space-separated scopes advertised in `.well-known` |
| `ROSETTA_OAUTH_EXTRA_SCOPES` | oauth, oidc | Space-separated scopes forwarded to IdP authorize |
| `ROSETTA_JWT_SIGNING_KEY` | all | Secret for signing FastMCP JWTs |
| `FERNET_KEY` | both | Fernet key for encrypting token storage in Redis |

Authorization policy variables (dataset-level):

| Variable | Description | Default |
|----------|-------------|---------|
| `ROSETTA_READ_POLICY` | `all`, `team`, `none` for read access on `project-*` datasets | `all` |
| `ROSETTA_WRITE_POLICY` | `all`, `team`, `none` for write/create on `project-*` datasets | `all` |
| `ROSETTA_USER_EMAIL` | Fallback user email (used in STDIO, and HTTP fallback) | `rosetta@example.com` |
| `ROSETTA_INVITE_EMAILS` | Comma-separated emails auto-invited on project dataset creation | Empty |

OAuth callback URL examples:
- Production: `https://rosetta.example.com/auth/callback`
- Local: `http://localhost:8000/auth/callback`

## Usage with MCP Clients

### STDIO Mode (Cursor / Claude / local MCP clients)

Add to `.cursor/mcp.json` (or equivalent client config):

```json
{
  "mcpServers": {
    "Rosetta": {
      "command": "uvx",
      "args": ["ims-mcp@latest"],
      "env": {
        "ROSETTA_TRANSPORT": "stdio",
        "ROSETTA_SERVER_URL": "https://<production server URL>",
        "ROSETTA_API_KEY": "your-rosetta-api-key",
        "ROSETTA_USER_EMAIL": "you@example.com",
        "ROSETTA_ALLOWED_SCOPES": "allow_write_data"
      }
    }
  }
}
```

### HTTP Mode (Server deployment)

Start Rosetta MCP in HTTP mode:

```bash
ROSETTA_TRANSPORT=http \
ROSETTA_SERVER_URL="https://<production server URL>" \
ROSETTA_API_KEY="your-rosetta-api-key" \
ROSETTA_HTTP_HOST=0.0.0.0 \
ROSETTA_HTTP_PORT=8000 \
ROSETTA_OAUTH_AUTHORIZATION_ENDPOINT="https://idp.example.com/realms/<realm>/protocol/openid-connect/auth" \
ROSETTA_OAUTH_TOKEN_ENDPOINT="https://idp.example.com/realms/<realm>/protocol/openid-connect/token" \
ROSETTA_OAUTH_INTROSPECTION_ENDPOINT="https://idp.example.com/realms/<realm>/protocol/openid-connect/token/introspect" \
ROSETTA_OAUTH_CLIENT_ID="<client-id>" \
ROSETTA_OAUTH_CLIENT_SECRET="<client-secret>" \
ROSETTA_OAUTH_BASE_URL="https://rosetta.example.com" \
ims-mcp
```

For multi-instance deployment with shared session state, add `REDIS_URL`:

```bash
ROSETTA_TRANSPORT=http \
ROSETTA_SERVER_URL="https://<production server URL>" \
ROSETTA_API_KEY="your-rosetta-api-key" \
ROSETTA_HTTP_HOST=0.0.0.0 \
ROSETTA_HTTP_PORT=8000 \
REDIS_URL="redis://localhost:6379/0" \
ROSETTA_OAUTH_AUTHORIZATION_ENDPOINT="https://idp.example.com/realms/<realm>/protocol/openid-connect/auth" \
ROSETTA_OAUTH_TOKEN_ENDPOINT="https://idp.example.com/realms/<realm>/protocol/openid-connect/token" \
ROSETTA_OAUTH_INTROSPECTION_ENDPOINT="https://idp.example.com/realms/<realm>/protocol/openid-connect/token/introspect" \
ROSETTA_OAUTH_CLIENT_ID="<client-id>" \
ROSETTA_OAUTH_CLIENT_SECRET="<client-secret>" \
ROSETTA_OAUTH_BASE_URL="https://rosetta.example.com" \
ims-mcp
```

If your MCP client supports HTTP servers directly, point it to:

```text
http://<host>:<port>/mcp
```

Minimal HTTP client config shape (client-specific fields may vary):

```json
{
  "mcpServers": {
    "RosettaHTTP": {
      "url": "<rosetta MCP production server URL>"
    }
  }
}
```

## Available MCP Tools

### 1. get_context_instructions

Load bootstrap context instructions (prep step entry point).

**Parameters:**
- `topic` (str, optional): Brief intent summary (<=10 words), used for tracking only

**Example:**
```python
get_context_instructions(topic="update readme")
```

### 2. query_instructions

Fetch instruction documents from the instruction dataset.

**Parameters:**
- `query` (str, optional): Keyword query
- `tags` (list[str], optional): Tag-based query (`OR` logic)
- `topic` (str, optional): Tracking-only intent hint

At least one of `query` or `tags` is required.

Validation notes:
- `query`: up to 2000 characters
- `tags`: up to 50 items, each up to 128 characters
- single-string `tags` input must be non-empty

**Example:**
```python
query_instructions(tags=["bootstrap"])
```

### 3. list_instructions

List immediate children under a virtual instruction path without loading file content.

**Parameters:**
- `path_prefix` (str): Virtual path prefix such as `skills`, `rules`, or `workflows`, or `all` to list all instruction files without content

Validation notes:
- Use `""` or `/` to list the root
- Use `all` to list all `<rosetta:file />` entries without content
- `all` includes a note that duplicate `path` values are bundled/combined when acquired
- Use guaranteed unique 3-part/2-part tags to read specific content
- `path_prefix` must stay relative
- `path_prefix` must not contain `.` or `..` path segments
- max length: 512 characters

**Example:**
```python
list_instructions(path_prefix="rules")
list_instructions(path_prefix="all")
```

### 4. submit_feedback

Requires `allow_write_data` in `ROSETTA_ALLOWED_SCOPES`.

Store workflow feedback for continuous improvement.

**Parameters:**
- `request_mode` (str): Non-empty workflow mode, e.g. `coding.md`
- `feedback` (dict): Structured payload with required keys:
  - `summary` (non-empty)
  - `root_cause` (non-empty)
  - `prompt_suggestions` (non-empty string or non-empty list of strings)
  - `context` (non-empty)

**Example:**
```python
submit_feedback(
    request_mode="coding.md",
    feedback={
        "summary": "User asked for README fixes.",
        "root_cause": "README had stale tool docs.",
        "prompt_suggestions": "Keep README in sync with tool surface.",
        "context": "ims-mcp-server README alignment"
    }
)
```

### 5. discover_projects

List readable project datasets (`project-*`) available in Rosetta Server.

Requires `allow_write_data` in `ROSETTA_ALLOWED_SCOPES`.

**Parameters:**
- `query` (str, optional): Name filter; empty or whitespace-only means no filter

Validation notes:
- `query`: up to 256 characters

**Example:**
```python
discover_projects(query="rulesofpower")
```

### 6. query_project_context

Query documents inside a project dataset.

Requires `allow_write_data` in `ROSETTA_ALLOWED_SCOPES`.

**Parameters:**
- `repository_name` (str): Project name
- `query` (str, optional): Keyword query
- `tags` (list[str], optional): Tag filter
- `topic` (str, optional): Tracking-only intent hint

At least one of `query` or `tags` is required.

Validation notes:
- `repository_name`: up to 256 characters
- `query`: up to 2000 characters
- `tags`: up to 50 items, each up to 128 characters

**Example:**
```python
query_project_context(
    repository_name="rulesofpower",
    tags=["architecture"]
)
```

### 7. store_project_context

Create or update a project context document.

Requires `allow_write_data` in `ROSETTA_ALLOWED_SCOPES`.

**Parameters:**
- `repository_name` (str): Project name
- `document` (str): Relative document path
- `tags` (list[str]): 1-50 non-empty document tags
- `content` (str): Non-empty document body
- `force` (bool, optional): If `true`, creates dataset when missing

Validation notes:
- `repository_name`, `document`, and `content` must be non-empty
- `document` must not be absolute and must not contain `.` or `..` path segments
- `repository_name`: up to 256 characters
- `document`: up to 512 characters
- `content`: up to 200000 characters
- `tags`: 1-50 items, each up to 128 characters

**Example:**
```python
store_project_context(
    repository_name="rulesofpower",
    document="ARCHITECTURE.md",
    tags=["architecture", "backend"],
    content="# Architecture\\n...",
    force=True
)
```

### 8. plan_manager

Manage execution plans stored in Rosetta.

Requires `allow_write_data` in `ROSETTA_ALLOWED_SCOPES`.

**Parameters:**
- `command` (str): `upsert`, `query`, `show_status`, `update_status`, or `next`
- `plan_name` (str): Non-empty plan identifier
- `target_id` (str, optional): `entire_plan`, phase id, or step id
- `data` (dict | str, optional): RFC 7396 merge-patch payload for `upsert`
- `new_status` (str, optional): New status for `update_status`
- `limit` (int, optional): Max items returned by `next`; `0` means all

**Example:**
```python
plan_manager(
    command="query",
    plan_name="rulesofpower-hardening",
)
```

## Resource Template

### rosetta://{path*}

Reads bundled instruction content by resource path.

`path` must be a relative resource path without `.` or `..` path segments.
Blank paths are not valid resource URIs.

```text
rosetta://rules/bootstrap-core-policy.md
```

## Development

### Local Installation

Install directly from PyPI:

```bash
pip install ims-mcp
```

Or for the latest development version, install from source if you have the code locally:

```bash
pip install -e .
```

### Running Tests

```bash
pip install -e ".[dev]"
pytest
```

### Building for Distribution

```bash
python -m build
```

### Docker Image Build

The project includes a GitHub Actions workflow for automated Docker image building and publishing to GCP Artifact Registry.

**Version Management:** The workflow automatically extracts the version from `pyproject.toml` during the build process—no manual files or commits needed.

**Image Tag Format:** `{version}-{git-short-sha}` (e.g., `2.0.0b59-a1b2c3d`)

**Image Location:** `https://hub.docker.com/repository/docker/griddynamics/rosetta-mcp/general`

**How it works:**
1. Extracts version from `pyproject.toml` 
2. Passes version to the reusable build workflow via `app-version` parameter
3. Builds and tags Docker image as `{version}-{git-sha}`

## Usage Analytics

Rosetta MCP includes built-in usage analytics via PostHog to help understand feature adoption and usage patterns.

### Default Behavior

Analytics are **disabled by default**. No data is collected unless you deploy a PostHog instance and provide its API key.

### Enable Analytics

To enable usage analytics, set `POSTHOG_API_KEY` and `POSTHOG_HOST` pointing to your PostHog instance:

```json
{
  "mcpServers": {
    "KnowledgeBase": {
      "env": {
        "POSTHOG_API_KEY": "phc_YOUR_PROJECT_API_KEY",
        "POSTHOG_HOST": "https://posthog.internal.company.com"
      }
    }
  }
}
```

**Where to Find Your Project API Key:**

1. Log into your PostHog dashboard
2. Navigate to: **Project Settings** → **Project API Key**
3. Copy the key (starts with `phc_`)

**Important**: Use **Project API Key** (write-only, for event ingestion), not Personal API Key.

### What's Tracked

When enabled, Rosetta records basic operational metadata that matches information already flowing through the MCP server — no additional data is surfaced.

**Per tool call:**
- IP address (from the HTTP request)
- User email (from OAuth in HTTP mode) or local username (from OS environment in STDIO mode)
- Coding agent name and version (e.g. `Claude Code 1.0.17`)
- MCP tool called (e.g. `query_instructions`) and tool parameters
- MCP server version, session ID, call duration, success/error status

**Excluded** (stripped by `before_send` hook):
- `limit`, `offset`, `page` — pagination
- `compact_view` — view settings
- `model`, `temperature`, `max_tokens` — RAG tuning parameters

### Privacy & Control

- **Opt-in**: Analytics disabled by default, enable by setting `POSTHOG_API_KEY`
- **Self-hosted**: You deploy and control the PostHog instance on your infrastructure
- **Write-only**: Project API key can only send events, cannot read analytics data
- **Non-blocking**: Analytics never delays or breaks MCP tool responses

## Requirements

- Python >= 3.10
- Rosetta Server running and accessible
- ragflow-sdk >= 0.24.0
- mcp >= 1.26.0
- posthog >= 7.0.0 (for built-in analytics)

## License

Apache-2.0 - see LICENSE file for details.

This package is built on [RAGFlow](https://github.com/infiniflow/ragflow) by InfiniFlow, which is licensed under the Apache-2.0 License. We gratefully acknowledge the RAGFlow project and its contributors.

## Links

- **RAGFlow**: https://github.com/infiniflow/ragflow
- **Model Context Protocol**: https://modelcontextprotocol.io/
- **FastMCP**: https://github.com/jlowin/fastmcp

## Support

For issues and questions, visit the package page: https://pypi.org/project/ims-mcp/
