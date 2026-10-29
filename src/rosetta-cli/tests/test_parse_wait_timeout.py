"""A poll timeout must not report incomplete parse batches as successful."""

from types import SimpleNamespace

import pytest

from rosetta_cli.services import document_service as module
from rosetta_cli.services.document_service import DocumentService


class FakeProgressBar:
    def __init__(self, **kwargs):
        self.total = kwargs["total"]
        self.completed = 0

    def write(self, message):
        pass

    def update(self, count):
        self.completed += count

    def close(self):
        pass


def _wait(monkeypatch, statuses, clock_ticks, timeout=1):
    clock = iter(clock_ticks)
    monkeypatch.setattr(module.time, "time", lambda: next(clock))
    monkeypatch.setattr(module.time, "sleep", lambda _: None)
    monkeypatch.setattr(module, "tqdm", FakeProgressBar)

    client = SimpleNamespace(
        get_parse_status=lambda dataset_id, doc_id: statuses[doc_id],
    )
    docs = [
        {"id": doc_id, "name": doc_id, "dataset_id": "dataset", "folder": "."}
        for doc_id in statuses
    ]
    return DocumentService(client).wait_for_parsing(docs, timeout=timeout, poll_interval=0)


def test_all_pending_at_timeout_are_unsuccessful(monkeypatch):
    assert _wait(
        monkeypatch,
        {"a": {"run": "RUNNING"}, "b": {"run": "UNSTART"}},
        [0.0, 2.0, 2.0],
    ) == (0, 2)


def test_timeout_after_partial_completion_counts_pending_without_double_counting(monkeypatch, capsys):
    assert _wait(
        monkeypatch,
        {
            "done": {"run": "DONE", "chunk_count": 1, "token_count": 5},
            "failed": {"run": "FAIL"},
            "pending": {"run": "RUNNING"},
        },
        [0.0, 0.1, 2.0, 2.0],
    ) == (1, 2)
    output = capsys.readouterr().out
    assert "Completed: 1, Failed: 1, Still pending: 1, Total: 3" in output


def test_all_terminal_statuses_keep_original_counts(monkeypatch):
    assert _wait(
        monkeypatch,
        {
            "done": {"run": "DONE", "chunk_count": 1, "token_count": 5},
            "failed": {"run": "FAIL"},
        },
        [0.0, 0.1, 0.2],
    ) == (1, 1)
