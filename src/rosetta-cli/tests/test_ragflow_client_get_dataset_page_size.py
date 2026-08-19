from types import SimpleNamespace

from rosetta_cli.ragflow_client import RAGFlowClient


class _PagedRagFlow:
    """SDK stub: substring match on name, truncated to page_size (like RAGFlow)."""

    def __init__(self, datasets):
        self.datasets = datasets
        self.list_calls: list[dict] = []

    def list_datasets(self, **kwargs):
        self.list_calls.append(kwargs)
        needle = kwargs.get("name")
        matches = [ds for ds in self.datasets if needle is None or needle in ds.name]
        return matches[: kwargs.get("page_size")]


def _make_client(fake: _PagedRagFlow, page_size: int) -> RAGFlowClient:
    client = object.__new__(RAGFlowClient)
    client._client = fake
    client.page_size = page_size
    client._dataset_by_id = {}
    client._dataset_by_name = {}
    return client


def test_get_dataset_finds_exact_match_beyond_first_ten_substring_hits():
    # 12 datasets share the "aia" substring; the exact match sorts last.
    datasets = [SimpleNamespace(id=f"ds-{i}", name=f"aia-r{i}") for i in range(12)]
    datasets.append(SimpleNamespace(id="ds-exact", name="aia"))
    fake = _PagedRagFlow(datasets)
    client = _make_client(fake, page_size=1000)

    found = client.get_dataset(name="aia")

    assert found is not None and found.id == "ds-exact"
    assert fake.list_calls[0]["page_size"] == 1000
