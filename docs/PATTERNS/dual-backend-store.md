# Dual-Backend Store Pattern

OAuth client storage is backed by either the FastMCP in-memory default (no store) or a Redis store, selected at startup via optional `REDIS_URL` configuration, through the shared async `AsyncKeyValue` interface from `py-key-value-aio`.

## Problem Solved

Local development and single-process deployments don't need Redis. Production multi-replica deployments require Redis for shared state (OAuth clients/tokens). Switching backend should require zero code changes in the calling layer.

## When to Use

- Any stateful feature that must work in local dev (no Redis) and production (Redis).
- Adding a new stateful feature to the MCP server.

## Structure

```python
from key_value.aio.protocols.key_value import AsyncKeyValue

# Redis backend built from REDIS_URL, or None when unset
# (None => FastMCP uses its in-memory default; zero code change in callers)
def _build_redis_store() -> AsyncKeyValue | None:
    if not redis_url:
        return None
    from key_value.aio.stores.redis import RedisStore
    return RedisStore(url=redis_url)

# OAuth client storage: optionally Fernet-encrypted wrapper over the Redis store, else None
def _build_oauth_client_storage() -> AsyncKeyValue | None:
    if _REDIS_STORE is None:
        return None
    from key_value.aio.wrappers.encryption import FernetEncryptionWrapper
    return FernetEncryptionWrapper(key_value=_REDIS_STORE, ...)  # when FERNET_KEY + cryptography available
```

## Occurrences

- `src/rosetta-mcp-server/rosetta_mcp/server.py` — `_build_redis_store()`, `_build_oauth_client_storage()`, `_REDIS_STORE`
- `src/rosetta-mcp-server/rosetta_mcp/auth/oauth.py` — consumes `client_storage: AsyncKeyValue | None`
