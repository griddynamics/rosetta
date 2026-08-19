from pathlib import Path
from types import SimpleNamespace

from rosetta_cli.rosetta_config import DEFAULT_PARSE_TIMEOUT
from rosetta_cli.rosetta_publisher import ContentPublisher

DOCS = [{"id": "doc-1", "name": "agents.md", "dataset_id": "ds-1", "folder": "agents"}]


def _capture_wait(monkeypatch) -> dict:
    captured: dict = {}

    def fake_wait(self, documents, timeout=300, poll_interval=0.5):
        captured["timeout"] = timeout
        return len(documents), 0

    monkeypatch.setattr(
        "rosetta_cli.services.document_service.DocumentService.wait_for_parsing",
        fake_wait,
    )
    return captured


def test_default_parse_timeout_matches_config_default(tmp_path: Path):
    publisher = ContentPublisher(SimpleNamespace(), str(tmp_path))

    assert publisher.parse_timeout == DEFAULT_PARSE_TIMEOUT


def test_folder_wait_uses_configured_parse_timeout(monkeypatch, tmp_path: Path):
    captured = _capture_wait(monkeypatch)
    publisher = ContentPublisher(SimpleNamespace(), str(tmp_path), parse_timeout=900)

    publisher._wait_for_all_parsing_with_progress(DOCS)

    assert captured["timeout"] == 900


def test_single_file_wait_uses_configured_parse_timeout(monkeypatch, tmp_path: Path):
    captured = _capture_wait(monkeypatch)
    client = SimpleNamespace(
        parse_documents_batch=lambda documents, silent=False: {"success": ["ds-1"], "failed": []}
    )
    publisher = ContentPublisher(client, str(tmp_path), parse_timeout=900)

    publisher._parse_documents(DOCS, wait_for_completion=True, silent=False)

    assert captured["timeout"] == 900
