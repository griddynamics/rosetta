"""TTL-cached full document list for instruction datasets.

Shared by list_instructions and VFS resource reads to avoid repeated
RAGFlow queries for the same dataset.
"""

from __future__ import annotations

import asyncio
import functools

from cachetools import TTLCache

from ims_mcp.clients.document import DocumentClient
from ims_mcp.constants import DOC_CACHE_TTL_SECONDS
from ims_mcp.typing_utils import DatasetLike, DocumentLike


class InstructionDocCache:
    """Cache all documents from an instruction dataset with TTL.

    Uses ``cachetools.TTLCache`` keyed by dataset name.
    """

    def __init__(self, document_client: DocumentClient, ttl: int = DOC_CACHE_TTL_SECONDS):
        self._document_client = document_client
        self._cache: TTLCache[str, list[DocumentLike]] = TTLCache(maxsize=32, ttl=ttl)

    def get_all_docs(self, dataset: DatasetLike, dataset_name: str) -> list[DocumentLike]:
        """Return cached full doc list, refreshing if stale.

        NOTE: This is a sync method. Cache reads/writes stay on the event-loop
        thread (see SPECS A-1). The BLOCKING ``list_docs`` call must be offloaded
        by the caller via ``get_all_docs_async`` when running in async context.
        """
        cached: list[DocumentLike] | None = self._cache.get(dataset_name)
        if cached is not None:
            return cached
        docs = self._document_client.list_docs(
            dataset=dataset, page_size=10000,
        )
        self._cache[dataset_name] = docs
        return docs

    async def get_all_docs_async(
        self, dataset: DatasetLike, dataset_name: str, tool_timeout: int = 120
    ) -> list[DocumentLike]:
        """Async variant: cache check on event loop; blocking fetch off-loop (A4).

        Cache read/write happen on the event-loop thread (SPECS A-1).
        Only the sync RAGFlow list_docs is offloaded via asyncio.to_thread.
        """
        cached: list[DocumentLike] | None = self._cache.get(dataset_name)
        if cached is not None:
            return cached
        # Offload only the blocking I/O, not the cache access (SPECS A-1).
        docs = await asyncio.wait_for(
            asyncio.to_thread(
                functools.partial(
                    self._document_client.list_docs,
                    dataset=dataset,
                    page_size=10000,
                )
            ),
            timeout=tool_timeout,
        )
        # Write back on the event-loop thread (SPECS A-1).
        self._cache[dataset_name] = docs
        return docs

    def invalidate(self) -> None:
        self._cache.clear()
