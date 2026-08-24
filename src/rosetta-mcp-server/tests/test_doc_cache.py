"""Unit tests for InstructionDocCache (TTL hit/miss/expiry, async timeout, invalidate).

Exercises the real class; only its ``document_client`` collaborator is faked.
"""

from __future__ import annotations

import asyncio
import threading
import time

import pytest

from rosetta_mcp.clients.doc_cache import InstructionDocCache
from rosetta_mcp.constants import DEFAULT_TOOL_TIMEOUT


class _FakeDocumentClient:
    def __init__(self, docs=None, blocking=False, block_seconds=10.0):
        self.calls = 0
        self.call_args: list[dict] = []
        self._docs = docs if docs is not None else []
        self._blocking = blocking
        self._block_seconds = block_seconds

    def list_docs(self, dataset, name=None, keywords=None, page=1, page_size=1000,
                   doc_id=None, metadata_condition=None):
        self.calls += 1
        self.call_args.append({"dataset": dataset, "page_size": page_size})
        if self._blocking:
            threading.Event().wait(timeout=self._block_seconds)
        return list(self._docs)


def test_get_all_docs_cache_miss_then_hit():
    fake = _FakeDocumentClient(docs=["doc1", "doc2"])
    cache = InstructionDocCache(document_client=fake, ttl=300)
    dataset = object()

    assert cache.get_all_docs(dataset, "ds1") == ["doc1", "doc2"]
    assert fake.calls == 1

    assert cache.get_all_docs(dataset, "ds1") == ["doc1", "doc2"]
    assert fake.calls == 1


def test_get_all_docs_expires_after_ttl():
    fake = _FakeDocumentClient(docs=["doc1"])
    cache = InstructionDocCache(document_client=fake, ttl=0.05)
    dataset = object()

    assert cache.get_all_docs(dataset, "ds1") == ["doc1"]
    assert fake.calls == 1

    time.sleep(0.2)

    assert cache.get_all_docs(dataset, "ds1") == ["doc1"]
    assert fake.calls == 2


def test_invalidate_forces_refetch():
    fake = _FakeDocumentClient(docs=["doc1"])
    cache = InstructionDocCache(document_client=fake, ttl=300)
    dataset = object()

    assert cache.get_all_docs(dataset, "ds1") == ["doc1"]
    assert fake.calls == 1

    cache.invalidate()

    assert cache.get_all_docs(dataset, "ds1") == ["doc1"]
    assert fake.calls == 2


@pytest.mark.asyncio
async def test_get_all_docs_async_cache_miss_then_hit():
    fake = _FakeDocumentClient(docs=["doc1"])
    cache = InstructionDocCache(document_client=fake, ttl=300)
    dataset = object()

    result = await cache.get_all_docs_async(dataset, "ds1", tool_timeout=5)
    assert result == ["doc1"]
    assert fake.calls == 1

    result = await cache.get_all_docs_async(dataset, "ds1", tool_timeout=5)
    assert result == ["doc1"]
    assert fake.calls == 1


@pytest.mark.asyncio
async def test_get_all_docs_async_raises_timeout_and_does_not_cache():
    fake = _FakeDocumentClient(blocking=True, block_seconds=10.0)
    cache = InstructionDocCache(document_client=fake, ttl=300)
    dataset = object()

    with pytest.raises(asyncio.TimeoutError):
        await cache.get_all_docs_async(dataset, "ds1", tool_timeout=0.1)

    assert cache._cache.get("ds1") is None


@pytest.mark.asyncio
async def test_get_all_docs_async_invalidate_forces_refetch():
    fake = _FakeDocumentClient(docs=["doc1"])
    cache = InstructionDocCache(document_client=fake, ttl=300)
    dataset = object()

    await cache.get_all_docs_async(dataset, "ds1", tool_timeout=5)
    assert fake.calls == 1

    cache.invalidate()

    await cache.get_all_docs_async(dataset, "ds1", tool_timeout=5)
    assert fake.calls == 2


# ---------------------------------------------------------------------------
# ROSETTA_TOOL_TIMEOUT resolution (issue #207)
# ---------------------------------------------------------------------------

@pytest.fixture
def recorded_wait_for(monkeypatch):
    """Record the timeout passed to asyncio.wait_for, then delegate to the real one."""
    recorded: dict[str, float] = {}
    real_wait_for = asyncio.wait_for

    async def _spy(awaitable, timeout=None):
        recorded["timeout"] = timeout
        return await real_wait_for(awaitable, timeout)

    monkeypatch.setattr(asyncio, "wait_for", _spy)
    return recorded


@pytest.mark.asyncio
async def test_get_all_docs_async_default_timeout_honors_env(monkeypatch, recorded_wait_for):
    """With tool_timeout omitted, ROSETTA_TOOL_TIMEOUT must be honored (issue #207)."""
    monkeypatch.setenv("ROSETTA_TOOL_TIMEOUT", "7")
    fake = _FakeDocumentClient(docs=["doc1"])
    cache = InstructionDocCache(document_client=fake, ttl=300)

    assert await cache.get_all_docs_async(object(), "ds1") == ["doc1"]
    assert recorded_wait_for["timeout"] == 7


@pytest.mark.asyncio
async def test_get_all_docs_async_default_timeout_unchanged_without_env(
    monkeypatch, recorded_wait_for
):
    """No env var set: the effective timeout stays DEFAULT_TOOL_TIMEOUT (issue #207)."""
    monkeypatch.delenv("ROSETTA_TOOL_TIMEOUT", raising=False)
    fake = _FakeDocumentClient(docs=["doc1"])
    cache = InstructionDocCache(document_client=fake, ttl=300)

    assert await cache.get_all_docs_async(object(), "ds1") == ["doc1"]
    assert recorded_wait_for["timeout"] == DEFAULT_TOOL_TIMEOUT


@pytest.mark.asyncio
async def test_get_all_docs_async_explicit_timeout_overrides_env(monkeypatch, recorded_wait_for):
    """An explicit tool_timeout still wins over the env var (issue #207)."""
    monkeypatch.setenv("ROSETTA_TOOL_TIMEOUT", "7")
    fake = _FakeDocumentClient(docs=["doc1"])
    cache = InstructionDocCache(document_client=fake, ttl=300)

    assert await cache.get_all_docs_async(object(), "ds1", tool_timeout=5) == ["doc1"]
    assert recorded_wait_for["timeout"] == 5


@pytest.mark.asyncio
async def test_get_all_docs_async_invalid_env_falls_back_to_default(
    monkeypatch, recorded_wait_for
):
    """A non-numeric ROSETTA_TOOL_TIMEOUT falls back to the default (issue #207)."""
    monkeypatch.setenv("ROSETTA_TOOL_TIMEOUT", "not-a-number")
    fake = _FakeDocumentClient(docs=["doc1"])
    cache = InstructionDocCache(document_client=fake, ttl=300)

    assert await cache.get_all_docs_async(object(), "ds1") == ["doc1"]
    assert recorded_wait_for["timeout"] == DEFAULT_TOOL_TIMEOUT
