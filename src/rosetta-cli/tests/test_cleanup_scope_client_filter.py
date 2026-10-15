"""cleanup-dataset call-site regression for client-side metadata filtering (#312).

The command must never present (or delete) documents outside the requested
tag/prefix scope, even when the server returns the full list unfiltered
(RAGFlow 0.25 ignores metadata_condition server-side)."""

from argparse import Namespace
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from rosetta_cli.commands.cleanup_command import CleanupCommand
from rosetta_cli.services.document_service import DocumentService


def _doc(doc_id: str, name: str, tags: list[str]) -> SimpleNamespace:
    return SimpleNamespace(id=doc_id, name=name, meta_fields={"tags": tags})


@pytest.mark.parametrize(
    "args,expected_ids",
    [
        (Namespace(tags="r1", prefix=None), ["1"]),
        (Namespace(tags=None, prefix="guide-"), ["2"]),
    ],
)
def test_filtered_cleanup_never_returns_out_of_scope_documents(
    monkeypatch, args, expected_ids
):
    client = Mock()
    client.list_documents.return_value = [
        _doc("1", "keep.md", ["r1"]),
        _doc("2", "guide-a.md", []),
        _doc("3", "manual.md", ["other"]),
    ]

    monkeypatch.setattr(
        "rosetta_cli.commands.cleanup_command.DocumentService",
        lambda _client: DocumentService(client),
    )

    command = CleanupCommand(SimpleNamespace(), SimpleNamespace(page_size=1000))

    filtered = command._get_filtered_documents(
        SimpleNamespace(), SimpleNamespace(), args
    )

    assert [d.id for d in filtered] == expected_ids
