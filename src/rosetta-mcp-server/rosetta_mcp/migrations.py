"""Redis schema migrations for Rosetta."""

import logging
import uuid
from typing import Protocol

logger = logging.getLogger(__name__)

REDIS_SCHEMA_VERSION_KEY = "rosetta:redis-schema-version"
CLIENT_COLLECTION_PREFIX = "mcp-oauth-proxy-clients:"


class RedisClient(Protocol):
    """Minimal interface for raw Redis operations."""

    async def get(self, key: str) -> str | None: ...
    async def set(self, key: str, value: str, *, nx: bool = False, ex: int | None = None) -> bool | None: ...
    async def scan(self, cursor: int, *, match: str, count: int) -> tuple[int, list[bytes]]: ...
    async def delete(self, *keys: str | bytes) -> None: ...


class RosettaMigrations:
    """Sequential Redis schema migrations for Rosetta.

    Each migration is a method named ``_migrate_to_{version}``.
    On startup, reads the current version from Redis and executes
    only the migrations that haven't run yet, in sequence order.

    Every ``_migrate_to_N`` MUST be idempotent. The distributed lock is
    best-effort deduplication only: it carries a TTL and is never extended,
    so a run that outlives the TTL loses it while still working. Idempotent
    migrations plus the version re-read under the lock are what actually make
    a rolling deploy safe.
    """

    LATEST_REDIS_SCHEMA_VERSION = 2  # bump when adding a new migration

    LOCK_KEY = "rosetta:migration-lock"
    LOCK_TTL_SECONDS = 60  # auto-expire if process hangs or crashes

    def __init__(self, redis_client: RedisClient) -> None:
        self._redis = redis_client

    async def run(self) -> None:
        current = await self._get_redis_schema_version()
        if current >= self.LATEST_REDIS_SCHEMA_VERSION:
            logger.info(
                "Redis schema up to date (version=%d, latest=%d), no migrations needed",
                current,
                self.LATEST_REDIS_SCHEMA_VERSION,
            )
            return

        logger.info(
            "Redis schema needs migration (current=%d, latest=%d)",
            current,
            self.LATEST_REDIS_SCHEMA_VERSION,
        )

        # Acquire distributed lock with TTL to deduplicate concurrent migrations.
        # SETNX + EX ensures the lock auto-expires if the holder crashes. The
        # value is a per-run token so release can be fenced (#209).
        lock_token = uuid.uuid4().hex
        acquired = await self._redis.set(
            self.LOCK_KEY, lock_token, nx=True, ex=self.LOCK_TTL_SECONDS
        )
        if not acquired:
            logger.info("Migration lock held by another pod, skipping")
            return

        logger.info("Migration lock acquired")
        try:
            # Re-read version under lock (another pod may have finished)
            current = await self._get_redis_schema_version()
            if current >= self.LATEST_REDIS_SCHEMA_VERSION:
                logger.info(
                    "Redis schema already migrated by another pod (version=%d), skipping",
                    current,
                )
                return
            for version in range(current + 1, self.LATEST_REDIS_SCHEMA_VERSION + 1):
                method = getattr(self, f"_migrate_to_{version}", None)
                if method is None:
                    raise RuntimeError(f"Missing migration method: _migrate_to_{version}")
                logger.info("Running Redis migration to version %d", version)
                await method()
                await self._set_redis_schema_version(version)
                logger.info("Completed Redis migration to version %d", version)
            logger.info(
                "Redis migrations complete (version=%d)", self.LATEST_REDIS_SCHEMA_VERSION
            )
        finally:
            await self._release_lock(lock_token)

    async def _release_lock(self, token: str) -> None:
        """Delete the migration lock only while this run still owns it.

        The lock has a 60 s TTL and is never extended, so a slow run can lose
        it to another pod. An unconditional DELETE would then wipe that pod's
        fresh lock and let two runs proceed together (#209). Comparing the
        token first removes that window down to the sub-millisecond gap between
        GET and DELETE; closing it fully would need a Lua CAS (and an ``eval``
        on ``RedisClient``), which is not worth it for a once-per-process hook.
        """
        try:
            raw = await self._redis.get(self.LOCK_KEY)
        except Exception:
            logger.warning("Could not read migration lock to release it", exc_info=True)
            return
        current: str | None = raw.decode() if isinstance(raw, bytes) else raw
        if current is None:
            logger.info("Migration lock already expired, nothing to release")
            return
        if current != token:
            logger.warning(
                "Migration lock no longer owned by this run (expired and re-acquired "
                "elsewhere), leaving it in place"
            )
            return
        await self._redis.delete(self.LOCK_KEY)
        logger.info("Migration lock released")

    async def _get_redis_schema_version(self) -> int:
        raw = await self._redis.get(REDIS_SCHEMA_VERSION_KEY)
        if raw is None:
            return 0
        return int(raw)

    async def _set_redis_schema_version(self, version: int) -> None:
        await self._redis.set(REDIS_SCHEMA_VERSION_KEY, str(version))

    # ------------------------------------------------------------------
    # Migrations
    # ------------------------------------------------------------------

    async def _migrate_to_1(self) -> None:
        """Initial baseline. No-op — marks existing deployments as version 1."""

    async def _migrate_to_2(self) -> None:
        """Flush DCR/CIMD clients to pick up required_scopes change.

        Clients were registered with scope="" because required_scopes
        was not set on IntrospectionTokenVerifier. After adding
        ROSETTA_OAUTH_REQUIRED_SCOPES, existing clients must be
        re-registered with the correct scope.
        """
        cursor = 0
        all_keys: list[str] = []
        while True:
            cursor, keys = await self._redis.scan(
                cursor, match=f"{CLIENT_COLLECTION_PREFIX}*", count=100
            )
            if keys:
                decoded = [k.decode() if isinstance(k, bytes) else k for k in keys]
                logger.info("Found stale OAuth client keys: %s", decoded)
                await self._redis.delete(*keys)
                all_keys.extend(decoded)
            if cursor == 0:
                break
        logger.info("Deleted %d stale OAuth client records (mcp-oauth-proxy-clients:*)", len(all_keys))
