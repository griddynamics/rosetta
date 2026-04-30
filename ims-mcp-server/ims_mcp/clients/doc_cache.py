"""TTL-cached full document list for instruction datasets.

Shared by list_instructions and VFS resource reads to avoid repeated
RAGFlow queries for the same dataset.
"""

from __future__ import annotations

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
        """Return cached full doc list, refreshing if stale."""
        cached: list[DocumentLike] | None = self._cache.get(dataset_name)
        if cached is not None:
            return cached
        docs = self._document_client.list_docs(
            dataset=dataset, page_size=10000,
        )
        self._cache[dataset_name] = docs
        return docs

    def invalidate(self) -> None:
        self._cache.clear()
