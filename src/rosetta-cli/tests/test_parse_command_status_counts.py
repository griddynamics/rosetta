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
        self.list_documents_calls: list[int] = []

    def list_documents(self, page_size: int):
        self.list_documents_calls.append(page_size)
        return self.documents


class FakeDocumentService:
    # Class-level so a test can assert the server-filtered path was never used,
    # regardless of whether the command instantiates the service at all.
    status_filter_calls: list[list[str]] = []

    def __init__(self, client: object) -> None:
        self.client = client

    def list_documents_by_status(self, dataset: FakeDataset, statuses: list[str], limit: int):
        FakeDocumentService.status_filter_calls.append(list(statuses))
        return [
            document for document in dataset.documents
            if document.run in statuses
        ]


def _command(monkeypatch, documents: list[FakeDocument]) -> tuple[ParseCommand, FakeDataset]:
    FakeDocumentService.status_filter_calls = []
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


def test_default_mode_uses_one_unfiltered_list_call(monkeypatch) -> None:
    """#305: default mode must not pair a server-filtered call with a full list."""
    documents = [
        FakeDocument("done-1", "DONE"),
        FakeDocument("running-1", "RUNNING"),
        FakeDocument("fail-1", "FAIL"),
        FakeDocument("unstart-1", "UNSTART"),
        FakeDocument("cancel-1", "CANCEL"),
    ]
    command, dataset = _command(monkeypatch, documents)

    docs_to_parse, status_counts = command._get_documents_to_parse(
        dataset,
        Namespace(force=False),
    )

    # The server-side run= filter is gone; the partition happens client-side.
    assert FakeDocumentService.status_filter_calls == []
    # Exactly one RAGFlow round trip, at the configured page size.
    assert dataset.list_documents_calls == [100]
    # Selection and counts are unchanged by the consolidation.
    assert [document["id"] for document in docs_to_parse] == [
        "fail-1",
        "unstart-1",
        "cancel-1",
    ]
    assert [document["status"] for document in docs_to_parse] == [
        "FAIL",
        "UNSTART",
        "CANCEL",
    ]
    assert status_counts == {"done": 1, "running": 1}


def test_force_mode_uses_one_unfiltered_list_call(monkeypatch) -> None:
    """#305: force mode keeps its single call and never consults the status filter."""
    documents = [
        FakeDocument("done-1", "DONE"),
        FakeDocument("fail-1", "FAIL"),
    ]
    command, dataset = _command(monkeypatch, documents)

    docs_to_parse, _ = command._get_documents_to_parse(
        dataset,
        Namespace(force=True),
    )

    assert FakeDocumentService.status_filter_calls == []
    assert dataset.list_documents_calls == [100]
    assert [document["id"] for document in docs_to_parse] == ["done-1", "fail-1"]


def test_default_mode_ignores_statuses_that_do_not_need_parsing(monkeypatch) -> None:
    """An unrecognised run value is not selected and not tallied as done/running."""
    documents = [
        FakeDocument("weird-1", "SOMETHING_ELSE"),
        FakeDocument("fail-1", "FAIL"),
    ]
    command, dataset = _command(monkeypatch, documents)

    docs_to_parse, status_counts = command._get_documents_to_parse(
        dataset,
        Namespace(force=False),
    )

    assert [document["id"] for document in docs_to_parse] == ["fail-1"]
    assert status_counts == {"done": 0, "running": 0}
