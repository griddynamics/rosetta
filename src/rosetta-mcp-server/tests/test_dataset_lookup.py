import pytest

from rosetta_mcp.clients.dataset import DatasetLookup


class _Dataset:
    def __init__(self, dataset_id, name):
        self.id = dataset_id
        self.name = name


class _Rag:
    def __init__(self, datasets=None):
        self.calls = 0
        self._datasets = datasets or []

    def list_datasets(self, page=1, page_size=1000, **kwargs):
        self.calls += 1
        return list(self._datasets)


def test_positive_and_negative_cache():
    rag = _Rag(datasets=[_Dataset("d1", "known")])
    lookup = DatasetLookup(ragflow=rag, ttl_seconds=300)

    assert lookup.get_id("known") == "d1"
    assert lookup.get_id("known") == "d1"
    assert lookup.get_id("missing") is None
    assert lookup.get_id("missing") is None

    # Single refresh call for all lookups (within TTL)
    assert rag.calls == 1


def test_invalidate_clears_cache():
    rag = _Rag(datasets=[_Dataset("d1", "known")])
    lookup = DatasetLookup(ragflow=rag, ttl_seconds=300)
    assert lookup.get_id("known") == "d1"
    lookup.invalidate()
    assert lookup.get_id("known") == "d1"
    # Two refresh calls: initial + after invalidate
    assert rag.calls == 2


def test_get_name():
    rag = _Rag(datasets=[_Dataset("d1", "known")])
    lookup = DatasetLookup(ragflow=rag, ttl_seconds=300)
    assert lookup.get_name("d1") == "known"
    assert lookup.get_name("missing") is None


def test_get_dataset_reuses_cached_dataset_object():
    dataset = _Dataset("d1", "known")
    rag = _Rag(datasets=[dataset])
    lookup = DatasetLookup(ragflow=rag, ttl_seconds=300)

    assert lookup.get_dataset(name="known") is dataset
    assert lookup.get_dataset(dataset_id="d1") is dataset
    assert lookup.get_id("known") == "d1"
    assert rag.calls == 1


def test_list_datasets_reuses_cached_refresh():
    dataset = _Dataset("d1", "known")
    rag = _Rag(datasets=[dataset])
    lookup = DatasetLookup(ragflow=rag, ttl_seconds=300)

    assert lookup.list_datasets() == [dataset]
    assert lookup.get_id("known") == "d1"
    assert rag.calls == 1


@pytest.mark.parametrize("dataset_ids", [("d1", "d2"), ("d2", "d1")])
def test_duplicate_names_are_ambiguous_but_ids_remain_addressable(dataset_ids):
    datasets = [_Dataset(dataset_id, "shared-name") for dataset_id in dataset_ids]
    datasets_by_id = {dataset.id: dataset for dataset in datasets}
    lookup = DatasetLookup(ragflow=_Rag(datasets=datasets), ttl_seconds=300)

    assert lookup.get_id("shared-name") is None
    assert lookup.get_dataset(name="shared-name") is None
    assert lookup.get_dataset(dataset_id="d1") is datasets_by_id["d1"]
    assert lookup.get_dataset(dataset_id="d2") is datasets_by_id["d2"]
    assert lookup.list_datasets() == datasets


def test_repeated_observation_of_same_dataset_remains_unambiguous():
    first = _Dataset("d1", "shared-name")
    refreshed = _Dataset("d1", "shared-name")
    lookup = DatasetLookup(ragflow=_Rag(datasets=[first, refreshed]), ttl_seconds=300)

    assert lookup.get_id("shared-name") == "d1"
    assert lookup.get_dataset(name="shared-name") is refreshed
    assert lookup.get_dataset(dataset_id="d1") is refreshed
    assert lookup.list_datasets() == [refreshed]


def test_refresh_rebuilds_ambiguity_from_current_visible_datasets():
    first = _Dataset("d1", "shared-name")
    second = _Dataset("d2", "shared-name")
    rag = _Rag(datasets=[first])
    lookup = DatasetLookup(ragflow=rag, ttl_seconds=300)

    assert lookup.get_id("shared-name") == "d1"

    rag._datasets = [first, second]
    lookup.invalidate()

    assert lookup.get_id("shared-name") is None
    assert lookup.get_dataset(name="shared-name") is None
    assert lookup.get_dataset(dataset_id="d1") is first
    assert lookup.get_dataset(dataset_id="d2") is second


def test_api_error_propagates():
    """Real API errors must propagate, not be silently swallowed."""
    class _BrokenRag:
        def list_datasets(self, **kwargs):
            raise ConnectionError("network failure")

    lookup = DatasetLookup(ragflow=_BrokenRag(), ttl_seconds=300)
    try:
        lookup.get_id("anything")
        assert False, "Expected ConnectionError to propagate"
    except ConnectionError:
        pass
