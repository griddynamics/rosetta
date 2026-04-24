# Patterns Index

Coding and architectural patterns extracted from the Rosetta workspace. Each file documents a recurring structure found in 2+ locations.

## Instruction Delivery

| Pattern | File | Description |
|---|---|---|
| Shell Proxy | `shell-proxy-pattern.md` | Thin local stubs delegating to KB via ACQUIRE, solving IDE native-feature vs. freshness tension |
| Tag-Based Retrieval | `tag-based-retrieval.md` | Auto-generated hierarchical tags from folder path enable precise ACQUIRE-by-tag without search ambiguity |
| Document Bundling | `document-bundling.md` | Multiple documents at same VFS path merged into one XML response for layered core+org delivery |
| VFS Resource Paths | `vfs-resource-paths.md` | Canonical stable path computed by stripping release and org prefix from physical file path |
| Layered Instruction Architecture | `layered-instruction-architecture.md` | Release-versioned, org-namespaced instruction layers bundled at serve time for org-specific overrides |

## Data and Storage

| Pattern | File | Description |
|---|---|---|
| MD5 Change Detection | `md5-change-detection.md` | Hash over content + metadata determines whether a file needs re-publishing; ~77% time savings |
| Dual-Backend Store | `dual-backend-store.md` | In-memory or Redis backend selected at startup via REDIS_URL; identical async interface on both |
| TTL Cache | `ttl-cache-pattern.md` | Single-dataset in-memory cache with TTL prevents repeated expensive RAGFlow list-all-docs calls |
| Redis Schema Migrations | `redis-schema-migrations.md` | Sequential numbered migrations with distributed lock run exactly once on server startup |

## Authentication and Authorization

| Pattern | File | Description |
|---|---|---|
| OAuth Proxy | `oauth-proxy-pattern.md` | FastMCP OAuthProxy bridges any upstream IdP to MCP DCR; upstream tokens encrypted in Redis |
| Policy-Based Authorization | `policy-based-authorization.md` | Named policies (all/team/none) evaluated by Authorizer; aia-* datasets have hard rules |

## Code Organization

| Pattern | File | Description |
|---|---|---|
| Command Pattern (CLI) | `command-pattern-cli.md` | All CLI commands inherit BaseCommand for shared auth/timing; implement only execute() |
| Protocol-Based Typing | `protocol-based-typing.md` | typing.Protocol interfaces for SDK objects decouple business logic from RAGFlow SDK |
| Env-Backed Dataclass Config | `env-backed-dataclass-config.md` | All env vars read in single RosettaConfig.from_env() factory; injected at startup |
| Pre-Commit Plugin Sync | `pre-commit-plugin-sync.md` | Pre-commit hook regenerates IDE plugin artifacts from instructions source on every commit |
