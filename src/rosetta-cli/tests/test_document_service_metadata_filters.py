"""Client-side enforcement of metadata filters (issue #312).

RAGFlow 0.25 ignores metadata_condition server-side (see the three notes in
ragflow_client.py), so filter_documents_by_tags / filter_documents_by_prefix
must enforce the filter against the returned documents themselves.
"""

import json
from types import SimpleNamespace

import pytest
from unittest.mock import Mock

from rosetta_cli.services.document_service import DocumentService


def _doc(doc_id: str, name: str, meta_fields) -> SimpleNamespace:
    return SimpleNamespace(id=doc_id, name=name, meta_fields=meta_fields)


def _dataset() -> SimpleNamespace:
    return SimpleNamespace()


@pytest.mark.parametrize(
    "matching_meta",
    [
        {"tags": ["R1", "Agents"]},
        json.dumps({"tags": ["r1"]}),
        SimpleNamespace(tags=["R1"]),
    ],
)
def test_filter_documents_by_tags_enforces_client_side(matching_meta):
    docs = [
        _doc("1", "keep.md", matching_meta),
        _doc("2", "other.md", {"tags": ["unrelated"]}),
        _doc("3", "none.md", {}),
    ]
    client = Mock()
    client.list_documents.return_value = docs
    service = DocumentService(client)

    result = service.filter_documents_by_tags(_dataset(), ["R1"], limit=10)

    assert [d.id for d in result] == ["1"]


def test_filter_documents_by_tags_empty_tags_unchanged():
    client = Mock()
    client.list_documents.return_value = [_doc("1", "keep.md", {"tags": ["r1"]})]
    service = DocumentService(client)

    assert service.filter_documents_by_tags(_dataset(), [], limit=10) == []


def test_filter_documents_by_prefix_enforces_client_side():
    docs = [
        _doc("1", "guide-a.md", {}),
        _doc("2", "guide-b.md", {}),
        _doc("3", "manual.md", {}),
    ]
    client = Mock()
    client.list_documents.return_value = docs
    service = DocumentService(client)

    result = service.filter_documents_by_prefix(_dataset(), "guide-", limit=10)

    assert [d.id for d in result] == ["1", "2"]
