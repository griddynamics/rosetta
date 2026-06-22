# OAuth Proxy Pattern

FastMCP's OAuthProxy/OIDCProxy bridges any upstream IdP to MCP's Dynamic Client Registration expectation, issuing short-lived FastMCP JWTs to clients while upstream tokens are stored encrypted in Redis.

## Problem Solved

MCP clients (Cursor, Claude Code) speak OAuth DCR. Real IdPs (Keycloak, GitHub, Google, Azure) do not. The proxy translates between them so any IdP works with any MCP client without coupling.

## When to Use

- HTTP transport (`ROSETTA_TRANSPORT=http`).
- Any deployment requiring SSO or external identity.
- Two modes selectable at runtime: `oauth` (opaque token + introspection) and `oidc` (JWT + JWKS discovery).

## Component Structure

```
MCP Client → FastMCP JWT → OAuthProxy/OIDCProxy → upstream IdP token (Redis-encrypted)
                                │
                         IntrospectionTokenVerifier (oauth mode)
                         or JWTVerifier via JWKS (oidc mode)
```

## Key Design Decisions

- MCP clients never see IdP tokens; IdP never sees FastMCP JWTs — full isolation.
- `FernetEncryptionWrapper` encrypts token values at rest in Redis.
- `offline_access` scope (via `ROSETTA_OAUTH_EXTRA_SCOPES`) enables authenticate-once with refresh tokens.
- `with_offline_refresh_fix` / `with_loopback_redirect_fix` — class decorator patches applied at import time to fix FastMCP edge cases.
- Introspection results cached 15 min to reduce IdP round trips.

## Environment Variables

| Var | Required | Notes |
|---|---|---|
| `ROSETTA_OAUTH_MODE` | No | `oauth` (default) or `oidc` |
| `ROSETTA_OAUTH_AUTHORIZATION_ENDPOINT` | oauth mode | Upstream auth endpoint |
| `ROSETTA_OAUTH_TOKEN_ENDPOINT` | oauth mode | Token exchange |
| `ROSETTA_OAUTH_INTROSPECTION_ENDPOINT` | oauth mode | Token validation |
| `ROSETTA_OAUTH_OIDC_CONFIG_URL` | oidc mode | IdP discovery URL |
| `ROSETTA_JWT_SIGNING_KEY` | Yes (HTTP) | FastMCP JWT signing |
| `FERNET_KEY` | Yes (HTTP) | Redis token encryption |

## Occurrences

- `src/ims-mcp-server/ims_mcp/auth/oauth.py` — `build_oauth_provider()`
- `src/ims-mcp-server/ims_mcp/auth/offline_refresh_fix.py` — refresh token patch
- `src/ims-mcp-server/ims_mcp/auth/loopback_redirect_fix.py` — loopback redirect patch
- `src/ims-mcp-server/ims_mcp/server.py` — `_build_oauth_client_storage()`, `_OAUTH_PROVIDER`
- `docs/AUTHENTICATION.md` — full two-leg proxy architecture
