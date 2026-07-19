# Patterns Change Log

## 2026-07-14 — Release examples resynced to r3

R3 is now the current released version. Release-specific examples across the pattern files were resynced from r2 to r3: dataset names (`aia-r3`), instruction source paths (`instructions/r3/core/`), the plugin-generator invocation (`npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false`), and the `DEFAULT_VERSION` config sample. Pattern mechanics are unchanged; only the release labels in examples moved.

## 2026-03-27 — Initial extraction (Phase 5, init-workspace-flow upgrade)

Mode: upgrade. All patterns created from scratch (no prior PATTERNS/ folder existed).

### Created (13 pattern files)

| File | Pattern | Source Modules |
|---|---|---|
| `shell-proxy-pattern.md` | Shell Proxy | `.claude/skills/`, `.claude/agents/`, `.claude/commands/`, `plugins/` |
| `tag-based-retrieval.md` | Tag-Based Retrieval | `src/rosetta-cli/rosetta_cli/services/document_data.py`, `src/rosetta-mcp-server/services/query_builder.py` |
| `document-bundling.md` | Document Bundling | `src/rosetta-mcp-server/services/bundler.py` |
| `vfs-resource-paths.md` | VFS Resource Paths | `src/rosetta-cli/rosetta_cli/services/document_data.py`, `src/rosetta-mcp-server/tools/resources.py` |
| `layered-instruction-architecture.md` | Layered Instruction Architecture | `instructions/r2/core/`, `instructions/r2/grid/` |
| `md5-change-detection.md` | MD5 Change Detection | `src/rosetta-cli/rosetta_cli/services/document_data.py` |
| `dual-backend-store.md` | Dual-Backend Store | `src/rosetta-mcp-server/rosetta_mcp/server.py`, `src/rosetta-mcp-server/rosetta_mcp/auth/oauth.py` |
| `ttl-cache-pattern.md` | TTL Cache | `src/rosetta-mcp-server/clients/doc_cache.py`, `src/rosetta-mcp-server/server.py` |
| `redis-schema-migrations.md` | Redis Schema Migrations | `src/rosetta-mcp-server/migrations.py` |
| `oauth-proxy-pattern.md` | OAuth Proxy | `src/rosetta-mcp-server/auth/oauth.py`, `src/rosetta-mcp-server/server.py` |
| `policy-based-authorization.md` | Policy-Based Authorization | `src/rosetta-mcp-server/services/authorizer.py` |
| `command-pattern-cli.md` | Command Pattern (CLI) | `src/rosetta-cli/rosetta_cli/commands/` |
| `protocol-based-typing.md` | Protocol-Based Typing | `src/rosetta-mcp-server/typing_utils.py`, `src/rosetta-cli/typing_utils.py`, `src/rosetta-mcp-server/migrations.py` |
| `env-backed-dataclass-config.md` | Env-Backed Dataclass Config | `src/rosetta-mcp-server/config.py`, `src/rosetta-mcp-server/constants.py` |
| `pre-commit-plugin-sync.md` | Pre-Commit Plugin Sync | `scripts/pre_commit.py`, `plugins/` |

### Skipped

- `src/rosetta-mcp-server/` — thin re-export package with no logic; no patterns to extract.
- `docs/web/` (Jekyll site) — static HTML/CSS/config; no recurring code patterns.
- `.github/workflows/` — CI/CD YAML pipelines; patterns are DevOps conventions, not code patterns.
- `test-library/` — integration test scenarios; input files, not code patterns.

### Anomalies

- `analytics/tracker.py` has a global module-level `_session_id` and `_posthog_client` — mutable module globals as singleton substitutes; not documented as a formal pattern (one-off).
- `auth/loopback_redirect_fix.py` and `auth/offline_refresh_fix.py` use class-decorator monkey-patching of FastMCP internals — project-specific workarounds, not general patterns.
