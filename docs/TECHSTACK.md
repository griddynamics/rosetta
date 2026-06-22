Tech stack of all modules in this Rosetta repository.

## ims-mcp-server — Rosetta MCP Server

| Layer | Technology |
|---|---|
| Language | Python 3.10+ (3.12 recommended) |
| Framework | FastMCP v3 (>=3.1.0,<4) |
| MCP SDK | mcp >=1.26.0,<2.0.0 |
| Knowledge backend | RAGFlow SDK >=0.24.0,<1.0.0 |
| Auth | OAuth 2.1 via FastMCP OAuthProxy; OIDC or introspection modes |
| Session store | Redis (optional, via py-key-value-aio[redis] >=0.4.4) |
| Token encryption | cryptography >=43.0.0 (Fernet) |
| Analytics | PostHog >=7.0.0,<8.0.0 |
| Transport | Streamable HTTP (default, port 8000) or STDIO |
| Container | Docker multi-stage, python:3.12-slim base |
| Build | setuptools >=61.0 + wheel |
| Type checking | mypy (strict, via validate-types.sh) |
| Tests | pytest >=7.0.0 + pytest-asyncio >=0.23.0 |
| Entry point | `ims-mcp` → `ims_mcp.server:main` |

## src/rosetta-cli — Rosetta CLI Publisher

| Layer | Technology |
|---|---|
| Language | Python 3.12+ |
| HTTP client | requests >=2.31.0,<3.0.0 |
| Env config | python-dotenv >=1.0.0,<2.0.0 |
| Frontmatter | python-frontmatter >=1.1.0,<2.0.0 |
| Knowledge backend | RAGFlow SDK >=0.23.1,<1.0.0 |
| Progress UI | tqdm >=4.67.0,<5.0.0 |
| Build | setuptools >=61.0 + wheel |
| Type checking | mypy (strict, shared mypy.ini) |
| Tests | pytest >=7.0.0 |
| Entry point | `rosetta-cli` → `rosetta_cli.cli:main` |

## rosetta-mcp-server — Thin Re-export Package

| Layer | Technology |
|---|---|
| Language | Python 3.10+ |
| Dependency | ims-mcp ==2.0.13 (pin) |
| Entry point | `rosetta-mcp` → `ims_mcp.server:main` |

## docs/web — Public Website

| Layer | Technology |
|---|---|
| Generator | Jekyll ~> 4.4 |
| Ruby extras | csv, webrick |
| Hosting | GitHub Pages |
| Styles | Custom CSS (`assets/styles.css`) |

## instructions/r2/core — Prompt Library

| Layer | Technology |
|---|---|
| Format | Markdown with YAML frontmatter |
| Categories | skills, agents, workflows, rules, configure, templates |
| Distribution | Rosetta CLI publish → RAGFlow; or via plugin trees |

## plugins — IDE Plugin Definitions

| Layer | Technology |
|---|---|
| core-claude | Auto-generated from instructions; Claude Code format |
| core-cursor | Auto-generated from instructions; Cursor format |
| rosetta | Bootstrap rule + MCP definition only |
| Generator | `npx rosettify-plugins@latest` (invoked by `scripts/pre_commit.py`) |

## Shared / Repo-Wide

| Layer | Technology |
|---|---|
| Runtime environment | Python venv at repo root (`venv/`) |
| Type checking | mypy >=1.10.0 (strict, via mypy.ini) |
| Pre-commit hook | scripts/pre_commit.py + .githooks/ |
| CI/CD | GitHub Actions (.github/workflows/) |
| Change detection | MD5 hash per file (CLI incremental publish) |
