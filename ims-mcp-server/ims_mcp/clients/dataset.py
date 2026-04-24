"""Dataset lookup and caching."""

from __future__ import annotations

from cachetools import TTLCache

from ragflow_sdk import RAGFlow


class DatasetLookup:
    """Bidirectional name<->id dataset cache with TTL and negative caching.

    Uses ``cachetools.TTLCache`` for automatic expiry.
    """

    def __init__(self, ragflow: RAGFlow, ttl_seconds: int = 300):
        self._ragflow = ragflow
        self._ttl = ttl_seconds
        self._name_to_id: TTLCache[str, str | None] = TTLCache(maxsize=1024, ttl=ttl_seconds)
        self._id_to_name: TTLCache[str, str | None] = TTLCache(maxsize=1024, ttl=ttl_seconds)
        self._populated = False

    def invalidate(self) -> None:
        self._name_to_id.clear()
        self._id_to_name.clear()
        self._populated = False

    def _refresh(self) -> None:
        """Fetch all datasets and rebuild both caches."""
        datasets = self._ragflow.list_datasets(page=1, page_size=1000)
        self._name_to_id.clear()
        self._id_to_name.clear()
        for ds in datasets:
            self._name_to_id[ds.name] = ds.id
            self._id_to_name[ds.id] = ds.name
        self._populated = True

    def _ensure_fresh(self) -> None:
        if not self._populated or len(self._name_to_id) == 0:
            self._refresh()

    def get_id(self, name: str) -> str | None:
        self._ensure_fresh()
        result: str | None = self._name_to_id.get(name)
        return result

    def get_name(self, dataset_id: str) -> str | None:
        self._ensure_fresh()
        result: str | None = self._id_to_name.get(dataset_id)
        return result
