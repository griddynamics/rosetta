# Dual-Backend Store Pattern

A feature (plan storage, OAuth client storage) is backed by either an in-memory or Redis store, selected at startup via optional `REDIS_URL` configuration, with identical async `get`/`set` interfaces on both backends.

## Problem Solved

Local development and single-process deployments don't need Redis. Production multi-replica deployments require Redis for shared state. Switching backend should require zero code changes in the calling layer.

## When to Use

- Any stateful feature that must work in local dev (no Redis) and production (Redis).
- Adding a new stateful feature to the MCP server.

## Structure

```python
# Protocol defines shared interface
class PlanStore(Protocol):
    async def get(self, key: str) -> JsonObject | None: ...
    async def set(self, key: str, value: JsonObject) -> None: ...

# In-memory backend with TTL sweep
class MemoryPlanStore:
    async def get(self, key: str) -> JsonObject | None: ...   # lazy expiry
    async def set(self, key: str, value: JsonObject) -> None: ... # sweep on write

# Redis backend
class RedisPlanStore:
    async def get(self, key: str) -> JsonObject | None: ...
    async def set(self, key: str, value: JsonObject) -> None: ...  # sliding TTL via put()

# Factory selects at startup
def build_plan_store(redis_store: Any, ttl_seconds: int) -> PlanStore:
    if isinstance(redis_store, PlanStore):
        return RedisPlanStore(redis_store, ttl_seconds)
    return MemoryPlanStore(ttl_seconds)
```

## Also Used For

- OAuth client storage: `_build_oauth_client_storage()` returns `FernetEncryptionWrapper(RedisStore)` or `RedisStore` or `None`.
- Redis store itself: `_build_redis_store()` returns `RedisStore` or `None` based on `REDIS_URL`.

## Occurrences

- `ims-mcp-server/ims_mcp/services/plan_store.py` — `MemoryPlanStore`, `RedisPlanStore`, `build_plan_store()`
- `ims-mcp-server/ims_mcp/server.py` — `_build_redis_store()`, `_build_oauth_client_storage()`, `_PLAN_STORE`
- `ims-mcp-server/tests/test_plan_manager.py` — tests both backends
