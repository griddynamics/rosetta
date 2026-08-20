from types import SimpleNamespace

import pytest

from rosetta_cli.rosetta_config import RosettaConfig
from rosetta_cli.services.dataset_service import DatasetService


class FakeClient:
    def __init__(self, dataset_names: list[str]) -> None:
        self.datasets = [SimpleNamespace(name=name) for name in dataset_names]
        self.requested_page_sizes: list[int] = []

    def list_datasets(self, *, page_size: int) -> list[SimpleNamespace]:
        self.requested_page_sizes.append(page_size)
        return self.datasets


@pytest.mark.parametrize(
    ("dataset_names", "expected"),
    [
        pytest.param(["unrelated"], ("aia", True), id="zero-matches"),
        pytest.param(["aia-r3", "unrelated"], ("aia-r3", True), id="one-match"),
        pytest.param(
            ["aia-r2", "aia-r3", "unrelated"],
            (None, False),
            id="two-matches",
        ),
    ],
)
def test_resolve_dataset_name_uses_template_matches(
    dataset_names: list[str],
    expected: tuple[str | None, bool],
) -> None:
    client = FakeClient(dataset_names)
    config = RosettaConfig(
        base_url="https://example.invalid",
        api_key="ragflow-test",
        dataset_default="aia",
        dataset_template="aia-{release}",
        page_size=25,
    )

    result = DatasetService(client, config).resolve_dataset_name(None)

    assert result == expected
    assert client.requested_page_sizes == [config.page_size]
