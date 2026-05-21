"""Verify the meta_fields write contract for RAGFlow 0.25.x.

The 0.25 validator rejects None and dict values in meta_fields. The CLI must:
- drop None entries (sort_order, line_count, resource_path, frontmatter)
- JSON-stringify the frontmatter dict under the key "fm" (not "frontmatter",
  because "frontmatter" has a sticky ES object mapping in existing deployments
  that rejects string writes; "fm" gets a fresh dynamic mapping as text)
- not regress on existing primitive passthrough
"""
import json
from unittest.mock import patch

import pytest

from rosetta_cli.ragflow_client import DocumentMetadata, RAGFlowClient, RAGFlowClientError


class _FakeDoc:
    def __init__(self, doc_id: str):
        self.id = doc_id
        self.updated = None
        self._update_calls = 0
        self._fail_first_n = 0
        self._fail_with: Exception | None = None

    def update(self, payload: dict):
        self._update_calls += 1
        if self._update_calls <= self._fail_first_n:
            assert self._fail_with is not None
            raise self._fail_with
        self.updated = payload
        return self


class _FakeDataset:
    def __init__(self, doc: _FakeDoc):
        self.id = "ds-1"
        self._doc = doc
        self.deleted_ids: list[str] = []

    def delete_documents(self, ids):
        self.deleted_ids.extend(ids)

    def upload_documents(self, payload):
        return [self._doc]


def _make_client(dataset: _FakeDataset, list_documents_returns=()):
    client = object.__new__(RAGFlowClient)
    client._client = None
    client.page_size = 1000
    client._doc_index_by_dataset = {}
    client._ensure_dataset = lambda *_a, **_k: dataset
    client.list_documents = lambda *_a, **_k: list(list_documents_returns)
    return client


def _make_metadata(**overrides) -> DocumentMetadata:
    base = dict(
        tags=["a", "b"],
        domain="d",
        release="r2",
        content_hash="h" * 32,
        ims_doc_id="ims-1",
        original_path="d/x.md",
        resource_path=None,
        sort_order=None,
        frontmatter={"author": "x", "tags_inner": [1, None, "y"]},
        line_count=42,
        doc_title="d/x.md",
    )
    base.update(overrides)
    return DocumentMetadata(**base)


def test_sanitization_in_meta_fields_payload():
    doc = _FakeDoc("new-1")
    dataset = _FakeDataset(doc)
    client = _make_client(dataset)

    result = client.upload_document(
        file_path=None,
        metadata=_make_metadata(),
        dataset_name="aia-r2",
        dataset_template="aia-{release}",
        content=b"hello",
    )
    assert result is not None
    assert doc.updated is not None

    mf = doc.updated["meta_fields"]
    # None-valued keys are dropped
    assert "sort_order" not in mf
    assert "resource_path" not in mf

    # frontmatter dict is JSON-stringified under the "fm" key (not "frontmatter")
    # "frontmatter" is absent because it had a sticky ES object mapping
    assert "frontmatter" not in mf
    assert isinstance(mf["fm"], str)
    assert json.loads(mf["fm"]) == {"author": "x", "tags_inner": [1, None, "y"]}

    # Conditional non-None gated key kept
    assert mf["line_count"] == 42

    # Primitives untouched
    assert mf["tags"] == ["a", "b"]
    assert mf["ims_doc_id"] == "ims-1"
    assert mf["content_hash"] == "h" * 32


def test_sort_order_kept_when_set():
    doc = _FakeDoc("new-1")
    dataset = _FakeDataset(doc)
    client = _make_client(dataset)

    client.upload_document(
        file_path=None,
        metadata=_make_metadata(sort_order=5),
        dataset_name="aia-r2",
        dataset_template="aia-{release}",
        content=b"hello",
    )
    assert doc.updated["meta_fields"]["sort_order"] == 5


def test_frontmatter_none_drops_key():
    doc = _FakeDoc("new-1")
    dataset = _FakeDataset(doc)
    client = _make_client(dataset)

    client.upload_document(
        file_path=None,
        metadata=_make_metadata(frontmatter=None),
        dataset_name="aia-r2",
        dataset_template="aia-{release}",
        content=b"hello",
    )
    # Neither "fm" nor the legacy "frontmatter" key should appear when frontmatter is None
    assert "fm" not in doc.updated["meta_fields"]
    assert "frontmatter" not in doc.updated["meta_fields"]


def test_transient_update_is_retried():
    doc = _FakeDoc("new-1")
    doc._fail_first_n = 1
    doc._fail_with = Exception("Failed to update metadata")
    dataset = _FakeDataset(doc)
    client = _make_client(dataset)

    with patch("rosetta_cli.ims_utils.time.sleep"):
        client.upload_document(
            file_path=None,
            metadata=_make_metadata(frontmatter=None),
            dataset_name="aia-r2",
            dataset_template="aia-{release}",
            content=b"hello",
        )
    assert doc._update_calls == 2
    assert doc.updated is not None


def test_permanent_update_not_retried():
    doc = _FakeDoc("new-1")
    doc._fail_first_n = 5
    doc._fail_with = Exception("The type is not supported: None")
    dataset = _FakeDataset(doc)
    client = _make_client(dataset)

    with pytest.raises(RAGFlowClientError, match="The type is not supported"):
        client.upload_document(
            file_path=None,
            metadata=_make_metadata(),
            dataset_name="aia-r2",
            dataset_template="aia-{release}",
            content=b"hello",
        )
    assert doc._update_calls == 1
