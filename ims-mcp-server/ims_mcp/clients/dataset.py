"""Dataset lookup and caching."""

from __future__ import annotations

from cachetools import TTLCache

from ragflow_sdk import RAGFlow
from ragflow_sdk.modules.dataset import DataSet


class DatasetLookup:
    """Bidirectional name<->id dataset cache with TTL and negative caching.

    Uses ``cachetools.TTLCache`` for automatic expiry.
    """

    def __init__(self, ragflow: RAGFlow, ttl_seconds: int = 300):
        self._ragflow = ragflow
        self._ttl = ttl_seconds
        self._name_to_id: TTLCache[str, str | None] = TTLCache(maxsize=1024, ttl=ttl_seconds)
        self._id_to_name: TTLCache[str, str | None] = TTLCache(maxsize=1024, ttl=ttl_seconds)
        self._name_to_dataset: TTLCache[str, DataSet] = TTLCache(maxsize=1024, ttl=ttl_seconds)
        self._id_to_dataset: TTLCache[str, DataSet] = TTLCache(maxsize=1024, ttl=ttl_seconds)
        self._populated = False

    def invalidate(self) -> None:
        self._name_to_id.clear()
        self._id_to_name.clear()
        self._name_to_dataset.clear()
        self._id_to_dataset.clear()
        self._populated = False

    def remember(self, dataset: DataSet) -> DataSet:
        """Store a dataset object in all lookup caches."""
        self._name_to_id[dataset.name] = dataset.id
        self._id_to_name[dataset.id] = dataset.name
        self._name_to_dataset[dataset.name] = dataset
        self._id_to_dataset[dataset.id] = dataset
        return dataset

    def _refresh(self) -> None:
        """Fetch all datasets and rebuild both caches."""
        datasets = self._ragflow.list_datasets(page=1, page_size=1000)
        self._name_to_id.clear()
        self._id_to_name.clear()
        self._name_to_dataset.clear()
        self._id_to_dataset.clear()
        for ds in datasets:
            self.remember(ds)
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

    def get_dataset(self, name: str | None = None, dataset_id: str | None = None) -> DataSet | None:
        """Return a cached dataset object by name or id."""
        self._ensure_fresh()
        if dataset_id:
            return self._id_to_dataset.get(dataset_id)
        if name:
            return self._name_to_dataset.get(name)
        return None

    def list_datasets(self) -> list[DataSet]:
        """Return cached visible datasets."""
        self._ensure_fresh()
        return list(self._name_to_dataset.values())
