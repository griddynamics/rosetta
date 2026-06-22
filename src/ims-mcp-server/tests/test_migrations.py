"""Unit tests for RosettaMigrations."""

from __future__ import annotations

import pytest

from ims_mcp.migrations import (
    CLIENT_COLLECTION_PREFIX,
    RosettaMigrations,
    REDIS_SCHEMA_VERSION_KEY,
)


class FakeRedis:
    """In-memory fake implementing the RedisClient protocol."""

    def __init__(self, initial: dict[str, str] | None = None) -> None:
        self._store: dict[str, str] = dict(initial or {})
        self._locked = False

    async def get(self, key: str) -> str | None:
        return self._store.get(key)

    async def set(self, key: str, value: str, *, nx: bool = False, ex: int | None = None) -> bool | None:
        if nx:
            if key in self._store:
                return False
            self._store[key] = value
            return True
        self._store[key] = value
        return True

    async def scan(self, cursor: int, *, match: str, count: int) -> tuple[int, list[bytes]]:
        pattern = match.rstrip("*")
        keys = [k.encode() for k in self._store if k.startswith(pattern)]
        return 0, keys

    async def delete(self, *keys: str | bytes) -> None:
        for k in keys:
            key = k.decode() if isinstance(k, bytes) else k
            self._store.pop(key, None)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _client_key(suffix: str) -> str:
    return f"{CLIENT_COLLECTION_PREFIX}{suffix}"


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_migration_runs_on_fresh_redis():
    redis = FakeRedis()
    m = RosettaMigrations(redis_client=redis)
    await m.run()
    assert int(redis._store[REDIS_SCHEMA_VERSION_KEY]) == RosettaMigrations.LATEST_REDIS_SCHEMA_VERSION


@pytest.mark.asyncio
async def test_migration_skips_when_current():
    redis = FakeRedis({REDIS_SCHEMA_VERSION_KEY: str(RosettaMigrations.LATEST_REDIS_SCHEMA_VERSION)})
    m = RosettaMigrations(redis_client=redis)
    called: list[int] = []

    async def _spy_migrate_to_2() -> None:
        called.append(2)

    m._migrate_to_2 = _spy_migrate_to_2  # type: ignore[method-assign]
    await m.run()
    assert called == []


@pytest.mark.asyncio
async def test_migration_lock_prevents_concurrent_run():
    redis = FakeRedis({RosettaMigrations.LOCK_KEY: "1"})
    m = RosettaMigrations(redis_client=redis)
    # Lock is already held; run() should skip immediately without migrating
    await m.run()
    assert REDIS_SCHEMA_VERSION_KEY not in redis._store


@pytest.mark.asyncio
async def test_migration_lock_released_after_run():
    redis = FakeRedis()
    m = RosettaMigrations(redis_client=redis)
    await m.run()
    assert RosettaMigrations.LOCK_KEY not in redis._store


@pytest.mark.asyncio
async def test_migration_lock_released_on_error():
    redis = FakeRedis()
    m = RosettaMigrations(redis_client=redis)

    async def _bad_migrate() -> None:
        raise RuntimeError("migration failure")

    m._migrate_to_1 = _bad_migrate  # type: ignore[method-assign]

    with pytest.raises(RuntimeError, match="migration failure"):
        await m.run()

    assert RosettaMigrations.LOCK_KEY not in redis._store


@pytest.mark.asyncio
async def test_migrate_to_2_deletes_client_keys():
    redis = FakeRedis({
        _client_key("abc"): "data",
        _client_key("def"): "data",
        REDIS_SCHEMA_VERSION_KEY: "1",
    })
    m = RosettaMigrations(redis_client=redis)
    await m._migrate_to_2()
    assert _client_key("abc") not in redis._store
    assert _client_key("def") not in redis._store


@pytest.mark.asyncio
async def test_migrate_to_2_ignores_other_keys():
    unrelated_key = "rosetta:session:xyz"
    redis = FakeRedis({
        _client_key("abc"): "data",
        unrelated_key: "keep-me",
    })
    m = RosettaMigrations(redis_client=redis)
    await m._migrate_to_2()
    assert unrelated_key in redis._store
