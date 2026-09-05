from dataclasses import asdict
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from rosetta_cli.ragflow_client import RAGFlowClient
from rosetta_cli.rosetta_publisher import ContentPublisher
from rosetta_cli.services.document_data import DocumentData


@pytest.mark.parametrize("publish_folder", [False, True], ids=["file", "folder"])
@pytest.mark.parametrize("legacy_hash", [False, True], ids=["current", "legacy"])
def test_binary_publish_updates_changed_content_and_then_skips(
    tmp_path: Path, publish_folder: bool, legacy_hash: bool
):
    instructions = tmp_path / "instructions"
    path = instructions / "r3" / "core" / "assets" / "sample.bin"
    path.parent.mkdir(parents=True)
    original_bytes = b"\x00\xff\x01\x02"
    replacement_bytes = b"\x00\xfe\x01\x02"
    path.write_bytes(original_bytes)
    original = DocumentData.from_file(path, workspace_root=tmp_path)
    existing = SimpleNamespace(
        id="stored-document", name=original.doc_title,
        meta_fields=original.to_metadata_dict(),
    )
    if legacy_hash:
        existing.meta_fields["content_hash"] = DocumentData._calculate_hash(
            str(len(original_bytes)), original.tags, original.domain, original.release,
            original.doc_title, original.doc_title, original.sort_order,
            original.original_path, original.resource_path,
        )

    # Keep the real publisher/change detector; replace only the remote client.
    client = Mock(spec=RAGFlowClient)
    client.page_size = 1000
    client.get_dataset.return_value = SimpleNamespace(id="dataset")
    client.get_existing_doc.return_value = existing
    client.list_documents.return_value = [existing]

    def upload_document(**kwargs):
        existing.meta_fields = asdict(kwargs["metadata"])
        return existing, "dataset"

    client.upload_document.side_effect = upload_document
    publisher = ContentPublisher(client, str(tmp_path))

    def publish():
        if publish_folder:
            [result] = publisher.publish_folder(str(instructions), parse_documents=False)
            return result
        return publisher.publish_file(str(path), parse_documents=False)

    first = publish()
    assert first.success
    assert first.skipped is not legacy_hash
    assert client.upload_document.call_count == int(legacy_hash)
    client.upload_document.reset_mock()

    path.write_bytes(replacement_bytes)
    changed = publish()
    assert changed.success and not changed.skipped
    client.upload_document.assert_called_once()
    uploaded = client.upload_document.call_args.kwargs
    assert uploaded["content"] == replacement_bytes
    assert uploaded["metadata"].ims_doc_id == original.ims_doc_id
    assert uploaded["metadata"].tags == original.tags
    assert uploaded["metadata"].content_hash != original.content_hash

    client.upload_document.reset_mock()
    unchanged = publish()
    assert unchanged.success and unchanged.skipped
    client.upload_document.assert_not_called()


def test_configured_pdf_filter_keeps_binary_change_detection(tmp_path: Path):
    instructions = tmp_path / "instructions"
    path = instructions / "r3" / "core" / "assets" / "sample.pdf"
    path.parent.mkdir(parents=True)
    original_bytes = b"\xffPDF"
    replacement_bytes = b"\xfePDF"
    path.write_bytes(original_bytes)
    (path.parent / "excluded.bin").write_bytes(b"ignored")

    legacy = DocumentData.from_file(path, workspace_root=tmp_path)
    # Reproduce metadata written before strict decoding and filter separation.
    legacy_hash = DocumentData._calculate_hash(
        original_bytes.decode("utf-8", errors="ignore"), legacy.tags,
        legacy.domain, legacy.release, legacy.doc_title, legacy.doc_title,
        legacy.sort_order, legacy.original_path, legacy.resource_path,
    )
    assert legacy_hash != legacy.content_hash
    existing = SimpleNamespace(
        id="stored-document", name=legacy.doc_title,
        meta_fields=legacy.to_metadata_dict(),
    )
    existing.meta_fields["content_hash"] = legacy_hash
    client = Mock(spec=RAGFlowClient)
    client.page_size = 1000
    client.get_dataset.return_value = SimpleNamespace(id="dataset")
    client.get_existing_doc.return_value = existing
    client.list_documents.return_value = [existing]

    def upload_document(**kwargs):
        existing.meta_fields = asdict(kwargs["metadata"])
        return existing, "dataset"

    client.upload_document.side_effect = upload_document
    publisher = ContentPublisher(client, str(tmp_path), file_extensions=[".pdf"])

    [migrated] = publisher.publish_folder(str(instructions), parse_documents=False)
    assert migrated.success and not migrated.skipped
    assert Path(migrated.file_path) == path
    assert client.upload_document.call_args.kwargs["content"] == original_bytes
    assert client.upload_document.call_args.kwargs["metadata"].line_count is None
    client.upload_document.reset_mock()

    path.write_bytes(replacement_bytes)
    [changed] = publisher.publish_folder(str(instructions), parse_documents=False)
    assert changed.success and not changed.skipped
    assert client.upload_document.call_args.kwargs["content"] == replacement_bytes
    client.upload_document.reset_mock()

    [unchanged] = publisher.publish_folder(str(instructions), parse_documents=False)
    assert unchanged.success and unchanged.skipped
    client.upload_document.assert_not_called()
