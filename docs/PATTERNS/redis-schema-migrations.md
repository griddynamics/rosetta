# Redis Schema Migrations Pattern

Sequential numbered migration methods on a class run exactly once per version on server startup, guarded by a distributed Redis lock to prevent concurrent execution across pods during rolling deploys.

## Problem Solved

Redis schema changes (e.g., key format changes, stale record flushes) must run once across all replicas during rolling deploys. Without coordination, concurrent migrations corrupt state or run multiple times.

## When to Use

- Any change to Redis key format or schema.
- Flushing stale keys when metadata fields change (e.g., OAuth client scopes).
- Add a new migration whenever Redis data structure changes.

## Structure

```python
class RosettaMigrations:
    LATEST_REDIS_SCHEMA_VERSION = N  # bump when adding migration

    async def run(self) -> None:
        current = await self._get_redis_schema_version()
        if current >= self.LATEST_REDIS_SCHEMA_VERSION:
            return
        # Acquire distributed lock (SETNX + TTL)
        acquired = await self._redis.set(self.LOCK_KEY, "1", nx=True, ex=60)
        if not acquired:
            return  # another pod running migrations
        try:
            current = await self._get_redis_schema_version()  # re-read under lock
            for version in range(current + 1, self.LATEST_REDIS_SCHEMA_VERSION + 1):
                await getattr(self, f"_migrate_to_{version}")()
                await self._set_redis_schema_version(version)
        finally:
            await self._redis.delete(self.LOCK_KEY)

    async def _migrate_to_1(self) -> None: ...  # baseline no-op
    async def _migrate_to_2(self) -> None: ...  # actual change
```

## Adding a Migration

1. Add `async def _migrate_to_N(self) -> None:` with the migration logic.
2. Bump `LATEST_REDIS_SCHEMA_VERSION = N`.
3. Deploy — migration runs exactly once across all pods.

## Key Details

- Version tracked in `rosetta:redis-schema-version` (plain integer in Redis).
- Lock key: `rosetta:migration-lock`, TTL 60s (auto-expires on crash).
- Double-check-lock pattern: re-read version after acquiring lock.
- All activity logged at `INFO` under `ims_mcp.migrations`.

## Occurrences

- `src/ims-mcp-server/ims_mcp/migrations.py` — full implementation
- `src/ims-mcp-server/ims_mcp/server.py` — invoked in FastMCP lifespan hook
- `src/ims-mcp-server/tests/test_migrations.py` — unit tests
