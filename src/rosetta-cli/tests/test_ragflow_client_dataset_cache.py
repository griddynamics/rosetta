from types import SimpleNamespace

from rosetta_cli.ragflow_client import RAGFlowClient


class _FakeRagFlow:
    def __init__(self):
        self.list_calls = []
        self.created = []
        self.deleted = []
        self.datasets = {
            "aia-r2": SimpleNamespace(id="ds-r2", name="aia-r2"),
            "aia-r1": SimpleNamespace(id="ds-r1", name="aia-r1"),
        }

    def list_datasets(self, **kwargs):
        self.list_calls.append(kwargs)
        if kwargs.get("id"):
            return [ds for ds in self.datasets.values() if ds.id == kwargs["id"]]
        if kwargs.get("name"):
            needle = kwargs["name"]
            return [ds for ds in self.datasets.values() if needle in ds.name]
        return list(self.datasets.values())

    def create_dataset(self, **kwargs):
        dataset = SimpleNamespace(id=f"ds-{kwargs['name']}", name=kwargs["name"])
        self.created.append(kwargs)
        self.datasets[dataset.name] = dataset
        return dataset

    def delete_datasets(self, ids):
        self.deleted.append(ids)


def _make_client(fake: _FakeRagFlow) -> RAGFlowClient:
    client = object.__new__(RAGFlowClient)
    client._client = fake
    client.embedding_model = None
    client.chunk_method = "naive"
    client.parser_config = {}
    client._dataset_by_id = {}
    client._dataset_by_name = {}
    return client


def test_get_dataset_by_name_uses_in_process_cache():
    fake = _FakeRagFlow()
    client = _make_client(fake)

    first = client.get_dataset(name="aia-r2")
    second = client.get_dataset(name="aia-r2")

    assert first is second
    assert len(fake.list_calls) == 1
    assert fake.list_calls[0]["name"] == "aia-r2"


def test_get_dataset_by_id_uses_name_lookup_cache():
    fake = _FakeRagFlow()
    client = _make_client(fake)

    by_name = client.get_dataset(name="aia-r2")
    by_id = client.get_dataset(id="ds-r2")

    assert by_id is by_name
    assert len(fake.list_calls) == 1


def test_create_dataset_invalidates_stale_dataset_cache_and_remembers_created_dataset():
    fake = _FakeRagFlow()
    client = _make_client(fake)
    stale = client.get_dataset(name="aia-r2")
    fake.datasets["aia-r2"] = SimpleNamespace(id="ds-r2-new", name="aia-r2")

    created = client.create_dataset("aia-r3")
    refreshed = client.get_dataset(name="aia-r2")
    created_again = client.get_dataset(name="aia-r3")

    assert stale.id == "ds-r2"
    assert refreshed.id == "ds-r2-new"
    assert created_again is created
    assert fake.created[0]["name"] == "aia-r3"
    assert len(fake.list_calls) == 2


def test_delete_datasets_invalidates_dataset_cache():
    fake = _FakeRagFlow()
    client = _make_client(fake)

    client.get_dataset(name="aia-r2")
    fake.datasets["aia-r2"] = SimpleNamespace(id="ds-r2-new", name="aia-r2")
    client.delete_datasets(["ds-r2"])
    refreshed = client.get_dataset(name="aia-r2")

    assert refreshed.id == "ds-r2-new"
    assert fake.deleted == [["ds-r2"]]
    assert len(fake.list_calls) == 2
