"""Unit tests for InstructionDocCache (TTL hit/miss/expiry, async timeout, invalidate).

Exercises the real class; only its ``document_client`` collaborator is faked.
"""

from __future__ import annotations

import asyncio
import threading
import time

import pytest

from rosetta_mcp.clients.doc_cache import InstructionDocCache


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
