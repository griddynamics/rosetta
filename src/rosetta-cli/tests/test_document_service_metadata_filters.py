"""Client-side enforcement of metadata filters (issue #312).

RAGFlow applies metadata_condition only when at least one document matches;
when none match, it returns the whole dataset (infiniflow/ragflow#14962), so
filter_documents_by_tags / filter_documents_by_prefix must enforce the filter
against the returned documents themselves.
"""

import json
from types import SimpleNamespace

import pytest
from unittest.mock import Mock

from rosetta_cli.services.document_service import DocumentService, _extract_doc_tags


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


@pytest.mark.parametrize("meta_fields", ["{not json", None])
def test_extract_doc_tags_tolerates_invalid_or_missing_meta(meta_fields):
    assert _extract_doc_tags(_doc("1", "a.md", meta_fields)) == set()


def test_filter_documents_by_tags_or_logic():
    docs = [
        _doc("1", "a.md", {"tags": ["r1"]}),
        _doc("2", "b.md", {"tags": ["agents"]}),
        _doc("3", "c.md", {"tags": ["other"]}),
        _doc("4", "d.md", "{not json"),
        _doc("5", "e.md", None),
    ]
    client = Mock()
    client.list_documents.return_value = docs
    service = DocumentService(client)

    result = service.filter_documents_by_tags(_dataset(), ["R1", "agents"], limit=10)

    assert [d.id for d in result] == ["1", "2"]


def test_filter_documents_by_prefix_prefers_doc_title_over_name():
    docs = [
        # RAGFlow renamed on a display-name collision; doc_title is authoritative.
        _doc("1", "SKILL(7).md", {"doc_title": "core/skills/planning/SKILL.md"}),
        # name happens to match, doc_title does not.
        _doc("2", "core/skills/x.md", {"doc_title": "other/x.md"}),
        # No doc_title: fall back to name.
        _doc("3", "core/skills/y.md", {}),
    ]
    client = Mock()
    client.list_documents.return_value = docs
    service = DocumentService(client)

    result = service.filter_documents_by_prefix(_dataset(), "core/skills/", limit=10)

    assert [d.id for d in result] == ["1", "3"]
