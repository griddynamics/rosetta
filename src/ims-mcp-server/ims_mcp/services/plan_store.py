"""Plan storage backends for plan_manager tool.

Provides async get/set over two backends:
- RedisPlanStore: persists plans in Redis with sliding TTL expiry.
- MemoryPlanStore: in-process dict with lazy read expiry and sweep-on-write
  to prevent unbounded memory growth.
"""

from __future__ import annotations

import time
from typing import Any, Protocol, cast, runtime_checkable

from ims_mcp.typing_utils import JsonObject


@runtime_checkable
class PlanStore(Protocol):
    async def get(self, key: str) -> JsonObject | None: ...
    async def set(self, key: str, value: JsonObject) -> None: ...


class MemoryPlanStore:
    """In-process plan store with TTL-based expiry.

    Expired entries are removed lazily on ``get`` and eagerly swept on every
    ``set`` call to prevent unbounded memory growth in long-running servers.
    """

    def __init__(self, ttl_seconds: int) -> None:
        self._ttl = ttl_seconds
        self._store: dict[str, dict[str, Any]] = {}

    async def get(self, key: str) -> JsonObject | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        if time.monotonic() > entry["expires_at"]:
            del self._store[key]
            return None
        return cast(JsonObject, entry["data"])

    async def set(self, key: str, value: JsonObject) -> None:
        self._sweep_expired()
        self._store[key] = {
            "data": value,
            "expires_at": time.monotonic() + self._ttl,
        }

    def _sweep_expired(self) -> None:
        now = time.monotonic()
        expired = [k for k, v in self._store.items() if now > v["expires_at"]]
        for k in expired:
            del self._store[k]

    def __len__(self) -> int:  # useful for tests
        return len(self._store)


class RedisPlanStore:
    """Redis-backed plan store with write-based TTL expiry.

    Wraps the existing ``key_value.aio`` RedisStore already present in the
    server.  Each ``set`` refreshes the expiry; reads do not extend TTL.
    """

    def __init__(self, redis_store: Any, ttl_seconds: int) -> None:
        self._store = redis_store
        self._ttl = ttl_seconds

    async def get(self, key: str) -> JsonObject | None:
        # RedisStore.get() returns dict directly (already deserialized)
        return cast(JsonObject | None, await self._store.get(key))

    async def set(self, key: str, value: JsonObject) -> None:
        # RedisStore.put() expects dict and handles serialization internally
        await self._store.put(key, value, ttl=self._ttl)


def build_plan_store(redis_store: Any, ttl_seconds: int) -> PlanStore:
    """Return RedisPlanStore when redis_store is available, else MemoryPlanStore."""
    if redis_store is not None:
        return RedisPlanStore(redis_store, ttl_seconds)
    return MemoryPlanStore(ttl_seconds)
