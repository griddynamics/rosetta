"""Publishing succeeds only when every requested parse succeeds."""

from argparse import Namespace
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, call

import pytest

from rosetta_cli.commands.publish_command import PublishCommand
from rosetta_cli.ragflow_client import NotFoundError, RAGFlowClient, RAGFlowClientError
from rosetta_cli.rosetta_config import RosettaConfig
from rosetta_cli.services import document_service as module
from rosetta_cli.services.document_data import DocumentData


class FakeProgressBar:
    def __init__(self, **kwargs):
        pass

    def write(self, message):
        print(message)

    def update(self, count):
        pass

    def close(self):
        pass


def _workspace(tmp_path: Path, names: list[str]) -> Path:
    rules = tmp_path / "instructions" / "r3" / "core" / "rules"
    rules.mkdir(parents=True)
    for name in names:
        (rules / name).write_text(f"# {name}\n", encoding="utf-8")
    return rules


def _client(statuses: dict[str, str], rejected_datasets=(), status_error=False) -> Mock:
    client = Mock(spec=RAGFlowClient)
    client.page_size = 1000
    client.get_dataset.side_effect = lambda name: SimpleNamespace(id=name)
    client.get_existing_doc.return_value = None
    client.list_documents.return_value = []
    client.upload_document.side_effect = lambda **kw: (
        SimpleNamespace(id=kw["file_path"].name), kw["dataset_name"]
    )
    client.parse_documents_batch.side_effect = (
        lambda documents, silent=False, dry_run=False:
        RAGFlowClient.parse_documents_batch(client, documents, silent=silent, dry_run=dry_run)
    )

    def trigger_parse(dataset_id, doc_ids, dry_run=False):
        if dataset_id in rejected_datasets:
            raise RAGFlowClientError("Failed to trigger parsing: HTTP 500")

    def get_parse_status(dataset_id, doc_id):
        if status_error:
            raise RAGFlowClientError("Failed to get parse status: HTTP 502")
        return {"run": statuses[doc_id], "chunk_count": 1, "token_count": 1}

    client.trigger_parse.side_effect = trigger_parse
    client.get_parse_status.side_effect = get_parse_status
    return client


def _run(monkeypatch, client, target: Path, **flags) -> int:
    clock = [0.0]

    def sleep(seconds):
        clock[0] += seconds

    monkeypatch.setattr(module.time, "time", lambda: clock[0])
    monkeypatch.setattr(module.time, "sleep", sleep)
    monkeypatch.setattr(module, "tqdm", FakeProgressBar)
    monkeypatch.setattr(
        "rosetta_cli.commands.publish_command.AuthService.verify_or_exit",
        lambda client, config: None,
    )
    config = RosettaConfig(base_url="http://ragflow.local", api_key="ragflow-test", parse_timeout=1)
    args = Namespace(
        path=str(target), dry_run=flags.get("dry_run", False), force=False,
        no_parse=flags.get("no_parse", False), parse_timeout=None,
    )
    return PublishCommand(client, config).execute(args)


def _target(rules: Path, path_kind: str) -> Path:
    return rules / "a.md" if path_kind == "file" else rules.parents[2]


PATHS = pytest.mark.parametrize("path_kind", ["file", "folder"])


@PATHS
def test_done_exits_zero(monkeypatch, tmp_path, path_kind):
    rules = _workspace(tmp_path, ["a.md"])
    client = _client({"a.md": "DONE"})

    assert _run(monkeypatch, client, _target(rules, path_kind)) == 0
    client.trigger_parse.assert_called_once_with("aia-r3", ["a.md"], dry_run=False)
    client.get_parse_status.assert_called_once_with("aia-r3", "a.md")


@PATHS
@pytest.mark.parametrize("status, reason", [
    ("FAIL", "parsing failed"),
    ("RUNNING", "no final parse status within the 1s timeout"),
    ("UNSTART", "no final parse status within the 1s timeout"),
])
def test_unsuccessful_parse_exits_one(monkeypatch, tmp_path, capsys, path_kind, status, reason):
    rules = _workspace(tmp_path, ["a.md"])
    client = _client({"a.md": status})

    assert _run(monkeypatch, client, _target(rules, path_kind)) == 1
    output = capsys.readouterr().out
    assert f"Uploaded, but not parsed: {reason}" in output
    assert f"✓ {rules / 'a.md'}" not in output
    if path_kind == "folder":
        assert "✓ Successful: 0" in output
        assert "✗ Failed: 1" in output


@PATHS
def test_rejected_parse_request_exits_one(monkeypatch, tmp_path, capsys, path_kind):
    rules = _workspace(tmp_path, ["a.md"])
    client = _client({"a.md": "UNSTART"}, rejected_datasets={"aia-r3"})

    assert _run(monkeypatch, client, _target(rules, path_kind)) == 1
    output = capsys.readouterr().out
    assert "Uploaded, but not parsed: Failed to trigger parsing: HTTP 500" in output
    assert f"✓ {rules / 'a.md'}" not in output
    assert "pending" not in output
    assert "parsing failed" not in output
    if path_kind == "folder":
        assert "✓ Successful: 0" in output
        assert "✗ Failed: 1" in output


@PATHS
def test_status_errors_until_deadline_exit_one(monkeypatch, tmp_path, capsys, path_kind):
    rules = _workspace(tmp_path, ["a.md"])
    client = _client({"a.md": "RUNNING"}, status_error=True)

    assert _run(monkeypatch, client, _target(rules, path_kind)) == 1
    output = capsys.readouterr().out
    assert "HTTP 502" in output
    assert "Uploaded, but not parsed: no final parse status within the 1s timeout" in output
    assert client.get_parse_status.call_count > 1


def test_folder_rejection_prints_trigger_reason(monkeypatch, tmp_path, capsys):
    rules = _workspace(tmp_path, ["a.md"])
    client = _client({"a.md": "UNSTART"}, rejected_datasets={"aia-r3"})

    _run(monkeypatch, client, _target(rules, "folder"))

    output = capsys.readouterr().out
    trigger_errors = [line for line in output.splitlines() if "✗ Parse trigger failed" in line]
    assert len(trigger_errors) == 1
    assert "HTTP 500" in trigger_errors[0]


def test_folder_rejected_documents_are_never_polled(monkeypatch, tmp_path):
    rules = _workspace(tmp_path, ["a.md", "b.md"])
    client = _client({"a.md": "UNSTART", "b.md": "UNSTART"}, rejected_datasets={"aia-r3"})

    _run(monkeypatch, client, _target(rules, "folder"))

    client.get_parse_status.assert_not_called()


def test_folder_mixed_outcomes_count_and_name_failed_files(monkeypatch, tmp_path, capsys):
    rules = _workspace(tmp_path, ["a.md", "b.md", "c.md"])
    client = _client({"a.md": "DONE", "b.md": "FAIL", "c.md": "RUNNING"})

    assert _run(monkeypatch, client, _target(rules, "folder")) == 1
    output = capsys.readouterr().out
    assert "✓ Successful: 1" in output
    assert "✗ Failed: 2" in output
    failed_list = output.split("Failed files:")[1].split("=" * 60)[0]
    assert str(rules / "a.md") not in failed_list
    assert f"✗ {rules / 'b.md'} → Error: Uploaded, but not parsed: parsing failed" in failed_list
    assert f"✗ {rules / 'c.md'} → Error: Uploaded, but not parsed: no final parse status within the 1s timeout" in failed_list


@pytest.mark.parametrize("rejected_dataset", ["aia-r3", "aia"])
def test_folder_rejection_affects_only_its_dataset(monkeypatch, tmp_path, capsys, rejected_dataset):
    rules = _workspace(tmp_path, ["a.md"])
    fallback = rules.parents[2] / "core" / "rules" / "b.md"
    fallback.parent.mkdir(parents=True)
    fallback.write_text("# fallback\n", encoding="utf-8")
    client = _client({"a.md": "DONE", "b.md": "DONE"}, rejected_datasets={rejected_dataset})

    assert _run(monkeypatch, client, _target(rules, "folder")) == 1
    output = capsys.readouterr().out
    assert "✓ Successful: 1" in output
    assert "✗ Failed: 1" in output
    failed_list = output.split("Failed files:")[1].split("=" * 60)[0]
    rejected_file, accepted_file = (
        (rules / "a.md", fallback) if rejected_dataset == "aia-r3" else (fallback, rules / "a.md")
    )
    assert str(rejected_file) in failed_list
    assert str(accepted_file) not in failed_list
    client.trigger_parse.assert_has_calls([
        call("aia", ["b.md"], dry_run=False),
        call("aia-r3", ["a.md"], dry_run=False),
    ])
    accepted_dataset = "aia" if rejected_dataset == "aia-r3" else "aia-r3"
    client.get_parse_status.assert_called_once_with(accepted_dataset, accepted_file.name)


@PATHS
def test_no_parse_exits_zero_without_parse_request(monkeypatch, tmp_path, path_kind):
    rules = _workspace(tmp_path, ["a.md"])
    client = _client({"a.md": "UNSTART"})

    assert _run(monkeypatch, client, _target(rules, path_kind), no_parse=True) == 0
    client.parse_documents_batch.assert_not_called()
    client.trigger_parse.assert_not_called()


@PATHS
def test_dry_run_exits_zero_without_parse_request(monkeypatch, tmp_path, path_kind):
    rules = _workspace(tmp_path, ["a.md"])
    client = _client({"a.md": "UNSTART"})

    assert _run(monkeypatch, client, _target(rules, path_kind), dry_run=True) == 0
    client.parse_documents_batch.assert_not_called()
    client.trigger_parse.assert_not_called()


@PATHS
def test_unchanged_file_exits_zero_without_parse_request(monkeypatch, tmp_path, path_kind):
    rules = _workspace(tmp_path, ["a.md"])
    target = _target(rules, path_kind)
    publish_root = target.parent if path_kind == "file" else target
    cache = DocumentData.from_file(rules / "a.md", tmp_path, publish_root=publish_root)
    client = _client({"a.md": "UNSTART"})
    client.get_existing_doc.return_value = SimpleNamespace(meta_fields={"content_hash": cache.content_hash})

    assert _run(monkeypatch, client, target) == 0
    client.upload_document.assert_not_called()
    client.parse_documents_batch.assert_not_called()
    client.trigger_parse.assert_not_called()


def test_folder_unsupported_extension_is_not_sent_to_parsing(monkeypatch, tmp_path):
    rules = _workspace(tmp_path, ["a.md", "payload.bin"])
    client = _client({"a.md": "DONE"})

    assert _run(monkeypatch, client, _target(rules, "folder")) == 0
    assert client.upload_document.call_count == 2
    client.trigger_parse.assert_called_once_with("aia-r3", ["a.md"], dry_run=False)
    client.get_parse_status.assert_called_once_with("aia-r3", "a.md")


def test_unsupported_file_exits_zero_without_parse_request(monkeypatch, tmp_path):
    rules = _workspace(tmp_path, ["payload.bin"])
    client = _client({})

    assert _run(monkeypatch, client, rules / "payload.bin") == 0
    client.parse_documents_batch.assert_not_called()
    client.trigger_parse.assert_not_called()


@PATHS
def test_upload_failure_still_exits_one(monkeypatch, tmp_path, path_kind):
    rules = _workspace(tmp_path, ["a.md"])
    client = _client({"a.md": "DONE"})
    client.upload_document.side_effect = RAGFlowClientError("Upload rejected: HTTP 500")

    assert _run(monkeypatch, client, _target(rules, path_kind)) == 1
    client.parse_documents_batch.assert_not_called()
    client.trigger_parse.assert_not_called()


@pytest.mark.parametrize("status, exit_code", [("DONE", 0), ("FAIL", 1)])
def test_folder_unchanged_file_beside_changed_file(monkeypatch, tmp_path, capsys, status, exit_code):
    rules = _workspace(tmp_path, ["a.md", "b.md"])
    target = _target(rules, "folder")
    unchanged = DocumentData.from_file(rules / "a.md", tmp_path, publish_root=target)
    client = _client({"b.md": status})
    client.get_existing_doc.side_effect = lambda dataset, ims_doc_id: (
        SimpleNamespace(meta_fields={"content_hash": unchanged.content_hash})
        if ims_doc_id == unchanged.ims_doc_id else None
    )

    assert _run(monkeypatch, client, target) == exit_code
    output = capsys.readouterr().out
    assert "⊘ Skipped (unchanged): 1" in output
    assert f"✓ Successful: {1 - exit_code}" in output
    assert f"✗ Failed: {exit_code}" in output
    client.get_parse_status.assert_called_once_with("aia-r3", "b.md")


@PATHS
@pytest.mark.parametrize("status, rejected", [("FAIL", False), ("RUNNING", False), ("UNSTART", True)])
def test_non_string_document_id_exits_one(monkeypatch, tmp_path, capsys, path_kind, status, rejected):
    rules = _workspace(tmp_path, ["a.md"])
    client = _client({"123": status}, rejected_datasets={"aia-r3"} if rejected else ())
    client.upload_document.side_effect = lambda **kw: (SimpleNamespace(id=123), kw["dataset_name"])

    assert _run(monkeypatch, client, _target(rules, path_kind)) == 1
    output = capsys.readouterr().out
    reason = (
        "Failed to trigger parsing: HTTP 500" if rejected else
        "parsing failed" if status == "FAIL" else
        "no final parse status within the 1s timeout"
    )
    assert f"Uploaded, but not parsed: {reason}" in output
    if path_kind == "folder":
        assert "✓ Successful: 0" in output
        assert "✗ Failed: 1" in output


@PATHS
def test_local_parse_trigger_error_reports_its_own_reason(monkeypatch, tmp_path, capsys, path_kind):
    rules = _workspace(tmp_path, ["a.md"])
    client = _client({"a.md": "UNSTART"})
    client.trigger_parse.side_effect = NotFoundError("Dataset not found: aia-r3")

    assert _run(monkeypatch, client, _target(rules, path_kind)) == 1
    output = capsys.readouterr().out
    assert "Uploaded, but not parsed: Dataset not found: aia-r3" in output
    client.get_parse_status.assert_not_called()


def test_folder_two_datasets_print_both_trigger_errors(monkeypatch, tmp_path, capsys):
    rules = _workspace(tmp_path, ["a.md"])
    fallback = rules.parents[2] / "core" / "rules" / "b.md"
    fallback.parent.mkdir(parents=True)
    fallback.write_text("# fallback\n", encoding="utf-8")
    client = _client({})
    reasons = {"aia": "Failed to trigger parsing: HTTP 500", "aia-r3": "Failed to trigger parsing: HTTP 503"}

    def trigger_parse(dataset_id, doc_ids, dry_run=False):
        raise RAGFlowClientError(reasons[dataset_id])

    client.trigger_parse.side_effect = trigger_parse

    assert _run(monkeypatch, client, _target(rules, "folder")) == 1
    output = capsys.readouterr().out
    trigger_errors = [line for line in output.splitlines() if "✗ Parse trigger failed" in line]
    assert len(trigger_errors) == 2
    for dataset_id, reason in reasons.items():
        assert f"  ✗ Parse trigger failed for 1 document(s) in dataset {dataset_id}: {reason}" in trigger_errors
    assert "✓ Successful: 0" in output
    assert "✗ Failed: 2" in output
    failed_list = output.split("Failed files:")[1].split("=" * 60)[0]
    assert f"✗ {fallback} → Error: Uploaded, but not parsed: {reasons['aia']}" in failed_list
    assert f"✗ {rules / 'a.md'} → Error: Uploaded, but not parsed: {reasons['aia-r3']}" in failed_list
    client.get_parse_status.assert_not_called()
