from argparse import Namespace
from types import SimpleNamespace

from rosetta_cli.commands.parse_command import ParseCommand


class FakeDocument:
    def __init__(self, doc_id: str, run: str) -> None:
        self.id = doc_id
        self.name = doc_id
        self.run = run


class FakeDataset:
    id = "dataset-1"

    def __init__(self, documents: list[FakeDocument]) -> None:
        self.documents = documents

    def list_documents(self, page_size: int):
        return self.documents


class FakeDocumentService:
    def __init__(self, client: object) -> None:
        self.client = client

    def list_documents_by_status(self, dataset: FakeDataset, statuses: list[str], limit: int):
        return [
            document for document in dataset.documents
            if document.run in statuses
        ]


def _command(monkeypatch, documents: list[FakeDocument]) -> tuple[ParseCommand, FakeDataset]:
    monkeypatch.setattr(
        "rosetta_cli.commands.parse_command.DocumentService",
        FakeDocumentService,
    )
    dataset = FakeDataset(documents)
    command = ParseCommand(
        SimpleNamespace(),
        SimpleNamespace(page_size=100),
    )
    return command, dataset


def test_force_mode_tallies_done_and_running(monkeypatch) -> None:
    documents = [
        FakeDocument("done-1", "DONE"),
        FakeDocument("running-1", "RUNNING"),
        FakeDocument("unstart-1", "UNSTART"),
    ]
    command, dataset = _command(monkeypatch, documents)

    docs_to_parse, status_counts = command._get_documents_to_parse(
        dataset,
        Namespace(force=True),
    )

    assert len(docs_to_parse) == 3
    assert status_counts == {"done": 1, "running": 1}


def test_default_mode_tallies_skipped_documents(monkeypatch) -> None:
    documents = [
        FakeDocument("done-1", "DONE"),
        FakeDocument("running-1", "RUNNING"),
        FakeDocument("fail-1", "FAIL"),
    ]
    command, dataset = _command(monkeypatch, documents)

    docs_to_parse, status_counts = command._get_documents_to_parse(
        dataset,
        Namespace(force=False),
    )

    assert [document["id"] for document in docs_to_parse] == ["fail-1"]
    assert status_counts == {"done": 1, "running": 1}
