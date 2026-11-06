"""cleanup-dataset delete-path regression for client-side metadata filtering (#312).

RAGFlow applies metadata_condition only when at least one document matches;
when none match, it returns the whole dataset (infiniflow/ragflow#14962).
The command must hand dataset.delete_documents only the in-scope ids, and
nothing at all when nothing matches."""

from argparse import Namespace
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from rosetta_cli.commands.cleanup_command import CleanupCommand


def _doc(doc_id: str, name: str, tags: list[str]) -> SimpleNamespace:
    return SimpleNamespace(
        id=doc_id, name=name, meta_fields={"tags": tags, "doc_title": name}
    )


def _run_cleanup(monkeypatch, tags, prefix):
    """Run execute() end to end with --force; the server returns every document."""
    all_documents = [
        _doc("1", "core/skills/keep.md", ["r1"]),
        _doc("2", "guide-a.md", ["r2"]),
        _doc("3", "manual.md", ["other"]),
    ]
    client = Mock()
    client.list_documents.return_value = all_documents
    dataset = Mock()
    client.get_dataset.return_value = dataset

    monkeypatch.setattr(
        "rosetta_cli.services.auth_service.AuthService.verify_or_exit",
        lambda client, config: None,
    )
    monkeypatch.setattr(
        "rosetta_cli.commands.cleanup_command.DatasetService.resolve_dataset_name",
        lambda self, name: (name, False),
    )

    command = CleanupCommand(
        client,
        SimpleNamespace(page_size=1000, environment="test", base_url="http://x"),
    )
    args = Namespace(
        dataset="aia-r2", tags=tags, prefix=prefix, dry_run=False, force=True
    )
    return command.execute(args), dataset


@pytest.mark.parametrize(
    "tags,prefix,expected_ids",
    [
        ("r1", None, ["1"]),
        ("r1,r2", None, ["1", "2"]),
        (None, "core/skills/", ["1"]),
        (None, "guide-", ["2"]),
    ],
)
def test_delete_receives_only_matching_ids(monkeypatch, tags, prefix, expected_ids):
    exit_code, dataset = _run_cleanup(monkeypatch, tags, prefix)

    assert exit_code == 0
    dataset.delete_documents.assert_called_once_with(ids=expected_ids)


@pytest.mark.parametrize(
    "tags,prefix", [("typo-tag", None), (None, "no-such-prefix/")]
)
def test_zero_match_full_list_deletes_nothing(monkeypatch, tags, prefix):
    exit_code, dataset = _run_cleanup(monkeypatch, tags, prefix)

    assert exit_code == 0
    dataset.delete_documents.assert_not_called()
