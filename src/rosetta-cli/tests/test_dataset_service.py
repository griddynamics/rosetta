from types import SimpleNamespace

from rosetta_cli.rosetta_config import RosettaConfig
from rosetta_cli.services.dataset_service import DatasetService


def _config() -> RosettaConfig:
    return RosettaConfig(
        base_url="https://example.invalid",
        api_key="ragflow-test",
        dataset_default="aia-default",
        dataset_template="aia-{release}",
        page_size=1000,
    )


def _client(*dataset_names: str) -> SimpleNamespace:
    calls: list[int] = []

    def list_datasets(*, page_size: int):
        calls.append(page_size)
        return [SimpleNamespace(name=name) for name in dataset_names]

    return SimpleNamespace(list_datasets=list_datasets, calls=calls)


def test_resolve_dataset_name_uses_explicit_name_without_listing() -> None:
    client = _client("aia-1.0")
    service = DatasetService(client, _config())

    assert service.resolve_dataset_name("chosen") == ("chosen", False)
    assert client.calls == []


def test_resolve_dataset_name_auto_detects_single_prefix_match(capsys) -> None:
    client = _client("legacy-aia-1.0", "aia-1.0")
    service = DatasetService(client, _config())

    assert service.resolve_dataset_name(None) == ("aia-1.0", True)
    assert client.calls == [1000]
    assert "Auto-detected dataset: aia-1.0" in capsys.readouterr().out


def test_resolve_dataset_name_rejects_ambiguous_prefix_matches(capsys) -> None:
    client = _client("aia-1.0", "unrelated", "aia-2.0")
    service = DatasetService(client, _config())

    assert service.resolve_dataset_name(None) == (None, False)
    assert client.calls == [1000]

    output = capsys.readouterr().out
    assert "Multiple datasets match pattern 'aia-*':" in output
    assert "  - aia-1.0" in output
    assert "  - aia-2.0" in output
    assert "Please specify which dataset using --dataset flag" in output


def test_resolve_dataset_name_falls_back_when_prefix_has_no_matches(capsys) -> None:
    client = _client("other", "different")
    service = DatasetService(client, _config())

    assert service.resolve_dataset_name(None) == ("aia-default", True)
    assert client.calls == [1000]
    assert "Using default dataset: aia-default" in capsys.readouterr().out
