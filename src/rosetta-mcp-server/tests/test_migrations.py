"""Unit tests for RosettaMigrations."""

from __future__ import annotations

import pytest

from rosetta_mcp.migrations import (
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


# ---------------------------------------------------------------------------
# Lock fencing (issue #209)
# ---------------------------------------------------------------------------

class BytesFakeRedis(FakeRedis):
    """FakeRedis whose GET returns bytes, as a client without decode_responses would."""

    async def get(self, key: str) -> bytes | None:  # type: ignore[override]
        value = self._store.get(key)
        return None if value is None else value.encode()


@pytest.mark.asyncio
async def test_migration_lock_value_is_a_unique_token():
    """The lock is acquired with a per-run token, not a constant (issue #209)."""
    observed: list[str] = []

    async def _run_and_capture() -> None:
        redis = FakeRedis()
        m = RosettaMigrations(redis_client=redis)

        async def _spy_migrate_to_1() -> None:
            observed.append(redis._store[RosettaMigrations.LOCK_KEY])

        m._migrate_to_1 = _spy_migrate_to_1  # type: ignore[method-assign]
        await m.run()

    await _run_and_capture()
    await _run_and_capture()

    assert len(observed) == 2
    assert all(token and token != "1" for token in observed)
    assert observed[0] != observed[1]


@pytest.mark.asyncio
async def test_migration_release_does_not_delete_another_holders_lock():
    """A run whose lock expired must not delete the lock a second pod now holds.

    Simulates the TTL-expiry steal: mid-run, the lock key is overwritten with a
    foreign token. The unconditional DELETE in the ``finally`` used to wipe it,
    letting two pods migrate concurrently (issue #209).
    """
    redis = FakeRedis()
    m = RosettaMigrations(redis_client=redis)

    async def _steal_lock() -> None:
        redis._store[RosettaMigrations.LOCK_KEY] = "other-pod-token"

    m._migrate_to_1 = _steal_lock  # type: ignore[method-assign]

    await m.run()

    assert redis._store.get(RosettaMigrations.LOCK_KEY) == "other-pod-token"
    assert int(redis._store[REDIS_SCHEMA_VERSION_KEY]) == RosettaMigrations.LATEST_REDIS_SCHEMA_VERSION


@pytest.mark.asyncio
async def test_migration_release_does_not_delete_foreign_lock_on_error():
    """Same fencing on the failure path — the ``finally`` must still compare."""
    redis = FakeRedis()
    m = RosettaMigrations(redis_client=redis)

    async def _steal_then_fail() -> None:
        redis._store[RosettaMigrations.LOCK_KEY] = "other-pod-token"
        raise RuntimeError("migration failure")

    m._migrate_to_1 = _steal_then_fail  # type: ignore[method-assign]

    with pytest.raises(RuntimeError, match="migration failure"):
        await m.run()

    assert redis._store.get(RosettaMigrations.LOCK_KEY) == "other-pod-token"


@pytest.mark.asyncio
async def test_migration_release_tolerates_expired_lock():
    """If the lock already expired, release is a no-op and run() still succeeds."""
    redis = FakeRedis()
    m = RosettaMigrations(redis_client=redis)

    async def _expire_lock() -> None:
        redis._store.pop(RosettaMigrations.LOCK_KEY, None)

    m._migrate_to_1 = _expire_lock  # type: ignore[method-assign]

    await m.run()

    assert RosettaMigrations.LOCK_KEY not in redis._store
    assert int(redis._store[REDIS_SCHEMA_VERSION_KEY]) == RosettaMigrations.LATEST_REDIS_SCHEMA_VERSION


@pytest.mark.asyncio
async def test_migration_lock_released_when_get_returns_bytes():
    """Ownership comparison works against a client that returns raw bytes."""
    redis = BytesFakeRedis()
    m = RosettaMigrations(redis_client=redis)

    await m.run()

    assert RosettaMigrations.LOCK_KEY not in redis._store
    assert int(redis._store[REDIS_SCHEMA_VERSION_KEY]) == RosettaMigrations.LATEST_REDIS_SCHEMA_VERSION
