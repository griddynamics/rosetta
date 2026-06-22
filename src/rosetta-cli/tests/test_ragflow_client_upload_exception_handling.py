from rosetta_cli.ragflow_client import DocumentMetadata, RAGFlowClient, RAGFlowClientError


class _UploadedDoc:
    def __init__(self, doc_id: str):
        self.id = doc_id
        self.updated = None

    def update(self, payload: dict):
        self.updated = payload
        return self


class _DatasetForUpload:
    def __init__(self):
        self.id = "ds-1"
        self.deleted_ids = []
        self.upload_payloads = []

    def delete_documents(self, ids):
        self.deleted_ids.extend(ids)

    def upload_documents(self, payload):
        self.upload_payloads.extend(payload)
        return [_UploadedDoc("new-doc-1")]


def _make_client():
    client = object.__new__(RAGFlowClient)
    client._client = None
    client.page_size = 1000
    client._doc_index_by_dataset = {}
    return client


def test_upload_document_treats_ownership_error_as_not_found_for_exists_check():
    client = _make_client()
    dataset = _DatasetForUpload()
    client._ensure_dataset = lambda *_args, **_kwargs: dataset

    def _raise_wrong_not_found_error(*_args, **_kwargs):
        raise RAGFlowClientError("API error: You don't own the document")

    client.list_documents = _raise_wrong_not_found_error

    metadata = DocumentMetadata(
        tags=["instructions"],
        domain="instructions",
        release="r1",
        content_hash="hash-1",
        ims_doc_id="ims-missing",
        original_path="agents/r1/missing.md",
        doc_title="missing.md",
    )

    result = client.upload_document(
        file_path=None,
        metadata=metadata,
        dataset_name="aia-r1",
        dataset_template="aia-{release}",
        content=b"content",
    )

    assert result is not None
    uploaded_doc, dataset_id = result
    assert uploaded_doc.id == "new-doc-1"
    assert dataset_id == "ds-1"
    assert dataset.deleted_ids == []
    assert dataset.upload_payloads[0]["display_name"] == "missing.md"
