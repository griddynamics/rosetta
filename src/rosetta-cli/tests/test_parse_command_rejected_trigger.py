"""Parsing succeeds only for documents whose parse request was accepted."""

from argparse import Namespace
from types import SimpleNamespace
from unittest.mock import Mock, call

import pytest

from rosetta_cli.commands.parse_command import ParseCommand
from rosetta_cli.ragflow_client import RAGFlowClient, RAGFlowClientError
from rosetta_cli.rosetta_config import RosettaConfig
from rosetta_cli.services import document_service as module


class FakeProgressBar:
    def __init__(self, **kwargs):
        pass

    def write(self, message):
        print(message)

    def update(self, count):
        pass

    def close(self):
        pass


def _client(statuses: dict[str, str], rejected_datasets=(), final_status="DONE") -> Mock:
    """An accepted parse request moves its documents to final_status; a rejected one leaves them as they were."""
    client = Mock(spec=RAGFlowClient)
    client.get_dataset.side_effect = lambda name: SimpleNamespace(
        id=name,
        list_documents=lambda page_size: [
            SimpleNamespace(id=doc_id, name=doc_id, run=run) for doc_id, run in statuses.items()
        ],
    )
    client.parse_documents_batch.side_effect = (
        lambda documents, silent=False, dry_run=False:
        RAGFlowClient.parse_documents_batch(client, documents, silent=silent, dry_run=dry_run)
    )

    def trigger_parse(dataset_id, doc_ids, dry_run=False):
        if dataset_id in rejected_datasets:
            raise RAGFlowClientError("Failed to trigger parsing: HTTP 500")
        for doc_id in doc_ids:
            statuses[doc_id] = final_status

    def get_parse_status(dataset_id, doc_id):
        return {"run": statuses[doc_id], "chunk_count": 1, "token_count": 1}

    client.trigger_parse.side_effect = trigger_parse
    client.get_parse_status.side_effect = get_parse_status
    return client


def _command(monkeypatch, client) -> ParseCommand:
    clock = [0.0]

    def sleep(seconds):
        clock[0] += seconds

    monkeypatch.setattr(module.time, "time", lambda: clock[0])
    monkeypatch.setattr(module.time, "sleep", sleep)
    monkeypatch.setattr(module, "tqdm", FakeProgressBar)
    monkeypatch.setattr(
        "rosetta_cli.commands.parse_command.AuthService.verify_or_exit",
        lambda client, config: None,
    )
    config = RosettaConfig(base_url="http://ragflow.local", api_key="ragflow-test", parse_timeout=1)
    return ParseCommand(client, config)


def _run(monkeypatch, client, force: bool) -> int:
    args = Namespace(dataset="aia-r3", force=force, dry_run=False, yes=True, parse_timeout=None)
    return _command(monkeypatch, client).execute(args)


def test_force_rejected_request_exits_one_without_reading_old_done_status(monkeypatch, capsys):
    client = _client({"a.md": "DONE", "b.md": "DONE"}, rejected_datasets={"aia-r3"})

    assert _run(monkeypatch, client, force=True) == 1
    output = capsys.readouterr().out
    assert "  ✗ Parse trigger failed for 2 document(s) in dataset aia-r3: Failed to trigger parsing: HTTP 500" in output
    assert "parsed successfully" not in output
    assert "✓ Successfully parsed: 0" in output
    assert "✗ Failed or timed out: 2" in output
    client.trigger_parse.assert_called_once_with("aia-r3", ["a.md", "b.md"], dry_run=False)
    client.get_parse_status.assert_not_called()


def test_default_mode_rejected_request_exits_one_without_polling(monkeypatch, capsys):
    client = _client({"a.md": "UNSTART", "b.md": "DONE"}, rejected_datasets={"aia-r3"})

    assert _run(monkeypatch, client, force=False) == 1
    output = capsys.readouterr().out
    assert "  ✗ Parse trigger failed for 1 document(s) in dataset aia-r3: Failed to trigger parsing: HTTP 500" in output
    assert "Timeout after" not in output
    assert "pending" not in output
    assert "✓ Successfully parsed: 0" in output
    assert "✗ Failed or timed out: 1" in output
    assert "⏭️  Skipped (already done): 1" in output
    client.trigger_parse.assert_called_once_with("aia-r3", ["a.md"], dry_run=False)
    client.get_parse_status.assert_not_called()


@pytest.mark.parametrize("final_status", ["DONE", "FAIL"])
@pytest.mark.parametrize("rejected_dataset", ["aia-r3", "aia"])
def test_rejection_affects_only_its_dataset(monkeypatch, capsys, rejected_dataset, final_status):
    client = _client(
        {"a.md": "DONE", "b.md": "DONE", "c.md": "DONE"},
        rejected_datasets={rejected_dataset}, final_status=final_status,
    )
    documents = [
        {"id": "a.md", "name": "a.md", "dataset_id": "aia-r3", "folder": "."},
        {"id": "b.md", "name": "b.md", "dataset_id": "aia", "folder": "."},
        {"id": "c.md", "name": "c.md", "dataset_id": "aia", "folder": "."},
    ]
    accepted = [doc for doc in documents if doc["dataset_id"] != rejected_dataset]
    rejected = len(documents) - len(accepted)
    parsed = len(accepted) if final_status == "DONE" else 0

    # execute() selects documents from one dataset, so two datasets are passed in directly.
    counts = _command(monkeypatch, client)._parse_and_wait(documents, Namespace(force=True))

    assert counts == (parsed, len(documents) - parsed)
    output = capsys.readouterr().out
    assert f"✗ Parse trigger failed for {rejected} document(s) in dataset {rejected_dataset}" in output
    client.trigger_parse.assert_has_calls([
        call("aia-r3", ["a.md"], dry_run=False),
        call("aia", ["b.md", "c.md"], dry_run=False),
    ])
    assert client.get_parse_status.call_args_list == [
        call(doc["dataset_id"], doc["id"]) for doc in accepted
    ]


@pytest.mark.parametrize("force, status", [(True, "DONE"), (False, "UNSTART")])
def test_accepted_request_exits_zero(monkeypatch, capsys, force, status):
    client = _client({"a.md": status, "b.md": status})

    assert _run(monkeypatch, client, force=force) == 0
    output = capsys.readouterr().out
    assert "Parse trigger failed" not in output
    assert "All 2 documents parsed successfully" in output
    assert "✓ Successfully parsed: 2" in output
    assert "Failed or timed out" not in output
    client.trigger_parse.assert_called_once_with("aia-r3", ["a.md", "b.md"], dry_run=False)
    assert client.get_parse_status.call_args_list == [call("aia-r3", "a.md"), call("aia-r3", "b.md")]


def test_non_string_dataset_id_is_still_polled(monkeypatch):
    client = _client({"a.md": "DONE"})
    documents = [{"id": "a.md", "name": "a.md", "dataset_id": 7, "folder": "."}]

    assert _command(monkeypatch, client)._parse_and_wait(documents, Namespace(force=True)) == (1, 0)
    client.get_parse_status.assert_called_once_with("7", "a.md")
