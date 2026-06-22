from ims_mcp.clients.document import DocumentClient


class _Doc:
    def __init__(self, doc_id: str, name: str):
        self.id = doc_id
        self.name = name
        self.updated = None

    def update(self, payload: dict):
        self.updated = payload
        return self


class _Dataset:
    def __init__(self, pages: list[list[_Doc]]):
        self._pages = pages
        self.list_calls = []
        self.deleted_ids = []
        self.uploaded = []

    def list_documents(self, **kwargs):
        # This test protects against regressions to list_documents(name=...),
        # which can raise ownership errors for unknown names.
        if kwargs.get("name") is not None:
            raise AssertionError("list_documents(name=...) must not be used in upsert")
        self.list_calls.append(kwargs)
        page = kwargs.get("page", 1)
        if page <= len(self._pages):
            return self._pages[page - 1]
        return []

    def delete_documents(self, ids):
        self.deleted_ids.extend(ids)

    def upload_documents(self, document_list):
        self.uploaded.extend(document_list)
        display_name = document_list[0]["display_name"]
        return [_Doc("new-doc", display_name)]


class _KeywordFailureDataset(_Dataset):
    def __init__(self, pages, keyword_error_message):
        super().__init__(pages)
        self.keyword_error_message = keyword_error_message

    def list_documents(self, **kwargs):
        if kwargs.get("keywords") is not None:
            raise Exception(self.keyword_error_message)
        return super().list_documents(**kwargs)


def test_upsert_doc_replaces_existing_with_dataset_scoped_scan():
    dataset = _Dataset(
        pages=[
            [_Doc("d1", "OTHER.md"), _Doc("d2", "VERIFY-TEST.md")],
            [],
        ]
    )
    client = DocumentClient()

    upserted = client.upsert_doc(
        dataset=dataset,
        name="VERIFY-TEST.md",
        content=b"new content",
        meta_fields={"tags": ["test"]},
    )

    assert dataset.deleted_ids == ["d2"]
    assert dataset.uploaded[0]["display_name"] == "VERIFY-TEST.md"
    assert upserted.id == "new-doc"


class _Rag:
    def __init__(self):
        self.api_url = "https://example.test/api/v1"
        self.authorization_header = {"Authorization": "Bearer test-key"}


class _FailingDownloadDoc:
    def __init__(self, doc_id: str):
        self.id = doc_id
        self.rag = _Rag()

    def download(self):
        raise Exception("You do not own the dataset 53318fc3168e11f197ff06284094246c.")


def test_download_content_falls_back_to_v1_document_get(monkeypatch):
    class _Response:
        status_code = 200
        content = b"hello from fallback"

        def json(self):
            import json as _json
            raise _json.JSONDecodeError("not json", "", 0)

    captured = {}

    def _fake_get(url, headers, timeout):
        captured["url"] = url
        captured["headers"] = headers
        captured["timeout"] = timeout
        return _Response()

    import ims_mcp.clients.document as document_module

    monkeypatch.setattr(document_module.requests, "get", _fake_get)

    client = DocumentClient()
    text = client.download_content(_FailingDownloadDoc("doc-123"))

    assert text == "hello from fallback"
    assert captured["url"] == "https://example.test/v1/document/get/doc-123"
    assert captured["headers"]["Authorization"] == "Bearer test-key"
    assert captured["timeout"] == 30


def test_download_content_raises_when_fallback_returns_json_error(monkeypatch):
    class _Response:
        status_code = 200
        content = b'{"code":102,"message":"no auth"}'

        def json(self):
            return {"code": 102, "message": "no auth"}

    def _fake_get(url, headers, timeout):
        return _Response()

    import pytest
    import ims_mcp.clients.document as document_module

    monkeypatch.setattr(document_module.requests, "get", _fake_get)

    client = DocumentClient()
    with pytest.raises(RuntimeError, match="Failed to download content"):
        client.download_content(_FailingDownloadDoc("doc-err"))


def test_upsert_doc_when_no_existing_uploads_without_delete():
    dataset = _Dataset(pages=[[_Doc("d1", "OTHER.md")], []])
    client = DocumentClient()

    upserted = client.upsert_doc(
        dataset=dataset,
        name="VERIFY-TEST.md",
        content=b"content",
        meta_fields=None,
    )

    assert dataset.deleted_ids == []
    assert dataset.uploaded[0]["display_name"] == "VERIFY-TEST.md"
    assert upserted.id == "new-doc"


def test_upsert_doc_tolerates_document_ownership_lookup_error():
    dataset = _KeywordFailureDataset(
        pages=[[ _Doc("d2", "VERIFY-TEST.md") ], []],
        keyword_error_message="You don't own the document d2.",
    )
    client = DocumentClient()

    upserted = client.upsert_doc(
        dataset=dataset,
        name="VERIFY-TEST.md",
        content=b"new content",
        meta_fields={"tags": ["test"]},
    )

    assert dataset.deleted_ids == ["d2"]
    assert upserted.id == "new-doc"


def test_upsert_doc_tolerates_dataset_ownership_lookup_error():
    dataset = _KeywordFailureDataset(
        pages=[[ _Doc("d2", "VERIFY-TEST.md") ], []],
        keyword_error_message="You do not own the dataset abc123.",
    )
    client = DocumentClient()

    upserted = client.upsert_doc(
        dataset=dataset,
        name="VERIFY-TEST.md",
        content=b"new content",
        meta_fields={"tags": ["test"]},
    )

    assert dataset.deleted_ids == ["d2"]
    assert upserted.id == "new-doc"
