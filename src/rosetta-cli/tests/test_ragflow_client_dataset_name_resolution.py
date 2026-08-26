from unittest.mock import Mock

import pytest

from rosetta_cli.ragflow_client import DocumentMetadata, RAGFlowClient


def _make_client() -> RAGFlowClient:
    client = object.__new__(RAGFlowClient)
    client._client = None
    client.dataset_default = "aia"
    client._ensure_dataset = Mock(return_value=None)
    return client


def _make_metadata(**overrides) -> DocumentMetadata:
    base = dict(
        tags=["a", "b"],
        domain="d",
        release="r2",
        content_hash="h" * 32,
        ims_doc_id="ims-1",
    )
    base.update(overrides)
    return DocumentMetadata(**base)


def test_upload_document_uses_default_dataset_name_when_release_is_empty():
    client = _make_client()

    client.upload_document(
        file_path=None,
        metadata=_make_metadata(release=""),
        dataset_name="aia",
        dataset_template="aia-{release}",
        content=b"hello",
        dry_run=True,
    )

    resolved_name = client._ensure_dataset.call_args.args[0]

    assert resolved_name == "aia"


def test_upload_document_resolves_dataset_name_when_release_is_present():
    client = _make_client()

    client.upload_document(
        file_path=None,
        metadata=_make_metadata(),
        dataset_name="aia",
        dataset_template="aia-{release}",
        content=b"hello",
        dry_run=True,
    )

    resolved_name = client._ensure_dataset.call_args.args[0]

    assert resolved_name == "aia-r2"


def test_upload_document_uses_dataset_default_when_dataset_name_is_none():
    client = _make_client()

    client.upload_document(
        file_path=None,
        metadata=_make_metadata(release=""),
        dataset_name=None,
        dataset_template="aia-{release}",
        content=b"hello",
        dry_run=True,
    )

    resolved_name = client._ensure_dataset.call_args.args[0]

    assert resolved_name == "aia"


def test_upload_document_rejects_unresolved_release_placeholder():
    client = _make_client()

    with pytest.raises(
        ValueError,
        match="Unresolved release placeholder",
    ):
        client.upload_document(
            file_path=None,
            metadata=_make_metadata(release=""),
            dataset_name="custom-{release}",
            dataset_template="aia-{release}",
            content=b"hello",
            dry_run=True,
        )
